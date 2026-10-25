<!-- i18n:begin -->
[中文](TUTORIAL.md) | **English** | [日本語](TUTORIAL.ja.md)

> This is an English translation. The Chinese [TUTORIAL.md](TUTORIAL.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugugaga language (Chinese: 咕咕嘎嘎语) · User Manual

For people who want to get it running, tweak it, or make sense of the error messages. Every command and every piece of output below was actually run on this machine.

---

## 0. Three things to get in one minute

1. **Source code** is a text file with the suffix `.咕咕` (or `.ググ`/`.gu`/`.gugugaga`), and only eight things ever appear inside it: `咕` `嘎` `！` `？` `：` space, newline, indentation. All eight also have Japanese and English spellings (`グ`/`GU`, `ガ`/`GA`, …); see “Three dialects” in §2.
2. **The only output a program has** is a bit stream: `咕`=0, `嘎`=1 — no separators, no newlines, no trailing newline. Printing a single integer means 64 bit characters.
3. **To make sense of the output**, use the translator `ggt` in `translator/` to decode the bit stream back into human language.

This document has Japanese and English translations: `TUTORIAL.ja.md`, `TUTORIAL.en.md`, plus `README.ja.md`, `SPEC.ja.md` and others — nine files in total (see `docs/翻译规范.md`).

A program looks like this (this is one of the smallest runnable examples):

```text
GUGUGAGA! GAGUGAGAGAGU
    GU:GAGAGA?GAGUGA
```

---

## 1. Command card

From the repository root:

Install once first (it only creates symlinks — no file copying, no network):

```bash
./install.sh                 # 装到你 PATH 上的目录（自动挑 ~/.local/bin、~/bin、/usr/local/bin）
```

After that `咕咕嘎嘎` works from any directory (this language's own name; the Japanese alias `ググガガ`, and `gggg`/`gg` are the same entry point), as does `ggt` (the translator):

```bash
咕咕嘎嘎 examples/咕嘎咕嘎.咕咕       # 跑程序，位流写到 stdout（24 个字）——就是 python x.py 那个手感
咕咕嘎嘎 嘎嘎 examples/咕嘎咕嘎.咕咕   # 只做词法/语法/静态检查，静默 = 通过
咕咕嘎嘎 嘎嘎嘎                      # 帮助（帮助正文也是位流，走 stderr）
咕咕嘎嘎 嘎嘎嘎嘎 <咕嘎位串> 程序.咕咕  # 限制执行步数，防止死循环（嘎=1、咕=0，高位在前）
```

The action words are this language's own characters: `嘎` runs, `嘎嘎` checks, `嘎嘎嘎` prints help, `嘎嘎嘎嘎` sets the step budget. The Latin spellings `run` / `check` / `--help` / `--max-steps` still work, but only out of muscle memory — **they are not part of the language's vocabulary**.

There is no action word in `咕咕嘎嘎 文件.咕咕`: when the first non-option argument ends with `.咕咕` (or is a file that exists), it is taken as something to run. Writing `咕咕嘎嘎 嘎 文件.咕咕` out explicitly does exactly the same. The aliases `gggg` and `gg` are equivalent; `ggt` is the translator.

If you would rather not install it, or want to pin it to the repository, use `./bin/gg.ts run 程序.咕咕` (equivalent to `node bin/gg.ts run ...`). Another way to install is `npm link` (that gives you `咕咕嘎嘎`/`ググガガ`/`gggg`/`gg` at the root, and another `npm link` inside `translator/` gives you `ggt`). `./install.sh --uninstall` removes it whenever you like.

All four suffixes (`.咕咕`, `.ググ`, `.gu`, `.gugugaga`, case-insensitive) are recognized, and `.GU` runs directly too — the suffix only decides “is this a program”, never which dialect the source is written in.

A `.咕咕` file can also be written as an **executable script**: put `#!/usr/bin/env gggg` on the first line, `chmod +x`, then run `./程序.咕咕` directly. The CLI skips that `#!` line before parsing; the language itself still accepts only those eight symbols (see `demos/咕咕咕嘎.咕咕`).

Exit codes: `0` success · `1` runtime error · `2` tokenizer/parser/static error · `3` usage error.

### Reading a bit stream as human language

```bash
./bin/gg.ts examples/咕嘎咕嘎.咕咕 | node translator/bin/ggt.ts decode --bytes
# 嗨

./bin/gg.ts examples/咕嘎咕嘎.咕咕 | node translator/bin/ggt.ts decode --hex
# 0000: E5 97 A8  |...|

./bin/gg.ts examples/咕咕嘎嘎.咕咕 | node translator/bin/ggt.ts decode --int64
# 1
# 2
# 3
# 4
# 5
```

### Reading diagnostics (errors are a bit stream too)

```bash
./bin/gg.ts 程序.咕咕 2> /tmp/咕 || node translator/bin/ggt.ts decode --diag /tmp/咕
# 2:7 E1001 非法字符“噶”（U+5676）
```

The `2>` is required: diagnostics always go to stderr, while stdout only ever carries the program's bit stream. On success stderr is empty.

### The other direction: human language into a bit stream

```bash
printf 嗨 | node translator/bin/ggt.ts encode                # 24 位，可直接当位串字面量的内容
printf 嗨 | node translator/bin/ggt.ts encode --as-literal  # 带前缀的完整字面量，直接粘进源码
printf 300 | node translator/bin/ggt.ts encode --int64 --as-literal
```

---

## 2. Write your first program

Save it as `/tmp/第一个.咕咕`:

```text
GUGUGAGA! GAGUGAGAGAGU
    GU:GAGAGA?GAGUGA
```

Reading it piece by piece:

| Piece | Meaning |
| --- | --- |
| `咕咕嘎嘎！` | The program's entry point (the `public static void main` of this language); there can only be one in the whole program |
| `嘎咕嘎嘎嘎咕` | The entry's name; any name that does not collide with a reserved word will do |
| newline + indentation | Where the entry body begins |
| `咕：` | Print; an expression follows |
| `嘎嘎嘎？嘎咕嘎` | Integer literal: the prefix `嘎嘎嘎？` plus the unsigned binary `101` = 5 |

Run it:

```bash
./bin/gg.ts run /tmp/第一个.咕咕            # 输出 64 个 咕/嘎
./bin/gg.ts run /tmp/第一个.咕咕 | node translator/bin/ggt.ts decode --int64
# 5
```

Three hard rules (break one and you get an error; there are no exceptions):

- Indent with spaces only — either half-width U+0020 or full-width U+3000, each counting as one column; **a Tab gives E1001**.
- Inside one block every statement must sit at the same indentation depth; only block-opening lines such as class / method / entry / if / while may make the next line deeper, otherwise E2001.
- **There is no comment syntax.** Apart from bit names and `！？：`, every letter, digit and punctuation mark (including `#` and `//`) is an illegal character; English bit names must come in pairs (`GU`/`GA`), and a lone `g` is E1001.

### Three dialects (three ways to write the same language)

The language has three spellings, **equivalent position by position**, and you can mix them inside one file or even one name:

| Bit | Chinese (default) | Japanese | English (case-insensitive) |
| --- | --- | --- | --- |
| 0 | `咕` | `グ` (also `ぐ`) | `GU` (`Gu`/`gU`/`gu`) |
| 1 | `嘎` | `ガ` (also `が`) | `GA` (`Ga`/`gA`/`ga`) |

Punctuation and whitespace are equivalent in the same way: `！`=`!`, `？`=`?`, `：`=`:`. So the three sources below are **exactly the same semantically** (each prints a 64-bit 1):

```text
GUGUGAGA! GAGUGAGAGAGU
    GU:GAGAGA?GA
```

```text
ググガガ！　ガグガガガグ
　　　　グ：ガガガ？ガ
```

```text
GUGUGAGA! GAGUGAGAGAGU
    GU:GAGAGA?GA
```

The repository already contains two dialect samples: `examples/ガググガグ.ググ` (Japanese, indented with full-width spaces) and `examples/gugugaga.gu` (English, mixed case). They are one and the same program as the Chinese sample: normalize the bit names and all three bit streams agree bit for bit.

**The output glyphs follow the file suffix**: a program in `.咕咕` writes and reports `咕`/`嘎`, in `.ググ` it writes `グ`/`ガ`, in `.gu` it writes `GU`/`GA` — for one program, stdout and stderr are always in the same dialect. Help and command-line usage errors have no program behind them, so they stay Chinese. Normalized, the three dialects agree bit for bit, so the translator only ever needs one alphabet (`ggt decode --diag` takes all three).

---

## 3. Language cheat sheet

> All the tables below are written in the Chinese dialect; to switch to `グ`/`GU`, substitute position by position using the table in §2 — syntax and semantics do not change by a single character.

### 3.1 Bare words (7 of them, used as whole-line statements)

| Spelling | Meaning |
| --- | --- |
| `咕` | Print; followed by `：expression` |
| `嘎嘎` | Return |
| `嘎嘎嘎` | If |
| `嘎嘎嘎嘎` | Else |
| `嘎嘎嘎嘎嘎` | While |
| `嘎嘎嘎嘎嘎嘎` | Self (this) |
| `嘎嘎嘎嘎嘎嘎嘎` | Read (one byte from stdin) |

### 3.2 Declarations and actions (with a suffix)

| Spelling | Meaning |
| --- | --- |
| `咕咕！` + name | Define a class |
| `咕咕！` + subclass`：`superclass`？` | Inheritance |
| `咕咕嘎！` + method name (+ any number of `：parameter`) | Define a method; if the method name == the class name, it is the constructor |
| `咕咕嘎嘎！` + name | Program entry point |
| `咕嘎嘎！` + class name`？` (+ any number of `：argument`) | Create a new instance |
| `咕咕！？` + name `：` expression | Binding: inside a class body it declares a field, in a statement it assigns or creates a local |
| `咕嘎！？` + expression | Evaluate and discard |

### 3.3 Value words (ending in `？`, 17 of them)

| Spelling | Name | | Spelling | Name |
| --- | --- | --- | --- | --- |
| `咕？` | Add (integer addition / bit string concatenation) | | `咕咕？` | Subtract |
| `咕嘎？` | Multiply | | `咕咕咕？` | Divide |
| `咕咕嘎？` | Remainder | | `咕嘎咕？` | Equal |
| `咕嘎嘎？` | Less than | | `咕嘎嘎咕？` | Greater than |
| `咕嘎咕咕？` | And (not short-circuiting) | | `咕嘎咕嘎？` | Or (not short-circuiting) |
| `咕咕咕咕？` | Not (unary) | | `咕咕嘎咕？` | Negate (unary) |
| `嘎嘎嘎？` + bit string | Integer literal | | `嘎嘎嘎嘎？` + bit string | Bit string literal |
| `嘎嘎？` | True | | `嘎嘎咕？` | False |
| `嘎咕？` | Null | | | |

Read a variable: `name？`. Read a field: `object？ fieldName`. Call a method: `receiver methodName！：arg：arg`.

**All operators are prefix** (there are no parentheses): `咕？ a b` = a + b.

### 3.4 A complete class program

```text
GUGU! GUGUGUGA:
    GUGU!? GA:GAGAGA?GAGA
    GUGU!? GAGUGU:GAGAGA?GAGU
    GUGUGA! GAGAGAGU:
        GAGA:GU? GA? GAGUGU?
GUGUGAGA! GAGUGAGAGAGU
    GUGU!? GAGAGUGAGUGU:GUGAGA! GUGUGUGA?
    GU:GAGAGUGAGUGU? GAGAGAGU!
```

The class `咕咕咕嘎`: fields `嘎`=3 and `嘎咕咕`=2; the method `嘎嘎嘎咕` returns their sum; the entry creates an instance and prints it → `decode --int64` gives `5`.

---

## 4. Three real programs, line by line

### 4.1 Printing a string (`examples/咕嘎咕嘎.咕咕`)

```text
GUGUGAGA! GAGUGAGAGAGU
    GU:GAGAGAGA?GAGAGAGUGUGAGUGAGAGUGUGAGUGAGAGAGAGUGAGUGAGUGUGU
```

`嘎嘎嘎嘎？` is the bit string literal prefix; the 24 bits after it are the UTF-8 for “嗨” (E5 97 A8). The language has no string type, so **a string is always written as a bit string** — UTF-8, 8 bits per byte, most significant bit first.

### 4.2 Variables and prefix arithmetic (`11` and `30`)

```text
GUGUGAGA! GAGUGAGAGAGU
    GUGU!? GA:GAGAGA?GAGUGA
    GUGU!? GAGUGA:GAGAGA?GAGAGU
    GU:GU? GA? GAGUGA?
    GU:GUGA? GA? GAGUGA?
```

`嘎`=5 and `嘎咕嘎`=6, so it first prints 5+6=11 and then 5×6=30 (64 bits each).

### 4.3 Inheritance and dynamic dispatch (`examples/嘎嘎咕咕.咕咕` → `F0 FF FF`)

```text
GUGU! GAGAGUGAGA
    GUGU!? GAGUGUGAGU:GAGAGAGA?GAGAGAGAGUGUGUGU
    GUGUGA! GAGAGUGAGA:GAGUGUGUGA
        GUGU!? GAGUGUGAGU:GAGUGUGUGA?
    GUGUGA! GAGUGAGAGU
        GAGA:GAGUGUGAGU?

GUGU! GAGAGUGAGAGU:GAGAGUGAGA?
    GUGUGA! GAGAGUGAGAGU:GAGUGUGUGA
        GUGU!? GAGUGUGAGU:GAGUGUGUGA?
    GUGUGA! GAGUGAGAGU
        GAGA:GU? GAGUGUGAGU? GAGUGUGAGU?

GUGUGAGA! GAGUGAGAGAGU
    GUGU!? GAGAGUGAGUGU:GUGAGA! GAGAGUGAGA?:GAGAGAGA?GAGAGAGAGUGUGUGU
    GUGU!? GAGAGUGAGUGA:GUGAGA! GAGAGUGAGAGU?:GAGAGAGA?GAGAGAGAGAGAGAGA
    GU:GAGAGUGAGUGU? GAGUGAGAGU!
    GU:GAGAGUGAGUGA? GAGUGAGAGU!
```

- The superclass `嘎嘎咕嘎嘎`: the field `嘎咕咕嘎咕` starts out as `F0`; the constructor `嘎嘎咕嘎嘎` stores the bit string passed in into that field; the method `嘎咕嘎嘎咕` returns the field.
- The subclass `嘎嘎咕嘎嘎咕` inherits from it: the constructor has the same name and the same parameters; it **overrides** the method `嘎咕嘎嘎咕` to return “field + field” (bit string concatenation).
- The entry point: create two instances, print the result of the superclass instance's method (`F0`), then the result of the subclass instance's method (`FF FF`), 24 bits in total.

---

## 5. How to read an error

When the interpreter fails, stderr carries nothing but `咕` and `嘎` — those are **diagnostic frames** (GGDIAG v1; the format is in `SPEC.md` §12). Frame after frame; it is normal that you cannot read them as text — hand them to the translator and they turn back into human language:

```bash
./bin/gg.ts 程序.咕咕 2> /tmp/咕 || node translator/bin/ggt.ts decode --diag /tmp/咕
# 2:7 E1001 非法字符“噶”（U+5676）
```

`2:7` is `line:column`; events without a position (an unreadable file, a usage error) carry only the code name and its description. Frames embed the original UTF-8, so the translator never has to know any of the message texts.

Common errors and what to do about them:

| Code | Meaning | Typical cause |
| --- | --- | --- |
| E1001 | Illegal character | Letters (other than English bit names), digits, Tab (U+0009), look-alike characters such as `噶`, a lone `g`/`G`; note that half-width punctuation and full-width spaces are now **legal** |
| E1003 | Literal is missing its bit string | Nothing made of 咕/嘎 immediately follows `嘎嘎嘎？` |
| E2001 | Syntax error | Missing operand, illegal indentation, a name that collides with a reserved word |
| E3002 / E3003 | Duplicate entry / no entry | Two `咕咕嘎嘎！` were written, or none at all |
| E3004 / E3005 | Inheritance cycle / undefined class | A misspelled superclass; using `咕嘎嘎！` on a class that was never defined |
| E4001 | Undefined name | A misspelled variable name (**`check` does not report it; only `run` does**) |
| E4002 | Undefined method | A misspelled method name or the wrong number of arguments |
| E4004 | Type mismatch | Adding an integer and an object, subtracting one bit string from another |
| E4005 | Division by zero | The second operand of `咕咕咕？` is 0 |
| E4006 | Cannot print | Printing an object or null |
| E4010 / E4011 | Step budget exceeded / recursion too deep | An infinite loop; `--max-steps` can raise the budget |

Three measured here (all written inside the entry body, so the first line is `咕咕嘎嘎！ 嘎咕嘎嘎嘎咕`); below is what they look like after decoding:

```text
咕：噶                        → 2:7  E1001 非法字符“噶”（U+5676）
咕：咕？ 嘎？                  → 2:12 E2001 语法错误：这里需要一个取值，见到换行
咕：咕嘎嘎！ 嘎嘎咕嘎嘎？       → 5:5  E4006 对象（嘎嘎咕嘎嘎）不能输出
```

One more easy trip-up: writing a statement directly on the first line of the file (with no entry) gives you `1:1 E2001 语法错误：顶层只允许 咕咕！ 类 或 咕咕嘎嘎！ 入口，见到“咕”`.

How `check` and `run` divide the work: `check` only does tokenizer / parser / static checks (duplicate entries, inheritance cycles and the like); undefined names, type errors, division by zero and printing objects only surface under `run`.

---

## 6. Using the translator `ggt`

```bash
node translator/bin/ggt.ts decode [--plan 文件] [--int64|--bytes|--hex|--bits] [位流文件]
node translator/bin/ggt.ts encode [--int64|--as-literal] [--ja|--en] [文本文件]
```

Width conventions (the same as on the language side): integers are 64-bit two's complement · booleans 8 bits · bit strings as-is · text as UTF-8, 8 bits per byte.

On the input side all three dialects mix freely: `ggt decode` accepts `咕嘎…` as well as `グガ…` and `GUGA…`. On the output side it still writes Chinese by default; for another language add `--ja` (`グ`/`ガ`) or `--en` (`GU`/`GA`, doubling the length), and only one of the two may be chosen. `--diag` is the exception: diagnostic frames always use Chinese bit names.

| Mode | Output |
| --- | --- |
| `--int64` | One decimal integer per 64 bits, one per line |
| `--bytes` | Strict UTF-8 decoding into text, no trailing newline added |
| `--hex` | One line per 16 bytes, with a printable-ASCII column |
| `--bits` | Groups of 8 bits, separated by spaces |
| `--plan file` | Decode exactly by a slot table (required when the bit stream is not self-describing) |
| none given | Guess `--int64` for a multiple of 64, otherwise `--bytes` for a multiple of 8, otherwise `--bits` |

A plan file is host-layer ASCII text (it is the translator's own configuration, not the Gugugaga language):

```text
# 注释
int64        # 64 位整数
bytes 3      # 3 个字节
bits 5       # 5 位原样位串
bool         # 8 位布尔
```

`examples/咕嘎嘎咕.咕咕` prints two 64-bit integers, so we use `plans/咕嘎嘎咕.plan` (two lines of `int64`):

```bash
printf 35 | ./bin/gg.ts examples/咕嘎嘎咕.咕咕 | node translator/bin/ggt.ts decode --plan translator/plans/咕嘎嘎咕.plan
# 104
# -2
```

Exit codes: `0` success · `1` input or decoding error · `2` usage error · `3` plan file error.

---

## 7. What to do when names run out

A name may only consist of 咕/嘎 and may not equal a reserved word, so short names are basically all taken:

| Name length | Available | Examples |
| --- | --- | --- |
| 1 | 1 | `嘎` |
| 2 | 0 | None |
| 3 | 2 | `嘎咕咕` `嘎咕嘎` |
| 4 | 9 | `咕咕咕嘎` `咕嘎嘎嘎` `嘎咕咕咕` `嘎咕咕嘎` `嘎咕嘎咕` `嘎咕嘎嘎` `嘎嘎咕咕` `嘎嘎咕嘎` `嘎嘎嘎咕` |
| 5 | 31 | |
| 6 | 63 | |
| 7 | 127 | |

Practical advice: use `嘎`, `嘎咕咕`, `嘎咕嘎` for small temporary variables; pick class and method names from length 4 and up, and register them in `docs/名字对照表.md` so that neither you nor anyone else is left guessing.

---

## 8. Ten common traps

1. Only `咕` `嘎` `！` `？` `：`, half-width spaces, newlines and indentation; letters, digits and punctuation are all E1001.
2. No comments, no string type, no arrays, no floating point, no negative literals (use `咕咕嘎咕？` to negate).
3. Every operator is prefix and precedence comes from nesting: `咕？ a 咕嘎？ b c` = a + (b×c).
4. A trailing `！` marks a declaration or an action, a trailing `？` marks a value word, and a bare word is a statement — the three cannot swap places.
5. You can only print integers / bit strings / booleans; an object or null → E4006.
6. There must be exactly one entry, `咕咕嘎嘎！`.
7. `And` and `Or` **do not short-circuit**; both sides are evaluated.
8. Boolean output is 8 bits (true = 8 `嘎`), not 1 bit.
9. `Read` takes one byte at a time, and EOF gives null; with no pipe stdin is empty, which is why `咕嘎嘎咕.咕咕` reports E4004.
10. The static check cannot catch undefined names, type errors or division by zero; those need a real run.

---

## 9. Writing it in VS Code

The command line is enough, but once you really write a few dozen lines, an editor is more comfortable. The repository ships a ready-made extension:

```bash
code --install-extension vscode/gugugaga-language.vsix      # 在仓库根执行
```

You can also open the Extensions view in VS Code, click `...` → **Install from VSIX**, and pick that file. Once it is installed, open any `.咕咕` file and the language mode in the status bar turns into “咕咕嘎嘎语” (the Gugugaga language).

You get six things right away:

1. **Colour**: all 30 reserved tokens, integer and bit string literals, class/method/variable names, `！？` and `：` are coloured. The `嘎嘎嘎？` inside a bit string is not mistaken for an integer literal.
2. **Completion**: at the top level it offers class heads and entry heads, inside a class body fields and methods, and in statement position the statement starters; after `咕：` or `嘎嘎：` it offers expressions only; after `！？` it offers only method names already defined in the current file.
3. **Hover**: rest the mouse on a token and it shows its Chinese meaning, which family it belongs to, and how to use it.
4. **Snippets**: 8 skeletons (class, constructor, method, entry, field, condition, loop, new-expression), with placeholders you jump through with Tab.
5. **Diagnostics**: when you open, save, or stop typing for 350ms, the extension runs `咕咕嘎嘎 嘎嘎` once in the background, decodes the 咕/嘎 diagnostic frames on stderr back into line numbers and error codes, and turns them into squiggles and Problems entries. They come from the real interpreter, so **the codes and descriptions are exactly what you get by decoding frames in a terminal** (the description shown in the panel is the decoded human text, verbatim); `E4xx` only appears on a real run, never in the editor.

Diagnostics need a reachable command, and the extension looks for one with a three-level fallback: the `gugugaga.cliPath` setting → the workspace's `bin/gg.ts` → `咕咕嘎嘎`/`ググガガ`/`gggg`/`gg` on PATH. If you never see an error and never see diagnostics either, press `⌘⇧P` and run **“咕咕嘎嘎语：显示输出面板”** (Show Output Panel); it prints which command was actually used this time and why it failed. The other command is **“咕咕嘎嘎语：检查当前文件”** (Check Current File) — check right away instead of waiting for the debounce.

6. **Run**: the ▶ in the title bar (and the context menu) sends `咕咕嘎嘎 <file>` into the integrated terminal, saving a dirty document first and reusing the terminal — the same feel as `python x.py`. It **does not take over the output** (the bit stream still goes to the terminal, handy for feeding straight into `ggt decode`), and it **is not an LSP** (no go-to-definition, no rename, no cross-file semantics). The extension's own documentation is in `vscode/gugugaga/README.md`; the repository-side structure and re-packaging are in `vscode/README.md`.

---

## 10. One-screen cheat sheet

```bash
# 跑
咕咕嘎嘎 程序.咕咕                        # 执行（后缀 .咕咕/.ググ/.gu/.gugugaga；ググガガ、gggg、gg 是别名）
# 查语法
咕咕嘎嘎 嘎嘎 程序.咕咕
# 看人话
咕咕嘎嘎 程序.咕咕 | ggt decode --int64
咕咕嘎嘎 程序.咕咕 | ggt decode --bytes
# 看诊断（报错也是位流）
咕咕嘎嘎 程序.咕咕 2> /tmp/咕 || ggt decode --diag /tmp/咕
# 写人话
printf 嗨 | ggt encode --as-literal
printf 嗨 | ggt encode --ja --as-literal   # 输出日语位串
咕咕嘎嘎！ ガグGA咕                       # 入口名混写：ガグGA咕 = 10010
    咕：ガガ嘎？グ嘎                       # 打印 1（前缀 111 + 位 01）
# 没装命令时的等价写法
./bin/gg.ts 程序.咕咕 | node translator/bin/ggt.ts decode --bytes
# 编辑器
code --install-extension vscode/gugugaga-language.vsix
```

```text
程序骨架：
咕咕嘎嘎！ 入口名
    <语句>
    <语句>

类骨架：
咕咕！ 类名：
    咕咕！？ 字段名：初值
    咕咕嘎！ 类名：参数            ← 构造器
        <语句>
    咕咕嘎！ 方法名：参数
        <语句>
        嘎嘎：返回值
```
