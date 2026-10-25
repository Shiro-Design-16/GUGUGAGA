<!-- i18n:begin -->
[中文](README.md) | **English** | [日本語](README.ja.md)

> This is an English translation. The Chinese [README.md](README.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugugaga language (GUGUGAGA)
**Language**: 中文 | [日本語](README.ja.md) | [English](README.en.md)

> A pure OOP language written with nothing but `咕` `嘎` `！` `？` `：` space, newline and indentation.
> The source has no letters, no digits, no strings, no comments — every name is a bit string of `咕`/`嘎`, and every output is a bit stream.

**Status**: v1 works end to end. 401 tests green (language 134 + translator 100 + extension 167), 7 example programs runnable, zero runtime dependencies (Node 24 type stripping runs `.ts` directly).

---

## 0. What it is, and what it is not

**It is**: a statically checked interpreted language with classes, inheritance, fields, methods, constructors, `自己` (this), dynamic dispatch, a static entry block, local scopes, `当`/`如果`/`返回`, and step and depth limits. That is one abstraction level above Brainfuck — you can write “classes” inside it, not just tape operations.

**It is not**:
- Not for real engineering (performance is a non-goal; it is a pure tree-walking interpreter).
- It has no strings, no arrays, no exceptions, no generics, no comments.
- **It does not output human-readable text.** A program can only write a bare bit stream; to see 「嗨」 you need another project — the **咕嘎翻译器** (the Gugugaga translator), with the encoding conventions in §4.

---

## 1. Quick start

```bash
./install.sh            # 装一次：把 咕咕嘎嘎 / ググガガ / gggg / gg / ggt 链接到 PATH 上的目录
gggg examples/咕嘎咕嘎.咕咕     # 像 python x.py 一样直接跑；stdout = 24 位裸位流 = E5 97 A8 = 「嗨」
咕咕嘎嘎 嘎嘎 examples/嘎嘎咕咕.咕咕  # 只做词法/语法/静态检查，成功则完全静默
printf 35 | gggg examples/咕嘎嘎咕.咕咕
./demos/咕咕咕嘎.咕咕     # 首行 #! 的 .咕咕 文件本身就是可执行脚本
npm test                # node --test "tests/**/*.test.ts"
```

You can run it without installing: `./bin/gg.ts examples/咕嘎咕嘎.咕咕`. There are three ways to install, pick any: `./install.sh` (recommended — five commands at once, symlinked back into this repository, so code changes take effect immediately), `npm link` (links `咕咕嘎嘎`/`ググガガ`/`gggg`/`gg` at the root, then `npm link` again inside `translator/` to get `ggt`), or symlink `bin/gg.ts` to whatever name you like.

Source files have four suffixes (case-insensitive): `.咕咕`, `.ググ`, `.gu`, `.gugugaga`. File names and example names are now pure bit names (`examples/咕嘎咕嘎.咕咕`, `examples/ガググガグ.ググ`, `examples/gugugaga.gu`); directory names stay ASCII (`src/`, `tests/`), because that is the host toolchain's skeleton and takes no part in the language.

**Errors are a bit stream too.** When something goes wrong, stderr carries only the `咕`/`嘎` diagnostic frames, not a single readable line — the human-readable text is restored by the translator:

```bash
咕咕嘎嘎 程序.咕咕 2> /tmp/咕 || ggt decode --diag /tmp/咕
# 2:7 E1001 非法字符“噶”（U+5676）
```

Details in §11 and `SPEC.md` §12 (GGDIAG v1). `gggg 文件.咕咕` omits the `run` subcommand: if the first non-option argument carries one of those four suffixes (or is an existing file), it is treated as execution.

---

## 2. Character set: why exactly these eight symbols

Eight symbols, three spellings (dialects), positionally equivalent — the same file, even the same word, can mix them:

| Bit | Chinese (default) | Japanese | English (case-insensitive) |
| --- | --- | --- | --- |
| 0 | `咕` U+5495 | `グ` U+30B0, also `ぐ` U+3050 | `GU`: `Gu`/`gU`/`gu` all count |
| 1 | `嘎` U+560E | `ガ` U+30AC, also `が` U+304C | `GA`: `Ga`/`gA`/`ga` all count |

Punctuation and whitespace are just as equivalent: `！`=`!`, `？`=`?`, `：`=`:`; indentation may use half-width spaces U+0020 or full-width spaces U+3000, each counting as one column. The tokenizer normalizes each position to `咕`/`嘎`, so everything after it (lexing, parsing, semantics) only ever sees Chinese bit strings.

| Token | Code point | Purpose |
| --- | --- | --- |
| `咕` | U+5495 | bit 0; also the bare word for print |
| `嘎` | U+560E | bit 1 |
| `！` | U+FF01 | full-width exclamation mark: definition suffix / call suffix |
| `？` | U+FF1F | full-width question mark: value suffix |
| `：` | U+FF1A | full-width colon: suffix boundary of a segment (block head, binding, arguments, return, and so on) |
| space | U+0020 | **only** separates tokens on the same line |
| newline | U+000A | statement terminator |
| indentation | starts at 4 spaces | block structure |

Eight hard rules:
1. Punctuation is legal in **both full-width and half-width** form (`！`=`!`, `？`=`?`, `：`=`:`); the Chinese dialect writes full-width by default. What is really illegal is a character outside the character set.
2. Indentation uses **spaces only** (half-width U+0020 or full-width U+3000, each counting as one column, and mixing them within one block is fine), and it must start at 0 at the outermost level and grow consistently inside a block. A tab is E1001.
3. CRLF is normalized to LF on read; a BOM is illegal.
4. **No comment syntax** — a comment would introduce a ninth symbol and break the “only these eight symbols” premise.
5. **No strings.** A string is a bit-string literal, by convention 8 bits per UTF-8 byte (§4).
6. **No numbers.** An integer is a binary bit string, written `嘎嘎嘎？` immediately followed by some bits.
7. Only bit names take part in encoding (`咕`/`グ`/`GU`, `嘎`/`ガ`/`GA`). **Note: look-alike characters such as `噶` (U+5676) and `呷` are all illegal** — E1001 stops them and reports the code point. English `g`/`G` must be paired into `GU`/`GA`; a lone one is E1001 as well.
8. The only I/O: out = `咕：<表达式>` writes a bare bit stream to stdout; in = `嘎嘎嘎嘎嘎嘎嘎` (read) reads the next UTF-8 byte of stdin (0..255), returning empty at EOF.

---

## 3. Language overview

> The tables in this chapter are always written in the Chinese dialect (`咕`/`嘎`); other dialects just replace each position according to the table in §2 — for example `咕咕！` = `ググ！` = `GUGU!`. Matching happens after normalization, so the dialect never affects a single rule.

### 3.1 Reserved words (21) and reserved tokens (30)

**Bare words (no suffix, 7)**

| Spelling | Meaning | Java |
| --- | --- | --- |
| `咕` | print (followed by `：表达式`) | `System.out.write` |
| `嘎嘎` | return | `return` |
| `嘎嘎嘎` | if | `if` |
| `嘎嘎嘎嘎` | else | `else` |
| `嘎嘎嘎嘎嘎` | while | `while` |
| `嘎嘎嘎嘎嘎嘎` | self | `this` |
| `嘎嘎嘎嘎嘎嘎嘎` | read | reads one byte of stdin |

**Declaration words (suffix `！`, 4)**: `咕咕！` defines a class | `咕咕嘎！` defines a method | `咕咕嘎嘎！` is the program entry | `咕嘎嘎！` creates an instance

**Action words (suffix `！？`, 2)**: `咕咕！？` binds (assignment / declares a field) | `咕嘎！？` evaluates and discards

**Value words (suffix `？`, 17)**

| Spelling | Name |
| --- | --- |
| `咕？` | add (integer addition; two bit strings = concatenation) |
| `咕咕？` | subtract |
| `咕嘎？` | multiply |
| `咕咕咕？` | divide (truncating toward zero) |
| `咕咕嘎？` | remainder |
| `咕嘎咕？` | equal |
| `咕嘎嘎？` | less than |
| `咕嘎嘎咕？` | greater than |
| `咕嘎咕咕？` | and (not short-circuiting) |
| `咕嘎咕嘎？` | or (not short-circuiting) |
| `咕咕咕咕？` | not (unary) |
| `咕咕嘎咕？` | negate (unary) |
| `嘎嘎嘎？<位串>` | integer literal (unsigned binary, a leading 0 may be omitted) |
| `嘎嘎嘎嘎？<位串>` | bit-string literal (any length, no 8-bit alignment check) |
| `嘎嘎？` | true |
| `嘎嘎咕？` | false |
| `嘎咕？` | empty |

Reading a value is written `<名字>？`. Operators are always **prefix**: `咕？ a b` = `a + b`. There are no parentheses, so prefix is the only option — it is the only unambiguous choice (§7).

### 3.2 Syntactic sugar at a glance

| Spelling | Meaning |
| --- | --- |
| `咕咕！ <名字>` + indented block | defines a class |
| `咕咕！ <子类>：<父类>？` + indented block | inheritance |
| `咕咕！？ <名字>：<表达式>` | in a class body = declares a field; in a statement = assignment / new local |
| `咕咕嘎！ <方法名> [：<参数名>]*` + indented block | defines a method; **a method whose name equals the class name is the constructor** |
| `咕咕嘎嘎！ <名字>` + indented block | program entry (static context, there is no “self”) |
| `咕嘎嘎！ <类名>？ [：<实参>]*` | creates an instance |
| `<接收者> <方法名>！ [：<实参>]*` | calls a method |
| `<对象>？ <字段名>` | reads a field |
| `咕咕！？ <对象>？ <字段名>：<表达式>` | writes a field |
| only a single `：` left at the end of a line | syntactic sugar: that line equals an empty line, for visual alignment |

### 3.3 One complete program (it really runs)

Class `咕咕咕嘎`: two fields `嘎`=3, `嘎咕咕`=2; method `嘎嘎嘎咕` returns their sum; the entry creates an instance and prints it (64 bits, value 5).

```text
GUGU! GUGUGUGA:
    GUGU!? GA:GAGAGA?GAGA
    GUGU!? GAGUGU:GAGAGA?GAGU
    GUGUGA! GAGAGAGU:
        GAGA:GU? GA? GAGUGU?
GUGUGAGA! GUGAGAGA:
    GUGU!? GAGUGA:GUGAGA! GUGUGUGA?
    GU:GAGUGA? GAGAGAGU!
```

Measured output is 64 bits, and the low three bits are `嘎咕嘎`, which decode to 5.

### 3.4 Against your original draft

The skeleton you gave (`咕咕！ 咕嘎：` to define a class, `咕咕！？ 咕：` to declare a variable, `咕咕嘎！ 咕咕嘎：` to define a method, `嘎嘎：` to return, `咕咕嘎嘎！` for the entry, `咕嘎嘎！` to instantiate, `咕嘎！？` to call) is mostly kept, but a few points had to be corrected:

1. The `噶` (U+5676) in the draft is not a legal character — only `咕`/`嘎` are. So field and method names must be taken from bit strings **not already occupied by reserved words** (§5); short names such as `咕` and `咕嘎` are all taken by keywords.
2. Reading a value requires the `？` suffix: `咕` is a print statement, `咕？` is “read the value of the name `咕`”. Without that suffix, `咕`/`嘎嘎`/`嘎嘎嘎` would collide with keywords.
3. A method call is written `<接收者> <方法名>！`; `咕嘎！？` is “evaluate and discard”, for the side effect of a whole expression.
4. If `嘎嘎： 咕？ 咕咕嘎 嘎？` in the draft means “return variable 咕 + variable 嘎”, it should be written `嘎嘎：咕？ 咕？ 嘎？` (prefix form: the operator eats the two expressions right after it).

### 3.5 A syntax edge that is easy to trip over

`新建` (`咕嘎嘎！`) may appear at **any expression start**: the right-hand side of a binding, the right operand of a binary operator, an argument slot after a colon, a field initializer; but it **cannot directly follow an expression that has already ended** (the prefix grammar has no parentheses — bind a local variable first in that case). The only separator for arguments is the colon, so `m！：a：b` is 2 arguments while `m！：a 咕嘎嘎！ C？` is still 1 argument.

---

## 4. Output encoding conventions (the translator interface)

stdout is a **continuous bare bit stream**: only `咕` (0) and `嘎` (1), **no separators, no newlines, no trailing newline**.

| Value type | Output width | Notes |
| --- | --- | --- |
| integer | **fixed 64 bits**, two's complement, high bit first | anything beyond 64 bits is truncated to the low 64 |
| bit string | as-is, copied bit by bit | the length is the literal's length |
| boolean | **8 bits**: false = 8 `咕`, true = 8 `嘎` | aligned with bytes |
| empty / object | — | E4006, cannot be output |

**String convention**: represented as bit strings — 8 bits per UTF-8 byte, high bit first, bytes emitted in order (keeping 8-bit alignment). Output written before the failing position **stays** on stdout (streaming, no buffering).

That fixes the translator's job completely: read the bit stream on stdin → split it by the conventions → print human-readable text. **This convention is the only contract between this project and `translator/`.**

---

## 5. Name economy: why variables end up called 「嘎咕嘎」

A name = a bit string of at least one `咕`/`嘎`, and it must not equal a reserved word. So the usable name space is chopped up very finely:

| Name length | Usable count | Example |
| --- | --- | --- |
| 1 | 1 | `嘎` |
| 2 | **0** | — (`咕咕`, `咕嘎` are both taken) |
| 3 | 2 | `嘎咕咕`, `嘎咕嘎` |
| 4 | 9 | `咕咕咕嘎`, `嘎嘎嘎咕` … |
| 5 | 31 | |
| 6 | 63 | |
| 7 | 127 | |

That is why names in the examples run long — short names are mostly eaten by keywords. `docs/名字对照表.md` translates each example's bit strings into plain language, line by line, and maps them to Java concepts.

---
---

## 6. Correspondence with Java

| Java | the Gugugaga language |
| --- | --- |
| `class C { }` | `咕咕！ C：` + indented block |
| `class D extends C` | `咕咕！ D：C？` + indented block |
| field declaration | `咕咕！？ 字段名：初值` (inside a class body; initialized ancestor first, then subclass) |
| method | `咕咕嘎！ 名字 [：参数]*` + indented block |
| constructor | a method whose name equals the class name; `新建 C：a：b` matches by argument count |
| `this` | `嘎嘎嘎嘎嘎嘎` (self) |
| `new C(...)` | `咕嘎嘎！ C？ [：实参]*` |
| `public static void main` | `咕咕嘎嘎！ 名字` + indented block (**static context**; using “self” there reports E4008) |
| dynamic dispatch | yes: methods are looked up on the runtime class |
| `System.out.write(b)` | `咕：<表达式>` |
| exceptions | none (an error terminates; exit codes in §10) |

---

## 7. Design trade-offs: a few key choices

1. **Line-oriented syntax with indented blocks**, not “one line of a giant bit stream”. Looking like a standalone language requires readable structure; with only these eight symbols, indentation is the only way to express block structure (there are no parentheses and no semicolons).
2. **Suffix-encoded token kinds**: a bare word = statement/keyword, `！` = declaration/call, `！？` = action, `？` = value, `：` = segment boundary. That way keywords never collide with user names, and **longest match is decidable** — the tokenizer only looks at “which suffix follows this bit string” to fix the token kind.
3. **Expressions are always prefix.** No parentheses ⇒ infix cannot group (`a+b*c` has no solution). The price is that nested arguments must be caught by local variables first (§8).
4. **Static checks + a tree-walking interpreter**, with no AST optimization, bytecode or JIT: performance is a non-goal, readability first (`src/interp.ts` explains all the semantics in one file).
5. **Output = a bare bit stream**, the language level does no “print a string”. Once human-readable output were allowed, the character set would have to swallow dozens more symbols and the whole premise would break. Readability is handed to the translator.
6. **No comment syntax**: adding comments would introduce a ninth symbol.

---

## 8. Known gaps (v1 non-goals, written down instead of pretending they are not there)

- No parentheses ⇒ a nested call `f(g())` must be split into intermediate variables; `新建` cannot follow an expression that has ended (§3.5).
- No string / array / collection types; a string is only a bit-stream convention.
- No not-equal operator, and no less-or-equal / greater-or-equal; combine `与` + `非` + `相等`.
- No comments.
- An empty bit string cannot be written out (`嘎嘎嘎嘎？` must be immediately followed by at least one bit).
- Only one layer of I/O: a stdout bit stream + stdin bytes; no files, no network.
- No exceptions / catch; a runtime error terminates (bits already written stay).
- Short names are scarce (§5).

---

## 9. Architecture and files

```text
源码(.咕咕) ─▶ lexer.ts ─▶ parser.ts ─▶ validate ─▶ interp.ts ─▶ stdout 裸位流
                  │            │             │            │
              keywords.ts   ast.ts      errors.ts    values.ts
                                               │
                                          wire.ts ─▶ stderr 诊断帧（咕/嘎）
```

| File | Lines | Responsibility |
| --- | --- | --- |
| `src/keywords.ts` | 233 | three-dialect spelling tables for bit names, the four reserved-word tables, `Token`/`TokenKind`, `isReserved`, bit-string ↔ integer conversion, suffix table |
| `src/ast.ts` | 194 | AST types (`Program`/`ClassDecl`/`MethodDecl`/`EntryDecl`/`Stmt`/`Expr`) |
| `src/errors.ts` | 72 | 21 error codes, `GgError`, exit codes, `codeNumber`/`frameOfError` (turns an error into a frame instead of gluing text) |
| `src/wire.ts` | 94 | GGDIAG v1 encoder: `encodeDiag`/`frameBits`/`messageBytes` (`SPEC.md` §12) |
| `src/lexer.ts` | 164 | lexing: position-wise normalization of the three dialects, bit-string scanning, suffix-driven token kinds, INDENT/DEDENT (including U+3000), end-of-line colon sugar |
| `src/parser.ts` | 468 | recursive descent + static checks (duplicate class/entry, inheritance cycles, parent class existence) |
| `src/values.ts` | 53 | value model, `bitsOf` (§4 encoding), `typeName` |
| `src/interp.ts` | 441 | tree-walking interpreter: scope stack, fields/methods/constructors, operators, step and depth limits |
| `src/cli.ts` | 224 | pure-Gugugaga action words `嘎`/`嘎嘎`/`嘎嘎嘎`/`嘎嘎嘎嘎` (+ Latin aliases), implicit execution, first-line shebang skipping, every exit routed through frames, exit codes |
| `bin/gg.ts` | 4 | shebang entry (`package.json` registers `咕咕嘎嘎`, `ググガガ`, `gggg`, `gg` as four commands) |
| `install.sh` | 70 | symlinks `咕咕嘎嘎`/`ググガガ`/`gggg`/`gg`/`ggt` into a directory on PATH; `--uninstall` removes them |
| `SPEC.md` | — | the language specification (character set/lexing/grammar/semantics/encoding/CLI/error codes/non-goals), **the authoritative document** |
| `docs/名字对照表.md` | 164 | line-by-line translation of the examples + Java correspondence |
| `examples/` | 7 | five in Chinese: 咕嘎咕嘎 (bit strings and calls) / 嘎咕嘎咕 (branching) / 咕咕嘎嘎 (loop + objects) / 嘎嘎咕咕 (inheritance dispatch) / 咕嘎嘎咕 (input and arithmetic); plus `ガググガグ.ググ` (Japanese) and `gugugaga.gu` (English, mixed case) |
| `demos/咕咕咕嘎.咕咕` | 1 | an executable script sample whose first line is `#!` (not in `examples/`; the character-set assertion only scans `examples/`) |
| `tests/*.test.ts` | 7 files / 134 cases | lexer 21, parser 19, interp 35, e2e 8, charset 11, cli 16, wire 19; `tests/ggdiag.ts` is a test-side independent frame decoder (not a test file) |

---

## 10. CLI reference

```text
用法：
  咕咕嘎嘎 <文件>                             # 执行，裸位流写 stdout（省略动作词，像 python x.py）
                                              # 后缀：.咕咕 / .ググ / .gu / .gugugaga（大小写不敏感）
  咕咕嘎嘎 嘎 <文件>.咕咕                     # 同上，显式写法
  咕咕嘎嘎 嘎嘎 <文件>.咕咕                   # 只做词法/语法/静态检查，成功静默
  咕咕嘎嘎 嘎嘎嘎                             # 帮助（帮助正文是一帧，走 stderr）
  咕咕嘎嘎 嘎嘎嘎嘎 <咕嘎位串> <文件>.咕咕     # 设步数上限（位串按二进制读）
退出码：0 成功；1 运行时错误；2 词法/语法/静态错误；3 用法错误
```

The action words are themselves characters of this language: `嘎` = run, `嘎嘎` = check, `嘎嘎嘎` = help, `嘎嘎嘎嘎` = step budget. The Latin aliases `run`/`check`/`--help`/`--max-steps N` are kept only for old human habits and **are not part of the language vocabulary**.

The command name is `咕咕嘎嘎` (the same entry as Japanese `ググガガ`, `gggg`, `gg`); when it is not installed, the equivalent is `node bin/gg.ts ...`. All four suffixes are recognized, and the dialect is independent of the suffix — a `GU` written inside a `.咕咕` file runs just the same. If a file's first line starts with `#!`, it is skipped before running/checking (replaced by an empty line, line numbers unchanged), so a `.咕咕` file can be run directly as `./程序.咕咕`; a `#` on any other line is still E1001.

Step-budget bit strings: only `咕`/`嘎`, `咕`=0, `嘎`=1, high bit first — `嘎` is 1, `嘎咕咕咕` is 8, `嘎嘎嘎嘎嘎` is 31. An empty string, any other character, or a value of 0 counts as a usage error.

**All diagnostics (including help and usage errors) go to stderr**; stdout carries only the program's bit stream. So `咕咕嘎嘎 嘎嘎嘎 | less` is empty; to read the help you need `咕咕嘎嘎 嘎嘎嘎 2>&1 | ggt decode --diag`.

Runtime constraints: step budget **5 000 000** (each statement execution and each expression-node evaluation counts as 1 step; `嘎嘎嘎嘎` / `--max-steps` can change it), call depth limit **512**. When stdin is a terminal it is treated as empty input, to avoid hanging on an interaction.

---
## 11. Error codes

| Code | Meaning |
| --- | --- |
| E1001 | illegal character (outside the character set; the code point is reported) |
| E1002 | indentation error (inconsistent / back to an undefined level / top level not 0) |
| E1003 | stray punctuation / a literal missing its immediately following bit string |
| E2001 | syntax error: unexpected token |
| E2002 | missing indented block (an empty block is illegal) |
| E3001 | duplicate class name |
| E3002 | duplicate entry |
| E3003 | missing entry |
| E3004 | inheritance cycle |
| E3005 | class resolution failed: undefined parent class, or the class is undefined when instantiating |
| E4001 | undefined name |
| E4002 | undefined method |
| E4003 | field does not exist |
| E4004 | type mismatch |
| E4005 | division by zero |
| E4006 | a value of this type cannot be output |
| E4007 | constructor call error (no constructor / argument count mismatch) |
| E4008 | “self” used in a static context (an entry block) |
| E4010 | step budget exceeded |
| E4011 | call depth limit exceeded |
| E4012 | receiver is not an object |

### 11.1 How to read a diagnostic

The error code and the position both live in a **GGDIAG v1 frame** (`SPEC.md` §12): stderr carries only `咕`/`嘎`, so not being able to read a word is normal. Hand it to the translator:

```bash
咕咕嘎嘎 程序.咕咕 2> /tmp/咕 || ggt decode --diag /tmp/咕
# 2:7 E1001 非法字符“噶”（U+5676）
```

The help frame (`咕咕嘎嘎 嘎嘎嘎`) works the same way. **The shell does not follow dialects**: frame headers, codes and bit streams always use Chinese bit names (`咕`/`嘎`), even when the source is written entirely in `GU`/`GA` — a decoder only needs one alphabet. The human-readable text still lives in `src/`, but it is only **bytes being carried** — the frame holds the original UTF-8, so the translator needs to know none of the texts and never has to be resynced with the interpreter's wording. The first segment printed by `ggt decode --diag` is `行:列`; events without a position (unreadable file, usage error) have only the code name and description.

---

## 12. Verification evidence

- `npm test` → `ℹ tests 134 / ℹ pass 134 / ℹ fail 0` (7 files on the language side).
- `./bin/gg.ts check` passes silently on all 7 examples (5 Chinese + 2 dialect ones).
- Measured examples:
  - `咕嘎咕嘎.咕咕` → 24 bits = `E5 97 A8` = the UTF-8 of 「嗨」.
  - `嘎咕嘎咕.咕咕` → 16 bits (two mutually exclusive 8-bit boolean branches).
  - `咕咕嘎嘎.咕咕` → 320 bits (a `当` loop + object state).
  - `嘎嘎咕咕.咕咕` → 24 bits = `F0 FF FF` (inheritance + dynamic dispatch).
  - `咕嘎嘎咕.咕咕` fed with `printf 35` → 128 bits: first `51+53=104`, then `51-53=-2` (two 64-bit integers).
- The three dialects produce **byte-identical** bit streams: `examples/ガググガグ.ググ`, `examples/gugugaga.gu`, and the Chinese sample extracted from `SPEC.md` §11 — 192 bytes each (= 64 bits), pairwise equal under `cmp`; all three print 64 `咕`. A lone `g` (`咕：gu？ g`) → exit 2 (E1001), and a `.GU` uppercase-suffix file can also be executed implicitly.
- CLI behaviour measured (every conclusion below comes from decoding frames): `嘎`→0; `嘎嘎`→0 and silent; division by zero→1 (E4005); illegal character→2 (E1001 非法字符“噶”（U+5676）); no arguments / missing file / `嘎嘎嘎嘎 咕咕咕` / unknown subcommand→3; `嘎嘎嘎`→0. **The stderr of every path was checked character by character: apart from `咕`/`嘎`/space/newline, not a single character.**
- The minimal runnable sample from `SPEC.md` §11 is extracted and executed directly by an integration test, printing 64 bits of all `咕` (= integer 0).
- `npm run test:vscode` → `ℹ tests 167 / ℹ pass 167 / ℹ skip 0 / ℹ fail 0`; `npm run test:all` → language 134 + translator 100 + editor extension 167 = **401 all green** (details in §14).

---

## 13. Sister project: the 咕嘎翻译器 (implemented, see `translator/`)

The language side of this repository stops at “bare bit stream + encoding conventions (§4)”; turning a bit stream back into human-readable text is the job of `translator/` (an independent subproject: its own `package.json` / `README.md` / 100 tests, zero dependencies, importing no module of this repository). Beyond bit streams it also translates **diagnostic frames** into human-readable text (`ggt decode --diag`, see §11):

```bash
cd translator
../bin/gg.ts run ../examples/咕嘎咕嘎.咕咕 | node bin/ggt.ts decode --bytes   # 嗨
../bin/gg.ts run ../examples/咕嘎咕嘎.咕咕 | node bin/ggt.ts decode           # 嗨（stderr 说明猜到了 bytes）
printf 35 | ../bin/gg.ts run ../examples/咕嘎嘎咕.咕咕 | node bin/ggt.ts decode --plan plans/咕嘎嘎咕.plan  # 104 / -2
printf 嗨 | node bin/ggt.ts encode --as-literal    # 嘎嘎嘎嘎？+ 24 位，可直接粘进源码
```

Decode modes: `--plan <文件>` (exact decoding by a slot table), `--int64`, `--bytes` (strict UTF-8), `--hex`, `--bits`; with no mode it guesses by multiples of 64/8 and writes the explanation to stderr. The reverse `encode` supports text, `--int64` decimal and `--as-literal` (generating bit-string / integer literals). Both sides understand all three dialects: `decode` takes `咕嘎`/`グガ`/`GUGA` mixed, and `encode --ja` / `--en` emits bit strings per dialect (`--ja` and `--en` are mutually exclusive). A plan is a host-side ASCII line-oriented file: `int64` / `bits <n>` / `bytes <n>` / `bool`.

Why a plan: a bit stream is not self-describing — `64 位整数` and `3 个字节的位串` are indistinguishable at the byte level, so “exact interpretation” has to be given a slot table by a human; when you only want a rough idea, use guess mode.

Running `npm run test:all` at the repository root runs all three test suites in a row (language 134 + translator 100 + editor extension 167 = 401 cases).

---

## 14. Editor support: the VS Code extension (`vscode/`)

Running is not enough — people also have to want to write inside it. The repository ships a zero-dependency VS Code extension: install it once and `.咕咕`, `.ググ`, `.gu`, `.gugugaga` files all get an editor experience.

```bash
./vscode/build-vsix.sh                                   # 重新打包（仓库已带打好的包）
code --install-extension vscode/gugugaga-language.vsix    # 安装
```

After installing, open any file with one of the four suffixes: the status bar language mode shows 「咕咕嘎嘎语」, and you get six capabilities:

| Capability | Behaviour |
| --- | --- |
| Language basics | recognition of the four suffixes (`.咕咕`/`.ググ`/`.gu`/`.gugugaga`), auto-indent after a trailing `：`, dedent on `嘎嘎`/`嘎嘎嘎嘎`/`嘎嘎嘎嘎嘎嘎`, folding by indentation, no comment syntax |
| Highlighting | 30 reserved tokens + integer/bit-string literals (the whole bit string is colored) + class/method/variable names + `！？`/`：` punctuation, 35 TextMate rules, each of which takes the three dialects (`咕\|グ\|ぐ\|[Gg][Uu]`) and half-width punctuation |
| Completion | by context (top level / class body / statement position / expression position / after a call) it offers reserved words and skeleton snippets; after `！？` it only offers method names already defined in this document |
| Hover | token explanation, family membership and usage examples — all written in 咕/嘎 (the shell stays pure, see below) |
| Diagnostics | on open / save / edit (debounce 350ms by default) it runs the real `咕咕嘎嘎 嘎嘎`, decodes the GGDIAG frames on stderr, and turns `E1xx`~`E3xx` into squiggles and Problems entries |
| Run | the ▶ in the editor title bar (and the context menu) sends `咕咕嘎嘎 <文件>` into the integrated terminal, like `python x.py`; a dirty document is saved first, the terminal is reused, and both output and exit code stay in the terminal |

The run button deliberately **does not take the output over**: the bit stream belongs in the terminal, so you can feed stdin on one side and hand the result to `ggt decode` on the other. It uses implicit execution (no action word), quotes arguments per platform, and binds no keyboard shortcut (ASCII chords in the command palette would break the purity of the shell).

On top of that there are 8 snippets (class, constructor, method, entry, field, condition, loop, new expression); apart from 咕/嘎/！/？/：/space/newline their bodies contain no other characters.

Three design trade-offs are worth recording:

1. **Diagnostics do not re-implement a half-baked parser**; the extension runs the real interpreter: it spawns `咕咕嘎嘎 嘎嘎 <文件>`, decodes the GGDIAG frames on stderr back into `{行, 列, 码}` (`src/diagnostics.js` ships its own zero-dependency decoder and imports no module of the repository). The code and description shown in the editor are exactly what you get by decoding a frame in the terminal. The price is a dependency on the CLI being reachable: it looks for the command with a three-step fallback — the `gugugaga.cliPath` setting → the workspace `bin/gg.ts` → `咕咕嘎嘎`/`ググガガ`/`gggg`/`gg` on PATH.
2. **The shell is pure Gugugaga too**: settings page titles and descriptions, command titles, the output panel, the Problems panel's source column and entry bodies (a body is that diagnostic's whole frame bit string, which only `ggt decode --diag` turns into text; the code column is deliberately left empty, otherwise it would render `E1001`), completion item descriptions, hover text, snippet descriptions — everything uses only 咕/嘎/！/？/：/space/newline; the default value of `cliPath` is `咕咕嘎嘎`, and the diagnostic collection name is `咕咕嘎嘎` as well. The panel also has a runtime gate: lines that `isPureLine()` does not accept are not written to the panel and go only to the developer console (`tests/purity.test.js` proves with mutation testing that the gate really does reject). Troubleshooting information (exec/args/workspace/stack) retreats to the developer console — the user cannot see it, which also means “why is there no diagnostic” requires DevTools to see the whole picture. The remaining ASCII in the manifest is all VS Code schema match keys (extension id, `scopeName`, command ids, setting ids); change one character and the extension will not load.
3. **TextMate forbids lookbehind**, so every highlighting rule eats a left-boundary capture group `(^| +)` / `(^| +|：)` and colors the capture group. Without that, the class-header rule would match `咕咕！` at position 3 of the call name `嘎咕咕嘎咕！`, and `咕咕？` would be taken as subtraction inside a value name — this is the single most critical design point in the whole grammar.

