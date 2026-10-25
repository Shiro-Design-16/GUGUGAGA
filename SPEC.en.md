<!-- i18n:begin -->
[中文](SPEC.md) | **English** | [日本語](SPEC.ja.md)

> This is an English translation. The Chinese [SPEC.md](SPEC.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugugaga Language · Language Specification v1.0

> A Java-like, purely OOP language written with nothing but the bit names `咕`/`嘎` (or `グ`/`ガ` in Japanese, `GU`/`GA` in English) plus `！` `？` `：`, spaces, newlines, and indentation.
> This file is the single authority: implementations and examples follow it. The three dialects are equivalent position by position (§1), and **any** character outside the table is a lexical error.

---

## 1. Character set and source files

One language, **three spellings (dialects)**, equivalent position by position: bit `0` may be written `咕`, `グ`, `ぐ`, or `GU`; bit `1` may be written `嘎`, `ガ`, `が`, or `GA`. Punctuation and whitespace are equivalent in the same way. **A single file, even a single word, may mix them** — the tokenizer normalizes position by position, and the lexing/grammar/semantics layers after it only ever see `咕`/`嘎` bit strings.

### 1.1 Mapping table

| Role | Chinese (full-width) | Japanese (full-width) | English (half-width) |
| --- | --- | --- | --- |
| Bit 0 | `咕` U+5495 | `グ` U+30B0, also `ぐ` U+3050 | `GU`, any of the four casings (`Gu`/`gU`/`gu`) |
| Bit 1 | `嘎` U+560E | `ガ` U+30AC, also `が` U+304C | `GA`, any of the four casings (`Ga`/`gA`/`ga`) |
| Declaration / call suffix | `！` U+FF01 | `！` U+FF01 | `!` U+0021 |
| Value / operator / literal suffix | `？` U+FF1F | `？` U+FF1F | `?` U+003F |
| Introducer | `：` U+FF1A | `：` U+FF1A | `:` U+003A |
| Space | U+0020 | 　U+3000 or U+0020 | U+0020 |
| Newline | U+000A | U+000A | U+000A |

- An English bit name is **two ASCII letters**: only `GU` counts as one bit of `0`. So English source contains just the three letters `G` `U` `A` (in any casing).
- Japanese keeps full-width punctuation and full-width spaces (U+3000); Chinese accepts U+3000 too, and either kind of space counts as one column.
- Full-width and half-width punctuation are equivalent as well: `咕！` = `咕!`, `！？` may be written `!?` (`咕！？` = `咕!?`).
- Columns are counted in **raw code points**: `gu` takes two columns, `咕` takes one, and error locations point at the real position in the source.

### 1.2 Mixing

- Normalization happens in the lexical layer, position by position: `咕グGU` is three bits of `0`, `嘎ガGA` is three bits of `1`.
- A name may mix dialects internally (`咕グGA` is a legal name); reserved words match on the **normalized bit string**, so `gu！` equals `咕！` and `GUGU!` equals `咕咕！`.
- Every position must be written in full: an English bit name one letter short (a lone `g`) is E1001.

### 1.3 Still illegal

- Tab U+0009, any whitespace other than U+0020/U+3000 (NBSP and friends), BOM U+FEFF, and a lone CR (CRLF is normalized to LF on read).
- Any character outside the 1.1 table is E1001: other kana, other ASCII letters, digits, underscores, and so on.
- **There is no comment syntax** (the character set has no usable comment marker). Readability rests on this specification and the mapping table in the README.

### 1.4 Encoding and suffixes

- Encoding UTF-8, no BOM, newlines LF.
- Source file suffixes (case-insensitive): `.咕咕`, `.ググ`, `.gu`, `.gugugaga`. The CLI and the VS Code extension share this one table, so a `.GU` file runs directly too.

## 2. Lexing

### 2.1 Tokens

The basic unit inside a line is a **string**: a run of consecutive bits (§1, any dialect, mixing allowed). A string may be followed by a suffix that must **touch it** (no space in between):

| Spelling | Token | Meaning |
| --- | --- | --- |
| `string` | WORD | bare word (a name, or a bare-word reserved word) |
| `string！` | DECL | declaration / method call |
| `string！？` | ACT | action-statement marker |
| `string？` | VAL | value / operator / literal |
| `：` | COLON | introducer |

- The tokenizer normalizes position by position: bit strings inside tokens are always `咕`/`嘎`, so the grammar and semantics layers never see a dialect difference; the original source text is used only for columns and error locations.
- The bit string of a bit-string literal (see §3.4) must **touch** its marker: `嘎嘎嘎？咕嘎咕` is legal, `嘎嘎嘎？ 咕嘎咕` is E1003.
- A lone `！` or `？` (with no string in front of it) is E1003.
- **End-of-line colon sugar**: when only spaces separate `：` (or `:`) from the newline, no COLON token is produced (equivalent to not writing it). So `咕咕！ 咕嘎：` from a sketch equals the canonical `咕咕！ 咕嘎`.

### 2.2 Indentation

- Leading spaces = that line's indentation; U+0020 and U+3000 each count as one column and may be mixed. A blank line (holding only those two kinds of space) is ignored entirely and produces no tokens.
- Top-level statement indentation must be `0`.
- Growing indentation → an INDENT is produced (opening a sub-block); shrinking → one or more DEDENTs (the level returned to must exist on the indentation stack, otherwise E1002).
- Statements inside one block must have exactly the same indentation; 4 spaces is the custom.

### 2.3 Name legality

A **name** = a run of bits (§1, any dialect, mixing allowed) that **must not equal any reserved word** (the strings appearing in the four tables of §3, 21 in total). Reserved words take priority, the same rule as Java's "a keyword cannot be an identifier".

The available name space (by string length):

| String length | Freely usable count | Notes |
| --- | --- | --- |
| 1 | 1 | only `嘎` |
| 2 | 0 | all taken |
| 3 | 2 | only `嘎咕嘎`, `嘎咕咕` |
| 4 | 9 | for example `嘎咕嘎咕` |
| 5 | 31 | a good length to start naming from |
| 6–7 | 63 / 127 | roomy |

## 3. Complete reserved word table (authoritative)

> The tables below always use the Chinese dialect (`咕`/`嘎`); other dialects are a position-by-position substitution per §1, e.g. `咕咕！` = `ググ！` = `GUGU!`. Matching happens after normalization, so no entry depends on dialect.

### 3.1 Bare-word keywords (statements / environment)

| Spelling | Name | Syntax |
| --- | --- | --- |
| `咕` | print | `咕：<expression>` |
| `嘎嘎` | return | `嘎嘎：<expression>` |
| `嘎嘎嘎` | if | `嘎嘎嘎：<condition>` + indented block |
| `嘎嘎嘎嘎` | else | `嘎嘎嘎嘎` + indented block (must directly follow an `if` at the same level) |
| `嘎嘎嘎嘎嘎` | while | `嘎嘎嘎嘎嘎：<condition>` + indented block |
| `嘎嘎嘎嘎嘎嘎` | this | expression atom, the current object |
| `嘎嘎嘎嘎嘎嘎嘎` | read | expression atom, reads 1 byte from stdin → integer 0–255; EOF → null |

### 3.2 Declaration words (suffix `！`)

| Spelling | Name | Syntax |
| --- | --- | --- |
| `咕咕！` | class | `咕咕！ <class name> [：<parent name>？]` + indented block |
| `咕咕嘎！` | method | `咕咕嘎！ <method name> [：<param name>]*` + indented block |
| `咕咕嘎嘎！` | entry | `咕咕嘎嘎！ <name>` + indented block |
| `咕嘎嘎！` | new | expression: `咕嘎嘎！ <class name>？ [：<arg>]*` |

**A method call** also uses the DECL token: `<receiver> <method name>！ [：<arg>]*`. The argument count is the number of `：` slots.

### 3.3 Action words (suffix `！？`)

| Spelling | Name | Syntax |
| --- | --- | --- |
| `咕咕！？` | bind | `咕咕！？ <target>：<expression>` |
| `咕嘎！？` | eval | `咕嘎！？ <expression>` (discards the value, for side effects) |

target = a bare name (local/parameter/field resolution is in §5.2) or `<atom> <member name>` (writes an object field).

### 3.4 Value words (suffix `？`)

**Operators (prefix style: the operator sits before its operands)**

| Spelling | Name | Arity |
| --- | --- | --- |
| `咕？` | add (integer addition; two bit strings = concatenation) | 2 |
| `咕咕？` | subtract | 2 |
| `咕嘎？` | multiply | 2 |
| `咕咕咕？` | divide (integer division, truncated toward zero) | 2 |
| `咕咕嘎？` | remainder | 2 |
| `咕嘎咕？` | equal | 2 |
| `咕嘎嘎？` | less than | 2 |
| `咕嘎嘎咕？` | greater than | 2 |
| `咕嘎咕咕？` | and (boolean) | 2 |
| `咕嘎咕嘎？` | or (boolean) | 2 |
| `咕咕咕咕？` | not (boolean) | 1 |
| `咕咕嘎咕？` | negate (integer) | 1 |

**Literals**

| Spelling | Name |
| --- | --- |
| `嘎嘎嘎？<bit string>` | integer (binary, `咕`=0 `嘎`=1, leftmost is the high bit) |
| `嘎嘎嘎嘎？<bit string>` | bit string |
| `嘎嘎？` | true |
| `嘎嘎咕？` | false |
| `嘎咕？` | null |

**Value read**: `<name>？` reads out the value of that name.

**Two conventions for literals**:

- **An integer literal's bit string is unsigned binary** (`咕`=0 `嘎`=1, leftmost high), leading `咕` may be omitted, e.g. `嘎嘎嘎？咕`=0, `嘎嘎嘎？嘎`=1, `嘎嘎嘎？嘎咕嘎`=5. There are no negative literals; a negative number comes from the unary `咕咕嘎咕？` negate.
- **A bit-string literal may be any length**: however many bits follow `嘎嘎嘎嘎？` is the length, it can be 7 bits or 13 bits, and there is no 8-bit alignment check; whether it groups into bytes is the programmer's own responsibility (§6's UTF-8 convention is a convention, not an enforcement).

