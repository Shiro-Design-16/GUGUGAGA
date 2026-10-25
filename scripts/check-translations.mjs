#!/usr/bin/env node
// 校验 12 份中文文档的 ja/en 译文：结构、方言等价、输出逐字、数字与路径不漂移、可运行示例真跑。
// 用法：node scripts/check-translations.mjs [文档过滤子串] [语言 ja|en]
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dialectOfDoc, foldGlyphs, glyphRatio, readableOf, redactDoc, residualProse } from "./md-bits.mjs";

// 与 md-bits.mjs 共用同一个根：MD_BITS_ROOT 用于在 /tmp 夹具上跑（不碰真仓库）。
const ROOT = process.env.MD_BITS_ROOT ? resolve(process.env.MD_BITS_ROOT) : join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "TUTORIAL.md",
  "SPEC.md",
  "translator/README.md",
  "translator/CONTRACT.md",
  "vscode/README.md",
  "vscode/CONTRACT.md",
  "vscode/gugugaga/README.md",
  "docs/名字对照表.md",
  "docs/翻译规范.md",
];
const SUFFIX = { zh: ".咕咕", ja: ".ググ", en: ".gu" };

const filter = (process.argv[2] || "").toLowerCase();
const langFilter = process.argv[3] || "";

const problems = [];
const notes = [];
function fail(doc, msg) {
  problems.push(doc + ": " + msg);
}

// 产物是「等长替换式骨架保留」文档：骨架（代码、数字、链接目标、结构）原样，散文换成位名。
// 所以不再解码，直接读原文比较；另外两件事也在这一层做：散文确实被替换过、能与可读副本重算对上。
let recomputed = 0;
let recomputeSkipped = 0;
function readText(p) {
  const raw = readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
  const dialect = dialectOfDoc(p);
  const ratio = glyphRatio(raw, dialect);
  if (ratio < 0.5) fail(p, "散文区没有替换（位名占比 " + ratio.toFixed(2) + " < 0.5）");
  // 直接扫产物（不依赖 backup/，CI 里也能跑）：散文区不该再剩散文，代码区不该再剩 CJK/假名。
  const left = residualProse(raw, dialect);
  const peek = (s) => [...s].slice(0, 8).join("");
  if (left.prose) fail(p, "散文区残留 " + [...left.prose].length + " 个散文字符（如「" + peek(left.prose) + "」）");
  if (left.code) fail(p, "代码区残留 " + [...left.code].length + " 个 CJK/假名字符（如「" + peek(left.code) + "」）");
  const readable = readableOf(p);
  if (!existsSync(readable)) {
    recomputeSkipped += 1;
    return raw;
  }
  recomputed += 1;
  if (redactDoc(readFileSync(readable, "utf8").replace(/\r\n/g, "\n"), dialect) !== raw) {
    fail(p, "与 backup/readable 重算的结果不一致");
  }
  return raw;
}

const I18N_BEGIN = "<!-- i18n:begin -->";
const I18N_END = "<!-- i18n:end -->";

/**
 * 头部块 = begin 标记行 + 内容行 + end 标记行。两行标记逐字节保留，块内容与正文一样是被替换过的位名，
 * 所以语言只能由文件名后缀判定（产物里已经没有「**日本語**」这种语言标记了）。
 */
function splitHeader(doc, text, lang) {
  if (!doc.endsWith("." + lang + ".md")) {
    fail(doc, "文件名后缀与语言 " + lang + " 不一致——语言只由后缀判定");
    return { block: null, body: text };
  }
  const lines = text.split("\n");
  if (lines[0] !== I18N_BEGIN) {
    fail(doc, "第 1 行不是 " + I18N_BEGIN + " 头部块");
    return { block: null, body: text };
  }
  const close = lines.indexOf(I18N_END, 1);
  if (close < 0) {
    fail(doc, "头部块缺少 " + I18N_END + "（没有闭合）");
    return { block: null, body: text };
  }
  // 只认头部这一对标记行：文档正文（含围栏里的模板示例）还会提到这两串，不能用全文计数。
  const inside = lines.slice(1, close).filter((l) => l === I18N_BEGIN || l === I18N_END).length;
  if (inside !== 0) fail(doc, "头部块内混进了 " + inside + " 行标记，块边界不唯一");
  return { block: lines.slice(1, close), body: lines.slice(close + 1).join("\n") };
}

