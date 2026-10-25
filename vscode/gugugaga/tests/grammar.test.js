// 咕咕嘎嘎语 · TextMate 语法测试（离线、零依赖、不 require("vscode")）
// 驱动器语义见 CONTRACT §5：按 patterns 顺序逐条做全局匹配，同一起点先出现者胜，
// 重叠区域先到先得（后到者整条跳过）；规则里的 captures 覆盖整条 match 的底色。
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const PKG_DIR = path.join(__dirname, "..");
const REPO_ROOT = path.join(PKG_DIR, "..", "..");
const GRAMMAR = JSON.parse(
  fs.readFileSync(path.join(PKG_DIR, "syntaxes", "gugugaga.tmLanguage.json"), "utf8")
);

// CONTRACT §5.4 的 scope 白名单：语法里出现别的 scope 即违约
const WHITELIST = new Set([
  "keyword.control.flow.gugugaga",
  "keyword.declaration.class.gugugaga",
  "keyword.declaration.method.gugugaga",
  "keyword.declaration.entry.gugugaga",
  "keyword.declaration.bind.gugugaga",
  "keyword.other.gugugaga",
  "keyword.other.this.gugugaga",
  "keyword.other.read.gugugaga",
  "keyword.operator.new.gugugaga",
  "keyword.operator.call.gugugaga",
  "keyword.operator.arithmetic.gugugaga",
  "keyword.operator.comparison.gugugaga",
  "keyword.operator.logical.gugugaga",
  "keyword.operator.unary.gugugaga",
  "constant.numeric.integer.gugugaga",
  "constant.numeric.bits.gugugaga",
  "constant.language.boolean.gugugaga",
  "constant.language.null.gugugaga",
  "entity.name.class.gugugaga",
  "entity.name.function.gugugaga",
  "variable.other.gugugaga",
  "punctuation.separator.colon.gugugaga",
  "punctuation.section.indent.gugugaga",
]);

const FLOW = "keyword.control.flow.gugugaga";
const CLASS = "keyword.declaration.class.gugugaga";
const METHOD = "keyword.declaration.method.gugugaga";
const ENTRY = "keyword.declaration.entry.gugugaga";
const BIND = "keyword.declaration.bind.gugugaga";
const OTHER = "keyword.other.gugugaga";
const THIS = "keyword.other.this.gugugaga";
const READ = "keyword.other.read.gugugaga";
const NEW = "keyword.operator.new.gugugaga";
const CALL = "keyword.operator.call.gugugaga";
const ARITH = "keyword.operator.arithmetic.gugugaga";
const CMP = "keyword.operator.comparison.gugugaga";
const LOGIC = "keyword.operator.logical.gugugaga";
const UNARY = "keyword.operator.unary.gugugaga";
const INT = "constant.numeric.integer.gugugaga";
const BITS = "constant.numeric.bits.gugugaga";
const BOOL = "constant.language.boolean.gugugaga";
const NULL = "constant.language.null.gugugaga";
const E_CLASS = "entity.name.class.gugugaga";
const E_FUNC = "entity.name.function.gugugaga";
const VAR = "variable.other.gugugaga";
const COLON = "punctuation.separator.colon.gugugaga";

// 规则只编译一次：d 旗标给出捕获组的字符区间，用来让 captures 覆盖底色
const RULES = GRAMMAR.patterns.map((rule) => ({
  name: rule.name,
  captures: rule.captures || {},
  re: new RegExp(rule.match, "gd"),
}));

// ---------- 方言展开（SPEC §1.1）----------
// 语法里每个「位」都写成 (?:咕|グ|ぐ|[Gg][Uu]) 这样的非捕获交替，捕获组编号一个都没变。
const BIT0 = "(?:咕|グ|ぐ|[Gg][Uu])";
const BIT1 = "(?:嘎|ガ|が|[Gg][Aa])";
const BOTH = "(?:咕|グ|ぐ|[Gg][Uu]|嘎|ガ|が|[Gg][Aa])";
const WITH_PUNCT = "(?:咕|グ|ぐ|[Gg][Uu]|嘎|ガ|が|[Gg][Aa]|[！!]|[？?])";

