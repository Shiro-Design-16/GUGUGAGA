/**
 * 咕咕嘎嘎语 · 契约层：AST 节点（判别联合，按 kind 分派）。
 * 语法器产出这里的节点，解释器消费它们；任何改动必须双边同步。
 */

export interface Pos {
  line: number;
  col: number;
}

export interface Program {
  kind: "Program";
  classes: ClassDecl[];
  /** 多文件工程里库文件没有入口，合并后再查；单文件解析保证非 null（validate 兜底） */
  entry: EntryDecl | null;
}

export interface ClassDecl {
  kind: "Class";
  name: string;
  /** 父类名（语法位置上的裸名字，不含后缀），无继承为 null */
  parent: string | null;
  fields: FieldDecl[];
  methods: MethodDecl[];
  pos: Pos;
}

export interface FieldDecl {
  kind: "Field";
  name: string;
  init: Expr;
  pos: Pos;
}

export interface MethodDecl {
  kind: "Method";
  name: string;
  /** 参数名，按书写顺序 */
  params: string[];
  body: Stmt[];
  pos: Pos;
}

export interface EntryDecl {
  kind: "Entry";
  name: string;
  body: Stmt[];
  pos: Pos;
}

export type Stmt =
  | BindStmt
  | ExprStmt
  | PrintStmt
  | ReturnStmt
  | IfStmt
  | WhileStmt;

/** 绑定的目标：裸名字，或「原子 + 成员名」（写对象字段） */
export type BindTarget =
  | { kind: "NameTarget"; name: string; pos: Pos }
  | { kind: "MemberTarget"; object: Expr; member: string; pos: Pos };

export interface BindStmt {
  kind: "Bind";
  target: BindTarget;
  value: Expr;
  pos: Pos;
}

export interface ExprStmt {
  kind: "ExprStmt";
  expr: Expr;
  pos: Pos;
}

export interface PrintStmt {
  kind: "Print";
  value: Expr;
  pos: Pos;
}

export interface ReturnStmt {
  kind: "Return";
  value: Expr;
  pos: Pos;
}

export interface IfStmt {
  kind: "If";
  cond: Expr;
  then: Stmt[];
  /** 无 否则 块时为 null */
  otherwise: Stmt[] | null;
  pos: Pos;
}

export interface WhileStmt {
  kind: "While";
  cond: Expr;
  body: Stmt[];
  pos: Pos;
}

export type Expr =
  | IntLit
  | BitsLit
  | BoolLit
  | NullLit
  | NameExpr
  | ThisExpr
  | ReadByteExpr
  | MemberExpr
  | CallExpr
  | NewExpr
  | UnaryExpr
  | BinaryExpr;

/** 整数：bits 为源码里的位串原样（咕嘎串），由解释器换算 */
export interface IntLit {
  kind: "IntLit";
  bits: string;
  pos: Pos;
}

/** 位串：bit 原样（咕嘎串） */
export interface BitsLit {
  kind: "BitsLit";
  bits: string;
  pos: Pos;
}

export interface BoolLit {
  kind: "BoolLit";
  value: boolean;
  pos: Pos;
}

export interface NullLit {
  kind: "NullLit";
  pos: Pos;
}

export interface NameExpr {
  kind: "Name";
  name: string;
  pos: Pos;
}

export interface ThisExpr {
  kind: "This";
  pos: Pos;
}

export interface ReadByteExpr {
  kind: "ReadByte";
  pos: Pos;
}

export interface MemberExpr {
  kind: "Member";
  object: Expr;
  member: string;
  pos: Pos;
}

export interface CallExpr {
  kind: "Call";
  object: Expr;
  method: string;
  args: Expr[];
  pos: Pos;
}

export interface NewExpr {
  kind: "New";
  className: string;
  args: Expr[];
  pos: Pos;
}

export interface UnaryExpr {
  kind: "Unary";
  op: "Not" | "Neg";
  operand: Expr;
  pos: Pos;
}

export interface BinaryExpr {
  kind: "Binary";
  op: "Add" | "Sub" | "Mul" | "Div" | "Mod" | "Eq" | "Lt" | "Gt" | "And" | "Or";
  left: Expr;
  right: Expr;
  pos: Pos;
}