const THETA = "\u03b8";

/**
 * 头部块一行的骨架：字形串（含 GU/GA）折成一个 θ、语言后缀归一成 .L.md、全角标点按 NFKC 归一，
 * 最后把所有非字母数字串（空白、标点、残留散文）折成 θ。三语同为「等长替换式骨架保留」，
 * 折完之后这份骨架必须完全相同——翻译版只有字形与语言，没有别的差异。
 */
function headerShape(line) {
  return line
    .replace(/[\u5495\u560E\u30B0\u30AC\u3050\u304C]+/g, THETA)
    .replace(/(?:GU|GA)+/g, THETA)
    .replace(/\.(?:ja|en)\.md/gi, ".L.md")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9]+/g, THETA)
    .replace(new RegExp("^" + THETA + "|" + THETA + "$", "g"), "");
}

/** 两份译文的头部块必须同构：行数一致，逐行骨架一致。 */
function compareHeaders(src, headers) {
  const a = headers.ja;
  const b = headers.en;
  if (!a || !b) return;
  const jaDoc = src.replace(/\.md$/, ".ja.md");
  const enDoc = src.replace(/\.md$/, ".en.md");
  if (a.length !== b.length) {
    fail(enDoc, "i18n 头部块内容 " + b.length + " 行 ≠ " + jaDoc + " 的 " + a.length + " 行");
    return;
  }
  for (let i = 0; i < a.length; i += 1) {
    const x = headerShape(a[i]);
    const y = headerShape(b[i]);
    if (x !== y) fail(enDoc, "i18n 头部块第 " + (i + 2) + " 行骨架「" + y + "」≠ " + jaDoc + " 的「" + x + "」");
  }
}

function headings(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const m = /^(#{1,6})\s/.exec(line);
    if (m) out.push(m[1].length);
  }
  return out;
}

function fences(text) {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^\x60\x60\x60(\w*)\s*$/.exec(lines[i]);
    if (!open) continue;
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      if (/^\x60\x60\x60\s*$/.test(lines[j])) break;
      body.push(lines[j]);
    }
    out.push({ lang: open[1], body: body.join("\n"), open: i + 1 });
    i = j;
  }
  return out;
}

function multiset(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

function diffMultiset(a, b) {
  const missing = [];
  const extra = [];
  for (const [k, n] of a) if ((b.get(k) || 0) < n) missing.push(k + " x" + (n - (b.get(k) || 0)));
  for (const [k, n] of b) if ((a.get(k) || 0) < n) extra.push(k + " x" + (n - (a.get(k) || 0)));
  return { missing, extra };
}

// 逐字符归一：位名 -> 0/1，全角标点 -> 半角，U+3000 -> 空格
function canon(body) {
  const out = [];
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "咕" || ch === "グ" || ch === "ぐ") out.push("0");
    else if (ch === "嘎" || ch === "ガ" || ch === "が") out.push("1");
    else if (ch === "G" || ch === "g") {
      const nx = body[i + 1];
      if (nx === "U" || nx === "u") { out.push("0"); i += 1; }
      else if (nx === "A" || nx === "a") { out.push("1"); i += 1; }
      else out.push(ch);
    } else if (ch === "！" || ch === "!") out.push("!");
    else if (ch === "？" || ch === "?") out.push("?");
    else if (ch === "：" || ch === ":") out.push(":");
    else if (ch === "\u3000" || ch === " ") out.push(" ");
    else out.push(ch);
  }
  return out.join("");
}

