/**
 * 字符集与示例文件的「方言纯度」检查（SPEC.md §1.1 / §1.4 / §11）。
 *
 * 语言允许三方言在同一份文件里混用（SPEC §1.2），但示例文件按「一套方言一个文件」写：
 *   中文样例 = 咕 嘎 ！ ？ ： 半角空格
 *   日语样例 = グ ガ（含 ぐ が）！ ？ ： 全角空格 U+3000
 *   英语样例 = G U A g u a ! ? : 半角空格
 * 这样才看得出三套方言各自都能完整写出程序。
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROGRAM_SUFFIXES, hasProgramSuffix } from "../src/keywords.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = path.join(ROOT, "examples");
const SPEC = path.join(ROOT, "SPEC.md");
const FENCE = String.fromCharCode(96, 96, 96);

const ZH_CHARS: readonly string[] = ["咕", "嘎", "！", "？", "：", " ", "\n"];
const JA_CHARS: readonly string[] = ["グ", "ガ", "ぐ", "が", "！", "？", "：", "\u3000", " ", "\n"];
const EN_CHARS: readonly string[] = ["G", "U", "A", "g", "u", "a", "!", "?", ":", " ", "\n"];

const CHAR_ROLE = new Map<string, string>([
  ["咕", "位 0（中文）"],
  ["嘎", "位 1（中文）"],
  ["グ", "位 0（日语）"],
  ["ガ", "位 1（日语）"],
  ["ぐ", "位 0（日语平假名）"],
  ["が", "位 1（日语平假名）"],
  ["G", "英文位名 G"],
  ["g", "英文位名 g"],
  ["U", "英文位名 U"],
  ["u", "英文位名 u"],
  ["A", "英文位名 A"],
  ["a", "英文位名 a"],
  ["！", "声明/调用后缀"],
  ["!", "声明/调用后缀（半角）"],
  ["？", "取值/运算符/字面量后缀"],
  ["?", "取值/运算符/字面量后缀（半角）"],
  ["：", "引导符"],
  [":", "引导符（半角）"],
  [" ", "半角空格"],
  ["\u3000", "全角空格"],
  ["\n", "换行"],
]);

interface ExampleSpec {
  file: string;
  dialect: string;
  allowed: readonly string[];
}

/** examples/ 下每个文件的方言归属（文件名按码位排序后与本数组排序结果比对） */
const EXAMPLES_UNDER_TEST: readonly ExampleSpec[] = [
  { file: "咕咕嘎嘎.咕咕", dialect: "中文", allowed: ZH_CHARS },
  { file: "咕嘎咕嘎.咕咕", dialect: "中文", allowed: ZH_CHARS },
  { file: "咕嘎嘎咕.咕咕", dialect: "中文", allowed: ZH_CHARS },
  { file: "嘎咕嘎咕.咕咕", dialect: "中文", allowed: ZH_CHARS },
  { file: "嘎嘎咕咕.咕咕", dialect: "中文", allowed: ZH_CHARS },
  { file: "ガググガグ.ググ", dialect: "日语", allowed: JA_CHARS },
  { file: "gugugaga.gu", dialect: "英语", allowed: EN_CHARS },
];

const EXPECTED_EXAMPLES: readonly string[] = EXAMPLES_UNDER_TEST.map((spec) => spec.file).sort();

function describeChar(ch: string): string {
  const cp = ch.codePointAt(0);
  const hex = cp === undefined ? "?" : "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  const role = CHAR_ROLE.get(ch);
  if (role !== undefined) return ch + "（" + hex + "，" + role + "）";
  return JSON.stringify(ch) + "（" + hex + "）";
}

