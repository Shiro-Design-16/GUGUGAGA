/**
 * src/diagnostics.js 的测试：GGDIAG v1 帧解码 + collect 的取舍。
 *
 * 帧按 SPEC.md §12 手搓（咕=0、嘎=1、字段 MSB 在前、帧尾 110），
 * collect 用假 CLI（node -e 往 stderr 写帧、按需设置退出码）喂样本：
 * 上半部分钉住「帧 → issue」「没有帧 → error」这两条契约，
 * 末尾一条真 e2e 直接 spawn node bin/gg.ts 嘎嘎 坏文件，验证真 CLI 的位流能被解出。
 *
 * 不 require vscode：本文件只跑 Node。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/** 真 e2e 用的仓库根（bin/gg.ts 在这里） */
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const {
  collect,
  parseDiagnostics,
  decodeFrames,
  codeName,
  CODE_NAMES,
} = require("../src/diagnostics.js");

/** 一个不存在的路径就够用：collect 只拿它取 cwd 与对齐 API，不会去读文件 */
const FILE = path.join(os.tmpdir(), "手搓.咕咕");

/** 按位宽写一个无符号整数，MSB 在前 */
function frameBits(value, width) {
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) out += (value >> i) & 1 ? "嘎" : "咕";
  return out;
}

/** 手搓一帧 GGDIAG v1：magic 1010 + version 00 + code + line + column + mlen + 正文 + end 110 */
function frame(code, line, column, message) {
  const bytes = Buffer.from(message, "utf8");
  const body = Array.from(bytes)
    .map(function (byte) {
      return frameBits(byte, 8);
    })
    .join("");
  return (
    "嘎咕嘎咕" +
    "咕咕" +
    frameBits(code, 8) +
    frameBits(line, 16) +
    frameBits(column, 16) +
    frameBits(bytes.length, 16) +
    body +
    "嘎嘎咕"
  );
}

/** 假 CLI：把文本写进 stderr 后以 exitCode 结束（execFile 不经 shell，中文与引号都安全） */
function fakeCli(stderrText, exitCode) {
  const script =
    "process.stderr.write(" +
    JSON.stringify(stderrText) +
    ");process.exit(" +
    String(typeof exitCode === "number" ? exitCode : 0) +
    ");";
  return { exec: process.execPath, args: ["-e", script], source: "setting" };
}

test("帧布局：magic/version/code/line/column/mlen/end 全部可还原", function () {
  const one = frame(1, 2, 7, "非法字符");
  assert.equal(one.length, 65 + 8 * Buffer.byteLength("非法字符", "utf8"));
  const frames = decodeFrames(one);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].code, 1);
  assert.equal(frames[0].line, 2);
  assert.equal(frames[0].column, 7);
  assert.equal(frames[0].message, "非法字符");
});

test("多帧：帧间允许空格与换行，按出现顺序解出", function () {
  const output = "  " + frame(1, 2, 7, "非法字符") + " \n\n " + frame(4, 3, 5, "语法错误") + "\n";
  const frames = decodeFrames(output);
  assert.equal(frames.length, 2);
  assert.deepEqual(
    frames.map(function (item) {
      return [item.code, item.line, item.column, item.message];
    }),
    [
      [1, 2, 7, "非法字符"],
      [4, 3, 5, "语法错误"],
    ]
  );
});

test("垃圾前缀：ASCII / 中文杂音被忽略，空输入解出空数组", function () {
  assert.equal(decodeFrames("ENOENT no such file\n 嘤嘤嘤 " + frame(23, 0, 0, "读不到")).length, 1);
  assert.deepEqual(decodeFrames(""), []);
  assert.deepEqual(decodeFrames("完全不相关的英文与中文"), []);
  assert.deepEqual(decodeFrames("咕咕咕嘎嘎嘎"), []);
});

test("截断：正文没读完或帧尾缺失，该帧作废（不抛、不吐半条）", function () {
  const one = frame(1, 2, 7, "非法字符");
  assert.deepEqual(decodeFrames(one.slice(0, one.length - 5)), []);
  assert.deepEqual(decodeFrames(one.slice(0, 70)), []);
  assert.deepEqual(decodeFrames(one.slice(0, 6)), []);
});

test("帧尾不是 110：废掉这一帧，但继续找后面的真帧", function () {
  const broken = frame(1, 2, 7, "非法字符");
  const badEnd = broken.slice(0, broken.length - 1) + "嘎";
  assert.deepEqual(decodeFrames(badEnd), []);
  assert.equal(decodeFrames(badEnd + frame(4, 3, 5, "语法错误")).length, 1);
});

