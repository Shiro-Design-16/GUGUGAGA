"use strict";
// keywords.js 契约测试：30 条保留词表、家族分布、BY_TEXT 覆盖、isReserved 与
// describe 的行为、起始词集合，以及与语言真源 src/keywords.ts 的逐条一致性。
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const kw = require("../src/keywords.js");

const NL = String.fromCharCode(10);
const PLACEHOLDER = "$" + "{1:";
const TRUTH_PATH = path.join(__dirname, "../../../src/keywords.ts");

/** 把真源 src/keywords.ts 的四张表摊平成与 RESERVED 同形的记录。 */
function truthEntries() {
  const truth = require(TRUTH_PATH);
  const out = [];
  for (const [text, name] of Object.entries(truth.BARE)) {
    out.push({ text: text, family: "BARE", name: name });
  }
  for (const [text, name] of Object.entries(truth.DECL)) {
    out.push({ text: text, family: "DECL", name: name });
  }
  for (const [text, name] of Object.entries(truth.ACT)) {
    out.push({ text: text, family: "ACT", name: name });
  }
  for (const [stem, value] of Object.entries(truth.VAL)) {
    let name;
    if (value.kind === "bin" || value.kind === "un") name = value.op;
    else if (value.kind === "bool") name = value.value ? "True" : "False";
    else if (value.kind === "intlit") name = "IntLit";
    else if (value.kind === "bitslit") name = "BitsLit";
    else name = "Null";
    out.push({ text: stem + "？", family: "VAL", name: name });
  }
  return out;
}

test("RESERVED：30 条、29 个唯一词形、家族 7/4/2/17", () => {
  assert.equal(kw.RESERVED.length, 30);
  const texts = kw.RESERVED.map((entry) => entry.text);
  assert.equal(new Set(texts).size, 29);
  assert.equal(texts.filter((text) => text === "咕咕").length, 2);
  const counts = { BARE: 0, DECL: 0, ACT: 0, VAL: 0 };
  for (const entry of kw.RESERVED) counts[entry.family] += 1;
  assert.deepEqual(counts, { BARE: 7, DECL: 4, ACT: 2, VAL: 17 });
  assert.equal(kw.entriesOf("BARE").length, 7);
  assert.equal(kw.entriesOf("DECL").length, 4);
  assert.equal(kw.entriesOf("ACT").length, 2);
  assert.equal(kw.entriesOf("VAL").length, 17);
  assert.deepEqual(kw.entriesOf("NOPE"), []);
});

test("BY_TEXT：覆盖 29 个唯一词形，咕咕 指向 DECL/Class", () => {
  const texts = Array.from(new Set(kw.RESERVED.map((entry) => entry.text)));
  assert.equal(Object.keys(kw.BY_TEXT).length, 29);
  for (const text of texts) {
    assert.ok(Object.prototype.hasOwnProperty.call(kw.BY_TEXT, text), "BY_TEXT 缺 " + text);
    assert.equal(kw.BY_TEXT[text].text, text);
  }
  assert.equal(kw.BY_TEXT["咕咕"].family, "DECL");
  assert.equal(kw.BY_TEXT["咕咕"].name, "Class");
});

test("词条形状：text/family/name/desc/docs 齐全，docs 只有一行", () => {
  for (const entry of kw.RESERVED) {
    assert.equal(typeof entry.text, "string");
    assert.ok(["BARE", "DECL", "ACT", "VAL"].indexOf(entry.family) >= 0, entry.text + " 家族非法");
    assert.equal(typeof entry.name, "string");
    assert.ok(entry.desc.length > 0, entry.text + " 缺 desc");
    assert.ok(entry.docs.length > 8, entry.text + " 的 docs 太短");
    assert.equal(entry.docs.indexOf(NL), -1, entry.text + " 的 docs 不是单行");
  }
});

test("词条文案只有咕嘎字符：desc 是形状，docs 是一行示例", () => {
  const visibleOnly = /^[咕嘎！？： *]+$/;
  for (const entry of kw.RESERVED) {
    assert.match(entry.desc, visibleOnly, entry.text + " 的 desc 混进了别的字符：" + entry.desc);
    assert.match(entry.docs, visibleOnly, entry.text + " 的 docs 混进了别的字符：" + entry.docs);
    assert.equal(entry.docs.indexOf("·"), -1, entry.text + " 的 docs 还留着分隔符");
  }
});

