#!/usr/bin/env node
// 把 Markdown 文档的散文按字符 1:1 换成位名：骨架（结构、代码、数字、ASCII 术语、链接目标）原样保留。
// 位名由原文确定性推导（sha256 计数模式），可校验、不可还原。
// 用法：node scripts/md-bits.mjs [--check] [仓库相对路径…]
//   不带参数 = 全量；读 backup/readable/<rel>，写 <rel>。
//   --check  = 重算并与仓库现状逐字节比对；缺可读副本的记「跳过」（CI 里没有 backup/，不能报错）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GU, GA, renderBits } from "../translator/src/bits.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// MD_BITS_ROOT 只给测试用：把「仓库根」指到 /tmp 夹具；平时就是仓库根。
const ROOT = process.env.MD_BITS_ROOT ? resolve(process.env.MD_BITS_ROOT) : join(HERE, "..");
const READABLE_DIR = "backup/readable";

export const DOC_SUFFIX_DIALECT = [["\.ja\.md$", "ja"], ["\.en\.md$", "en"], ["\.md$", "zh"]];

export function dialectOfDoc(path) {
  for (const [re, d] of DOC_SUFFIX_DIALECT) if (new RegExp(re).test(path)) return d;
  return "zh";
}

/** 某份文档的可读副本（backup/readable/<rel>，不进仓库）。 */
export function readableOf(rel) {
  return join(ROOT, READABLE_DIR, rel);
}

/** 散文字符集：只有这些字符会被换成位名，其余一律原样。 */
const PROSE = {
  zh: /[\u3400-\u4DBF\u4E00-\u9FFF]/g,
  ja: /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/g,
  en: /[A-Za-z]/g,
};

/** 位名字形：用来统计占比，确认产物确实被替换过。 */
const GLYPH = {
  zh: /[\u5495\u560E]/g,
  ja: /[\u30B0\u30AC\u3050\u304C]/g,
  en: /[Gg][UuAa]/g,
};

/**
 * 确定性位串：对 k = 0,1,2,… 取 sha256(utf8(R) + 0x00 + ascii(k))，按字节 MSB 先取位，拼够 n 位即停。
 * 同一段散文永远得到同一串位名；不同段的位名互不相关。
 */
export function keystream(run, n) {
  const key = Buffer.from(run, "utf8");
  const sep = Buffer.alloc(1);
  let bits = "";
  for (let k = 0; bits.length < n; k += 1) {
    const digest = createHash("sha256").update(key).update(sep).update(Buffer.from(String(k), "ascii")).digest();
    for (let i = 0; i < digest.length && bits.length < n; i += 1) {
      for (let s = 7; s >= 0 && bits.length < n; s -= 1) bits += (digest[i] >> s) & 1 ? GA : GU;
    }
  }
  return bits;
}

/** 一段散文 → 等长位名（zh/ja 一个字符一个位名；en 一个字母两个字符）。 */
export function redactRun(run, dialect) {
  return renderBits(keystream(run, [...run].length), dialect);
}

/** 把一段行内文本里「极大连续散文串」逐个换掉，非散文字符原样。 */
function redactProse(text, dialect) {
  const re = new RegExp(PROSE[dialect].source, "");
  let out = "";
  let run = "";
  for (const ch of text) {
    if (re.test(ch)) { run += ch; continue; }
    if (run) { out += redactRun(run, dialect); run = ""; }
    out += ch;
  }
  if (run) out += redactRun(run, dialect);
  return out;
}

