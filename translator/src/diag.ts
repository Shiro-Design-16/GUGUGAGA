/**
 * 咕嘎翻译器 · GGDIAG v1 诊断帧解码（SPEC.md §12）。
 *
 * 输入是宿主 stderr 的原文：位名按 SPEC §1.2 归一化（0 = 咕 / グ / ぐ / GU，
 * 1 = 嘎 / ガ / が / GA，英文两位大小写不分），其余字符（帧间空格、换行、
 * 宿主警告正文）一律丢弃。帧布局（MSB 在前）：
 *   magic 4 = 1010 | version 2 = 00 | code 8 | line 16 | col 16 | mlen 16
 *   | msg mlen*8（UTF-8 字节）| end 3 = 110
 */

import { GA, GU, normalizeBitsLoose } from "./bits.ts";

export interface DiagEvent {
  code: number;
  line: number;
  col: number;
  message: string;
}

/** SPEC.md §9 的错误码顺序：code 数值 = 下标 + 1。 */
export const CODE_NAMES: readonly string[] = [
  "E1001",
  "E1002",
  "E1003",
  "E2001",
  "E2002",
  "E3001",
  "E3002",
  "E3003",
  "E3004",
  "E3005",
  "E4001",
  "E4002",
  "E4003",
  "E4004",
  "E4005",
  "E4006",
  "E4007",
  "E4008",
  "E4010",
  "E4011",
  "E4012",
];

/** code 0 与 22–24 是外壳事件，不在 §9 表里。 */
const SHELL_NAMES = new Map<number, string>([
  [0, "用法错误"],
  [22, "帮助"],
  [23, "读文件失败"],
  [24, "内部错误"],
]);

export function codeName(code: number): string {
  if (code >= 1 && code <= CODE_NAMES.length) return CODE_NAMES[code - 1];
  const shell = SHELL_NAMES.get(code);
  if (shell !== undefined) return shell;
  return "未知事件 " + code;
}

const MAGIC = GA + GU + GA + GU; // 1010
const VERSION = GU + GU; // 00
const END = GA + GA + GU; // 110

const MAGIC_BITS = 4;
const HEADER_BITS = 62;
const END_BITS = 3;

/** 从 start 起按 MSB 在前读 width 位无符号整数。 */
function readUnsigned(bits: string, start: number, width: number): number {
  let value = 0;
  for (let i = 0; i < width; i += 1) value = value * 2 + (bits[start + i] === GA ? 1 : 0);
  return value;
}

/**
 * 读 mlen 个字节并按 UTF-8 解码。这里用非严格解码：诊断正文是搬运过来的
 * 宿主文案，坏字节不该让整帧消失（替换成 U+FFFD 更接近「原样打印」）。
 */
function readMessage(bits: string, start: number, length: number): string {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = readUnsigned(bits, start + i * 8, 8);
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

/**
 * 扫描整条流并取出所有合法帧。
 * magic / version 不符就后移一位继续找；end 不是 110 则丢弃该帧并后移一位重新同步；
 * 剩余位不够读完整帧（头或消息）时不再可能有完整帧，停止。
 */
export function parseDiagFrames(input: string): DiagEvent[] {
  const bits = normalizeBitsLoose(input);
  const events: DiagEvent[] = [];
  let i = 0;

  while (i + HEADER_BITS <= bits.length) {
    if (!bits.startsWith(MAGIC, i) || !bits.startsWith(VERSION, i + MAGIC_BITS)) {
      i += 1;
      continue;
    }

    const code = readUnsigned(bits, i + 6, 8);
    const line = readUnsigned(bits, i + 14, 16);
    const col = readUnsigned(bits, i + 30, 16);
    const mlen = readUnsigned(bits, i + 46, 16);
    const msgStart = i + HEADER_BITS;
    const endStart = msgStart + mlen * 8;

    if (endStart + END_BITS > bits.length) {
      // 消息没写全（截断）：丢弃这一帧，后移一位继续找后面的帧。
      // 不能直接 break——一个被截断的头部可能只是噪声，后面还有完整帧。
      i += 1;
      continue;
    }
    if (!bits.startsWith(END, endStart)) {
      i += 1;
      continue;
    }

    events.push({ code, line, col, message: readMessage(bits, msgStart, mlen) });
    i = endStart + END_BITS;
  }

  return events;
}

/** 一帧一行：有位置时「行:列 码名 正文」，位置为 0 时「码名 正文」。 */
export function formatDiagEvent(event: DiagEvent): string {
  const name = codeName(event.code);
  const positioned = event.line !== 0 || event.col !== 0;
  const head = positioned ? event.line + ":" + event.col + " " + name : name;
  return event.message === "" ? head : head + " " + event.message;
}
