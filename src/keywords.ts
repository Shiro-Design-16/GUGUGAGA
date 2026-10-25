/**
 * 咕咕嘎嘎语 · 契约层：字符常量、记号、保留字总表。
 * 词法器与语法器都只认这里的一张表；任何改动必须同步 SPEC.md §2/§3。
 */

export const GU = "咕";
export const GA = "嘎";
export const BANG = "！";
export const QUES = "？";
export const COLON = "：";
export const SPACE = " ";
export const LF = "\n";

/** 记号种类 */
export type TokenKind =
  | "WORD"
  | "DECL"
  | "ACT"
  | "VAL"
  | "COLON"
  | "NEWLINE"
  | "INDENT"
  | "DEDENT"
  | "EOF";

export interface Token {
  kind: TokenKind;
  /** 字串本身；COLON 为 "："；NEWLINE/INDENT/DEDENT/EOF 为空串 */
  text: string;
  /** 位串字面量紧随的位串（仅整数/位串字面量有值，形如 "咕嘎咕"） */
  bits?: string;
  line: number;
  col: number;
}

export type BinOp =
  | "Add"
  | "Sub"
  | "Mul"
  | "Div"
  | "Mod"
  | "Eq"
  | "Lt"
  | "Gt"
  | "And"
  | "Or";

export type UnOp = "Not" | "Neg";

/** 取值词（后缀 ？）的三种身份：运算符 / 字面量标记 / 其它（读名字） */
export type ValWord =
  | { kind: "bin"; op: BinOp }
  | { kind: "un"; op: UnOp }
  | { kind: "intlit" }
  | { kind: "bitslit" }
  | { kind: "bool"; value: boolean }
  | { kind: "null" };

export type BareWord = "Print" | "Return" | "If" | "Else" | "While" | "This" | "ReadByte";
export type DeclWord = "Class" | "Method" | "Entry" | "New";
export type ActWord = "Bind" | "ExprStmt";

/** 裸词引导符（无后缀） */
export const BARE: Readonly<Record<string, BareWord>> = {
  "咕": "Print",
  "嘎嘎": "Return",
  "嘎嘎嘎": "If",
  "嘎嘎嘎嘎": "Else",
  "嘎嘎嘎嘎嘎": "While",
  "嘎嘎嘎嘎嘎嘎": "This",
  "嘎嘎嘎嘎嘎嘎嘎": "ReadByte",
};

/** 声明词（后缀 ！） */
export const DECL: Readonly<Record<string, DeclWord>> = {
  "咕咕": "Class",
  "咕咕嘎": "Method",
  "咕咕嘎嘎": "Entry",
  "咕嘎嘎": "New",
};

/** 动作词（后缀 ！？） */
export const ACT: Readonly<Record<string, ActWord>> = {
  "咕咕": "Bind",
  "咕嘎": "ExprStmt",
};

/** 取值词（后缀 ？） */
export const VAL: Readonly<Record<string, ValWord>> = {
  "咕": { kind: "bin", op: "Add" },
  "咕咕": { kind: "bin", op: "Sub" },
  "咕嘎": { kind: "bin", op: "Mul" },
  "咕咕咕": { kind: "bin", op: "Div" },
  "咕咕嘎": { kind: "bin", op: "Mod" },
  "咕嘎咕": { kind: "bin", op: "Eq" },
  "咕嘎嘎": { kind: "bin", op: "Lt" },
  "咕嘎嘎咕": { kind: "bin", op: "Gt" },
  "咕嘎咕咕": { kind: "bin", op: "And" },
  "咕嘎咕嘎": { kind: "bin", op: "Or" },
  "咕咕咕咕": { kind: "un", op: "Not" },
  "咕咕嘎咕": { kind: "un", op: "Neg" },
  "嘎嘎嘎": { kind: "intlit" },
  "嘎嘎嘎嘎": { kind: "bitslit" },
  "嘎嘎": { kind: "bool", value: true },
  "嘎嘎咕": { kind: "bool", value: false },
  "嘎咕": { kind: "null" },
};

/** 四张表的键的并集（21 个保留词）：名字不得与之相同 */
export function isReserved(word: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(BARE, word) ||
    Object.prototype.hasOwnProperty.call(DECL, word) ||
    Object.prototype.hasOwnProperty.call(ACT, word) ||
    Object.prototype.hasOwnProperty.call(VAL, word)
  );
}

/** 位串字符 → 位；咕=0，嘎=1；其它字符返回 null */
export function bitOf(ch: string): "0" | "1" | null {
  if (ch === GU) return "0";
  if (ch === GA) return "1";
  return null;
}

/** 方言：位 0 的单码位拼写（中文与日语）；英文位名是两字母，另见 matchBit */
export const BIT_ZERO: readonly string[] = [GU, "グ", "ぐ"];

/** 方言：位 1 的单码位拼写（中文与日语） */
export const BIT_ONE: readonly string[] = [GA, "ガ", "が"];

/** 标点与空白的方言等价写法（SPEC §1.1） */
export const BANG_SPELLINGS: readonly string[] = [BANG, "!"];
export const QUES_SPELLINGS: readonly string[] = [QUES, "?"];
export const COLON_SPELLINGS: readonly string[] = [COLON, ":"];
/** 缩进/间隔空格：半角与全角各算一格（SPEC §1.1 / §2.2） */
export const SPACE_SPELLINGS: readonly string[] = [SPACE, "\u3000"];

