"use strict";
// completion.js 契约测试：CONTRACT 的五条上下文规则、补全项不变式、collectNames，
// 并用 examples/*.咕咕 的真实内容做端到端断言。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { contextAt, completionsAt, collectNames } = require("../src/completion.js");

const NL = String.fromCharCode(10);
const EXAMPLES = path.join(__dirname, "../../../examples");
const ALLOWED = "咕嘎！？： ";
const KINDS = [1, 2, 5, 6, 11, 13, 14];

function readExample(name) {
  return fs.readFileSync(path.join(EXAMPLES, name), "utf8");
}

function lineList(text) {
  return text.split(NL);
}

/** 第 index 行（0 起）的行首偏移。 */
function lineStart(text, index) {
  const lines = lineList(text);
  let offset = 0;
  for (let i = 0; i < index; i += 1) offset += lines[i].length + 1;
  return offset;
}

function findLine(text, needle) {
  const lines = lineList(text);
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].indexOf(needle) >= 0) return i;
  }
  return -1;
}

/** 第 index 行行尾的偏移。 */
function lineEnd(text, index) {
  return lineStart(text, index) + lineList(text)[index].length;
}

function labelsOf(items) {
  return items.map((item) => item.label);
}

/** 把 ${1:默认值} 形态的占位符还原成默认值，只留下真正的插入文本。 */
function stripPlaceholders(text) {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "$" && text[i + 1] === "{") {
      let j = i + 2;
      while (j < text.length && "0123456789".indexOf(text[j]) >= 0) j += 1;
      if (text[j] === ":") {
        j += 1;
        let body = "";
        while (j < text.length && text[j] !== "}") { body += text[j]; j += 1; }
        if (text[j] === "}") { out += body; i = j; continue; }
      }
    }
    out += text[i];
  }
  return out;
}

test("top：空文档只给两个顶层头", () => {
  assert.equal(contextAt("", 0).kind, "top");
  assert.equal(contextAt(NL, 0).kind, "top");
  const items = completionsAt("", 0);
  assert.deepEqual(labelsOf(items), ["咕咕！", "咕咕嘎嘎！"]);
  assert.equal(items[0].insertTextFormat, 2);
  assert.ok(items[0].documentation.length > 0);
});

test("class：类头缩进内只给绑定与方法头", () => {
  const text = "咕咕！ 嘎咕咕：" + NL + "    ";
  const ctx = contextAt(text, text.length);
  assert.equal(ctx.kind, "class");
  assert.equal(ctx.indent, 4);
  assert.equal(ctx.inClass, true);
  assert.deepEqual(labelsOf(completionsAt(text, text.length)), ["咕咕！？", "咕咕嘎！"]);
});

test("statement：方法体里的绑定行末尾给 8 个语句起始词", () => {
  const text = readExample("咕咕嘎嘎.咕咕");
  const index = findLine(text, "        咕咕！？ 嘎咕咕嘎咕：嘎嘎嘎？咕");
  const offset = lineEnd(text, index);
  const ctx = contextAt(text, offset);
  assert.equal(ctx.kind, "statement");
  assert.equal(ctx.inClass, true);
  assert.equal(ctx.inMethod, true);
  const labels = labelsOf(completionsAt(text, offset));
  assert.equal(labels.length, 8);
  for (const label of ["咕", "咕：", "咕咕！？", "咕嘎", "嘎嘎", "嘎嘎嘎", "嘎嘎嘎嘎", "嘎嘎嘎嘎嘎"]) {
    assert.ok(labels.indexOf(label) >= 0, "缺 " + label);
  }
  assert.equal(labels.indexOf("咕咕！"), -1);
});

test("statement：类体里但不在方法体里的绑定行", () => {
  const text = readExample("咕咕嘎嘎.咕咕");
  const index = findLine(text, "咕咕！？ 嘎咕咕嘎咕：嘎嘎嘎？咕");
  const ctx = contextAt(text, lineEnd(text, index));
  assert.equal(ctx.kind, "statement");
  assert.equal(ctx.inClass, true);
  assert.equal(ctx.inMethod, false);
});

