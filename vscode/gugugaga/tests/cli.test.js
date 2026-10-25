/**
 * src/cli.js 的测试（node --test，离线、零依赖、不 require vscode）。
 * 诊断样本按 SPEC.md §12 手搓 GGDIAG v1 位流帧：真 CLI 的输出正由 t8-shell
 * 改成位流，所以这里不抓真输出，只钉住解码契约。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { resolveCommand, parseDiagnostics, runCheck } = require("../src/cli.js");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const BIN_GG = path.join(REPO_ROOT, "bin", "gg.ts");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "gugugaga-cli-"));

/** 第 2 行第 7 列是非法字符「噶」——真实 CLI 会给 E1001 */
const BAD_SOURCE = "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：噶\n";
const OK_SOURCE = "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：嘎嘎？\n";

/** 按 SPEC.md §12 手搓一帧：咕=0、嘎=1，每字段 MSB 在前，帧尾 110 */
function frameBits(value, width) {
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) out += (value >> i) & 1 ? "嘎" : "咕";
  return out;
}

function frame(code, line, column, message) {
  const bytes = Buffer.from(message, "utf8");
  return (
    "嘎咕嘎咕" +
    "咕咕" +
    frameBits(code, 8) +
    frameBits(line, 16) +
    frameBits(column, 16) +
    frameBits(bytes.length, 16) +
    Array.from(bytes)
      .map(function (byte) {
        return frameBits(byte, 8);
      })
      .join("") +
    "嘎嘎咕"
  );
}

