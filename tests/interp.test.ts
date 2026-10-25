/**
 * 解释器语义测试（SPEC.md §5/§6/§7）：源码字符串 → 解释器 → 收集输出位流。
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { CODE, GgError } from "../src/errors.ts";
import { intToBits, isReserved } from "../src/keywords.ts";
import { parseSource } from "../src/parser.ts";
import { interpret } from "../src/interp.ts";
import type { RunOptions } from "../src/interp.ts";

const GU = "咕";
const GA = "嘎";

/** 入口名 */
const ENTRY = "嘎咕咕嘎咕";

/** 把入口块的语句按 4 空格缩进拼成完整源码 */
function entry(body: string): string {
  const lines = body.split("\n").map((line) => (line.length === 0 ? line : "    " + line));
  return "咕咕嘎嘎！ " + ENTRY + "\n" + lines.join("\n") + "\n";
}

/** 类声明（或若干类）+ 空行 + 入口块 */
function program(classes: string, body: string): string {
  return classes.replace(/\n+$/, "") + "\n\n" + entry(body);
}

/** 跑一遍，返回已写出的位流与异常（异常不抛出，便于断言流式输出） */
function runCapture(src: string, opts: RunOptions = {}): { out: string; error: unknown } {
  const parsed = parseSource(src);
  const chunks: string[] = [];
  const options: RunOptions = {
    ...opts,
    write: (bits: string): void => {
      chunks.push(bits);
    },
  };
  try {
    interpret(parsed, options);
  } catch (error) {
    return { out: chunks.join(""), error };
  }
  return { out: chunks.join(""), error: null };
}

function run(src: string, opts: RunOptions = {}): string {
  const result = runCapture(src, opts);
  if (result.error !== null) throw result.error;
  return result.out;
}

function codeOf(src: string, opts: RunOptions = {}): string {
  const result = runCapture(src, opts);
  const error = result.error;
  if (!(error instanceof GgError)) assert.fail("预期抛出 GgError，实际：" + String(error));
  return error.code;
}

test("测试里用到的名字都不是保留词", () => {
  const names = [
    "嘎咕嘎",
    "嘎咕咕",
    "嘎咕嘎嘎咕",
    "嘎咕嘎嘎嘎",
    "咕嘎咕嘎咕",
    "咕嘎咕嘎嘎",
    "嘎咕嘎咕嘎",
    "咕咕咕咕咕",
    "嘎嘎嘎嘎咕",
    "嘎嘎嘎咕嘎",
    "嘎嘎咕嘎嘎",
    "嘎嘎嘎咕嘎",
    "嘎嘎咕咕嘎",
    "咕咕嘎咕咕",
    ENTRY,
  ];
  for (const name of names) assert.equal(isReserved(name), false, name + " 不应是保留词");
});

test("整数输出：定长 64 位补码", () => {
  assert.equal(run(entry("咕：嘎嘎嘎？咕")), GU.repeat(64));
  assert.equal(run(entry("咕：嘎嘎嘎？嘎")), GU.repeat(63) + GA);
  assert.equal(run(entry("咕：咕咕嘎咕？ 嘎嘎嘎？嘎")), GA.repeat(64));
});

test("位串原样输出、布尔 8 位", () => {
  assert.equal(run(entry("咕：嘎嘎嘎嘎？咕嘎咕")), "咕嘎咕");
  assert.equal(run(entry("咕：嘎嘎？")), GA.repeat(8));
  assert.equal(run(entry("咕：嘎嘎咕？")), GU.repeat(8));
});

test("空与对象不能输出（E4006）", () => {
  assert.equal(codeOf(entry("咕：嘎咕？")), CODE.NotOutputable);
  const src = program("咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕", "咕：咕嘎嘎！ 嘎咕嘎？");
  assert.equal(codeOf(src), CODE.NotOutputable);
});

