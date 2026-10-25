import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decodeOne } from "./ggdiag.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = "bin/gg.ts";
const GU = "咕";
const GA = "嘎";
const ONLY_BITS = /^[咕嘎]*$/;
/** stderr 允许的全部字符：咕、嘎、换行、空格（SPEC.md §12.1）——诊断只走帧。 */
const ONLY_DIAG = /^[咕嘎\n ]*$/;
const TIMEOUT_MS = 120000;

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** 用真实 CLI 跑一次：node bin/gg.ts <args...>，工作目录固定为仓库根。 */
function gg(args: readonly string[], input = ""): RunResult {
  const res = spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    input,
    timeout: TIMEOUT_MS,
  });
  if (res.error) throw res.error;
  return {
    status: res.status,
    stdout: res.stdout.toString("utf8"),
    stderr: res.stderr.toString("utf8"),
  };
}

function runExample(name: string, input = ""): RunResult {
  return gg(["run", path.join("examples", name)], input);
}

/** 运行一段临时源码（错误场景用），跑完即删。 */
function runTempSource(source: string): RunResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-e2e-"));
  try {
    const file = path.join(dir, "prog.咕咕");
    fs.writeFileSync(file, source, "utf8");
    return gg(["run", file]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** 字节序列 -> 咕/嘎 位流（每字节 8 位，高位在前）。期望值在测试里独立算，不靠再跑一遍程序。 */
function bitsOfBytes(bytes: readonly number[]): string {
  let out = "";
  for (const byte of bytes) {
    assert.ok(Number.isInteger(byte) && byte >= 0 && byte <= 255, "不是字节：" + String(byte));
    for (let i = 7; i >= 0; i -= 1) out += (byte >> i) & 1 ? GA : GU;
  }
  return out;
}

/** 整数 -> 定长 64 位补码位流（高位在前，超出取低 64 位）。 */
function int64Bits(value: bigint): string {
  const mask = (1n << 64n) - 1n;
  const u = value & mask;
  let out = "";
  for (let i = 63n; i >= 0n; i -= 1n) out += (u >> i) & 1n ? GA : GU;
  return out;
}

/** 期望值侧自己实现的方言字形（刻意不复用 src/keywords.ts）。 */
type Glyphs = readonly [zero: string, one: string];
const JA: Glyphs = ["グ", "ガ"];
const EN: Glyphs = ["GU", "GA"];

/** 规范位串（咕/嘎）→ 某方言的字形。 */
function renderGlyphs(bits: string, glyphs: Glyphs): string {
  let out = "";
  for (const ch of bits) out += ch === GU ? glyphs[0] : glyphs[1];
  return out;
}

/** 某方言的字形 → 规范位串（咕/嘎），用于「归一化后逐位相同」的比对。 */
function normalizeGlyphs(text: string, glyphs: Glyphs): string {
  return text.split(glyphs[1]).join(GA).split(glyphs[0]).join(GU);
}

function expectCleanRun(result: RunResult, label: string, charset: RegExp = ONLY_BITS): void {
  assert.equal(
    result.status,
    0,
    label + "：退出码应为 0，实际 " + String(result.status) + "；stderr=" + result.stderr,
  );
  assert.match(result.stdout, charset, label + "：stdout 只应含该方言的位字形，实际=" + JSON.stringify(result.stdout));
  assert.ok(!result.stdout.includes("\n"), label + "：stdout 是裸位流，不应包含换行");
  assert.equal(result.stderr, "", label + "：成功运行不应有诊断输出，实际=" + result.stderr);
}

test("预检：解释器入口 bin/gg.ts 存在", () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, BIN)),
    "bin/gg.ts 不存在：解释器（src/interp.ts / src/cli.ts / bin/gg.ts）尚未就绪，端到端测试无法运行",
  );
});

