/**
 * 咕咕嘎嘎语 · 语法器与静态检查（SPEC.md §4/§5/§9）。
 * parse：记号 -> AST；validate：类/入口/继承的静态检查。
 */

import { CODE, GgError } from "./errors.ts";
import { ACT, BARE, DECL, VAL, isReserved, type Token } from "./keywords.ts";
import { tokenize } from "./lexer.ts";
import type {
  BindTarget,
  ClassDecl,
  EntryDecl,
  Expr,
  FieldDecl,
  IfStmt,
  MethodDecl,
  Pos,
  Program,
  Stmt,
  WhileStmt,
} from "./ast.ts";

const posOf = (token: Token): Pos => ({ line: token.line, col: token.col });

const SUFFIX: Record<string, string> = { DECL: "！", ACT: "！？", VAL: "？", WORD: "", COLON: "" };

/** 把记号渲染成诊断里的中文片段 */
function describe(token: Token): string {
  switch (token.kind) {
    case "NEWLINE":
      return "换行";
    case "INDENT":
      return "缩进";
    case "DEDENT":
      return "反缩进";
    case "EOF":
      return "文件结尾";
    default:
      return `“${token.text}${SUFFIX[token.kind] ?? ""}”`;
  }
}

function fail(code: string, pos: Pos | null, message: string): never {
  throw new GgError(code, pos, message);
}

/** 单个入口块都是 stmt+，不引入新作用域（SPEC §5.2） */
class Parser {
  readonly tokens: Token[];
  index = 0;

  constructor(tokens: Token[]) {
    const last = tokens[tokens.length - 1];
    if (last !== undefined && last.kind === "EOF") {
      this.tokens = tokens;
    } else {
      const line = last === undefined ? 1 : last.line;
      const col = last === undefined ? 1 : last.col;
      this.tokens = [...tokens, { kind: "EOF", text: "", line, col }];
    }
  }

  peek(ahead = 0): Token {
    const token = this.tokens[this.index + ahead];
    return token ?? this.tokens[this.tokens.length - 1];
  }

  advance(): Token {
    const token = this.peek();
    if (token.kind !== "EOF") this.index += 1;
    return token;
  }

  expectNewline(what: string): void {
    const token = this.peek();
    if (token.kind !== "NEWLINE") {
      fail(CODE.Syntax, posOf(token), `语法错误：${what}后面需要换行，见到${describe(token)}`);
    }
    this.advance();
  }

  expectColon(what: string): void {
    const token = this.peek();
    if (token.kind !== "COLON") {
      fail(CODE.Syntax, posOf(token), `语法错误：${what}后面需要“：”，见到${describe(token)}`);
    }
    this.advance();
  }

  /** 名字位置：必须是裸名字（WORD 且不是保留词） */
  takeName(what: string): Token {
    const token = this.peek();
    if (token.kind !== "WORD") {
      fail(CODE.Syntax, posOf(token), `语法错误：${what}必须是裸名字，见到${describe(token)}`);
    }
    if (isReserved(token.text)) {
      fail(CODE.Syntax, posOf(token), `语法错误：名字不能是保留词“${token.text}”（${what}）`);
    }
    this.advance();
    return token;
  }

  /** 名字位置写成「名字？」（VAL）时使用 */
  takeValName(what: string): Token {
    const token = this.peek();
    if (token.kind !== "VAL") {
      fail(CODE.Syntax, posOf(token), `语法错误：${what}必须写成「名字？」，见到${describe(token)}`);
    }
    if (isReserved(token.text)) {
      fail(CODE.Syntax, posOf(token), `语法错误：名字不能是保留词“${token.text}”（${what}）`);
    }
    this.advance();
    return token;
  }

  bitsOf(token: Token): string {
    const bits = token.bits;
    if (bits === undefined) {
      fail(CODE.StrayPunct, posOf(token), `字面量“${token.text}？”缺少紧贴的位串`);
    }
    return bits;
  }