test("加减乘除取余：仅整数，除法向零截断", () => {
  assert.equal(run(entry("咕：咕？ 嘎嘎嘎？嘎 嘎嘎嘎？嘎咕")), intToBits(3n, 64));
  assert.equal(run(entry("咕：咕咕？ 嘎嘎嘎？嘎嘎嘎 嘎嘎嘎？嘎")), intToBits(6n, 64));
  assert.equal(run(entry("咕：咕嘎？ 嘎嘎嘎？嘎嘎 嘎嘎嘎？嘎咕")), intToBits(6n, 64));
  assert.equal(run(entry("咕：咕咕咕？ 嘎嘎嘎？嘎嘎嘎 嘎嘎嘎？嘎咕")), intToBits(3n, 64));
  assert.equal(run(entry("咕：咕咕咕？ 咕咕嘎咕？ 嘎嘎嘎？嘎嘎嘎 嘎嘎嘎？嘎咕")), intToBits(-3n, 64));
  assert.equal(run(entry("咕：咕咕嘎？ 嘎嘎嘎？嘎嘎嘎 嘎嘎嘎？嘎咕")), intToBits(1n, 64));
  assert.equal(run(entry("咕：咕咕嘎？ 咕咕嘎咕？ 嘎嘎嘎？嘎嘎嘎 嘎嘎嘎？嘎咕")), intToBits(-1n, 64));
});

test("除数为零（E4005）", () => {
  assert.equal(codeOf(entry("咕：咕咕咕？ 嘎嘎嘎？嘎 嘎嘎嘎？咕")), CODE.DivideByZero);
  assert.equal(codeOf(entry("咕：咕咕嘎？ 嘎嘎嘎？嘎 嘎嘎嘎？咕")), CODE.DivideByZero);
});

test("加：整数相加、位串拼接，其它组合 E4004", () => {
  assert.equal(run(entry("咕：咕？ 嘎嘎嘎？嘎 嘎嘎嘎？嘎咕")), intToBits(3n, 64));
  assert.equal(run(entry("咕：咕？ 嘎嘎嘎嘎？咕嘎 嘎嘎嘎嘎？嘎咕")), "咕嘎嘎咕");
  assert.equal(codeOf(entry("咕：咕？ 嘎嘎嘎？咕 嘎嘎嘎嘎？咕")), CODE.TypeMismatch);
  assert.equal(codeOf(entry("咕：咕咕？ 嘎嘎嘎嘎？咕 嘎嘎嘎？咕")), CODE.TypeMismatch);
  assert.equal(codeOf(entry("咕：咕咕嘎咕？ 嘎嘎嘎嘎？咕")), CODE.TypeMismatch);
});

test("相等：同类比较，跨类型一律为假", () => {
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎嘎？嘎 嘎嘎嘎？嘎")), GA.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎嘎？咕 嘎嘎嘎？嘎")), GU.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎嘎？咕 嘎嘎嘎嘎？咕")), GU.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎？ 嘎嘎咕？")), GU.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎咕？ 嘎咕？")), GA.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎嘎嘎？咕嘎 嘎嘎嘎嘎？咕嘎")), GA.repeat(8));
  assert.equal(run(entry("咕：咕嘎咕？ 嘎嘎嘎嘎？咕嘎 嘎嘎嘎嘎？嘎咕")), GU.repeat(8));
});

test("相等：对象按同一性", () => {
  const src = program(
    "咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕咕！？ 嘎嘎嘎咕嘎：咕嘎嘎！ 嘎咕嘎？",
      "咕：咕嘎咕？ 嘎嘎嘎嘎咕？ 嘎嘎嘎嘎咕？",
      "咕：咕嘎咕？ 嘎嘎嘎嘎咕？ 嘎嘎嘎咕嘎？",
    ].join("\n"),
  );
  assert.equal(run(src), GA.repeat(8) + GU.repeat(8));
});

test("小于/大于：仅整数", () => {
  assert.equal(run(entry("咕：咕嘎嘎？ 嘎嘎嘎？嘎 嘎嘎嘎？嘎咕")), GA.repeat(8));
  assert.equal(run(entry("咕：咕嘎嘎？ 嘎嘎嘎？嘎咕 嘎嘎嘎？嘎")), GU.repeat(8));
  assert.equal(run(entry("咕：咕嘎嘎咕？ 嘎嘎嘎？嘎咕 嘎嘎嘎？嘎")), GA.repeat(8));
  assert.equal(run(entry("咕：咕嘎嘎咕？ 嘎嘎嘎？嘎 嘎嘎嘎？嘎咕")), GU.repeat(8));
  assert.equal(codeOf(entry("咕：咕嘎嘎？ 嘎嘎嘎嘎？咕 嘎嘎嘎？嘎")), CODE.TypeMismatch);
});

const MARKER_CLASS = [
  "咕咕！ 嘎咕嘎",
  "    咕咕嘎！ 咕嘎咕嘎咕：嘎嘎嘎咕嘎",
  "        咕：嘎嘎嘎嘎？嘎",
  "        嘎嘎：嘎嘎嘎咕嘎？",
].join("\n");