// 把方言展开还原成规范写法：规则顺序断言继续用改造前的原始 pattern
function canonicalMatch(match) {
  return match
    .split(WITH_PUNCT).join("[咕嘎！？]")
    .split(BOTH).join("[咕嘎]")
    .split(BIT0).join("咕")
    .split(BIT1).join("嘎")
    .split("[！!]").join("！")
    .split("[？?]").join("？")
    .split("[：:]").join("：")
    .split("[ 　]*").join(" *")
    .split("[ 　]+").join(" +");
}

// 规范写法 → 方言（只用来拼测试文本）
const JA_MAP = { "咕": "グ", "嘎": "ガ", "！": "！", "？": "？", "：": "：" };
const EN_MAP = { "咕": "GU", "嘎": "GA", "！": "!", "？": "?", "：": ":" };
function toDialect(text, map) {
  return Array.from(text)
    .map((ch) => (map[ch] === undefined ? ch : map[ch]))
    .join("");
}

// ---------- 迷你驱动器 ----------
// 对一行文本返回 [{ start, end, name }]（已把相邻同色字符合并）。
function tokenize(line) {
  const claimed = new Array(line.length).fill(null);
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(line)) !== null) {
      if (m[0].length === 0) {
        rule.re.lastIndex += 1; // 零宽匹配：推进一格，防死循环
        continue;
      }
      const start = m.index;
      const end = start + m[0].length;
      let free = true;
      for (let i = start; i < end; i += 1) {
        if (claimed[i] !== null) {
          free = false;
          break;
        }
      }
      if (!free) continue; // 与已占区域重叠：后到者整条跳过
      for (let i = start; i < end; i += 1) claimed[i] = rule.name;
      for (const key of Object.keys(rule.captures)) {
        const span = m.indices[Number(key)];
        if (!span || span[0] === span[1]) continue;
        for (let i = span[0]; i < span[1]; i += 1) claimed[i] = rule.captures[key].name;
      }
    }
  }
  const tokens = [];
  for (let i = 0; i < line.length; i += 1) {
    const scope = claimed[i];
    if (scope === null) continue;
    const last = tokens[tokens.length - 1];
    if (last && last.end === i && last.name === scope) last.end = i + 1;
    else tokens.push({ start: i, end: i + 1, name: scope });
  }
  return tokens;
}

// 行内第一处 text 必须整体是同一个 scope，返回它（用来断言具体片段的 scope）
function scopeOfText(line, text) {
  const at = line.indexOf(text);
  assert.ok(at >= 0, "测试行里找不到「" + text + "」：" + JSON.stringify(line));
  const seen = new Set();
  for (let i = at; i < at + text.length; i += 1) {
    const token = tokenize(line).find((t) => t.start <= i && i < t.end);
    seen.add(token ? token.name : null);
  }
  assert.equal(seen.size, 1, "「" + text + "」被拆成了多个 scope：" + JSON.stringify([...seen]));
  return [...seen][0];
}

// 行内第一处 text 必须恰好等于一个记号（断言「不混淆」要用边界，不能只看 scope）
function exactToken(line, text) {
  const at = line.indexOf(text);
  assert.ok(at >= 0, "测试行里找不到「" + text + "」：" + JSON.stringify(line));
  const token = tokenize(line).find((t) => t.start <= at && at < t.end);
  assert.ok(token, "「" + text + "」没有被任何规则覆盖：" + JSON.stringify(line));
  assert.deepEqual(
    [token.start, token.end],
    [at, at + text.length],
    "「" + text + "」的记号边界不对（说明它被更短/更长的规则吃掉了）"
  );
  return token;
}

