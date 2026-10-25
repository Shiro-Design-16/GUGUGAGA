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

import { DOC_FILES, dialectOfDoc, glyphRatio, readableOf, redactDoc, redactRun, residualProse } from "../scripts/md-bits.mjs";

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

test("代码围栏：围栏行、info 串与代码原样，注释里的中文换成位名", () => {
  const block = ["```sh", "npm run build  # 构建", "node bin/gg.ts examples/咕嘎咕嘎.咕咕", "```"].join("\n");
  const source = "前一段散文。\n\n" + block + "\n\n后一段散文。\n";
  const out = redactDoc(source, "zh");
  assert.ok(out.includes("```sh\n"), "围栏行与 info 串必须原样");
  assert.ok(out.includes("npm run build  # "), "命令与注释记号原样");
  assert.ok(!out.includes("构建"), "围栏里注释的中文必须被替换");
  assert.ok(out.includes("node bin/gg.ts examples/咕嘎咕嘎.咕咕"), "源码行（含位名字形与真实路径）原样");
  assert.equal(out.split("\n").length, source.split("\n").length, "行数不变");
  assert.equal((out.match(/[\u5495\u560E]/g) || []).length, ([...source].filter((ch) => /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(ch)).length), "位名个数 = 原文散文字符数（围栏里的也算）");
});

