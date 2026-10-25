import test from "node:test";
import assert from "node:assert/strict";
import { GU, GA, bigIntToBits } from "../src/bits.ts";
import { parsePlan, slotLabel, slotWidth } from "../src/plan.ts";
import { decodeBits } from "../src/decode.ts";
import { HAI_BITS, expectGgtError } from "./helpers.ts";

test("parsePlan 跳过空行与整行注释，支持前后空白", () => {
  const text = "# 头部注释\n\nint64\n  bits 3\n\tbytes 2 \nbool\n";
  assert.deepEqual(parsePlan(text), [
    { kind: "int64" },
    { kind: "bits", n: 3 },
    { kind: "bytes", n: 2 },
    { kind: "bool" },
  ]);
});

test("parsePlan 空文本是空槽位表", () => {
  assert.deepEqual(parsePlan(""), []);
  assert.deepEqual(parsePlan("\n# 只有注释\n"), []);
});

test("parsePlan 未知类型报行号并以 3 退出", () => {
  expectGgtError(() => parsePlan("int64\nwat\n"), 3, "第 2 行", "未知类型名“wat”");
});

test("parsePlan 参数缺失 / 非正整数 / 多余记号", () => {
  expectGgtError(() => parsePlan("bits\n"), 3, "第 1 行", "缺少参数");
  expectGgtError(() => parsePlan("bytes\n"), 3, "第 1 行", "缺少参数");
  expectGgtError(() => parsePlan("bits abc"), 3, "不是正整数");
  expectGgtError(() => parsePlan("bits 0"), 3, "不是可表示的正整数");
  expectGgtError(() => parsePlan("bits -1"), 3, "不是正整数");
  expectGgtError(() => parsePlan("bytes 1.5"), 3, "不是正整数");
  expectGgtError(() => parsePlan("int64 5"), 3, "不接受参数");
  expectGgtError(() => parsePlan("bool 真"), 3, "不接受参数");
  expectGgtError(() => parsePlan("bits 1 2"), 3, "只接受一个参数");
});

test("slotWidth 与 slotLabel", () => {
  assert.equal(slotWidth({ kind: "int64" }), 64);
  assert.equal(slotWidth({ kind: "bool" }), 8);
  assert.equal(slotWidth({ kind: "bits", n: 5 }), 5);
  assert.equal(slotWidth({ kind: "bytes", n: 3 }), 24);
  assert.equal(slotLabel({ kind: "int64" }), "int64");
  assert.equal(slotLabel({ kind: "bool" }), "bool");
  assert.equal(slotLabel({ kind: "bits", n: 5 }), "bits 5");
  assert.equal(slotLabel({ kind: "bytes", n: 3 }), "bytes 3");
});

test("plan 精确消费：多出 8 位会报错并带剩余位数", () => {
  expectGgtError(
    () => decodeBits(GU.repeat(72), { kind: "plan", slots: [{ kind: "int64" }] }),
    1,
    "还剩 8 位",
  );
});

test("plan 精确消费：位不够会报错并带缺少的位数", () => {
  expectGgtError(
    () => decodeBits(GU.repeat(56), { kind: "plan", slots: [{ kind: "int64" }] }),
    1,
    "需要 64 位",
    "只剩 56 位",
  );
});

test("plan 各槽位逐行输出", () => {
  const bits = GU.repeat(64) + "咕嘎咕" + HAI_BITS + GA.repeat(8);
  const output = decodeBits(bits, {
    kind: "plan",
    slots: [{ kind: "int64" }, { kind: "bits", n: 3 }, { kind: "bytes", n: 3 }, { kind: "bool" }],
  }).output;
  assert.equal(output, "0\n咕嘎咕\n嗨\n真\n");
});

test("plan 空槽位表：空输入输出空串，有多余位则报错", () => {
  assert.equal(decodeBits("", { kind: "plan", slots: [] }).output, "");
  expectGgtError(() => decodeBits(GU.repeat(8), { kind: "plan", slots: [] }), 1, "还剩 8 位");
});

test("plan bool：混合位不是合法布尔", () => {
  expectGgtError(
    () => decodeBits(GU.repeat(7) + GA, { kind: "plan", slots: [{ kind: "bool" }] }),
    1,
    "不是合法布尔",
  );
});

test("plan bits 槽位原样输出（含前导 0）", () => {
  const bits = bigIntToBits(2n, 5);
  assert.equal(decodeBits(bits, { kind: "plan", slots: [{ kind: "bits", n: 5 }] }).output, "咕咕咕嘎咕\n");
});
