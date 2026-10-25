/**
 * hover.js 契约测试：最长保留记号匹配、null 情况、本文档名字命中、range 自洽。
 *
 * 悬停内容是直接渲染给人看的，所以除了 ** 与空格，只许出现 咕/嘎/！/？/：
 * （整机对外可见面规定）。家族名（BARE/DECL/ACT/VAL）与英文 AST 名一律不许出现。
 * 唯一例外是保留词悬停的第三段「方言对照行」：它按约定列出中文 / 日语 / 英文
 * 三种写法（CONTRACT §16），因此允许 グ/ガ/GU/GA 与半角 ! ? :。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { hoverAt } = require("../src/hover.js");
const { BY_TEXT, WORDS, dialectsOf } = require("../src/keywords.js");

const NL = String.fromCharCode(10);

/** 悬停文案的可见字符白名单：咕 嘎 ！ ？ ： 空格，外加 Markdown 粗体的 * */
const VISIBLE_ONLY = /^[咕嘎！？： *]+$/;

/** 方言对照行：中文 / 日语 / 英文三种写法，用 = 连接。 */
const DIALECT_LINE = /^[咕嘎！？：グガ]+ = [咕嘎！？：グガ]+ = [咕嘎！？：GgUuAa!?]+$/;

function firstLine(result) {
  return result.contents[0];
}

function sliceOf(text, result) {
  return text.slice(result.range.start, result.range.end);
}

test("最长匹配：咕嘎嘎咕？ 不会被 咕嘎嘎？ 抢走", () => {
  const text = "咕嘎嘎咕？ 咕嘎嘎？";
  const gt = hoverAt(text, 0);
  const lt = hoverAt(text, 6);
  assert.ok(gt && lt);
  assert.equal(sliceOf(text, gt), "咕嘎嘎咕？");
  assert.equal(sliceOf(text, lt), "咕嘎嘎？");
  assert.equal(firstLine(gt), "**咕嘎嘎咕？** " + BY_TEXT["咕嘎嘎咕？"].desc);
  assert.equal(gt.contents[1], BY_TEXT["咕嘎嘎咕？"].docs);
  assert.equal(lt.contents[1], BY_TEXT["咕嘎嘎？"].docs);
  assert.notEqual(gt.contents[1], lt.contents[1]);
});

test("最长匹配：嘎嘎咕？ 是 False，嘎咕？ 才是 Null", () => {
  const falseCmp = hoverAt("嘎嘎咕？", 1);
  const nul = hoverAt("嘎咕？", 0);
  assert.ok(falseCmp && nul);
  assert.equal(sliceOf("嘎嘎咕？", falseCmp), "嘎嘎咕？");
  assert.equal(sliceOf("嘎咕？", nul), "嘎咕？");
  assert.equal(falseCmp.contents[1], BY_TEXT["嘎嘎咕？"].docs);
  assert.equal(nul.contents[1], BY_TEXT["嘎咕？"].docs);
  assert.notEqual(falseCmp.contents[1], nul.contents[1]);
});

test("声明头：咕咕！ / 咕咕嘎！ / 咕咕嘎嘎！ / 咕咕！？ / 咕嘎嘎！ / 咕嘎！？", () => {
  const cases = ["咕咕！", "咕咕嘎！", "咕咕嘎嘎！", "咕嘎嘎！", "咕咕！？", "咕嘎！？"];
  for (const text of cases) {
    const result = hoverAt(text, 0);
    assert.ok(result, text + " 没有悬停结果");
    assert.equal(result.contents.length, 3, text + " 应该有三段（标题 + 示例 + 方言对照）");
    assert.equal(firstLine(result).indexOf("**" + text + "** "), 0, text + " 首行不是记号 + 形状");
    const spellings = dialectsOf(text);
    assert.equal(result.contents[2], [spellings.zh, spellings.ja, spellings.en].join(" = "),
      text + " 的方言对照行不对");
  }
});

test("每个保留词都能悬停，且渲染出来的只有咕嘎字符", () => {
  // 按 BY_TEXT 走：RESERVED 里有两个词条共用同一个 text，悬停只会命中查找表里的那一个
  for (const entry of Object.values(BY_TEXT)) {
    const result = hoverAt(entry.text, 0);
    assert.ok(result, entry.text + " 悬停不到");
    assert.equal(result.contents[0], "**" + entry.text + "** " + entry.desc, entry.text + " 首行不对");
    assert.equal(result.contents[1], entry.docs, entry.text + " 第二段不是 docs");
    // 前两段必须是纯咕嘎；第三段是对照行，白名单另算。
    for (const block of result.contents.slice(0, 2)) {
      assert.match(block, VISIBLE_ONLY, entry.text + " 渲染出白名单外的字符：" + block);
    }
    assert.match(result.contents[2], DIALECT_LINE, entry.text + " 的对照行混进了别的字符");
  }
});

test("null：空白、非记号字符、空串与像保留词的裸名字", () => {
  assert.equal(hoverAt("   ", 1), null);
  assert.equal(hoverAt("嘤", 0), null);
  assert.equal(hoverAt("嘤嘤嘤 咕？", 0), null);
  assert.equal(hoverAt("", 0), null);
  assert.equal(hoverAt("嘎嘎咕咕", 0), null);
  assert.equal(hoverAt("嘎嘎嘎嘎嘎？", 0), null);
});