test("expression：咕： 之后给表达式起始词，不给语句词", () => {
  const text = readExample("咕嘎嘎咕.咕咕");
  const index = findLine(text, "咕：咕？");
  const offset = lineEnd(text, index);
  assert.equal(contextAt(text, offset).kind, "expression");
  const labels = labelsOf(completionsAt(text, offset));
  assert.equal(labels.length, 22);
  assert.ok(labels.indexOf("咕？") >= 0);
  assert.ok(labels.indexOf("嘎嘎嘎？") >= 0);
  assert.ok(labels.indexOf("咕嘎嘎！") >= 0);
  assert.equal(labels.indexOf("嘎嘎嘎"), -1);
  assert.equal(labels.indexOf("咕咕！？"), -1);
  assert.ok(labels.indexOf("嘎嘎咕嘎咕咕") >= 0);
  assert.ok(labels.indexOf("嘎嘎咕嘎咕嘎") >= 0);
});

test("expression：if / while 头的冒号之后也算表达式位", () => {
  const counter = readExample("咕咕嘎嘎.咕咕");
  const whileIndex = findLine(counter, "嘎嘎嘎嘎嘎：");
  const whileLine = lineList(counter)[whileIndex];
  const whileOffset = lineStart(counter, whileIndex) + whileLine.indexOf("：") + 1;
  assert.equal(contextAt(counter, whileOffset).kind, "expression");
  const ifElse = readExample("嘎咕嘎咕.咕咕");
  const ifIndex = findLine(ifElse, "嘎嘎嘎：");
  const ifLine = lineList(ifElse)[ifIndex];
  const ifOffset = lineStart(ifElse, ifIndex) + ifLine.indexOf("：") + 1;
  assert.equal(contextAt(ifElse, ifOffset).kind, "expression");
  assert.equal(contextAt(ifElse, ifOffset).prefix, ifLine.slice(0, ifLine.indexOf("：") + 1));
});

test("call：！？ 结尾只给本文档的方法名", () => {
  const text = [
    "咕咕！ 嘎咕咕：",
    "    咕咕！？ 嘎咕嘎：嘎嘎？",
    "    咕咕嘎！ 嘎咕嘎嘎",
    "        嘎嘎：嘎嘎？",
    "    咕咕嘎！ 嘎咕嘎嘎咕",
    "        嘎嘎：嘎嘎？",
    "        咕咕！？ 嘎咕嘎：嘎咕嘎！？"
  ].join(NL);
  const items = completionsAt(text, text.length);
  assert.equal(contextAt(text, text.length).kind, "call");
  assert.deepEqual(labelsOf(items), ["嘎咕嘎嘎", "嘎咕嘎嘎咕"]);
  for (const item of items) assert.equal(item.kind, 1);
});

test("collectNames：行末省略冒号的类头与方法头也能扫到", () => {
  const text = ["咕咕！ 嘎咕咕", "    咕咕嘎！ 嘎咕嘎", "        咕咕！？ 嘎咕嘎：嘎嘎？"].join(NL);
  const names = collectNames(text);
  assert.deepEqual(names.classes, ["嘎咕咕"]);
  assert.deepEqual(names.methods, ["嘎咕嘎"]);
  assert.deepEqual(names.fields, ["嘎咕嘎"]);
});