// 30 条保留记号（CONTRACT §3）。咕嘎！？ 由「咕嘎 + ！？」两段组成，单独断言。
const RESERVED_CASES = [
  ["咕", "咕：嘎嘎？", OTHER],
  ["嘎嘎", "嘎嘎：嘎嘎？", FLOW],
  ["嘎嘎嘎", "嘎嘎嘎：嘎嘎？", FLOW],
  ["嘎嘎嘎嘎", "嘎嘎嘎嘎", FLOW],
  ["嘎嘎嘎嘎嘎", "嘎嘎嘎嘎嘎：嘎嘎？", FLOW],
  ["嘎嘎嘎嘎嘎嘎", "咕：嘎嘎嘎嘎嘎嘎", THIS],
  ["嘎嘎嘎嘎嘎嘎嘎", "咕：嘎嘎嘎嘎嘎嘎嘎", READ],
  ["咕咕！", "咕咕！ 嘎咕咕", CLASS],
  ["咕咕嘎！", "咕咕嘎！ 嘎咕嘎", METHOD],
  ["咕咕嘎嘎！", "咕咕嘎嘎！ 嘎咕嘎嘎", ENTRY],
  ["咕嘎嘎！", "咕：咕嘎嘎！ 嘎咕嘎咕嘎？", NEW],
  ["咕咕！？", "    咕咕！？ 嘎咕咕：嘎嘎？", BIND],
  ["咕？", "咕：咕？ 嘎嘎？", ARITH],
  ["咕咕？", "咕：咕咕？ 嘎嘎？", ARITH],
  ["咕嘎？", "咕：咕嘎？ 嘎嘎？ 嘎嘎？", ARITH],
  ["咕咕咕？", "咕：咕咕咕？ 嘎嘎？ 嘎嘎？", ARITH],
  ["咕咕嘎？", "咕：咕咕嘎？ 嘎嘎？ 嘎嘎？", ARITH],
  ["咕嘎咕？", "咕：咕嘎咕？ 嘎嘎？ 嘎嘎？", CMP],
  ["咕嘎嘎？", "咕：咕嘎嘎？ 嘎嘎？ 嘎嘎？", CMP],
  ["咕嘎嘎咕？", "咕：咕嘎嘎咕？ 嘎嘎？ 嘎嘎？", CMP],
  ["咕嘎咕咕？", "咕：咕嘎咕咕？ 嘎嘎？ 嘎嘎？", LOGIC],
  ["咕嘎咕嘎？", "咕：咕嘎咕嘎？ 嘎嘎？ 嘎嘎？", LOGIC],
  ["咕咕咕咕？", "咕：咕咕咕咕？ 嘎嘎？", LOGIC],
  ["咕咕嘎咕？", "咕：咕咕嘎咕？ 嘎嘎？", UNARY],
  ["嘎嘎嘎？咕", "咕：嘎嘎嘎？咕", INT],
  ["嘎嘎嘎嘎？咕", "咕：嘎嘎嘎嘎？咕", BITS],
  ["嘎嘎？", "咕：嘎嘎？", BOOL],
  ["嘎嘎咕？", "咕：嘎嘎咕？", BOOL],
  ["嘎咕？", "咕：嘎咕？", NULL],
];

// 规则顺序断言用的精确 pattern（顺序即优先级）
const BY_MATCH = new Map(
  GRAMMAR.patterns.map((rule, index) => [canonicalMatch(rule.match), index])
);
function ruleAt(match) {
  assert.ok(BY_MATCH.has(match), "语法里找不到这条 match：" + match);
  return BY_MATCH.get(match);
}

test("语法结构：scopeName 是 source.gugugaga，patterns 是扁平数组", () => {
  assert.equal(GRAMMAR.scopeName, "source.gugugaga");
  assert.ok(Array.isArray(GRAMMAR.patterns), "patterns 必须是数组");
  assert.ok(GRAMMAR.patterns.length >= 30, "规则太少，覆盖不了全部保留记号");
});

test("每条规则只有 match + name（可选 captures），没有 begin/end/include/repository/while", () => {
  for (const rule of GRAMMAR.patterns) {
    for (const key of Object.keys(rule)) {
      assert.ok(
        key === "match" || key === "name" || key === "captures",
        "规则里出现了不允许的字段：" + key
      );
    }
    assert.equal(typeof rule.match, "string", "match 必须是字符串");
    assert.equal(typeof rule.name, "string", "name 必须是字符串");
    if (rule.captures) {
      for (const key of Object.keys(rule.captures)) {
        assert.ok(/^[1-9]\d*$/.test(key), "captures 的键必须是正整数序号：" + key);
        assert.equal(typeof rule.captures[key].name, "string");
      }
    }
  }
});

test("每条 match 都能被 new RegExp() 编译", () => {
  for (const rule of GRAMMAR.patterns) {
    assert.doesNotThrow(() => new RegExp(rule.match), "无法编译：" + rule.match);
  }
});

