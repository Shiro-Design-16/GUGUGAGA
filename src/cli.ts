/**
 * 咕咕嘎嘎语 · CLI（SPEC.md §8）。
 *
 * 两条流的分工（SPEC.md §8.1）：
 *   stdout 只写程序输出位流，一个字节都不多；
 *   stderr 只写 GGDIAG v1 诊断帧（§12）——用法、帮助、读文件失败、语言错误、
 *   宿主异常全部编码成帧，屏幕上因此只可能出现 咕/嘎/空格/换行。
 * 中文文案继续作为**数据**留在这里（进帧正文），绝不直接 write 到终端。
 */

import { existsSync, readFileSync } from "node:fs";

import { EXIT, GgError, frameOfError } from "./errors.ts";
import type { Dialect } from "./keywords.ts";
import { dialectOfFile, hasProgramSuffix, renderBits } from "./keywords.ts";
import { interpret } from "./interp.ts";
import { parseSource } from "./parser.ts";
import { encodeDiag, EVENT } from "./wire.ts";

/** 帮助正文（code 22 的帧正文）。它是数据，不是屏幕上的人话。 */
const USAGE = [
  "用法：",
  "  咕咕嘎嘎 <文件>.咕咕                      # 执行，裸位流写 stdout（省略动作词，像 python x.py）",
  "  咕咕嘎嘎 嘎 <文件>.咕咕 [--max-steps N]    # 同上，显式写法",
  "  咕咕嘎嘎 嘎嘎 <文件>.咕咕                  # 词法/语法/静态检查，不执行",
  "  咕咕嘎嘎 嘎嘎嘎                            # 帮助（本正文即一帧，code 22）",
  "  咕咕嘎嘎 嘎嘎嘎嘎 <咕嘎位串> <文件>.咕咕    # 设置步数上限（位串按二进制读）",
  "",
  "拉丁别名只为人手旧习惯，不属于语言词汇：run=嘎、check=嘎嘎、--help=嘎嘎嘎、--max-steps=嘎嘎嘎嘎。",
  "安装的命令：gggg 与别名 gg（本语言）、ggt（咕嘎翻译器，见 translator/）。",
  "文件首行若以 #! 开头会被跳过，于是 .咕咕 文件可以写成可执行脚本。",
  "stderr 只写 GGDIAG v1 帧（SPEC.md §12）；想读人话：ggt decode --diag。",
  "",
  "退出码：0 成功；1 运行时错误；2 词法/语法/静态错误；3 用法错误",
  "",
].join("\n");

/** 只含 咕/嘎 的位串：步数上限的二进制写法。 */
const STEP_BITS = /^[咕嘎]+$/;

type ParsedArgs =
  | { ok: true; file: string; maxSteps: number | undefined }
  | { ok: false; error: string };

function parseArgs(argv: string[], allowMaxSteps: boolean, presetMaxSteps?: number): ParsedArgs {
  let file: string | null = null;
  let maxSteps: number | undefined = presetMaxSteps;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--max-steps" && allowMaxSteps) {
      const raw = argv[i + 1];
      i += 1;
      if (raw === undefined) return { ok: false, error: "--max-steps 缺少取值" };
      if (!/^[0-9]+$/.test(raw)) return { ok: false, error: `--max-steps 需要正整数，得到 ${raw}` };
      const parsed = Number(raw);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        return { ok: false, error: `--max-steps 需要正整数，得到 ${raw}` };
      }
      maxSteps = parsed;
      continue;
    }
    if (arg.startsWith("-")) return { ok: false, error: `未知选项 ${arg}` };
    if (file !== null) return { ok: false, error: `多余的参数 ${arg}` };
    file = arg;
  }
  if (file === null) return { ok: false, error: "缺少文件名" };
  return { ok: true, file, maxSteps };
}

/**
 * 写一帧到 stderr；帧后一个换行（SPEC 允许帧间夹空格/换行）。stdout 一个字节都不加。
 * dialect 只决定 0/1 的字形：帮助与用法错误没有具体程序，固定用 咕/嘎（SPEC §1.4）。
 */
function emit(
  code: number,
  pos: { line: number; col: number } | null,
  message: string,
  dialect: Dialect = "zh",
): void {
  process.stderr.write(encodeDiag(code, pos, message, dialect) + "\n");
}

function usageError(message: string): number {
  emit(EVENT.USAGE, null, `用法错误：${message}`);
  return EXIT.USAGE;
}

/** E1xx/E2xx/E3xx → 2，E4xx → 1 */
function exitOfCode(code: string): number {
  if (code.startsWith("E1") || code.startsWith("E2") || code.startsWith("E3")) return EXIT.STATIC;
  return EXIT.RUNTIME;
}

function reportError(err: unknown, dialect: Dialect = "zh"): number {
  if (err instanceof GgError) {
    process.stderr.write(frameOfError(err, dialect) + "\n");
    return exitOfCode(err.code);
  }
  // 宿主自己的 bug 也编码成帧：正文只取 message，**绝不**写 stack（SPEC.md §8.1）。
  emit(EVENT.INTERNAL, null, err instanceof Error ? err.message : String(err), dialect);
  return EXIT.RUNTIME;
}