function writeTemp(name, content) {
  const file = path.join(TMP, name);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

/**
 * 把 process.env.PATH 换成一个只含给定命令名的临时目录，跑完立刻恢复。
 * PATH 回退的顺序断言必须靠它：不能依赖本机碰巧装了哪个 gggg。
 */
function withPath(names, fn) {
  const dir = fs.mkdtempSync(path.join(TMP, "path-"));
  for (const name of names) {
    fs.writeFileSync(path.join(dir, name), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  }
  const saved = process.env.PATH;
  process.env.PATH = dir;
  try {
    return fn();
  } finally {
    process.env.PATH = saved;
  }
}

test("resolveCommand：cliPath 指向 .ts 时交给 node，路径插到参数最前（source=setting）", function () {
  const cli = writeTemp("local-cli.ts", "// 假解释器\n");
  const resolved = resolveCommand({
    config: { cliPath: cli, nodePath: "/opt/fake/bin/node" },
    workspaceRoot: null,
    file: "/tmp/程序.咕咕",
  });
  assert.equal(resolved.source, "setting");
  assert.equal(resolved.exec, "/opt/fake/bin/node");
  assert.deepEqual(resolved.args, [cli, "嘎嘎", "/tmp/程序.咕咕"]);
});

test("resolveCommand：cliPath 指向非 .ts 的可执行文件时直接执行（source=setting）", function () {
  const cli = writeTemp("local-gggg", "#!/bin/sh\nexit 0\n");
  const resolved = resolveCommand({
    config: { cliPath: cli, nodePath: "node" },
    workspaceRoot: null,
    file: "a.咕咕",
  });
  assert.equal(resolved.source, "setting");
  assert.equal(resolved.exec, cli);
  assert.deepEqual(resolved.args, ["嘎嘎", "a.咕咕"]);
});

test("resolveCommand：cliPath 是相对路径时按 workspaceRoot 解析", function () {
  const project = path.join(TMP, "proj");
  fs.mkdirSync(path.join(project, "tools"), { recursive: true });
  const cli = path.join(project, "tools", "gg.ts");
  fs.writeFileSync(cli, "// 假解释器\n", "utf8");
  const resolved = resolveCommand({
    config: { cliPath: "./tools/gg.ts", nodePath: "node" },
    workspaceRoot: project,
    file: "x.咕咕",
  });
  assert.equal(resolved.source, "setting");
  assert.equal(resolved.exec, "node");
  assert.deepEqual(resolved.args, [cli, "嘎嘎", "x.咕咕"]);
});

test("resolveCommand：设置不可用时回退到工作区里的 bin/gg.ts（source=repo）", function () {
  const workspace = path.join(TMP, "repo-ws");
  fs.mkdirSync(path.join(workspace, "bin"), { recursive: true });
  const repoBin = path.join(workspace, "bin", "gg.ts");
  fs.writeFileSync(repoBin, "// 假解释器\n", "utf8");
  const resolved = resolveCommand({
    config: { cliPath: "咕咕嘎嘎", nodePath: "node" },
    workspaceRoot: workspace,
    file: "/tmp/y.咕咕",
  });
  assert.equal(resolved.source, "repo");
  assert.equal(resolved.exec, "node");
  assert.deepEqual(resolved.args, [repoBin, "嘎嘎", "/tmp/y.咕咕"]);
});

test("resolveCommand：PATH 回退按 咕咕嘎嘎 → gggg → gg 顺序取第一个存在的", function () {
  const workspace = path.join(TMP, "empty-ws");
  fs.mkdirSync(workspace, { recursive: true });
  const pick = function (names) {
    return withPath(names, function () {
      return resolveCommand({
        config: { cliPath: "咕咕嘎嘎", nodePath: "node" },
        workspaceRoot: workspace,
        file: "z.咕咕",
      });
    });
  };

  const onlyLatin = pick(["gg", "gggg"]);
  assert.equal(onlyLatin.source, "path");
  assert.equal(onlyLatin.exec, "gggg");
  assert.deepEqual(onlyLatin.args, ["嘎嘎", "z.咕咕"]);

  const allThree = pick(["gg", "gggg", "咕咕嘎嘎"]);
  assert.equal(allThree.exec, "咕咕嘎嘎");

  const onlyShort = pick(["gg"]);
  assert.equal(onlyShort.exec, "gg");

  // 一个都没装：仍报默认名，让 spawn 的失败暴露出来
  const none = pick([]);
  assert.equal(none.source, "path");
  assert.equal(none.exec, "咕咕嘎嘎");
});

test("resolveCommand：设置里的路径不存在时回退到 PATH", function () {
  const resolved = withPath([], function () {
    return resolveCommand({
      config: { cliPath: path.join(TMP, "根本没有这个文件") },
      workspaceRoot: path.join(TMP, "empty-ws"),
      file: "z.咕咕",
    });
  });
  assert.equal(resolved.source, "path");
  assert.equal(resolved.exec, "咕咕嘎嘎");
});

test("resolveCommand：旧的拉丁默认值 gggg 仍按命令名处理，不会被当路径", function () {
  const workspace = path.join(TMP, "empty-ws");
  fs.mkdirSync(workspace, { recursive: true });
  const resolved = withPath(["咕咕嘎嘎"], function () {
    return resolveCommand({
      config: { cliPath: "gggg", nodePath: "node" },
      workspaceRoot: workspace,
      file: "z.咕咕",
    });
  });
  assert.equal(resolved.source, "path");
  assert.equal(resolved.exec, "咕咕嘎嘎");
  assert.deepEqual(resolved.args, ["嘎嘎", "z.咕咕"]);
});

test("parseDiagnostics：转发到帧解码器，E1001 的 2:7 原样还原", function () {
  const output = frame(1, 2, 7, "非法字符“噶”（U+5676）");
  const issues = parseDiagnostics(output, "/tmp/坏1.咕咕");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].line, 2);
  assert.equal(issues[0].column, 7);
  assert.equal(issues[0].code, "E1001");
  assert.equal(issues[0].detail, "非法字符“噶”（U+5676）");
  // 面板只看 message：必须是整帧原始位串（纯咕嘎），可被 ggt decode --diag 还原
  assert.match(issues[0].message, /^[咕嘎]+$/);
  assert.equal(issues[0].message, output.trim());
  // 帧里没有源码行，旧的两行格式字段一律不再出现
  assert.deepEqual(Object.keys(issues[0]).sort(), ["code", "column", "detail", "line", "message"]);
});

test("parseDiagnostics：旧的中文两行格式已不再是输入（解不出任何东西）", function () {
  const legacy = "/tmp/坏1.咕咕:2:7: E1001 非法字符“噶”（U+5676）\n      咕：【噶】\n";
  assert.deepEqual(parseDiagnostics(legacy, "/tmp/坏1.咕咕"), []);
  assert.deepEqual(parseDiagnostics("无法读取文件 \n", "/tmp/x.咕咕"), []);
  assert.deepEqual(parseDiagnostics("", "/tmp/x.咕咕"), []);
});

test("parseDiagnostics：多帧逐条解码，帧间空白不影响", function () {
  const output = frame(2, 1, 1, "缩进错误") + "\n " + frame(4, 3, 5, "语法错误") + "\n\n   \n";
  const issues = parseDiagnostics(output, "/tmp/坏.咕咕");
  assert.equal(issues.length, 2);
  assert.equal(issues[0].code, "E1002");
  assert.equal(issues[0].line, 1);
  assert.equal(issues[1].code, "E2001");
  assert.equal(issues[1].line, 3);
  assert.equal(issues[1].column, 5);
});