## 4. Grammar (EBNF)

```
program     = { classDecl | entryDecl } EOF
classDecl   = "咕咕！" name [ "：" nameVAL ] NL INDENT { fieldDecl | methodDecl } DEDENT
fieldDecl   = "咕咕！？" name "：" expr NL
methodDecl  = "咕咕嘎！" name { "：" name } NL INDENT { stmt } DEDENT
entryDecl   = "咕咕嘎嘎！" name NL INDENT { stmt } DEDENT

stmt        = bindStmt | exprStmt | printStmt | returnStmt | ifStmt | whileStmt
bindStmt    = "咕咕！？" target "：" expr NL
target      = name | atom name
exprStmt    = "咕嘎！？" expr NL
printStmt   = "咕" "：" expr NL
returnStmt  = "嘎嘎" "：" expr NL
ifStmt      = "嘎嘎嘎" "：" expr NL INDENT { stmt } DEDENT
              [ "嘎嘎嘎嘎" NL INDENT { stmt } DEDENT ]
whileStmt   = "嘎嘎嘎嘎嘎" "：" expr NL INDENT { stmt } DEDENT

expr        = binExpr | unExpr | postfixExpr
binExpr     = <3.4 中任一 2 元运算符> expr expr
unExpr      = <3.4 中任一 1 元运算符> expr
postfixExpr = atom { memberAccess | callAccess }
memberAccess= name
callAccess  = name "！" { "：" expr }
atom        = intLit | bitsLit | boolLit | nullLit | nameVAL | "嘎嘎嘎嘎嘎嘎"
            | "嘎嘎嘎嘎嘎嘎嘎" | newExpr
intLit      = "嘎嘎嘎？" <位串>
bitsLit     = "嘎嘎嘎嘎？" <位串>
boolLit     = "嘎嘎？" | "嘎嘎咕？"
nullLit     = "嘎咕？"
nameVAL     = name "？"
newExpr     = "咕嘎嘎！" name "？" { "：" expr }
name        = WORD（且不是保留词）
```

