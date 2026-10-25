/**
 * 咕嘎翻译器 · 五种解码模式 + 无模式猜测（CONTRACT.md §2.1）。
 * 这里只接收“已解析成纯位流”的字符串，不做输入字符校验。
 */

import {
  GgtError,
  GU,
  GA,
  assertByteAligned,
  bitsToBytes,
  bitsToInt64,
  decodeUtf8Strict,
} from "./bits.ts";
import { slotLabel, slotWidth } from "./plan.ts";
import type { Slot } from "./plan.ts";

export type DecodeMode =
  | { kind: "plan"; slots: Slot[] }
  | { kind: "int64" }
  | { kind: "bytes" }
  | { kind: "hex" }
  | { kind: "bits" };

export interface DecodeOutcome {
  /** 写到 stdout 的内容（是否带结尾换行由模式决定）。 */
  output: string;
  /** 猜模式时要打到 stderr 的说明；显式模式为 null。 */
  note: string | null;
}

const HEX_BYTES_PER_ROW = 16;
const BIT_GROUPS_PER_LINE = 8;
const BIT_GROUP_SIZE = 8;

function hexByte(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

function asciiByte(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".";
}

function decodeInt64(bits: string): string {
  if (bits.length % 64 !== 0) {
    throw new GgtError("--int64：位流总长 " + bits.length + " 位，不是 64 的倍数", 1);
  }
  let out = "";
  for (let i = 0; i < bits.length; i += 64) {
    out += bitsToInt64(bits.slice(i, i + 64)).toString() + "\n";
  }
  return out;
}

function decodeBytes(bits: string): string {
  const bytes = bitsToBytes(bits); // 内部检查 8 的倍数
  return decodeUtf8Strict(bytes, "--bytes");
}

function decodeHex(bits: string): string {
  const bytes = bitsToBytes(bits);
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += HEX_BYTES_PER_ROW) {
    const row = bytes.subarray(offset, offset + HEX_BYTES_PER_ROW);
    const hex = Array.from(row, hexByte).join(" ");
    const ascii = Array.from(row, asciiByte).join("");
    const offsetText = offset.toString(16).toUpperCase().padStart(4, "0");
    lines.push(offsetText + ": " + hex + "  |" + ascii + "|");
  }
  return lines.length === 0 ? "" : lines.join("\n") + "\n";
}

function decodeBitsMode(bits: string): string {
  const groups: string[] = [];
  for (let i = 0; i < bits.length; i += BIT_GROUP_SIZE) {
    groups.push(bits.slice(i, i + BIT_GROUP_SIZE));
  }
  const lines: string[] = [];
  for (let i = 0; i < groups.length; i += BIT_GROUPS_PER_LINE) {
    lines.push(groups.slice(i, i + BIT_GROUPS_PER_LINE).join(" "));
  }
  return lines.join("\n");
}

function decodePlan(bits: string, slots: Slot[]): string {
  const lines: string[] = [];
  let pos = 0;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const width = slotWidth(slot);
    const label = "plan 第 " + (index + 1) + " 个槽位（" + slotLabel(slot) + "）";
    const remaining = bits.length - pos;
    if (remaining < width) {
      throw new GgtError(label + "需要 " + width + " 位，但只剩 " + remaining + " 位", 1);
    }
    const chunk = bits.slice(pos, pos + width);
    pos += width;
    switch (slot.kind) {
      case "int64":
        lines.push(bitsToInt64(chunk).toString());
        break;
      case "bits":
        lines.push(chunk);
        break;
      case "bytes":
        lines.push(decodeUtf8Strict(bitsToBytes(chunk), label));
        break;
      case "bool":
        lines.push(decodeBool(chunk, label));
        break;
    }
  }
  if (pos < bits.length) {
    throw new GgtError("plan 已消费完所有槽位，但还剩 " + (bits.length - pos) + " 位", 1);
  }
  return lines.length === 0 ? "" : lines.join("\n") + "\n";
}

/** 语言端只定义 8 个 咕 = 假、8 个 嘎 = 真；混合位视为损坏输入。 */
function decodeBool(chunk: string, label: string): string {
  if (chunk === GU.repeat(8)) return "假";
  if (chunk === GA.repeat(8)) return "真";
  throw new GgtError(label + "：8 位既不是全 咕 也不是全 嘎，不是合法布尔", 1);
}

export function decodeBits(bits: string, mode: DecodeMode): DecodeOutcome {
  switch (mode.kind) {
    case "int64":
      return { output: decodeInt64(bits), note: null };
    case "bytes":
      return { output: decodeBytes(bits), note: null };
    case "hex":
      return { output: decodeHex(bits), note: null };
    case "bits":
      return { output: decodeBitsMode(bits), note: null };
    case "plan":
      return { output: decodePlan(bits, mode.slots), note: null };
  }
}

/** 无模式参数的猜测：64 的倍数 → int64；否则 8 的倍数 → bytes；否则 bits。 */
export function guessMode(bits: string): { mode: DecodeMode; note: string } {
  const n = bits.length;
  if (n % 64 === 0) {
    return {
      mode: { kind: "int64" },
      note: "--int64（位流共 " + n + " 位，是 64 的倍数）",
    };
  }
  if (n % 8 === 0) {
    return {
      mode: { kind: "bytes" },
      note: "--bytes（位流共 " + n + " 位，不是 64 的倍数但是 8 的倍数）",
    };
  }
  return {
    mode: { kind: "bits" },
    note: "--bits（位流共 " + n + " 位，既不是 64 也不是 8 的倍数）",
  };
}
