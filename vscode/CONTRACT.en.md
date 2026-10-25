<!-- i18n:begin -->
[中文](CONTRACT.md) | **English** | [日本語](CONTRACT.ja.md)

> This is an English translation. The Chinese [CONTRACT.md](CONTRACT.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugugaga language (Chinese: 咕咕嘎嘎语) VS Code Extension · Implementation Contract (v1, frozen)

> This file is the single source of contract for the three parallel executors. When it conflicts with `SPEC.md`, `SPEC.md` wins; when it conflicts with the facts, check `src/keywords.ts` first.

## 0. Goals and non-goals

**Goals**: one extension, `vscode/gugugaga/`, that installs into VS Code and provides

1. Suffix detection: a `.咕咕` file opens as this language (language id `gugugaga`), and brackets / indentation / folding all work off the indentation.
2. Keyword colouring: TextMate grammar `source.gugugaga`, covering all 30 reserved tokens plus literals, names and punctuation.
3. Completion: by context (top level / class body / method body / expression position / call position) it offers reserved words, skeleton snippets and the names already defined in this document.
4. Static checking: it calls the **real** interpreter to do `check` and parses `<file>:<line>:<column>: <code> <message>` into VS Code diagnostics.
5. Hover: resting the mouse on a token shows its Chinese gloss; snippets hand you the skeleton.

**Non-goals**: no LSP server, no semantic highlighting / rename / go-to-definition, no bundling a TypeScript compiler, no new npm dependencies, no network.

## 1. Directories and ownership (who writes which files)

```text
vscode/gugugaga/
  package.json                 ← T7（扩展清单）
  language-configuration.json  ← T5
  syntaxes/gugugaga.tmLanguage.json ← T5
  snippets/gugugaga.json       ← T5
  src/keywords.js              ← T6（保留词表，唯一 JS 真源）
  src/completion.js            ← T6
  src/hover.js                 ← T6
  src/cli.js                   ← T7
  src/diagnostics.js           ← T7
  src/extension.js             ← T7
  tests/*.test.js              ← 各自负责自己模块的测试
  README.md                    ← T7
  .vscodeignore                ← T7
```

- Everyone writes only the files listed on their own lines; **do not** touch other directories in the repo (`src/`, `tests/`, `examples/`, `SPEC.md`, and so on).
- Packaging `.vsix` is the lead's job; executors must not zip it themselves.

## 2. Identifiers

| Item | Value |
| --- | --- |
| Extension id | `gugugaga.gugugaga-language` (publisher `gugugaga`, name `gugugaga-language`) |
| Language id | `gugugaga` |
| Suffix | `.咕咕` |
| TextMate scopeName | `source.gugugaga` |
| Diagnostic collection name | `gugugaga` |
| Commands | `gugugaga.checkFile`, `gugugaga.showOutput` |
| Configuration prefix | `gugugaga.` |

## 3. Authoritative reserved-word table (copied out of `src/keywords.ts`, 30 entries / 29 word forms)

| Word form | Family | Internal name | Meaning |
| --- | --- | --- | --- |
| 咕 | BARE | Print | Print: `咕：<表达式>` |
| 嘎嘎 | BARE | Return | Return: `嘎嘎：<表达式>`, or a bare `嘎嘎` |
| 嘎嘎嘎 | BARE | If | Condition: `嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎 | BARE | Else | Otherwise (no colon, no expression) |
| 嘎嘎嘎嘎嘎 | BARE | While | Loop: `嘎嘎嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎嘎嘎 | BARE | This | Self (available only in instance methods and constructors) |
| 嘎嘎嘎嘎嘎嘎嘎 | BARE | ReadByte | Read one byte (UTF-8 byte stream; EOF is empty) |
| 咕咕 | DECL | Class | Class header: `咕咕！ <类名>：` |
| 咕咕嘎 | DECL | Method | Method header: `咕咕嘎！ <方法名>：<参数名>` (a same-named method in a new class is the constructor) |
| 咕咕嘎嘎 | DECL | Entry | Entry-point header: `咕咕嘎嘎！ <入口名>` |
| 咕嘎嘎 | DECL | New | New: `咕嘎嘎！ <类名>？ <实参>…` |
| 咕咕 | ACT | Bind | Binding / field: `咕咕！？ <名字>：<初值>` |
| 咕嘎 | ACT | ExprStmt | Expression statement: `咕嘎 <表达式>` |
| 咕？ | VAL | Add | Add (binary, prefix) |
| 咕咕？ | VAL | Sub | Subtract (binary) |
| 咕嘎？ | VAL | Mul | Multiply (binary) |
| 咕咕咕？ | VAL | Div | Divide (binary; division by zero is E4005) |
| 咕咕嘎？ | VAL | Mod | Modulo (binary) |
| 咕嘎咕？ | VAL | Eq | Equal (binary; always false across types) |
| 咕嘎嘎？ | VAL | Lt | Less than (binary) |
| 咕嘎嘎咕？ | VAL | Gt | Greater than (binary) |
| 咕嘎咕咕？ | VAL | And | And (binary, no short-circuit) |
| 咕嘎咕嘎？ | VAL | Or | Or (binary, no short-circuit) |
| 咕咕咕咕？ | VAL | Not | Not (unary) |
| 咕咕嘎咕？ | VAL | Neg | Negate (unary) |
| 嘎嘎嘎？ | VAL | IntLit | Integer literal: `嘎嘎嘎？<位串>` (unsigned binary, no minus sign) |
| 嘎嘎嘎嘎？ | VAL | BitsLit | Bit-string literal: `嘎嘎嘎嘎？<位串>` (any length) |
| 嘎嘎？ | VAL | True | True (prints 8 嘎) |
| 嘎嘎咕？ | VAL | False | False (prints 8 咕) |
| 嘎咕？ | VAL | Null | Empty |

Supporting facts (handy when writing completion or hover):

- Declaration suffix `！` (`咕咕！`, `咕咕嘎！`, `咕咕嘎嘎！`, `咕嘎嘎！`); value suffix `？`; lead-in `：`; call suffix `！？` (`<接收者>！？ <方法名>`).
- The `：` at the end of a line may be omitted when only spaces follow it (`咕咕！ 名字` is the same as `咕咕！ 名字：`).
- A name may only use 咕/嘎, and may not equal any reserved word form. Available name lengths: 1 bit, 1 name (嘎); 2 bits, 0 names; 3 bits, 2 names (嘎咕咕 嘎咕嘎); 4 bits, 9 names. **Examples and tests use these 4 safe names throughout: `嘎咕咕`, `嘎咕嘎`, `嘎咕嘎嘎`, `嘎嘎咕咕`.**
- Comments: none. Apart from a first-line shebang (preprocessed by the CLI), any character in the source other than 咕/嘎/！/？/：/space/newline is E1001.
- Output is always a bare bit stream (咕=0 嘎=1); there are no strings or arrays.

## 4. Module APIs (all CommonJS: `module.exports`, no ESM `import/export`, no "type": "module")

Tests use `node --test` (CJS `.js`), run as: `cd vscode/gugugaga && node --test "tests/*.test.js"`. Tests **never require vscode**.

### 4.1 `src/keywords.js` (T6)

```js
module.exports = {
  RESERVED,             // Array<{text, family, name, desc, docs, snippet?}>：30 条，同前缀长度降序（咕嘎嘎咕？ 在 咕嘎嘎？ 之前）
  BY_TEXT,              // {[text]: entry}；`咕咕` 取 DECL(Class) 那条
  isReserved(text),     // boolean
  entriesOf(family),    // family: "BARE"|"DECL"|"ACT"|"VAL"
  describe(text),       // entry | null
  STATEMENT_STARTERS,   // Array<{text, label?, desc}>：语句位能开头的（咕 / 咕：/ 咕咕！？ / 咕嘎 / 嘎嘎 / 嘎嘎嘎 / 嘎嘎嘎嘎 / 嘎嘎嘎嘎嘎 / 咕嘎……）
  EXPRESSION_STARTERS,  // Array<...>：表达式位能开头的（咕？/咕咕？/…/嘎嘎嘎？/嘎嘎嘎嘎？/嘎嘎？/嘎嘎咕？/嘎咕？/嘎嘎嘎嘎嘎嘎/嘎嘎嘎嘎嘎嘎嘎/咕嘎嘎！/名字）
}
```

- `RESERVED` must match the table above entry by entry (text, family, internal name); `desc` is one Chinese sentence; `docs` may hold usage examples (single-line markdown).

### 4.2 `src/completion.js` (T6)

```js
module.exports = { contextAt, completionsAt, collectNames }
// contextAt(text, offset) → { kind, indent, lineText, lineStart, prefix, inClass, inMethod }
//   kind ∈ "top" | "class" | "statement" | "expression" | "call"
// completionsAt(text, offset) → Array<{label, kind, detail, documentation, insertText, insertTextFormat}>
//   kind ∈ "keyword" | "snippet" | "name" | "class" | "method" | "field" | "operator"
// collectNames(text) → { classes: string[], methods: string[], fields: string[] }（正则扫描，用于补全/悬停）
```

Context resolution (must be implemented exactly like this; the tests cover it rule by rule):

1. `prefix` = the text on the current line from the start of the line to `offset`; `indent` = the number of leading spaces on that line.
2. `prefix` is all spaces (blank line, or just indented): walk up to the nearest non-blank line `head`; if `head` ends with `：` or with the omitted form of `：`, this line belongs to the block of `head`.
   - `indent === 0` → `kind = "top"` (only `咕咕！` and `咕咕嘎嘎！`).
   - `head` is a class header (`咕咕！`) and `indent > 0` → `kind = "class"` (`咕咕！？`, `咕咕嘎！`).
   - every other indented line → `kind = "statement"`.
3. `prefix` ends exactly with `咕：`, or the offset sits after a line-opening `咕：`/`嘎嘎：`/`嘎嘎嘎：`/`嘎嘎嘎嘎嘎：`/`嘎嘎：` → `kind = "expression"` (only expression starters plus names).
4. `prefix` ends with `！？` → `kind = "call"` (method names from this document, plus 3 common names? — method names only is enough).
5. any other non-blank `prefix` → `kind = "statement"`.

Invariants (**tests are mandatory**):

- Every returned `label` is made only of 咕 / 嘎 / ！ / ？ / ： / space (that is, at most 6 kinds of symbol, no letters, digits or newlines).
- An entry with `insertTextFormat: 2` (snippet) must, once the `$1`/`${1:...}` placeholders are stripped from its `insertText`, still contain only those 6 symbols.
- `kind` stays in range; no duplicate `label` inside one context.

### 4.3 `src/hover.js` (T6)

```js
module.exports = { hoverAt }
// hoverAt(text, offset) → { contents: string[], range: { start, end } } | null
//   contents 是 markdown 行（中文）；range 是 0-based 字符偏移
```

Rules: take the longest reserved token at `offset` (including a trailing `！`/`？`; for example `咕嘎嘎咕？` must not be matched as just `咕嘎嘎？`); otherwise take the name at that offset (a `collectNames` hit → class/method/field); if neither, `null`. The contents must include at least: the token itself, its family, its meaning, and one sentence on how it is used in SPEC.

### 4.4 `src/cli.js` (T7)

```js
module.exports = { resolveCommand, parseDiagnostics, runCheck }
// resolveCommand({ config, workspaceRoot }) → { exec, args, source }   // source ∈ "setting" | "repo" | "path"
// parseDiagnostics(stderr, filePath) → Array<{ line, column, code, message, sourceLine }>  // line/column 1-based
// runCheck({ exec, args, cwd, timeoutMs }) → Promise<{ code, stdout, stderr }>
```

Order of `resolveCommand`:

1. The `gugugaga.cliPath` setting (default "gggg"): if it is not the default value and is a path that exists, absolute or relative → `{exec: cliPath, args: ["check", file], source: "setting"}` (if that file ends with `.ts`, exec becomes the configured `gugugaga.nodePath`, default `node`, and the path is inserted at the front of args).
2. Otherwise, if `<workspaceRoot>/bin/gg.ts` exists → `{exec: nodePath, args: [<bin/gg.ts>, "check", file], source: "repo"}`.
3. Otherwise `{exec: "gggg", args: ["check", file], source: "path"}`.

`parseDiagnostics` must swallow these two **real** outputs (trailing newline and indentation kept as-is):

```text
/tmp/坏1.咕咕:2:7: E1001 非法字符“噶”（U+5676）
      咕：【噶】
```

```text
/tmp/坏2.咕咕:2:15: E2001 语法错误：这里需要一个取值，见到换行
      咕：咕？ 嘎嘎嘎？咕
```

As well as the following, which it must **ignore**: `无法读取文件 /tmp/不存在.咕咕：ENOENT: ...` (lines with no `行:列:`), blank lines, and the `【】` marker line itself (`sourceLine` may take the marked line with the leading indentation and the 【】 stripped, or keep it as-is — just say which you chose).

### 4.5 `src/diagnostics.js` (T7)

```js
module.exports = { collect }
// collect({ filePath, resolved, timeoutMs = 15000 }) → Promise<Array<{ line, column, code, message, sourceLine }>>
// 内部：runCheck(resolved) → parseDiagnostics(stderr)；CLI 超时/启动失败 → 返回 [] 并附 {error} 由调用方决定是否提示
```

The extension layer sets every diagnostic severity to Error; `E1xx/E2xx/E3xx` and `E4xx` are all errors (`check` does not run the program, so in practice only E1/E2/E3 appear).

### 4.6 `src/extension.js` (T7)

- `activate(context)`: registers `DiagnosticCollection("gugugaga")`, a `CompletionItemProvider` (trigger characters `咕`,`嘎`,`！`,`？`,`：`,` `), a `HoverProvider`, and the commands `gugugaga.checkFile` (check the current document right away) and `gugugaga.showOutput` (the output channel).
- Document changes are debounced by 350ms; `onDidOpenTextDocument` / `onDidChangeTextDocument` / `onDidSaveTextDocument` all trigger; closing a document `delete`s its diagnostics.
- Applies only to `languageId === "gugugaga"`; it finds the file path itself (`document.uri.fsPath`) and `workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath`.
- Any exception goes to the output channel through `console.error`; no popups that interrupt.
- The file must **pass `node --check`** (even though it cannot require vscode).

## 5. TextMate grammar contract (T5)

File `syntaxes/gugugaga.tmLanguage.json`: `{ "scopeName": "source.gugugaga", "patterns": [ ... ] }`.

**Hard constraints (each one is verified by a test):**

1. `patterns` is a **flat array**; each entry may only be `{ "match": "...", "name": "..." }`, optionally with `"captures": {"1": {"name": "..."}}`. `begin`/`end`/`include`/`repository`/`while` are **forbidden**.
2. Every `match` must compile under `new RegExp(pattern)` (JS-supported syntax only; no `(?<=)`, `\b`, `\G`).
3. Order is priority: at one position the first hit wins. A long token comes before its prefixes (`咕嘎嘎咕？` before `咕嘎嘎？`; `嘎嘎嘎嘎？` before `嘎嘎嘎？`; `咕咕嘎嘎！` before `咕咕嘎！` and that before `咕咕！`).
4. The `name` of every rule must be one of the scopes below (no inventing your own):

```text
keyword.control.flow.gugugaga        嘎嘎 / 嘎嘎嘎 / 嘎嘎嘎嘎 / 嘎嘎嘎嘎嘎
keyword.declaration.class.gugugaga   咕咕！
keyword.declaration.method.gugugaga  咕咕嘎！
keyword.declaration.entry.gugugaga   咕咕嘎嘎！
keyword.declaration.bind.gugugaga    咕咕！？
keyword.other.gugugaga               咕 / 咕嘎（表达式语句）
keyword.other.this.gugugaga          嘎嘎嘎嘎嘎嘎
keyword.other.read.gugugaga          嘎嘎嘎嘎嘎嘎嘎
keyword.operator.new.gugugaga        咕嘎嘎！
keyword.operator.call.gugugaga       ！？
keyword.operator.arithmetic.gugugaga 咕？ 咕咕？ 咕嘎？ 咕咕咕？ 咕咕嘎？
keyword.operator.comparison.gugugaga 咕嘎咕？ 咕嘎嘎？ 咕嘎嘎咕？
keyword.operator.logical.gugugaga    咕嘎咕咕？ 咕嘎咕嘎？ 咕咕咕咕？
keyword.operator.unary.gugugaga      咕咕嘎咕？
constant.numeric.integer.gugugaga    嘎嘎嘎？ + 后面的位串
constant.numeric.bits.gugugaga       嘎嘎嘎嘎？ + 后面的位串
constant.language.boolean.gugugaga   嘎嘎？ 嘎嘎咕？
constant.language.null.gugugaga      嘎咕？
entity.name.class.gugugaga           类名（咕咕！ 之后 / 咕嘎嘎！ 之后）
entity.name.function.gugugaga        方法名（咕咕嘎！ 之后 / ！？ 之后）
variable.other.gugugaga              其它 [咕嘎]+ 名字
punctuation.separator.colon.gugugaga ：
punctuation.section.indent.gugugaga  行首缩进（可选，不要也行）
```

5. Highlighting must cover every line of the five files in `examples/`: at the very least, each line's reserved tokens get hit (self-check with the little driver below).

`tests/grammar.test.js` must implement a ~40-line **mini driver**: for one line of text, walk `patterns` in order with global regexes and find the **leftmost-longest** match (same start position → whichever came first), producing `[{start, end, name}]`, with overlapping regions going to whoever arrives first; then assert the scopes at some specific positions and ranges, for example:

```text
咕咕嘎嘎！ 嘎咕嘎嘎嘎咕   → 0..4 keyword.declaration.entry.gugugaga；5..12 entity.name.class?（入口名用 entity.name.function 也可，写清你的选择）
    咕：咕？ 嘎嘎嘎嘎？嘎嘎嘎咕咕嘎咕嘎 嘎嘎嘎嘎？嘎咕咕嘎咕嘎嘎嘎  → 咕： 关键字+标点；咕？ 算术；嘎嘎嘎嘎？ 位串字面量；其后的 咕嘎 串必须被 constant.numeric.bits 覆盖
```

Also: `language-configuration.json` uses `"folding": {"offSide": true}` (indentation folding), `"indentationRules": {"increaseIndentPattern": "：\\s*$", "decreaseIndentPattern": "^\\s*(嘎嘎|嘎嘎嘎嘎|嘎嘎嘎嘎嘎嘎)"}`, `"comments": {}` (there is no comment syntax; **do not** write lineComment/blockComment), and `"wordPattern": "[咕嘎！？：]+"`.

`snippets/gugugaga.json` needs at least 5 entries: a class skeleton `咕咕！ ${1:嘎咕咕}：`, a method skeleton, an entry-point skeleton, a `咕咕！？` field, a `嘎嘎嘎：` conditional block, a `嘎嘎嘎嘎嘎：` loop and a `咕：` print. Placeholders inside a snippet body may only use the `${n:嘎咕咕}` form (the placeholder text must be a legal name).

## 6. Tests and acceptance

- Each executor contributes at least 15 `node:test` assertions (55 in total or more); all offline, zero dependencies, never requiring vscode.
- Extra requirement for T5: **an expanded snippet must actually run** — replace each snippet's placeholders with the 4 safe names from §3, write a temporary file, and use `node bin/gg.ts check <文件>` to verify exit code 0 (this test is the hard evidence in your delivery).
- Extra requirement for T7: use the **real** CLI to build a failing file and verify that `parseDiagnostics` + `collect` end-to-end produce `E1001`, with line and column `2:7`.
- The full test command: `cd vscode/gugugaga && node --test "tests/*.test.js"`.
- The delivery report must state: the files you wrote with their line counts, the number of tests and how many pass, the commands you actually ran with snippets of their output, and the parts you did **not** verify (say so honestly).

## 7. Revision log (deviations settled during implementation; all of them landed and are pinned by tests)

The contract was written first. Three places had to change their wording during implementation, two more are cases where an executor made a better choice, and one is a type-contract hole caught during integration. They are written down one by one so that nobody reviews the code against the old contract later.

1. **The gutter on the second diagnostic line is 2 spaces**, not 4. See `return head + "\n  " + markColumn(line, err.pos.col)` at `src/errors.ts:73`; `sourceLine` keeps the language source's own indentation and strips the 【】 markers, and the editor side uses it directly to display the diagnostic line.
2. **`collect()` returns `{issues, error}`, not a plain array.** A plain array cannot express non-diagnostic reasons such as "the CLI will not start / it timed out / the command was not found", so there is an extra `error` field (`null` on success).
3. **`resolveCommand({config, workspaceRoot, file})` takes one more argument, `file`.** The three-level fallback finally has to assemble the full `check <文件>` args, which cannot be built from the workspace root alone; the returned `source` is `"setting"|"repo"|"path"`, so the output panel can show where the fallback landed.
4. **`TOKEN_INDEX` in `keywords.js` is a superset**: besides the 30 reserved tokens of §3 it also registers "stem + ！", "stem + ！？" and full source spellings such as `咕：`, so `isReserved("咕：") === true`. `RESERVED` is still exactly 30 entries and `text` must equal the §3 table verbatim. Reason: completion and hover look things up by source spelling, while the VAL keys in `src/keywords.ts` are **stems without `？`** (21 real unique keys), and the tokenizer appends `？` afterwards.
5. **The completion `kind` must be a `vscode.CompletionItemKind` number; the extension layer must not map strings.** `completion.js` and `extension.js` originally each had their own version (one returned numbers, the other switched on the string `"snippet"`), and together they all landed on the `Variable` icon. The fix is to pass it straight through with `new vscode.CompletionItem(item.label, item.kind)` and to pin it down with static assertions in `tests/manifest.test.js` (the source must not contain `completionKind(` or `case "snippet"`). Lesson: an "enum vs string" contract that crosses modules has to be written into the contract itself, otherwise each executor is right on its own and the two together are wrong.
6. **Every grammar rule carries a left-boundary capture group** (`(^| +)` / `(^| +|：)`, with group 1 coloured as `punctuation.separator.colon`). The contract did not say this, but TextMate forbids lookbehind, so without anchoring the rules are bound to misfire. 4 extra "name guard" rules with a negative lookahead go with it (excluding the 12 operator stems, `嘎嘎嘎嘎`/`嘎嘎嘎`/`嘎嘎咕`, and `嘎咕`), otherwise the `嘎` of `咕嘎！？` gets eaten by the name rule and `咕咕？` gets read as a subtraction inside a value name.

### Second revision (after the pure-shell rebuild)

Once the interpreter moved all of stderr onto the GGDIAG v1 bit stream (`SPEC.md` §12), the premise "a diagnostic is two lines of text" was void across the board. The following six entries replace the corresponding old clauses:

7. **The diagnostic source changed from text to frames.** `src/diagnostics.js` ships its own zero-dependency decoder: header 6 bits = magic `1010` plus version `00`, code 8, line 16, col 16, mlen 16, msg = mlen×8 (byte by byte, MSB first → `Buffer.toString("utf8")`), end 3 = `110`. When the header does not match, shift forward 1 bit and keep looking; when the header matches but the tail is wrong or the bits run out, shift forward 6 bits and rescan. The old semantics of `parseDiagnostics(text)` in §4.4 (grabbing `<文件>:<行>:<列>: …`) are void; the `{issues, error}` shape of `collect()` stays. Revision 1 (the 2-space gutter) retires with it.
8. **`issues` only holds codes 1–21** (`E1001`…`E4012`, with no `E4009`); each element is `{line, column, code, message, detail}` (revision 14 changed `message` into the bit string), and there is no `sourceLine` any more. Code 22 (help) is not a problem; 0/23/24 (usage error / failed to read the file / internal error) become `{issues: [], error: "<外壳码名> <帧正文>"}`.
9. **The PATH fallback of `resolveCommand` is no longer a hardcoded `gggg`**: it probes `咕咕嘎嘎` → `gggg` → `gg` and takes the first one that exists (hand-rolled with zero dependencies, adding `PATHEXT` on Windows), and `source` is still `"setting"|"repo"|"path"`. The test in step one changed from "not equal to the default value" to "not in the set of known command names", so an old setting value of `gggg` still goes down the command-name path.
10. **The action word now uses the canonical spelling `嘎嘎`**, with args `["嘎嘎", 文件]` (`check` is a Latin alias the interpreter keeps; the extension does not use it). The default value of `gugugaga.cliPath` changed to `咕咕嘎嘎`.
11. **Every user-visible string is pure gugugaga**: `displayName`, command titles, output-panel title and content, settings-section titles, snippet `description`s, completion `detail`/`documentation`, hover label and hint. The `uri`, `exec`, `args`, `workspaceRoot` and `err.stack` that used to be concatenated into the output panel all retreat to `console.error`. Own the cost: debugging "why is there no diagnostic" now requires the developer tools.
12. **Structural ASCII stays put**: the extension `name`/`publisher`/`engines.vscode`/`main`/`activationEvents`, `languages[0].id`, `grammars[0].scopeName`, command ids, setting ids and their `type`/`scope`/`minimum`, and the `nodePath` default `node`. They are matching keys of the VS Code schema, not copy. The frame body (`message`) keeps the original human language, because by §12 that is precisely what a frame is.

One more boundary note: clearing the skips touched `tests/diagnostics.test.js` and `tests/manifest.test.js:69`, which were not on the authorised file list — because when "`skipped 0` and `fail 0`" and "change the test, not your mind" both have to hold, those two places must move.

13. **The output panel got a runtime gate.** The review found `extension.js` still writing `result.error` (a Chinese shell code name plus the ASCII path from the frame) into the panel, which contradicted "the panel is pure gugugaga". Now `append()` first goes through `isPureLine()` (only 咕/嘎/！/？/：/space count): impure lines are not written to the panel and do not throw, and the full content goes to `console.error`; the failure path leaves a single pure-gugugaga marker line in the panel. `COLLECTION_NAME` also changed from "gugugaga" to "咕咕嘎嘎" (it shows up in the Problems panel's source column). (The decision about `diagnostic.code` at the end of this entry was overturned by revision 14.) The regression test lives in `tests/purity.test.js` (9 cases, including a mutation check: putting the leak back turns it red).

**Boundary addendum**: this round had two more out-of-scope but necessary touches — `tests/diagnostics.test.js` (un-skipping) and `tests/manifest.test.js:69` (the default-value assertion), for the same reason as above: when "`skipped 0` + `fail 0`" and "change the test, not your mind" both have to hold, they must move.

14. **The Problems panel went pure too.** Until then `diagnostic.message` was the Chinese original of the frame body and `diagnostic.code` was `E1001`, so Chinese and ASCII still leaked onto the user-visible surface. Now:
   - `decodeFrames()` additionally returns `bits` (the raw bit string of that frame, pure 咕/嘎; a new `bitsText()` renders the internal 0/1 bit array back into source spelling);
   - `parseDiagnostics()` sets `message` to the **whole-frame bit string** (hand it to `ggt decode --diag` and it comes back), moves the Chinese original to `detail`, and keeps `code` as the code name but **no longer writes it into the `Diagnostic`**;
   - `extension.js`'s `toDiagnostic()` drops `diagnostic.code = issue.code` and instead sends `code + 位置 + detail` to `console.error`;
   - Regression: `tests/cli.test.js` gains 1 real e2e case (`issues[0].message` fed to `translator/bin/ggt.ts decode --diag`, asserting that `E1001` / `2:7` / Chinese come back), and `tests/purity.test.js` asserts `diags[0].code === undefined` and that `message` passes `isPureLine()`. Extension tests go 127 → 128.
15. **A run button (`gugugaga.run`).** The user asked to "run it right in the editor, like `python x.py`", and chose the **integrated terminal** as the output sink (not the output panel, not a webview). What landed:
   - a new `src/run.js` (it does not `require("vscode")`; vscode is injected by the caller, so it is testable in plain Node): `quoteArg` / `buildCommandLine` / `resolveRun` / `findTerminal` / `runInTerminal` / `runFile`, plus the constants `TERMINAL_NAME = "咕咕嘎嘎"` and the four pure-gugugaga reason strings of `REASON`;
   - `checkArgs(file, action)` in `src/cli.js` takes one more argument, `action`: omitted = `嘎嘎` (check), `null` = **implicit execution** (args are just one file path). `resolveCommand` passes `opts.action` through. This change is needed because running has to be implicit execution, otherwise the terminal runs "a check first" and the program never executes at all.
   - the command `gugugaga.run`, title `咕咕嘎嘎！ 咕咕嘎嘎`, with `icon` pointing at `media/run.svg` (▶, `currentColor` follows the theme; the file name must be ASCII — zip does not write the UTF-8 flag for non-ASCII paths, so unpacking turns it into cp437 mojibake and the icon 404s); three menu entries `editor/title`, `editor/title/run` and `editor/context`, with `when` always `editorLangId == gugugaga`. **No keybinding**: an ASCII chord showing up in the command palette would break the purity of the shell.
   - `runFile` behaviour: language is not `gugugaga` → `REASON.wrongLanguage`; no document → `noEditor`; `uri.scheme !== "file"` → `notFile`; a dirty document gets `await document.save()` first, and if it is still dirty → `saveFailed`. On success it returns `{ok:true, line, source, reused}`, and `extension.js` sends `line` to `console.error` (it contains ASCII, so it only reaches the DevTools), while the panel appends a single pure-gugugaga line `咕咕嘎嘎 咕咕嘎嘎`.
   - terminal: reuse a terminal with `name === "咕咕嘎嘎"` and `!exitStatus`, otherwise create one with `createTerminal({name, cwd})` (cwd = the workspace root, or the file's directory when there is no workspace); then `show(true)` + `sendText(line, true)`.
   - packaging: the `build-vsix.sh` preflight list gains `media/run.svg`, the staging directory gains `media/`, `cp media/*.svg`, and `[Content_Types].xml` gains `svg → image/svg+xml`.
   - tests: `tests/run.test.js` gains 15 cases (quote escaping on both platforms, `buildCommandLine`, the three paths of `resolveRun`, terminal reuse and creation, the four `runFile` boundaries, reason-string purity, and static assertions on the registrations in `extension.js`); `tests/manifest.test.js` goes from two commands to three and gains two cases for menus and icon. Extension tests go 128 → 146.
   - known limitation: the Windows branch (`cmd.exe` quote doubling) is only unit-tested and has never actually run on Windows; the bit stream in the terminal still needs `ggt decode` by hand.

### Fourth revision (multiple dialects)

16. **All three dialects have to be supported like first-class languages.** `SPEC.md` §1 fixed four spellings for each of the two "bits" (咕/グ/ぐ/GU and 嘎/ガ/が/GA), full-width and half-width punctuation as equivalents, and free mixing of spellings inside one file; the editor side follows all of it:
   - **manifest**: `languages[0].extensions` = `[".咕咕", ".ググ", ".gu", ".gugugaga"]` (case-insensitive), and `aliases` gains `ググガガ`; command ids, setting ids and the `cliPath` default `咕咕嘎嘎` stay exactly as they are. `aliases` is a name in the language picker and may use the Japanese spelling; all other user-visible copy is still bound by revisions 11 / 13 / 14 (the panel is pure gugugaga, the diagnostic body is a bit string).
   - **normalisation lives only in `keywords.js`**: new `normalizeWithOffsets()` → `{text, starts, ends}`, `normalizeText()`, `canonicalOffsetOf()`, `sourceStartOf()`, `sourceEndOf()`, `dialectsOf()`. `isReserved` / `describe` / `BY_TEXT` normalise to 咕/嘎 before the lookup (`BY_TEXT` is exported as a Proxy, so a key in any dialect hits the canonical form, while `Object.keys` still returns the 29 canonical keys). Completion and hover work on canonical strings, and when writing editor positions back they use `sourceStartOf/EndOf` to recover the original offsets — an English bit name is 2 characters wide, so offset conversion cannot lean on `+1`.
   - **grammar**: in all 35 rules each bit expands to `(?:咕|グ|ぐ|[Gg][Uu])` / `(?:嘎|ガ|が|[Gg][Aa])`, punctuation is written `[！!]` `[？?]` `[：:]`, and the spaces that live inside a match are widened to `[ 　]`. Every expansion uses a **non-capturing** group, so not one `captures` number changed (group 1 still colours the punctuation, group 2 the name, group 3 the suffix). English `GU`/`GA` are two letters for one token: the repeated group of `((?:…)+)` glues them into a single token instead of splitting them. `tests/grammar.test.js` uses `canonicalMatch()` to collapse the expansions back into the original pre-change pattern, so the 11 ordering assertions that "a long token comes before a short one" still hold.
   - **language-configuration.json**: `wordPattern` recognises 咕/嘎/グ/ガ/ぐ/が, English letters, and full-width and half-width `！？：`; `increaseIndentPattern` accepts both `：` and `:`; `decreaseIndentPattern` uses `(?:嘎|ガ|が|[Gg][Aa]){2}(…){0,2}` to cover 2/4/6-bit trailing words.
   - **CLI probe order**: `咕咕嘎嘎` → `ググガガ` → `gggg` → `gg` (`CLI_CANDIDATES` in `src/cli.js`; the win32 `PATHEXT` branch stays). `src/run.js` reuses `cli.resolveCommand`, so there is no second list to write.
   - **tests**: extension tests go 147 → 160 (`keywords`/`completion`/`hover`/`grammar`/`manifest` each gain dialect cases; the 29 reserved tokens in `grammar` are re-checked one by one under Japanese and English, plus a mixed line, `GU`/`GA` not splitting, half-width punctuation, and full non-space coverage of a sample line in the three dialects). Not one of the 9 panel-purity assertions in `tests/purity.test.js` changed, and they all keep passing: the panel still shows Chinese bit names and does not follow the dialect.
   - **known limitations**: the grammar rules are expanded by character class, so rule lines get longer while the count stays the same (still 35); mixed case inside `GU`/`GA` (`Gu`, `gA`) is accepted by the grammar, but there is no dedicated case for mixing case inside one token.
17. **The black run icon, the decomposed `.ググ` suffix, and the spacing of the Japanese sample** (three issues the user found on a real install). `icon` moves from `media/run.svg` to the codicon `$(play)`: the `currentColor` inside the SVG has no CSS context when VS Code loads it as an `<img>`, so it resolves to black, whereas a codicon is coloured by the theme; the `media/` directory, the svg precheck and `cp` in the packaging script, and the svg line of `[Content_Types].xml` all went away with it. `languages[0].extensions` gains the decomposed spelling of `.ググ` (`ク` and `゛` as two code points): the manifest compares literally, and on macOS a filename may be in decomposed form, so the precomposed entry never matches. A runtime fallback is new in `src/language.js` (pure functions, never `require`s vscode): `isProgramFile()` runs `normalize("NFC").toLowerCase()` before comparing the four suffixes; `adoptDocument()` in `extension.js` is called on activation and from `onDidOpenTextDocument`, and once it recognises the suffix it calls `setTextDocumentLanguage` and then checks once; `activationEvents` gains `onStartupFinished`, so documents already open at a cold start are caught too. The separator spaces in the Japanese sample all became full-width spaces, mirrored in the same code in `SPEC.md` / `SPEC.ja.md` / `SPEC.en.md` / `TUTORIAL.md` / `TUTORIAL.en.md`. Extension tests go 160 → 167 (5 new assertions in `tests/language.test.js`, plus icon, suffix and activation assertions in `manifest`). The `editor/title/run` menu contribution is gone as well: it rendered a second ▶ in the title bar, so one command showed up as two buttons on the same page — only `editor/title` (top right) and `editor/context` (the context menu) remain.

18. **The glyphs of diagnostic frames follow the source file's extension** (a supplement to clause 16 — "the panel still shows Chinese bit names and does not follow the dialect" — not a replacement: only the **glyphs** in stderr frames change; the bit strings inside the panel are still Chinese bit names). On the shell side, `frameBits` / `encodeDiag` in `src/wire.ts` and `frameOfError` in `src/errors.ts` all take a `dialect: Dialect = "zh"` parameter, and `src/cli.ts` passes it via `dialectOfFile(file)`, so `.ググ` writes グ/ガ on stderr and `.gu` writes GU/GA; help frames and command-line usage errors have no concrete program, so they stay Chinese. Three places on the editor side follow:
   - `src/diagnostics.js` (245 → 280): adds `ZERO_CHARS` / `ONE_CHARS`, and `bitsOf()` now scans code point by code point (咕/グ/ぐ→0, 嘎/ガ/が→1; `[Gg][Uu]`→0 and `[Gg][Aa]`→1 consume two code points in one round; every other character is dropped), so frames in all three dialects decode; the semantics of `bitsText` / `decodeFrames` / `parseDiagnostics` / `collect` are unchanged, and the panel `message` is still a **Chinese** bit string (clause 14 is unchanged).
   - `src/extension.js` (403 → 408): only `PURE_LINE` changes — its whitelist widens from 咕/嘎 to `[咕嘎グガぐが！？：!?:\u3000 ]` plus `[Gg][Uu]` / `[Gg][Aa]`. English bit names have to come in pairs, so a lone `G` / `U` / `A` or a mix such as `GUEST` is still judged impure.
   - **Tests**: extension tests go 167 → 173 (`tests/diagnostics.test.js` 211 → 322: a Japanese frame, an uppercase English frame, a three-dialect mixed line, lowercase / mixed case / hiragana, and `collect` end to end on a Japanese frame; `tests/purity.test.js` 624 → 649 adds one three-dialect whitelist case — `"gugugaga"` moves from the reject group to the accept group, because once GU/GA is legal it happens to be a pure bit string).
   - **Known limitations**: if English log text leaks into stderr and happens to contain a `gu`/`ga` letter pair, one extra bit is counted; the GGDIAG magic/version/end triple check is the backstop so nothing throws, but there is no case that constructs that situation on purpose.