> Translator's note: grammar, command, output, and pseudocode blocks are copied verbatim from the original (their annotations are in Chinese); only blocks that are runnable program source are rewritten into the English dialect.

**The parenthesis problem**: the character set has no parentheses, so expressions are always prefix — operator first, followed by a fixed number of operands, and **every expression has exactly one parse**.

**Operator grouping and evaluation order** (important, easy to get wrong):

- A binary (2-operand) operator eats the **two** `expr`s immediately following it, a unary (1-operand) operator eats **one**; operands start at the adjacent position, so there is no infix ambiguity and no associativity to choose from.
- Hence `咕？ 咕？ a b c` reads as `(a+b)+c` (the inner one eats `a b` first), and to express `a+(b+c)` you must spell it differently — prefix notation without parentheses is the only cost.
- Evaluation order is fixed: a binary operation evaluates **the left operand first, then the right**; `与`/`或` evaluate both sides (no short-circuit); method/new arguments evaluate left to right.
- The cost: nested arguments (`f(g())`) must be caught in a local variable first (see §10).

## 5. Semantics

### 5.1 Values and types (dynamic typing)

A value has one of 5 kinds: **integer** (arbitrary precision), **bit string** (a run of `咕`/`嘎`), **boolean**, **null**, **object**. Types are checked at run time, with no implicit conversions.

