/**
 * CLI 外壳的行为测试（SPEC.md §8 / §12）。
 *
 * 断言只针对两条流：stdout 是程序位流，stderr 是 GGDIAG 帧。
 * 帧用 tests/ggdiag.ts 里的独立解码器还原，于是「屏幕上只剩 咕/嘎」这件事
 * 是被字节层面证明的，而不是靠匹配人话。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseStepBits, stripShebang } from "../src/cli.ts";
import { decodeOne } from "./ggdiag.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "gg.ts");
const HELLO = path.join(ROOT, "examples", "咕嘎咕嘎.咕咕");
const SHEBANG_DEMO = path.join(ROOT, "demos", "咕咕咕嘎.咕咕");

/** stderr 允许的全部字符：咕、嘎、换行、空格（SPEC.md §12.1）。 */
const DIAG_CHARSET = /^[咕嘎\n ]*$/;
/** stdout 允许的全部字符：只有程序位流。 */
const BIT_CHARSET = /^[咕嘎]*$/;

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function gg(args: string[], stdin?: string): Run {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    input: stdin,
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

/** stderr 只含 咕/嘎/换行/空格——这是整机「对外可见面」的硬约束。 */
function assertDiagPure(stderr: string): void {
  assert.match(stderr, DIAG_CHARSET, "stderr 只能出现 咕/嘎/换行/空格，实际=" + JSON.stringify(stderr));
}

/** 解出唯一一帧，并顺手断言字符集纯净。 */
function frame(run: Run) {
  assertDiagPure(run.stderr);
  return decodeOne(run.stderr);
}

function tempFile(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-cli-"));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

const isBits = (s: string): boolean => s.length > 0 && [...s].every((ch) => ch === "咕" || ch === "嘎");

/** 一份词法错误的程序：第 2 行的「噶」不是本语言的字符。 */
const LEX_BAD = "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：噶\n";

test("省略动作词 = 嘎 = run：三条路径同一位流，stderr 为空", () => {
  const implicit = gg([HELLO]);
  assert.equal(implicit.status, 0);
  assert.equal(implicit.stdout.length, 24);
  assert.ok(isBits(implicit.stdout));
  assert.equal(implicit.stderr, "");

  for (const args of [["嘎", HELLO], ["run", HELLO]]) {
    const explicit = gg(args);
    assert.equal(explicit.status, 0, args[0] + " 应成功");
    assert.equal(explicit.stdout, implicit.stdout, args[0] + " 的位流应与省略动作词一致");
    assert.equal(explicit.stderr, "");
  }
});

test("省略动作词也接受 --max-steps（前/后均可）；超限报 19 号帧（E4010）", () => {
  assert.equal(gg([HELLO, "--max-steps", "100"]).status, 0);
  assert.equal(gg(["--max-steps", "100", HELLO]).status, 0);

  const limited = gg([HELLO, "--max-steps", "1"]);
  assert.equal(limited.status, 1);
  const f = frame(limited);
  assert.equal(f.code, 19, "步数超限应是 E4010 → code 19");
  assert.ok(f.message.length > 0, "帧正文不应为空");
  assert.ok(!f.message.includes("E4010"), "正文是人话，不再夹 E 码");
});

test("嘎嘎嘎嘎 <咕嘎位串>：位串按二进制读，不够步长则 19 号帧，够则成功", () => {
  const tooFew = gg(["嘎嘎嘎嘎", "嘎", HELLO]); // 1 步
  assert.equal(tooFew.status, 1);
  assert.equal(frame(tooFew).code, 19);

  const enough = gg(["嘎嘎嘎嘎", "嘎".repeat(20), HELLO]); // 1048575 步
  assert.equal(enough.status, 0);
  assert.equal(enough.stderr, "");
  assert.equal(enough.stdout.length, 24);

  // 位数不同就一定是不同数值（MSB 在前，不是十进制）
  assert.equal(gg(["嘎嘎嘎嘎", "嘎咕", HELLO]).status, 1); // 2 步
  assert.equal(gg(["嘎嘎嘎嘎", "咕" + "嘎".repeat(20), HELLO]).status, 0); // 前导 0 不改变数值
});

test("嘎嘎嘎嘎 的非法位串（空 / 为 0 / 含其它字符 / 缺参数）→ 0 号用法帧", () => {
  const bads: string[][] = [
    ["嘎嘎嘎嘎"],
    ["嘎嘎嘎嘎", ""],
    ["嘎嘎嘎嘎", "咕"],
    ["嘎嘎嘎嘎", "咕咕咕"],
    ["嘎嘎嘎嘎", "10"],
    ["嘎嘎嘎嘎", "嘎咕X"],
    ["嘎嘎嘎嘎", "噶"],
  ];
  for (const args of bads) {
    const res = gg(args.concat([HELLO]));
    assert.equal(res.status, 3, JSON.stringify(args) + " 应报用法错误");
    const f = frame(res);
    assert.equal(f.code, 0, JSON.stringify(args) + " 应是 0 号用法帧");
    assert.ok(f.message.startsWith("用法错误："), "用法帧正文应带前缀，实际=" + f.message);
  }
});

test("嘎嘎 / check 成功完全静默；词法错报 1 号帧（E1001）", () => {
  for (const verb of ["check", "嘎嘎"]) {
    const ok = gg([verb, HELLO]);
    assert.equal(ok.status, 0);
    assert.equal(ok.stdout, "", verb + " 不应有 stdout");
    assert.equal(ok.stderr, "");
  }

  const bad = gg(["嘎嘎", tempFile("坏.咕咕", LEX_BAD)]);
  assert.equal(bad.status, 2);
  const f = frame(bad);
  assert.equal(f.code, 1, "非法字符应是 E1001 → code 1");
  assert.equal(f.line, 2, "帧里应带 1 基行号");
  assert.ok(f.col > 0, "帧里应带 1 基列号");
  assert.ok(f.message.includes("非法字符"), "正文应是原来的诊断文案：" + f.message);
});

test("未知子命令 / 无参数 → 0 号用法帧，退出码 3", () => {
  const unknown = gg(["ruuun", HELLO]);
  assert.equal(unknown.status, 3);
  const unknownFrame = frame(unknown);
  assert.equal(unknownFrame.code, 0);
  assert.ok(unknownFrame.message.includes("未知子命令"), "实际=" + unknownFrame.message);

  const none = gg([]);
  assert.equal(none.status, 3);
  const noneFrame = frame(none);
  assert.equal(noneFrame.code, 0);
  assert.ok(noneFrame.message.includes("用法错误"), "实际=" + noneFrame.message);
});

test("读不到文件 → 23 号帧（正文含文件名与宿主原因），退出码 3", () => {
  const missing = path.join(ROOT, "不存在.咕咕");
  for (const args of [[missing], ["嘎", missing], ["嘎嘎", missing]]) {
    const res = gg(args);
    assert.equal(res.status, 3, JSON.stringify(args) + " 应退出 3");
    assert.equal(res.stdout, "", "读文件失败不应有 stdout");
    const f = frame(res);
    assert.equal(f.code, 23);
    assert.equal(f.line, 0, "读文件失败没有源码位置");
    assert.ok(f.message.includes("无法读取文件"), "实际=" + f.message);
    assert.ok(f.message.includes("不存在.咕咕"), "正文应含文件名：" + f.message);
    assert.ok(f.message.includes("ENOENT"), "正文应含宿主原因：" + f.message);
  }
});

test("嘎嘎嘎 / --help / -h → 22 号帧（正文是用法全文），stdout 为空", () => {
  for (const args of [["嘎嘎嘎"], ["--help"], ["-h"]]) {
    const res = gg(args);
    assert.equal(res.status, 0, JSON.stringify(args) + " 应退出 0");
    assert.equal(res.stdout, "", "帮助只走 stderr 的帧");
    const f = frame(res);
    assert.equal(f.code, 22);
    assert.equal(f.line, 0);
    assert.ok(f.message.startsWith("用法："), "前两行应是用法，实际=" + f.message.split("\n")[0]);
    assert.ok(f.message.includes("gggg"), "应提到命令 gggg");
    assert.ok(f.message.includes("ggt"), "应提到译码器 ggt");
    assert.ok(f.message.includes("咕咕嘎嘎 <文件>.咕咕"), "应写出纯咕嘎的 run 形式");
    assert.ok(f.message.includes("退出码：0"), "应说明退出码语义");
  }
});

test("首行 shebang 被跳过，错误帧的行号保持不变", () => {
  const withShebang = tempFile("脚本.咕咕", "#!/usr/bin/env gggg\n" + fs.readFileSync(HELLO, "utf8"));
  const ok = gg([withShebang]);
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout.length, 24);

  const broken = tempFile("坏脚本.咕咕", "#!/usr/bin/env gggg\n" + LEX_BAD);
  const err = gg([broken]);
  assert.equal(err.status, 2);
  const f = frame(err);
  assert.equal(f.code, 1);
  assert.equal(f.line, 3, "shebang 换成空行，行号应仍指向第 3 行：" + JSON.stringify(f));
});

test("shebang 只在首行有效：第二行的 #! 仍是非法字符", () => {
  const bad = tempFile("中段.咕咕", "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n#!/usr/bin/env gggg\n    咕：嘎嘎嘎？咕\n");
  const res = gg([bad]);
  assert.equal(res.status, 2);
  const f = frame(res);
  assert.equal(f.code, 1);
  assert.equal(f.line, 2, "应先撞上第 2 行的 #");
  assert.ok(f.message.includes("#"), "非法字符的正文应点到 #：" + f.message);
});

test("demos/咕咕咕嘎.咕咕 是可直接执行的脚本样例", () => {
  const raw = fs.readFileSync(SHEBANG_DEMO, "utf8");
  assert.ok(raw.startsWith("#!"), "首行应是 shebang");
  const res = gg([SHEBANG_DEMO]);
  assert.equal(res.status, 0);
  assert.equal(res.stdout.length, 24);
  assert.equal(res.stderr, "");
});

test("退出码语义不变：0 成功 / 1 运行时 / 2 静态 / 3 用法", () => {
  assert.equal(gg(["嘎", HELLO]).status, 0);
  assert.equal(gg(["嘎", HELLO, "--max-steps", "1"]).status, 1);
  assert.equal(gg(["嘎嘎", tempFile("词法.咕咕", LEX_BAD)]).status, 2);
  assert.equal(gg(["嘎", path.join(ROOT, "无.咕咕")]).status, 3);
});

test("所有失败路径的 stderr 都只有 咕/嘎/换行/空格，stdout 不被诊断污染", () => {
  const bad = tempFile("词法.咕咕", LEX_BAD);
  const silent = tempFile("空.咕咕", "咕：嘎嘎嘎？咕\n"); // 缺入口，静态错
  for (const args of [
    [],
    ["ruuun"],
    ["--help"],
    ["嘎嘎嘎嘎", "咕"],
    ["嘎", path.join(ROOT, "无.咕咕")],
    ["嘎", bad],
    ["嘎嘎", silent],
    ["嘎", HELLO, "--max-steps", "1"],
    ["嘎", HELLO, "--max-steps", "abc"],
  ]) {
    const res = gg(args);
    assertDiagPure(res.stderr);
    assert.match(res.stdout, BIT_CHARSET, "stdout 只能是位流：" + JSON.stringify(res.stdout));
  }
});

test("帧以单个换行结尾：去掉尾随换行后不含任何非 咕/嘎 字符", () => {
  const res = gg(["--help"]);
  assert.ok(res.stderr.endsWith("\n"), "每帧后允许一个换行");
  const body = res.stderr.replace(/\n$/, "");
  assert.match(body, /^[咕嘎]+$/);
  assert.equal(decodeOne(body).code, 22);
});

test("parseStepBits：咕=0 嘎=1，MSB 在前，0 / 非法 / 溢出各有明确结果", () => {
  assert.equal(parseStepBits("嘎"), 1);
  assert.equal(parseStepBits("嘎咕"), 2);
  assert.equal(parseStepBits("咕嘎"), 1, "前导 0 不改变数值");
  assert.equal(parseStepBits("嘎嘎"), 3);
  assert.equal(parseStepBits("咕咕嘎嘎嘎"), 7);
  assert.equal(parseStepBits("嘎咕咕咕咕咕咕咕咕咕咕"), 1024);
  assert.equal(parseStepBits("咕"), null, "0 不是合法的上限");
  assert.equal(parseStepBits("咕咕咕"), null, "0 不是合法的上限");
  assert.equal(parseStepBits(""), null, "空串不是位串");
  assert.equal(parseStepBits("10"), null, "十进制写法不是位串");
  assert.equal(parseStepBits("嘎 嘎"), null, "空格不进位串");
  assert.equal(parseStepBits("嘎".repeat(60)), Number.MAX_SAFE_INTEGER, "超长位串钳到安全整数上界");
});

test("stripShebang：换成空行以保住行号，非首行不动", () => {
  assert.equal(stripShebang("#!x\nA\n"), "\nA\n");
  assert.equal(stripShebang("#!only"), "\n");
  assert.equal(stripShebang("A\n#!x\n"), "A\n#!x\n");
  assert.equal(stripShebang("咕：嘎嘎嘎？咕\n"), "咕：嘎嘎嘎？咕\n");
});

test("后缀识别大小写不敏感：.GU / .gugugaga / .ググ 都按程序路径隐式执行（读不到 → 23 号帧）", () => {
  const names = ["不存在.GU", "不存在.Gu", "不存在.gu", "不存在.GUGUGAGA", "不存在.ググ", "不存在.咕咕"];
  for (const name of names) {
    const res = gg([path.join(ROOT, name)]);
    assert.equal(res.status, 3, name + " 应走到读文件失败（说明被当成程序）");
    const f = frame(res);
    assert.equal(f.code, 23, name + " 应被识别为程序路径，实际帧=" + JSON.stringify(f));
    assert.ok(f.message.includes("无法读取文件"), "实际=" + f.message);
  }
  const usage = gg([path.join(ROOT, "不存在.txt")]);
  assert.equal(usage.status, 3);
  assert.equal(frame(usage).code, 0, "后缀不在表里的首参数应是 0 号用法帧");
});

test("省略动作词也能直接跑方言样例（examples/ガググガグ.ググ）", () => {
  const res = gg([path.join(ROOT, "examples", "ガググガグ.ググ")]);
  assert.equal(res.status, 0, "stderr=" + res.stderr);
  assert.equal(res.stdout.length, 64);
  assert.ok(isBits(res.stdout), "stdout 只应是位流");
  assert.equal(res.stderr, "");
});