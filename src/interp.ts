/**
 * 咕咕嘎嘎语 · 树遍历解释器（SPEC.md §5 语义 / §6 输出 / §7 运行时约束）。
 */

import type {
  ClassDecl,
  Expr,
  MethodDecl,
  NewExpr,
  Pos,
  Program,
  Stmt,
} from "./ast.ts";
import { CODE, GgError } from "./errors.ts";
import { bitsToInt } from "./keywords.ts";
import { bitsOf, typeName } from "./values.ts";
import type { GgObject, Value } from "./values.ts";

export interface RunOptions {
  maxSteps?: number;
  stdin?: string;
  write?: (bits: string) => void;
}

const DEFAULT_MAX_STEPS = 5_000_000;
const MAX_DEPTH = 512;

interface Frame {
  vars: Map<string, Value>;
  /** 方法体内的当前对象；入口块为 null（静态上下文） */
  self: GgObject | null;
}

/** 方法返回：用非 GgError 的异常冒泡，带返回值 */
class ReturnSignal {
  readonly value: Value;

  constructor(value: Value) {
    this.value = value;
  }
}

const TRUE: Value = { t: "bool", v: true };
const FALSE: Value = { t: "bool", v: false };
const NULL_VALUE: Value = { t: "null" };

const OP_LABEL: Readonly<Record<string, string>> = {
  Add: "加",
  Sub: "减",
  Mul: "乘",
  Div: "除",
  Mod: "取余",
  Eq: "相等",
  Lt: "小于",
  Gt: "大于",
  And: "与",
  Or: "或",
  Not: "非",
  Neg: "负",
};

