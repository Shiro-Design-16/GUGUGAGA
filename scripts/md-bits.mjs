#!/usr/bin/env node
// 把 Markdown 文档里的自然语言片段换成咕嘎位串（逐片段编码），或反向解码。
// 结构（标题记号、列表记号、表格竖线、代码围栏、行内代码、链接 URL、HTML 注释）原样保留。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { bytesToBits, bitsToBytes, renderBits, normalizeBitsLoose, decodeUtf8Strict } from "../translator/src/bits.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const DOC_SUFFIX_DIALECT = [["\.ja\.md$", "ja"], ["\.en\.md$", "en"], ["\.md$", "zh"]];

export function dialectOfDoc(path) {
  for (const [re, d] of DOC_SUFFIX_DIALECT) if (new RegExp(re).test(path)) return d;
  return "zh";
}

const BIT_CHARS = { zh: /[\u5495\u560E]/, ja: /[\u30B0\u30AC\u3050\u304C]/, en: /[GgUuAa]/ };

export function encodeProse(text, dialect) {
  if (text === "") return "";
  return renderBits(bytesToBits(new TextEncoder().encode(text)), dialect);
}

export function decodeProse(glyphs, dialect) {
  const bits = normalizeBitsLoose(glyphs);
  if (bits.length === 0 || bits.length % 8 !== 0) return null;
  try {
    const text = decodeUtf8Strict(bitsToBytes(bits), "bit doc");
    return encodeProse(text, dialect) === glyphs ? text : null;
  } catch {
    return null;
  }
}

const FENCE = /^(\s*)(`{3,}|~{3,})/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;
const HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const STRUCT_PREFIX = /^(\s*)(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)?/;

function splitTableRow(line) {
  const parts = line.split("|");
  return { cells: parts.slice(1, -1), hasLeading: line.startsWith("|") };
}

// 把一段行内文本切成 [{keep}|{prose}] 片段
export function scanInline(text) {
  const out = [];
  let buf = "";
  const flush = () => { if (buf) { out.push({ prose: buf }); buf = ""; } };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") { flush(); out.push({ keep: text.slice(i, i + 2) }); i += 2; continue; }
    if (ch === "`") {
      let n = 1;
      while (text[i + n] === "`") n += 1;
      const fence = "`".repeat(n);
      const end = text.indexOf(fence, i + n);
      if (end !== -1) { flush(); out.push({ keep: text.slice(i, end + n) }); i = end + n; continue; }
    }
    if (ch === "<") {
      const end = text.indexOf(">", i + 1);
      if (end !== -1 && !text.slice(i, end).includes(" ")) { flush(); out.push({ keep: text.slice(i, end + 1) }); i = end + 1; continue; }
    }
    if (ch === "[" || (ch === "!" && text[i + 1] === "[")) {
      const start = ch === "!" ? i + 1 : i;
      const close = text.indexOf("]", start + 1);
      if (close !== -1 && text[close + 1] === "(") {
        const paren = text.indexOf(")", close + 2);
        if (paren !== -1) {
          flush();
          out.push({ keep: text.slice(i, start + 1) });
          out.push(...scanInline(text.slice(start + 1, close)));
          out.push({ keep: text.slice(close, paren + 1) });
          i = paren + 1;
          continue;
        }
      }
    }
    if ("*_~".includes(ch)) {
      let n = 1;
      while (text[i + n] === ch) n += 1;
      flush(); out.push({ keep: ch.repeat(n) }); i += n; continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

function processInline(text, fn) {
  return scanInline(text).map((seg) => (seg.keep !== undefined ? seg.keep : fn(seg.prose))).join("");
}

export function transformDoc(source, dialect, direction) {
  const lines = source.split("\n");
  const out = [];
  let fence = null;
  let comment = false;
  const fn = direction === "encode"
    ? (s) => encodeProse(s, dialect)
    : (s) => { const d = decodeProse(s, dialect); return d === null ? s : d; };
  for (const line of lines) {
    if (fence) { out.push(line); const m = FENCE.exec(line); if (m && line.trim().startsWith(fence)) fence = null; continue; }
    if (comment) { out.push(line); if (line.includes("-->")) comment = false; continue; }
    const f = FENCE.exec(line);
    if (f) { fence = f[2]; out.push(line); continue; }
    if (line.trimStart().startsWith("<!--")) { out.push(line); if (!line.includes("-->")) comment = true; continue; }
    if (line.trim() === "" || TABLE_SEP.test(line) || HR.test(line)) { out.push(line); continue; }
    if (line.trimStart().startsWith("|")) {
      const { cells, hasLeading } = splitTableRow(line);
      if (!hasLeading) { out.push(line); continue; }
      const encoded = cells.map((c) => {
        if (c.trim() === "") return c;
        const lead = /^\s*/.exec(c)[0];
        const tail = /\s*$/.exec(c)[0];
        const start = lead.length;
        const end = Math.max(start, c.length - tail.length);
        return lead + processInline(c.slice(start, end), fn) + tail;
      });
      out.push("|" + encoded.join("|") + "|");
      continue;
    }
    const p = STRUCT_PREFIX.exec(line);
    const prefix = p[0];
    out.push(prefix + processInline(line.slice(prefix.length), fn));
  }
  return out.join("\n");
}

export function encodeDoc(source, dialect) { return transformDoc(source, dialect, "encode"); }
export function decodeDoc(source, dialect) { return transformDoc(source, dialect, "decode"); }

const GLYPH = /[\u5495\u560E\u30B0\u30AC\u3050\u304C]|[Gg][Uu]|[Gg][Aa]/g;
const PUNCT = /[\s|\uFF01\uFF1F\uFF1A!?:>*_~`#+\-\[\]()]/g;

// 位名字形在正文里占的比例；位串化后的文档接近 1，可读文档接近 0。
export function glyphDensity(source) {
  let glyphs = 0;
  let total = 0;
  let fence = null;
  let comment = false;
  for (const line of source.split("\n")) {
    if (fence) { const m = FENCE.exec(line); if (m && line.trim().startsWith(fence)) fence = null; continue; }
    if (comment) { if (line.includes("-->")) comment = false; continue; }
    const f = FENCE.exec(line);
    if (f) { fence = f[2]; continue; }
    if (line.trimStart().startsWith("<!--")) { if (!line.includes("-->")) comment = true; continue; }
    const body = line.slice(STRUCT_PREFIX.exec(line)[0].length).replace(/`[^`\n]*`/g, "");
    for (const m of body.matchAll(GLYPH)) glyphs += m[0].length;
    total += body.replace(PUNCT, "").length;
  }
  return total === 0 ? 0 : glyphs / total;
}