test("名字命中：类 / 方法 / 字段都说明是本文档里的", () => {
  const doc = [
    "咕咕！ 嘎咕咕",
    "    咕咕！？ 嘎咕嘎：嘎嘎？",
    "    咕咕嘎！ 嘎咕嘎嘎",
    "        嘎嘎：嘎嘎？"
  ].join(NL);
  const cls = hoverAt(doc, doc.indexOf("嘎咕咕"));
  const fld = hoverAt(doc, doc.indexOf("嘎咕嘎：") + 1);
  const mth = hoverAt(doc, doc.indexOf("嘎咕嘎嘎"));
  assert.ok(cls && fld && mth);
  assert.equal(sliceOf(doc, cls), "嘎咕咕");
  assert.equal(sliceOf(doc, fld), "嘎咕嘎");
  assert.equal(sliceOf(doc, mth), "嘎咕嘎嘎");
  assert.equal(cls.contents[0], "**嘎咕咕** 咕咕！ " + WORDS.thisDoc);
  assert.equal(fld.contents[0], "**嘎咕嘎** 咕咕！？ " + WORDS.thisDoc);
  assert.equal(mth.contents[0], "**嘎咕嘎嘎** 咕咕嘎！ " + WORDS.thisDoc);
  for (const result of [cls, fld, mth]) {
    for (const block of result.contents) {
      assert.match(block, VISIBLE_ONLY, "名字悬停渲染出白名单外的字符：" + block);
    }
  }
});

test("range 与 offset 自洽：切片等于记号，且覆盖 offset", () => {
  const text = "咕嘎嘎咕？ 咕咕嘎！ 嘎嘎咕？ 嘤 嘎嘎";
  const cases = [
    [0, "咕嘎嘎咕？"],
    [2, "咕嘎嘎咕？"],
    [6, "咕咕嘎！"],
    [8, "咕咕嘎！"],
    [11, "嘎嘎咕？"]
  ];
  for (const [offset, expected] of cases) {
    const result = hoverAt(text, offset);
    assert.ok(result, offset + " 没有结果");
    assert.equal(sliceOf(text, result), expected);
    assert.ok(result.range.start <= offset && offset < result.range.end);
  }
});

test("offset 落在记号右边缘或文本末尾也能命中", () => {
  const edge = hoverAt("嘎嘎？", 3);
  assert.ok(edge);
  assert.equal(sliceOf("嘎嘎？", edge), "嘎嘎？");
  const bind = hoverAt("咕咕！？", 3);
  assert.ok(bind);
  assert.equal(bind.range.start, 0);
  assert.equal(bind.range.end, 4);
  assert.equal(sliceOf("咕咕！？", bind), "咕咕！？");
});

test("contents 首行形如 **记号** 形状，没有家族名与英文名", () => {
  // 记号是「咕」，后面那个「：」是裸词 Print 的用法形状，不属于记号本身
  const result = hoverAt("咕：", 0);
  assert.ok(result);
  const line = firstLine(result);
  assert.equal(line.indexOf("**咕** "), 0);
  assert.equal(line.slice("**咕** ".length), BY_TEXT["咕"].desc);
  assert.equal(line.indexOf("·"), -1);
  assert.equal(line.indexOf("BARE") >= 0 || line.indexOf("DECL") >= 0, false);
  assert.ok(result.contents[1].length > 0);
});

test("方言：日语 / 英语 / 混排源码都能悬停，range 用原文真实字符", () => {
  const ja = "ググ！ ガグガ";
  const jaResult = hoverAt(ja, 0);
  assert.equal(sliceOf(ja, jaResult), "ググ！");
  assert.equal(jaResult.contents[0], "**咕咕！** " + BY_TEXT["咕咕"].desc);
  assert.equal(jaResult.contents[2], "咕咕！ = ググ！ = GUGU!");

  // 英文位名占两个码位：offset 落在 GU 中间也要命中，range 覆盖 GUGU!
  const en = "GUGU! GAGA";
  const enResult = hoverAt(en, 2);
  assert.equal(sliceOf(en, enResult), "GUGU!");
  assert.equal(enResult.contents[1], BY_TEXT["咕咕"].docs);
  assert.equal(enResult.contents[2], "咕咕！ = ググ！ = GUGU!");

  const mixed = "咕グ！";
  const mixedResult = hoverAt(mixed, 1);
  assert.equal(sliceOf(mixed, mixedResult), "咕グ！");
  assert.equal(mixedResult.contents[2], "咕咕！ = ググ！ = GUGU!");

  // 半角 ? 等价于全角 ？，英文拼写的取值词同样命中
  const val = "GAGA?";
  const valResult = hoverAt(val, 0);
  assert.equal(sliceOf(val, valResult), "GAGA?");
  assert.equal(valResult.contents[0], "**嘎嘎？** " + BY_TEXT["嘎嘎？"].desc);
  assert.equal(valResult.contents[2], "嘎嘎？ = ガガ？ = GAGA?");
});

test("方言：日语源码里的名字悬停仍指向本文档定义", () => {
  const doc = ["ググ！ ガググ", "　　ググガ！ ガガグガ", "　　　　ガガ：ガガ？"].join(String.fromCharCode(10));
  const cls = hoverAt(doc, doc.indexOf("ガググ"));
  assert.ok(cls, "日语类名悬停不到");
  assert.equal(cls.contents[0], "**嘎咕咕** 咕咕！ " + WORDS.thisDoc);
  assert.equal(doc.slice(cls.range.start, cls.range.end), "ガググ");
});