test("每个 name（含 captures 的 name）都在 CONTRACT §5.4 白名单内", () => {
  for (const rule of GRAMMAR.patterns) {
    assert.ok(WHITELIST.has(rule.name), "自造了 scope：" + rule.name);
    if (!rule.captures) continue;
    for (const key of Object.keys(rule.captures)) {
      assert.ok(WHITELIST.has(rule.captures[key].name), "自造了 capture scope：" + rule.captures[key].name);
    }
  }
});

test("没有重复的 match", () => {
  const seen = new Set();
  for (const rule of GRAMMAR.patterns) {
    assert.equal(seen.has(rule.match), false, "重复的 match：" + rule.match);
    seen.add(rule.match);
  }
});

test("30 条保留记号里 29 条单段记号都被对应的 scope 覆盖", () => {
  assert.equal(RESERVED_CASES.length, 29);
  for (const [token, line, scope] of RESERVED_CASES) {
    assert.equal(scopeOfText(line, token), scope, "保留记号「" + token + "」的 scope 不对");
  }
});

test("动作词 咕嘎！？ = 咕嘎（keyword.other）+ ！？（keyword.operator.call）", () => {
  const line = "咕嘎！？ 嘎嘎咕嘎咕？";
  assert.equal(scopeOfText(line, "咕嘎"), OTHER);
  assert.equal(exactToken(line, "！？").name, CALL);
});

test("入口头 咕咕嘎嘎！ 是 entry，入口名取 entity.name.function", () => {
  const line = "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕";
  assert.equal(scopeOfText(line, "咕咕嘎嘎！"), ENTRY);
  // 入口名不是类名，用 entity.name.function（与「！？ 之后的方法名」同一档）
  assert.equal(scopeOfText(line, "嘎咕嘎嘎嘎咕"), E_FUNC);
});

test("类头 咕咕！ 是 class，类名取 entity.name.class", () => {
  const line = "咕咕！ 嘎咕咕";
  assert.equal(scopeOfText(line, "咕咕！"), CLASS);
  assert.equal(scopeOfText(line, "嘎咕咕"), E_CLASS);
});

test("方法头 咕咕嘎！ 是 method，方法名取 entity.name.function", () => {
  const line = "咕咕嘎！ 嘎咕嘎";
  assert.equal(scopeOfText(line, "咕咕嘎！"), METHOD);
  assert.equal(scopeOfText(line, "嘎咕嘎"), E_FUNC);
});

test("字段/绑定 咕咕！？ 是 bind，目标名是 variable.other", () => {
  const line = "    咕咕！？ 嘎咕咕：嘎嘎？";
  assert.equal(scopeOfText(line, "咕咕！？"), BIND);
  assert.equal(scopeOfText(line, "嘎咕咕"), VAR);
  assert.equal(exactToken(line, "：").name, COLON);
});

test("打印语句 咕： = keyword.other + 冒号标点", () => {
  const line = "咕：嘎嘎？";
  assert.equal(exactToken(line, "咕").name, OTHER);
  assert.equal(exactToken(line, "：").name, COLON);
});

test("咕？ 与 咕咕？ 不混淆（加 vs 减，记号边界必须各自完整）", () => {
  assert.equal(exactToken("咕：咕？ 嘎嘎？", "咕？").name, ARITH);
  assert.equal(exactToken("咕：咕咕？ 嘎嘎？", "咕咕？").name, ARITH);
  // 减法行里只应有一个算术记号（咕咕？ 不能被拆成 咕 + 咕？）
  const arith = tokenize("咕：咕咕？ 嘎嘎？").filter((t) => t.name === ARITH);
  assert.equal(arith.length, 1);
  assert.deepEqual([arith[0].start, arith[0].end], [2, 5]);
});

test("嘎嘎嘎嘎？ 与 嘎嘎嘎？ 不混淆（位串 vs 整数，位串要紧贴一起上色）", () => {
  const bits = exactToken("咕：嘎嘎嘎嘎？咕", "嘎嘎嘎嘎？咕");
  assert.equal(bits.name, BITS);
  assert.deepEqual([bits.start, bits.end], [2, 8]);
  const int = exactToken("咕：嘎嘎嘎？咕", "嘎嘎嘎？咕");
  assert.equal(int.name, INT);
  assert.deepEqual([int.start, int.end], [2, 7]);
  // 位串字面量里的 嘎嘎嘎？ 不能被当成整数字面量
  const inner = tokenize("咕：嘎嘎嘎嘎？咕").find((t) => t.start <= 3 && 3 < t.end);
  assert.equal(inner.name, BITS);
  assert.deepEqual([inner.start, inner.end], [2, 8]);
});

