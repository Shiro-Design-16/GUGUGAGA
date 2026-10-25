/**
 * 咕咕嘎嘎语 · 外壳位流协议 GGDIAG v1 编码器（SPEC.md §12 是权威文本）。
 *
 * 帧只由 咕(0)/嘎(1) 组成，人话原文的 UTF-8 字节被搬进正文——外壳永不直接上屏。
 * 布局（全部 MSB 在前）：
 *
 *   magic 4 = 1010 · version 2 = 00 · code 8 · line 16（1 基，0=无位置）
 *   · col 16（同上）· mlen 16 · msg = mlen×8（逐字节 MSB 在前）· end 3 = 110
 *
 * 帧长恒为 65 + 8×mlen 位。
 */

/** 位 0 / 位 1 的字面量（SPEC.md §12.1）。 */
export const BIT_ZERO = "咕";
export const BIT_ONE = "嘎";

/** magic / version / end 的数值，写成二进制字面量便于对照 SPEC 的位串。 */
const MAGIC = 0b1010;
const VERSION = 0b00;
const END = 0b110;

/** 非语言错误的三个事件码（SPEC.md §12.3）；语言错误用 1..21。 */
export const EVENT = {
  /** 用法错误（CLI 参数不对） */
  USAGE: 0,
  /** 帮助，正文即用法全文 */
  HELP: 22,
  /** 读文件失败，正文含宿主给出的原因 */
  READ_FAILED: 23,
  /** 内部错误，正文即宿主异常的 message */
  INTERNAL: 24,
} as const;

/** 已定义的最大事件码：解码器可以用它判断「码未知」。 */
export const KNOWN_CODE_MAX = 24;

/** mlen 是 16 位字段，所以在帧里最多装 65535 字节正文。 */
export const MAX_MESSAGE_BYTES = 0xffff;

/** 无符号整数 → 定宽 咕/嘎 位串（MSB 在前）。 */
function bits(value: number, width: number): string {
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) out += (value >>> i) & 1 ? BIT_ONE : BIT_ZERO;
  return out;
}

/** 把数值钳进 [0, max]：越界位置/码不 panic，只截断到字段上限。 */
function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), max);
}

/**
 * 正文字节。mlen 只有 16 位（上限 65535 字节），超长时**按 UTF-8 字符边界截断**：
 * 先切到 65535 字节，再把末尾不完整的续字节（10xxxxxx）回退掉——
 * 于是剩下的前缀必然以完整字符结尾，解码端不会读到半个汉字（U+FFFD）。
 * 这是可接受的信息损失：真实诊断文案远小于 64 KiB，触发截断只可能是恶意/异常的
 * 超长异常 message，此时保住「可解码」比保住尾巴更重要。
 */
export function messageBytes(message: string): Buffer {
  const full = Buffer.from(message, "utf8");
  if (full.length <= MAX_MESSAGE_BYTES) return full;
  let end = MAX_MESSAGE_BYTES;
  while (end > 0 && (full[end] & 0xc0) === 0x80) end -= 1;
  return full.subarray(0, end);
}

/**
 * 完整帧的位串（咕/嘎 字符），长度 = 65 + 8×mlen。
 * line 为 0（或负数）表示无位置，此时 col 一律写 0。
 */
export function frameBits(code: number, line: number, col: number, message: string): string {
  const msg = messageBytes(message);
  const lineOut = clamp(line, 0xffff);
  const colOut = lineOut === 0 ? 0 : clamp(col, 0xffff);
  let out =
    bits(MAGIC, 4) +
    bits(VERSION, 2) +
    bits(clamp(code, 0xff), 8) +
    bits(lineOut, 16) +
    bits(colOut, 16) +
    bits(msg.length, 16);
  for (const byte of msg) out += bits(byte, 8);
  return out + bits(END, 3);
}

/** 一帧的咕/嘎文本（不含结尾换行；外壳自己决定要不要在帧后补 \n）。 */
export function encodeDiag(
  code: number,
  pos: { line: number; col: number } | null,
  message: string,
): string {
  return frameBits(code, pos === null ? 0 : pos.line, pos === null ? 0 : pos.col, message);
}
