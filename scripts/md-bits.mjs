#!/usr/bin/env node
// 位名替换 v2：把 Markdown 的散文换成位名，骨架保留。
// 两种上下文：
//   散文（正文 / 标题 / 列表 / 表格单元 / 引用）：按方言散文字符集逐字符换位名，1 字符 = 1 位；
//   代码（围栏块正文、行内代码 span）：只换其中的 CJK/假名，ASCII 一律原样（英文代码是代码，不是散文）。
// 任何上下文里都先做掩码、逐字节保留：位名字形 咕/嘎/グ/ガ、专有名词 咕咕嘎嘎/ググガガ/GUGUGAGA、
// 仓库里真实存在的路径、反斜杠转义；散文里另掩链接/图片目标、autolink 与 HTML 标签、强调记号。
// 位名由原文确定性推导（sha256 计数模式），可校验、不可还原。
// 用法：node scripts/md-bits.mjs [--check] [仓库相对路径…]
//   不带参数 = 全量；读 backup/readable/<rel>，写 <rel>。
//   --check  = 重算并与仓库现状逐字节比对；缺可读副本的记「跳过」（CI 里没有 backup/，不能报错）。
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
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

// --------------------------------------------------------------- 字符集

/** 散文：按方言的散文字符集逐字符替换（只有这些字符会被换掉）。 */
const PROSE_ONE = {
  zh: /[\u3400-\u4DBF\u4E00-\u9FFF]/,
  ja: /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/,
  // en 文档的散文里也会出现中文/日文（语言表、行内的中文文件名说明）：一并换掉，否则「读不到人话」漏。
  en: /[A-Za-z\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/,
};
/** 代码里的散文：三种方言统一只换 CJK/假名（ASCII 是代码）。 */
const CJK_KANA = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
/** 位名字形：在 CJK 区里，必须先掩码，否则会被当散文再替换一遍。 */
const GLYPH_RUN = /[\u5495\u560E\u30B0\u30AC]+/y;
/** en 方言产物里的位名（GU/GA）：残留检查与骨架比对要认它。 */
const EN_GLYPH_RUN = /(?:GU|GA)+/y;
/** 专有名词：三种写法是专有对应关系，不按等长替换（ASCII 不分大小写、按词边界）。 */
const PROPER_AT = /[Gg][Uu][Gg][Uu][Gg][Aa][Gg][Aa]/y;
/** 统计用：本方言的位名字形。 */
const GLYPH = { zh: /[\u5495\u560E]/g, ja: /[\u30B0\u30AC\u3050\u304C]/g, en: /(?:GU|GA)/g };

const isAlnum = (ch) => ch !== undefined && /[A-Za-z0-9]/.test(ch);

// --------------------------------------------------------------- 掩码：仓库路径

const SKIP_DIRS = new Set([".git", "node_modules", "release", "backup"]);
let PATH_INDEX = null;

/** 仓库里真实存在的路径（文件 + 以 / 结尾的目录），长的在前：文档里出现的最长匹配优先掩码。 */
function repoPaths() {
  if (PATH_INDEX) return PATH_INDEX;
  const all = [];
  const walk = (dir, prefix) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const rel = prefix + entry.name + "/";
        all.push(rel);
        walk(join(dir, entry.name), rel);
      } else if (!entry.name.endsWith(".vsix")) {
        all.push(prefix + entry.name);
      }
    }
  };
  walk(ROOT, "");
  all.sort((a, b) => b.length - a.length);
  const index = new Map();
  for (const p of all) {
    const bucket = index.get(p[0]);
    if (bucket) bucket.push(p);
    else index.set(p[0], [p]);
  }
  PATH_INDEX = index;
  return index;
}

/** 仓库路径集合的大小（报告与测试用）。 */
export function repoPathCount() {
  let n = 0;
  for (const bucket of repoPaths().values()) n += bucket.length;
  return n;
}

/** 当前位置命中的最长仓库路径长度；没有就是 0。 */
function pathAt(text, i) {
  const bucket = repoPaths().get(text[i]);
  if (!bucket) return 0;
  for (const p of bucket) {
    if (!text.startsWith(p, i)) continue;
    const next = text[i + p.length];
    if (isAlnum(next)) continue; // LICENSES 不算 LICENSE
    return p.length;
  }
  return 0;
}

// --------------------------------------------------------------- 位名

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

// --------------------------------------------------------------- 行内扫描

/** 粘性正则在当前位置匹配的开头，没命中返回 null。 */
function stickyRun(re, text, i) {
  re.lastIndex = i;
  const m = re.exec(text);
  return m && m.index === i ? m[0] : null;
}

/** 专有名词 GUGUGAGA（不分大小写，前后不能是字母数字）。 */
function properAt(text, i) {
  const m = stickyRun(PROPER_AT, text, i);
  if (!m) return null;
  if (isAlnum(text[i - 1]) || isAlnum(text[i + m.length])) return null;
  return m;
}