test("与/或两侧都求值，不做短路", () => {
  const andSrc = program(
    MARKER_CLASS,
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕：咕嘎咕咕？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！：嘎嘎咕？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！：嘎嘎？",
    ].join("\n"),
  );
  assert.equal(run(andSrc), "嘎嘎" + GU.repeat(8));

  const orSrc = program(
    MARKER_CLASS,
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕：咕嘎咕嘎？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！：嘎嘎咕？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！：嘎嘎？",
    ].join("\n"),
  );
  assert.equal(run(orSrc), "嘎嘎" + GA.repeat(8));
});

test("非仅布尔；与/或/非的类型错误（E4004）", () => {
  assert.equal(run(entry("咕：咕咕咕咕？ 嘎嘎咕？")), GA.repeat(8));
  assert.equal(run(entry("咕：咕咕咕咕？ 嘎嘎？")), GU.repeat(8));
  assert.equal(codeOf(entry("咕：咕咕咕咕？ 嘎嘎嘎？咕")), CODE.TypeMismatch);
  assert.equal(codeOf(entry("咕：咕嘎咕咕？ 嘎嘎？ 嘎嘎嘎？咕")), CODE.TypeMismatch);
  assert.equal(codeOf(entry("咕：咕嘎咕嘎？ 嘎嘎咕？ 嘎嘎嘎？咕")), CODE.TypeMismatch);
});

test("若/否则：条件必须布尔（E4004）", () => {
  const thenBranch = entry(
    ["嘎嘎嘎：嘎嘎？", "    咕：嘎嘎嘎嘎？嘎", "嘎嘎嘎嘎", "    咕：嘎嘎嘎嘎？咕"].join("\n"),
  );
  assert.equal(run(thenBranch), "嘎");
  const elseBranch = entry(
    ["嘎嘎嘎：嘎嘎咕？", "    咕：嘎嘎嘎嘎？嘎", "嘎嘎嘎嘎", "    咕：嘎嘎嘎嘎？咕"].join("\n"),
  );
  assert.equal(run(elseBranch), "咕");
  assert.equal(
    codeOf(entry(["嘎嘎嘎：嘎嘎嘎？咕", "    咕：嘎嘎嘎嘎？嘎"].join("\n"))),
    CODE.TypeMismatch,
  );
});

test("块不引入新作用域", () => {
  const ifSrc = entry(
    ["嘎嘎嘎：嘎嘎？", "    咕咕！？ 嘎嘎嘎嘎咕：嘎嘎嘎？嘎嘎", "咕：嘎嘎嘎嘎咕？"].join("\n"),
  );
  assert.equal(run(ifSrc), intToBits(3n, 64));
});

test("字段按声明顺序初始化，可读取更早的字段", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎嘎嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？嘎",
      "    咕咕！？ 嘎咕嘎嘎嘎：咕？ 嘎嘎嘎嘎嘎嘎 咕咕咕咕咕 嘎嘎嘎？嘎",
    ].join("\n"),
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎嘎嘎？",
      "咕：嘎嘎嘎嘎咕？ 咕咕咕咕咕",
      "咕：嘎嘎嘎嘎咕？ 嘎咕嘎嘎嘎",
    ].join("\n"),
  );
  assert.equal(run(src), intToBits(1n, 64) + intToBits(2n, 64));
});

test("字段初始化时读取更晚的字段 -> E4003", () => {
  const src = program(
    [
      "咕咕！ 嘎咕咕",
      "    咕咕！？ 嘎咕嘎嘎嘎：嘎嘎嘎嘎嘎嘎 咕咕咕咕咕",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
    ].join("\n"),
    "咕嘎！？ 咕嘎嘎！ 嘎咕咕？",
  );
  assert.equal(codeOf(src), CODE.UnknownField);
});

test("继承链上的字段自祖先到子类初始化", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？嘎",
      "",
      "咕咕！ 嘎咕嘎嘎咕：嘎咕嘎？",
      "    咕咕！？ 嘎咕嘎嘎嘎：咕？ 嘎嘎嘎嘎嘎嘎 咕咕咕咕咕 嘎嘎嘎？嘎",
    ].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎嘎咕？", "咕：嘎嘎嘎嘎咕？ 嘎咕嘎嘎嘎"].join("\n"),
  );
  assert.equal(run(src), intToBits(2n, 64));
});

