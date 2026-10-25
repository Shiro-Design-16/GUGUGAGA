/**
 * 咕咕嘎嘎语 · 保留词表（VS Code 扩展侧唯一的 JS 真源）。
 *
 * 数据与仓库根目录的 src/keywords.ts 逐条对齐；text / family / name 与
 * vscode/CONTRACT.md §3 的权威表格逐字一致。本文件是 CommonJS：扩展宿主与
 * node --test 都能直接 require，运行期不依赖 vscode 模块。
 *
 * text 是 §3 表格里的「词形」：
 * - BARE 是裸词，源码里没有后缀；
 * - DECL 是声明词的词干，源码里写成 词干 + ！；
 * - ACT 是动作词的词干，源码里写成 词干 + ！？；
 * - VAL 自带 ？，源码里就长这样。
 * 需要完整拼写时用 STATEMENT_STARTERS / EXPRESSION_STARTERS，
 * 或者 describe(词干 + ！) / describe(词干 + ！？)。
 *
 * 对外可见面只许出现 咕/嘎/！/？/：/空格（见 SPEC.md §12 的位流口径），
 * 所以 desc（短用法形状）与 docs（一整行示例）都写成纯咕嘎的形状，不再放人话。
 * 形状里的占位名字取自安全名字池：嘎咕嘎=名字、嘎咕咕=类名、嘎咕嘎嘎=入口名、
 * 咕咕嘎=方法名。family / name 是给程序看的结构数据，永远不会被渲染出来。
 */
"use strict";

/** 渲染文案里反复要用的咕嘎词形。 */
const WORDS = {
  /** 「本文档」：补全与悬停在名字后面标注来源时用。 */
  thisDoc: "嘎嘎咕咕"
};

