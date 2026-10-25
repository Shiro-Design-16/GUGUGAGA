/**
 * 咕咕嘎嘎语 · CLI 调用桥（vscode/CONTRACT.md §4.4）。
 *
 * 只做三件事：
 *   1. resolveCommand —— 搞清楚该执行谁来跑 check（三级回退：设置 / 仓库 / PATH）；
 *   2. parseDiagnostics —— 转交给 diagnostics.js 的 GGDIAG v1 位流解码器；
 *   3. runCheck —— 用 node:child_process.execFile 包成 Promise，超时不抛。
 *
 * 零依赖，只用 node:child_process / node:fs / node:path。
 */
"use strict";

const { execFile } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

/**
 * PATH 回退按序尝试的命令名：规范写法 咕咕嘎嘎 → 日语别名 ググガガ → 拉丁旧名 gggg、gg（SPEC §8）。
 * 第一个同时是 package.json 里 gugugaga.cliPath 的默认值——设置页会把默认值显示给用户，
 * 所以默认值也必须是纯咕嘎。
 */
const CLI_CANDIDATES = ["咕咕嘎嘎", "ググガガ", "gggg", "gg"];
/** PATH 上一个都没找到时留给 spawn 报错的名字（也是设置默认值） */
const DEFAULT_CLI = CLI_CANDIDATES[0];
/** check 的动作词（SPEC §8 规范写法；拉丁别名 check 只是人手旧习惯） */
const CHECK_WORD = "嘎嘎";
/** 默认 Node（与 package.json 里 gugugaga.nodePath 的默认值一致） */
const DEFAULT_NODE = "node";
/** node:child_process 的输出上限：诊断再多也不会把内存撑爆 */
const MAX_BUFFER = 4 * 1024 * 1024;

