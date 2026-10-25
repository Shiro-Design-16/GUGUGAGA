/**
 * GGDIAG v1 编码器的位级测试（SPEC.md §12 是权威文本）。
 * 所有期望值都在本文件里独立算，不复用 src/wire.ts 的实现细节。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { CODE, codeNumber, EXIT, frameOfError, GgError } from "../src/errors.ts";
import {
  encodeDiag,
  EVENT,
  frameBits,
  KNOWN_CODE_MAX,
  MAX_MESSAGE_BYTES,
  messageBytes,
} from "../src/wire.ts";
import { decodeFrames, decodeOne } from "./ggdiag.ts";

/** 咕/嘎 → 0/1 位串，方便按 SPEC 的表格逐字段断言。 */
function digits(frame: string): string {
  let out = "";
  for (const ch of frame) {
    assert.ok(ch === "咕" || ch === "嘎", "帧里出现非 咕/嘎 字符：" + JSON.stringify(ch));
    out += ch === "嘎" ? "1" : "0";
  }
  return out;
}

/** 无符号整数 → 定宽位串（MSB 在前），测试自己的独立实现。 */
function bin(value: number, width: number): string {
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) out += String((value >> i) & 1);
  return out;
}

/** SPEC §9 的错误码顺序，独立抄一份：它就是 GGDIAG code 1..21 的唯一真源。 */
const SPEC_CODES = [
  "E1001", "E1002", "E1003", "E2001", "E2002", "E3001", "E3002", "E3003", "E3004", "E3005",
  "E4001", "E4002", "E4003", "E4004", "E4005", "E4006", "E4007", "E4008", "E4010", "E4011",
  "E4012",
];
const SPEC_NAMES = [
  "IllegalChar", "Indent", "StrayPunct", "Syntax", "EmptyBlock", "DupClass", "DupEntry",
  "NoEntry", "CyclicInherit", "UnknownParent", "UndefinedName", "UndefinedMethod", "UnknownField",
  "TypeMismatch", "DivideByZero", "NotOutputable", "BadCtor", "StaticThis", "StepLimit",
  "DepthLimit", "BadReceiver",
];

test("帧长恒为 65 + 8×mlen", () => {
  const cases: Array<[string, number]> = [
    ["", 0],
    ["E4002", 5],
    ["方法 咕 未定义", Buffer.byteLength("方法 咕 未定义", "utf8")],
  ];
  for (const [message, bytes] of cases) {
    const frame = encodeDiag(12, { line: 1, col: 2 }, message);
    assert.equal(frame.length, 65 + 8 * bytes, "帧长不符：" + JSON.stringify(message));
  }
});

test("帧头 magid/version 固定：magic=1010 后接 version=00", () => {
  const d = digits(encodeDiag(1, null, ""));
  assert.equal(d.slice(0, 4), "1010", "magic 应为 1010");
  assert.equal(d.slice(4, 6), "00", "version 应为 00（v1）");
});

test("code 字段 8 位 MSB 在前", () => {
  for (const code of [0, 1, 12, 21, 22, 23, 24, 255]) {
    const d = digits(encodeDiag(code, null, ""));
    assert.equal(d.slice(6, 14), bin(code, 8), "code=" + code + " 字段不符");
  }
});

test("line / col 字段各 16 位 MSB 在前", () => {
  for (const [line, col] of [[0, 0], [1, 1], [3, 7], [4096, 12345], [65535, 65535]]) {
    const d = digits(encodeDiag(4, { line, col }, ""));
    assert.equal(d.slice(14, 30), bin(line, 16), "line=" + line + " 字段不符");
    assert.equal(d.slice(30, 46), bin(col, 16), "col=" + col + " 字段不符");
  }
});

test("mlen 字段 16 位；正文逐字节 MSB 在前；end 固定 110", () => {
  const message = "嗨";
  const d = digits(encodeDiag(5, { line: 2, col: 3 }, message));
  assert.equal(d.slice(46, 62), bin(3, 16), "mlen 应为 UTF-8 字节数 3");
  assert.equal(d.slice(62, 62 + 24), "111001011001011110101000", "「嗨」应为 E5 97 A8 的逐位");
  assert.equal(d.slice(62 + 24), "110", "end 应为 110");
});

test("mlen=0：没有正文字节，end 紧跟 mlen", () => {
  const frame = encodeDiag(EVENT.USAGE, null, "");
  const d = digits(frame);
  assert.equal(frame.length, 65, "空正文的帧应为 65 位");
  assert.equal(d.slice(46, 62), "0".repeat(16), "mlen 应为 0");
  assert.equal(d.slice(62), "110", "end 应紧跟 mlen");
  assert.deepEqual(decodeOne(frame), { code: 0, line: 0, col: 0, message: "" });
});

test("多字节 UTF-8 正文能原样往返（中文 / 标点 / 换行）", () => {
  const message = "无法读取文件 程序.咕咕：ENOENT: no such file\n第二行";
  const frame = encodeDiag(EVENT.READ_FAILED, null, message);
  assert.equal(frame.length, 65 + 8 * Buffer.byteLength(message, "utf8"));
  assert.deepEqual(decodeOne(frame), { code: 23, line: 0, col: 0, message });
});

