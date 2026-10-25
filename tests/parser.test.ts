import assert from "node:assert/strict";
import test from "node:test";

import { GgError } from "../src/errors.ts";
import { tokenize } from "../src/lexer.ts";
import { parse, parseSource, validate } from "../src/parser.ts";

function catchError(fn: () => void): GgError {
  try {
    fn();
  } catch (error) {
    if (error instanceof GgError) return error;
    throw error;
  }
  assert.fail("期望抛出 GgError，但没有抛错");
}

function expectError(fn: () => void, code: string, line?: number): GgError {
  const error = catchError(fn);
  assert.equal(error.code, code, `期望 ${code}，实际 ${error.code}：${error.message}`);
  if (line !== undefined) assert.equal(error.pos?.line, line);
  return error;
}

const join = (rows: string[]): string => rows.join("\n") + "\n";

const SAMPLE = join([
  "咕咕！ 嘎咕嘎",
  "    咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕",
  "    咕咕嘎！ 咕嘎咕嘎咕",
  "        嘎嘎：嘎嘎嘎嘎嘎嘎 咕咕咕咕咕",
  "",
  "咕咕嘎嘎！ 嘎咕咕嘎咕",
  "    咕咕！？ 咕咕嘎咕咕：咕嘎嘎！ 嘎咕嘎？",
  "    咕嘎！？ 咕咕嘎咕咕？ 咕嘎咕嘎咕！",
  "    咕：咕咕嘎咕咕？ 咕嘎咕嘎咕！",
]);

test("SPEC §11 样例：parse 成功且 AST 形状正确", () => {
  const program = parseSource(SAMPLE);
  assert.equal(program.classes.length, 1);
  assert.equal(program.classes[0].name, "嘎咕嘎");
  assert.equal(program.classes[0].parent, null);
  assert.equal(program.classes[0].pos.line, 1);

  const field = program.classes[0].fields[0];
  assert.equal(field.name, "咕咕咕咕咕");
  assert.equal(field.init.kind, "IntLit");
  assert.equal(field.init.bits, "咕");

  const method = program.classes[0].methods[0];
  assert.equal(method.name, "咕嘎咕嘎咕");
  assert.deepEqual(method.params, []);
  assert.equal(method.body.length, 1);
  assert.equal(method.body[0].kind, "Return");
  assert.equal(method.body[0].value.kind, "Member");
  assert.equal(method.body[0].value.member, "咕咕咕咕咕");
  assert.equal(method.body[0].value.object.kind, "This");

  const entry = program.entry;
  assert.equal(entry.name, "嘎咕咕嘎咕");
  assert.deepEqual(entry.body.map((stmt) => stmt.kind), ["Bind", "ExprStmt", "Print"]);

  const bind = entry.body[0];
  assert.equal(bind.target.kind, "NameTarget");
  assert.equal(bind.target.name, "咕咕嘎咕咕");
  assert.equal(bind.value.kind, "New");
  assert.equal(bind.value.className, "嘎咕嘎");
  assert.deepEqual(bind.value.args, []);

  const call = entry.body[1].expr;
  assert.equal(call.kind, "Call");
  assert.equal(call.method, "咕嘎咕嘎咕");
  assert.equal(call.object.kind, "Name");
  assert.equal(call.object.name, "咕咕嘎咕咕");
  assert.deepEqual(call.args, []);
  assert.equal(entry.body[2].value.kind, "Call");
});