/** 行内代码 span：单反引号或 n 个反引号配对。 */
function inlineCodeAt(text, i) {
  if (text[i] !== "\x60") return null;
  let n = 1;
  while (text[i + n] === "\x60") n += 1;
  const mark = "\x60".repeat(n);
  const end = text.indexOf(mark, i + n);
  if (end === -1) return null;
  return { open: mark, body: text.slice(i + n, end), close: mark, end: end + n };
}

/** autolink / HTML 标签：ASCII 尖括号内容逐字节保留；<表达式> 这种是散文，不掩码。 */
function angleAt(text, i) {
  if (text[i] !== "<") return null;
  const end = text.indexOf(">", i + 1);
  if (end === -1) return null;
  const inner = text.slice(i + 1, end);
  if (inner.includes("<") || CJK_KANA.test(inner)) return null;
  return text.slice(i, end + 1);
}

/** 从 start（指向 "(" 之后）找配对右括号，认反斜杠转义与嵌套括号。 */
function matchingParen(text, start) {
  let depth = 1;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 链接/图片：[label](target "title")；label 是散文，target 与 title 逐字节保留。 */
function linkAt(text, i) {
  const image = text[i] === "!" && text[i + 1] === "[";
  if (text[i] !== "[" && !image) return null;
  const open = image ? i + 1 : i;
  const close = text.indexOf("]", open + 1);
  if (close === -1 || text[close + 1] !== "(") return null;
  const paren = matchingParen(text, close + 2);
  if (paren === -1) return null;
  return {
    prefix: text.slice(i, open + 1),
    label: text.slice(open + 1, close),
    target: text.slice(close + 2, paren),
    rest: text.slice(close, paren + 1),
    end: paren + 1,
  };
}

/** i18n 导航行：行内首个 **…** 紧跟「：」或「:」，且行内有 "](" 链接。 */
const NAV_LEAD = /\*\*[^*\n]+\*\*/;

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

/**
 * 扫描一段文本：掩码片段逐字节照抄，其余「极大连续可替换串」交给 replacer。
 * mode = "prose"（按方言散文字符集）或 "code"（只换 CJK/假名）；
 * collect 收集没被掩码的散文（残留检查用），enGlyphs 把 en 产物里的 GU/GA 也当字形掩码。
 */
function transform(text, opts) {
  const mode = opts.mode;
  const dialect = opts.dialect;
  const nav = opts.nav === true;
  const collect = opts.collect || null;
  const one = mode === "prose" ? PROSE_ONE[dialect] : CJK_KANA;
  let out = "";
  let run = "";
  const flush = () => {
    if (!run) return;
    if (collect) collect.push(run);
    out += opts.replacer(run, dialect);
    run = "";
  };
  let i = 0;
  while (i < text.length) {
    const pathLen = pathAt(text, i);
    if (pathLen) {
      flush();
      out += text.slice(i, i + pathLen);
      i += pathLen;
      continue;
    }
    const glyph = stickyRun(GLYPH_RUN, text, i);
    if (glyph) {
      flush();
      out += glyph;
      i += glyph.length;
      continue;
    }
    const proper = properAt(text, i);
    if (proper) {
      flush();
      out += proper;
      i += proper.length;
      continue;
    }
    if (opts.enGlyphs) {
      const en = stickyRun(EN_GLYPH_RUN, text, i);
      if (en) {
        flush();
        out += en;
        i += en.length;
        continue;
      }
    }
    if (text[i] === "\\") {
      flush();
      out += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (mode === "prose") {
      const code = inlineCodeAt(text, i);
      if (code) {
        flush();
        out += code.open + transform(code.body, { mode: "code", dialect, replacer: opts.replacer, collect }) + code.close;
        i = code.end;
        continue;
      }
      const angle = angleAt(text, i);
      if (angle) {
        flush();
        out += angle;
        i += angle.length;
        continue;
      }
      const link = linkAt(text, i);
      if (link) {
        flush();
        const inner = transform(link.label, {
          mode: "prose",
          dialect: labelDialect(link.target, dialect, nav),
          nav,
          replacer: opts.replacer,
          collect,
          enGlyphs: opts.enGlyphs,
        });
        out += link.prefix + inner + link.rest;
        i = link.end;
        continue;
      }
      if ("*_~".includes(text[i])) {
        let n = 1;
        while (text[i + n] === text[i]) n += 1;
        flush();
        out += text.slice(i, i + n);
        i += n;
        continue;
      }
    }
    const ch = text[i];
    if (one.test(ch)) {
      run += ch;
      i += 1;
      continue;
    }
    flush();
    out += ch;
    i += 1;
  }
  flush();
  return out;
}

// --------------------------------------------------------------- 文档状态机

const FENCE_OPEN = /^(\s*)(\x60{3,}|~{3,})(.*)$/;
const LEADING_COMMENT = /^\s*<!--/;
// i18n 头部块只认「行首就是 HTML 注释」的标记：行内代码里写 <!-- i18n:begin --> 不算（否则整段被跳过）。
const I18N_BEGIN = /^\s*<!--\s*i18n:begin\s*-->/;
const I18N_END = /^\s*<!--\s*i18n:end\s*-->/;

function fenceOpenAt(line) {
  const m = FENCE_OPEN.exec(line);
  if (!m) return null;
  if (m[2][0] === "\x60" && m[3].includes("\x60")) return null; // 信息串里不能有反引号（CommonMark）
  return m[2];
}

function fenceCloses(line, marker) {
  const re = new RegExp("^" + marker[0].replace(/[.*+?^\${}()|[\]\\]/g, "\\$&") + "{" + marker.length + ",}$");
  return re.test(line.trim());
}

/**
 * 逐行过文档状态机：围栏块正文与 HTML 注释块是「代码」上下文；围栏行本身（含 info 串）与 i18n 头部块
 * 整块逐字节保留；其余是散文。
 */
function processDoc(source, dialect, render) {
  const out = [];
  let fence = null;
  let i18n = false;
  let comment = false;
  for (const line of source.split("\n")) {
    if (fence) {
      if (fenceCloses(line, fence)) {
        fence = null;
        out.push(line);
        continue;
      }
      out.push(render(line, "code"));
      continue;
    }
    if (i18n) {
      out.push(line);
      if (I18N_END.test(line)) i18n = false;
      continue;
    }
    if (I18N_BEGIN.test(line)) {
      out.push(line);
      if (!I18N_END.test(line)) i18n = true;
      continue;
    }
    if (comment) {
      out.push(render(line, "code"));
      if (line.includes("-->")) comment = false;
      continue;
    }
    const marker = fenceOpenAt(line);
    if (marker) {
      fence = marker;
      out.push(line);
      continue;
    }
    if (LEADING_COMMENT.test(line)) {
      out.push(render(line, "code"));
      if (!line.includes("-->")) comment = true;
      continue;
    }
    out.push(render(line, "prose"));
  }
  return out.join("\n");
}

/** 把一份可读文档换成产物。 */
export function redactDoc(source, dialect) {
  return processDoc(source, dialect, (line, mode) =>
    transform(line, { mode, dialect, nav: isNavLine(line), replacer: (run, d) => redactRun(run, d || dialect) }),
  );
}

/** 单行散文替换（测试与工具用）。 */
export function redactInline(text, dialect, nav) {
  return transform(text, { mode: "prose", dialect, nav: nav === true, replacer: (run, d) => redactRun(run, d || dialect) });
}

/**
 * 按同一套掩码重扫一份产物：散文区 / 代码区里还剩多少散文字符（规格要求 0）。
 * 不依赖 backup/，CI 里也能跑。
 */
export function residualProse(source, dialect) {
  const prose = [];
  const code = [];
  processDoc(source, dialect, (line, mode) =>
    transform(line, {
      mode,
      dialect,
      nav: isNavLine(line),
      replacer: (run) => run,
      collect: mode === "prose" ? prose : code,
      enGlyphs: mode === "prose",
    }),
  );
  return { prose: prose.join(""), code: code.join("") };
}

/** 散文区里位名字形占「位名 + 残留散文」的比例：产物 = 1，可读原文 ≈ 0。 */
export function glyphRatio(source, dialect) {
  let glyphs = 0;
  processDoc(source, dialect, (line, mode) => {
    if (mode === "prose") glyphs += (line.match(GLYPH[dialect]) || []).length;
    return line;
  });
  const left = [...residualProse(source, dialect).prose].length;
  const total = glyphs + left;
  return total === 0 ? 1 : glyphs / total;
}

/** 把一段文本里的位名字形折成占位符 θ（每 1 位 = 1 个 θ），用来比对各语言产物的骨架。 */
export function foldGlyphs(text) {
  return text
    .replace(/[\u5495\u560E\u30B0\u30AC\u3050\u304C]+/g, (run) => "θ".repeat(run.length))
    .replace(/(?:GU|GA)+/g, (run) => "θ".repeat(run.length / 2));
}

/** 两份文本首个不一致的行号（1 基）；一方缺失或为前缀时也能给出行号。 */
export function firstDiffLine(a, b) {
  const left = (a == null ? "" : a).split("\n");
  const right = (b == null ? "" : b).split("\n");
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
      if (check) {
        skipped += 1;
        console.log("· 跳过 " + rel + "（没有可读副本 " + READABLE_DIR + "/" + rel + "）");
        continue;
      }
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
    if (!existsSync(target)) {
      bad += 1;
      console.error("✗ " + rel + "：产物不存在");
      continue;
    }
    const current = readFileSync(target, "utf8");
    if (current === product) {
      ok += 1;
      console.log("✓ " + rel);
      continue;
    }
    bad += 1;
    console.error("✗ " + rel + "：与可读副本重算的结果不一致（首个差异在第 " + firstDiffLine(current, product) + " 行）");
  }
  if (check) console.log("通过：" + ok + " 份；跳过：" + skipped + " 份" + (bad ? "；不一致：" + bad + " 份" : ""));
  process.exit(bad ? 1 : 0);
}
