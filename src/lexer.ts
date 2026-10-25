/**
 * 咕咕嘎嘎语 · 词法器（SPEC.md §1.1 / §2）。
 * 三方言（中文 咕/嘎、日语 グ/ガ（含 ぐ/が）、英文 GU/GA（大小写任意））逐位置归一化：
 * 记号文本与字面量位串一律是 咕/嘎，语法与语义层看不到方言差异。
 * 行/列按源码原始码位计：英文位名 GU 占两列；位置取记号起点。
 * 出错一律抛 GgError：E1001 非法字符、E1002 缩进错误、E1003 孤立标点/缺位串。
 */

import { CODE, GgError } from "./errors.ts";
import {
  COLON,
  VAL,
  canonicalBit,
  isBangChar,
  isBitLetter,
  isColonChar,
  isIndentSpace,
  isQuesChar,
  matchBit,
  type Token,
} from "./keywords.ts";

const codePointLabel = (ch: string): string => {
  const value = ch.codePointAt(0) ?? 0;
  return "U+" + value.toString(16).toUpperCase().padStart(4, "0");
};

interface ScannedWord {
  /** 归一化后的字串（只含 咕/嘎） */
  text: string;
  /** 同一串的位串（只含 0/1） */
  bits: string;
  /** 字串结束处的码位下标 */
  end: number;
}

/** 从 chars[start] 起读一段连续位（三方言可混排）；一个位都读不到时返回 null */
function scanWord(chars: readonly string[], start: number): ScannedWord | null {
  let i = start;
  let bits = "";
  while (i < chars.length) {
    const matched = matchBit(chars, i);
    if (matched === null) break;
    bits += matched.bit;
    i += matched.width;
  }
  if (i === start) return null;
  let text = "";
  for (const bit of bits) text += bit === "1" ? canonicalBit("1") : canonicalBit("0");
  return { text, bits, end: i };
}

/** E1001：落单的英文位名字母给专门的说明（SPEC §1.2 / §9） */
function illegalChar(ch: string, line: number, col: number): never {
  const where = "（" + codePointLabel(ch) + "）";
  if (isBitLetter(ch)) {
    throw new GgError(
      CODE.IllegalChar,
      { line, col },
      "非法字符“" + ch + "”" + where + "：英文位名要两个字母（GU / GA），且首位必须是 G",
    );
  }
  throw new GgError(CODE.IllegalChar, { line, col }, "非法字符“" + ch + "”" + where);
}

/** SPEC §2：把源码切成记号序列（末尾有且只有一个 EOF） */
export function tokenize(src: string): Token[] {
  const lines = src.split("\r\n").join("\n").split("\n");
  const tokens: Token[] = [];
  const indents: number[] = [0];
  let started = false;

  for (let li = 0; li < lines.length; li += 1) {
    const chars = [...lines[li]];
    const line = li + 1;
    let indent = 0;
    while (indent < chars.length && isIndentSpace(chars[indent])) indent += 1;
    if (indent === chars.length) continue; // 只含空格的行（半角或全角）整行忽略

    const lineTokens: Token[] = [];
    let i = indent;
    while (i < chars.length) {
      const ch = chars[i];
      if (isIndentSpace(ch)) {
        i += 1;
        continue;
      }
      if (isColonChar(ch)) {
        // 行末冒号糖：冒号后只隔空格就到行尾（或文件结尾）时等价于没写
        let after = i + 1;
        while (after < chars.length && isIndentSpace(chars[after])) after += 1;
        if (after < chars.length) lineTokens.push({ kind: "COLON", text: COLON, line, col: i + 1 });
        i += 1;
        continue;
      }
      if (isBangChar(ch) || isQuesChar(ch)) {
        throw new GgError(CODE.StrayPunct, { line, col: i + 1 }, "孤立标点“" + ch + "”：前面没有字串");
      }

      const word = scanWord(chars, i);
      if (word === null) illegalChar(ch, line, i + 1);
      const suffix = chars[word.end];
      if (suffix !== undefined && isBangChar(suffix)) {
        const isAct = word.end + 1 < chars.length && isQuesChar(chars[word.end + 1]);
        lineTokens.push({ kind: isAct ? "ACT" : "DECL", text: word.text, line, col: i + 1 });
        i = word.end + (isAct ? 2 : 1);
        continue;
      }
      if (suffix !== undefined && isQuesChar(suffix)) {
        const token: Token = { kind: "VAL", text: word.text, line, col: i + 1 };
        i = word.end + 1;
        const def = VAL[word.text];
        if (def !== undefined && (def.kind === "intlit" || def.kind === "bitslit")) {
          const bitsWord = scanWord(chars, i);
          if (bitsWord === null) {
            throw new GgError(CODE.StrayPunct, { line, col: token.col }, "字面量“" + word.text + "？”缺少紧贴的位串");
          }
          token.bits = bitsWord.text; // Token.bits 是规范 咕/嘎 位串，不是 0/1
          i = bitsWord.end;
        }
        lineTokens.push(token);
        continue;
      }
      lineTokens.push({ kind: "WORD", text: word.text, line, col: i + 1 });
      i = word.end;
    }

    if (lineTokens.length === 0) continue; // 只剩被糖化的冒号，等价空行

    if (!started) {
      started = true;
      if (indent !== 0) {
        throw new GgError(CODE.Indent, { line, col: 1 }, "缩进错误：第一条语句必须顶格（缩进为 0）");
      }
    } else {
      const top = indents[indents.length - 1];
      if (indent > top) {
        indents.push(indent);
        tokens.push({ kind: "INDENT", text: "", line, col: indent + 1 });
      } else if (indent < top) {
        while (indents.length > 1 && indents[indents.length - 1] > indent) {
          indents.pop();
          tokens.push({ kind: "DEDENT", text: "", line, col: indent + 1 });
        }
        if (indents[indents.length - 1] !== indent) {
          throw new GgError(CODE.Indent, { line, col: indent + 1 }, "缩进错误：回退到了未定义的缩进层级");
        }
      }
    }

    for (const token of lineTokens) tokens.push(token);
    tokens.push({ kind: "NEWLINE", text: "", line, col: chars.length + 1 });
  }

  const endChars = [...lines[lines.length - 1]];
  const endLine = lines.length;
  const endCol = endChars.length + 1;
  while (indents.length > 1) {
    indents.pop();
    tokens.push({ kind: "DEDENT", text: "", line: endLine, col: endCol });
  }
  tokens.push({ kind: "EOF", text: "", line: endLine, col: endCol });
  return tokens;
}