test("行内代码：位名字形与 ASCII 原样，中文换成位名（含尖括号占位符）", () => {
  const source = "看 `咕咕嘎嘎！` 与 `gg --help` 两处，还有 ``a`b`` 这种，以及 `咕：<表达式>`。\n";
  const out = redactDoc(source, "zh");
  for (const span of ["`咕咕嘎嘎！`", "`gg --help`", "``a`b``"]) {
    assert.ok(out.includes(span), span + " 必须原样保留");
  }
  assert.ok(out.includes("`咕：<"), "操作符与尖括号在行内代码里原样");
  const inner = /<([\u5495\u560E]+)>/.exec(out);
  assert.ok(inner, "<表达式> 里的中文必须换成位名");
  assert.equal([...inner[1]].length, 3, "三个汉字 → 三个位名");
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


test("专有名词：咕咕嘎嘎 / ググガガ / GUGUGAGA（不分大小写、词边界）在任何方言里都原样保留", () => {
  const names = ["咕咕嘎嘎", "ググガガ", "GUGUGAGA", "GuguGaga", "gUgUgAgA"];
  for (const dialect of ["zh", "ja", "en"]) {
    const out = redactDoc("名字 " + names.join(" 与 ") + " 都要留着。", dialect);
    for (const name of names) assert.ok(out.includes(name), dialect + " 文档里的 " + name + " 必须原样");
  }
  assert.ok(!redactDoc("XGUGUGAGAY", "en").includes("GUGUGAGA"), "词中间不算专有名词");
  assert.ok(redactDoc("examples/gugugaga.gu", "en").includes("gugugaga.gu"), "扩展名同样保留");
});

test("仓库里真实存在的路径原样保留（否则链接全断）", () => {
  const out = redactDoc("见 docs/名字对照表.md 与 translator/CONTRACT.md 两处。", "zh");
  assert.ok(out.includes("docs/名字对照表.md"), "CJK 路径必须原样");
  assert.ok(out.includes("translator/CONTRACT.md"), "ASCII 路径必须原样");
  assert.ok(!out.includes("两处") && !out.includes("见 "), "路径之外的散文仍然要换");
  assert.ok(redactDoc("[表](docs/名字对照表.en.md)", "zh").includes("](docs/名字对照表.en.md)"), "链接目标里的路径不动");
});

test("行内代码里的 HTML 注释标记只是代码，不让后面整段逐字节跳过", () => {
  const source = "头部有一段 ``<!-- i18n:begin -->` 块。\n\n这段散文仍然要换。\n";
  const out = redactDoc(source, "zh");
  assert.ok(out.includes("`<!-- i18n:begin -->`"), "行内代码原样");
  assert.ok(!out.includes("这段散文仍然要换"), "标记后面的正文必须继续替换");
  assert.ok(!/[\u3400-\u4DBF\u4E00-\u9FFF]/.test(out.replace(/[\u5495\u560E]/g, "")), "除位名外不留汉字");
  const block = "<!-- i18n:begin -->\n**日本語**：[中文](README.md)\n<!-- i18n:end -->";
  const lines = redactDoc(block, "ja").split("\n");
  assert.equal(lines[0], "<!-- i18n:begin -->", "行首的标记行逐字节保留");
  assert.equal(lines[2], "<!-- i18n:end -->", "块末的标记行逐字节保留");
  assert.ok(!lines[1].includes("日本語"), "块内的散文照样被替换");
});

test("en 文档的围栏：英文代码原样，围栏里的中文换成 en 位名（一个汉字两个字符）", () => {
  const source = ["```bash", "npm run build  # 构建一次", "echo ok", "```"].join("\n");
  const out = redactDoc(source, "en");
  assert.ok(out.includes("```bash"), "围栏行与 info 串原样");
  assert.ok(out.includes("npm run build  # "), "英文命令与注释记号原样");
  assert.ok(out.includes("echo ok"), "英文代码原样");
  assert.ok(!out.includes("构建一次"), "围栏里的中文必须被替换");
  const tail = out.split("# ")[1].split("\n")[0];
  assert.match(tail, /^(?:GU|GA)+$/, "en 方言渲染位名");
  assert.equal(tail.length, 8, "四个汉字 → 八个字符");
});

test("en 文档的散文：语言表里的中文/日文也换成 en 位名，竖线与空格结构不变", () => {
  const source = "| 中文 | 日本語 | English |\n";
  const out = redactDoc(source, "en");
  const left = residualProse(out, "en");
  assert.equal(left.prose, "", "en 产物散文区不该残留 CJK/假名");
  assert.equal(left.code, "", "代码区也不该残留");
  assert.ok(!out.includes("中文") && !out.includes("日本語"), "语言名本身必须消失");
  assert.equal(out.split("\n")[0].split("|").length, 5, "列结构不变（4 根竖线）");
  assert.match(out.trimEnd(), /^\| (?:GU|GA)+ \| (?:GU|GA)+ \| (?:GU|GA)+ \|$/, "三格都是位名，两侧空格与竖线原样");
  assert.equal(out.length, source.length + 12, "12 个字符各展开成 2 个字符");
});

test("残留散文：产物为 0；可读原文的散文区与围栏里都还有（v2 要补的洞）", () => {
  const readable = "# 标题\n\n一段散文，含 `咕：<表达式>` 与代码：\n\n```sh\n# 装一次\n```\n";
  const before = residualProse(readable, "zh");
  assert.ok([...before.prose].length > 0, "可读原文的散文区应有残留");
  assert.ok([...before.code].length > 0, "可读原文的围栏里应有残留（v1 整块照抄的洞）");
  const after = residualProse(redactDoc(readable, "zh"), "zh");
  assert.equal(after.prose, "", "产物的散文区不该再剩散文");
  assert.equal(after.code, "", "产物的代码区不该再剩 CJK/假名");
});

test("i18n 头部块：内容按散文替换，导航行的 label 跟目标文件方言", () => {
  const source = [
    "<!-- i18n:begin -->",
    "[中文](README.md) ｜ **日本語** ｜ [English](README.en.md)",
    "",
    "> 本ファイルは日本語訳です。正本は中国語版 [README.md](README.md) です。",
    "<!-- i18n:end -->",
    "",
    "# 本文",
  ].join("\n");
  const lines = redactDoc(source, "ja").split("\n");
  assert.equal(lines[0], "<!-- i18n:begin -->");
  assert.equal(lines[4], "<!-- i18n:end -->");
  assert.match(
    lines[1],
    /^\[[\u5495\u560E]{2}\]\(README\.md\) ｜ \*\*[\u30B0\u30AC]{3}\*\* ｜ \[(?:GU|GA){7}\]\(README\.en\.md\)$/,
    "导航行：中文 label 走 zh、日文 label 走 ja、英文 label 走 en，分隔符与链接目标原样",
  );
  assert.equal(lines[2], "", "块内空行保留");
  assert.ok(!lines[3].includes("本ファイル"), "块内说明句必须换成位名");
  assert.ok(lines[3].includes("[README.md](README.md)"), "说明句里的链接目标原样");
  assert.equal(residualProse(lines.join("\n"), "ja").prose, "", "块内也算散文区，残留必须为 0");
});

test("24 份译文产物：头部块两行标记各 1 行、块内容 3 行且已替换、ja/en 同构", () => {
  const fold = (line: string) =>
    line
      .replace(/[\u5495\u560E\u30B0\u30AC\u3050\u304C]+/g, "θ")
      .replace(/(?:GU|GA)+/g, "θ")
      .replace(/\.(?:ja|en)\.md/gi, ".L.md")
      .normalize("NFKC")
      .replace(/[^A-Za-z0-9]+/g, "θ")
      .replace(/^θ|θ$/g, "");
  const blocks: Record<string, string[]> = {};
  let checked = 0;
  for (const rel of DOC_FILES) {
    if (!rel.endsWith(".ja.md") && !rel.endsWith(".en.md")) continue;
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    assert.equal(lines[0], "<!-- i18n:begin -->", rel + " 第 1 行应是 i18n:begin");
    const close = lines.indexOf("<!-- i18n:end -->", 1);
    assert.equal(close, 4, rel + " 的头部块应在第 5 行闭合");
    const block = lines.slice(1, close);
    assert.equal(block.length, 3, rel + " 的头部块应是导航行 / 空行 / 说明句三行");
    for (const line of block) assert.ok(line !== "<!-- i18n:begin -->" && line !== "<!-- i18n:end -->", rel + " 块内不该再出现标记行");
    assert.equal(residualProse(block.join("\n"), dialectOfDoc(rel)).prose, "", rel + " 头部块内残留散文");
    blocks[rel] = block;
    checked += 1;
  }
  assert.equal(checked, 24, "24 份译文都要检查");
  for (const rel of Object.keys(blocks)) {
    if (!rel.endsWith(".en.md")) continue;
    const jaRel = rel.replace(/\.en\.md$/, ".ja.md");
    const ja = blocks[jaRel];
    const en = blocks[rel];
    assert.ok(ja, jaRel + " 缺少头部块");
    assert.deepEqual(en.map(fold), ja.map(fold), rel + " 的头部块骨架应与 " + jaRel + " 相同");
  }
});

test("真仓库里的 36 份产物：残留散文一律为 0", () => {
  let checked = 0;
  for (const rel of DOC_FILES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const left = residualProse(fs.readFileSync(file, "utf8"), dialectOfDoc(rel));
    assert.equal(left.prose, "", rel + " 散文区残留");
    assert.equal(left.code, "", rel + " 代码区残留");
    checked += 1;
  }
  assert.equal(checked, 36, "36 份产物都要扫到");
});

