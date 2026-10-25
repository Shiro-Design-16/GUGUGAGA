import assert from "node:assert/strict";
import test from "node:test";

import { GgError } from "../src/errors.ts";
import { ACT, BARE, DECL, VAL } from "../src/keywords.ts";
import { tokenize } from "../src/lexer.ts";

function catchError(fn: () => void): GgError {
  try {
    fn();
  } catch (error) {
    if (error instanceof GgError) return error;
    throw error;
  }
  assert.fail("期望抛出 GgError，但没有抛错");
}

const kindString = (src: string): string => tokenize(src).map((token) => token.kind).join(" ");

test("保留词表：裸词是 WORD，加 ！ 是 DECL，加 ！？ 是 ACT", () => {
  for (const word of Object.keys(BARE)) {
    const tokens = tokenize(`${word}\n`);
    assert.equal(tokens[0].kind, "WORD", `${word} 应为 WORD`);
    assert.equal(tokens[0].text, word);
  }
  for (const word of Object.keys(DECL)) {
    const tokens = tokenize(`${word}！\n`);
    assert.equal(tokens[0].kind, "DECL", `${word}！ 应为 DECL`);
    assert.equal(tokens[0].text, word);
  }
  for (const word of Object.keys(ACT)) {
    const tokens = tokenize(`${word}！？\n`);
    assert.equal(tokens[0].kind, "ACT", `${word}！？ 应为 ACT`);
    assert.equal(tokens[0].text, word);
  }
});

test("保留词表：加 ？ 是 VAL，整数/位串字面量带紧贴位串", () => {
  for (const word of Object.keys(VAL)) {
    const def = VAL[word];
    const literal = def.kind === "intlit" || def.kind === "bitslit";
    const tokens = tokenize(literal ? `${word}？咕嘎\n` : `${word}？\n`);
    assert.equal(tokens[0].kind, "VAL", `${word}？ 应为 VAL`);
    assert.equal(tokens[0].text, word);
    assert.equal(tokens[0].bits, literal ? "咕嘎" : undefined);
  }
});

test("冒号：出现在行中保留，行末的冒号糖丢弃", () => {
  assert.equal(kindString("咕咕！？ 咕：嘎？\n"), "ACT WORD COLON VAL NEWLINE EOF");
  assert.equal(kindString("咕咕！ 咕嘎：\n"), "DECL WORD NEWLINE EOF");
  assert.equal(kindString("咕咕！ 咕嘎："), "DECL WORD NEWLINE EOF");
  const tokens = tokenize("咕：嘎？\n");
  assert.equal(tokens[1].kind, "COLON");
  assert.equal(tokens[1].text, "：");
});

test("位串字面量：紧贴合法，缺位串或隔了空格报 E1003", () => {
  assert.equal(tokenize("嘎嘎嘎？咕\n")[0].bits, "咕");
  assert.equal(tokenize("嘎嘎嘎嘎？咕嘎咕\n")[0].bits, "咕嘎咕");
  const missing = catchError(() => tokenize("嘎嘎嘎？\n"));
  assert.equal(missing.code, "E1003");
  assert.equal(missing.pos?.line, 1);
  assert.equal(catchError(() => tokenize("嘎嘎嘎嘎？ 咕\n")).code, "E1003");
});

test("非法字符：数字、ASCII 字母、制表符、BOM 都报 E1001", () => {
  const digit = catchError(() => tokenize("咕1\n"));
  assert.equal(digit.code, "E1001");
  assert.equal(digit.pos?.line, 1);
  assert.equal(digit.pos?.col, 2);
  assert.equal(catchError(() => tokenize("嘎a\n")).code, "E1001");
  const tab = catchError(() => tokenize("\t咕\n"));
  assert.equal(tab.code, "E1001");
  assert.equal(tab.pos?.col, 1);
  assert.equal(catchError(() => tokenize("\uFEFF咕\n")).code, "E1001");
});

test("孤立标点报 E1003", () => {
  assert.equal(catchError(() => tokenize("！咕\n")).code, "E1003");
  assert.equal(catchError(() => tokenize("？\n")).code, "E1003");
});

test("缩进：变大出 INDENT，变小出 DEDENT", () => {
  const src = "咕咕！ 嘎\n    咕：嘎嘎嘎？咕\n        咕：嘎嘎嘎？咕\n咕咕嘎嘎！ 嘎\n    咕：嘎嘎嘎？咕\n";
  assert.equal(
    kindString(src),
    [
      "DECL WORD NEWLINE",
      "INDENT WORD COLON VAL NEWLINE",
      "INDENT WORD COLON VAL NEWLINE",
      "DEDENT DEDENT DECL WORD NEWLINE",
      "INDENT WORD COLON VAL NEWLINE",
      "DEDENT EOF",
    ].join(" "),
  );
});