export function isBangChar(ch: string): boolean {
  return ch === BANG || ch === "!";
}

export function isQuesChar(ch: string): boolean {
  return ch === QUES || ch === "?";
}

export function isColonChar(ch: string): boolean {
  return ch === COLON || ch === ":";
}

export function isIndentSpace(ch: string): boolean {
  return ch === SPACE || ch === "\u3000";
}

/** 英文位名只会用到这三个字母（任意大小写，SPEC §1.1） */
const BIT_LETTERS: ReadonlySet<string> = new Set(["g", "G", "u", "U", "a", "A"]);

export function isBitLetter(ch: string): boolean {
  return BIT_LETTERS.has(ch);
}

export interface BitMatch {
  bit: "0" | "1";
  /** 占几个码位：中日单码位为 1，英文两字母为 2 */
  width: 1 | 2;
}

/**
 * 从 chars[i] 起匹配一位（SPEC §1.1）：
 * 咕/グ/ぐ = 0，嘎/ガ/が = 1；GU 的四种大小写 = 0，GA 的四种大小写 = 1。
 * 不匹配（含落单的 g/G）返回 null，由调用方报 E1001。
 */
export function matchBit(chars: readonly string[], i: number): BitMatch | null {
  const ch = chars[i];
  if (ch === undefined) return null;
  if (BIT_ZERO.includes(ch)) return { bit: "0", width: 1 };
  if (BIT_ONE.includes(ch)) return { bit: "1", width: 1 };
  if (ch === "g" || ch === "G") {
    const next = chars[i + 1];
    if (next === "u" || next === "U") return { bit: "0", width: 2 };
    if (next === "a" || next === "A") return { bit: "1", width: 2 };
  }
  return null;
}

/** 位的规范拼写：词法器把所有方言归一成 咕/嘎 */
export function canonicalBit(bit: "0" | "1"): string {
  return bit === "0" ? GU : GA;
}

/** 字符是否属于可出现在源码里的字符集（三方言全字符，SPEC §1.1） */
export function isSourceChar(ch: string): boolean {
  return (
    BIT_ZERO.includes(ch) ||
    BIT_ONE.includes(ch) ||
    isBitLetter(ch) ||
    isBangChar(ch) ||
    isQuesChar(ch) ||
    isColonChar(ch) ||
    isIndentSpace(ch) ||
    ch === LF
  );
}

/** 源文件后缀（SPEC §1.4）：CLI 与 VS Code 扩展共用，大小写不敏感 */
export const PROGRAM_SUFFIXES: readonly string[] = [".咕咕", ".ググ", ".gu", ".gugugaga"];

export function hasProgramSuffix(name: string): boolean {
  const lower = name.toLowerCase();
  return PROGRAM_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/** 输出与诊断使用的方言（SPEC §1.4）：由文件后缀决定 */
export type Dialect = "zh" | "ja" | "en";

/** 位 0 / 位 1 在各方言里的字形：中文 咕/嘎，日语 グ/ガ，英语 GU/GA（全大写） */
const DIALECT_GLYPHS: Readonly<Record<Dialect, readonly string[]>> = {
  zh: [GU, GA],
  ja: ["グ", "ガ"],
  en: ["GU", "GA"],
};

/**
 * 文件后缀 → 输出方言（SPEC §1.4）：
 * .咕咕 → zh；.ググ → ja；.gu / .gugugaga（大小写不敏感）→ en；
 * 无后缀、其它后缀、空串 → zh。
 */
export function dialectOfFile(fileName: string): Dialect {
  if (fileName.endsWith(".咕咕")) return "zh";
  if (fileName.endsWith(".ググ")) return "ja";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".gugugaga") || lower.endsWith(".gu")) return "en";
  return "zh";
}

/**
 * 规范位串（咕/嘎）→ 指定方言的字形。
 * 位串以外没有别的字符；万一有，原样保留（于是只有英式两字母会让长度翻倍）。
 */
export function renderBits(bits: string, dialect: Dialect): string {
  if (dialect === "zh") return bits;
  const [zero, one] = DIALECT_GLYPHS[dialect];
  let out = "";
  for (const ch of bits) {
    const bit = bitOf(ch);
    out += bit === "0" ? zero : bit === "1" ? one : ch;
  }
  return out;
}

/** 位串 → BigInt（左起为高位） */
export function bitsToInt(bits: string): bigint {
  let v = 0n;
  for (const ch of bits) {
    const b = bitOf(ch);
    if (b === null) throw new Error("位串里出现非 咕/嘎 字符");
    v = (v << 1n) | (b === "1" ? 1n : 0n);
  }
  return v;
}

/** BigInt → 定长 width 位补码位串（咕/嘎，高位在前，超出取低 width 位） */
export function intToBits(value: bigint, width: number): string {
  const mask = (1n << BigInt(width)) - 1n;
  const u = value & mask;
  let out = "";
  for (let i = width - 1; i >= 0; i--) {
    out += ((u >> BigInt(i)) & 1n) === 1n ? GA : GU;
  }
  return out;
}