### 5.2 Name resolution and binding

Lookup order: **locals and parameters** → (inside a method body) **the current object's fields** → undefined (E4001).

- `咕咕！？ N：e`: N already in scope → assignment; the current object has a field N (inside a method body) → assign the field; otherwise create a new local.
- `咕咕！？ <atom> M：e`: writes field M of that atom (missing → E4003).
- Blocks (if/while) **introduce no new scope**: only method bodies and entry blocks are scopes.
- A variable must be bound before it is read (E4001).

### 5.3 Classes, fields, methods

- Inside a class body `咕咕！？ N：e` declares a field; `咕咕嘎！ M params…` declares a method. Fields are initialized in the order written.
- **Inheritance**: `咕咕！ child:parent？`. Methods are looked up along the inheritance chain, and a subclass method with the same name and the same argument count overrides the parent's (dynamic dispatch).
- **Construction**: a method whose name equals the class name is the constructor. `咕嘎嘎！ C？：a：b` executes in this order: allocate the instance → initialize fields from the most distant ancestor down to the subclass in declaration order → call the constructor (skipped when there is no constructor and no arguments; an argument count that does not match the constructor → E4007).
- No `super`, no static members, no visibility modifiers (non-goals for v1).

### 5.4 General evaluation order

- Binary operations: left then right, both sides evaluated (`与`/`或` do not short-circuit).
- Method calls: evaluate the receiver and resolve the method first (so a broken receiver or a missing method fails before the arguments), then evaluate arguments left to right.
- `new`: evaluate arguments left to right first, then allocate the object, then initialize fields from ancestors down to the subclass, and finally call the constructor.
- `new` may appear at any "expression start": a binding right-hand side, the right operand of a binary operation, an argument slot after a colon, a field initializer. It **cannot** follow an expression that has already ended (the prefix grammar has no parentheses; in that situation bind a local first).
- Arguments are delimited by colons alone: `m！：a：b` is 2 arguments, while `m！：a 咕嘎嘎！ C？` still has only 1 argument, and what follows it is an unexpected token at statement level.

### 5.5 Entry points

The block of `咕咕嘎嘎！ <name>` is the program entry: a **static context**, with no `this` (using it → E4008). Inside an entry block `嘎嘎` means end the program (the value is discarded).

### 5.6 Control flow

- `嘎嘎嘎：cond`: cond must be boolean, otherwise E4004.
- `嘎嘎嘎嘎` must directly follow the block of a `嘎嘎嘎` at the same indentation.
- `嘎嘎嘎嘎嘎：cond`: cond is re-evaluated on every iteration.
- A method body with no explicit `嘎嘎` returns **null**.

### 5.7 Operator details

| Operation | Rule |
| --- | --- |
| add | adds two integers; concatenates two bit strings; any other combination E4004 |
| subtract, multiply, divide, remainder, negate | integers only; a divisor of 0 → E4005 |
| equal | compares like with like: integers by value, bit strings bit by bit, booleans by value, null=null, objects by identity; across types → false (no error) |
| less than, greater than | integers only, otherwise E4004 |
| and, or, not | booleans only, otherwise E4004; **both sides are always evaluated** (no short-circuit) |

## 6. Output (bit stream)