test("无位置：pos=null → line=0 col=0；line=0 时 col 也强制写 0", () => {
  assert.deepEqual(decodeOne(encodeDiag(24, null, "x")), { code: 24, line: 0, col: 0, message: "x" });
  assert.deepEqual(decodeOne(encodeDiag(24, { line: 0, col: 9 }, "x")), { code: 24, line: 0, col: 0, message: "x" });
});

test("encodeDiag 的返回值只含 咕/嘎，且不含结尾换行", () => {
  const frame = encodeDiag(1, { line: 1, col: 1 }, "非法字符“噶”");
  assert.match(frame, /^[咕嘎]+$/, "帧本体只允许 咕/嘎");
  assert.ok(!frame.includes("\n"), "帧本体不应自带换行（换行由外壳追加）");
});

test("越界数值钳到字段上限，不崩", () => {
  assert.deepEqual(decodeOne(frameBits(999, 70000, 70000, "x")), {
    code: 255,
    line: 65535,
    col: 65535,
    message: "x",
  });
});

test("超长正文按 UTF-8 字符边界截断到 65535 字节（不产生半个字符）", () => {
  const long = "a" + "嘎".repeat(22000); // 1 + 66000 = 66001 字节 > 65535
  const bytes = messageBytes(long);
  assert.ok(bytes.length <= MAX_MESSAGE_BYTES, "截断后不得超过 65535 字节");
  const text = bytes.toString("utf8");
  assert.ok(!text.includes("\uFFFD"), "截断点落在字符边界，不应出现替换字符");
  assert.ok(long.startsWith(text), "截断结果必须是原文前缀");
  const frame = encodeDiag(EVENT.INTERNAL, null, long);
  assert.equal(frame.length, 65 + 8 * bytes.length);
  assert.equal(decodeOne(frame).message, text);
});

test("截断：4 字节 UTF-8（emoji）也切在字符边界", () => {
  const long = "😀".repeat(20000); // 80000 字节
  const bytes = messageBytes(long);
  assert.equal(bytes.length % 4, 0, "应切在 4 字节字符边界");
  assert.ok(bytes.toString("utf8") === "😀".repeat(bytes.length / 4));
});

test("正好 65535 字节不截断", () => {
  const exact = "a".repeat(MAX_MESSAGE_BYTES);
  assert.equal(messageBytes(exact).length, MAX_MESSAGE_BYTES);
});

test("CODE 表顺序 = SPEC §9 顺序，codeNumber 映射 1..21", () => {
  assert.deepEqual(Object.keys(CODE), SPEC_NAMES, "CODE 表顺序是协议的一部分，不得重排");
  assert.deepEqual(Object.values(CODE), SPEC_CODES, "CODE 表的 E 码必须与 SPEC §9 表逐条一致");
  SPEC_NAMES.forEach((name, index) => {
    assert.equal(codeNumber(CODE[name as keyof typeof CODE]), index + 1, name + " 的码应为下标+1");
  });
  assert.equal(codeNumber("E9999"), EVENT.INTERNAL, "未知码只能退回 24，不得冒充语言错误");
});

test("frameOfError：码 / 位置 / 正文逐项对应", () => {
  const err = new GgError(CODE.UndefinedMethod, { line: 7, col: 11 }, "方法 咕（1 个参数）未定义");
  assert.deepEqual(decodeOne(frameOfError(err)), {
    code: 12,
    line: 7,
    col: 11,
    message: "方法 咕（1 个参数）未定义",
  });
  const noPos = new GgError(CODE.NoEntry, null, "缺少入口：程序需要一个 咕咕嘎嘎！ 块");
  assert.deepEqual(decodeOne(frameOfError(noPos)), {
    code: 8,
    line: 0,
    col: 0,
    message: "缺少入口：程序需要一个 咕咕嘎嘎！ 块",
  });
});

test("frameOfError：21 个语言错误逐条解得出同一个码", () => {
  SPEC_NAMES.forEach((name, index) => {
    const err = new GgError(CODE[name as keyof typeof CODE], { line: 1, col: 1 }, "M");
    assert.equal(decodeOne(frameOfError(err)).code, index + 1, name + " 的帧码不符");
  });
});

test("事件码常量与 SPEC §12.3 一致", () => {
  assert.deepEqual(EVENT, { USAGE: 0, HELP: 22, READ_FAILED: 23, INTERNAL: 24 });
  assert.equal(KNOWN_CODE_MAX, 24);
});

test("帧间可夹空格/换行：解码器忽略非 咕/嘎 字符", () => {
  const stream = encodeDiag(0, null, "甲") + "\n  \n" + encodeDiag(22, null, "乙");
  assert.deepEqual(
    decodeFrames(stream).map((f) => [f.code, f.message]),
    [[0, "甲"], [22, "乙"]],
  );
});

test("EXIT 语义不变（SPEC.md §8）", () => {
  assert.deepEqual(EXIT, { OK: 0, RUNTIME: 1, STATIC: 2, USAGE: 3 });
});
