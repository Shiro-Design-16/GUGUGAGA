import test from "node:test";
import assert from "node:assert/strict";
import {
  GU,
  GA,
  GgtError,
  assertByteAligned,
  bigIntToBits,
  bitsToBigInt,
  bitsToBytes,
  bitsToInt64,
  bytesToBits,
  codePointLabel,
  decodeUtf8Strict,
  parseBits,
} from "../src/bits.ts";
import { HAI_BITS, expectGgtError } from "./helpers.ts";

test("parseBits 丢掉空格 / 制表符 / 换行 / 回车，保留位序", () => {
  assert.equal(parseBits(" 咕\t嘎\n咕\r\n"), "咕嘎咕");
  assert.equal(parseBits(""), "");
  assert.equal(parseBits("\n\n"), "");
});

test("parseBits 报非法字符的码点与从 1 起的位置", () => {
  const error = expectGgtError(() => parseBits("咕x"), 1, "非法字符“x”", "U+0078", "第 2 个字符");
  assert.ok(error instanceof GgtError);
});

test("parseBits 按码点计位置（emoji 算一个字符）", () => {
  expectGgtError(() => parseBits("咕😀嘎"), 1, "U+1F600", "第 2 个字符");
});

test("parseBits 把全角空格 U+3000 当空白（SPEC §1.1），其它空白仍非法", () => {
  assert.equal(parseBits("咕　嘎"), "咕嘎");
  expectGgtError(() => parseBits("咕\u00a0嘎"), 1, "U+00A0");
});

test("bitsToBigInt 高位在前", () => {
  assert.equal(bitsToBigInt("咕嘎咕"), 2n);
  assert.equal(bitsToBigInt(GU.repeat(64)), 0n);
  assert.equal(bitsToBigInt(GA.repeat(64)), (1n << 64n) - 1n);
  assert.equal(bitsToBigInt(""), 0n);
});

test("bigIntToBits 取低 width 位，负数按补码", () => {
  assert.equal(bigIntToBits(2n, 3), "咕嘎咕");
  assert.equal(bigIntToBits(0n, 0), "");
  assert.equal(bigIntToBits(-1n, 8), GA.repeat(8));
  assert.equal(bigIntToBits(-2n, 8), GA.repeat(7) + GU);
  assert.equal(bigIntToBits(300n, 64), GU.repeat(55) + "嘎咕咕嘎咕嘎嘎咕咕");
});

test("bitsToInt64 读 64 位补码", () => {
  assert.equal(bitsToInt64(GU.repeat(64)), 0n);
  assert.equal(bitsToInt64(GA.repeat(64)), -1n);
  assert.equal(bitsToInt64(bigIntToBits(-2n, 64)), -2n);
  assert.equal(bitsToInt64(bigIntToBits(300n, 64)), 300n);
});

test("bitsToInt64 拒绝非 64 位", () => {
  expectGgtError(() => bitsToInt64(GU.repeat(63)), 1, "恰好 64 位");
  expectGgtError(() => bitsToInt64(GU.repeat(65)), 1, "恰好 64 位");
});

test("assertByteAligned 返回字节数，否则报总位数", () => {
  assert.equal(assertByteAligned(GU.repeat(24), "字节解码"), 3);
  expectGgtError(() => assertByteAligned(GU.repeat(25), "字节解码"), 1, "总长 25 位", "不是 8 的倍数");
});

test("字节与位流互转", () => {
  const bytes = new Uint8Array([0, 1, 65, 127, 128, 255]);
  const bits = bytesToBits(bytes);
  assert.equal(bits.length, 48);
  assert.deepEqual(Array.from(bitsToBytes(bits)), Array.from(bytes));
  assert.equal(bitsToBytes(HAI_BITS).length, 3);
  assert.equal(bitsToBytes(HAI_BITS)[0], 0xe5);
});

test("decodeUtf8Strict：合法 UTF-8 解码，非法序列报错", () => {
  assert.equal(decodeUtf8Strict(bitsToBytes(HAI_BITS), "--bytes"), "嗨");
  const invalid = bigIntToBits(0xf0n, 8) + bigIntToBits(0xffn, 8) + bigIntToBits(0xffn, 8);
  expectGgtError(() => decodeUtf8Strict(bitsToBytes(invalid), "--bytes"), 1, "不是合法 UTF-8");
});

test("codePointLabel 至少四位且大写", () => {
  assert.equal(codePointLabel("x"), "U+0078");
  assert.equal(codePointLabel("😀"), "U+1F600");
});
