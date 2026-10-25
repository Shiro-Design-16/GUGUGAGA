#!/usr/bin/env node
// 把 md-bits.mjs 位串化过的文档解回可读文本。
// 用法：node scripts/md-bits-decode.mjs [--out 目录] [文件…]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_FILES, decodeDocIfBitified, dialectOfDoc } from "./md-bits.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const list = files.length ? files : DOC_FILES;
let bad = 0;
for (const rel of list) {
  const source = readFileSync(join(ROOT, rel), "utf8");
  const { text, bitified } = decodeDocIfBitified(source, dialectOfDoc(rel));
  if (!bitified) { console.error("不是位串化的文档：" + rel); bad += 1; continue; }
  if (outDir) {
    const target = join(outDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log("已解码 " + rel);
  } else {
    process.stdout.write(text);
  }
}
process.exit(bad ? 1 : 0);