- The only output channel is `咕：<expression>`. What reaches stdout is a **continuous bare bit stream**: only `咕`(0) and `嘎`(1), no separator, no newline, no trailing newline.
- Encoding convention (a future "Gugugaga translator" decodes by it):

| Value type | Output |
| --- | --- |
| integer | fixed-width **64-bit** two's complement, high bit first; anything beyond 64 bits keeps the low 64 bits |
| bit string | as-is, bit for bit |
| boolean | 8 bits: false = 8 `咕`, true = 8 `嘎` |
| null / object | E4006 (cannot be printed) |

- Strings are always represented as **bit strings**, by a UTF-8 convention: each byte is 8 bits, high bit first, emitted byte by byte in order (so a whole string stays 8-bit aligned).
- Example: `咕：嘎嘎嘎嘎？咕嘎咕` → outputs `咕嘎咕` (3 bits).

## 7. Runtime limits

- Step budget: **5 000 000** steps (each statement execution and each expression-node evaluation counts 1 step), exceeding it is E4010; the CLI flag `--max-steps` changes it.
- Call depth limit: **512**, exceeding it is E4011.
- On error, bits already written before the error are **kept**.

## 8. CLI and shell output

The command name is `咕咕嘎嘎` (installed aliases: `ググガガ`, `gggg`, `gg`). The action words themselves are written in the language's own characters:

```text
咕咕嘎嘎 <文件>                                 执行，位流写 stdout（省略动作词，像 python x.py）
咕咕嘎嘎 嘎 <文件>                              同上，显式写法
咕咕嘎嘎 嘎嘎 <文件>                            只做词法/语法/静态检查，不执行
咕咕嘎嘎 嘎嘎嘎                                 打印帮助（帮助正文是一帧，见 §12）
咕咕嘎嘎 嘎嘎嘎嘎 <咕嘎位串> <文件>             设置步数上限（位串按二进制读）
```

- The Latin aliases exist only for old human muscle memory and **are not part of the language vocabulary**: `run`=`嘎`, `check`=`嘎嘎`, `--help`=`嘎嘎嘎`, `--max-steps`=`嘎嘎嘎嘎`.
- Source file suffixes (§1.4): `.咕咕`, `.ググ`, `.gu`, `.gugugaga`, case-insensitive; implicit execution and VS Code's `editorLangId == gugugaga` use the same table.
- Omitting the action word: when the first non-option argument ends in any suffix from §1.4, or is itself an existing file, it is treated as `嘎`; any other unknown first argument is still a usage error (exit code 3).
- Step-budget bit string: only `咕`/`嘎`, `咕`=0, `嘎`=1, MSB first; it is not a decimal number, it is the number itself. Empty, containing other characters, or numerically 0 → usage-error frame.
- The help frame (code 22), like every diagnostic frame, is written to **stderr**, so `咕咕嘎嘎 嘎嘎嘎` has an empty stdout. This is a direct consequence of §8.1: the shell's readable text only travels in frames.
- First-line shebang: when the first line starts with `#!` it is skipped as a **host line** (replaced by a blank line, line numbers unchanged), so a `.咕咕` file can be run as `./程序.咕咕` directly; a `#` anywhere else is still E1001.
- Exit codes: `0` success; `1` runtime error; `2` lexical/grammar/static error; `3` usage error.

### 8.1 The shell only spits out the bit stream

| Stream | Contents |
| --- | --- |
| stdout | the program's output bit stream (§6), not one byte more |
| stderr | 0 or more GGDIAG v1 diagnostic frames (§12) |

- Every failure path (lexical / grammar / static / runtime / usage / unreadable file / internal crash) writes **nothing but** stderr frames: no readable characters at all, no host exception stack printed, no source line highlighted into the terminal.
- An unexpected host-level exception (a bug in the interpreter itself) must also be caught by the shell as one `内部错误` frame whose body is that exception's message — it is **still encoded inside the frame**, and the screen still shows 咕/嘎.
- So the only characters that can appear in a terminal are `咕`/`嘎`, spaces, and newlines: **the shell does not follow the dialect**, diagnostic frames and the program bit stream always use the Chinese bit names. Whether a source line is shown to a human is the translator's call, not the interpreter's.
- To read something human: hand stderr to the translator.

