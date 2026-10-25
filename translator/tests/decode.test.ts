import test from "node:test";
import assert from "node:assert/strict";
import { GU, GA, INT64_MAX, INT64_MIN, bigIntToBits } from "../src/bits.ts";
import { decodeBits, guessMode } from "../src/decode.ts";
import { HAI_BITS, expectGgtError } from "./helpers.ts";

const EIGHT_GU = GU.repeat(8);
const EIGHT_GA = GA.repeat(8);
const HAI_BYTES = bigIntToBits(0xe5n, 8) + bigIntToBits(0x97n, 8) + bigIntToBits(0xa8n, 8);

test("--int64：64 位一块，每块一行十进制", () => {
  assert.equal(decodeBits(GU.repeat(64), { kind: "int64" }).output, "0\n");
  assert.equal(decodeBits(GA.repeat(64), { kind: "int64" }).output, "-1\n");
  assert.equal(decodeBits("", { kind: "int64" }).output, "");
});

test("--int64：320 位五个值", () => {
  const values = [0n, 1n, -1n, INT64_MAX, INT64_MIN];
  const bits = values.map((value) => bigIntToBits(value, 64)).join("");
  assert.equal(bits.length, 320);
  const output = decodeBits(bits, { kind: "int64" }).output;
  assert.equal(
    output,
    "0\n1\n-1\n9223372036854775807\n-9223372036854775808\n",
  );
});

test("--int64：非 64 倍数报错", () => {
  expectGgtError(() => decodeBits(GU.repeat(8), { kind: "int64" }), 1, "不是 64 的倍数");
});

test("--bytes：24 位 E5 97 A8 解出 嗨，且不加结尾换行", () => {
  assert.equal(HAI_BITS, HAI_BYTES);
  const outcome = decodeBits(HAI_BITS, { kind: "bytes" });
  assert.equal(outcome.output, "嗨");
  assert.equal(outcome.note, null);
  assert.ok(!outcome.output.endsWith("\n"));
});

test("--bytes：非法 UTF-8 与未对齐位流都报错", () => {
  const invalid = bigIntToBits(0xf0n, 8) + bigIntToBits(0xffn, 8) + bigIntToBits(0xffn, 8);
  expectGgtError(() => decodeBits(invalid, { kind: "bytes" }), 1, "不是合法 UTF-8");
  expectGgtError(() => decodeBits(GU.repeat(9), { kind: "bytes" }), 1, "不是 8 的倍数");
});

test("--hex：24 位一行的格式（含 ASCII 列）", () => {
  assert.equal(decodeBits(HAI_BITS, { kind: "hex" }).output, "0000: E5 97 A8  |...|\n");
});

test("--hex：超过 16 字节换行，偏移四位大写十六进制", () => {
  const bits = bigIntToBits(0x41n, 8).repeat(17);
  const output = decodeBits(bits, { kind: "hex" }).output;
  const lines = output.split("\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "0000: " + new Array(16).fill("41").join(" ") + "  |" + "A".repeat(16) + "|");
  assert.equal(lines[1], "0010: 41  |A|");
  assert.equal(lines[2], "");
});

test("--hex：可打印 ASCII 原样显示，不可打印记点", () => {
  const bits = bigIntToBits(0x41n, 8) + bigIntToBits(0x00n, 8) + bigIntToBits(0x7fn, 8);
  assert.equal(decodeBits(bits, { kind: "hex" }).output, "0000: 41 00 7F  |A..|\n");
});

test("--bits：每 8 位一组、每行 8 组，不补结尾换行", () => {
  assert.equal(decodeBits(GU.repeat(9), { kind: "bits" }).output, "咕咕咕咕咕咕咕咕 咕");
  const sixtyFour = GA.repeat(64);
  const oneLine = decodeBits(sixtyFour, { kind: "bits" }).output;
  assert.equal(oneLine.split("\n").length, 1);
  assert.equal(oneLine.split(" ").length, 8);
  const sixtyFive = decodeBits(GA.repeat(65), { kind: "bits" }).output;
  assert.equal(sixtyFive.split("\n").length, 2);
  assert.equal(sixtyFive.split("\n")[1], "嘎");
  assert.equal(decodeBits("", { kind: "bits" }).output, "");
});

test("guessMode 三档猜测与说明文字", () => {
  assert.deepEqual(guessMode(GU.repeat(64)).mode, { kind: "int64" });
  assert.ok(guessMode(GU.repeat(64)).note.includes("--int64"));
  assert.deepEqual(guessMode(GU.repeat(24)).mode, { kind: "bytes" });
  assert.ok(guessMode(GU.repeat(24)).note.includes("--bytes"));
  assert.deepEqual(guessMode(GU.repeat(9)).mode, { kind: "bits" });
  assert.ok(guessMode(GU.repeat(9)).note.includes("--bits"));
  assert.deepEqual(guessMode("").mode, { kind: "int64" });
});

test("decodeBits 显式模式不产生 stderr 说明", () => {
  assert.equal(decodeBits(EIGHT_GU, { kind: "hex" }).note, null);
  assert.equal(decodeBits(EIGHT_GA, { kind: "hex" }).note, null);
});
