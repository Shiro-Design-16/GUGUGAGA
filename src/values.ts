/**
 * 咕咕嘎嘎语 · 值模型与输出编码（SPEC.md §5.1 / §6）。
 */

import { CODE, GgError } from "./errors.ts";
import { GA, GU, intToBits } from "./keywords.ts";

export type Value =
  | { t: "int"; v: bigint }
  | { t: "bits"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "null" }
  | { t: "obj"; v: GgObject };

export interface GgObject {
  cls: string;
  fields: Map<string, Value>;
}

/**
 * 按 SPEC.md §6 把值编码成裸位流：整数 64 位补码、位串原样、布尔 8 位；
 * 空与对象不可输出（E4006，位置由调用方补上）。
 */
export function bitsOf(v: Value): string {
  switch (v.t) {
    case "int":
      return intToBits(v.v, 64);
    case "bits":
      return v.v;
    case "bool":
      return (v.v ? GA : GU).repeat(8);
    case "null":
      throw new GgError(CODE.NotOutputable, null, "空不能输出");
    case "obj":
      throw new GgError(CODE.NotOutputable, null, `对象（${v.v.cls}）不能输出`);
  }
}

/** 中文类型名，用于诊断 */
export function typeName(v: Value): string {
  switch (v.t) {
    case "int":
      return "整数";
    case "bits":
      return "位串";
    case "bool":
      return "布尔";
    case "null":
      return "空";
    case "obj":
      return "对象";
  }
}
