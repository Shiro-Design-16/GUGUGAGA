/**
 * 运行按钮（src/run.js）的单元测试。
 * 不 require("vscode")：run.js 的 vscode 由调用方注入，这里传桩对象。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const run = require("../src/run.js");
const cli = require("../src/cli.js");

const EXT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE = path.resolve(EXT_ROOT, "..", "..");
const VISIBLE_ONLY = /^[咕嘎！？： \n]+$/;
const PROGRAM = path.join(WORKSPACE, "examples", "咕嘎咕嘎.咕咕");

/** vscode 桩：只实现 run.js 用到的 createTerminal / terminals */
function fakeVscode(terminals) {
  const created = [];
  const list = terminals || [];
  return {
    created: created,
    window: {
      terminals: list,
      createTerminal: function (options) {
        const terminal = {
          name: options.name,
          cwd: options.cwd,
          exitStatus: undefined,
          shown: [],
          texts: [],
          show: function (preserveFocus) {
            this.shown.push(preserveFocus);
          },
          sendText: function (text, addNewline) {
            this.texts.push([text, addNewline]);
          },
        };
        created.push(terminal);
        list.push(terminal);
        return terminal;
      },
    },
  };
}

/** 一个够真的假文档（脏文档的 save 会把自己变干净） */
function fakeDocument(options) {
  const opts = options || {};
  const document = {
    languageId: opts.languageId === undefined ? "gugugaga" : opts.languageId,
    isDirty: opts.dirty === true,
    fileName: opts.fileName === undefined ? PROGRAM : opts.fileName,
    uri: { scheme: opts.scheme === undefined ? "file" : opts.scheme, fsPath: PROGRAM },
    saved: 0,
    save: function () {
      this.saved += 1;
      if (opts.saveKeepsDirty === true) return Promise.resolve(false);
      this.isDirty = false;
      return Promise.resolve(true);
    },
  };
  return document;
}

test("quoteArg：普通路径原样，空格与 shell 元字符加引号", function () {
  assert.equal(run.quoteArg("examples/咕嘎咕嘎.咕咕"), "examples/咕嘎咕嘎.咕咕");
  assert.equal(run.quoteArg("/tmp/a b/c.咕咕"), '"/tmp/a b/c.咕咕"');
  assert.equal(run.quoteArg("a$b"), '"a\\$b"');
  assert.equal(run.quoteArg('a"b'), '"a\\"b"');
  assert.equal(run.quoteArg("a`b"), '"a\\`b"');
  assert.equal(run.quoteArg(""), '""');
});

test("quoteArg：win32 用双引号包住并把内部引号翻倍", function () {
  assert.equal(run.quoteArg("C:\\a b\\c.咕咕", "win32"), '"C:\\a b\\c.咕咕"');
  assert.equal(run.quoteArg('C:\\a"b', "win32"), '"C:\\a""b"');
  assert.equal(run.quoteArg("plain", "win32"), '"plain"');
});

test("buildCommandLine：exec 在最前，空参数只留 exec", function () {
  assert.equal(run.buildCommandLine("node", ["x.ts", "a b"]), 'node x.ts "a b"');
  assert.equal(run.buildCommandLine("咕咕嘎嘎", []), "咕咕嘎嘎");
  assert.equal(run.buildCommandLine("node", undefined), "node");
});

test("resolveRun：仓库里的 bin/gg.ts，args 只有文件、没有动作词", function () {
  const resolved = run.resolveRun({ workspaceRoot: WORKSPACE, file: PROGRAM, config: {} });
  assert.equal(resolved.source, "repo");
  // repo 回退是 node + 脚本 + 文件：动作词位置必须是空的
  assert.deepEqual(resolved.args, [path.join(WORKSPACE, "bin", "gg.ts"), PROGRAM]);
  assert.equal(resolved.args.indexOf("嘎嘎"), -1);
  assert.equal(resolved.line, "node " + path.join(WORKSPACE, "bin", "gg.ts") + " " + PROGRAM);
});

test("resolveRun：路径含空格时命令行带引号", function () {
  const spaced = path.join(WORKSPACE, "examples", "有 空格的.咕咕");
  const resolved = run.resolveRun({ workspaceRoot: WORKSPACE, file: spaced, config: {} });
  assert.equal(resolved.line.indexOf('"' + spaced + '"') > 0, true);
});

test("resolveRun 与 resolveCommand 的分工：运行无动作词，检查有 嘎嘎", function () {
  const runArgs = run.resolveRun({ workspaceRoot: WORKSPACE, file: PROGRAM, config: {} }).args;
  const checkArgs = cli.resolveCommand({ workspaceRoot: WORKSPACE, file: PROGRAM, config: {} }).args;
  // repo 回退下 check 的 args 是 [bin/gg.ts, 嘎嘎, 文件]，运行的是 [bin/gg.ts, 文件]
  assert.equal(checkArgs[checkArgs.length - 2], "嘎嘎");
  assert.equal(checkArgs[checkArgs.length - 1], PROGRAM);
  assert.equal(runArgs.indexOf("嘎嘎"), -1);
  assert.equal(runArgs[runArgs.length - 1], PROGRAM);
});