export function interpret(program: Program, opts: RunOptions = {}): void {
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const write =
    opts.write ??
    ((bits: string): void => {
      process.stdout.write(bits);
    });
  const stdinBytes = new TextEncoder().encode(opts.stdin ?? "");

  const classes = new Map<string, ClassDecl>();
  for (const decl of program.classes) {
    if (classes.has(decl.name)) {
      throw new GgError(CODE.DupClass, decl.pos, `类 ${decl.name} 重复定义`);
    }
    classes.set(decl.name, decl);
  }

  const frames: Frame[] = [];
  let steps = 0;
  let depth = 0;
  let stdinCursor = 0;

  function currentFrame(): Frame {
    const frame = frames[frames.length - 1];
    if (frame === undefined) throw new Error("解释器内部错误：作用域栈为空");
    return frame;
  }

  function tick(pos: Pos): void {
    steps += 1;
    if (steps > maxSteps) throw new GgError(CODE.StepLimit, pos, `步数超过上限 ${maxSteps}`);
  }

  /** 继承链，祖先在前、子类在后 */
  function chainOf(className: string, pos: Pos): ClassDecl[] {
    const chain: ClassDecl[] = [];
    let cur = classes.get(className);
    if (cur === undefined) throw new GgError(CODE.UnknownParent, pos, `类 ${className} 未定义`);
    for (;;) {
      chain.unshift(cur);
      if (cur.parent === null) return chain;
      const parent = classes.get(cur.parent);
      if (parent === undefined) {
        throw new GgError(CODE.UnknownParent, cur.pos, `父类 ${cur.parent} 未定义`);
      }
      if (chain.includes(parent)) {
        throw new GgError(CODE.CyclicInherit, cur.pos, `继承成环：${parent.name}`);
      }
      cur = parent;
    }
  }

  /** 沿接收者所属类的继承链自下而上找「名字相同且参数个数相同」的方法 */
  function findMethod(obj: GgObject, name: string, argc: number, pos: Pos): MethodDecl | null {
    const chain = chainOf(obj.cls, pos);
    for (let i = chain.length - 1; i >= 0; i--) {
      const cls = chain[i];
      for (const method of cls.methods) {
        if (method.name === name && method.params.length === argc) return method;
      }
    }
    return null;
  }

  function invoke(method: MethodDecl, self: GgObject, args: Value[], pos: Pos): Value {
    depth += 1;
    if (depth > MAX_DEPTH) {
      depth -= 1;
      throw new GgError(CODE.DepthLimit, pos, `调用深度超过上限 ${MAX_DEPTH}`);
    }
    const vars = new Map<string, Value>();
    for (let i = 0; i < method.params.length; i++) vars.set(method.params[i], args[i]);
    frames.push({ vars, self });
    try {
      execBlock(method.body);
      return NULL_VALUE;
    } catch (err) {
      if (err instanceof ReturnSignal) return err.value;
      throw err;
    } finally {
      frames.pop();
      depth -= 1;
    }
  }

  /** 查找顺序：局部变量/参数（由内到外）→ 当前对象的字段 → E4001 */
  function readName(name: string, pos: Pos): Value {
    const frame = currentFrame();
    const local = frame.vars.get(name);
    if (local !== undefined) return local;
    const field = frame.self === null ? undefined : frame.self.fields.get(name);
    if (field !== undefined) return field;
    throw new GgError(CODE.UndefinedName, pos, `未定义的名字 ${name}`);
  }

  function expectObject(v: Value, pos: Pos): GgObject {
    if (v.t !== "obj") {
      throw new GgError(CODE.BadReceiver, pos, `接收者必须是对象，得到 ${typeName(v)}`);
    }
    return v.v;
  }

  function printBits(v: Value, pos: Pos): string {
    try {
      return bitsOf(v);
    } catch (err) {
      if (err instanceof GgError) throw new GgError(err.code, err.pos ?? pos, err.message);
      throw err;
    }
  }

  function evalExpr(e: Expr): Value {
    tick(e.pos);
    switch (e.kind) {
      case "IntLit":
        return { t: "int", v: bitsToInt(e.bits) };
      case "BitsLit":
        return { t: "bits", v: e.bits };
      case "BoolLit":
        return e.value ? TRUE : FALSE;
      case "NullLit":
        return NULL_VALUE;
      case "Name":
        return readName(e.name, e.pos);
      case "This": {
        const self = currentFrame().self;
        if (self === null) {
          throw new GgError(CODE.StaticThis, e.pos, "入口块是静态上下文，没有 自己");
        }
        return { t: "obj", v: self };
      }
      case "ReadByte": {
        if (stdinCursor >= stdinBytes.length) return NULL_VALUE;
        const byte = stdinBytes[stdinCursor];
        stdinCursor += 1;
        return { t: "int", v: BigInt(byte) };
      }
      case "Member": {
        const obj = expectObject(evalExpr(e.object), e.pos);
        const field = obj.fields.get(e.member);
        if (field === undefined) {
          throw new GgError(CODE.UnknownField, e.pos, `字段 ${e.member} 不存在`);
        }
        return field;
      }
      case "Call": {
        const obj = expectObject(evalExpr(e.object), e.pos);
        const method = findMethod(obj, e.method, e.args.length, e.pos);
        if (method === null) {
          throw new GgError(
            CODE.UndefinedMethod,
            e.pos,
            `方法 ${e.method}（${e.args.length} 个参数）未定义`,
          );
        }
        const args: Value[] = [];
        for (const arg of e.args) args.push(evalExpr(arg));
        return invoke(method, obj, args, e.pos);
      }
      case "New":
        return evalNew(e);
      case "Unary": {
        const operand = evalExpr(e.operand);
        if (e.op === "Not") {
          if (operand.t !== "bool") {
            throw new GgError(CODE.TypeMismatch, e.pos, `非 仅支持布尔，得到 ${typeName(operand)}`);
          }
          return operand.v ? FALSE : TRUE;
        }
        if (operand.t !== "int") {
          throw new GgError(CODE.TypeMismatch, e.pos, `负 仅支持整数，得到 ${typeName(operand)}`);
        }
        return { t: "int", v: -operand.v };
      }
      case "Binary": {
        const left = evalExpr(e.left);
        const right = evalExpr(e.right);
        return applyBinary(e.op, left, right, e.pos);
      }
    }
  }

  function applyBinary(
    op: "Add" | "Sub" | "Mul" | "Div" | "Mod" | "Eq" | "Lt" | "Gt" | "And" | "Or",
    left: Value,
    right: Value,
    pos: Pos,
  ): Value {
    switch (op) {
      case "Add":
        if (left.t === "int" && right.t === "int") return { t: "int", v: left.v + right.v };
        if (left.t === "bits" && right.t === "bits") return { t: "bits", v: left.v + right.v };
        throw typeMismatch(op, left, right, pos);
      case "Sub":
      case "Mul":
      case "Div":
      case "Mod": {
        if (left.t !== "int" || right.t !== "int") throw typeMismatch(op, left, right, pos);
        const a = left.v;
        const b = right.v;
        if (op === "Sub") return { t: "int", v: a - b };
        if (op === "Mul") return { t: "int", v: a * b };
        if (b === 0n) throw new GgError(CODE.DivideByZero, pos, `${OP_LABEL[op]} 的除数为零`);
        // BigInt 的 / 与 % 均向零截断，与 SPEC.md §5.6 一致
        if (op === "Div") return { t: "int", v: a / b };
        return { t: "int", v: a % b };
      }
      case "Eq":
        return equalValues(left, right) ? TRUE : FALSE;
      case "Lt":
      case "Gt": {
        if (left.t !== "int" || right.t !== "int") throw typeMismatch(op, left, right, pos);
        const result = op === "Lt" ? left.v < right.v : left.v > right.v;
        return result ? TRUE : FALSE;
      }
      case "And":
      case "Or": {
        if (left.t !== "bool" || right.t !== "bool") throw typeMismatch(op, left, right, pos);
        const result = op === "And" ? left.v && right.v : left.v || right.v;
        return result ? TRUE : FALSE;
      }
    }
  }

  function typeMismatch(
    op: string,
    left: Value,
    right: Value,
    pos: Pos,
  ): GgError {
    return new GgError(
      CODE.TypeMismatch,
      pos,
      `${OP_LABEL[op]} 不支持 ${typeName(left)} 与 ${typeName(right)}`,
    );
  }

  function equalValues(left: Value, right: Value): boolean {
    if (left.t === "int") return right.t === "int" && left.v === right.v;
    if (left.t === "bits") return right.t === "bits" && left.v === right.v;
    if (left.t === "bool") return right.t === "bool" && left.v === right.v;
    if (left.t === "null") return right.t === "null";
    return right.t === "obj" && left.v === right.v;
  }

  function evalNew(e: NewExpr): Value {
    // 实参在调用者的 this 上下文里从左到右求值
    const args: Value[] = [];
    for (const arg of e.args) args.push(evalExpr(arg));

    const chain = chainOf(e.className, e.pos);
    const obj: GgObject = { cls: e.className, fields: new Map() };

    // 字段初始化：祖先在前、子类在后，每类按声明顺序；求值时 this 指向新对象
    frames.push({ vars: new Map(), self: obj });
    try {
      for (const cls of chain) {
        for (const field of cls.fields) {
          obj.fields.set(field.name, evalExpr(field.init));
        }
      }
    } finally {
      frames.pop();
    }

    // 构造器：名字等于类名且参数个数匹配，自下而上沿继承链找
    let ctor: MethodDecl | null = null;
    let hasNamedCtor = false;
    for (let i = chain.length - 1; i >= 0 && ctor === null; i--) {
      for (const method of chain[i].methods) {
        if (method.name !== e.className) continue;
        hasNamedCtor = true;
        if (method.params.length === args.length) {
          ctor = method;
          break;
        }
      }
    }

    if (ctor === null) {
      if (hasNamedCtor) {
        throw new GgError(
          CODE.BadCtor,
          e.pos,
          `类 ${e.className} 的构造器参数个数与 ${args.length} 个实参不符`,
        );
      }
      if (args.length !== 0) {
        throw new GgError(
          CODE.BadCtor,
          e.pos,
          `类 ${e.className} 没有构造器，却有 ${args.length} 个实参`,
        );
      }
      return { t: "obj", v: obj };
    }

    invoke(ctor, obj, args, e.pos);
    return { t: "obj", v: obj };
  }

  function bindName(name: string, value: Value): void {
    const frame = currentFrame();
    if (frame.vars.has(name)) {
      frame.vars.set(name, value);
      return;
    }
    if (frame.self !== null && frame.self.fields.has(name)) {
      frame.self.fields.set(name, value);
      return;
    }
    frame.vars.set(name, value);
  }

  function execStmt(s: Stmt): void {
    tick(s.pos);
    switch (s.kind) {
      case "Bind": {
        // 目标先定位（MemberTarget 先求 object、再查字段），最后求值
        if (s.target.kind === "NameTarget") {
          bindName(s.target.name, evalExpr(s.value));
        } else {
          const obj = expectObject(evalExpr(s.target.object), s.target.pos);
          if (!obj.fields.has(s.target.member)) {
            throw new GgError(CODE.UnknownField, s.target.pos, `字段 ${s.target.member} 不存在`);
          }
          obj.fields.set(s.target.member, evalExpr(s.value));
        }
        return;
      }
      case "ExprStmt":
        evalExpr(s.expr);
        return;
      case "Print": {
        const value = evalExpr(s.value);
        write(printBits(value, s.pos));
        return;
      }
      case "Return":
        throw new ReturnSignal(evalExpr(s.value));
      case "If": {
        const cond = evalExpr(s.cond);
        if (cond.t !== "bool") {
          throw new GgError(CODE.TypeMismatch, s.pos, `若 的条件必须是布尔，得到 ${typeName(cond)}`);
        }
        if (cond.v) execBlock(s.then);
        else if (s.otherwise !== null) execBlock(s.otherwise);
        return;
      }
      case "While": {
        for (;;) {
          const cond = evalExpr(s.cond);
          if (cond.t !== "bool") {
            throw new GgError(
              CODE.TypeMismatch,
              s.pos,
              `循环 的条件必须是布尔，得到 ${typeName(cond)}`,
            );
          }
          if (!cond.v) return;
          execBlock(s.body);
        }
      }
    }
  }

  function execBlock(body: Stmt[]): void {
    for (const stmt of body) execStmt(stmt);
  }

  frames.push({ vars: new Map(), self: null });
  try {
    execBlock(program.entry.body);
  } catch (err) {
    // 入口块里的 嘎嘎 = 结束程序，值丢弃
    if (!(err instanceof ReturnSignal)) throw err;
  } finally {
    frames.pop();
  }
}