test("isReserved：词形、完整拼写与非保留词", () => {
  assert.equal(kw.isReserved("咕咕"), true);
  assert.equal(kw.isReserved("嘎咕？"), true);
  assert.equal(kw.isReserved("嘎咕咕"), false);
  assert.equal(kw.isReserved("咕咕！"), true);
  assert.equal(kw.isReserved("咕咕！？"), true);
  assert.equal(kw.isReserved("咕嘎！？"), true);
  assert.equal(kw.isReserved("嘎咕！"), false);
  assert.equal(kw.isReserved("嘎嘎咕咕"), false);
  assert.equal(kw.isReserved(""), false);
  assert.equal(kw.isReserved(null), false);
  assert.equal(kw.isReserved(undefined), false);
});

test("describe：词形、完整拼写、带冒号语句头与未知文本", () => {
  assert.equal(kw.describe("咕咕").family, "DECL");
  assert.equal(kw.describe("咕咕").name, "Class");
  assert.equal(kw.describe("咕咕！").name, "Class");
  assert.equal(kw.describe("咕咕！？").name, "Bind");
  assert.equal(kw.describe("咕嘎嘎！").name, "New");
  assert.equal(kw.describe("嘎嘎嘎嘎").name, "Else");
  assert.equal(kw.describe("嘎咕？").name, "Null");
  assert.equal(kw.describe("咕：").name, "Print");
  assert.equal(kw.describe("嘎嘎嘎嘎嘎：").name, "While");
  assert.equal(kw.describe("嘎嘎嘎").name, "If");
  assert.equal(kw.describe("嘎嘎嘎？").name, "IntLit");
  assert.equal(kw.describe("嘤"), null);
  assert.equal(kw.describe(""), null);
  assert.equal(kw.describe("嘎咕咕"), null);
  assert.equal(kw.describe(null), null);
});

test("降序不变量：text 长度单调不增，前缀长者在前", () => {
  for (let i = 1; i < kw.RESERVED.length; i += 1) {
    assert.ok(
      kw.RESERVED[i - 1].text.length >= kw.RESERVED[i].text.length,
      "排序错误：" + kw.RESERVED[i - 1].text + " 在 " + kw.RESERVED[i].text + " 之前"
    );
  }
  function indexOfText(text) {
    return kw.RESERVED.findIndex((entry) => entry.text === text);
  }
  assert.ok(indexOfText("咕嘎嘎咕？") < indexOfText("咕嘎嘎？"));
  assert.ok(indexOfText("嘎嘎嘎嘎？") < indexOfText("嘎嘎嘎？"));
  assert.ok(indexOfText("嘎嘎嘎嘎嘎") < indexOfText("嘎嘎嘎"));
});

test("与语言真源 src/keywords.ts 逐条一致（family/text/name）", () => {
  const key = (entry) => entry.family + "/" + entry.text + "/" + entry.name;
  const ours = kw.RESERVED.map(key).sort();
  const theirs = truthEntries().map(key).sort();
  assert.deepEqual(ours, theirs);
});

test("STATEMENT_STARTERS：8 个语句起始记号", () => {
  assert.deepEqual(
    kw.STATEMENT_STARTERS.map((starter) => starter.text),
    ["咕", "咕：", "咕咕！？", "咕嘎", "嘎嘎", "嘎嘎嘎", "嘎嘎嘎嘎", "嘎嘎嘎嘎嘎"]
  );
  for (const starter of kw.STATEMENT_STARTERS) {
    assert.ok(starter.label && starter.desc, starter.text + " 缺 label/desc");
    assert.ok(kw.describe(starter.text), starter.text + " 不是保留记号");
  }
});