const FENCE = /^(\s*)(`{3,}|~{3,})/;
const NAV_LEAD = /\*\*[^*\n]+\*\*/;
// i18n 头部块是给工具读的元数据，不是散文（见 redactDoc）。
const I18N_BEGIN = /<!--\s*i18n:begin\s*-->/;
const I18N_END = /<!--\s*i18n:end\s*-->/;

/** i18n 导航行：行内首个 **…** 紧跟「：」或「:」，且行内有 "](" 链接（规格 B.6）。 */
export function isNavLine(line) {
  const lead = NAV_LEAD.exec(line);
  if (!lead || !line.includes("](")) return false;
  return /^[：:]/.test(line.slice(lead.index + lead[0].length));
}

/** 导航行里链接 label 的方言跟随 target 的后缀；其余行的 label 与本文件同方言。 */
function labelDialect(target, dialect, nav) {
  if (!nav) return dialect;
  const path = target.trim().split(/\s+/)[0].replace(/#.*$/, "");
  if (/\.ja\.md$/.test(path)) return "ja";
  if (/\.en\.md$/.test(path)) return "en";
  return "zh";
}

/** 从 start（指向 "(" 之后）找配对右括号，认反斜杠转义与嵌套括号。 */
function matchingParen(text, start) {
  let depth = 1;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\") { i += 1; continue; }
    if (ch === "(") depth += 1;
    else if (ch === ")") { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * 行内扫描：反斜杠转义、行内代码、autolink、链接/图片、强调记号一律逐字节保留，
 * 只有它们之间的散文（含表格竖线、行首结构记号之外的文字）会被换成位名。
 */
export function redactInline(text, dialect, nav) {
  let out = "";
  let buf = "";
  const flush = () => { if (buf) { out += redactProse(buf, dialect); buf = ""; } };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") { flush(); out += text.slice(i, i + 2); i += 2; continue; }
    if (ch === "`") {
      let n = 1;
      while (text[i + n] === "`") n += 1;
      const mark = "`".repeat(n);
      const end = text.indexOf(mark, i + n);
      if (end !== -1) { flush(); out += text.slice(i, end + n); i = end + n; continue; }
    }
    if (ch === "<") {
      const end = text.indexOf(">", i + 1);
      if (end !== -1 && !text.slice(i, end).includes(" ")) { flush(); out += text.slice(i, end + 1); i = end + 1; continue; }
    }
    if (ch === "[" || (ch === "!" && text[i + 1] === "[")) {
      const start = ch === "!" ? i + 1 : i;
      const close = text.indexOf("]", start + 1);
      if (close !== -1 && text[close + 1] === "(") {
        const paren = matchingParen(text, close + 2);
        if (paren !== -1) {
          flush();
          out += text.slice(i, start + 1);
          out += redactInline(text.slice(start + 1, close), labelDialect(text.slice(close + 2, paren), dialect, nav), nav);
          out += text.slice(close, paren + 1);
          i = paren + 1;
          continue;
        }
      }
    }
    if ("*_~".includes(ch)) {
      let n = 1;
      while (text[i + n] === ch) n += 1;
      flush(); out += ch.repeat(n); i += n; continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

/**
 * 把一份可读文档换成产物：散文逐字符 1:1 换位名，其余全部逐字节照抄。
 * 照抄的部分：代码围栏整块（含围栏行与语言标记）、HTML 注释块、行内代码、链接目标、
 * 数字、ASCII 术语、标点、行首结构记号、空行——它们要么不是散文字符，要么被扫描器列为保留片段。
 */
export function redactDoc(source, dialect) {
  const out = [];
  let fence = null;
  let comment = false;
  let i18n = false;
  for (const line of source.split("\n")) {
    if (fence) { out.push(line); if (line.trim().startsWith(fence)) fence = null; continue; }
    // i18n 头部块（<!-- i18n:begin --> … <!-- i18n:end -->）整块逐字节保留：里面的语言标记
    // **日本語** / **English** 是翻译校验脚本识别语言的唯一依据，不能换成位名。
    if (i18n) { out.push(line); if (I18N_END.test(line)) i18n = false; continue; }
    if (I18N_BEGIN.test(line)) { out.push(line); i18n = !I18N_END.test(line); continue; }
    if (comment) { out.push(line); if (line.includes("-->")) comment = false; continue; }
    const open = FENCE.exec(line);
    if (open) { fence = open[2]; out.push(line); continue; }
    if (line.trimStart().startsWith("<!--")) { out.push(line); if (!line.includes("-->")) comment = true; continue; }
    out.push(redactInline(line, dialect, isNavLine(line)));
  }
  return out.join("\n");
}

/** 去掉行内代码、链接目标与 autolink，供占比统计用（这些都是骨架，不是散文）。 */
function stripSkeleton(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "`") {
      let n = 1;
      while (text[i + n] === "`") n += 1;
      const mark = "`".repeat(n);
      const end = text.indexOf(mark, i + n);
      if (end !== -1) { i = end + n; continue; }
    }
    if (text[i] === "]" && text[i + 1] === "(") {
      const end = matchingParen(text, i + 2);
      if (end !== -1) { out += "]"; i = end + 1; continue; }
    }
    if (text[i] === "<") {
      const end = text.indexOf(">", i + 1);
      if (end !== -1 && !text.slice(i, end).includes(" ")) { i = end + 1; continue; }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/**
 * 散文区里位名字形占「散文字符」的比例：产物 = 1，可读原文 ≈ 0。
 * 位名自己也在散文字符集里（咕/嘎是 CJK，グ/ガ是片假名，GU/GA 是字母），所以按「字形字符数 / 散文字符数」算。
 * 骨架（围栏、行内代码、链接目标、autolink）不参与统计——它们本来就不是散文。
 */
export function glyphRatio(source, dialect) {
  const prose = new RegExp(PROSE[dialect].source, "g");
  const glyph = GLYPH[dialect];
  let glyphChars = 0;
  let proseChars = 0;
  let fence = null;
  let comment = false;
  let i18n = false;
  for (const line of source.split("\n")) {
    if (fence) { if (line.trim().startsWith(fence)) fence = null; continue; }
    if (i18n) { if (I18N_END.test(line)) i18n = false; continue; }
    if (I18N_BEGIN.test(line)) { i18n = !I18N_END.test(line); continue; }
    if (comment) { if (line.includes("-->")) comment = false; continue; }
    const open = FENCE.exec(line);
    if (open) { fence = open[2]; continue; }
    if (line.trimStart().startsWith("<!--")) { if (!line.includes("-->")) comment = true; continue; }
    const body = stripSkeleton(line);
    for (const m of body.matchAll(glyph)) glyphChars += m[0].length;
    proseChars += [...body.matchAll(prose)].length;
  }
  return proseChars === 0 ? 1 : glyphChars / proseChars;
}

/** 两份文本首个不一致的行号（1 基）；一方缺失或为前缀时也能给出行号。 */
export function firstDiffLine(a, b) {
  const left = (a ?? "").split("\n");
  const right = (b ?? "").split("\n");
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i += 1) if (left[i] !== right[i]) return i + 1;
  return n + 1;
}

export const DOC_FILES = [
  "README.md", "README.ja.md", "README.en.md",
  "CHANGELOG.md", "CHANGELOG.ja.md", "CHANGELOG.en.md",
  "CONTRIBUTING.md", "CONTRIBUTING.ja.md", "CONTRIBUTING.en.md",
  "SPEC.md", "SPEC.ja.md", "SPEC.en.md",
  "TUTORIAL.md", "TUTORIAL.ja.md", "TUTORIAL.en.md",
  "translator/README.md", "translator/README.ja.md", "translator/README.en.md",
  "translator/CONTRACT.md", "translator/CONTRACT.ja.md", "translator/CONTRACT.en.md",
  "vscode/README.md", "vscode/README.ja.md", "vscode/README.en.md",
  "vscode/CONTRACT.md", "vscode/CONTRACT.ja.md", "vscode/CONTRACT.en.md",
  "vscode/gugugaga/README.md", "vscode/gugugaga/README.ja.md", "vscode/gugugaga/README.en.md",
  "docs/名字对照表.md", "docs/名字对照表.ja.md", "docs/名字对照表.en.md",
  "docs/翻译规范.md", "docs/翻译规范.ja.md", "docs/翻译规范.en.md",
];

if (import.meta.url === "file://" + process.argv[1]) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const only = args.filter((a) => !a.startsWith("--"));
  const files = only.length ? only : DOC_FILES;
  let ok = 0;
  let bad = 0;
  let skipped = 0;
  for (const rel of files) {
    const dialect = dialectOfDoc(rel);
    const readable = readableOf(rel);
    if (!existsSync(readable)) {
      if (check) { skipped += 1; console.log("· 跳过 " + rel + "（没有可读副本 " + READABLE_DIR + "/" + rel + "）"); continue; }
      bad += 1;
      console.error("✗ " + rel + "：可读副本不存在（" + READABLE_DIR + "/" + rel + "）");
      continue;
    }
    const readableText = readFileSync(readable, "utf8");
    const product = redactDoc(readableText, dialect);
    if (!check) {
      writeFileSync(join(ROOT, rel), product);
      ok += 1;
      console.log("已替换 " + rel + "（" + dialect + "，可读 " + readableText.length + " → 产物 " + product.length + " 字符）");
      continue;
    }
    const target = join(ROOT, rel);
    if (!existsSync(target)) { bad += 1; console.error("✗ " + rel + "：产物不存在"); continue; }
    const current = readFileSync(target, "utf8");
    if (current === product) { ok += 1; console.log("✓ " + rel); continue; }
    bad += 1;
    console.error("✗ " + rel + "：与可读副本重算的结果不一致（首个差异在第 " + firstDiffLine(current, product) + " 行）");
  }
  if (check) console.log("通过：" + ok + " 份；跳过：" + skipped + " 份" + (bad ? "；不一致：" + bad + " 份" : ""));
  process.exit(bad ? 1 : 0);
}
