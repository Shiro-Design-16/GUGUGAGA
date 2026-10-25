/**
 * 运行：把 `咕咕嘎嘎 <文件>` 送进集成终端，像 `python x.py` 一样。
 *
 * 为什么不在这里捕获输出：程序只吐位流，终端才是既能喂 stdin、又能自己接
 * `| ggt decode --bytes`、还能看见退出码的地方（vscode/CONTRACT.md §4.7）。
 *
 * vscode 由调用方注入，本模块不 require("vscode")，因此可以在纯 Node 下测试。
 */
"use strict";

const path = require("node:path");
const cli = require("./cli.js");

const LANGUAGE_ID = "gugugaga";
const TERMINAL_NAME = "咕咕嘎嘎";

// 失败原因一律纯咕嘎：运行按钮只在面板/状态栏露面，不往终端里塞人话。
const REASON = {
  noEditor: "咕嘎咕 咕咕嘎",
  wrongLanguage: "咕嘎咕嘎 咕咕咕嘎",
  notFile: "咕嘎咕嘎咕 咕嘎",
  saveFailed: "嘎咕嘎咕 咕咕嘎",
};

// POSIX 下会被 shell 解释的字符；出现就必须加引号
const SHELL_SPECIALS = /[\s"'`$&|;<>()*?!#~\[\]{}^]/;

/**
 * 单个参数加引号。POSIX：双引号内转义 \\ 、" 、$ 、反引号；
 * win32：双引号包住，内部的 " 翻倍（cmd.exe 不认反斜杠转义）。
 * 不含特殊字符时原样输出，命令看起来才像人写的。
 */
function quoteArg(value, platform) {
  const text = value === undefined || value === null ? "" : String(value);
  const windows = (platform || process.platform) === "win32";
  if (windows) {
    return '"' + text.split('"').join('""') + '"';
  }
  if (text === "" || SHELL_SPECIALS.test(text)) {
    return '"' + text.replace(/[\\"$`]/g, "\\$&") + '"';
  }
  return text;
}

/** exec + args → 一行命令；exec 也过引号（路径里可能有空格） */
function buildCommandLine(exec, args, platform) {
  const all = [exec].concat(Array.isArray(args) ? args : []);
  return all
    .map(function (part) {
      return quoteArg(part, platform);
    })
    .join(" ");
}

/**
 * 运行用的命令解析：与 check 共用三级回退，只是不给动作词（隐式执行），
 * 所以 args 里只有文件路径。返回 { exec, args, source, line }。
 */
function resolveRun(options) {
  const opts = options || {};
  const resolved = cli.resolveCommand({
    config: opts.config,
    workspaceRoot: opts.workspaceRoot,
    file: opts.file,
    action: null,
  });
  return {
    exec: resolved.exec,
    args: resolved.args,
    source: resolved.source,
    line: buildCommandLine(resolved.exec, resolved.args),
  };
}

/** 复用同名且还活着的终端；exitStatus 非空表示进程已退出、terminal 已不可用 */
function findTerminal(vscode, name) {
  const list =
    vscode && vscode.window && Array.isArray(vscode.window.terminals) ? vscode.window.terminals : [];
  for (let i = 0; i < list.length; i += 1) {
    const terminal = list[i];
    if (terminal && terminal.name === name && !terminal.exitStatus) return terminal;
  }
  return null;
}

/** 把一行命令发进终端（回车），返回 { terminal, reused } */
function runInTerminal(vscode, options) {
  const opts = options || {};
  const name = typeof opts.name === "string" && opts.name !== "" ? opts.name : TERMINAL_NAME;
  const cwd = typeof opts.cwd === "string" && opts.cwd !== "" ? opts.cwd : undefined;
  let terminal = findTerminal(vscode, name);
  const reused = terminal !== null;
  if (terminal === null) {
    terminal = vscode.window.createTerminal({ name: name, cwd: cwd });
  }
  terminal.show(true);
  terminal.sendText(String(opts.line === undefined || opts.line === null ? "" : opts.line), true);
  return { terminal: terminal, reused: reused };
}

/**
 * 运行当前文档：脏文档先存盘（CLI 读的是磁盘），然后发终端。
 * 返回 { ok: true, line, source, reused } 或 { ok: false, reason }（reason 纯咕嘎）。
 */
function runFile(vscode, options) {
  const opts = options || {};
  const document = opts.document;
  if (!document) return Promise.resolve({ ok: false, reason: REASON.noEditor });
  if (document.languageId !== LANGUAGE_ID) {
    return Promise.resolve({ ok: false, reason: REASON.wrongLanguage });
  }
  const uri = document.uri;
  if (!uri || uri.scheme !== "file") return Promise.resolve({ ok: false, reason: REASON.notFile });

  const saveFirst = document.isDirty
    ? Promise.resolve(document.save()).then(function () {
        return document.isDirty ? { ok: false, reason: REASON.saveFailed } : null;
      })
    : Promise.resolve(null);

  return saveFirst.then(function (blocked) {
    if (blocked !== null) return blocked;
    const file =
      typeof document.fileName === "string" && document.fileName !== ""
        ? document.fileName
        : uri.fsPath;
    const resolved = resolveRun({
      config: opts.config,
      workspaceRoot: opts.workspaceRoot,
      file: file,
    });
    const cwd =
      typeof opts.workspaceRoot === "string" && opts.workspaceRoot !== ""
        ? opts.workspaceRoot
        : path.dirname(file);
    const sent = runInTerminal(vscode, { line: resolved.line, cwd: cwd, name: opts.name });
    return { ok: true, line: resolved.line, source: resolved.source, reused: sent.reused };
  });
}

module.exports = {
  LANGUAGE_ID: LANGUAGE_ID,
  TERMINAL_NAME: TERMINAL_NAME,
  REASON: REASON,
  quoteArg: quoteArg,
  buildCommandLine: buildCommandLine,
  resolveRun: resolveRun,
  findTerminal: findTerminal,
  runInTerminal: runInTerminal,
  runFile: runFile,
};
