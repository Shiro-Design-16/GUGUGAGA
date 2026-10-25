/**
 * 咕咕嘎嘎语 · 上下文判定与补全候选（CommonJS，运行期不依赖 vscode）。
 *
 * contextAt 严格实现 vscode/CONTRACT.md §4.2 的五条上下文规则；
 * kind 只会是 top / class / statement / expression / call 之一。
 */
"use strict";

const {
  describe: describeKeyword,
  STATEMENT_STARTERS: STATEMENT_KEYWORDS,
  EXPRESSION_STARTERS: EXPRESSION_KEYWORDS,
  WORDS: KEYWORD_WORDS,
  normalizeText,
  normalizeWithOffsets,
  canonicalOffsetOf,
  sourceStartOf
} = require("./keywords");

/** VS Code CompletionItemKind 的数值；测试里不能 require vscode，所以写死。 */
const KIND = {
  method: 1,
  field: 2,
  variable: 5,
  class: 6,
  operator: 11,
  keyword: 13,
  snippet: 14
};

/** 需要弹出占位符骨架（insertTextFormat = 2）的保留词。 */
const SNIPPET_NAMES = new Set(["Class", "Method", "Entry", "Bind", "New"]);

/** 二元 / 一元运算符；其余 VAL 词条是字面量。 */
const OPERATOR_NAMES = new Set([
  "Add", "Sub", "Mul", "Div", "Mod", "Eq",
  "Lt", "Gt", "And", "Or", "Not", "Neg"
]);

const NL = String.fromCharCode(10);
const LEADING_SPACES = /^ */;

// 行首声明头：类头后面不能跟「？」，否则那是绑定。
const CLASS_HEAD = /^[ ]*咕咕！[ ]*[咕嘎]+/;
const METHOD_HEAD = /^[ ]*咕咕嘎！[ ]*[咕嘎]+/;
// 这些语句头后面就是表达式位：咕： / 嘎嘎： / 嘎嘎嘎： / 嘎嘎嘎嘎嘎：
const EXPRESSION_HEAD = /^[ ]*(咕|嘎嘎|嘎嘎嘎|嘎嘎嘎嘎嘎)：/;

// collectNames 的正则都锚在行首，能容忍行末冒号省略（咕咕！ 名字）。
const CLASS_DEF = /^[ ]*咕咕！[ ]*([咕嘎]+)/gm;
const METHOD_DEF = /^[ ]*咕咕嘎！[ ]*([咕嘎]+)/gm;
const FIELD_DEF = /^[ ]*咕咕！？[ ]*([咕嘎]+)/gm;

const WORD_CHARS = /^[咕嘎]+$/;
const LABEL_CHARS = /^[咕嘎！？： ]+$/;

/** 行首空格数。 */
function leadingSpaces(line) {
  return LEADING_SPACES.exec(line)[0].length;
}

/** 用某个「行首定义」正则扫名字，按出现顺序去重。 */
function scanNames(pattern, text) {
  const names = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!names.includes(match[1])) names.push(match[1]);
    if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
  }
  return names;
}

/**
 * 扫出本文档定义的名字。
 * 返回 { classes, methods, fields }，每个数组按定义顺序排列。
 * 方法体里的「咕咕！？」绑定也归到 fields（契约要求按正则扫描，不区分作用域）。
 */
function collectNames(text) {
  // 方言先归一到 咕/嘎，再按规范拼写扫名字；返回的名字一律是规范中文拼写。
  const source = normalizeText(text);
  return {
    classes: scanNames(CLASS_DEF, source),
    methods: scanNames(METHOD_DEF, source),
    fields: scanNames(FIELD_DEF, source)
  };
}

function isClassHead(line) {
  return CLASS_HEAD.test(line);
}

function isMethodHead(line) {
  return METHOD_HEAD.test(line);
}

/** 向上找最近的、缩进更小的块头，得到当前行的外层链（由内到外）。 */
function enclosingHeaders(lines, lineIndex, indent) {
  const chain = [];
  let current = indent;
  for (let i = lineIndex - 1; i >= 0 && current > 0; i -= 1) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    const ind = leadingSpaces(raw);
    if (ind < current) {
      chain.push(raw);
      current = ind;
    }
  }
  return chain;
}

/** 最近的非空行（当前行之前）。 */
function previousNonEmpty(lines, lineIndex) {
  for (let i = lineIndex - 1; i >= 0; i -= 1) {
    if (lines[i].trim() !== "") return lines[i];
  }
  return "";
}

/**
 * 判断 offset 处的上下文。
 * 返回 { kind, indent, lineText, lineStart, prefix, inClass, inMethod }。
 */
