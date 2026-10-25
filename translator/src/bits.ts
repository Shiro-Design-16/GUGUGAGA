/**
 * 咕嘎翻译器 · 位流基础运算。
 *
 * 位流在这里就是一个字符串：只含 咕(0) 与 嘎(1)。所有解析/拼接都在这一层做，
 * 上层只关心“怎么切分”。
 */

export const GU = "咕";
export const GA = "嘎";

/** 退出码：0 成功；1 输入/解码错误；2 用法错误；3 plan 文件错误。 */
export type ExitCode = 1 | 2 | 3;

/** 带退出码的诊断错误；cli 捕获后打印 message 并返回 exitCode。 */
export class GgtError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode) {
    super(message);
    this.name = "GgtError";
    this.exitCode = exitCode;
  }
}

/** 空白：契约的四种 + 日语全角空格 U+3000（SPEC §1.1）。 */
const WHITESPACE = new Set([" ", "\t", "\n", "\r", "\u3000"]);

/** 位名方言：内部一律 咕/嘎，只在输入解析与输出渲染时出现别的写法。 */
export type Dialect = "zh" | "ja" | "en";

const ZERO_CHARS = new Set([GU, "グ", "ぐ"]);
const ONE_CHARS = new Set([GA, "ガ", "が"]);

/** 各方言的位名：[0, 1]；--en 的每一位是两个 ASCII 字母。 */
const DIALECT_NAMES: Record<Dialect, readonly [string, string]> = {
  zh: [GU, GA],
  ja: ["グ", "ガ"],
  en: ["GU", "GA"],
};

/** 码点标签，形如 U+0078 / U+1F600（至少四位、大写）。 */
export function codePointLabel(ch: string): string {
  const cp = ch.codePointAt(0);
  const hex = cp === undefined ? "0000" : cp.toString(16).toUpperCase().padStart(4, "0");
  return "U+" + hex;
}

function illegalChar(ch: string, index: number): GgtError {
  return new GgtError(
    "非法字符“" + ch + "”（" + codePointLabel(ch) + "），位于输入第 " + index + " 个字符",
    1,
  );
}

/**
 * 把输入文本解析成纯位流（SPEC §1 三方言逐位置等价）：
 *   0 = 咕 / グ / ぐ / GU（四个大小写都行）
 *   1 = 嘎 / ガ / が / GA（四个大小写都行）
 * 空白（含 U+3000）丢弃；其它字符报错，报字符、码点与从 1 开始的字符下标（按码点计）。
 * 英文位名是两个字母，落单的 g / G 按非法字符报错。
 */
export function parseBits(input: string): string {
  const chars = Array.from(input);
  let out = "";
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (WHITESPACE.has(ch)) {
      i += 1;
      continue;
    }
    if (ZERO_CHARS.has(ch)) {
      out += GU;
      i += 1;
      continue;
    }
    if (ONE_CHARS.has(ch)) {
      out += GA;
      i += 1;
      continue;
    }
    if (ch === "g" || ch === "G") {
      const next = chars[i + 1];
      if (next === "u" || next === "U") {
        out += GU;
        i += 2;
        continue;
      }
      if (next === "a" || next === "A") {
        out += GA;
        i += 2;
        continue;
      }
    }
    throw illegalChar(ch, i + 1);
  }
  return out;
}

/** 把内部位流按方言渲染成输出串（--en 每位两个字母，长度翻倍）。 */
export function renderBits(bits: string, dialect: Dialect): string {
  if (dialect === "zh") return bits;
  const [zero, one] = DIALECT_NAMES[dialect];
  let out = "";
  for (const ch of bits) {
    if (ch === GU) {
      out += zero;
      continue;
    }
    if (ch === GA) {
      out += one;
      continue;
    }
    throw new GgtError("位流里出现非位字符“" + ch + "”（" + codePointLabel(ch) + "）", 1);
  }
  return out;
}

/** 无符号解释：位流按高位在前转成 BigInt。 */
export function bitsToBigInt(bits: string): bigint {
  let value = 0n;
  for (const ch of bits) {
    if (ch === GU) {
      value <<= 1n;
      continue;
    }
    if (ch === GA) {
      value = (value << 1n) | 1n;
      continue;
    }
    throw new GgtError("位流里出现非位字符“" + ch + "”（" + codePointLabel(ch) + "）", 1);
  }
  return value;
}

/** 取 value 的低 width 位，高位在前（负数按补码截断，与语言端 intToBits 一致）。 */
export function bigIntToBits(value: bigint, width: number): string {
  if (width < 0) throw new RangeError("位宽不能为负：" + width);
  const mask = (1n << BigInt(width)) - 1n;
  const unsigned = value & mask;
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) {
    out += ((unsigned >> BigInt(i)) & 1n) === 1n ? GA : GU;
  }
  return out;
}

export const INT64_MIN = -(1n << 63n);
export const INT64_MAX = (1n << 63n) - 1n;
const INT64_MOD = 1n << 64n;

/** 64 位补码（高位在前）→ 有符号整数。长度不是 64 位即错误。 */
export function bitsToInt64(bits: string): bigint {
  if (bits.length !== 64) {
    throw new GgtError("int64 需要恰好 64 位，实际 " + bits.length + " 位", 1);
  }
  const unsigned = bitsToBigInt(bits);
  return unsigned >= 1n << 63n ? unsigned - INT64_MOD : unsigned;
}

/** 检查位流是整字节，返回字节数（不是 8 的倍数时报错，信息里带总位数）。 */
export function assertByteAligned(bits: string, what: string): number {
  if (bits.length % 8 !== 0) {
    throw new GgtError(what + "：位流总长 " + bits.length + " 位，不是 8 的倍数", 1);
  }
  return bits.length / 8;
}

export function bitsToBytes(bits: string): Uint8Array {
  const n = assertByteAligned(bits, "字节解码");
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = Number(bitsToBigInt(bits.slice(i * 8, i * 8 + 8)));
  }
  return out;
}

export function bytesToBits(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += bigIntToBits(BigInt(byte), 8);
  return out;
}

/**
 * 严格 UTF-8 解码：非法序列报错（不做替换字符兜底）。
 * ignoreBOM 打开，让 BOM 当普通内容处理，decode→encode 可无损往返。
 */
export function decodeUtf8Strict(bytes: Uint8Array, what: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new GgtError(what + "：字节序列不是合法 UTF-8", 1);
  }
}