function tidy(body) {
  const lines = canon(body).split("\n").map((l) => l.replace(/\s+$/, ""));
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function isProgram(body) {
  const t = tidy(body);
  return /^[01!?: \n]+$/.test(t) && /[01]/.test(t);
}

function isEntryProgram(body) {
  const t = tidy(body);
  const first = t.split("\n").find((l) => l.trim() !== "") || "";
  return /^0011!/.test(first.trim());
}

const SYMBOL = {
  zh: { 0: "咕", 1: "嘎", bang: "！", ques: "？", colon: "：", space: " " },
  ja: { 0: "グ", 1: "ガ", bang: "！", ques: "？", colon: "：", space: "\u3000" },
  en: { 0: "GU", 1: "GA", bang: "!", ques: "?", colon: ":", space: " " },
};
function render(canonText, lang) {
  const s = SYMBOL[lang];
  return canonText.replace(/[01!?: ]/g, (ch) => (ch === "0" ? s[0] : ch === "1" ? s[1] : ch === "!" ? s.bang : ch === "?" ? s.ques : ch === ":" ? s.colon : " "));
}

const BIT_ZERO = new Set(["咕", "グ", "ぐ"]);
const BIT_ONE = new Set(["嘎", "ガ", "が"]);
// 把三种方言的位名归一成 "0"/"1"，其余字符原样保留（换行等分隔也参与比较）
function canonBits(text) {
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const next = chars[i + 1] || "";
    if (BIT_ZERO.has(ch)) out += "0";
    else if (BIT_ONE.has(ch)) out += "1";
    else if ((ch === "G" || ch === "g") && "UuAa".includes(next)) {
      out += "Uu".includes(next) ? "0" : "1";
      i += 1;
    } else out += ch;
  }
  return out;
}

const tmpRoot = mkdtempSync(join(tmpdir(), "ggi18n-"));
function runProgram(body, lang, tag) {
  const file = join(tmpRoot, tag + SUFFIX[lang]);
  writeFileSync(file, render(tidy(body), lang) + "\n", "utf8");
  try {
    const out = execFileSync(process.execPath, [join(ROOT, "bin/gg.ts"), file], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20000,
    });
    return { code: 0, stdout: out.toString("utf8") };
  } catch (err) {
    return {
      code: typeof err.status === "number" ? err.status : -1,
      stdout: err.stdout ? err.stdout.toString("utf8") : "",
      timedOut: Boolean(err.signal),
    };
  }
}

