import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HAI_BITS, runGg, runGgt } from "./helpers.ts";

function readPlan(name: string): string {
  return readFileSync(new URL("../plans/" + name, import.meta.url), "utf8");
}

test("plans 文件内容与契约一致", () => {
  assert.equal(readPlan("咕嘎咕嘎.plan"), "bytes 3\n");
  assert.equal(readPlan("咕嘎嘎咕.plan"), "int64\nint64\n");
});

test("端到端 1：hello-bits → decode --bytes 得到 嗨（无换行）", () => {
  const program = runGg(["run", "../examples/咕嘎咕嘎.咕咕"]);
  assert.equal(program.status, 0);
  assert.equal(program.stdout, HAI_BITS);
  const result = runGgt(["decode", "--bytes"], program.stdout);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "嗨");
  assert.equal(result.stderr, "");
});

test("端到端 2：不指定模式时猜成 bytes，stderr 说明，stdout 只有 嗨", () => {
  const program = runGg(["run", "../examples/咕嘎咕嘎.咕咕"]);
  const result = runGgt(["decode"], program.stdout);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "嗨");
  const lines = result.stderr.trimEnd().split("\n");
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes("猜为 --bytes"));
});

test("端到端 3：calc 配 咕嘎嘎咕.plan 得到 104 与 -2", () => {
  const program = runGg(["run", "../examples/咕嘎嘎咕.咕咕"], "35");
  assert.equal(program.status, 0);
  assert.equal(program.stdout.length, 128);
  const result = runGgt(["decode", "--plan", "plans/咕嘎嘎咕.plan"], program.stdout);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "104\n-2\n");
});

test("端到端：calc 不配 plan 时猜 int64，结果一致", () => {
  const program = runGg(["run", "../examples/咕嘎嘎咕.咕咕"], "35");
  const result = runGgt(["decode"], program.stdout);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "104\n-2\n");
  assert.ok(result.stderr.includes("猜为 --int64"));
});

test("端到端：文本经 encode 再 decode 可无损往返", () => {
  const text = "咕嘎 translator：嗨！\n";
  const encoded = runGgt(["encode"], text);
  assert.equal(encoded.status, 0);
  const decoded = runGgt(["decode", "--bytes"], encoded.stdout);
  assert.equal(decoded.status, 0);
  assert.equal(decoded.stdout, text);
});