/**
 * 剥掉首行的 #! 行（替换成空行，保住行号）。
 * 只为让 .咕咕 文件能当可执行脚本；# 不进语言本身，词法器仍然拒收它。
 */
export function stripShebang(source: string): string {
  if (!source.startsWith("#!")) return source;
  const nl = source.indexOf("\n");
  return nl === -1 ? "\n" : "\n" + source.slice(nl + 1);
}

/**
 * 咕/嘎 位串 → 步数上限：咕=0、嘎=1，MSB 在前，这就是数值本身（不是十进制）。
 * 空串 / 含其它字符 / 为 0 → null（调用方报用法错误帧）。
 * 超过 Number.MAX_SAFE_INTEGER 时钳到 MAX_SAFE_INTEGER：解释器按 number 计步，
 * 更大的上限等价于「不设限」。
 */
export function parseStepBits(raw: string): number | null {
  if (!STEP_BITS.test(raw)) return null;
  let value = 0n;
  for (const ch of raw) value = (value << 1n) | (ch === "嘎" ? 1n : 0n);
  if (value === 0n) return null;
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value);
}

/** 省略子命令：第一个非选项参数带 §1.4 的任一后缀（三方言、大小写不敏感）或是已存在的文件时，按 嘎 处理 */
function looksLikeProgram(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--max-steps") {
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) return false;
    return hasProgramSuffix(arg) || existsSync(arg);
  }
  return false;
}

/** 读源码；按 SPEC.md §1 把 CRLF 归一化为 LF。失败时写 code 23 帧并返回 null。 */
function readSource(fileName: string, dialect: Dialect): string | null {
  try {
    return readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    emit(EVENT.READ_FAILED, null, `无法读取文件 ${fileName}：${reason}`, dialect);
    return null;
  }
}

/** stdin 全部内容；stdin 是终端或读取失败时视作空，不阻塞 */
function readStdin(): string {
  try {
    if (process.stdin.isTTY === true) return "";
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function runCommand(argv: string[], presetMaxSteps?: number): number {
  const parsed = parseArgs(argv, true, presetMaxSteps);
  if (!parsed.ok) return usageError(parsed.error);
  // 方言只看文件名后缀；解释器始终交 咕/嘎，出口处才换字形（SPEC §1.4）。
  const dialect = dialectOfFile(parsed.file);
  const raw = readSource(parsed.file, dialect);
  if (raw === null) return EXIT.USAGE;
  const source = stripShebang(raw);
  try {
    const program = parseSource(source);
    interpret(program, {
      maxSteps: parsed.maxSteps,
      stdin: readStdin(),
      write: (bits: string): void => {
        process.stdout.write(renderBits(bits, dialect));
      },
    });
    return EXIT.OK;
  } catch (err) {
    return reportError(err, dialect);
  }
}

function checkCommand(argv: string[]): number {
  const parsed = parseArgs(argv, false);
  if (!parsed.ok) return usageError(parsed.error);
  const dialect = dialectOfFile(parsed.file);
  const raw = readSource(parsed.file, dialect);
  if (raw === null) return EXIT.USAGE;
  const source = stripShebang(raw);
  try {
    parseSource(source);
    return EXIT.OK;
  } catch (err) {
    return reportError(err, dialect);
  }
}

/** 嘎嘎嘎嘎 <咕嘎位串> <文件>.咕咕：位串是步数上限的二进制本身，没有十进制写法。 */
function maxStepsCommand(argv: string[]): number {
  const raw = argv[0];
  if (raw === undefined) return usageError("嘎嘎嘎嘎 后面需要 咕/嘎 位串与文件名");
  const maxSteps = parseStepBits(raw);
  if (maxSteps === null) {
    return usageError(`嘎嘎嘎嘎 需要只含 咕/嘎 的非零位串（咕=0 嘎=1，高位在前），得到 ${raw}`);
  }
  return runCommand(argv.slice(1), maxSteps);
}

function helpCommand(): number {
  emit(EVENT.HELP, null, USAGE);
  return EXIT.OK;
}

function dispatch(argv: string[]): number {
  const first = argv[0];
  if (argv.includes("--help") || argv.includes("-h") || first === "嘎嘎嘎") return helpCommand();
  if (first === undefined) return usageError("缺少子命令或文件名（试 咕咕嘎嘎 程序.咕咕）");
  if (first === "嘎" || first === "run") return runCommand(argv.slice(1));
  if (first === "嘎嘎" || first === "check") return checkCommand(argv.slice(1));
  if (first === "嘎嘎嘎嘎") return maxStepsCommand(argv.slice(1));
  if (looksLikeProgram(argv)) return runCommand(argv);
  return usageError(`未知子命令 ${first}（执行程序请直接写文件路径，例如 咕咕嘎嘎 程序.咕咕）`);
}

/** CLI 入口。任何逃出 dispatch 的宿主异常也编码成 code 24 帧，绝不让 Node 打印栈。 */
export function main(argv: string[]): number {
  try {
    return dispatch(argv);
  } catch (err) {
    emit(EVENT.INTERNAL, null, err instanceof Error ? err.message : String(err));
    return EXIT.RUNTIME;
  }
}