test("咕嘎嘎咕？ 与 咕嘎嘎？ 不混淆（大于 vs 小于）", () => {
  const gt = exactToken("咕：咕嘎嘎咕？ 嘎嘎？", "咕嘎嘎咕？");
  assert.equal(gt.name, CMP);
  assert.deepEqual([gt.start, gt.end], [2, 7]);
  const lt = exactToken("咕：咕嘎嘎？ 嘎嘎？", "咕嘎嘎？");
  assert.equal(lt.name, CMP);
  assert.deepEqual([lt.start, lt.end], [2, 6]);
});

test("嘎咕？ 是空字面量，不会被当成裸词 嘎", () => {
  const line = "咕：嘎咕？";
  const token = exactToken(line, "嘎咕？");
  assert.equal(token.name, NULL);
  assert.deepEqual([token.start, token.end], [2, 5]);
  // 不能出现只覆盖开头那个 嘎 的短记号
  const short = tokenize(line).find((t) => t.start === 2 && t.end === 3);
  assert.equal(short, undefined);
});

test("！？ 是调用后缀（接收者 ！？ 方法名 形式里也成立）", () => {
  const line = "嘎嘎咕嘎咕！？ 嘎咕嘎咕咕！";
  assert.equal(scopeOfText(line, "嘎嘎咕嘎咕"), VAR);
  assert.equal(exactToken(line, "！？").name, CALL);
  assert.equal(scopeOfText(line, "嘎咕嘎咕咕！"), E_FUNC);
});

test("： 是标点（声明头后面的冒号同样走标点）", () => {
  const line = "咕咕！ 嘎咕咕：嘎嘎？";
  assert.equal(exactToken(line, "：").name, COLON);
  assert.equal(scopeOfText(line, "嘎咕咕"), E_CLASS);
});

test("方法调用名是 entity.name.function，取值名是 variable.other", () => {
  const line = "咕：嘎嘎咕嘎咕？ 嘎咕嘎咕咕！";
  assert.equal(scopeOfText(line, "嘎嘎咕嘎咕？"), VAR);
  assert.equal(scopeOfText(line, "嘎咕嘎咕咕！"), E_FUNC);
});

test("长记号排在它的前缀之前（CONTRACT §5 顺序即优先级）", () => {
  const pairs = [
    ["(^| +)咕咕嘎嘎！(?: *([咕嘎]+))?", "(^| +)咕咕嘎！(?: *([咕嘎]+))?"],
    ["(^| +)咕咕嘎！(?: *([咕嘎]+))?", "(^| +)咕咕！？(?: *([咕嘎]+)？?)?"],
    ["(^| +)咕咕！？(?: *([咕嘎]+)？?)?", "(^| +)咕咕！(?: *([咕嘎]+))?"],
    ["(^| +|：)嘎嘎嘎嘎？[咕嘎]*", "(^| +|：)嘎嘎嘎？[咕嘎]*"],
    ["(^| +|：)咕嘎嘎咕？", "(^| +|：)咕嘎嘎？"],
    ["(^| +|：)嘎嘎嘎嘎嘎嘎嘎", "(^| +|：)嘎嘎嘎嘎嘎嘎"],
    ["(^| +|：)嘎嘎嘎嘎嘎嘎", "(^| +)嘎嘎嘎嘎嘎"],
    ["(^| +)嘎嘎嘎嘎嘎", "(^| +)嘎嘎嘎嘎"],
    ["(^| +)嘎嘎嘎嘎", "(^| +)嘎嘎嘎"],
    ["(^| +)嘎嘎嘎", "(^| +)嘎嘎"],
    ["(^| +|：)咕咕嘎咕？", "(^| +|：)咕咕？"],
  ];
  for (const [longer, shorter] of pairs) {
    assert.ok(ruleAt(longer) < ruleAt(shorter), "「" + longer + "」必须排在「" + shorter + "」之前");
  }
});