let checked = 0;
let matched = 0;
for (const src of SOURCES) {
  const id = src.replace(/\.md$/, "");
  const hit = (a, b) => b === filter || b.startsWith(filter) || a === filter || a.startsWith(filter);
  if (filter && !hit(id.toLowerCase(), src.toLowerCase())) continue;
  matched += 1;
  let srcText;
  try {
    srcText = readText(src);
  } catch {
    fail(src, "读不到原文");
    continue;
  }
  const srcFences = fences(srcText);
  const srcNums = multiset(srcText.match(/\d+(?:\.\d+)?/g) || []);
  const srcAsciiInline = new Set(
    [...srcText.matchAll(/\x60([^\x60\n]+)\x60/g)].map((m) => m[1]).filter((t) => /^[\x20-\x7e]+$/.test(t)),
  );
  const srcCritical = new Set(
    [...srcAsciiInline].filter((t) => /[/\\]/.test(t) || /\.(ts|js|json|md|vsix|plan)$/.test(t) || /^\.?咕咕$/.test(t)),
  );

  const headers = {};
  for (const lang of ["ja", "en"]) {
    if (langFilter && langFilter !== lang) continue;
    const target = src.replace(/\.md$/, "." + lang + ".md");
    if (!existsSync(join(ROOT, target))) {
      fail(target, "文件不存在");
      continue;
    }
    checked += 1;
    const { block, body } = splitHeader(target, readText(target), lang);
    headers[lang] = block;

    const hs = headings(body);
    const sh = headings(srcText);
    if (hs.length !== sh.length) fail(target, "标题数 " + hs.length + " ≠ 原文 " + sh.length);
    else if (hs.join(",") !== sh.join(",")) fail(target, "标题层级序列与原文不一致");

    const tf = fences(body);
    if (tf.length !== srcFences.length) fail(target, "代码块 " + tf.length + " ≠ 原文 " + srcFences.length);
    else {
      for (let i = 0; i < tf.length; i += 1) {
        if (tf[i].lang !== srcFences[i].lang) {
          fail(target, "第 " + (i + 1) + " 个代码块语言标记 '" + tf[i].lang + "' ≠ 原文 '" + srcFences[i].lang + "'");
        }
        const s = srcFences[i].body;
        if (isProgram(s)) {
          if (!isProgram(tf[i].body)) fail(target, "第 " + (i + 1) + " 个代码块本应是咕嘎语源码（方言已改写）");
          else if (tidy(s) !== tidy(tf[i].body)) fail(target, "第 " + (i + 1) + " 个源码块与原文方言不等价（源码块第 " + srcFences[i].open + " 行起）");
        } else if (s.split("\n").length !== tf[i].body.split("\n").length) {
          fail(target, "第 " + (i + 1) + " 个块的行数 " + tf[i].body.split("\n").length + " ≠ 原文 " + s.split("\n").length + "（源码块第 " + srcFences[i].open + " 行起）");
        } else if (foldGlyphs(s) !== foldGlyphs(tf[i].body)) {
          fail(target, "第 " + (i + 1) + " 个块是输出/命令/图表，骨架（位名折成 θ 后）必须逐字一致（源码块第 " + srcFences[i].open + " 行起）");
        }
      }
      const rs = srcFences.filter((f) => isProgram(f.body) && isEntryProgram(f.body));
      for (let k = 0; k < rs.length; k += 1) {
        const idx = srcFences.indexOf(rs[k]);
        const a = runProgram(rs[k].body, "zh", "src-" + k);
        const b = runProgram(tf[idx].body, lang, lang + "-" + k);
        if (a.code !== b.code) fail(target, "可运行示例 #" + (k + 1) + " 退出码 " + b.code + " ≠ 原文 " + a.code);
        else if (canonBits(a.stdout) !== canonBits(b.stdout)) fail(target, "可运行示例 #" + (k + 1) + " 归一化后位流与原文不同");
        else if (render(canonBits(b.stdout), lang) !== b.stdout) fail(target, "可运行示例 #" + (k + 1) + " 的输出位名不是 " + lang + " 字形");
        else notes.push(target + ": 示例 #" + (k + 1) + " 真跑一致（" + canonBits(a.stdout).length + " 位，exit " + a.code + "）");
      }
    }

    const nums = multiset(body.match(/\d+(?:\.\d+)?/g) || []);
    const d = diffMultiset(srcNums, nums);
    if (d.missing.length) fail(target, "数字缺失/改动: " + d.missing.slice(0, 8).join(", "));
    if (d.extra.length) fail(target, "多出数字: " + d.extra.slice(0, 8).join(", "));

    const asciiInline = new Set(
      [...body.matchAll(/\x60([^\x60\n]+)\x60/g)].map((m) => m[1]).filter((t) => /^[\x20-\x7e]+$/.test(t)),
    );
    const lost = [...srcCritical].filter((t) => !asciiInline.has(t));
    if (lost.length) fail(target, "路径/文件名丢了: " + lost.slice(0, 8).join(", "));
  }
  compareHeaders(src, headers);
}

if (matched === 0) fail(process.argv[2] || "(全部)", "没有匹配到任何文档——检查过滤参数（路径前缀）与文件名");

for (const n of notes) console.log("  · " + n);
console.log("  · 骨架与位名重算校验：" + recomputed + " 份（跳过 " + recomputeSkipped + " 份）");
if (problems.length) {
  console.error("\n未通过 " + problems.length + " 项：");
  for (const p of problems) console.error("  ✗ " + p);
  console.error("\n检查了 " + checked + " 个译文文件。");
  process.exit(1);
}
console.log("通过：" + checked + " 个译文文件全部与原文结构一致、示例可跑且输出相同。");