test("resolveRun：设置里给的 .ts 路径走 node，参数顺序是 脚本 → 文件", function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ggrun-"));
  const script = path.join(dir, "自定义.ts");
  fs.writeFileSync(script, "// stub\n");
  const resolved = run.resolveRun({ workspaceRoot: WORKSPACE, file: PROGRAM, config: { cliPath: script } });
  assert.equal(resolved.source, "setting");
  assert.equal(resolved.exec, "node");
  assert.deepEqual(resolved.args, [script, PROGRAM]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("findTerminal：只复用同名且还活着的终端", function () {
  const dead = { name: "咕咕嘎嘎", exitStatus: { code: 0 } };
  const other = { name: "zsh" };
  assert.equal(run.findTerminal(fakeVscode([dead, other]), "咕咕嘎嘎"), null);
  const alive = { name: "咕咕嘎嘎" };
  assert.equal(run.findTerminal(fakeVscode([dead, alive]), "咕咕嘎嘎"), alive);
  assert.equal(run.findTerminal({}, "咕咕嘎嘎"), null);
});

test("runInTerminal：建终端、显示、回车发送；第二次复用同一个", function () {
  const vscode = fakeVscode([]);
  const first = run.runInTerminal(vscode, { line: "咕咕嘎嘎 x.咕咕", cwd: WORKSPACE });
  assert.equal(first.reused, false);
  assert.equal(vscode.created.length, 1);
  const terminal = vscode.created[0];
  assert.equal(terminal.name, "咕咕嘎嘎");
  assert.equal(terminal.cwd, WORKSPACE);
  assert.deepEqual(terminal.shown, [true]);
  assert.deepEqual(terminal.texts, [["咕咕嘎嘎 x.咕咕", true]]);
  const second = run.runInTerminal(vscode, { line: "咕咕嘎嘎 y.咕咕", cwd: WORKSPACE });
  assert.equal(second.reused, true);
  assert.equal(vscode.created.length, 1);
  assert.equal(terminal.texts.length, 2);
});

test("runInTerminal：终端名默认纯咕嘎", function () {
  assert.equal(run.TERMINAL_NAME, "咕咕嘎嘎");
  assert.equal(VISIBLE_ONLY.test(run.TERMINAL_NAME), true);
});

test("runFile：脏文档先存盘再发终端", async function () {
  const vscode = fakeVscode([]);
  const document = fakeDocument({ dirty: true });
  const result = await run.runFile(vscode, { document: document, workspaceRoot: WORKSPACE, config: {} });
  assert.equal(document.saved, 1);
  assert.equal(result.ok, true);
  assert.equal(result.reused, false);
  assert.equal(vscode.created[0].texts[0][0], result.line);
});

test("runFile：干净文档不存盘", async function () {
  const vscode = fakeVscode([]);
  const document = fakeDocument({ dirty: false });
  const result = await run.runFile(vscode, { document: document, workspaceRoot: WORKSPACE, config: {} });
  assert.equal(document.saved, 0);
  assert.equal(result.ok, true);
});

test("runFile：存盘失败就不跑，原因纯咕嘎", async function () {
  const vscode = fakeVscode([]);
  const document = fakeDocument({ dirty: true, saveKeepsDirty: true });
  const result = await run.runFile(vscode, { document: document, workspaceRoot: WORKSPACE, config: {} });
  assert.equal(result.ok, false);
  assert.equal(result.reason, run.REASON.saveFailed);
  assert.equal(VISIBLE_ONLY.test(result.reason), true);
  assert.equal(vscode.created.length, 0);
});

test("runFile：没有编辑器 / 语言不对 / 非文件 → 各自的原因", async function () {
  const cases = [
    [{ document: null }, run.REASON.noEditor],
    [{ document: fakeDocument({ languageId: "plaintext" }) }, run.REASON.wrongLanguage],
    [{ document: fakeDocument({ scheme: "untitled" }) }, run.REASON.notFile],
  ];
  for (const item of cases) {
    const vscode = fakeVscode([]);
    const result = await run.runFile(vscode, Object.assign({ workspaceRoot: WORKSPACE, config: {} }, item[0]));
    assert.equal(result.ok, false);
    assert.equal(result.reason, item[1]);
    assert.equal(VISIBLE_ONLY.test(result.reason), true);
    assert.equal(vscode.created.length, 0);
  }
});

test("原因串全部纯咕嘎，没有任何 ASCII", function () {
  Object.keys(run.REASON).forEach(function (key) {
    const reason = run.REASON[key];
    assert.equal(typeof reason, "string");
    assert.equal(reason.length > 0, true);
    assert.equal(VISIBLE_ONLY.test(reason), true, key + " 混进了别的字符：" + reason);
  });
});

test("extension.js 真的注册了运行命令（静态断言）", function () {
  const source = fs.readFileSync(path.join(EXT_ROOT, "src", "extension.js"), "utf8");
  assert.equal(source.indexOf('registerCommand("gugugaga.run"') > 0, true);
  assert.equal(source.indexOf('require("./run")') > 0, true);
});