test("parseDiagnostics：外壳码（用法 / 帮助 / 读文件 / 内部）不进诊断", function () {
  const output = frame(0, 0, 0, "用法") + frame(22, 0, 0, "帮助全文") + frame(23, 0, 0, "ENOENT") + frame(24, 0, 0, "崩了");
  assert.deepEqual(parseDiagnostics(output, "/tmp/x.咕咕"), []);
});

// 下面两条是真 e2e：spawn node bin/gg.ts，参数里的动作词是 SPEC §8 的规范写法 嘎嘎。
// 抓回来的 stderr 一律喂给 diagnostics.js 的解码器（这里不手搓帧解析）。
test("面板位串可回解：把 issues[0].message 交给 translator 的 ggt decode --diag，还原成人话", async function () {
  const bad = writeTemp("roundtrip.咕咕", BAD_SOURCE);
  const result = await runCheck({
    exec: process.execPath,
    args: [BIN_GG, "嘎嘎", bad],
    timeoutMs: 60000,
  });
  const issues = parseDiagnostics(result.stderr, bad);
  assert.equal(issues.length, 1);
  const ggt = path.join(REPO_ROOT, "translator", "bin", "ggt.ts");
  const decoded = execFileSync(process.execPath, [ggt, "decode", "--diag"], {
    input: issues[0].message,
    encoding: "utf8",
  });
  assert.match(decoded, /E1001/);
  assert.match(decoded, /2:7/);
  assert.match(decoded, /非法字符“噶”（U\+5676）/);
});

test("runCheck：真实跑 node bin/gg.ts 嘎嘎 坏文件 → 退出码 2、stderr 只有咕嘎、解出 E1001 2:7", async function () {
  const bad = writeTemp("bad.咕咕", BAD_SOURCE);
  const result = await runCheck({
    exec: process.execPath,
    args: [BIN_GG, "嘎嘎", bad],
    timeoutMs: 60000,
  });
  assert.equal(result.code, 2);
  assert.equal(result.timedOut, false);
  assert.equal(result.error, null);
  // stderr 里只允许咕/嘎（外加帧间空白），人话一个字符都不许漏
  assert.match(result.stderr, /^[咕嘎\s]+$/);
  const issues = parseDiagnostics(result.stderr, bad);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "E1001");
  assert.equal(issues[0].line, 2);
  assert.equal(issues[0].column, 7);
  // 面板拿到的是纯咕嘎的整帧位串；中文只在 detail（进控制台）
  assert.match(issues[0].message, /^[咕嘎]+$/);
  assert.equal(issues[0].detail, "非法字符“噶”（U+5676）");
});

test("runCheck：真实跑 node bin/gg.ts 嘎嘎 合法文件 → 退出码 0、stderr 为空", async function () {
  const ok = writeTemp("ok.咕咕", OK_SOURCE);
  const result = await runCheck({
    exec: process.execPath,
    args: [BIN_GG, "嘎嘎", ok],
    timeoutMs: 60000,
  });
  assert.equal(result.code, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.error, null);
  assert.equal(result.stderr, "");
  assert.deepEqual(parseDiagnostics(result.stderr, ok), []);
});

test("runCheck：超时返回 { code: null, timedOut: true } 而不抛", async function () {
  const result = await runCheck({
    exec: process.execPath,
    args: ["-e", "setTimeout(function () {}, 5000)"],
    timeoutMs: 200,
  });
  assert.equal(result.code, null);
  assert.equal(result.timedOut, true);
  // 原因串只许 咕/嘎/！/？/：/空格 和毫秒数（数字是数据，不是散文）
  assert.match(result.error, /^[咕嘎！？： 0-9]+$/);
  assert.ok(result.error.length > 0);
});

test("runCheck：命令不存在时返回 error 而不抛", async function () {
  const result = await runCheck({
    exec: path.join(TMP, "no-such-cli-here"),
    args: ["check"],
    timeoutMs: 5000,
  });
  assert.equal(result.code, null);
  assert.equal(result.timedOut, false);
  assert.ok(result.error.length > 0);
  assert.ok(result.error.indexOf("咕咕嘎嘎！") === 0, "原因串应以纯咕嘎前缀开头：" + result.error);
});

test("runCheck：数字退出码原样透传，stderr 不加工", async function () {
  const result = await runCheck({
    exec: process.execPath,
    args: ["-e", 'process.stderr.write("咕嘎"); process.exit(2);'],
    timeoutMs: 10000,
  });
  assert.equal(result.code, 2);
  assert.equal(result.timedOut, false);
  assert.equal(result.error, null);
  assert.equal(result.stderr, "咕嘎");
});