/** 30 条权威保留词；随后按 text 长度降序排序（最长备选在前）。 */
const RESERVED = [
  // ── BARE：裸词引导符与表达式原子 ──
  { text: "咕", family: "BARE", name: "Print", desc: "咕： 嘎咕嘎", docs: "咕： 咕？ 嘎咕嘎 嘎咕嘎" },
  { text: "嘎嘎", family: "BARE", name: "Return", desc: "嘎嘎： 嘎咕嘎", docs: "嘎嘎： 咕？ 嘎咕嘎 嘎咕嘎" },
  { text: "嘎嘎嘎", family: "BARE", name: "If", desc: "嘎嘎嘎： 嘎咕嘎", docs: "嘎嘎嘎： 嘎嘎？ 咕： 嘎嘎嘎？咕" },
  { text: "嘎嘎嘎嘎", family: "BARE", name: "Else", desc: "嘎嘎嘎嘎", docs: "嘎嘎嘎： 嘎嘎？ 嘎嘎嘎嘎 咕： 嘎嘎嘎？咕" },
  { text: "嘎嘎嘎嘎嘎", family: "BARE", name: "While", desc: "嘎嘎嘎嘎嘎： 嘎咕嘎", docs: "嘎嘎嘎嘎嘎： 嘎嘎嘎？嘎 咕： 嘎咕嘎" },
  { text: "嘎嘎嘎嘎嘎嘎", family: "BARE", name: "This", desc: "嘎嘎嘎嘎嘎嘎", docs: "嘎嘎嘎嘎嘎嘎 咕咕嘎！ 嘎咕嘎" },
  { text: "嘎嘎嘎嘎嘎嘎嘎", family: "BARE", name: "ReadByte", desc: "嘎嘎嘎嘎嘎嘎嘎", docs: "咕： 嘎嘎嘎嘎嘎嘎嘎" },

  // ── DECL：声明词（源码后缀 ！）──
  { text: "咕咕", family: "DECL", name: "Class", desc: "咕咕！ 嘎咕咕：", docs: "咕咕！ 嘎咕咕： 咕咕嘎！ 咕咕嘎： 嘎咕嘎", snippet: "咕咕！ ${1:嘎咕咕}：" },
  { text: "咕咕嘎", family: "DECL", name: "Method", desc: "咕咕嘎！ 咕咕嘎： 嘎咕嘎", docs: "咕咕嘎！ 咕咕嘎： 嘎咕嘎 嘎嘎： 嘎咕嘎", snippet: "咕咕嘎！ ${1:嘎咕咕}：${2:嘎咕嘎}" },
  { text: "咕咕嘎嘎", family: "DECL", name: "Entry", desc: "咕咕嘎嘎！ 嘎咕嘎嘎", docs: "咕咕嘎嘎！ 嘎咕嘎嘎 咕： 嘎嘎嘎？咕", snippet: "咕咕嘎嘎！ ${1:嘎咕嘎嘎}" },
  { text: "咕嘎嘎", family: "DECL", name: "New", desc: "咕嘎嘎！ 嘎咕咕？", docs: "咕咕！？ 嘎咕嘎： 咕嘎嘎！ 嘎咕咕？", snippet: "咕嘎嘎！ ${1:嘎咕咕}？" },

  // ── ACT：动作词（源码后缀 ！？）──
  { text: "咕咕", family: "ACT", name: "Bind", desc: "咕咕！？ 嘎咕嘎： 嘎咕嘎", docs: "咕咕！？ 嘎咕嘎： 嘎嘎嘎？咕", snippet: "咕咕！？ ${1:嘎咕嘎}：${2:嘎嘎嘎？咕}" },
  { text: "咕嘎", family: "ACT", name: "ExprStmt", desc: "咕嘎！？ 嘎咕嘎", docs: "咕嘎！？ 咕？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },

  // ── VAL：取值词（源码自带 ？）──
  { text: "咕？", family: "VAL", name: "Add", desc: "咕？ 嘎咕嘎 嘎咕嘎", docs: "咕： 咕？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },
  { text: "咕咕？", family: "VAL", name: "Sub", desc: "咕咕？ 嘎咕嘎 嘎咕嘎", docs: "咕： 咕咕？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },
  { text: "咕嘎？", family: "VAL", name: "Mul", desc: "咕嘎？ 嘎咕嘎 嘎咕嘎", docs: "咕： 咕嘎？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },
  { text: "咕咕咕？", family: "VAL", name: "Div", desc: "咕咕咕？ 嘎咕嘎 嘎咕嘎", docs: "咕： 咕咕咕？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },
  { text: "咕咕嘎？", family: "VAL", name: "Mod", desc: "咕咕嘎？ 嘎咕嘎 嘎咕嘎", docs: "咕： 咕咕嘎？ 嘎嘎嘎？咕 嘎嘎嘎？嘎" },
  { text: "咕嘎咕？", family: "VAL", name: "Eq", desc: "咕嘎咕？ 嘎咕嘎 嘎咕嘎", docs: "嘎嘎嘎： 咕嘎咕？ 嘎咕嘎 嘎咕嘎" },
  { text: "咕嘎嘎？", family: "VAL", name: "Lt", desc: "咕嘎嘎？ 嘎咕嘎 嘎咕嘎", docs: "嘎嘎嘎： 咕嘎嘎？ 嘎咕嘎 嘎咕嘎" },
  { text: "咕嘎嘎咕？", family: "VAL", name: "Gt", desc: "咕嘎嘎咕？ 嘎咕嘎 嘎咕嘎", docs: "嘎嘎嘎： 咕嘎嘎咕？ 嘎咕嘎 嘎咕嘎" },
  { text: "咕嘎咕咕？", family: "VAL", name: "And", desc: "咕嘎咕咕？ 嘎咕嘎 嘎咕嘎", docs: "嘎嘎嘎： 咕嘎咕咕？ 嘎咕嘎 嘎咕嘎" },
  { text: "咕嘎咕嘎？", family: "VAL", name: "Or", desc: "咕嘎咕嘎？ 嘎咕嘎 嘎咕嘎", docs: "嘎嘎嘎： 咕嘎咕嘎？ 嘎咕嘎 嘎咕嘎" },
  { text: "咕咕咕咕？", family: "VAL", name: "Not", desc: "咕咕咕咕？ 嘎咕嘎", docs: "嘎嘎嘎： 咕咕咕咕？ 嘎咕嘎" },
  { text: "咕咕嘎咕？", family: "VAL", name: "Neg", desc: "咕咕嘎咕？ 嘎咕嘎", docs: "咕： 咕咕嘎咕？ 嘎嘎嘎？咕" },
  { text: "嘎嘎嘎？", family: "VAL", name: "IntLit", desc: "嘎嘎嘎？嘎咕", docs: "咕： 嘎嘎嘎？嘎咕" },
  { text: "嘎嘎嘎嘎？", family: "VAL", name: "BitsLit", desc: "嘎嘎嘎嘎？咕嘎", docs: "咕： 嘎嘎嘎嘎？咕嘎" },
  { text: "嘎嘎？", family: "VAL", name: "True", desc: "嘎嘎？", docs: "嘎嘎嘎： 嘎嘎？ 咕： 嘎嘎嘎？咕" },
  { text: "嘎嘎咕？", family: "VAL", name: "False", desc: "嘎嘎咕？", docs: "嘎嘎嘎： 嘎嘎咕？ 咕： 嘎嘎嘎？咕" },
  { text: "嘎咕？", family: "VAL", name: "Null", desc: "嘎咕？", docs: "咕咕！？ 嘎咕嘎： 嘎咕？" }
];

// 最长记号在前：悬停 / 补全按此顺序做前缀判定即可拿到最长匹配。同长度保持表内顺序，
// 于是 BY_TEXT 的「咕咕」稳定指向先出现的 DECL(Class)，而不是 ACT(Bind)。
RESERVED.sort(function (a, b) {
  return b.text.length - a.text.length;
});

/** 词形 → 词条；「咕咕」取表内先出现的 DECL(Class)。 */
const BY_TEXT = {};
for (const entry of RESERVED) {
  if (!Object.prototype.hasOwnProperty.call(BY_TEXT, entry.text)) {
    BY_TEXT[entry.text] = entry;
  }
}

/** 源码完整拼写 → 词条（含 ！ / ！？ / ？ 后缀），供 describe 与悬停使用。 */
const TOKEN_INDEX = new Map();
for (const entry of RESERVED) {
  if (!TOKEN_INDEX.has(entry.text)) TOKEN_INDEX.set(entry.text, entry);
}
for (const entry of RESERVED) {
  if (entry.family === "DECL" && !TOKEN_INDEX.has(entry.text + "！")) {
    TOKEN_INDEX.set(entry.text + "！", entry);
  }
  if (entry.family === "ACT" && !TOKEN_INDEX.has(entry.text + "！？")) {
    TOKEN_INDEX.set(entry.text + "！？", entry);
  }
}
// 语句头带冒号引导符的拼写（咕： / 嘎嘎： / 嘎嘎嘎： / 嘎嘎嘎嘎嘎：）也登记，
// 让 describe 与补全起始记号「咕：」指向同一个词条。
for (const text of ["咕", "嘎嘎", "嘎嘎嘎", "嘎嘎嘎嘎嘎"]) {
  const entry = BY_TEXT[text];
  if (entry && !TOKEN_INDEX.has(text + "：")) TOKEN_INDEX.set(text + "：", entry);
}

/** 文本是否是保留词（词形或完整源码拼写都算；任意方言拼写都认）。 */
function isReserved(text) {
  if (typeof text !== "string") return false;
  const canon = normalizeText(text);
  return (
    Object.prototype.hasOwnProperty.call(BY_TEXT, canon) || TOKEN_INDEX.has(canon)
  );
}

/** 取某个家族的全部词条：BARE / DECL / ACT / VAL；未知家族返回空数组。 */
function entriesOf(family) {
  return RESERVED.filter(function (entry) {
    return entry.family === family;
  });
}

/** 词形或完整拼写 → 词条；任意方言拼写都认，查不到返回 null。 */
function describe(text) {
  if (typeof text !== "string") return null;
  const canon = normalizeText(text);
  if (Object.prototype.hasOwnProperty.call(BY_TEXT, canon)) return BY_TEXT[canon];
  return TOKEN_INDEX.get(canon) || null;
}

/** 造一个补全用的起始记号；desc / docs 都取自词条（纯咕嘎）。 */
function starterOfToken(token) {
  const entry = describe(token);
  return {
    text: token,
    label: token,
    desc: entry ? entry.desc : "",
    docs: entry ? entry.docs : "",
    family: entry ? entry.family : "",
    name: entry ? entry.name : ""
  };
}

/**
 * 语句位能出现的第一个记号，按推荐顺序排列。
 * 「咕：」是打印引导符的完整写法；「咕嘎」是求值语句的词干。
 * 文案统一由词条的 desc / docs 提供，这里只列词形。
 */
const STATEMENT_STARTERS = [
  "咕",
  "咕：",
  "咕咕！？",
  "咕嘎",
  "嘎嘎",
  "嘎嘎嘎",
  "嘎嘎嘎嘎",
  "嘎嘎嘎嘎嘎"
].map(starterOfToken);

/** 表达式位能出现的第一个记号：运算符、字面量、自己、读入、新建。 */
const EXPRESSION_STARTERS = [
  "咕？",
  "咕咕？",
  "咕嘎？",
  "咕咕咕？",
  "咕咕嘎？",
  "咕嘎咕？",
  "咕嘎嘎？",
  "咕嘎嘎咕？",
  "咕嘎咕咕？",
  "咕嘎咕嘎？",
  "咕咕咕咕？",
  "咕咕嘎咕？",
  "嘎嘎嘎？",
  "嘎嘎嘎嘎？",
  "嘎嘎？",
  "嘎嘎咕？",
  "嘎咕？",
  "嘎嘎嘎嘎嘎嘎",
  "嘎嘎嘎嘎嘎嘎嘎",
  "咕嘎嘎！"
].map(starterOfToken);

/**
 * ── 方言归一化（SPEC §1）──
 *
 * 一门语言三套写法，逐位置等价：位 0 可写 咕 / グ / ぐ / GU，位 1 可写
 * 嘎 / ガ / が / GA（英文大小写都行）。标点全角半角等价。同文件同词可混排。
 * 归一化只在字符层面进行：输入任何方言拼写，出口一律是 咕 / 嘎 / ！ / ？ / ：
 * 与半角空格。词表本身（RESERVED 的 30 条）只存规范拼写，不按方言复制。
 */

/** 每种写法的方言对照表；顺序即 中文 → 日语 → 英文，hover 的对照行按此渲染。 */
const DIALECTS = [
  { zh: "咕", ja: "グ", jaHira: "ぐ", en: "GU" },
  { zh: "嘎", ja: "ガ", jaHira: "が", en: "GA" },
  { zh: "！", ja: "！", jaHira: "！", en: "!" },
  { zh: "？", ja: "？", jaHira: "？", en: "?" },
  { zh: "：", ja: "：", jaHira: "：", en: ":" }
];

/**
 * 规范化文本，并记录每个规范字符在原文里的位置，供 offset 双向换算。
 * 返回 { text, starts, ends }：starts[i] / ends[i] 是规范第 i 个字符在原文中
 * 的起止（英文位名占两个码位，所以 end - start 可能是 2）。
 */
function normalizeWithOffsets(text) {
  const source = String(text == null ? "" : text);
  let canon = "";
  const starts = [];
  const ends = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const pair = source.slice(i, i + 2).toLowerCase();
    let mapped = "";
    let width = 1;
    if (ch === "咕") mapped = "咕";
    else if (ch === "グ" || ch === "ぐ") mapped = "咕";
    else if (ch === "嘎") mapped = "嘎";
    else if (ch === "ガ" || ch === "が") mapped = "嘎";
    else if (pair === "gu") { mapped = "咕"; width = 2; }
    else if (pair === "ga") { mapped = "嘎"; width = 2; }
    else if (ch === "！" || ch === "!") mapped = "！";
    else if (ch === "？" || ch === "?") mapped = "？";
    else if (ch === "：" || ch === ":") mapped = "：";
    else if (ch === "\u3000") mapped = " ";
    else mapped = ch;
    canon += mapped;
    starts.push(i);
    ends.push(i + width);
    i += width;
  }
  return { text: canon, starts: starts, ends: ends };
}

/** 任意方言文本 → 规范拼写。 */
function normalizeText(text) {
  return normalizeWithOffsets(text).text;
}

/** 原文 offset → 规范 offset（落在英文位名中间时取该位名的起点）。 */
function canonicalOffsetOf(span, offset) {
  const limit = span.ends.length ? span.ends[span.ends.length - 1] : 0;
  const pos = Math.max(0, Math.min(Number(offset) || 0, limit));
  // 找第一个 end > pos 的规范字符：它就是要定位的那个（GU 中间也算落在咕上）。
  let low = 0;
  let high = span.ends.length - 1;
  let found = span.ends.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (span.ends[mid] > pos) { found = mid; high = mid - 1; } else { low = mid + 1; }
  }
  return found;
}

/** 规范 offset → 原文起点；越界时回落到原文长度。 */
function sourceStartOf(span, index) {
  if (index >= span.starts.length) return span.ends.length ? span.ends[span.ends.length - 1] : 0;
  return span.starts[Math.max(0, index)];
}

/** 规范结束位置（exclusive）→ 原文结束位置；用于把悬停范围还原到原文。 */
function sourceEndOf(span, index) {
  if (index <= 0) return span.starts.length ? span.starts[0] : 0;
  const last = Math.min(index, span.ends.length) - 1;
  return span.ends[Math.max(0, last)];
}

/** 规范记号 → 三种写法（中文 / 日语 / 英文）。hover 的对照行用。 */
function dialectsOf(text) {
  const source = normalizeText(text);
  const out = { zh: "", ja: "", en: "" };
  for (const ch of source) {
    const entry = DIALECTS.find(function (item) { return item.zh === ch; });
    out.zh += ch;
    out.ja += entry ? entry.ja : ch;
    out.en += entry ? entry.en : ch;
  }
  return out;
}

/**
 * BY_TEXT 的对外查表口：键仍是 29 个规范词形，但用任意方言拼写去取也命中
 * （BY_TEXT["ググ"] === BY_TEXT["咕咕"]）。Object.keys 仍只列规范键。
 */
const BY_TEXT_LOOKUP = new Proxy(BY_TEXT, {
  get: function (target, prop) {
    if (typeof prop !== "string") return target[prop];
    if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
    const canon = normalizeText(prop);
    return Object.prototype.hasOwnProperty.call(target, canon) ? target[canon] : undefined;
  },
  has: function (target, prop) {
    if (typeof prop !== "string") return false;
    return (
      Object.prototype.hasOwnProperty.call(target, prop) ||
      Object.prototype.hasOwnProperty.call(target, normalizeText(prop))
    );
  }
});

module.exports = {
  RESERVED: RESERVED,
  BY_TEXT: BY_TEXT_LOOKUP,
  DIALECTS: DIALECTS,
  normalizeText: normalizeText,
  normalizeWithOffsets: normalizeWithOffsets,
  canonicalOffsetOf: canonicalOffsetOf,
  sourceStartOf: sourceStartOf,
  sourceEndOf: sourceEndOf,
  dialectsOf: dialectsOf,
  WORDS: WORDS,
  isReserved: isReserved,
  entriesOf: entriesOf,
  describe: describe,
  STATEMENT_STARTERS: STATEMENT_STARTERS,
  EXPRESSION_STARTERS: EXPRESSION_STARTERS
};