Three commands (run current file / check current file / show output panel), five settings (`cliPath`, `nodePath`, `checkOnChange`, `debounceMs`, `maxSteps`); the structure and repackaging instructions are in `vscode/README.md`.

The extension ships 11 test files and 167 assertions, all offline, zero dependencies, with `require("vscode")` **forbidden**; 3 of them really spawn `node bin/gg.ts 嘎嘎` and decode the stderr bit stream back into diagnostics (not fake green). So the only deliverable of this project that has never been verified on real hardware is it: coloring, folding feel, snippet Tab jumps and hover popup styling only have static and offline evidence, and it has never been activated in a real VS Code host. This is written here rather than hidden.


## 15. Multilingual documentation

All nine key documents have Japanese and English translations, named `原文.ja.md` / `原文.en.md`, side by side with the original:

| 中文 | 日本語 | English |
| --- | --- | --- |
| `README.md` | `README.ja.md` | `README.en.md` |
| `TUTORIAL.md` | `TUTORIAL.ja.md` | `TUTORIAL.en.md` |
| `SPEC.md` | `SPEC.ja.md` | `SPEC.en.md` |
| `translator/README.md` | `translator/README.ja.md` | `translator/README.en.md` |
| `translator/CONTRACT.md` | `translator/CONTRACT.ja.md` | `translator/CONTRACT.en.md` |
| `vscode/README.md` | `vscode/README.ja.md` | `vscode/README.en.md` |
| `vscode/CONTRACT.md` | `vscode/CONTRACT.ja.md` | `vscode/CONTRACT.en.md` |
| `vscode/gugugaga/README.md` | `vscode/gugugaga/README.ja.md` | `vscode/gugugaga/README.en.md` |
| `docs/名字对照表.md` | `docs/名字对照表.ja.md` | `docs/名字对照表.en.md` |

The translation rules are frozen in `docs/翻译规范.md`: **source** examples inside code blocks are rewritten per dialect (Japanese `グ`/`ガ` + full-width space indentation, English `GU`/`GA` + half-width punctuation), while **program output, commands, paths, numbers and error codes** are copied verbatim — a translation is not allowed to flatter the facts on the tool's behalf. The header carries an `<!-- i18n:begin -->` block for language switching, and the Chinese original is always authoritative.

`node scripts/check-translations.mjs` (`npm run test:i18n`) machine-checks the 18 translations: i18n header, heading level sequence, code block count and language markers, dialect equivalence of source blocks (character-wise normalized to 0/1 then compared), verbatim output blocks, number multisets, path sets, and it **really runs** every complete example with an entry point, comparing stdout bit streams. One drifting number, one missing path, one wrong bit-name character turns it red.

The division of labour among the three engineering documents: `SPEC.md` is the language specification (authoritative), `README.md` (this file) is the design notes and trade-offs, and `TUTORIAL.md` is the hands-on tutorial.
