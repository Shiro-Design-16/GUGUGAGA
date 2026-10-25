/** 多方言：位流输入的 咕/グ/ぐ/GU 与输出方言 --ja/--en（SPEC §1、CONTRACT.md §7）。 */

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseBits, renderBits } from "../src/bits.ts";
import type { Dialect } from "../src/bits.ts";
import { encodeText, literalPrefix } from "../src/encode.ts";
import { HAI_BITS, expectGgtError, runGgt } from "./helpers.ts";

/** 把中文位流换成日语位名（测试用的独立换算，不借用 renderBits）。 */
function toJa(bits: string): string {
  let out = "";
  for (const ch of bits) out += ch === "咕" ? "グ" : "ガ";
  return out;
}

/** 把中文位流换成英语位名（小写，便于和大小写混用测试区分）。 */
function toEn(bits: string): string {
  let out = "";
  for (const ch of bits) out += ch === "咕" ? "gu" : "ga";
  return out;
}

/** 逐字母翻转大小写，验证 ASCII 位名不区分大小写。 */
function flipCase(text: string, odd = false): string {
  let out = "";
  let i = 0;
  for (const ch of text) {
    const up = (i + (odd ? 1 : 0)) % 2 === 0;
    out += up ? ch.toUpperCase() : ch.toLowerCase();
    i += 1;
  }
  return out;
}

test("parseBits：三种方言逐位置等价，咕グGU 是三位 0", () => {
  assert.equal(parseBits("咕グGU"), "咕咕咕");
  assert.equal(parseBits("嘎ガGA"), "嘎嘎嘎");
  assert.equal(parseBits("ぐ"), "咕");
  assert.equal(parseBits("が"), "嘎");
  assert.equal(parseBits("gU"), "咕");
  assert.equal(parseBits("Gu"), "咕");
  assert.equal(parseBits("ga"), "嘎");
  assert.equal(parseBits("Ga"), "嘎");
  assert.equal(parseBits("嘎咕ガグGAgu"), "嘎咕嘎咕嘎咕");
});

test("parseBits：同一行内混用三方言与 U+3000 空白", () => {
  assert.equal(parseBits("咕\u3000グ gu\tガ\r\n ga "), "咕咕咕嘎嘎");
  assert.equal(parseBits(toJa(HAI_BITS)), HAI_BITS);
  assert.equal(parseBits(toEn(HAI_BITS)), HAI_BITS);
  assert.equal(parseBits(flipCase(toEn(HAI_BITS))), HAI_BITS);
  assert.equal(parseBits(flipCase(toEn(HAI_BITS), true)), HAI_BITS);
});

test("parseBits：落单的 g/G 与其它字符按非法字符报错", () => {
  expectGgtError(() => parseBits("咕g咕"), 1, "非法字符“g”", "U+0067", "第 2 个字符");
  expectGgtError(() => parseBits("G"), 1, "非法字符“G”", "第 1 个字符");
  expectGgtError(() => parseBits("guG"), 1, "非法字符“G”", "第 3 个字符");
  expectGgtError(() => parseBits("咕u"), 1, "非法字符“u”", "U+0075", "第 2 个字符");
  expectGgtError(() => parseBits("咕グｘ"), 1, "非法字符“ｘ”", "第 3 个字符");
});

const BITS_WITH_JUNK = "咕x";

test("renderBits：中文原样，日语逐位换名，英语每位两字母", () => {
  assert.equal(renderBits("咕嘎", "zh"), "咕嘎");
  assert.equal(renderBits("咕嘎", "ja"), "グガ");
  assert.equal(renderBits("咕嘎", "en"), "GUGA");
  assert.equal(renderBits(HAI_BITS, "ja"), toJa(HAI_BITS));
  assert.equal(renderBits(HAI_BITS, "en"), toEn(HAI_BITS).toUpperCase());
  expectGgtError(() => renderBits(BITS_WITH_JUNK, "ja"), 1, "非位字符");
});

test("literalPrefix：位名随方言，标点日语全角、英语半角", () => {
  assert.equal(literalPrefix("text", "zh"), "嘎嘎嘎嘎？");
  assert.equal(literalPrefix("int", "zh"), "嘎嘎嘎？");
  assert.equal(literalPrefix("text", "ja"), "ガガガガ？");
  assert.equal(literalPrefix("int", "ja"), "ガガガ？");
  assert.equal(literalPrefix("text", "en"), "GAGAGAGA?");
  assert.equal(literalPrefix("int", "en"), "GAGAGA?");
});

test("encodeText：方言只换写法，位流归一化后不变", () => {
  assert.equal(encodeText("嗨"), HAI_BITS);
  assert.equal(encodeText("嗨", "zh"), HAI_BITS);
  assert.equal(encodeText("嗨", "ja"), toJa(HAI_BITS));
  assert.equal(encodeText("嗨", "en"), toEn(HAI_BITS).toUpperCase());
});

const JA_41 = "ググガガグガググググガガグググガ";
const EN_41 = "GUGUGAGAGUGAGUGUGUGUGAGAGUGUGUGA";

test("命令行：encode --ja / --en 输出对应方言的位流", () => {
  const ja = runGgt(["encode", "--ja"], "41");
  assert.equal(ja.status, 0, ja.stderr);
  assert.equal(ja.stdout, JA_41);

  const en = runGgt(["encode", "--en"], "41");
  assert.equal(en.status, 0, en.stderr);
  assert.equal(en.stdout, EN_41);

  const defaults = runGgt(["encode"], "41");
  assert.equal(defaults.stdout, parseBits(JA_41));
});