test("构造器在字段初始化之后调用，能看到已初始化的字段", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
      "    咕咕嘎！ 嘎咕嘎：嘎嘎嘎咕嘎",
      "        咕：嘎嘎嘎嘎嘎嘎 咕咕咕咕咕",
      "        咕咕！？ 咕咕咕咕咕：嘎嘎嘎咕嘎？",
    ].join("\n"),
    "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？：嘎嘎嘎？嘎嘎嘎",
  );
  assert.equal(run(src), intToBits(0n, 64));
});

test("构造调用错误（E4007）", () => {
  const noCtor = program(
    "咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
    "咕嘎！？ 咕嘎嘎！ 嘎咕嘎？：嘎嘎嘎？咕",
  );
  assert.equal(codeOf(noCtor), CODE.BadCtor);

  const wrongArity = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
      "    咕咕嘎！ 嘎咕嘎：嘎嘎嘎咕嘎",
      "        咕咕！？ 咕咕咕咕咕：嘎嘎嘎咕嘎？",
    ].join("\n"),
    "咕嘎！？ 咕嘎嘎！ 嘎咕嘎？",
  );
  assert.equal(codeOf(wrongArity), CODE.BadCtor);
});

test("继承覆写：动态派发与继承方法", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕嘎！ 咕嘎咕嘎咕",
      "        嘎嘎：嘎嘎嘎？嘎",
      "    咕咕嘎！ 咕嘎咕嘎嘎",
      "        嘎嘎：嘎嘎嘎？嘎嘎嘎",
      "",
      "咕咕！ 嘎咕嘎嘎咕：嘎咕嘎？",
      "    咕咕嘎！ 咕嘎咕嘎咕",
      "        嘎嘎：嘎嘎嘎？嘎咕",
    ].join("\n"),
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎嘎咕？",
      "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！",
      "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎嘎！",
    ].join("\n"),
  );
  assert.equal(run(src), intToBits(2n, 64) + intToBits(7n, 64));
});

test("查找顺序：参数先于字段", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？嘎",
      "    咕咕嘎！ 咕嘎咕嘎咕：咕咕咕咕咕",
      "        嘎嘎：咕咕咕咕咕？",
    ].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！：嘎嘎嘎？嘎嘎嘎"].join("\n"),
  );
  assert.equal(run(src), intToBits(7n, 64));
});

test("Bind：局部优先，其次字段，否则新建局部", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？嘎",
      "    咕咕嘎！ 咕嘎咕嘎咕",
      "        咕咕！？ 咕咕咕咕咕：嘎嘎嘎？嘎嘎",
      "        咕咕！？ 嘎嘎嘎嘎咕：嘎嘎嘎？嘎嘎嘎",
      "        嘎嘎：咕？ 咕咕咕咕咕？ 嘎嘎嘎嘎咕？",
    ].join("\n"),
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！",
      "咕：嘎嘎嘎嘎咕？ 咕咕咕咕咕",
    ].join("\n"),
  );
  assert.equal(run(src), intToBits(10n, 64) + intToBits(3n, 64));
});

test("绑定目标是成员时写对象字段", () => {
  const src = program(
    "咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕咕！？ 嘎嘎嘎嘎咕？ 咕咕咕咕咕：嘎嘎嘎？嘎嘎嘎",
      "咕：嘎嘎嘎嘎咕？ 咕咕咕咕咕",
    ].join("\n"),
  );
  assert.equal(run(src), intToBits(7n, 64));
});

test("未定义的名字（E4001）", () => {
  assert.equal(codeOf(entry("咕：咕咕咕咕咕？")), CODE.UndefinedName);
  assert.equal(codeOf(entry("咕：嘎嘎嘎嘎咕？")), CODE.UndefinedName);
});

test("未定义的方法（E4002）", () => {
  const base = "咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕";
  const missing = program(
    base,
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕嘎！？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎嘎！"].join("\n"),
  );
  assert.equal(codeOf(missing), CODE.UndefinedMethod);

  const arity = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
      "    咕咕嘎！ 咕嘎咕嘎咕：嘎嘎嘎咕嘎",
      "        嘎嘎：嘎嘎嘎咕嘎？",
    ].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕嘎！？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！"].join("\n"),
  );
  assert.equal(codeOf(arity), CODE.UndefinedMethod);
});

test("字段不存在（E4003）：读与写", () => {
  const base = "咕咕！ 嘎咕嘎\n    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕";
  const read = program(
    base,
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕：嘎嘎嘎嘎咕？ 嘎咕嘎嘎嘎"].join("\n"),
  );
  assert.equal(codeOf(read), CODE.UnknownField);

  const write = program(
    base,
    [
      "咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？",
      "咕咕！？ 嘎嘎嘎嘎咕？ 嘎咕嘎嘎嘎：嘎嘎嘎？嘎",
    ].join("\n"),
  );
  assert.equal(codeOf(write), CODE.UnknownField);
});

