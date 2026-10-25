/**
 * 咕咕嘎嘎语 · 契约层：错误码、GgError、诊断帧。
 * SPEC.md §9 是错误码的权威列表，这里的 CODE 表必须与之一致；
 * SPEC.md §12.3 规定 code 数值 = 本表下标 + 1，所以**顺序是协议的一部分，v1 期间不得重排**。
 */

import type { Pos } from "./ast.ts";
import type { Dialect } from "./keywords.ts";
import { encodeDiag, EVENT } from "./wire.ts";

export const CODE = {
  IllegalChar: "E1001",
  Indent: "E1002",
  StrayPunct: "E1003",
  Syntax: "E2001",
  EmptyBlock: "E2002",
  DupClass: "E3001",
  DupEntry: "E3002",
  NoEntry: "E3003",
  CyclicInherit: "E3004",
  UnknownParent: "E3005",
  UndefinedName: "E4001",
  UndefinedMethod: "E4002",
  UnknownField: "E4003",
  TypeMismatch: "E4004",
  DivideByZero: "E4005",
  NotOutputable: "E4006",
  BadCtor: "E4007",
  StaticThis: "E4008",
  StepLimit: "E4010",
  DepthLimit: "E4011",
  BadReceiver: "E4012",
} as const;

export type CodeName = keyof typeof CODE;

/** CODE 表的稳定顺序（SPEC.md §12.3 的唯一真源）。 */
const CODE_ORDER: readonly string[] = Object.values(CODE);

/** 错误码名 → GGDIAG 事件码（1..21）。未知码退回 24（内部错误），绝不冒充语言错误。 */
export function codeNumber(code: string): number {
  const index = CODE_ORDER.indexOf(code);
  return index === -1 ? EVENT.INTERNAL : index + 1;
}

export class GgError extends Error {
  readonly code: string;
  readonly pos: Pos | null;

  constructor(code: string, pos: Pos | null, message: string) {
    super(message);
    this.name = "GgError";
    this.code = code;
    this.pos = pos;
  }
}

/** 退出码（SPEC.md §8） */
export const EXIT = {
  OK: 0,
  RUNTIME: 1,
  STATIC: 2,
  USAGE: 3,
} as const;

/**
 * 把 GgError 变成一帧（不含结尾换行）：
 * 码 = CODE 表下标 + 1，位置取 err.pos，正文取 err.message。
 * 文件名与源码行都不进帧——帧里没有这两个字段，解码端靠位置自己定位。
 * dialect 只决定 0/1 画成哪种字形，帧的位结构不变（SPEC §1.4）。
 */
export function frameOfError(err: GgError, dialect: Dialect = "zh"): string {
  return encodeDiag(codeNumber(err.code), err.pos, err.message, dialect);
}