test("examples/咕嘎咕嘎.咕咕：输出 UTF-8「嗨」的三个字节（24 位）", () => {
  const result = runExample("咕嘎咕嘎.咕咕");
  expectCleanRun(result, "咕嘎咕嘎");
  const expected = bitsOfBytes([...Buffer.from("嗨", "utf8")]);
  assert.equal(expected.length, 24, "「嗨」的 UTF-8 编码应为 3 字节 = 24 位");
  assert.equal(result.stdout.length, 24, "hello-bits 应输出 24 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, expected, "hello-bits 期望 E5 97 A8 的位流，实际=" + JSON.stringify(result.stdout));
});

test("examples/咕咕嘎嘎.咕咕：循环 5 次，每次输出 64 位整数 1..5（320 位）", () => {
  const result = runExample("咕咕嘎嘎.咕咕");
  expectCleanRun(result, "counter");
  let expected = "";
  for (let n = 1; n <= 5; n += 1) expected += int64Bits(BigInt(n));
  assert.equal(result.stdout.length, 320, "counter 应输出 5 × 64 = 320 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, expected, "counter 输出不符（应为 1..5 的 64 位补码依次相连）");
});

test("examples/嘎嘎咕咕.咕咕：父类/子类两个接收者 → 子类覆写生效（动态派发）", () => {
  const result = runExample("嘎嘎咕咕.咕咕");
  expectCleanRun(result, "嘎嘎咕咕");
  const expected = bitsOfBytes([...Buffer.from([0xf0])]) + bitsOfBytes([...Buffer.from([0xff, 0xff])]);
  assert.equal(result.stdout.length, 24, "oop-inherit 应输出 8 + 16 = 24 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, expected, "oop-inherit 期望 F0 与 FF FF，实际=" + JSON.stringify(result.stdout));
});

test("examples/咕嘎嘎咕.咕咕：读两字节 0x33 0x35，输出 加=104 减=-2（各 64 位）", () => {
  const result = runExample("咕嘎嘎咕.咕咕", "35");
  expectCleanRun(result, "calc");
  const a = "3".charCodeAt(0);
  const b = "5".charCodeAt(0);
  const expected = int64Bits(BigInt(a + b)) + int64Bits(BigInt(a - b));
  assert.equal(result.stdout.length, 128, "calc 应输出 128 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, expected, "calc 期望先 104 后 -2 的 64 位补码");
});

test("examples/嘎咕嘎咕.咕咕：真分支输出 0xAA、否则分支输出 0xFF（16 位）", () => {
  const result = runExample("嘎咕嘎咕.咕咕");
  expectCleanRun(result, "嘎咕嘎咕");
  const expected = bitsOfBytes([...Buffer.from([0xaa])]) + bitsOfBytes([...Buffer.from([0xff])]);
  assert.equal(result.stdout.length, 16, "if-else 应输出 16 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, expected, "if-else 期望先 0xAA（真分支）后 0xFF（否则分支）");
});

const SRC_UNDEFINED_METHOD = [
  "咕咕！ 嘎咕嘎咕嘎",
  "    咕咕嘎！ 嘎咕咕嘎嘎",
  "        嘎嘎：嘎嘎嘎？咕",
  "",
  "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕",
  "    咕咕！？ 嘎嘎咕嘎咕：咕嘎嘎！ 嘎咕嘎咕嘎？",
  "    咕：嘎嘎咕嘎咕？ 嘎嘎咕嘎咕！",
  "",
].join("\n");

const SRC_CTOR_ARITY = [
  "咕咕！ 嘎咕嘎咕嘎",
  "    咕咕嘎！ 嘎咕嘎咕嘎：嘎咕咕咕嘎",
  "        咕咕！？ 嘎咕咕嘎咕：嘎咕咕咕嘎？",
  "",
  "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕",
  "    咕咕！？ 嘎嘎咕嘎咕：咕嘎嘎！ 嘎咕嘎咕嘎？",
  "",
].join("\n");

test("运行期错误：调用不存在的方法 → 退出码 1、12 号帧（E4002）", () => {
  const result = runTempSource(SRC_UNDEFINED_METHOD);
  assert.equal(result.status, 1, "未定义方法应为运行期错误（退出码 1），实际 " + String(result.status) + "；stderr=" + result.stderr);
  assert.match(result.stderr, ONLY_DIAG, "stderr 只能是 GGDIAG 帧字符，实际=" + JSON.stringify(result.stderr));
  const frame = decodeOne(result.stderr);
  assert.equal(frame.code, 12, "未定义方法应是 E4002 → code 12，实际帧=" + JSON.stringify(frame));
  assert.ok(frame.line > 0 && frame.col > 0, "帧里应带源码位置，实际=" + JSON.stringify(frame));
  assert.ok(frame.message.includes("未定义") && frame.message.includes("个参数"), "正文应是原来的诊断文案，实际=" + frame.message);
  assert.match(result.stdout, ONLY_BITS, "出错前已写出的位也应只有 咕/嘎，实际=" + JSON.stringify(result.stdout));
});

test("运行期错误：构造器实参个数不符 → 退出码 1、17 号帧（E4007）", () => {
  const result = runTempSource(SRC_CTOR_ARITY);
  assert.equal(result.status, 1, "构造调用错误应为运行期错误（退出码 1），实际 " + String(result.status) + "；stderr=" + result.stderr);
  assert.match(result.stderr, ONLY_DIAG, "stderr 只能是 GGDIAG 帧字符，实际=" + JSON.stringify(result.stderr));
  const frame = decodeOne(result.stderr);
  assert.equal(frame.code, 17, "构造调用错误应是 E4007 → code 17，实际帧=" + JSON.stringify(frame));
  assert.ok(frame.line > 0 && frame.col > 0, "帧里应带源码位置，实际=" + JSON.stringify(frame));
  assert.ok(frame.message.includes("构造器") && frame.message.includes("实参"), "正文应是原来的诊断文案，实际=" + frame.message);
  assert.match(result.stdout, ONLY_BITS, "出错前已写出的位也应只有 咕/嘎，实际=" + JSON.stringify(result.stdout));
});

test("多方言样例：.ググ 文件输出日语字形 グ/ガ，归一化后与中文样例逐位相同", () => {
  const result = runExample("ガググガグ.ググ");
  // 改断言的理据：位流现在跟随文件后缀方言（SPEC §1.4），日语文件的 0/1 画成 グ/ガ。
  // 覆盖没有减弱：字符集收紧成 グ/ガ，位数仍是 64，且逐位等于整数 0 的 64 位补码。
  expectCleanRun(result, "ガググガグ.ググ", /^[グガ]*$/);
  assert.equal(result.stdout.length, 64, "日语样例应输出 64 位，实际 " + String(result.stdout.length));
  assert.equal(result.stdout, renderGlyphs(int64Bits(0n), JA), "日语样例期望整数 0 的 64 位补码（グ/ガ 字形）");
  assert.equal(normalizeGlyphs(result.stdout, JA), int64Bits(0n), "归一化回 咕/嘎 后应与中文样例逐位相同");
  assert.equal(Buffer.byteLength(result.stdout, "utf8"), 192, "64 个三字节字形 = 192 字节");
});

test("多方言样例：.gu 文件输出英文位名 GU/GA（全大写），归一化后与日语样例逐位相同", () => {
  const ja = runExample("ガググガグ.ググ");
  const en = runExample("gugugaga.gu");
  expectCleanRun(en, "gugugaga.gu", /^(GU|GA)*$/);
  assert.equal(en.stdout.length, 128, "64 位 × 2 字母 = 128 字符，实际 " + String(en.stdout.length));
  assert.equal(en.stdout, renderGlyphs(int64Bits(0n), EN), "英语样例期望整数 0 的 64 位补码（GU/GA 字形）");
  // 同一份程序的三种写法：位必须一致，只有字形不同——所以比的是归一化后的位串。
  assert.equal(normalizeGlyphs(en.stdout, EN), normalizeGlyphs(ja.stdout, JA), "英语样例与日语样例应归一化后逐位相同");
  assert.notEqual(en.stdout, ja.stdout, "字形不同：两者不应逐字节相同");
  assert.equal(Buffer.byteLength(en.stdout, "utf8"), 128, "128 个 ASCII 字母 = 128 字节");
});

test("多方言样例：check 对两份方言样例完全静默", () => {
  for (const name of ["ガググガグ.ググ", "gugugaga.gu"]) {
    const result = gg(["check", path.join("examples", name)]);
    assert.equal(result.status, 0, name + "：check 应退出 0，stderr=" + result.stderr);
    assert.equal(result.stdout, "", name + "：check 不应有 stdout");
    assert.equal(result.stderr, "", name + "：check 成功应完全静默");
  }
});