import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bigIntToBits, bytesToBits } from "../src/bits.ts";
import { CODE_NAMES, codeName, formatDiagEvent, parseDiagFrames } from "../src/diag.ts";
import { runGg, runGgt } from "./helpers.ts";

interface FrameSpec {
  code: number;
  line?: number;
  col?: number;
  message?: string;
  magic?: number;
  version?: number;
  end?: number;
}

/** 按 SPEC.md §12 拼一帧：magic 1010 | version 00 | code 8 | line 16 | col 16 | mlen 16 | msg | end 110。 */
function frameBits(spec: FrameSpec): string {
  const message = new TextEncoder().encode(spec.message ?? "");
  let bits = bigIntToBits(BigInt(spec.magic ?? 10), 4);
  bits += bigIntToBits(BigInt(spec.version ?? 0), 2);
  bits += bigIntToBits(BigInt(spec.code), 8);
  bits += bigIntToBits(BigInt(spec.line ?? 0), 16);
  bits += bigIntToBits(BigInt(spec.col ?? 0), 16);
  bits += bigIntToBits(BigInt(message.length), 16);
  bits += bytesToBits(message);
  return bits + bigIntToBits(BigInt(spec.end ?? 6), 3);
}

test("单帧：码、位置、正文都还原", () => {
  const bits = frameBits({ code: 5, line: 12, col: 3, message: "未定义的变量 x" });
  const events = parseDiagFrames(bits);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], { code: 5, line: 12, col: 3, message: "未定义的变量 x" });
  assert.equal(formatDiagEvent(events[0]), "12:3 E2002 未定义的变量 x");
});

test("多帧按出现顺序取回，帧间空白被忽略", () => {
  const input = frameBits({ code: 1, line: 1, col: 4, message: "第一个" })
    + "\n\n   "
    + frameBits({ code: 21, line: 2, col: 9, message: "第二个" });
  const events = parseDiagFrames(input);
  assert.deepEqual(events.map((event) => event.code), [1, 21]);
  assert.deepEqual(events.map((event) => event.message), ["第一个", "第二个"]);
});

test("垃圾前缀与宿主警告不影响解码", () => {
  const input = "警告：宿主：无法识别的字节\n" + frameBits({ code: 23, message: "读文件失败：a.txt" }) + "。\n";
  const events = parseDiagFrames(input);
  assert.equal(events.length, 1);
  assert.equal(events[0].code, 23);
  assert.equal(events[0].message, "读文件失败：a.txt");
});

test("version 不符：后移一位重新同步，取到后面的真帧", () => {
  const input = frameBits({ code: 4, version: 3, message: "假帧" })
    + frameBits({ code: 6, line: 5, col: 2, message: "真帧" });
  const events = parseDiagFrames(input);
  assert.deepEqual(events.map((event) => event.code), [6]);
});

test("magic 错位后能找到后面的帧", () => {
  const input = "咕嘎嘎" + frameBits({ code: 2, line: 8, col: 1, message: "后一帧" });
  const events = parseDiagFrames(input);
  assert.equal(events.length, 1);
  assert.equal(events[0].code, 2);
});

test("end 不是 110 的帧被丢弃，后面的帧仍然解出", () => {
  const input = frameBits({ code: 1, end: 5, message: "" })
    + frameBits({ code: 3, line: 4, col: 6, message: "保留" });
  const events = parseDiagFrames(input);
  assert.deepEqual(events.map((event) => event.code), [3]);
});

test("尾部截断：不完整的帧被丢弃", () => {
  const complete = frameBits({ code: 7, line: 1, col: 2, message: "完整" });
  const input = complete + frameBits({ code: 8, message: "写了一半" }).slice(0, 40);
  assert.deepEqual(parseDiagFrames(input).map((event) => event.code), [7]);
});

test("头部截断：不吞掉后面完整的帧", () => {
  const truncated = frameBits({ code: 9, message: "五字节的消息" }).slice(0, 40);
  const input = truncated + frameBits({ code: 10, line: 3, col: 3, message: "完好" });
  assert.deepEqual(parseDiagFrames(input).map((event) => event.code), [10]);
});