test("collectNames：oop-inherit 的类、方法与字段", () => {
  const names = collectNames(readExample("嘎嘎咕咕.咕咕"));
  assert.deepEqual(names.classes, ["嘎嘎咕嘎嘎", "嘎嘎咕嘎嘎咕"]);
  assert.equal(names.methods.length, 3);
  assert.ok(names.methods.indexOf("嘎嘎咕嘎嘎") >= 0);
  assert.ok(names.methods.indexOf("嘎咕嘎嘎咕") >= 0);
  assert.ok(names.methods.indexOf("嘎嘎咕嘎嘎咕") >= 0);
  assert.equal(names.fields.length, 3);
  assert.ok(names.fields.indexOf("嘎咕咕嘎咕") >= 0);
  assert.ok(names.fields.indexOf("嘎嘎咕嘎咕咕") >= 0);
  assert.ok(names.fields.indexOf("嘎嘎咕嘎咕嘎") >= 0);
});

test("不变式：examples 每行行尾的补全项字符集、占位符、去重与 kind", () => {
  let checked = 0;
  for (const name of ["咕嘎嘎咕.咕咕", "咕咕嘎嘎.咕咕", "咕嘎咕嘎.咕咕", "嘎咕嘎咕.咕咕", "嘎嘎咕咕.咕咕"]) {
    const text = readExample(name);
    const lines = lineList(text);
    for (let i = 0; i < lines.length; i += 1) {
      const items = completionsAt(text, lineStart(text, i) + lines[i].length);
      const seen = new Set();
      for (const item of items) {
        checked += 1;
        assert.equal(typeof item.label, "string");
        assert.ok(item.label.length > 0);
        for (const ch of item.label) {
          assert.ok(ALLOWED.indexOf(ch) >= 0, name + " 第 " + (i + 1) + " 行 label 含非法字符 " + ch);
        }
        assert.ok(item.insertTextFormat === 1 || item.insertTextFormat === 2);
        if (item.insertTextFormat === 2) {
          for (const ch of stripPlaceholders(item.insertText)) {
            assert.ok(ALLOWED.indexOf(ch) >= 0, name + " 第 " + (i + 1) + " 行补全文本含非法字符 " + ch);
          }
        }
        assert.equal(seen.has(item.label), false, name + " 第 " + (i + 1) + " 行重复 label " + item.label);
        seen.add(item.label);
        assert.ok(KINDS.indexOf(item.kind) >= 0);
        assert.ok(item.detail.length > 0);
        assert.ok(item.documentation.length > 0);
        assert.ok(item.insertText.length > 0);
      }
    }
  }
  assert.ok(checked > 100, "检查到的补全项太少：" + checked);
});

test("kind 用 VS Code CompletionItemKind 数值（1/2/6/11/13/14）", () => {
  const top = completionsAt("", 0);
  assert.equal(top.find((item) => item.label === "咕咕嘎嘎！").kind, 14);
  const expr = completionsAt("咕：", 2);
  assert.equal(expr.find((item) => item.label === "咕？").kind, 11);
  assert.equal(expr.find((item) => item.label === "嘎嘎？").kind, 13);
  const doc = "咕咕！ 嘎咕咕：" + NL + "    咕咕嘎！ 嘎咕嘎：" + NL + "        咕：";
  const items = completionsAt(doc, doc.length);
  assert.equal(items.find((item) => item.label === "嘎咕咕").kind, 6);
  assert.equal(items.find((item) => item.label === "嘎咕嘎").kind, 1);
  const fieldDoc = "咕咕嘎嘎！ 嘎咕嘎嘎：" + NL + "    咕咕！？ 嘎咕嘎：嘎嘎？" + NL + "    咕：";
  assert.equal(completionsAt(fieldDoc, fieldDoc.length).find((item) => item.label === "嘎咕嘎").kind, 2);
});

test("contextAt：返回行信息、缩进与外层位置", () => {
  const text = "咕咕嘎嘎！ 嘎咕嘎嘎：" + NL + "    咕：嘎咕嘎？";
  const ctx = contextAt(text, text.length);
  assert.equal(ctx.kind, "expression");
  assert.equal(ctx.indent, 4);
  assert.equal(ctx.lineStart, lineStart(text, 1));
  assert.equal(ctx.lineText, "    咕：嘎咕嘎？");
  assert.equal(ctx.prefix, "    咕：嘎咕嘎？");
  assert.equal(ctx.inClass, false);
  assert.equal(ctx.inMethod, false);
  assert.deepEqual(Object.keys(ctx).sort(), ["inClass", "inMethod", "indent", "kind", "lineStart", "lineText", "prefix"]);
});