test("码名映射：1..21 是 E####（没有 E4009），0/22/23/24 是外壳码，其余算内部错误", function () {
  assert.equal(CODE_NAMES.length, 21);
  assert.equal(CODE_NAMES.indexOf("E4009"), -1);
  assert.equal(codeName(1), "E1001");
  assert.equal(codeName(3), "E1003");
  assert.equal(codeName(4), "E2001");
  assert.equal(codeName(21), "E4012");
  assert.equal(codeName(0), "用法错误");
  assert.equal(codeName(22), "帮助");
  assert.equal(codeName(23), "读文件失败");
  assert.equal(codeName(24), "内部错误");
  assert.equal(codeName(99), "内部错误");
  assert.equal(codeName(-1), "内部错误");
});

test("parseDiagnostics：只收 1..21，帮助帧与用法错误帧不算诊断", function () {
  const output = frame(0, 0, 0, "用法") + frame(1, 2, 7, "非法字符") + frame(22, 0, 0, "帮助全文");
  const issues = parseDiagnostics(output, FILE);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "E1001");
  assert.equal(issues[0].detail, "非法字符");
  // 面板字段 message 是整帧原始位串，不是人话
  assert.equal(issues[0].message, frame(1, 2, 7, "非法字符"));
});

test("parseDiagnostics：line/column 为 0 表示无位置，原样保留给扩展层夹取", function () {
  const issues = parseDiagnostics(frame(24, 0, 0, "崩了"), FILE);
  assert.deepEqual(issues, []);
  const zero = parseDiagnostics(frame(19, 0, 0, "步数超限"), FILE);
  assert.equal(zero.length, 1);
  assert.equal(zero[0].line, 0);
  assert.equal(zero[0].column, 0);
  assert.equal(zero[0].code, "E4010");
});

test("collect：假 CLI 吐 E1001 帧，拿到 2:7 的 issue 且 error 为 null", async function () {
  const resolved = fakeCli(frame(1, 2, 7, "非法字符“噶”"), 2);
  const result = await collect({ filePath: FILE, resolved: resolved, timeoutMs: 10000 });
  assert.equal(result.error, null);
  assert.equal(result.issues.length, 1);
  assert.deepEqual(result.issues[0], {
    line: 2,
    column: 7,
    code: "E1001",
    message: frame(1, 2, 7, "非法字符“噶”"),
    detail: "非法字符“噶”",
  });
});

test("collect：合法文件（无帧、退出码 0）就是干净的", async function () {
  const result = await collect({ filePath: FILE, resolved: fakeCli("", 0), timeoutMs: 10000 });
  assert.deepEqual(result, { issues: [], error: null });
});

test("collect：命令不存在时 issues 为空、error 非空，且不抛", async function () {
  const resolved = { exec: path.join(os.tmpdir(), "没有这个命令-咕"), args: ["嘎嘎"], source: "setting" };
  const result = await collect({ filePath: FILE, resolved: resolved, timeoutMs: 5000 });
  assert.deepEqual(result.issues, []);
  assert.equal(typeof result.error, "string");
  assert.ok(result.error.length > 0);
});

test("collect：resolved 为空时给纯咕嘎的原因，不抛", async function () {
  const result = await collect({ filePath: FILE, resolved: null, timeoutMs: 5000 });
  assert.deepEqual(result.issues, []);
  assert.match(result.error, /^[咕嘎！？： ]+$/);
});

test("collect：外壳帧（读文件失败 23）的正文进 error，不伪装成诊断", async function () {
  const resolved = fakeCli(frame(23, 0, 0, "ENOENT no such file"), 3);
  const result = await collect({ filePath: FILE, resolved: resolved, timeoutMs: 10000 });
  assert.deepEqual(result.issues, []);
  assert.ok(result.error.indexOf("读文件失败") >= 0, result.error);
  assert.ok(result.error.indexOf("ENOENT no such file") >= 0, result.error);
});

test("真实 CLI 端到端：node bin/gg.ts 嘎嘎 坏文件 → E1001 2:7（stderr 只有咕嘎）", async function () {
  // 第 2 行第 7 列放一个非咕嘎字符：词法器必报 E1001
  const bad = path.join(os.tmpdir(), "端到端.咕咕");
  fs.writeFileSync(bad, "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：噶\n", "utf8");
  const resolved = {
    exec: process.execPath,
    args: [path.join(REPO_ROOT, "bin", "gg.ts"), "嘎嘎", bad],
    source: "repo",
  };
  const result = await collect({ filePath: bad, resolved: resolved, timeoutMs: 60000 });
  assert.equal(result.error, null);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].code, "E1001");
  assert.equal(result.issues[0].line, 2);
  assert.equal(result.issues[0].column, 7);
  assert.match(result.issues[0].message, /^[咕嘎]+$/);
  assert.equal(result.issues[0].detail, "非法字符“噶”（U+5676）");
});