  /** program = { classDecl | entryDecl } EOF；入口可以缺（库文件），由调用方决定要不要报 */
  parseProgram(): ParsedUnit {
    const classes: ClassDecl[] = [];
    const entries: EntryDecl[] = [];
    for (;;) {
      const token = this.peek();
      if (token.kind === "EOF") break;
      if (token.kind === "DECL") {
        const word = DECL[token.text];
        if (word === "Class") {
          classes.push(this.parseClass());
          continue;
        }
        if (word === "Entry") {
          if (entries.length > 0) {
            fail(CODE.DupEntry, posOf(token), "重复的入口：只允许一个 咕咕嘎嘎！ 块");
          }
          entries.push(this.parseEntry());
          continue;
        }
      }
      fail(CODE.Syntax, posOf(token), `语法错误：顶层只允许 咕咕！ 类 或 咕咕嘎嘎！ 入口，见到${describe(token)}`);
    }
    return { classes, entry: entries[0] ?? null };
  }

  /** classDecl = "咕咕！" name [ "：" nameVAL ] NL INDENT { fieldDecl | methodDecl } DEDENT */
  parseClass(): ClassDecl {
    const head = this.advance();
    const name = this.takeName("类名").text;
    let parent: string | null = null;
    if (this.peek().kind === "COLON") {
      this.advance();
      parent = this.takeValName("父类名").text;
    }
    this.expectNewline("类头");
    const open = this.peek();
    if (open.kind !== "INDENT") {
      fail(CODE.EmptyBlock, posOf(open), "缺少缩进块：类体不能为空");
    }
    this.advance();
    const fields: FieldDecl[] = [];
    const methods: MethodDecl[] = [];
    for (;;) {
      const token = this.peek();
      if (token.kind === "DEDENT") {
        this.advance();
        break;
      }
      if (token.kind === "EOF") {
        fail(CODE.Syntax, posOf(token), "语法错误：类体没有正确结束");
      }
      if (token.kind === "ACT" && ACT[token.text] === "Bind") {
        fields.push(this.parseField());
        continue;
      }
      if (token.kind === "DECL" && DECL[token.text] === "Method") {
        methods.push(this.parseMethod());
        continue;
      }
      fail(CODE.Syntax, posOf(token), `语法错误：类体里只允许 咕咕！？ 字段 或 咕咕嘎！ 方法，见到${describe(token)}`);
    }
    if (fields.length === 0 && methods.length === 0) {
      fail(CODE.EmptyBlock, posOf(open), "空块不合法：类体至少要有一个字段或方法");
    }
    return { kind: "Class", name, parent, fields, methods, pos: posOf(head) };
  }

  /** fieldDecl = "咕咕！？" name "：" expr NL（目标只能是裸名字） */
  parseField(): FieldDecl {
    const head = this.advance();
    const name = this.takeName("字段名").text;
    this.expectColon("字段初始化");
    const init = this.parseExpr();
    this.expectNewline("字段声明");
    return { kind: "Field", name, init, pos: posOf(head) };
  }

  /** methodDecl = "咕咕嘎！" name { "：" name } NL INDENT { stmt } DEDENT */
  parseMethod(): MethodDecl {
    const head = this.advance();
    const name = this.takeName("方法名").text;
    const params: string[] = [];
    while (this.peek().kind === "COLON") {
      this.advance();
      params.push(this.takeName("参数名").text);
    }
    const body = this.parseBlock("方法体");
    return { kind: "Method", name, params, body, pos: posOf(head) };
  }

  /** entryDecl = "咕咕嘎嘎！" name NL INDENT { stmt } DEDENT */
  parseEntry(): EntryDecl {
    const head = this.advance();
    const name = this.takeName("入口名").text;
    const body = this.parseBlock("入口块");
    return { kind: "Entry", name, body, pos: posOf(head) };
  }

  /** 块 = NL INDENT stmt+ DEDENT；缺 INDENT 或空块 -> E2002 */
  parseBlock(what: string): Stmt[] {
    this.expectNewline(what);
    const open = this.peek();
    if (open.kind !== "INDENT") {
      fail(CODE.EmptyBlock, posOf(open), `缺少缩进块：${what}不能为空`);
    }
    this.advance();
    const stmts: Stmt[] = [];
    for (;;) {
      const token = this.peek();
      if (token.kind === "DEDENT") {
        this.advance();
        break;
      }
      if (token.kind === "EOF") {
        fail(CODE.Syntax, posOf(token), `语法错误：${what}没有正确结束`);
      }
      stmts.push(this.parseStmt());
    }
    if (stmts.length === 0) {
      fail(CODE.EmptyBlock, posOf(open), `空块不合法：${what}至少需要一条语句`);
    }
    return stmts;
  }