test("类与入口可以交错，父类名写成「名字？」，冒号个数即参数个数", () => {
  const program = parseSource(
    join([
      "咕咕嘎嘎！ 嘎咕咕嘎咕",
      "    咕：嘎嘎嘎？咕",
      "咕咕！ 嘎咕嘎：嘎咕咕？",
      "    咕咕！？ 咕咕咕嘎：嘎嘎嘎？咕嘎",
      "    咕咕嘎！ 咕嘎咕嘎咕：嘎咕咕：嘎嘎嘎咕",
      "        嘎嘎：嘎嘎嘎嘎嘎嘎 咕咕咕嘎",
      "咕咕！ 嘎咕咕",
      "    咕咕！？ 嘎咕嘎嘎：嘎咕？",
    ]),
  );
  assert.equal(program.classes.length, 2);
  assert.equal(program.classes[0].name, "嘎咕嘎");
  assert.equal(program.classes[0].parent, "嘎咕咕");
  assert.equal(program.classes[0].fields[0].name, "咕咕咕嘎");
  assert.equal(program.classes[0].fields[0].init.bits, "咕嘎");
  assert.deepEqual(program.classes[0].methods[0].params, ["嘎咕咕", "嘎嘎嘎咕"]);
  assert.equal(program.classes[1].name, "嘎咕咕");
  assert.equal(program.classes[1].parent, null);
  assert.equal(program.classes[1].fields[0].init.kind, "NullLit");
  assert.equal(program.entry.name, "嘎咕咕嘎咕");
  assert.equal(program.entry.body[0].kind, "Print");
});

test("if/else/while 的块形状：不造 Block 节点，otherwise 可为 null", () => {
  const withElse = parseSource(
    join([
      "咕咕嘎嘎！ 嘎咕咕嘎咕",
      "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
      "    嘎嘎嘎：嘎嘎嘎？嘎",
      "        咕：嘎嘎咕？",
      "    嘎嘎嘎嘎",
      "        咕：嘎嘎？",
      "    嘎嘎嘎嘎嘎：嘎咕咕？",
      "        咕：嘎嘎嘎？嘎",
    ]),
  );
  const body = withElse.entry.body;
  assert.deepEqual(body.map((stmt) => stmt.kind), ["Bind", "If", "While"]);
  assert.equal(body[1].then.length, 1);
  assert.equal(body[1].then[0].kind, "Print");
  assert.equal(body[1].otherwise.length, 1);
  assert.equal(body[1].otherwise[0].value.value, true);
  assert.equal(body[2].cond.kind, "Name");
  assert.equal(body[2].cond.name, "嘎咕咕");
  assert.equal(body[2].body[0].value.bits, "嘎");

  const withoutElse = parseSource(
    join([
      "咕咕嘎嘎！ 嘎咕咕嘎咕",
      "    嘎嘎嘎：嘎嘎？",
      "        咕：嘎嘎嘎？咕",
      "    咕：嘎嘎？",
    ]),
  );
  assert.deepEqual(withoutElse.entry.body.map((stmt) => stmt.kind), ["If", "Print"]);
  assert.equal(withoutElse.entry.body[0].otherwise, null);
});

test("绑定目标是裸名字或「原子 成员名」", () => {
  const program = parseSource(
    join([
      "咕咕嘎嘎！ 嘎咕咕嘎咕",
      "    咕咕！？ 嘎嘎嘎嘎嘎嘎 咕嘎嘎嘎：嘎嘎嘎？咕",
    ]),
  );
  const target = program.entry.body[0].target;
  assert.equal(target.kind, "MemberTarget");
  assert.equal(target.object.kind, "This");
  assert.equal(target.member, "咕嘎嘎嘎");
  assert.equal(program.entry.body[0].value.bits, "咕");
});

test("二元与一元运算符映射到 BinOp/UnOp，前缀且右结合", () => {
  const bin = {
    咕: "Add",
    咕咕: "Sub",
    咕嘎: "Mul",
    咕咕咕: "Div",
    咕咕嘎: "Mod",
    咕嘎咕: "Eq",
    咕嘎嘎: "Lt",
    咕嘎嘎咕: "Gt",
    咕嘎咕咕: "And",
    咕嘎咕嘎: "Or",
  };
  for (const [word, op] of Object.entries(bin)) {
    const program = parse(tokenize(join(["咕咕嘎嘎！ 嘎", `    咕：${word}？ 嘎嘎嘎？咕 嘎嘎嘎？嘎`])));
    const stmt = program.entry.body[0];
    assert.equal(stmt.kind, "Print");
    assert.equal(stmt.value.kind, "Binary");
    assert.equal(stmt.value.op, op, `${word} 应映射为 ${op}`);
    assert.equal(stmt.value.left.bits, "咕");
    assert.equal(stmt.value.right.bits, "嘎");
  }
  const un = { 咕咕咕咕: "Not", 咕咕嘎咕: "Neg" };
  for (const [word, op] of Object.entries(un)) {
    const program = parse(tokenize(join(["咕咕嘎嘎！ 嘎", `    咕：${word}？ 嘎嘎？`])));
    const stmt = program.entry.body[0];
    assert.equal(stmt.value.kind, "Unary");
    assert.equal(stmt.value.op, op, `${word} 应映射为 ${op}`);
    assert.equal(stmt.value.operand.kind, "BoolLit");
  }
  const nested = parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    咕：咕？ 嘎嘎嘎？咕 咕嘎？ 嘎嘎嘎？嘎 嘎嘎嘎？咕咕"])));
  const value = nested.entry.body[0].value;
  assert.equal(value.op, "Add");
  assert.equal(value.right.op, "Mul");
  assert.equal(value.right.right.bits, "咕咕");
});

