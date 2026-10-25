/**
 * 咕嘎翻译器 · 命令行入口（CONTRACT.md §2）。
 * main(argv) 返回退出码：0 成功；1 输入/解码错误；2 用法错误；3 plan 文件错误。
 */

import { readFileSync, readSync } from "node:fs";
import { isatty } from "node:tty";
import { GgtError, parseBits } from "./bits.ts";
import type { Dialect } from "./bits.ts";
import { parsePlan } from "./plan.ts";
import { decodeBits, guessMode } from "./decode.ts";
import type { DecodeMode } from "./decode.ts";
import { literalPrefix, encodeInts, encodeText, parseDecimalTokens } from "./encode.ts";
import { formatDiagEvent, parseDiagFrames } from "./diag.ts";

export const USAGE = [
  "用法：",
  "  ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]",
  "  ggt decode --diag [<位流文件>]",
  "  ggt encode [--int64|--as-literal] [--ja|--en] [<文本文件>]",
  "  ggt --help",
].join("\n");

interface CommandArgs {
  flags: Set<string>;
  planPath: string | null;
  positional: string | null;
}

function writeOut(text: string): void {
  if (text !== "") process.stdout.write(text);
}

function writeErr(line: string): void {
  process.stderr.write(line + "\n");
}

function parseArgs(rest: string[], allowedFlags: readonly string[], allowPlan: boolean): CommandArgs {
  const flags = new Set<string>();
  let planPath: string | null = null;
  let positional: string | null = null;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];

    if (token === "--plan") {
      if (!allowPlan) throw new GgtError("--plan 只用于 decode", 2);
      const value = rest[i + 1];
      if (value === undefined) throw new GgtError("--plan 缺少文件名", 2);
      if (planPath !== null) throw new GgtError("--plan 重复给出", 2);
      planPath = value;
      i += 1;
      continue;
    }

    if (token.startsWith("-") && token !== "-") {
      if (!allowedFlags.includes(token)) throw new GgtError("未知选项“" + token + "”", 2);
      flags.add(token);
      continue;
    }

    if (positional !== null) throw new GgtError("多余参数“" + token + "”", 2);
    positional = token;
  }

  return { flags, planPath, positional };
}

const STDIN_BUFFER_SIZE = 65536;
const STDIN_RETRY_WAIT_MS = 2;

/** 同步小睡，用于等管道写端把数据送进来（EAGAIN 重试）。 */
function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * 没有 <文件> 时读 stdin；stdin 是终端时按空输入处理，避免挂起。
 * 用 readSync 循环而不是 readFileSync(0)：管道写端还没写时 fd 0 可能返回 EAGAIN，
 * 静默当成空输入会把上游的位流整个吞掉，所以这里重试到 EOF 为止。
 */
function readStdin(): string {
  if (isatty(0)) return "";
  const chunks: Buffer[] = [];
  const buffer = Buffer.alloc(STDIN_BUFFER_SIZE);
  for (;;) {
    let bytesRead: number;
    try {
      bytesRead = readSync(0, buffer, 0, buffer.length, null);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "EAGAIN" || code === "EWOULDBLOCK") {
        sleepMs(STDIN_RETRY_WAIT_MS);
        continue;
      }
      if (code === "EINTR") continue;
      throw new GgtError("读取 stdin 失败：" + (error as Error).message, 1);
    }
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function readInputFile(path: string | null): string {
  if (path === null) return readStdin();
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new GgtError("无法读取输入文件“" + path + "”", 2);
  }
}

function readPlanFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new GgtError("plan 文件“" + path + "”无法读取", 3);
  }
}

function runDecode(rest: string[]): number {
  const args = parseArgs(rest, ["--int64", "--bytes", "--hex", "--bits", "--diag"], true);

  const modes: DecodeMode[] = [];
  if (args.flags.has("--int64")) modes.push({ kind: "int64" });
  if (args.flags.has("--bytes")) modes.push({ kind: "bytes" });
  if (args.flags.has("--hex")) modes.push({ kind: "hex" });
  if (args.flags.has("--bits")) modes.push({ kind: "bits" });

  if (args.flags.has("--diag")) {
    if (args.planPath !== null) throw new GgtError("--diag 不能与 --plan 同时使用", 2);
    if (modes.length > 0) throw new GgtError("--diag 不能与 --int64/--bytes/--hex/--bits 同时使用", 2);
    return runDiag(args.positional);
  }
  if (args.planPath !== null && modes.length > 0) {
    throw new GgtError("--plan 不能与 --int64/--bytes/--hex/--bits 同时使用", 2);
  }
  if (modes.length > 1) throw new GgtError("模式参数只能给一个", 2);

  const bits = parseBits(readInputFile(args.positional));

  let mode: DecodeMode;
  let note: string | null = null;
  if (args.planPath !== null) {
    mode = { kind: "plan", slots: parsePlan(readPlanFile(args.planPath)) };
  } else if (modes.length === 1) {
    mode = modes[0];
  } else {
    const guessed = guessMode(bits);
    mode = guessed.mode;
    note = guessed.note;
  }

  if (note !== null) writeErr("ggt: 未指定模式，猜为 " + note);
  writeOut(decodeBits(bits, mode).output);
  return 0;
}

/** --diag：宿主 stderr 的 GGDIAG v1 帧，一帧一行（SPEC.md §12）。 */
function runDiag(path: string | null): number {
  const events = parseDiagFrames(readInputFile(path));
  if (events.length === 0) throw new GgtError("没有找到诊断帧", 1);
  let out = "";
  for (const event of events) out += formatDiagEvent(event) + "\n";
  writeOut(out);
  return 0;
}

/** 输出方言：--ja 日语全角、--en 半角 ASCII，默认中文 咕/嘎。 */
function resolveDialect(flags: Set<string>): Dialect {
  const ja = flags.has("--ja");
  const en = flags.has("--en");
  if (ja && en) throw new GgtError("--ja 与 --en 只能给一个", 2);
  return ja ? "ja" : en ? "en" : "zh";
}

function runEncode(rest: string[]): number {
  const args = parseArgs(rest, ["--int64", "--as-literal", "--ja", "--en"], false);
  const text = readInputFile(args.positional);
  const asLiteral = args.flags.has("--as-literal");
  const dialect = resolveDialect(args.flags);

  if (args.flags.has("--int64")) {
    writeOut(encodeInts(parseDecimalTokens(text), asLiteral, dialect));
    return 0;
  }

  const bits = encodeText(text, dialect);
  writeOut(asLiteral ? literalPrefix("text", dialect) + bits : bits);
  return 0;
}

export function main(argv: string[]): number {
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      writeOut(USAGE + "\n");
      return 0;
    }
    if (argv.length === 0) throw new GgtError("缺少子命令（decode 或 encode）", 2);

    const [sub, ...rest] = argv;
    if (sub === "decode") return runDecode(rest);
    if (sub === "encode") return runEncode(rest);
    throw new GgtError("未知子命令“" + sub + "”", 2);
  } catch (error) {
    if (error instanceof GgtError) {
      writeErr("ggt: " + error.message);
      if (error.exitCode === 2) writeErr(USAGE);
      return error.exitCode;
    }
    if (error instanceof Error) {
      writeErr("ggt: 内部错误：" + error.message);
      return 1;
    }
    throw error;
  }
}
