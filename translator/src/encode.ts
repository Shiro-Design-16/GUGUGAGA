/**
 * 咕嘎翻译器 · 编码方向（CONTRACT.md §2.2）。
 *
 * 文本模式按 UTF-8 逐字节输出；int64 模式按 64 位补码输出；
 * --as-literal 加上语言端字面量前缀，方便粘回 .咕咕 源码。
 */

import { GgtError, INT64_MAX, INT64_MIN, bigIntToBits, renderBits } from "./bits.ts";
import type { Dialect } from "./bits.ts";

/** 字符串字面量前缀：4 个 嘎 + ？ */
export const TEXT_LITERAL_PREFIX = "嘎嘎嘎嘎？";
/** 整数字面量前缀：3 个 嘎 + ？（源码里没有负数字面量） */
export const INT_LITERAL_PREFIX = "嘎嘎嘎？";

/** 字面量前缀按方言渲染：位名换方言，标点日语全角、英语半角（SPEC §1.1）。 */
export function literalPrefix(kind: "text" | "int", dialect: Dialect): string {
  const bits = kind === "text" ? "嘎嘎嘎嘎" : "嘎嘎嘎";
  return renderBits(bits, dialect) + (dialect === "en" ? "?" : "？");
}

const ASCII_WHITESPACE = new Set([" ", "\t", "\n", "\r"]);
const DIGITS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

export function encodeText(text: string, dialect: Dialect = "zh"): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (const byte of bytes) out += bigIntToBits(BigInt(byte), 8);
  return renderBits(out, dialect);
}

/** 按空白（空格 / 制表符 / 换行 / 回车）切出十进制记号，连续空白折叠。 */
export function parseDecimalTokens(text: string): string[] {
  const tokens: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ASCII_WHITESPACE.has(ch)) {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current !== "") tokens.push(current);
  return tokens;
}

function isAllDigits(text: string): boolean {
  if (text === "") return false;
  for (const ch of text) {
    if (!DIGITS.has(ch)) return false;
  }
  return true;
}

/** 解析一个十进制记号：只允许可选负号 + 数字，且必须落在 int64 范围内。 */
export function parseInt64Token(token: string): bigint {
  const negative = token.startsWith("-");
  const digits = negative ? token.slice(1) : token;
  if (!isAllDigits(digits)) {
    throw new GgtError("非法整数“" + token + "”", 1);
  }
  const magnitude = BigInt(digits);
  const value = negative ? -magnitude : magnitude;
  if (value < INT64_MIN || value > INT64_MAX) {
    throw new GgtError("整数 " + value.toString() + " 超出 int64 范围（-2^63 .. 2^63-1）", 1);
  }
  return value;
}

/** 正整数的无符号二进制位串（最短形式；0 记成单个 咕）。 */
export function unsignedValueBits(value: bigint): string {
  const binary = value.toString(2);
  let out = "";
  for (const ch of binary) out += ch === "1" ? "嘎" : "咕";
  return out;
}

/** int64 模式：记号 → 位流；asLiteral 时每个值各带一个 嘎嘎嘎？ 前缀。 */
export function encodeInts(tokens: string[], asLiteral: boolean, dialect: Dialect = "zh"): string {
  let out = "";
  for (const token of tokens) {
    const value = parseInt64Token(token);
    if (asLiteral) {
      if (value < 0n) {
        throw new GgtError(
          "字面量模式不支持负数 " + value.toString() + "：源码没有负数字面量，请用 咕咕嘎咕？ 取负",
          1,
        );
      }
      out += literalPrefix("int", dialect) + renderBits(unsignedValueBits(value), dialect);
    } else {
      out += renderBits(bigIntToBits(value, 64), dialect);
    }
  }
  return out;
}
