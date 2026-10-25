/**
 * 咕嘎翻译器 · plan 文件解析（宿主层 ASCII，行式）。
 * 语法见 CONTRACT.md §3；任何语法问题都给行号并以退出码 3 结束。
 */

import { GgtError } from "./bits.ts";

export type Slot =
  | { kind: "int64" }
  | { kind: "bits"; n: number }
  | { kind: "bytes"; n: number }
  | { kind: "bool" };

const POSITIVE_INT = /^[0-9]+$/;
const SPACES = /[ \t]+/;
const KNOWN_TYPES = ["int64", "bits", "bytes", "bool"];

function fail(lineNumber: number, detail: string): never {
  throw new GgtError("plan 第 " + lineNumber + " 行：" + detail, 3);
}

/** 解析整份 plan 文本；行号从 1 起，空行与 # 开头的行跳过。 */
export function parsePlan(text: string): Slot[] {
  const slots: Slot[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = lines[i].trim();
    if (line === "" || line.startsWith("#")) continue;
    const tokens = line.split(SPACES);
    const head = tokens[0];

    if (head === "int64" || head === "bool") {
      if (tokens.length > 1) fail(lineNumber, "类型 " + head + " 不接受参数，多出“" + tokens.slice(1).join(" ") + "”");
      slots.push(head === "int64" ? { kind: "int64" } : { kind: "bool" });
      continue;
    }

    if (head === "bits" || head === "bytes") {
      if (tokens.length < 2) fail(lineNumber, "类型 " + head + " 缺少参数（应为正整数）");
      if (tokens.length > 2) fail(lineNumber, "类型 " + head + " 只接受一个参数，多出“" + tokens.slice(2).join(" ") + "”");
      const raw = tokens[1];
      if (!POSITIVE_INT.test(raw)) fail(lineNumber, "参数“" + raw + "”不是正整数");
      const n = Number(raw);
      if (!Number.isSafeInteger(n) || n <= 0) fail(lineNumber, "参数“" + raw + "”不是可表示的正整数");
      slots.push(head === "bits" ? { kind: "bits", n } : { kind: "bytes", n });
      continue;
    }

    if (KNOWN_TYPES.includes(head)) fail(lineNumber, "类型 " + head + " 用法不合法");
    fail(lineNumber, "未知类型名“" + head + "”");
  }
  return slots;
}

/** 槽位的位宽。 */
export function slotWidth(slot: Slot): number {
  switch (slot.kind) {
    case "int64":
      return 64;
    case "bool":
      return 8;
    case "bits":
      return slot.n;
    case "bytes":
      return slot.n * 8;
  }
}

/** 槽位的人类可读名字，用于错误信息。 */
export function slotLabel(slot: Slot): string {
  switch (slot.kind) {
    case "int64":
      return "int64";
    case "bool":
      return "bool";
    case "bits":
      return "bits " + slot.n;
    case "bytes":
      return "bytes " + slot.n;
  }
}