test("调用与新建的实参个数即冒号个数", () => {
  const program = parse(
    tokenize(
      join([
        "咕咕嘎嘎！ 嘎",
        "    咕：嘎嘎嘎嘎嘎嘎 咕嘎咕嘎咕！：嘎嘎嘎？咕：嘎嘎？",
        "    咕咕！？ 嘎咕咕：咕嘎嘎！ 嘎咕嘎？：嘎嘎嘎？咕：嘎咕？",
      ]),
    ),
  );
  const call = program.entry.body[0].value;
  assert.equal(call.kind, "Call");
  assert.equal(call.object.kind, "This");
  assert.equal(call.method, "咕嘎咕嘎咕");
  assert.equal(call.args.length, 2);
  assert.equal(call.args[0].kind, "IntLit");
  assert.equal(call.args[1].kind, "BoolLit");

  const created = program.entry.body[1].value;
  assert.equal(created.kind, "New");
  assert.equal(created.className, "嘎咕嘎");
  assert.equal(created.args.length, 2);
  assert.equal(created.args[0].bits, "咕");
  assert.equal(created.args[1].kind, "NullLit");
});

test("新增表达式可作操作数：咕？ x 咕嘎嘎！ C？ 解析为 Binary(Add, x, New)", () => {
  const program = parse(
    tokenize(
      join(["咕咕嘎嘎！ 嘎", "    咕咕！？ 嘎咕嘎咕：咕？ 嘎咕嘎？ 咕嘎嘎！ 嘎咕咕？"]),
    ),
  );
  const stmt = program.entry.body[0];
  assert.equal(stmt.kind, "Bind");
  const value = stmt.value;
  assert.equal(value.kind, "Binary");
  assert.equal(value.op, "Add");
  assert.equal(value.left.kind, "Name");
  assert.equal(value.left.name, "嘎咕嘎");
  assert.equal(value.right.kind, "New");
  assert.equal(value.right.className, "嘎咕咕");
});

test("方法的实参可以是新建表达式（咕嘎嘎！ 类名？ 作第二实参）", () => {
  const program = parse(
    tokenize(join(["咕咕嘎嘎！ 嘎", "    咕：嘎咕嘎咕？ 嘎咕嘎咕！：嘎嘎嘎？咕：咕嘎嘎！ 嘎咕咕？"])),
  );
  const value = program.entry.body[0].value;
  assert.equal(value.kind, "Call");
  assert.equal(value.object.kind, "Name");
  assert.equal(value.method, "嘎咕嘎咕");
  assert.equal(value.args.length, 2);
  assert.equal(value.args[0].kind, "IntLit");
  assert.equal(value.args[1].kind, "New");
  assert.equal(value.args[1].className, "嘎咕咕");
});

test("保留 DECL 词紧跟表达式时语句层面仍报 E2001（交回上层）", () => {
  expectError(
    () => parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    咕：嘎咕嘎？ 咕嘎嘎！ 嘎咕咕？"]))),
    "E2001",
    2,
  );
});