/** 逐字符检查：只允许该方言的字符；行/列按源码码位算，出错给出行列与字符码位。 */
function assertDialectChars(text: string, allowed: readonly string[], label: string): void {
  assert.ok(text.length > 0, label + "：内容为空");
  assert.ok(!text.startsWith("\uFEFF"), label + "：文件以 BOM 开头，SPEC §1 禁止 BOM");
  const allowedSet = new Set(allowed);
  let line = 1;
  let col = 1;
  for (const ch of text) {
    if (!allowedSet.has(ch)) {
      assert.fail(
        label + ":" + line + ":" + col + "：出现不属于该方言的字符 " + describeChar(ch) +
          "；本文件只允许 " + allowed.filter((c) => c !== "\n").join(" "),
      );
    }
    if (ch === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  assert.ok(!/\n\n$/.test(text), label + "：文件末尾不应有多个空行");
}

function readExample(name: string): string {
  return fs.readFileSync(path.join(EXAMPLES, name), "utf8");
}

/**
 * SPEC.md 的源文本：本地有可读副本时读它（仓库里当前那份产物是旧式全量位流化，围栏也被编码），
 * CI 里没有备份就读产物——新式产物的骨架与围栏逐字节保留，两种来源对下面的用例等价。
 */
function specSource(): string {
  // 读产物本身：围栏与骨架逐字节保留，标题里的字被换成位名，所以只能按内容定位。
  return fs.readFileSync(SPEC, "utf8");
}

/**
 * SPEC.md 里所有 ```text 围栏的正文。
 *
 * 按内容（而非标题里的数字）定位：产物的骨架与围栏逐字节保留，但标题里的数字已被位名替换，
 * 所以 "## 11." 这种锚点在产物里找不到——用标记串找围栏，读产物与读可读副本结果相同。
 */
function specTextFences(): string[] {
  const spec = specSource();
  const blocks: string[] = [];
  let cursor = 0;
  for (;;) {
    const fence = spec.indexOf(FENCE + "text", cursor);
    if (fence < 0) break;
    const bodyStart = spec.indexOf("\n", fence) + 1;
    const bodyEnd = spec.indexOf(FENCE, bodyStart);
    assert.ok(bodyEnd > bodyStart, "SPEC.md 里有没闭合的 text 围栏");
    blocks.push(spec.slice(bodyStart, bodyEnd));
    cursor = bodyEnd + FENCE.length;
  }
  assert.ok(blocks.length > 0, "SPEC.md 里找不到以 FENCE + text 开头的代码围栏");
  return blocks;
}

/** 含标记串的那段 text 围栏正文。 */
function specFenceWith(marker: string): string {
  const block = specTextFences().find((body) => body.includes(marker));
  assert.ok(block !== undefined, "SPEC.md 里找不到含「" + marker + "」的 text 围栏");
  return block;
}

/** SPEC §11 的最小可运行中文样例。 */
function specSample(): string {
  return specFenceWith("咕咕嘎嘎！");
}

test("examples/ 下恰好是这 7 个示例文件（5 中文 + 1 日语 + 1 英语）", () => {
  assert.ok(fs.existsSync(EXAMPLES), "examples/ 目录不存在");
  const files = fs.readdirSync(EXAMPLES).sort();
  assert.deepEqual(files, EXPECTED_EXAMPLES, "示例清单不符（多文件 / 少文件 / 改名）");
  for (const file of files) {
    assert.ok(hasProgramSuffix(file), file + " 的后缀不在 SPEC §1.4 的后缀表里");
  }
  const counts = new Map<string, number>();
  for (const file of files) {
    const suffix = PROGRAM_SUFFIXES.find((item) => file.toLowerCase().endsWith(item)) ?? "?未知?";
    counts.set(suffix, (counts.get(suffix) ?? 0) + 1);
  }
  assert.deepEqual(
    [...counts.entries()].sort(),
    [[".gu", 1], [".ググ", 1], [".咕咕", 5]].sort(),
    "三方言后缀的示例分布不符",
  );
  for (const suffix of PROGRAM_SUFFIXES) {
    assert.ok(hasProgramSuffix("prog" + suffix), "后缀表里的 " + suffix + " 没被 hasProgramSuffix 认出来");
    assert.ok(hasProgramSuffix("prog" + suffix.toUpperCase()), "后缀应大小写不敏感：" + suffix);
  }
});

for (const spec of EXAMPLES_UNDER_TEST) {
  test("字符集：examples/" + spec.file + "（" + spec.dialect + "方言）", () => {
    const text = readExample(spec.file);
    assertDialectChars(text, spec.allowed, "examples/" + spec.file);
    if (spec.dialect === "中文") {
      assert.ok(!/[A-Za-z]/.test(text), "中文样例不许出现 ASCII 字母");
      assert.ok(!/[\u3040-\u30FF]/.test(text), "中文样例不许出现日语假名");
      assert.ok(!/\u3000/.test(text), "中文样例不许出现全角空格（缩进只用半角空格）");
    }
    if (spec.dialect === "日语") {
      assert.ok(!/[A-Za-z]/.test(text), "日语样例不许出现 ASCII 字母");
      assert.ok(!/[咕嘎]/.test(text), "日语样例不许出现中文位字");
      assert.ok(/\u3000/.test(text), "日语样例的缩进应使用全角空格 U+3000");
    }
    if (spec.dialect === "英语") {
      assert.ok(!/[\u3040-\u30FF]/.test(text), "英语样例不许出现日语假名");
      assert.ok(!/[咕嘎]/.test(text), "英语样例不许出现中文位字");
      assert.ok(/[A-Z]/.test(text) && /[a-z]/.test(text), "英语样例应故意混用大小写");
    }
  });
}

test("SPEC.md §11 的最小可运行样例仍是纯中文方言", () => {
  const sample = specSample();
  assert.ok(sample.includes("咕咕嘎嘎！"), "从 SPEC.md §11 抽到的不像样例程序（缺入口声明）");
  assert.ok(sample.includes("咕：咕咕嘎咕咕？ 咕嘎咕嘎咕！"), "SPEC.md §11 样例的最后一行不见了");
  assertDialectChars(sample, ZH_CHARS, "SPEC.md §11");
});

test("SPEC.md §11.1 的日语样例与 examples/ガググガグ.ググ 逐字符一致", () => {
  assert.equal(readExample("ガググガグ.ググ"), specFenceWith("ググガガ！"), "日语样例应与 SPEC.md §11.1 的围栏一致");
  const japanese = specFenceWith("ググガガ！");
  const english = specFenceWith("GUGUGAGA!");
  assert.equal(
    japanese.split("\n").length,
    english.split("\n").length,
    "两段方言样例的行数应一致（同一份程序的两种写法）",
  );
});

test("SPEC §1 禁止的字符：CR、制表符、BOM 从不出现在示例里", () => {
  for (const spec of EXAMPLES_UNDER_TEST) {
    const text = readExample(spec.file);
    for (const [label, pattern] of [
      ["回车 CR", /\r/],
      ["制表符 TAB", /\t/],
      ["BOM", /^\uFEFF/],
    ] as Array<[string, RegExp]>) {
      assert.ok(!pattern.test(text), "examples/" + spec.file + "：出现 SPEC §1 禁止的" + label);
    }
  }
});