test("缩进回退必须命中已有层级，否则 E1002", () => {
  const error = catchError(() => tokenize("咕咕！ 嘎\n        咕：嘎嘎嘎？咕\n    咕：嘎嘎嘎？咕\n"));
  assert.equal(error.code, "E1002");
  assert.equal(error.pos?.line, 3);
  assert.equal(error.pos?.col, 5);
});

test("第一条非空行缩进必须为 0，否则 E1002", () => {
  const error = catchError(() => tokenize("    咕：嘎嘎嘎？咕\n"));
  assert.equal(error.code, "E1002");
  assert.equal(error.pos?.line, 1);
});

test("只含空格的行与空行整行忽略，CRLF 归一成 LF", () => {
  assert.equal(kindString("咕咕！ 嘎\r\n\r\n   \r\n咕咕！ 嘎\r\n"), "DECL WORD NEWLINE DECL WORD NEWLINE EOF");
  assert.equal(kindString(""), "EOF");
  assert.equal(kindString("   \n\n"), "EOF");
});

test("行号从 1 起、列号从记号起点计", () => {
  const tokens = tokenize("咕咕！ 嘎\n    咕：嘎嘎嘎？咕\n");
  assert.equal(tokens[1].kind, "WORD");
  assert.equal(tokens[1].line, 1);
  assert.equal(tokens[1].col, 5);
  assert.equal(tokens[4].kind, "WORD");
  assert.equal(tokens[4].text, "咕");
  assert.equal(tokens[4].line, 2);
  assert.equal(tokens[4].col, 5);
  assert.equal(tokens[5].kind, "COLON");
  assert.equal(tokens[5].col, 6);
  assert.equal(tokens[6].kind, "VAL");
  assert.equal(tokens[6].bits, "咕");
  assert.equal(tokens[6].col, 7);
});
test("行末冒号糖放宽：冒号后只隔空格也糖化，后面有真实 payload 则保留", () => {
  assert.equal(kindString("咕咕！ 咕嘎： \n"), "DECL WORD NEWLINE EOF");
  assert.equal(kindString("咕咕！ 咕嘎：  "), "DECL WORD NEWLINE EOF");
  const kept = tokenize("咕： 咕？ 嘎嘎嘎？咕嘎\n");
  assert.equal(kept[0].kind, "WORD");
  assert.equal(kept[1].kind, "COLON");
  assert.equal(kept[1].col, 2);
  assert.equal(kept[2].kind, "VAL");
  assert.equal(kept[3].kind, "VAL");
  assert.equal(kept[3].text, "嘎嘎嘎");
  assert.equal(kept[3].bits, "咕嘎");
});

test("只含糖化冒号的行仍按空行忽略（不产生 INDENT/DEDENT/NEWLINE）", () => {
  assert.equal(
    kindString("咕咕！ 嘎\n   ：  \n咕：嘎嘎嘎？咕\n"),
    "DECL WORD NEWLINE WORD COLON VAL NEWLINE EOF",
  );
});

test("三方言逐位置归一化：咕/グ/GU 都是位 0，嘎/ガ/GA 都是位 1", () => {
  const zero = tokenize("咕グGU\n")[0];
  assert.equal(zero.kind, "WORD");
  assert.equal(zero.text, "咕咕咕");
  const one = tokenize("嘎ガGA\n")[0];
  assert.equal(one.text, "嘎嘎嘎");
  assert.equal(kindString("咕グGU嘎ガGA\n"), "WORD NEWLINE EOF");
});

test("标识符内部也能混排，保留字按归一化结果匹配", () => {
  const decl = tokenize("咕グGA！\n")[0];
  assert.equal(decl.kind, "DECL");
  assert.equal(decl.text, "咕咕嘎");
  assert.equal(tokenize("ググ！\n")[0].kind, "DECL");
  assert.equal(tokenize("GUGU!\n")[0].kind, "DECL");
  const word = tokenize("ガグGU\n")[0];
  assert.equal(word.kind, "WORD");
  assert.equal(word.text, "嘎咕咕");
});