test("语法错误 E2001：列号指向出错记号", () => {
  const inner = expectError(() => parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    咕！"]))), "E2001", 2);
  assert.equal(inner.pos?.col, 5);
  expectError(() => parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    咕：嘎嘎嘎？咕", "咕"]))), "E2001", 3);
  expectError(() => parse(tokenize(join(["咕咕！ 嘎"]))), "E2002", 2);
});

test("名字是保留词时报 E2001（类名/字段名/成员位置）", () => {
  expectError(
    () => parse(tokenize(join(["咕咕！ 咕", "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕"]))),
    "E2001",
    1,
  );
  expectError(
    () => parse(tokenize(join(["咕咕！ 嘎咕嘎", "    咕咕！？ 咕咕咕：嘎嘎嘎？咕"]))),
    "E2001",
    2,
  );
  expectError(() => parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    咕：嘎？ 咕咕！"]))), "E2001", 2);
  expectError(() => parse(tokenize(join(["咕咕嘎！ 嘎", "    咕：嘎？"]))), "E2001", 1);
});

test("空块报 E2002（类体、if 块、方法体）", () => {
  expectError(() => parse(tokenize(join(["咕咕！ 嘎", "咕咕嘎嘎！ 嘎", "    咕：嘎嘎嘎？咕"]))), "E2002", 2);
  expectError(
    () =>
      parse(
        tokenize(join(["咕咕嘎嘎！ 嘎", "    嘎嘎嘎：嘎嘎？", "    嘎嘎嘎嘎", "        咕：嘎嘎"])),
      ),
    "E2002",
    3,
  );
  expectError(
    () => parse(tokenize(join(["咕咕！ 嘎", "    咕咕嘎！ 嘎咕咕", "咕咕嘎嘎！ 嘎", "    咕：嘎嘎嘎？咕"]))),
    "E2002",
    3,
  );
});

test("孤立 else 报 E2001", () => {
  expectError(
    () => parse(tokenize(join(["咕咕嘎嘎！ 嘎", "    嘎嘎嘎嘎", "        咕：嘎嘎嘎？咕"]))),
    "E2001",
    2,
  );
});

test("静态检查：重复类名 E3001", () => {
  expectError(
    () =>
      parseSource(
        join([
          "咕咕！ 嘎咕嘎",
          "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
          "咕咕！ 嘎咕嘎",
          "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
          "咕咕嘎嘎！ 嘎",
          "    咕：嘎嘎嘎？咕",
        ]),
      ),
    "E3001",
    3,
  );
});

test("重复入口 E3002 在 parse 阶段抛出（位置=第二个入口头）", () => {
  const src = join([
    "咕咕嘎嘎！ 嘎",
    "    咕：嘎嘎嘎？咕",
    "咕咕嘎嘎！ 嘎咕咕",
    "    咕：嘎嘎嘎？咕",
  ]);
  expectError(() => parseSource(src), "E3002", 3);
  expectError(() => parse(tokenize(src)), "E3002", 3);
});

test("静态检查：缺少入口 E3003 且位置为 null", () => {
  const error = expectError(
    () => parseSource(join(["咕咕！ 嘎咕嘎", "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕"])),
    "E3003",
  );
  assert.equal(error.pos, null);
});

test("静态检查：继承成环 E3004", () => {
  expectError(
    () =>
      parseSource(
        join([
          "咕咕！ 嘎咕嘎：嘎咕咕？",
          "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
          "咕咕！ 嘎咕咕：嘎咕嘎？",
          "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
          "咕咕嘎嘎！ 嘎",
          "    咕：嘎嘎嘎？咕",
        ]),
      ),
    "E3004",
  );
});

test("静态检查：父类未定义 E3005", () => {
  expectError(
    () =>
      parseSource(
        join([
          "咕咕！ 嘎咕嘎：嘎咕咕？",
          "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
          "咕咕嘎嘎！ 嘎",
          "    咕：嘎嘎嘎？咕",
        ]),
      ),
    "E3005",
    1,
  );
});

test("字段与方法重名不报错（SPEC 未规定）", () => {
  const program = parseSource(
    join([
      "咕咕！ 嘎咕嘎",
      "    咕咕！？ 嘎咕咕：嘎嘎嘎？咕",
      "    咕咕！？ 嘎咕咕：嘎嘎嘎？嘎",
      "咕咕嘎嘎！ 嘎",
      "    咕：嘎嘎嘎？咕",
    ]),
  );
  validate(program);
  assert.equal(program.classes[0].fields.length, 2);
});