```sh
咕咕嘎嘎 程序.咕咕 2> /tmp/咕 && ggt decode --diag /tmp/咕
```

- The dividing line: §1–§7 describe the **language**; this section and §12 describe the **shell** (process, streams, exit codes). The shell's bytes also use only the language's characters, so "the screen shows only gugaga" holds for both.

## 9. Error codes

| Code | Meaning |
| --- | --- |
| E1001 | illegal character (outside the character set; an English bit name short of two letters lands here too) |
| E1002 | indentation error (inconsistent / back to an undefined level / top level not 0) |
| E1003 | lone punctuation / a literal missing its adjacent bit string |
| E2001 | syntax error: unexpected token |
| E2002 | missing indented block (an empty block is illegal) |
| E3001 | duplicate class name |
| E3002 | duplicate entry |
| E3003 | missing entry |
| E3004 | inheritance cycle |
| E3005 | class resolution failed: the parent class is undefined, or the class is undefined at `new` time |
| E4001 | undefined name |
| E4002 | undefined method |
| E4003 | no such field |
| E4004 | type mismatch |
| E4005 | division by zero |
| E4006 | a value of this type cannot be printed |
| E4007 | constructor call error (no constructor / argument count mismatch) |
| E4008 | `自己` used in a static context (an entry block) |
| E4010 | step budget exceeded |
| E4011 | call depth exceeded |
| E4012 | receiver is not an object (field/method access) |

## 10. v1 non-goals

What this version deliberately does not do: comments, floating point, a string type (bit strings plus the UTF-8 convention stand in), `super`, static members, visibility, variadic parameters, and **an argument position cannot directly nest a method call** (the price of prefix self-delimitation; bind a local first).

Two more known expressiveness gaps (both deliberate, neither one a bug):

- **The empty bit string cannot be written**: bit-string concatenation needs two operands, and there is no 0-bit literal, so a program like "read until EOF, then output 0 bits" cannot be written. `嘎咕？` (null) in an operation is E4004, printed is E4006.
- **No strings / arrays**: text is always encoded as a bit string per §6, and aggregate structures must be wrapped in a class by hand.

## 11. Smallest runnable example

```text
GUGU! GAGUGA
    GUGU!? GUGUGUGUGU:GAGAGA?GU
    GUGUGA! GUGAGUGAGU
        GAGA:GAGAGAGAGAGA GUGUGUGUGU

GUGUGAGA! GAGUGUGAGU
    GUGU!? GUGUGAGUGU:GUGAGA! GAGUGA?
    GUGA!? GUGUGAGUGU? GUGAGUGAGU!
    GU:GUGUGAGUGU? GUGAGUGAGU!
```

Line-by-line reading:

1. `咕咕！ 嘎咕嘎` —— defines the class `嘎咕嘎`.
2. `咕咕！？ 咕咕咕咕咕：嘎嘎嘎？咕` —— the field `咕咕咕咕咕` is initialized to the integer 0 (`嘎嘎嘎？咕` is binary `0`).
3. `咕咕嘎！ 咕嘎咕嘎咕` —— defines a parameterless method `咕嘎咕嘎咕`.
4. `嘎嘎：嘎嘎嘎嘎嘎嘎 咕咕咕咕咕` —— returns `自己`.`咕咕咕咕咕`.
5. `咕咕嘎嘎！ 嘎咕咕嘎咕` —— the program entry.
6. `咕咕！？ 咕咕嘎咕咕：咕嘎嘎！ 嘎咕嘎？` —— the local variable `咕咕嘎咕咕` = `新建 嘎咕嘎`.
7. `咕嘎！？ 咕咕嘎咕咕？ 咕嘎咕嘎咕！` —— calls the method (0 arguments).
8. `咕：咕咕嘎咕咕？ 咕嘎咕嘎咕！` —— prints the result of this call: the integer 0 (64 bits, that is 64 `咕`).


### 11.1 The same program written in Japanese and English

Rewrite the sample above position by position per §1, with exactly the same semantics. The Japanese version indents with 4 full-width spaces U+3000, the English version with 4 half-width spaces:

