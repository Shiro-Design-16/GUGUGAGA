/**
 * 测试专用 GGDIAG v1 解码器（SPEC.md §12）。
 *
 * 刻意**不**从 src/wire.ts 复用编码器：解码端是独立预言机，
 * 用自己的位移逻辑把 咕/嘎 还原成人话。于是「外壳只吐位流」这件事
 * 是在不信任被测代码的前提下被验证的（也不 import translator/，那是姊妹项目）。
 */

export interface DiagFrame {
  /** 事件码：0 用法 / 1..21 语言错误 / 22 帮助 / 23 读文件失败 / 24 内部错误 */
  code: number;
  /** 1 基行号；0 = 无位置 */
  line: number;
  /** 1 基列号；0 = 无位置 */
  col: number;
  /** 帧正文（人类语言原文的 UTF-8） */
  message: string;
}

/** magic 4 位 1010 + version 2 位 00（SPEC.md §12.2） */
const MAGIC_VERSION = "101000";
/** end 3 位 110 */
const END = "110";

/**
 * 过滤掉一切非位字符，再翻成 0/1 位串（解码只跟 0/1 打交道）。
 * 三种字形都认：咕/グ = 0，嘎/ガ = 1；英语的两位字母 GU = 0、GA = 1（大小写不敏感）。
 */
export function bitStream(stream: string): string {
  const chars = [...stream];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch === "咕" || ch === "グ") out += "0";
    else if (ch === "嘎" || ch === "ガ") out += "1";
    else if (ch === "G" || ch === "g") {
      const next = chars[i + 1];
      if (next === "U" || next === "u") {
        out += "0";
        i += 1;
      } else if (next === "A" || next === "a") {
        out += "1";
        i += 1;
      }
    }
  }
  return out;
}

/** 取定宽无符号整数（MSB 在前）。 */
function readUint(bits: string, at: number, width: number): number {
  let value = 0;
  for (let i = 0; i < width; i += 1) value = (value << 1) | (bits[at + i] === "1" ? 1 : 0);
  return value;
}

/** 把整段 stderr 解成帧数组；magic/version/end 不符或位数不够的帧丢弃后继续找下一帧。 */
export function decodeFrames(stream: string): DiagFrame[] {
  const bits = bitStream(stream);
  const frames: DiagFrame[] = [];
  let at = 0;
  while (at + 65 <= bits.length) {
    if (bits.slice(at, at + 6) !== MAGIC_VERSION) {
      at += 1;
      continue;
    }
    const code = readUint(bits, at + 6, 8);
    const line = readUint(bits, at + 14, 16);
    const col = readUint(bits, at + 30, 16);
    const mlen = readUint(bits, at + 46, 16);
    const msgStart = at + 62;
    const msgEnd = msgStart + mlen * 8;
    if (msgEnd + 3 > bits.length || bits.slice(msgEnd, msgEnd + 3) !== END) {
      at += 1;
      continue;
    }
    const bytes: number[] = [];
    for (let i = 0; i < mlen; i += 1) bytes.push(readUint(bits, msgStart + i * 8, 8));
    frames.push({ code, line, col, message: Buffer.from(bytes).toString("utf8") });
    at = msgEnd + 3;
  }
  return frames;
}

/** 恰好一帧时返回它；帧数不对直接失败（测试里当断言用）。 */
export function decodeOne(stream: string): DiagFrame {
  const frames = decodeFrames(stream);
  if (frames.length !== 1) {
    throw new Error("期望恰好 1 帧，实际 " + frames.length + " 帧；原文=" + JSON.stringify(stream));
  }
  return frames[0];
}