test("接收者不是对象（E4012）：字段与方法", () => {
  assert.equal(codeOf(entry("咕：嘎嘎嘎？咕 咕咕咕咕咕")), CODE.BadReceiver);
  assert.equal(codeOf(entry("咕嘎！？ 嘎嘎嘎？咕 咕嘎咕嘎咕！")), CODE.BadReceiver);
});

test("循环：每轮重求条件，return 带值返回", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
      "    咕咕嘎！ 咕嘎咕嘎咕",
      "        嘎嘎嘎嘎嘎：咕嘎嘎？ 咕咕咕咕咕？ 嘎嘎嘎？嘎嘎",
      "            咕：嘎嘎嘎嘎？嘎",
      "            咕咕！？ 咕咕咕咕咕：咕？ 咕咕咕咕咕？ 嘎嘎嘎？嘎",
      "        嘎嘎：咕咕咕咕咕？",
    ].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！"].join("\n"),
  );
  assert.equal(run(src), "嘎嘎嘎" + intToBits(3n, 64));
});

test("方法没有 返回 时返回空", () => {
  const src = program(
    [
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
      "    咕咕嘎！ 咕嘎咕嘎咕",
      "        咕：嘎嘎嘎嘎？嘎",
    ].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕：嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！"].join("\n"),
  );
  const result = runCapture(src);
  assert.equal(result.out, "嘎");
  assert.ok(result.error instanceof GgError);
  assert.equal(codeOf(src), CODE.NotOutputable);
});

test("入口块里的 返回 结束程序", () => {
  const src = entry(["咕：嘎嘎嘎嘎？嘎", "嘎嘎：嘎嘎嘎？咕", "咕：嘎嘎嘎嘎？咕"].join("\n"));
  assert.equal(run(src), "嘎");
});

test("步数超限（E4010）", () => {
  const src = entry(["嘎嘎嘎嘎嘎：嘎嘎？", "    咕嘎！？ 嘎嘎嘎？咕"].join("\n"));
  assert.equal(codeOf(src, { maxSteps: 20 }), CODE.StepLimit);
  assert.equal(codeOf(src, { maxSteps: 1 }), CODE.StepLimit);
});

test("调用深度超限（E4011）", () => {
  const src = program(
    ["咕咕！ 嘎咕嘎", "    咕咕嘎！ 咕嘎咕嘎咕", "        嘎嘎：嘎嘎嘎嘎嘎嘎 咕嘎咕嘎咕！"].join("\n"),
    ["咕咕！？ 嘎嘎嘎嘎咕：咕嘎嘎！ 嘎咕嘎？", "咕嘎！？ 嘎嘎嘎嘎咕？ 咕嘎咕嘎咕！"].join("\n"),
  );
  assert.equal(codeOf(src), CODE.DepthLimit);
});

test("入口块是静态上下文：自己 -> E4008", () => {
  assert.equal(codeOf(entry("咕：嘎嘎嘎嘎嘎嘎")), CODE.StaticThis);
});

test("读入：按 UTF-8 字节读，EOF 是空", () => {
  const one = entry("咕：嘎嘎嘎嘎嘎嘎嘎");
  assert.equal(run(one, { stdin: "A" }), intToBits(65n, 64));
  assert.equal(run(one, { stdin: "中" }), intToBits(228n, 64));
  assert.equal(codeOf(one, { stdin: "" }), CODE.NotOutputable);
  const two = entry(["咕：嘎嘎嘎嘎嘎嘎嘎", "咕：嘎嘎嘎嘎嘎嘎嘎"].join("\n"));
  assert.equal(codeOf(two, { stdin: "A" }), CODE.NotOutputable);
});

test("出错之前已写出的位保留（流式输出）", () => {
  const result = runCapture(
    entry(["咕：嘎嘎嘎嘎？嘎", "咕：咕咕咕？ 嘎嘎嘎？嘎 嘎嘎嘎？咕"].join("\n")),
  );
  assert.equal(result.out, "嘎");
  const error = result.error;
  if (!(error instanceof GgError)) assert.fail("预期抛出 GgError");
  assert.equal(error.code, CODE.DivideByZero);
  if (error.pos === null) assert.fail("运行时错误应带位置");
  assert.equal(error.pos.line, 3);
});
