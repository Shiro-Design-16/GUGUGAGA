#!/usr/bin/env node
// 校验 9 份中文文档的 ja/en 译文：结构、方言等价、输出逐字、数字与路径不漂移、可运行示例真跑。
// 用法：node scripts/check-translations.mjs [文档过滤子串] [语言 ja|en]
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = [
  "README.md",
  "TUTORIAL.md",
  "SPEC.md",
  "translator/README.md",
  "translator/CONTRACT.md",
  "vscode/README.md",
  "vscode/CONTRACT.md",
  "vscode/gugugaga/README.md",
  "docs/名字对照表.md",
];
const MARK = { ja: "**日本語**", en: "**English**" };
const SUFFIX = { zh: ".咕咕", ja: ".ググ", en: ".gu" };

const filter = (process.argv[2] || "").toLowerCase();
const langFilter = process.argv[3] || "";

const problems = [];
const notes = [];
function fail(doc, msg) {
  problems.push(doc + ": " + msg);
}

function readText(p) {
  return readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
}

function stripHeader(doc, text, lang) {
  const m = /^<!-- i18n:begin -->\n([\s\S]*?)<!-- i18n:end -->\n?/.exec(text);
  if (!m) {
    fail(doc, "缺少 <!-- i18n:begin --> ... <!-- i18n:end --> 头部块");
    return text;
  }
  if (!m[1].includes(MARK[lang])) fail(doc, "头部块里没有语言标记 " + MARK[lang]);
  return text.slice(m[0].length);
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

  for (const lang of ["ja", "en"]) {
    if (langFilter && langFilter !== lang) continue;
    const target = src.replace(/\.md$/, "." + lang + ".md");
    if (!existsSync(join(ROOT, target))) {
      fail(target, "文件不存在");
      continue;
    }
    checked += 1;
    const body = stripHeader(target, readText(target), lang);

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
        } else if (s !== tf[i].body) {
          fail(target, "第 " + (i + 1) + " 个块是输出/命令/图表，必须逐字一致（源码块第 " + srcFences[i].open + " 行起）");
        }
      }
      const rs = srcFences.filter((f) => isProgram(f.body) && isEntryProgram(f.body));
      for (let k = 0; k < rs.length; k += 1) {
        const idx = srcFences.indexOf(rs[k]);
        const a = runProgram(rs[k].body, "zh", "src-" + k);
        const b = runProgram(tf[idx].body, lang, lang + "-" + k);
        if (a.code !== b.code) fail(target, "可运行示例 #" + (k + 1) + " 退出码 " + b.code + " ≠ 原文 " + a.code);
        else if (a.stdout !== b.stdout) fail(target, "可运行示例 #" + (k + 1) + " stdout 与原文不逐字节相同");
        else notes.push(target + ": 示例 #" + (k + 1) + " 真跑一致（" + a.stdout.length + " 字符，exit " + a.code + "）");
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

    const inlineProgs = (text) =>
      multiset(
        [...text.matchAll(/\x60([^\x60\n]+)\x60/g)]
          .map((m) => tidy(m[1]))
          .filter((t) => /^[01!?: ]+$/.test(t) && /[01]/.test(t)),
      );
    const ip = diffMultiset(inlineProgs(srcText), inlineProgs(body));
    if (ip.missing.length) fail(target, "正文里引用的写法缺失/改动: " + ip.missing.slice(0, 8).map((x) => JSON.stringify(x)).join(", "));
    if (ip.extra.length) fail(target, "正文里多出写法: " + ip.extra.slice(0, 8).map((x) => JSON.stringify(x)).join(", "));
  }
}

if (matched === 0) fail(process.argv[2] || "(全部)", "没有匹配到任何文档——检查过滤参数（路径前缀）与文件名");

for (const n of notes) console.log("  · " + n);
if (problems.length) {
  console.error("\n未通过 " + problems.length + " 项：");
  for (const p of problems) console.error("  ✗ " + p);
  console.error("\n检查了 " + checked + " 个译文文件。");
  process.exit(1);
}
console.log("通过：" + checked + " 个译文文件全部与原文结构一致、示例可跑且输出相同。");
