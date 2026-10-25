import test from "node:test";
import assert from "node:assert/strict";
import {
  INT_LITERAL_PREFIX,
  TEXT_LITERAL_PREFIX,
  encodeInts,
  encodeText,
  parseDecimalTokens,
  parseInt64Token,
  unsignedValueBits,
} from "../src/encode.ts";
import { GU, GA, bitsToBytes, decodeUtf8Strict, INT64_MAX, INT64_MIN } from "../src/bits.ts";
import { HAI_BITS, expectGgtError } from "./helpers.ts";

test("encodeText：嗨 = E5 97 A8 的 24 位", () => {
  assert.equal(encodeText("嗨"), HAI_BITS);
  assert.equal(encodeText("嗨").length, 24);
  assert.equal(encodeText(""), "");
});

test("字面量前缀与语言端词法一致", () => {
  assert.equal(TEXT_LITERAL_PREFIX, "嘎嘎嘎嘎？");
  assert.equal(INT_LITERAL_PREFIX, "嘎嘎嘎？");
});

test("parseDecimalTokens 按空白切分、折叠连续空白", () => {
  assert.deepEqual(parseDecimalTokens(" 1\t-2\n\n3 \r\n"), ["1", "-2", "3"]);
  assert.deepEqual(parseDecimalTokens(""), []);
  assert.deepEqual(parseDecimalTokens("  \n\t"), []);
});

test("parseInt64Token 接受可选负号与边界值", () => {
  assert.equal(parseInt64Token("0"), 0n);
  assert.equal(parseInt64Token("-0"), 0n);
  assert.equal(parseInt64Token("300"), 300n);
  assert.equal(parseInt64Token("9223372036854775807"), INT64_MAX);
  assert.equal(parseInt64Token("-9223372036854775808"), INT64_MIN);
});

test("parseInt64Token 拒绝非法记号与越界值", () => {
  expectGgtError(() => parseInt64Token("12a"), 1, "非法整数");
  expectGgtError(() => parseInt64Token("+1"), 1, "非法整数");
  expectGgtError(() => parseInt64Token("-"), 1, "非法整数");
  expectGgtError(() => parseInt64Token(""), 1, "非法整数");
  expectGgtError(() => parseInt64Token("9223372036854775808"), 1, "超出 int64 范围");
  expectGgtError(() => parseInt64Token("-9223372036854775809"), 1, "超出 int64 范围");
});

test("encodeInts 非字面量模式输出 64 位补码", () => {
  assert.equal(encodeInts(["0"], false), GU.repeat(64));
  assert.equal(encodeInts(["-1"], false), GA.repeat(64));
  assert.equal(encodeInts(["-2"], false), GA.repeat(63) + GU);
  assert.equal(encodeInts(["9223372036854775807"], false), GU + GA.repeat(63));
  assert.equal(encodeInts(["-9223372036854775808"], false), GA + GU.repeat(63));
  assert.equal(encodeInts(["1", "-1"], false).length, 128);
});

test("encodeInts 字面量模式带 嘎嘎嘎？ 前缀", () => {
  assert.equal(encodeInts(["5"], true), INT_LITERAL_PREFIX + "嘎咕嘎");
  assert.equal(encodeInts(["0"], true), INT_LITERAL_PREFIX + "咕");
  assert.equal(encodeInts(["2"], true), INT_LITERAL_PREFIX + "嘎咕");
});

test("unsignedValueBits 是最短二进制", () => {
  assert.equal(unsignedValueBits(0n), "咕");
  assert.equal(unsignedValueBits(1n), "嘎");
  assert.equal(unsignedValueBits(5n), "嘎咕嘎");
});

test("字面量模式拒绝负数", () => {
  expectGgtError(() => encodeInts(["-1"], true), 1, "字面量模式不支持负数");
});

test("文本模式 round-trip：中文 / 标点 / emoji / 控制符", () => {
  const text = "嗨，咕嘎！😀\n\t";
  const bits = encodeText(text);
  assert.equal(bits.length % 8, 0);
  assert.equal(decodeUtf8Strict(bitsToBytes(bits), "round-trip"), text);
});

test("文本字面量模式 = 前缀 + 位流", () => {
  assert.equal(TEXT_LITERAL_PREFIX + encodeText("嗨"), "嘎嘎嘎嘎？" + HAI_BITS);
});