test("mlen=0：正文为空，不留尾随空格", () => {
  const events = parseDiagFrames(frameBits({ code: 22, line: 7, col: 1 }));
  assert.equal(events.length, 1);
  assert.equal(events[0].message, "");
  assert.equal(formatDiagEvent(events[0]), "7:1 帮助");
});

test("中文多字节 UTF-8 原样还原", () => {
  const message = "变量“甲”未定义：咕嘎";
  const events = parseDiagFrames(frameBits({ code: 11, line: 2, col: 5, message }));
  assert.equal(events.length, 1);
  assert.equal(events[0].message, message);
  assert.equal(events[0].code, 11);
});

test("位置只给一半时仍打印 行:列", () => {
  const events = parseDiagFrames(frameBits({ code: 24, line: 3 }));
  assert.deepEqual(events.map(formatDiagEvent), ["3:0 内部错误"]);
});

test("码名映射：§9 表、外壳码、未知码", () => {
  assert.equal(CODE_NAMES.length, 21);
  assert.equal(codeName(1), "E1001");
  assert.equal(codeName(5), "E2002");
  assert.equal(codeName(21), "E4012");
  assert.equal(codeName(0), "用法错误");
  assert.equal(codeName(22), "帮助");
  assert.equal(codeName(23), "读文件失败");
  assert.equal(codeName(24), "内部错误");
  assert.equal(codeName(25), "未知事件 25");
  assert.equal(codeName(200), "未知事件 200");
});

test("decode --diag：一帧一行，stdout 只有结果", () => {
  const input = frameBits({ code: 0, message: "未知子命令“foo”" })
    + "\n"
    + frameBits({ code: 1, line: 3, col: 9, message: "变量 x 未定义" });
  const result = runGgt(["decode", "--diag"], input);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "用法错误 未知子命令“foo”\n3:9 E1001 变量 x 未定义\n");
  assert.equal(result.stderr, "");
});

test("--diag 与 --plan / 四种模式互斥", () => {
  for (const flags of [["--bytes"], ["--int64"], ["--hex"], ["--bits"], ["--plan", "plans/咕嘎嘎咕.plan"]]) {
    const result = runGgt(["decode", "--diag", ...flags], frameBits({ code: 1, message: "x" }));
    assert.equal(result.status, 2, "参数 " + flags.join(" ") + " 应报用法错误");
    assert.ok(result.stderr.includes("--diag"), "错误信息应点出 --diag：" + result.stderr);
  }
});

test("没有诊断帧：stderr 一行说明，退出码 1，stdout 为空", () => {
  const result = runGgt(["decode", "--diag"], "咕咕咕咕咕咕\n");
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes("没有找到诊断帧"));
});

test("--diag 读文件时忽略 stdin，文件不存在返回 2", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ggt-diag-"));
  try {
    const file = path.join(dir, "stderr.txt");
    writeFileSync(file, "host: warning\n" + frameBits({ code: 23, message: "读文件失败：x.咕咕" }) + "\n", "utf8");
    const result = runGgt(["decode", "--diag", file], frameBits({ code: 1, message: "不该出现" }));
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "读文件失败 读文件失败：x.咕咕\n");

    const missing = runGgt(["decode", "--diag", path.join(dir, "no-such.txt")]);
    assert.equal(missing.status, 2);
    assert.ok(missing.stderr.includes("无法读取输入文件"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("真解释器的诊断帧（解释器尚未输出帧时跳过）", (t) => {
  const result = runGg(["run", "no-such-file.咕咕"]);
  if (/[^咕嘎\s]/.test(result.stderr)) {
    t.skip("解释器还没把 stderr 改成 GGDIAG v1 帧：" + result.stderr.trim().slice(0, 40));
    return;
  }
  const decoded = runGgt(["decode", "--diag"], result.stderr);
  assert.equal(decoded.status, 0);
  assert.ok(decoded.stdout.includes("读文件失败"), "实际输出：" + decoded.stdout);
});