test("examples/ 五个文件逐行全覆盖（除空格外每个位置都有 scope）", () => {
  const dir = path.join(REPO_ROOT, "examples");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".咕咕")).sort();
  assert.equal(files.length, 5, "examples/ 应当正好有 5 个 .咕咕 文件");
  let checked = 0;
  for (const file of files) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split("\n");
    lines.forEach((raw, index) => {
      const line = raw.replace(/\r$/, "");
      if (line.trim() === "") return; // 空行不产生记号
      const tokens = tokenize(line);
      for (let i = 0; i < line.length; i += 1) {
        if (line[i] === " ") continue; // 空格本来就不上色
        const token = tokens.find((t) => t.start <= i && i < t.end);
        assert.ok(token, file + ":" + (index + 1) + ":" + (i + 1) + " 未覆盖字符「" + line[i] + "」");
        checked += 1;
      }
    });
  }
  assert.ok(checked > 500, "覆盖到的字符太少，示例文件没读到：" + checked);
});

test("29 条保留记号在日语 / 英语下同为同一 scope", () => {
  assert.equal(RESERVED_CASES.length, 29);
  for (const [token, line, scope] of RESERVED_CASES) {
    const jaToken = toDialect(token, JA_MAP);
    const jaLine = toDialect(line, JA_MAP);
    assert.equal(scopeOfText(jaLine, jaToken), scope, "日语变体「" + jaToken + "」scope 不对");
    const enToken = toDialect(token, EN_MAP);
    const enLine = toDialect(line, EN_MAP);
    assert.equal(scopeOfText(enLine, enToken), scope, "英语变体「" + enToken + "」scope 不对");
  }
});

test("同一个词里三种方言混排仍然是一个记号", () => {
  const line = "グ咕！ ガ嘎が：GA嘎？";
  assert.equal(scopeOfText(line, "グ咕！"), CLASS);
  assert.equal(scopeOfText(line, "ガ嘎が"), E_CLASS);
  assert.equal(exactToken(line, "GA嘎？").name, BOOL);
  assert.equal(exactToken(line, "：").name, COLON);
});

test("英语 GU / GA 是两个字母一个记号，不会被拆成两个 token", () => {
  const line = "GUGU! GAGUGU";
  assert.equal(scopeOfText(line, "GUGU!"), CLASS);
  assert.equal(scopeOfText(line, "GAGUGU"), E_CLASS);
  // 声明头整段（含名字前空格）是一个 CLASS 记号，但 0 / 1 两个字母绝不能各占一个 token
  const tokens = tokenize(line);
  const head = tokens.find((t) => t.start <= 1 && 1 < t.end);
  assert.equal(head.start, 0, "GU 被拆成了两个 token：" + JSON.stringify(tokens));
  assert.ok(head.end >= 5, "GU 记号太短：" + JSON.stringify(head));
  const name = tokens.find((t) => t.start <= 7 && 7 < t.end);
  assert.equal(name.name, E_CLASS);
  assert.equal(name.start, 6, "GA 被拆开了：" + JSON.stringify(tokens));
});

test("半角标点 ! ? : 与全角同色", () => {
  assert.equal(exactToken("GAGU!?", "!?").name, CALL);
  assert.equal(exactToken("嘎咕！？", "！？").name, CALL);
  assert.equal(exactToken("GU:GAGA?", ":").name, COLON);
  assert.equal(exactToken("咕：嘎嘎？", "：").name, COLON);
  assert.equal(exactToken("GU: GAGA?", "GAGA?").name, BOOL);
});

test("日语 / 英语 / 混排样例行逐非空格字符全覆盖", () => {
  const samples = ["ググ！ ガググ：ガガ？", "GUGU! GAGUGU: GAGA?", "グ咕GU！ ガ嘎が：GA嘎？"];
  let checked = 0;
  for (const line of samples) {
    const tokens = tokenize(line);
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === " ") continue;
      const token = tokens.find((t) => t.start <= i && i < t.end);
      assert.ok(token, "未覆盖字符「" + line[i] + "」：" + line);
      checked += 1;
    }
  }
  assert.ok(checked > 30, "覆盖到的字符太少：" + checked);
});

module.exports = { tokenize, scopeOfText, exactToken };