  parseStmt(): Stmt {
    const token = this.peek();
    const pos = posOf(token);
    if (token.kind === "WORD") {
      const bare = BARE[token.text];
      if (bare === "Print") {
        this.advance();
        this.expectColon("输出");
        const value = this.parseExpr();
        this.expectNewline("输出语句");
        return { kind: "Print", value, pos };
      }
      if (bare === "Return") {
        this.advance();
        this.expectColon("返回");
        const value = this.parseExpr();
        this.expectNewline("返回语句");
        return { kind: "Return", value, pos };
      }
      if (bare === "If") return this.parseIf();
      if (bare === "While") return this.parseWhile();
    }
    if (token.kind === "ACT") {
      const act = ACT[token.text];
      if (act === "Bind") {
        this.advance();
        const target = this.parseTarget();
        this.expectColon("绑定目标");
        const value = this.parseExpr();
        this.expectNewline("绑定语句");
        return { kind: "Bind", target, value, pos };
      }
      if (act === "ExprStmt") {
        this.advance();
        const expr = this.parseExpr();
        this.expectNewline("求值语句");
        return { kind: "ExprStmt", expr, pos };
      }
    }
    fail(CODE.Syntax, pos, `语法错误：这里不能作为语句开头，见到${describe(token)}`);
  }

  /** ifStmt = "嘎嘎嘎" "：" expr 块 [ "嘎嘎嘎嘎" 块 ] */
  parseIf(): IfStmt {
    const head = this.advance();
    this.expectColon("若");
    const cond = this.parseExpr();
    const then = this.parseBlock("若块");
    let otherwise: Stmt[] | null = null;
    const next = this.peek();
    if (next.kind === "WORD" && BARE[next.text] === "Else") {
      this.advance();
      otherwise = this.parseBlock("否则块");
    }
    return { kind: "If", cond, then, otherwise, pos: posOf(head) };
  }

  /** whileStmt = "嘎嘎嘎嘎嘎" "：" expr 块 */
  parseWhile(): WhileStmt {
    const head = this.advance();
    this.expectColon("循环");
    const cond = this.parseExpr();
    const body = this.parseBlock("循环块");
    return { kind: "While", cond, body, pos: posOf(head) };
  }

  /** target = name | atom name */
  parseTarget(): BindTarget {
    const token = this.peek();
    if (token.kind === "WORD" && !isReserved(token.text)) {
      this.advance();
      return { kind: "NameTarget", name: token.text, pos: posOf(token) };
    }
    const object = this.parseAtom();
    const member = this.takeName("成员名").text;
    return { kind: "MemberTarget", object, member, pos: object.pos };
  }

  /** expr = binExpr | unExpr | postfixExpr */
  parseExpr(): Expr {
    const token = this.peek();
    if (token.kind === "VAL") {
      const def = VAL[token.text];
      if (def !== undefined && def.kind === "bin") {
        this.advance();
        const left = this.parseExpr();
        const right = this.parseExpr();
        return { kind: "Binary", op: def.op, left, right, pos: posOf(token) };
      }
      if (def !== undefined && def.kind === "un") {
        this.advance();
        const operand = this.parseExpr();
        return { kind: "Unary", op: def.op, operand, pos: posOf(token) };
      }
    }
    return this.parsePostfix();
  }

  /** postfixExpr = atom { memberAccess | callAccess } */
  parsePostfix(): Expr {
    let expr = this.parseAtom();
    for (;;) {
      const token = this.peek();
      if (token.kind === "WORD") {
        if (isReserved(token.text)) break;
        this.advance();
        expr = { kind: "Member", object: expr, member: token.text, pos: posOf(token) };
        continue;
      }
      if (token.kind === "DECL") {
        if (isReserved(token.text)) break;
        this.advance();
        const args: Expr[] = [];
        while (this.peek().kind === "COLON") {
          this.advance();
          args.push(this.parseExpr());
        }
        expr = { kind: "Call", object: expr, method: token.text, args, pos: posOf(token) };
        continue;
      }
      break;
    }
    return expr;
  }