```text
ググ！　ガグガ
　　　　ググ！？　グググググ：ガガガ？グ
　　　　ググガ！　グガグガグ
　　　　　　　　ガガ：ガガガガガガ　グググググ

ググガガ！　ガググガグ
　　　　ググ！？　ググガググ：グガガ！　ガグガ？
　　　　グガ！？　ググガググ？　グガグガグ！
　　　　グ：ググガググ？　グガグガグ！
```

```text
GUGU! GAGUGA
    GUGU!? GUGUGUGUGU: GAGAGA?GU
    GUGUGA! GUGAGUGAGU
        GAGA: GAGAGAGAGAGA GUGUGUGUGU

GUGUGAGA! GAGUGUGAGU
    GUGU!? GUGUGAGUGU: GUGAGA! GAGUGA?
    GUGA!? GUGUGAGUGU? GUGAGUGAGU!
    GU: GUGUGAGUGU? GUGAGUGAGU!
```

- English bit names are case-insensitive: `Gu`/`gU`/`gu` are the same as `GU`, and a whole program written in lowercase is legal.
- Both samples are **bit-for-bit identical** to the Chinese sample above once the bit names are normalized (spaces and newlines are only separators and take no part in the bit string), and actually running all three gives the same output (64 `咕` each).

## 12. Shell bit-stream protocol GGDIAG v1

On stderr the shell writes "diagnostic frames". A frame consists only of `咕` (0) and `嘎` (1), with not one readable character; the translator (a sibling project) turns it back into human language. **Human language is not in this language** — it is only bytes being carried.

### 12.1 Bit order

- Every field in a frame is **MSB first** (the highest bit is written first).
- `咕` = 0, `嘎` = 1.
- Spaces or newlines may sit between frames; the decoder ignores every non-`咕`/`嘎` character (a host warning should not destroy the whole stream).

### 12.2 Frame layout

| Field | Bits | Value |
| --- | --- | --- |
| magic | 4 | `1010` |
| version | 2 | `00` (v1) |
| code | 8 | event code, see 12.3 |
| line | 16 | 1-based line number; 0 = no position |
| col | 16 | 1-based column number; 0 = no position |
| mlen | 16 | message byte count (0–65535) |
| msg | mlen × 8 | message body: the UTF-8 bytes of the original human-language text, MSB first byte by byte |
| end | 3 | `110` |

- A frame is always `65 + 8 × mlen` bits long.
- One process may write several frames; the current implementation writes only one frame per event kind.
- On a magic/version mismatch the decoder keeps scanning forward for the next `1010 00`; it does not exit.
- If `end` is not `110`, or the remaining bits are not enough to read msg → the frame is void, keep looking for the next one.

### 12.3 Event codes

| code | Meaning | Corresponds to §9 |
| --- | --- | --- |
| 1–21 | language errors, in the order of the §9 table: 1 = E1001 … 21 = E4012 | same name |
| 0 | usage error (bad CLI arguments) | — |
| 22 | help (the body is the full usage text) | — |
| 23 | read-file failure (the body carries the reason the host gave) | — |
| 24 | internal error (host exception, the body is its message) | — |

The order of the `CODE` table in `src/errors.ts` is the single source of truth for this mapping: code value = that table's index + 1. A new error code **may only be appended at the end of the table** (reordering makes an old decoder read the wrong code), and may not be reordered during v1.

### 12.4 Why carry the body instead of only sending a code

Sending just an 8-bit code and letting the translator look it up is the same as copying that batch of Chinese strings in `src/` twice (one copy in the interpreter, one in the translator), and any wording change has to be synced on both sides. Carrying UTF-8 bytes instead: the Chinese strings stay in `src/` as data (source and comments are written in Chinese anyway), they are just **never shown directly on screen**; the translator does not need to know a single one of these texts, so there is zero drift. The cost is that frame length grows with the message (about 40 Chinese characters ≈ 120 bytes = 960 bits), which does not matter for this language.

### 12.5 Reference decoding (pseudocode)

```text
bits ← 咕/嘎位流（过滤掉其它字符）
循环：
  跳过直到匹配 magic(1010) + version(00)
  读 code(8) line(16) col(16) mlen(16)
  读 mlen×8 位 → 按 UTF-8 解码 → text
  读 end(3)；不是 110 就丢弃这帧
  输出 text（line/col 为 0 时省略位置）
```