/** 空串 / 非字符串一律退回默认值，避免设置里只剩空格导致 spawn 失败 */
function withDefault(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

/** 相对路径按工作区根解析；没有工作区时按进程 cwd 解析 */
function absolutePath(value, workspaceRoot) {
  if (path.isAbsolute(value)) return value;
  const base = workspaceRoot !== null ? workspaceRoot : process.cwd();
  return path.resolve(base, value);
}

/**
 * 命令行参数组装。action 省略 = check（给动作词 嘎嘎）；
 * action 为 null = 隐式执行（只给文件路径，像 python x.py）；
 * file 省略时只给出动作词（探路用）。
 */
function checkArgs(file, action) {
  const word = action === undefined ? CHECK_WORD : action;
  if (word === null) return file === null ? [] : [file];
  return file === null ? [word] : [word, file];
}

/**
 * 在 PATH 上找命令，找到返回完整路径，找不到返回 null。
 * 零依赖自实现（不 spawn which）：只按 path.delimiter 拆目录、按 PATHEXT 补后缀。
 */
function findOnPath(name) {
  const rawPath = typeof process.env.PATH === "string" ? process.env.PATH : "";
  const dirs = rawPath.split(path.delimiter).filter(function (dir) {
    return dir !== "";
  });
  const exts =
    process.platform === "win32"
      ? String(process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
      : [""];
  for (let i = 0; i < dirs.length; i += 1) {
    for (let j = 0; j < exts.length; j += 1) {
      if (existsSync(path.join(dirs[i], name + exts[j]))) return path.join(dirs[i], name + exts[j]);
    }
  }
  return null;
}

/**
 * 三级回退，返回 { exec, args, source }，source ∈ "setting" | "repo" | "path"：
 *
 *   1. 设置 gugugaga.cliPath 写的不是一个已知命令名（咕咕嘎嘎 / gggg / gg）、
 *      且解析后确实存在 → source = "setting"。若它以 .ts 结尾，exec 换成
 *      gugugaga.nodePath，并把文件路径插到参数最前面（node 要第一个参数是脚本）。
 *   2. 否则 <workspaceRoot>/bin/gg.ts 存在 → node <那个路径> 嘎嘎 <文件>，source = "repo"。
 *   3. 否则 PATH 上按 咕咕嘎嘎 → gggg → gg 顺序取第一个存在的，source = "path"
 *      （都找不到就仍报 咕咕嘎嘎，让 spawn 的失败暴露出来）。
 *
 * 参数对象用 { config, workspaceRoot, file }；file 也可写成 filePath。
 * （CONTRACT §4.4 的签名只列了 { config, workspaceRoot }，但同一节的返回值里
 *   args 含文件路径，所以这里必须收一个 file 才自洽。）
 */
function resolveCommand(options) {
  const opts = options || {};
  const config = opts.config || {};
  const workspaceRoot =
    typeof opts.workspaceRoot === "string" && opts.workspaceRoot !== "" ? opts.workspaceRoot : null;
  const rawFile = opts.file !== undefined ? opts.file : opts.filePath;
  const args = checkArgs(
    rawFile === undefined || rawFile === null ? null : String(rawFile),
    opts.action
  );
  const nodePath = withDefault(config.nodePath, DEFAULT_NODE);
  const rawCli = withDefault(config.cliPath, DEFAULT_CLI);

  // 1. 设置里的 cliPath（只有不是已知命令名时才当路径看）
  if (CLI_CANDIDATES.indexOf(rawCli) === -1) {
    const candidate = absolutePath(rawCli, workspaceRoot);
    if (existsSync(candidate)) {
      if (candidate.endsWith(".ts")) {
        return { exec: nodePath, args: [candidate].concat(args), source: "setting" };
      }
      return { exec: candidate, args: args, source: "setting" };
    }
  }

  // 2. 仓库自带的 bin/gg.ts
  if (workspaceRoot !== null) {
    const repoBin = path.join(workspaceRoot, "bin", "gg.ts");
    if (existsSync(repoBin)) {
      return { exec: nodePath, args: [repoBin].concat(args), source: "repo" };
    }
  }

  // 3. PATH：设置里写了一个不存在的路径时也回到这里
  for (let i = 0; i < CLI_CANDIDATES.length; i += 1) {
    if (findOnPath(CLI_CANDIDATES[i]) !== null) {
      return { exec: CLI_CANDIDATES[i], args: args, source: "path" };
    }
  }
  return { exec: DEFAULT_CLI, args: args, source: "path" };
}

/**
 * 诊断解析已搬到 diagnostics.js 的 GGDIAG v1 位流解码器（SPEC.md §12）。
 * 这里保留同名导出只为守住 CONTRACT §4.4 的 API 面；
 * require 写在函数体内是刻意的：diagnostics.js 顶部要 require 本文件的 runCheck，
 * 模块级互相 require 会拿到半成品 exports（循环依赖）。
 * filePath 依旧只为 API 对齐：一帧只带一个位置，解码器不看它。
 */
function parseDiagnostics(stderr, filePath) {
  return require("./diagnostics.js").parseDiagnostics(stderr, filePath);
}

/**
 * 跑一次 check，永不 reject。返回
 *   { code, stdout, stderr, timedOut, error }
 * - 正常退出（含 0/1/2/3）：code 为数字，error 为 null；
 * - 超时被 kill：code 为 null，timedOut 为 true，error 是纯咕嘎的原因串；
 * - 启动失败（命令不存在等）：code 为 null，timedOut 为 false，error 非空。
 * 之所以多出 timedOut / error 两个字段：上层 collect 需要区分「超时」「起不来」
 * 与「正常带诊断的退出码」，只靠 code 无法区分。
 */
function runCheck(options) {
  const opts = options || {};
  const exec = opts.exec;
  const args = Array.isArray(opts.args) ? opts.args : [];
  const timeoutMs = typeof opts.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 15000;
  const cwd = typeof opts.cwd === "string" && opts.cwd !== "" ? opts.cwd : undefined;

  return new Promise(function (resolve) {
    if (typeof exec !== "string" || exec === "") {
      resolve({
        code: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        error: "咕咕嘎嘎 嘎嘎咕嘎",
      });
      return;
    }
    const done = function (err, stdout, stderr) {
      const out = String(stdout === undefined || stdout === null ? "" : stdout);
      const errOut = String(stderr === undefined || stderr === null ? "" : stderr);
      if (!err) {
        resolve({ code: 0, stdout: out, stderr: errOut, timedOut: false, error: null });
        return;
      }
      if (err.killed === true || err.signal) {
        resolve({
          code: null,
          stdout: out,
          stderr: errOut,
          timedOut: true,
          error: "咕咕嘎嘎！ 嘎嘎嘎嘎 " + timeoutMs,
        });
        return;
      }
      if (typeof err.code === "number") {
        resolve({ code: err.code, stdout: out, stderr: errOut, timedOut: false, error: null });
        return;
      }
      resolve({
        code: null,
        stdout: out,
        stderr: errOut,
        timedOut: false,
        error: "咕咕嘎嘎！ 嘎咕嘎咕 " + exec + " " + (err.code || ""),
      });
    };
    try {
      execFile(exec, args, { cwd: cwd, timeout: timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true }, done);
    } catch (err) {
      resolve({
        code: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        error: "咕咕嘎嘎！ 嘎咕嘎咕 " + exec,
      });
    }
  });
}

module.exports = { resolveCommand: resolveCommand, parseDiagnostics: parseDiagnostics, runCheck: runCheck };