  /** atom = intLit | bitsLit | boolLit | nullLit | nameVAL | this | readByte | newExpr */
  parseAtom(): Expr {
    const token = this.peek();
    if (token.kind === "VAL") {
      const def = VAL[token.text];
      if (def !== undefined) {
        this.advance();
        if (def.kind === "intlit") return { kind: "IntLit", bits: this.bitsOf(token), pos: posOf(token) };
        if (def.kind === "bitslit") return { kind: "BitsLit", bits: this.bitsOf(token), pos: posOf(token) };
        if (def.kind === "bool") return { kind: "BoolLit", value: def.value, pos: posOf(token) };
        if (def.kind === "null") return { kind: "NullLit", pos: posOf(token) };
        fail(CODE.Syntax, posOf(token), `语法错误：运算符${describe(token)}不能作为取值`);
      }
      this.advance();
      if (isReserved(token.text)) {
        fail(CODE.Syntax, posOf(token), `语法错误：名字不能是保留词“${token.text}”`);
      }
      return { kind: "Name", name: token.text, pos: posOf(token) };
    }
    if (token.kind === "WORD") {
      const bare = BARE[token.text];
      if (bare === "This") {
        this.advance();
        return { kind: "This", pos: posOf(token) };
      }
      if (bare === "ReadByte") {
        this.advance();
        return { kind: "ReadByte", pos: posOf(token) };
      }
      if (isReserved(token.text)) {
        fail(CODE.Syntax, posOf(token), `语法错误：保留词“${token.text}”不能作为取值`);
      }
      fail(CODE.Syntax, posOf(token), `语法错误：取值要写成「名字？」，见到${describe(token)}`);
    }
    if (token.kind === "DECL" && DECL[token.text] === "New") {
      this.advance();
      const className = this.takeValName("类名").text;
      const args: Expr[] = [];
      while (this.peek().kind === "COLON") {
        this.advance();
        args.push(this.parseExpr());
      }
      return { kind: "New", className, args, pos: posOf(token) };
    }
    fail(CODE.Syntax, posOf(token), `语法错误：这里需要一个取值，见到${describe(token)}`);
  }
}

/** 单个文件的解析结果：类表 + 可能缺席的入口。 */
export interface ParsedUnit {
  classes: ClassDecl[];
  entry: EntryDecl | null;
}

/** 记号 -> AST（语法错误 E2001/E2002；没有入口时 E3003） */
export function parse(tokens: Token[]): Program {
  const unit = new Parser(tokens).parseProgram();
  if (unit.entry === null) {
    fail(CODE.NoEntry, null, "缺少入口：程序需要一个 咕咕嘎嘎！ 块");
  }
  return { kind: "Program", classes: unit.classes, entry: unit.entry };
}

/** 源码 -> 单文件结果（入口缺失不在这一层报错，供多文件载入器合并用）。 */
export function parseUnit(src: string): ParsedUnit {
  return new Parser(tokenize(src)).parseProgram();
}

/**
 * SPEC §9 的静态检查：类名重复、入口个数、继承。
 * hidden 是「存在但不属于可见范围」的类索引（类名 -> 文件名），只用来把
 * 「父类未定义」说得更准；不传时行为与单文件完全一致。
 */
export function validate(program: Program, hidden?: ReadonlyMap<string, string>): void {
  const byName = new Map<string, ClassDecl>();
  for (const cls of program.classes) {
    if (byName.has(cls.name)) {
      fail(CODE.DupClass, cls.pos, `重复的类名“${cls.name}”`);
    }
    byName.set(cls.name, cls);
  }

  if (!program.entry) {
    fail(CODE.NoEntry, null, "缺少入口：程序需要一个 咕咕嘎嘎！ 块");
  }

  for (const cls of program.classes) {
    if (cls.parent !== null && !byName.has(cls.parent)) {
      const where = hidden?.get(cls.parent);
      const hint = where === undefined ? "" : `（在 ${where} 定义，但对本文件不可见）`;
      fail(CODE.UnknownParent, cls.pos, `父类未定义：“${cls.parent}”${hint}`);
    }
  }

  for (const cls of program.classes) {
    const seen = new Set<string>();
    let current: ClassDecl | undefined = cls;
    while (current !== undefined && current.parent !== null) {
      if (seen.has(current.name)) {
        fail(CODE.CyclicInherit, current.pos, `继承成环：“${current.name}”`);
      }
      seen.add(current.name);
      current = byName.get(current.parent);
    }
  }
}

/** tokenize -> parse -> validate（CLI 的 check 走这条路） */
export function parseSource(src: string): Program {
  const program = parse(tokenize(src));
  validate(program);
  return program;
}