// 已位串化的文档解回可读文本；解不动（说明还是可读版）就原样返回。
export function decodeDocIfBitified(source, dialect) {
  if (glyphDensity(source) < 0.5) return { text: source, bitified: false };
  try {
    return { text: transformDoc(source, dialect, "decode"), bitified: true };
  } catch {
    return { text: source, bitified: false };
  }
}

export const DOC_FILES = [
  "README.md", "README.ja.md", "README.en.md",
  "SPEC.md", "SPEC.ja.md", "SPEC.en.md",
  "TUTORIAL.md", "TUTORIAL.ja.md", "TUTORIAL.en.md",
  "translator/README.md", "translator/README.ja.md", "translator/README.en.md",
  "translator/CONTRACT.md", "translator/CONTRACT.ja.md", "translator/CONTRACT.en.md",
  "vscode/README.md", "vscode/README.ja.md", "vscode/README.en.md",
  "vscode/CONTRACT.md", "vscode/CONTRACT.ja.md", "vscode/CONTRACT.en.md",
  "vscode/gugugaga/README.md", "vscode/gugugaga/README.ja.md", "vscode/gugugaga/README.en.md",
  "docs/名字对照表.md", "docs/名字对照表.ja.md", "docs/名字对照表.en.md",
  "docs/翻译规范.md",
];

if (import.meta.url === "file://" + process.argv[1]) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const files = only.length ? only : DOC_FILES;
  let bad = 0;
  let refused = 0;
  for (const rel of files) {
    const dialect = dialectOfDoc(rel);
    const source = readFileSync(join(ROOT, rel), "utf8");
    const bitified = glyphDensity(source) >= 0.5;

    if (check && bitified) {
      try {
        const plain = transformDoc(source, dialect, "decode");
        const again = encodeDoc(plain, dialect);
        if (again !== source) { bad += 1; console.error("解回再编码不一致：" + rel); }
      } catch {
        bad += 1;
        console.error("解不回来：" + rel);
      }
      continue;
    }

    if (!check && bitified && !force) {
      refused += 1;
      console.error("拒绝二次编码：" + rel + "（看着已经位串化了；确实要重编码请加 --force）");
      continue;
    }

    const encoded = encodeDoc(source, dialect);
    const back = decodeDoc(encoded, dialect);
    if (back !== source) { bad += 1; console.error("往返失败：" + rel); continue; }
    if (!check) { writeFileSync(join(ROOT, rel), encoded); console.log("已编码 " + rel + "（" + dialect + "，" + source.length + " → " + encoded.length + " 字符）"); }
  }
  if (check) console.log(bad ? "往返失败 " + bad + " 份" : "往返通过：" + files.length + " 份文档");
  if (refused) console.error("跳过 " + refused + " 份已位串化的文件");
  process.exit(bad || refused ? 1 : 0);
}

export { relative, mkdirSync };