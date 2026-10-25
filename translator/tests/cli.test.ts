import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GU, bitsToInt64 } from "../src/bits.ts";
import { TEXT_LITERAL_PREFIX } from "../src/encode.ts";
import { HAI_BITS, runGgt } from "./helpers.ts";

test("--help 输出用法并返回 0", () => {
  const result = runGgt(["--help"]);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("ggt decode"));
  assert.ok(result.stdout.includes("ggt encode"));
  assert.equal(result.stderr, "");
  assert.equal(runGgt(["-h"]).status, 0);
});

test("没有子命令返回 2 并打印用法", () => {
  const result = runGgt([]);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes("缺少子命令"));
  assert.ok(result.stderr.includes("用法"));
});

test("未知子命令返回 2", () => {
  const result = runGgt(["foo"]);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes("未知子命令“foo”"));
});

test("模式冲突与未知选项都返回 2", () => {
  assert.equal(runGgt(["decode", "--int64", "--bytes"], GU.repeat(64)).status, 2);
  assert.equal(runGgt(["decode", "--plan", "plans/咕嘎嘎咕.plan", "--bytes"]).status, 2);
  assert.equal(runGgt(["decode", "--wat"], GU.repeat(64)).status, 2);
  assert.equal(runGgt(["encode", "--plan", "x"], "嗨").status, 2);
});

test("输入文件不存在返回 2，plan 文件不存在返回 3", () => {
  const missing = path.join("tests", "no-such-file.bits");
  const inputMissing = runGgt(["decode", "--bits", missing]);
  assert.equal(inputMissing.status, 2);
  assert.ok(inputMissing.stderr.includes("无法读取输入文件"));

  const planMissing = runGgt(["decode", "--plan", path.join("tests", "no-such.plan")], GU.repeat(64));
  assert.equal(planMissing.status, 3);
  assert.ok(planMissing.stderr.includes("plan 文件"));
});

test("给了文件参数就读文件、忽略 stdin", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ggt-cli-"));
  try {
    const file = path.join(dir, "bits.txt");
    writeFileSync(file, "咕嘎咕\n", "utf8");
    const result = runGgt(["decode", "--bits", file], "嘎嘎嘎嘎");
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "咕嘎咕");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("stdin 的尾随换行被容忍", () => {
  const result = runGgt(["decode", "--bits"], " 咕\t嘎\n咕\r\n");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "咕嘎咕");
});

test("非法字符以退出码 1 报出码点与位置", () => {
  const result = runGgt(["decode", "--bits"], "咕x");
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes("非法字符“x”"));
  assert.ok(result.stderr.includes("U+0078"));
  assert.ok(result.stderr.includes("第 2 个字符"));
});

test("decode --int64 从 stdin 读 64 位", () => {
  const result = runGgt(["decode", "--int64"], GU.repeat(64));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "0\n");
});

test("decode 无模式时把猜测写到 stderr，stdout 只有结果", () => {
  const result = runGgt(["decode"], GU.repeat(64));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "0\n");
  const lines = result.stderr.trimEnd().split("\n");
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes("猜为 --int64"));
});

test("decode 无模式猜 bytes 时正常解文本", () => {
  const result = runGgt(["decode"], HAI_BITS);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "嗨");
  assert.ok(result.stderr.includes("--bytes"));
});

test("encode 文本模式输出纯位流", () => {
  const result = runGgt(["encode"], "嗨");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, HAI_BITS);
  assert.equal(result.stderr, "");
});

test("encode 文本 + --as-literal 带 嘎嘎嘎嘎？ 前缀", () => {
  const result = runGgt(["encode", "--as-literal"], "嗨");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, TEXT_LITERAL_PREFIX + HAI_BITS);
});

test("encode --int64 逐个输出 64 位补码", () => {
  const result = runGgt(["encode", "--int64"], "1 -1\n");
  assert.equal(result.status, 0);
  assert.equal(result.stdout.length, 128);
  assert.equal(bitsToInt64(result.stdout.slice(0, 64)), 1n);
  assert.equal(bitsToInt64(result.stdout.slice(64)), -1n);
});

test("encode --int64 --as-literal 带 嘎嘎嘎？ 前缀", () => {
  const result = runGgt(["encode", "--int64", "--as-literal"], "5\n");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "嘎嘎嘎？嘎咕嘎");
});

test("encode --int64 非法记号返回 1", () => {
  const result = runGgt(["encode", "--int64"], "abc");
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("非法整数"));
});

test("encode --as-literal 负数返回 1", () => {
  const result = runGgt(["encode", "--int64", "--as-literal"], "-1");
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes("字面量模式不支持负数"));
});