test("EXPRESSION_STARTERS：20 个表达式起始记号且不含语句词", () => {
  const texts = kw.EXPRESSION_STARTERS.map((starter) => starter.text);
  assert.equal(texts.length, 20);
  assert.equal(new Set(texts).size, 20);
  const required = [
    "咕？", "咕咕？", "咕嘎？", "咕咕咕？", "咕咕嘎？", "咕嘎咕？", "咕嘎嘎？",
    "咕嘎嘎咕？", "咕嘎咕咕？", "咕嘎咕嘎？", "咕咕咕咕？", "咕咕嘎咕？",
    "嘎嘎嘎？", "嘎嘎嘎嘎？", "嘎嘎？", "嘎嘎咕？", "嘎咕？",
    "嘎嘎嘎嘎嘎嘎", "嘎嘎嘎嘎嘎嘎嘎", "咕嘎嘎！"
  ];
  for (const text of required) {
    assert.ok(texts.indexOf(text) >= 0, "缺表达式起始词 " + text);
  }
  for (const text of ["咕", "咕：", "咕咕！？", "咕嘎", "嘎嘎", "嘎嘎嘎", "嘎嘎嘎嘎", "嘎嘎嘎嘎嘎"]) {
    assert.equal(texts.indexOf(text), -1, "表达式位不该出现 " + text);
  }
  for (const starter of kw.EXPRESSION_STARTERS) {
    assert.ok(kw.describe(starter.text), starter.text + " 不是保留记号");
    assert.ok(starter.label && starter.desc);
  }
});

test("snippet 只给声明类词条，且带占位符", () => {
  const withSnippet = kw.RESERVED.filter((entry) => typeof entry.snippet === "string");
  assert.deepEqual(
    withSnippet.map((entry) => entry.name).sort(),
    ["Bind", "Class", "Entry", "Method", "New"]
  );
  for (const entry of withSnippet) {
    assert.ok(entry.snippet.indexOf(PLACEHOLDER) >= 0, entry.name + " 的 snippet 没有占位符");
  }
});

test("方言：isReserved / describe / BY_TEXT 都认 グ・ぐ・GU 拼写", () => {
  assert.equal(kw.isReserved("ググ"), true);
  assert.equal(kw.isReserved("ぐぐ！"), true);
  assert.equal(kw.isReserved("GUGU!"), true);
  assert.equal(kw.isReserved("guGU！"), true); // 同词混排
  assert.equal(kw.isReserved("ガグ"), false);
  assert.equal(kw.isReserved("gggg"), false); // 落单的 g 不是位名

  assert.equal(kw.describe("ググ！").name, "Class");
  assert.equal(kw.describe("GUGU!").name, "Class");
  assert.equal(kw.describe("GAGA?").name, "True");
  assert.equal(kw.describe("グ：").name, "Print"); // 半角冒号也归一
  assert.equal(kw.describe("ガガガ").name, "If");

  assert.equal(kw.BY_TEXT["ググ"].name, "Class");
  assert.equal(kw.BY_TEXT["GUGU"].name, "Class");
  assert.equal(kw.BY_TEXT["咕咕"].name, "Class");
  assert.equal(Object.keys(kw.BY_TEXT).length, 29); // 对外仍只列规范键
});

test("方言归一化：normalizeText / normalizeWithOffsets / dialectsOf", () => {
  assert.equal(kw.normalizeText("咕グGUガがGA"), "咕咕咕嘎嘎嘎");
  assert.equal(kw.normalizeText("GUGU!"), "咕咕！");
  assert.equal(kw.normalizeText("gugaga?"), "咕嘎嘎？");
  assert.equal(kw.normalizeText("!?:"), "！？：");
  assert.equal(kw.normalizeText("　"), " ");
  assert.equal(kw.normalizeText("嘤"), "嘤");

  const span = kw.normalizeWithOffsets("Guガ");
  assert.equal(span.text, "咕嘎");
  assert.deepEqual(span.starts, [0, 2]);
  assert.deepEqual(span.ends, [2, 3]);
  assert.equal(kw.canonicalOffsetOf(span, 1), 0); // GU 中间取起点
  assert.equal(kw.canonicalOffsetOf(span, 3), 2);
  assert.equal(kw.sourceStartOf(span, 1), 2);
  assert.equal(kw.sourceEndOf(span, 2), 3);

  assert.deepEqual(kw.dialectsOf("咕嘎！？："), {
    zh: "咕嘎！？：",
    ja: "グガ！？：",
    en: "GUGA!?:"
  });
  assert.deepEqual(kw.dialectsOf("ググ！"), {
    zh: "咕咕！",
    ja: "ググ！",
    en: "GUGU!"
  });
});
