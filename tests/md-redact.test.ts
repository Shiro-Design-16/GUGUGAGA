/**
 * scripts/md-bits.mjs：等长替换式骨架保留。
 *
 * 断言的是规格而不是实现细节：散文逐字符换成位名，骨架（围栏、行内代码、数字、ASCII 术语、
 * 链接目标、结构记号）逐字节不变；位名由原文确定性推导；--check 能发现被篡改的产物。
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { DOC_FILES, dialectOfDoc, glyphRatio, readableOf, redactDoc, redactRun } from "../scripts/md-bits.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "md-bits.mjs");

const ZH_GLYPH = /^[\u5495\u560E]+$/;
const JA_GLYPH = /^[\u30B0\u30AC]+$/;
const EN_GLYPH = /^(?:GU|GA)+$/;

/** 在 /tmp 夹具上跑 CLI（MD_BITS_ROOT 把仓库根指过去，不碰真仓库）。 */
function runCli(root: string, args: string[]): string {
  return execFileSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    env: { ...process.env, MD_BITS_ROOT: root },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("zh：一个散文字符换成一个位名，行结构与标点原样", () => {
  const source = "## 标题一与二是三\n\n普通散文，带标点。\n";
  const out = redactDoc(source, "zh");
  const prose = [...source].filter((ch) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(ch)).length;
  const glyphs = out.match(/[\u5495\u560E]/g) || [];
  assert.equal(glyphs.length, prose, "位名个数应等于散文字符数");
  assert.equal(out.length, source.length, "zh 产物应与可读版等长");
  assert.ok(out.startsWith("## "), "标题记号应保留");
  assert.ok(out.includes("\n\n"), "空行应保留");
  assert.ok(out.includes("，") && out.includes("。"), "全角标点应保留");
  assert.ok(!/[\u4E00-\u9FFF]/.test(out.replace(/[\u5495\u560E]/g, "")), "除位名外不应残留汉字");
});

test("en：一个字母换成两个字符（行变两倍长）", () => {
  const out = redactDoc("hello world", "en");
  assert.equal(out.length, 21, "5 + 空格 + 5 个字母 → 10 + 1 + 10 个字符");
  assert.match(out, /^(?:GU|GA){5} (?:GU|GA){5}$/);
});

test("代码围栏整块逐字节不变（含围栏行与语言标记）", () => {
  const block = ["```sh", "npm run build  # 构建", "node bin/gg.ts examples/咕嘎咕嘎.咕咕", "```"].join("\n");
  const source = "前一段散文。\n\n" + block + "\n\n后一段散文。\n";
  const out = redactDoc(source, "zh");
  assert.ok(out.includes(block), "围栏块必须逐字节保留");
  assert.notEqual(out.split("\n")[0], source.split("\n")[0], "围栏外的散文应被替换");
  assert.equal(out.split("\n").length, source.split("\n").length, "行数不变");
});

test("行内代码逐字节不变（单反引号与双反引号）", () => {
  const source = "看 `咕咕嘎嘎！` 与 `gg --help` 两处，还有 ``a`b`` 这种。\n";
  const out = redactDoc(source, "zh");
  for (const span of ["`咕咕嘎嘎！`", "`gg --help`", "``a`b``"]) {
    assert.ok(out.includes(span), span + " 必须原样保留");
  }
});

test("数字与 ASCII 术语原样保留（1.0.0 / 2026-10-25 / GGDIAG / UTF-8）", () => {
  const source = "版本 1.0.0 发布于 2026-10-25，编码 UTF-8，诊断帧 GGDIAG v1 共 156 位。\n";
  const out = redactDoc(source, "zh");
  for (const token of ["1.0.0", "2026-10-25", "UTF-8", "GGDIAG", "v1", "156"]) {
    assert.ok(out.includes(token), token + " 必须原样保留");
  }
});

test("i18n 导航行：label 按 target 后缀的方言替换，行内其余散文按本文件方言", () => {
  const line = "**语言**：[中文](README.md) ｜ [日本語](README.ja.md) ｜ [English](README.en.md)";
  const out = redactDoc(line, "zh");
  const label = (markdown: string, target: string): string => {
    const m = new RegExp("\\[([^\\]]+)\\]\\(" + target.replace(/\./g, "\\.") + "\\)").exec(markdown);
    assert.ok(m, "找不到指向 " + target + " 的链接");
    return m[1];
  };
  assert.match(label(out, "README.md"), ZH_GLYPH);
  assert.match(label(out, "README.ja.md"), JA_GLYPH);
  assert.match(label(out, "README.en.md"), EN_GLYPH);
  assert.equal(label(out, "README.en.md").length, 14, "English 七个字母 → 十四个字符");
  assert.match(out, /^\*\*[\u5495\u560E]+\*\*：/, "「语言」按本文件 zh 方言替换");
  assert.match(redactDoc("[日本語](README.ja.md)", "zh"), /^\[[\u5495\u560E]+\]\(/, "非导航行的 label 跟本文件方言");
});

test("确定性：同输入同输出；改一个散文字符，位名全变", () => {
  const once = redactDoc("同一段散文", "zh");
  assert.equal(once, redactDoc("同一段散文", "zh"));
  assert.equal(once.length, 5, "五个散文字符 → 五个位名");
  assert.match(once, ZH_GLYPH);
  assert.notEqual(redactRun("同一段散文", "zh"), redactRun("同一段散我", "zh"));
});

test("位名占比：可读原文 ≈ 0，产物 = 1（checker 的「没有替换」判据）", () => {
  const readable = "# 标题\n\n一段散文，带 `代码` 与 1.0.0。\n";
  const product = redactDoc(readable, "zh");
  assert.ok(glyphRatio(readable, "zh") < 0.1, "可读原文的位名占比应接近 0");
  assert.equal(glyphRatio(product, "zh"), 1, "产物的散文应全被替换");
});

test("--check：与可读副本重算一致时退出 0，被篡改时退出 1 并指出首个差异行", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "md-bits-check-"));
  fs.mkdirSync(path.join(dir, "backup", "readable"), { recursive: true });
  const source = "# 标题\n\n一段散文。\n";
  fs.writeFileSync(path.join(dir, "backup", "readable", "SAMPLE.md"), source);
  runCli(dir, ["SAMPLE.md"]);
  const product = fs.readFileSync(path.join(dir, "SAMPLE.md"), "utf8");
  assert.equal(product, redactDoc(source, "zh"), "CLI 写出的产物应等于纯函数的结果");
  assert.match(runCli(dir, ["--check", "SAMPLE.md"]), /✓ SAMPLE\.md/);
  const lines = product.split("\n");
  lines[2] = "篡改";
  fs.writeFileSync(path.join(dir, "SAMPLE.md"), lines.join("\n"));
  assert.throws(
    () => runCli(dir, ["--check", "SAMPLE.md"]),
    (err: any) => err.status === 1 && /✗ SAMPLE\.md：与可读副本重算的结果不一致（首个差异在第 3 行）/.test(String(err.stderr)),
  );
});

test("--check：没有 backup/readable 时记「跳过」并退出 0（CI 里没有备份）", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "md-bits-nobackup-"));
  const out = runCli(dir, ["--check"]);
  assert.match(out, /通过：0 份；跳过：36 份/);
});

test("方言映射、清单与可读副本路径", () => {
  assert.equal(dialectOfDoc("README.md"), "zh");
  assert.equal(dialectOfDoc("README.ja.md"), "ja");
  assert.equal(dialectOfDoc("docs/名字对照表.en.md"), "en");
  assert.equal(DOC_FILES.length, 36, "36 份受管文档");
  assert.ok(readableOf("README.md").endsWith(path.join("backup", "readable", "README.md")));
});
