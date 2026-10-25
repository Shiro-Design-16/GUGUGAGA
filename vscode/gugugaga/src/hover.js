/**
 * 咕咕嘎嘎语 · 悬停释义（CommonJS，运行期不依赖 vscode）。
 *
 * 命中规则：先取 offset 处最长的保留记号（RESERVED 已按长度降序，用前缀判定
 * 加记号边界校验，所以「咕嘎嘎咕？」不会被「咕嘎嘎？」抢走）；不是保留记号时
 * 再看它是不是本文档定义的名字；都不是返回 null。
 */
"use strict";

const {
  RESERVED,
  WORDS,
  normalizeWithOffsets,
  canonicalOffsetOf,
  sourceStartOf,
  sourceEndOf,
  dialectsOf
} = require("./keywords");
const { collectNames } = require("./completion");

const WORD_CHAR = /[咕嘎]/;
const TOKEN_CHAR = /[咕嘎！？]/;

function isWordChar(ch) {
  return WORD_CHAR.test(ch);
}

function isTokenChar(ch) {
  return TOKEN_CHAR.test(ch);
}

/**
 * 取 offset 所在的记号：字串（全是 咕/嘎）加上紧贴的 ！ / ！？ / ？ 后缀。
 * offset 允许正好落在记号右边缘（VS Code 光标常见位置），但不允许落在
 * 记号之后的空白或「：」上。
 */
function tokenAt(text, offset) {
  if (offset < 0 || offset > text.length) return null;
  if (offset < text.length && !isTokenChar(text[offset])) return null;

  let start = offset;
  // 光标停在 ！/？ 之后时先退回后缀起点。
  while (start > 0 && isTokenChar(text[start - 1]) && !isWordChar(text[start - 1])) {
    start -= 1;
  }
  while (start > 0 && isWordChar(text[start - 1])) {
    start -= 1;
  }

  let wordEnd = start;
  while (wordEnd < text.length && isWordChar(text[wordEnd])) wordEnd += 1;
  if (wordEnd === start) return null;

  let end = wordEnd;
  if (text.startsWith("！？", wordEnd)) {
    end = wordEnd + 2;
  } else if (isTokenChar(text[wordEnd]) && !isWordChar(text[wordEnd])) {
    end = wordEnd + 1;
  }

  if (offset < start || offset > end) return null;
  if (offset === end && offset < text.length) return null;

  return {
    start: start,
    end: end,
    word: text.slice(start, wordEnd),
    suffix: text.slice(wordEnd, end)
  };
}

/**
 * 最长保留记号匹配：RESERVED 已按长度降序，第一个「能拼成完整记号」的词条即最长。
 * 后缀必须是该家族合法的后缀，否则跳过（例如「嘎嘎咕咕」不会命中「嘎嘎」）。
 */
function reservedAt(text, offset) {
  const span = tokenAt(text, offset);
  if (!span) return null;
  const full = text.slice(span.start, span.end);

  for (const entry of RESERVED) {
    if (!full.startsWith(entry.text)) continue;
    const extra = full.slice(entry.text.length);
    let legal = false;
    if (extra === "") {
      legal = true;
    } else if (extra === "！") {
      legal = entry.family === "DECL";
    } else if (extra === "！？") {
      legal = entry.family === "ACT";
    }
    if (!legal) continue;
    return { entry: entry, start: span.start, end: span.end, text: full };
  }
  return null;
}

/**
 * 名字分类的咕嘎词形。悬停内容会原样显示，只许出现 咕/嘎/！/？/：/空格。
 * label 用该分类在语言里的记号自身拼写，hint 用它的用法形状。
 */
const NAME_KIND = {
  class: { label: "咕咕！", hint: "咕嘎嘎！ 嘎咕咕？" },
  method: { label: "咕咕嘎！", hint: "嘎咕嘎 咕咕嘎！" },
  field: { label: "咕咕！？", hint: "咕咕！？ 嘎咕嘎： 嘎咕？" }
};

function nameAt(text, span) {
  const names = collectNames(text);
  const LISTS = { class: "classes", method: "methods", field: "fields" };
  for (const category of ["class", "method", "field"]) {
    if (names[LISTS[category]].includes(span.word)) {
      return { category: category, name: span.word };
    }
  }
  return null;
}

/**
 * offset 处的悬停内容。
 * 返回 { contents: string[], range: { start, end } } 或 null；range 是 0-based 字符偏移。
 */
function hoverAt(text, offset) {
  const source = String(text);
  // 先归一到规范拼写再找记号（三方言逐位置等价）；返回的 range 再换算回原文 offset，
  // 这样日语/英语源码里悬停范围仍然精确覆盖真实字符。
  const normalized = normalizeWithOffsets(source);
  const canon = normalized.text;
  const pos = canonicalOffsetOf(normalized, offset);
  const span = tokenAt(canon, pos);
  if (!span) return null;

  const keyword = reservedAt(canon, pos);
  if (keyword) {
    const spellings = dialectsOf(keyword.text);
    return {
      contents: [
        "**" + keyword.text + "** " + keyword.entry.desc,
        keyword.entry.docs,
        // 对照行：同一记号的中文 / 日语 / 英文写法（悬停里唯一允许非咕嘎字符的行）
        spellings.zh + " = " + spellings.ja + " = " + spellings.en
      ],
      range: {
        start: sourceStartOf(normalized, keyword.start),
        end: sourceEndOf(normalized, keyword.end)
      }
    };
  }

  const name = nameAt(canon, span);
  if (!name) return null;
  const info = NAME_KIND[name.category];
  return {
    contents: [
      "**" + span.word + "** " + info.label + " " + WORDS.thisDoc,
      info.hint
    ],
    range: {
      start: sourceStartOf(normalized, span.start),
      end: sourceEndOf(normalized, span.end)
    }
  };
}

module.exports = {
  hoverAt: hoverAt
};