test("top：顶层非空行按语句位处理，缩进 0", () => {
  const text = "咕咕！ 嘎咕咕：" + NL + "    咕咕！？ 嘎咕嘎：嘎嘎？" + NL + "嘎";
  const ctx = contextAt(text, text.length);
  assert.equal(ctx.kind, "statement");
  assert.equal(ctx.indent, 0);
  assert.equal(ctx.inClass, false);
});

test("detail 与 documentation 也只有咕嘎字符（两者都会显示在补全弹窗里）", () => {
  for (const name of ["咕嘎嘎咕.咕咕", "咕咕嘎嘎.咕咕", "咕嘎咕嘎.咕咕", "嘎咕嘎咕.咕咕", "嘎嘎咕咕.咕咕"]) {
    const text = readExample(name);
    const lines = lineList(text);
    for (let i = 0; i < lines.length; i += 1) {
      const items = completionsAt(text, lineStart(text, i) + lines[i].length);
      for (const item of items) {
        for (const ch of String(item.detail)) {
          assert.ok(ALLOWED.indexOf(ch) >= 0, name + " 第 " + (i + 1) + " 行 detail 含非法字符 " + ch);
        }
        for (const ch of String(item.documentation)) {
          assert.ok(ALLOWED.indexOf(ch) >= 0, name + " 第 " + (i + 1) + " 行 documentation 含非法字符 " + ch);
        }
      }
    }
  }
});

test("方言：日语全角缩进 / 英语拼写 / 混排都能算出同一个上下文", () => {
  const ja = "ググ！ ガググ：" + NL + "　　　　";
  assert.equal(contextAt(ja, ja.length).kind, "class");
  assert.equal(contextAt(ja, ja.length).indent, 4);
  assert.deepEqual(labelsOf(completionsAt(ja, ja.length)), ["咕咕！？", "咕咕嘎！"]);

  const en = "GUGU! GAGUGU:" + NL + "    ";
  assert.equal(contextAt(en, en.length).kind, "class");
  assert.deepEqual(labelsOf(completionsAt(en, en.length)), ["咕咕！？", "咕咕嘎！"]);

  const mixed = "咕グ！ ガガグガ：" + NL + "    ";
  assert.equal(contextAt(mixed, mixed.length).inClass, true);
  // 半角冒号与半角 ! 等价，英文源码的表达式位也认得出来
  assert.equal(contextAt("GU: ", 4).kind, "expression");
  assert.equal(contextAt("GUGU!? ", 6).kind, "call");
});

test("方言：collectNames 归一化后返回规范中文名字", () => {
  const ja = ["ググ！ ガググ", "　　ググガ！ ガガグガ", "　　　　ググ！？ ガガ：ガガ？"].join(NL);
  assert.deepEqual(collectNames(ja), {
    classes: ["嘎咕咕"],
    methods: ["嘎嘎咕嘎"],
    fields: ["嘎嘎"]
  });

  const en = ["GUGU! GAGUGU", "    GUGUGA! GAGAGA", "        GUGU!? GAGA: GAGA?"].join(NL);
  assert.deepEqual(collectNames(en), {
    classes: ["嘎咕咕"],
    methods: ["嘎嘎嘎"],
    fields: ["嘎嘎"]
  });
  // 混排：同一个名字里三种写法都能用
  assert.deepEqual(collectNames("咕グGU！ ガガグガ").classes, []);
  assert.deepEqual(collectNames("咕グ！ ガGA咕").classes, ["嘎嘎咕"]);
});