function contextAt(text, offset) {
  const source = String(text);
  // 三种方言（咕/グ/ぐ/GU 等）逐位置等价：先归一到规范拼写，上下文规则只写一份。
  // 英文位名占两个码位，所以 offset 要换算进规范串，lineStart 再换算回原文。
  const span = normalizeWithOffsets(source);
  const canon = span.text;
  const pos = canonicalOffsetOf(span, offset);
  const lineStart = canon.lastIndexOf(NL, pos - 1) + 1;
  let lineEnd = canon.indexOf(NL, lineStart);
  if (lineEnd < 0) lineEnd = canon.length;
  const lineText = canon.slice(lineStart, lineEnd);
  const prefix = canon.slice(lineStart, pos);
  const indent = leadingSpaces(prefix);

  const lines = canon.split(NL);
  const lineIndex = canon.slice(0, lineStart).split(NL).length - 1;
  const chain = enclosingHeaders(lines, lineIndex, indent);
  const inClass = chain.some(isClassHead);
  const inMethod = chain.some(isMethodHead);

  let kind;
  if (/^ *$/.test(prefix)) {
    // ② 空行 / 只有缩进：看上面的块头决定是 top、class 还是 statement。
    const head = previousNonEmpty(lines, lineIndex);
    if (indent === 0) {
      kind = "top";
    } else if (head !== "" && isClassHead(head)) {
      kind = "class";
    } else {
      kind = "statement";
    }
  } else if (prefix.endsWith("！？")) {
    // ④ 调用位：只给本文档的方法名。
    kind = "call";
  } else if (EXPRESSION_HEAD.test(prefix)) {
    // ③ 表达式位：咕： / 嘎嘎： / 嘎嘎嘎： / 嘎嘎嘎嘎嘎： 之后。
    kind = "expression";
  } else {
    // ⑤ 其它非空前缀都按语句位处理。
    kind = "statement";
  }

  return {
    kind: kind,
    indent: indent,
    lineText: lineText,
    lineStart: sourceStartOf(span, lineStart),
    prefix: prefix,
    inClass: inClass,
    inMethod: inMethod
  };
}

/** 起始记号 → 词条；「咕：」这种带引导符的退一步查词干。 */
function entryForStarter(token) {
  const direct = describeKeyword(token);
  if (direct) return direct;
  const stem = token.replace(/[！？：]+$/, "");
  return stem !== "" && stem !== token ? describeKeyword(stem) : null;
}

/** 保留词起始记号的补全项。 */
function keywordItem(starter) {
  const entry = entryForStarter(starter.text);
  const label = starter.label || starter.text;
  // detail / documentation 会直接出现在补全弹窗里：只用词条的纯咕嘎形状，
  // family / name 是结构数据，不渲染。
  const detail = entry ? entry.desc : starter.text;
  const documentation = entry ? entry.docs : starter.docs || starter.text;
  const snippet = entry && SNIPPET_NAMES.has(entry.name) ? entry.snippet : "";
  if (snippet) {
    return {
      label: label,
      kind: KIND.snippet,
      detail: detail,
      documentation: documentation,
      insertText: snippet,
      insertTextFormat: 2
    };
  }
  const isOperator = Boolean(entry && entry.family === "VAL" && OPERATOR_NAMES.has(entry.name));
  return {
    label: label,
    kind: isOperator ? KIND.operator : KIND.keyword,
    detail: detail,
    documentation: documentation,
    insertText: starter.text,
    insertTextFormat: 1
  };
}

/** 名字分类的咕嘎词形（补全弹窗里可见，只许 咕/嘎/！/？/：/空格）。 */
const NAME_LABELS = { class: "咕咕！", method: "咕咕嘎！", field: "咕咕！？" };
const NAME_DOCS = {
  class: "咕嘎嘎！ 嘎咕咕？",
  method: "嘎咕嘎 咕咕嘎！",
  field: "咕咕！？ 嘎咕嘎： 嘎咕？"
};

/** 本文档名字的补全项。 */
function nameItem(name, category) {
  return {
    label: name,
    kind: KIND[category],
    detail: NAME_LABELS[category] + " " + KEYWORD_WORDS.thisDoc,
    documentation: NAME_DOCS[category],
    insertText: name,
    insertTextFormat: 1
  };
}

// 起始记号只给词形与标签；desc / docs 一律回落到词条，避免在两处维护文案。
const TOP_STARTERS = [
  { text: "咕咕！", label: "咕咕！" },
  { text: "咕咕嘎嘎！", label: "咕咕嘎嘎！" }
];

const CLASS_STARTERS = [
  { text: "咕咕！？", label: "咕咕！？" },
  { text: "咕咕嘎！", label: "咕咕嘎！" }
];

/**
 * offset 处的补全候选。
 * 返回数组，元素形如 { label, kind, detail, documentation, insertText, insertTextFormat }；
 * kind 是 VS Code CompletionItemKind 的数值。
 */
function completionsAt(text, offset) {
  const source = String(text);
  const context = contextAt(source, offset);
  const names = collectNames(source);
  const items = [];
  const seen = new Set();

  function add(item) {
    if (!item || seen.has(item.label)) return;
    seen.add(item.label);
    items.push(item);
  }

  if (context.kind === "top") {
    TOP_STARTERS.forEach(function (starter) {
      add(keywordItem(starter));
    });
  } else if (context.kind === "class") {
    CLASS_STARTERS.forEach(function (starter) {
      add(keywordItem(starter));
    });
  } else if (context.kind === "statement") {
    STATEMENT_KEYWORDS.forEach(function (starter) {
      add(keywordItem(starter));
    });
  } else if (context.kind === "expression") {
    EXPRESSION_KEYWORDS.forEach(function (starter) {
      add(keywordItem(starter));
    });
    names.classes.forEach(function (name) {
      add(nameItem(name, "class"));
    });
    names.fields.forEach(function (name) {
      add(nameItem(name, "field"));
    });
    names.methods.forEach(function (name) {
      add(nameItem(name, "method"));
    });
  } else if (context.kind === "call") {
    names.methods.forEach(function (name) {
      add(nameItem(name, "method"));
    });
  }

  return items;
}

module.exports = {
  contextAt: contextAt,
  completionsAt: completionsAt,
  collectNames: collectNames
};