test("命令行：encode --as-literal 的前缀也跟着方言走", () => {
  assert.equal(runGgt(["encode", "--as-literal", "--ja"], "41").stdout, "ガガガガ？" + JA_41);
  assert.equal(runGgt(["encode", "--as-literal", "--en"], "41").stdout, "GAGAGAGA?" + EN_41);
  assert.equal(runGgt(["encode", "--as-literal"], "41").stdout, "嘎嘎嘎嘎？" + parseBits(JA_41));
});

test("命令行：encode --int64 与 --as-literal 的方言渲染", () => {
  const zh = runGgt(["encode", "--int64"], "41").stdout;
  assert.equal(zh.length, 64);
  assert.equal(runGgt(["encode", "--int64", "--ja"], "41").stdout, renderBits(zh, "ja"));
  assert.equal(runGgt(["encode", "--int64", "--en"], "41").stdout, renderBits(zh, "en"));
  const zhLiteral = runGgt(["encode", "--int64", "--as-literal"], "41").stdout;
  const prefix = "嘎嘎嘎？";
  assert.ok(zhLiteral.startsWith(prefix));
  assert.equal(
    runGgt(["encode", "--int64", "--as-literal", "--ja"], "41").stdout,
    literalPrefix("int", "ja") + renderBits(zhLiteral.slice(prefix.length), "ja"),
  );
  assert.equal(
    runGgt(["encode", "--int64", "--as-literal", "--en"], "41").stdout,
    literalPrefix("int", "en") + renderBits(zhLiteral.slice(prefix.length), "en"),
  );
});

test("命令行：decode 吃三方言输入（含大小写混用与 U+3000）", () => {
  assert.equal(runGgt(["decode", "--bytes"], JA_41).stdout, "41");
  assert.equal(runGgt(["decode", "--bytes"], EN_41).stdout, "41");
  assert.equal(runGgt(["decode", "--bytes"], flipCase(EN_41)).stdout, "41");
  assert.equal(runGgt(["decode", "--bytes"], toJa(HAI_BITS)).stdout, "嗨");
  assert.equal(runGgt(["decode", "--bytes"], "\u3000" + toJa(HAI_BITS) + "\n").stdout, "嗨");
});

test("命令行：decode --plan 的位流可以是方言，plan 文件语义不变", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ggt-dialect-"));
  const planPath = path.join(dir, "p.plan");
  writeFileSync(planPath, "int64\n", "utf8");
  const zh = runGgt(["encode", "--int64"], "104").stdout;
  const ja = runGgt(["decode", "--plan", planPath], renderBits(zh, "ja"));
  assert.equal(ja.status, 0, ja.stderr);
  assert.equal(ja.stdout, "104\n");
});

test("命令行：非法方言组合按用法错误退出 2", () => {
  const both = runGgt(["encode", "--ja", "--en"], "41");
  assert.equal(both.status, 2);
  assert.equal(both.stdout, "");
  assert.match(both.stderr, /--ja 与 --en 只能给一个/);
  assert.match(both.stderr, /用法：/);

  const withHex = runGgt(["encode", "--ja", "--hex"], "41");
  assert.equal(withHex.status, 2);
  assert.match(withHex.stderr, /未知选项“--hex”/);

  const decodeJa = runGgt(["decode", "--ja"], JA_41);
  assert.equal(decodeJa.status, 2);
  assert.match(decodeJa.stderr, /未知选项“--ja”/);

  const diagJa = runGgt(["decode", "--diag", "--ja"], "咕咕");
  assert.equal(diagJa.status, 2);
  assert.match(diagJa.stderr, /未知选项“--ja”/);
});

/** 手搓 GGDIAG v1 帧（SPEC §12）：magic 1010 / version 00 / code 8 / line 16 / col 16 / mlen 16 / msg / end 110。 */
function diagFrame(code: number, message: string): string {
  const bytes = new TextEncoder().encode(message);
  const header =
    "1010" +
    "00" +
    code.toString(2).padStart(8, "0") +
    "0".repeat(32) +
    bytes.length.toString(2).padStart(16, "0");
  let bits = "";
  for (const ch of header) bits += ch === "1" ? "嘎" : "咕";
  for (const byte of bytes) bits += renderBitsBigInt(BigInt(byte));
  for (const ch of "110") bits += ch === "1" ? "嘎" : "咕";
  return bits;
}

/** 一个字节按 8 位补零展开成中文位流（帧正文用）。 */
function renderBitsBigInt(value: bigint): string {
  let out = "";
  for (const ch of value.toString(2).padStart(8, "0")) out += ch === "1" ? "嘎" : "咕";
  return out;
}

test("命令行：--diag 只认中文位名（SPEC §8.1 外壳不跟随方言）", () => {
  const frame = diagFrame(0, "坏");
  assert.equal(runGgt(["decode", "--diag"], frame).stdout, "用法错误 坏\n");
  const ja = runGgt(["decode", "--diag"], toJa(frame));
  assert.equal(ja.status, 1);
  assert.match(ja.stderr, /没有找到诊断帧/);
});

test("round-trip：encode --ja/--en 的输出能被 decode 原样吃回去", () => {
  for (const dialect of ["--ja", "--en"] as const) {
    const bits = runGgt(["encode", dialect], "咕嘎").stdout;
    const back = runGgt(["decode", "--bytes"], bits);
    assert.equal(back.status, 0, back.stderr);
    assert.equal(back.stdout, "咕嘎");
  }
});

test("Dialect 类型覆盖三个值（编译期约束，运行时只做一次断言）", () => {
  const dialects: Dialect[] = ["zh", "ja", "en"];
  assert.deepEqual(dialects.map((d) => renderBits("咕", d)), ["咕", "グ", "GU"]);
});