test("英文位名四种大小写等价：GU / Gu / gU / gu 都是位 0", () => {
  for (const spelling of ["GU", "Gu", "gU", "gu"]) {
    const tokens = tokenize(spelling + "？\n");
    assert.equal(tokens[0].kind, "VAL", spelling + "？ 应为 VAL");
    assert.equal(tokens[0].text, "咕", spelling + " 应归一成 咕");
  }
  for (const spelling of ["GA", "Ga", "gA", "ga"]) {
    assert.equal(tokenize(spelling + "？\n")[0].text, "嘎", spelling + " 应归一成 嘎");
  }
});

test("落单的 g / G（后面不是 u/U/a/A）报 E1001，正文含该字符与码位", () => {
  for (const src of ["g咕\n", "G\n", "guG咕\n"]) {
    const error = catchError(() => tokenize(src));
    assert.equal(error.code, "E1001", src + " 应为 E1001");
    assert.equal(error.pos?.line, 1);
  }
  const lone = catchError(() => tokenize("g咕\n"));
  assert.equal(lone.pos?.col, 1);
  assert.ok(lone.message.includes("g"), "正文应含字符 g，实际=" + lone.message);
  assert.ok(lone.message.includes("U+0067"), "正文应含 U+0067，实际=" + lone.message);
  const upper = catchError(() => tokenize("咕G\n"));
  assert.equal(upper.pos?.col, 2);
  assert.ok(upper.message.includes("U+0047"), "正文应含 U+0047，实际=" + upper.message);
});

test("位串字面量的位串也归一化：方言写法一律变成 咕/嘎", () => {
  assert.equal(tokenize("嘎嘎嘎?グ\n")[0].bits, "咕");
  assert.equal(tokenize("GAGAGA?ga\n")[0].bits, "嘎");
  assert.equal(tokenize("嘎嘎嘎嘎？グga咕\n")[0].bits, "咕嘎咕");
  assert.equal(catchError(() => tokenize("GAGAGA? GU\n")).code, "E1003");
});

test("半角标点等价：! / !? / ? / : 与全角同义", () => {
  assert.equal(kindString("咕咕! 嘎\n"), "DECL WORD NEWLINE EOF");
  assert.equal(kindString("咕咕!? 嘎咕嘎\n"), "ACT WORD NEWLINE EOF");
  assert.equal(kindString("咕? 嘎嘎嘎?咕\n"), "VAL VAL NEWLINE EOF");
  const colon = tokenize("咕:嘎嘎嘎?咕\n");
  assert.equal(colon[1].kind, "COLON");
  assert.equal(colon[1].col, 2);
  assert.equal(kindString("咕咕! 咕嘎:\n"), "DECL WORD NEWLINE EOF");
  assert.equal(kindString("咕咕! 咕嘎: \n"), "DECL WORD NEWLINE EOF");
});

test("全角空格 U+3000 也是缩进：一格一个，可与 U+0020 混用", () => {
  const full = "咕咕！ 嘎\n\u3000\u3000\u3000\u3000咕：嘎嘎嘎？咕\n\u3000\u3000\u3000\u3000咕：嘎嘎嘎？咕\n";
  assert.equal(
    kindString(full),
    "DECL WORD NEWLINE INDENT WORD COLON VAL NEWLINE WORD COLON VAL NEWLINE DEDENT EOF",
  );
  const mixed = "咕咕！ 嘎\n  \u3000\u3000咕：嘎嘎嘎？咕\n    咕：嘎嘎嘎？咕\n";
  assert.equal(
    kindString(mixed),
    "DECL WORD NEWLINE INDENT WORD COLON VAL NEWLINE WORD COLON VAL NEWLINE DEDENT EOF",
  );
  assert.equal(kindString("咕：嘎嘎嘎？咕\n\u3000\u3000\n"), "WORD COLON VAL NEWLINE EOF");
  assert.equal(catchError(() => tokenize("\u3000咕：嘎嘎嘎？咕\n")).code, "E1002");
});

test("列号按原始码位计：英文位名占两列", () => {
  const tokens = tokenize("咕咕！ 嘎\n    GuGu! 嘎\n");
  assert.equal(tokens[4].kind, "DECL");
  assert.equal(tokens[4].text, "咕咕");
  assert.equal(tokens[4].col, 5);
  assert.equal(tokens[5].kind, "WORD");
  assert.equal(tokens[5].col, 11);
  const mixed = tokenize("咕gugA！\n")[0];
  assert.equal(mixed.kind, "DECL");
  assert.equal(mixed.text, "咕咕嘎");
  assert.equal(mixed.col, 1);
});