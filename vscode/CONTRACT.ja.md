<!-- i18n:begin -->
[中文](CONTRACT.md) ｜ **日本語** ｜ [English](CONTRACT.en.md)

> 本ファイルは日本語訳です。内容の正本は中国語版 [CONTRACT.md](CONTRACT.md) で、差分があれば中国語版が優先します。
<!-- i18n:end -->

# ググガガガ VS Code グガ · ググガグ（v1）

グガググ `vscode/gugugaga/` グガガガグガグ。グググガガググガグガ、グガググガグガグググガガガガガ、ググガガガググガグガガググググガガガ。グガガグググ [SPEC.md](../SPEC.md) ガググ、グガググガグ VS Code グガガガガガガガグガガグ。

## 1. ググガガガグ

ググガガグググガグガガグガグガガガガグ。

1. **グガガグググ**：`.咕咕` / `.ググ` / `.gu` / `.gugugaga` ガグググググガ（ガガ id `gugugaga`）ググググガ。
2. **ガグ**：TextMate ググ `source.gugugaga` グ 30 グガガガガガググ、ガググガガガググ、ググガガグガグガグガ、ガググ、ガガガググガグ。
3. **ガグ**：ガガグガググ（グググガガグ / ガグググガ / グガガガ / グガガガ / ガガガガグググ）ガグガガ、ガガグ、グガ、ガガガガガガグググググガググググググ。
4. **ググググ**：**グガガ**ガグガガガグガ `嘎嘎` ググガググ、GGDIAG ガガガググガガガガガググガガガガググ。
5. **ガグガ**：グガグググガガグググガガガガグガグガグググググ。
6. **グガ**：ガググググガグ ▶ グ `咕咕嘎嘎 <文件>` ググガググガガガガガガグガ。

**ガググ**：LSP ガガガグガググガグ。ガガグガガグガグガ / ググググ / ガガガガガグガグガグ、TypeScript グググググガガグガグ、npm ガグガガグガガ、ググガガガガググガガグガガガ。**ググガガグガグガグガガグガググガグガググ**——グググガグググガグググガガガグガググ（`bin/gg.ts` ガ `src/`）ガググ、グガグガガガググガグガグガガグググググガガググググガグガガ。

## 2. ガグガガガガガガガググググガグ

| グガ | ガグ |
| --- | --- |
| `package.json` | ガガグガガグググ：ガガ、ググ、ググガグガ、ググガガ、ガガグガ、ガガ |
| `language-configuration.json` | ガガガガガ、ガググググ、ガグガガ |
| `syntaxes/gugugaga.tmLanguage.json` | 35 グガガガガガグ `match` ググ |
| `snippets/gugugaga.json` | 8 グガガググガグググ |
| `src/keywords.js` | ググガガガグガガガグガグ、JS ガガガグガググ |
| `src/completion.js` | ガグググググガガガググガグ |
| `src/hover.js` | ガガググガガグガグガ |
| `src/cli.js` | ガググガガガガグググ、PATH グガ、`execFile` ググガ |
| `src/diagnostics.js` | GGDIAG ガグガガグガグググググガグググ |
| `src/extension.js` | ガグガ、ググガガガ、ググガガ、ガググガガガ、ガガググガガ |
| `src/language.js` | グガガグググ（NFC グガグ、ググガグググガ） |
| `src/run.js` | グガググガ：ガグガグググググガガググガガガガググガグガグ |
| `tests/*.test.js` | ググググガガガグガ。`require("vscode")` ググググガ |
| `README.md` | ガガググガグガガグガグ |

ガグガググガグガガガグ：`extension.js` → `diagnostics.js` / `run.js` / ガグガグガグググ → `cli.js` → `language.js`。ガググガガグググガグガガ。グガガグガ `extension.js` グググ `require("vscode")` ガガガ、ガグガグガググガガグ Node ガグガガガガググガガ。`cli.js` ガ `diagnostics.js` ガガグググガグガガガガグガガガガググ、ガガガガググガグガグガガガ require グググググ `exports` グガガグガガガガガガグググ。

## 3. グググ

| ググ | グ |
| --- | --- |
| グガガグ id | `gugugaga.gugugaga-language`（publisher `gugugaga`、name `gugugaga-language`） |
| ガガ id | `gugugaga` |
| ガグググガガグ | `.咕咕`、`.ググ`（ガグガガガグガググガ）、`.gu`、`.gugugaga` |
| TextMate scopeName | `source.gugugaga` |
| グガガグググガガガ | `咕咕嘎嘎` |
| ググガガ | `gugugaga.run`、`gugugaga.checkFile`、`gugugaga.showOutput` |
| ガガグガガガ | `gugugaga.` |

グガググガグガガグググググガガグガグガグガガガグガ、macOS グガガグガガガガグガガ**ガグ**ガガガガグ（ガ = グ U+30AF + グ U+3099）ガガガガガガ、ガガガガグガグガガググガ ガ（U+30B0）ガガグガグガガガガガガ。ガググ `src/language.js` グ NFC ガググガグガググガガグガググガガ、グガググガ `setTextDocumentLanguage` ガググガグググ。`.ググ` グガガググググガガグガグガグググガガググガガガグガググ。

## 4. ガガググガガガ

| ググガガ | グガググ | ガグ |
| --- | --- | --- |
| `gugugaga.run` | `咕咕嘎嘎！ 咕咕嘎嘎` | ガグガグググガガガガググガガガガグガガグガ |
| `gugugaga.checkFile` | `咕咕嘎嘎！ 嘎嘎` | グググガグググガガグガググガガガガ |
| `gugugaga.showOutput` | `咕咕嘎嘎！ 咕：` | グガグガガグガガガ CLI ガガガ stderr グググガ |

| ガガ | ガ | ガガグ | ガグ |
| --- | --- | --- | --- |
| `gugugaga.cliPath` | string | `咕咕嘎嘎` | グガググググガグガグガガグガグガガガググガグ。ガガガ |
| `gugugaga.nodePath` | string | `node` | `.ts` グググガガガ node ガグガガガガガガグガググググガ |
| `gugugaga.checkOnChange` | boolean | `true` | ガガグガガググガグググガガグググググググガググ |
| `gugugaga.debounceMs` | number | `350` | ググガグググガガガググググ（グガグ） |
| `gugugaga.maxSteps` | integer ガガガ null | `null` | グガググググガガグガガガガググ。`null` ガガグガガググ |

ガガググガグググ `editor/title` ガ `editor/context` ガガグガガ、`when` ググガグガ `editorLangId == gugugaga` ググ。ググググガグガググガグググ。

## 5. グガグガガグガガ

30 ググガガググ、29 ググガガグガ。`咕咕` ガガガググガググガググ、ググガ `！` ガ `！？` ガガガガグガ。ガグググガガグググググガグググ、グガガググガガガガググガガガググガググガガ。

| ガ | ガググガ | グガガ | ガガ |
| --- | --- | --- | --- |
| グ | BARE | Print | ググ：`咕：<式>` |
| ググ | BARE | Return | ガガ：`嘎嘎：<式>`。ググ `嘎嘎` ガグググガガガ |
| ガグガ | BARE | If | ガガ：`嘎嘎嘎：<条件>` |
| グガガガ | BARE | Else | ガガグググググ。ガガググガガガガガグガ |
| ググガググ | BARE | While | グガグ：`嘎嘎嘎嘎嘎：<条件>` |
| ググガガググ | BARE | This | ググガグガガグガガ。グググググガガガググガガガグガガグググガ |
| ガグググガガガ | BARE | ReadByte | ググググガガググググ。UTF-8 ガグガグガ、EOF ググ |
| ガグ | DECL | Class | グガググ：`咕咕！ <クラス名>：` |
| グググ | DECL | Method | ガグガガガ：`咕咕嘎！ <メソッド名>：<引数>`。グガグググガグガグガガガガガガガグガ |
| ガググガ | DECL | Entry | ガガグググ：`咕咕嘎嘎！ <エントリ名>` |
| ググガ | DECL | New | ググ：`咕嘎嘎！ <クラス名>？ <実引数>…` |
| ガグ | ACT | Bind | グガグガガググガ：`咕咕！？ <名前>：<初期値>` |
| グガ | ACT | ExprStmt | ググ：`咕嘎 <式>` |
| グ？ | VAL | Add | グガ（ガグ） |
| ガグ？ | VAL | Sub | ガグ（ガグ） |
| グガ？ | VAL | Mul | ガガ（ガグ） |
| グガグ？ | VAL | Div | ガグ（ガグ、グググガグ E4005） |
| グググ？ | VAL | Mod | ググ（ガグ） |
| ガググ？ | VAL | Eq | ガグ（ガグ、ガググググガグガ） |
| ググガ？ | VAL | Lt | ガググ（ガグ） |
| ガグガガ？ | VAL | Gt | ガガガ（ガグ） |
| ガガガグ？ | VAL | And | グガグ（ガグ、グガググググ） |
| ガグガガ？ | VAL | Or | グガガ（ガグ、グガググググ） |
| ググググ？ | VAL | Not | グガ（ググ） |
| ググググ？ | VAL | Neg | グガガガ（ググ） |
| ガグガ？ | VAL | IntLit | グガガガガガ：`嘎嘎嘎？<ビット列>`。ガガガグガガ |
| グガガガ？ | VAL | BitsLit | ガガガグガググガ：`嘎嘎嘎嘎？<ビット列>`。グググガ |
| ググ？ | VAL | True | ガ。グガ 8 ガグガ |
| ガガガ？ | VAL | False | グ。ガガ 8 ガグガ |
| ググ？ | VAL | Null | ガ |

ググガグガガ：

- ググググガガグ `！`（`咕咕！`、`咕咕嘎！`、`咕咕嘎嘎！`、`咕嘎嘎！`）、ガググググガ `？`、ガガガ `：`、ガガガグガガググガ `！？` グ、ガガガガ `<受け手>！？ <メソッド名>` ググ。
- グググ `：` グガガガググググガガガグガググガ：`咕咕！ 名前` ガ `咕咕！ 名前：` グガグガグ。
- グググ グ ガ ガ グググガガ、グググガガグガガグガガググググ。ググガグガグ 1 ガグガ 1 ガ（ガ）、2 ガグガ 0 ガ、3 ガグガ 2 ガ（`嘎咕咕`、`嘎咕嘎`）、4 ガグガ 9 ガガグ。グガガガガグググガガググガガグ `嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕` ガググガグ。
- ガガグググガググガグググ。ガグガグ shebang（CLI ガガググ）ガガガ、グ/ガ/！/？/：/グガ/グガ グガガグググガグガガ E1001 ググ。
- ググガガグググガグガガ（グ = 0、ガ = 1）グ、ガグガガグググガガガググ。`咕：` ガグガガググガグガグガガグ、ガグガググガガググ。

## 6. グガガグガググググガガガガガ

グガグガガグガガガガガグガグガグガ。ガグガググガガガガガグガググガグガグガガ、ガガガガグガグガグガグガグガググガガガガグ。グガガ CommonJS（`module.exports`）グ、ESM グ `import/export` ガ `"type": "module"` ガガガガググ。

### 6.1 `src/keywords.js`

JS ガグググガガグググ。30 グガガガガガググ、ガグググガ（ガガグ グ/ガ、グガグ ガ/ガ/ガ/グ、ググ GU/GA）グガガガ、ガガガグガグガガググググガガグガググ。ググガグガガガガグガググググ、ガガグガガグガグググ。

```js
module.exports = {
  RESERVED,            // 30 entries, longest spelling first
  BY_TEXT,             // normalized spelling -> entry, 29 canonical spellings
  DIALECTS,
  normalizeText, normalizeWithOffsets, canonicalOffsetOf,
  sourceStartOf, sourceEndOf, dialectsOf,
  WORDS, isReserved, entriesOf, describe,
  STATEMENT_STARTERS, EXPRESSION_STARTERS
}
```

### 6.2 `src/completion.js`

グガガグググガガ（グググガガグ / ガグググガ / グガガガ / グガガガ / ガガガガグググ）ガググガ、グガグガガグガガガグガガガググ。グググガガガググガガグガガガグガググググガガグガガ、ググガググガガググガガガガガ、グガガググガガググガググググググ。ガガガ `sortText` ガググ、ググググググガガグググガググガググ。

```js
module.exports = { contextAt, completionsAt, collectNames }

// contextAt(text, offset)      -> where the caret is, in grammar terms
// completionsAt(opts)          -> candidates for that context
// collectNames(text)           -> names defined in this document
```

### 6.3 `src/hover.js`

ガガガグググガグガガガググガガググガガググ（グガグガガガグガガグガググガ）、グガガガガググガガ。グガガガググググググググググガガグガ、グガググガグガ `null` ググガガガガガグガガググガガガ。

```js
module.exports = { hoverAt }

// hoverAt({ text, offset })    -> MarkdownString | null
```

### 6.4 `src/cli.js`

ガグググググガグガグググガガガグガググググガガ：`gugugaga.cliPath` ガググ → ガググガガガガ `bin/gg.ts`（`gugugaga.nodePath` ガガグ） → `PATH` ガグ `咕咕嘎嘎` / `ググガガ` / `gggg` / `gg`。`runCheck` ガ `execFile` ガググガググガガグガガガ、**グガグ reject ガグググ**。グググガガガガグガグググガガガ `code` / `timedOut` / `error` ガグググガガガ、ガガガグググググガググググググ。ググガガガグガグググ 15 ガ、ググググガガガググガガガグガグ 4 MiB ググ。

```js
module.exports = { resolveCommand, parseDiagnostics, runCheck }

// resolveCommand(opts) -> { exec, args, source }   source: setting | repo | path
// runCheck(opts)       -> Promise<{ code, stdout, stderr, timedOut, error }>
// parseDiagnostics(stderr, filePath) -> { issues, error }
```

### 6.5 `src/diagnostics.js`

CLI グ stderr グガググガグガガググググ。ガグググガグ グ/ガ/ガ/GU グ 0、ガ/ガ/グ/GA グ 1 グググ、ガガグググガガガグガググガガガガ、ガガガグガガ GGDIAG ガググググググガグ。ググググガグガグガガグググググガ——グガガググググググガガグガガガグガガガグガガ。グググ `message` ガガグググガグガグガグガガガググググガグググガ、ガグガガグ CLI ググググガググガグガググググガガガガグ。

```js
module.exports = { collect, parseDiagnostics, decodeFrames, bitsText, codeName, CODE_NAMES }

// decodeFrames(stderr) -> Array<{ code, line, column, message, bits }>
// collect(opts)        -> Promise<Array<{ line, column, code, message, sourceLine }>>
```

### 6.6 `src/extension.js`

グガググガガグガググガググ、ガガガガグガグ（ガガググガ `咕`、`嘎`、`！`、`？`、`：`、グガ）、グガガグガグググ、ググガガグググガガガガガガ。グガガググガ 350 ガグガグガググガガグ、ガガガグガグガグガガガガガガガガガグ、ガガグガガグガグガガグガガグガガ。ガグガガガガグガガグガガグググ、グガガガグググガグググググガグ。

```js
module.exports = { activate, deactivate, isPureLine, append }

// activate(context)   registers the collection, the three providers and the commands
// isPureLine(text)    the purity gate: true when the line holds only bit glyphs
```

### 6.7 `src/language.js`

ガガグググググガガガググググガグガググ。NFC グガガガグガグガガガガグガ `.咕咕`、`.ググ`、`.gu`、`.gugugaga` グガグガググ。グガグガグググガガガググガガグググガグググガグガガガ、ガガガガガグガガガグガガグガグ。

```js
module.exports = { PROGRAM_SUFFIXES, normalizeName, isProgramFile }

// PROGRAM_SUFFIXES      [.咕咕, .ググ, .gu, .gugugaga]
// isProgramFile(name)   NFC normalizes before comparing
```

### 6.8 `src/run.js`

グガグガガググ。`咕咕嘎嘎 <ファイル>` ガガガグガ（ググガグガガガグガガ）、`咕咕嘎嘎` ガガガググググググガグググガググガグ。ググガググガグガググ、ガグググガガグガガグガグガ。ググガグググググガグガググ、stdin グガガグガグガググガガガグガガガガグガグググガグガガグガググググ。グガガグググガガガガ ガグガググガグ、グガググググガググググガガグガグ。

```js
module.exports = {
  LANGUAGE_ID, TERMINAL_NAME, REASON,
  quoteArg, buildCommandLine, resolveRun,
  findTerminal, runInTerminal, runFile
}

// buildCommandLine(opts)  -> shell line for `咕咕嘎嘎 <file>`
// findTerminal()          -> the reusable integrated terminal, when one is alive
```

## 7. TextMate ガガグガグ

### 7.1 ガググガグ

1. `patterns` グググググググググ、グググガ `match` ガ `name` グガ、グググ `captures` ガグググガ。`begin` / `end` / `include` / `repository` / `while` ガググガガ。
2. グググガ `match` ガ `new RegExp(pattern)` ガガグガググガググガグガグググガグ。`(?<=)`、`(?<!)`、\b、\G グググガガグ。グガグガガガグガガガ JS ガグガ、ガガググググググガガグググググガガガガググ。ガガガガグガガグガグガグガググガガガググ。
3. ガググガガグガググガグ、ガグガガグガググガガググガガガガガググ。ググガガガガグガグガグググガグガグガグガ：`咕嘎嘎咕？` ガ `咕嘎嘎？` ガガ、`嘎嘎嘎嘎？` ガ `嘎嘎嘎？` ガガ、`咕咕嘎嘎！` ガ `咕咕嘎！` ガガ、ガガガ `咕咕！` ガガグガ。`咕咕！？` ググガグググ `咕咕！` グガググガガガグ。
4. `name` ガ 7.2 グ scope ガガググガ、ガググ scope グガググガグ。
5. ググガ `examples/` グガグガググガガグガググググガググガググガグガ。ガググガガグガガガグガガグググガガガガグググガガグガグガガグガガガガガ。

### 7.2 scope ガガガガググググ

| scope | ググガガググ |
| --- | --- |
| `keyword.control.flow.gugugaga` | `嘎嘎`、`嘎嘎嘎`、`嘎嘎嘎嘎`、`嘎嘎嘎嘎嘎` |
| `keyword.declaration.class.gugugaga` | `咕咕！` |
| `keyword.declaration.method.gugugaga` | `咕咕嘎！` |
| `keyword.declaration.entry.gugugaga` | `咕咕嘎嘎！` |
| `keyword.declaration.bind.gugugaga` | `咕咕！？` |
| `keyword.other.gugugaga` | `咕`、`咕嘎`（ググ） |
| `keyword.other.this.gugugaga` | `嘎嘎嘎嘎嘎嘎` |
| `keyword.other.read.gugugaga` | `嘎嘎嘎嘎嘎嘎嘎` |
| `keyword.operator.new.gugugaga` | `咕嘎嘎！` |
| `keyword.operator.call.gugugaga` | `！？` |
| `keyword.operator.arithmetic.gugugaga` | `咕？`、`咕咕？`、`咕嘎？`、`咕咕咕？`、`咕咕嘎？` |
| `keyword.operator.comparison.gugugaga` | `咕嘎咕？`、`咕嘎嘎？`、`咕嘎嘎咕？` |
| `keyword.operator.logical.gugugaga` | `咕嘎咕咕？`、`咕嘎咕嘎？`、`咕咕咕咕？` |
| `keyword.operator.unary.gugugaga` | `咕咕嘎咕？` |
| `constant.numeric.integer.gugugaga` | `嘎嘎嘎？` ガグガグガガガガガガ |
| `constant.numeric.bits.gugugaga` | `嘎嘎嘎嘎？` ガグガグガガガガガガ |
| `constant.language.boolean.gugugaga` | `嘎嘎？`、`嘎嘎咕？` |
| `constant.language.null.gugugaga` | `嘎咕？` |
| `entity.name.class.gugugaga` | ガガグガ：`咕咕！` ガグ、`咕嘎嘎！` ガグ |
| `entity.name.function.gugugaga` | グガググガガガググガガ：`咕咕嘎！` ガグ、`咕咕嘎嘎！` ガグ、`！？` ガグ |
| `variable.other.gugugaga` | グガググ `[咕嘎]+` ガガグ |
| `punctuation.separator.colon.gugugaga` | `：` |

### 7.3 グググガガグググガグガガグ

lookbehind グガガググガグ、「ガガググガガググガ」ガガガグガググガガグガググ。ガガガググガグガグガグガガグガガググガガグガ——ガガ、ガガググガグガ、グガガグガガガグ `：`——グガグガガ、グガグググガグググガガグ。ググガググガガグガグガググガグガグ。グガグガガ `咕咕！` ガ `咕咕嘎咕！` ガガググガガガグ、`咕咕？` グガガグガグググガガグガガ。

ガググガガググガガググガガグガガ。グガ `match` グググガガググガガググガガ、グガガグガガグガガグガググガガ。ガガグガガグガグガガグ `name` グ、グググ `entity.name.class` / `entity.name.function` ググガググガ。グググググガグガガグガガグググググガグガガ、「ガ + ガグ」ググググガグググググガガガガガガガガ、`咕嘎嘎！`（ググ）ガグガガガググガガグガガグガガ。

ガグガグググググガグググググガガグガ：`名前？`、`名前！？`、`名前！`、ガガグガガググガググガ、ググガガガガグガガガグガグ、ガガガガグガグガガグガガ。グググガグガガガグガグ、ガガガガガガガガガグググガググ、ガガグガガガググガググガガグググ。

## 8. グガガガググググガガ

### 8.1 `language-configuration.json`

- `comments` ガガガガガググガガググ。ガガガグガガグググガガガググガガガ。`lineComment` ガググガ `//` グガググガガガグガガガガガググガグガガグガ、ガガガガガガガグガガガグガグガ。
- `folding.offSide` ガ `true`。ガガググガガガググガガグガガガグググググガガガググガ。ガガググググガグガガググガ。
- `indentationRules.increaseIndentPattern` ガ `\s*(：|:)\s*$`。ガググググガ（ガガガガグガガ）ガググググガグガ、グガグガガグガガガガググ。
- `indentationRules.decreaseIndentPattern` ガ `^\s*(?:嘎|ガ|が|[Gg][Aa]){2}(?:(?:嘎|ガ|が|[Gg][Aa]){2}){0,2}`。ガ ガググガグガ（ググググググ）ガグググググガググググガググググガグガグガ。ググググガガガグガガガグググググガグガガ。
- `wordPattern` ガ `[咕嘎！？：グガぐが!?:GgUuAa]+`。グググググガグガガググガググガガガガガグググガ。ガガガグガグググ Unicode ガガグググガガガガグググガガガガガガグ、`咕咕嘎！` ググガグググガググガガグガグガググガグ。ググググガガガグググガガガガグググガガガググガグ。
- `autoClosingPairs` ガ `surroundingPairs` グガグググガグ。ガググガガグガガガガグググガガガグ。

### 8.2 ググガグガ

`snippets/gugugaga.json` ググガガググガガ：ググガガグガグ、ググガガガグガグ、ガガググガグググ、ググググガグガ、ググ、ガグググガグ、ガガガガガガガ、ググ。ググガグググガガ VS Code ガガグ（ググガガ + ググガ + グガ + グガガ + グガググググ）グ、グガガガガグガガガガガググガグ `嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕` グガガガガガガ。グガガガガグググガガグ、ガガガグガグガガガググガグガグガ。

グガグガグガガグググ グ / ガ / ！ / ？ / ： / グガ / グガ グググガガグガググググ。ガガガグガグガガグ、ガグガグガグガグガグガガグググガガグガガグ、グガググ `.咕咕` ガグガグググガガガガグ `check` ガグググググガガグ。ガガグガググガガグググガガグググググ、グガグガガガガググガガガガグ。

## 9. ガグガグガグガガ

### 9.1 ググググガグ（GGDIAG v1）

| グググガグ | グガガガ | ガガ |
| --- | --- | --- |
| magic | 4 | ガガ `1010` |
| version | 2 | ガガ `00` |
| code | 8 | グガガググガグガ |
| line | 16 | ガガグ、1 ガグ。`0` ガグガガガグガガガガガガガググガ |
| column | 16 | ガグガ、1 ガグ |
| mlen | 16 | ガググ UTF-8 ググググ |
| body | 8 × mlen | ググ。ガガグガガガガグガガガ |
| end | 3 | ガガ `110` |

グガガ `65 + 8 × mlen` ググガグガ。ググガグググ グ/ガ/ガ ガ GU グ 0、ガ/ガ/グ ガ GA グ 1 ガグガガグガ、ガガグググガグググググガガグ。ガググググガグガグググガググガガグガグググ、ググガグガガガガググググガガググガググ。

### 9.2 グガガガ

| グガ | ガググ | ガガ |
| --- | --- | --- |
| 1–3 | `E1001`–`E1003` | ガグガググガグ：ググググガ、ガガガググガ、ガガガガグググ |
| 4–5 | `E2001`–`E2002` | ガググガ |
| 6–10 | `E3001`–`E3005` | ガググググガガ |
| 11–21 | `E4001`–`E4012` | ガガガ。`E4009` ガガガグガグガググ |
| 0 / 22 / 23 / 24 | — | ググガガガ：ググググググ、ガガガ、ガググガガガグガガガ、ガグガググ。ガガグガガググガガグ |

### 9.3 ググググ

- magic グ version グガガググググ、ガガガガガググググガガガググガ。ガグガググガガガグガガガグガガグガグガガグググ。
- グガガガグググガガガグ `110` ググガ、ガガグガガガガガグググググガガググガ、ガガガグガググガグ、ガガ magic グググググガグガガグガ。
- グガグガグググガグガガグガガググ。ググググググガグガググガガガ、ガググガグガググガガググググガガググガグガガググガグ。
- ガガググガグガグガグググググググググググググ：ググガグ → ガガガガガググガ、ググガガグググガガ → ガグガガググガ（ガグガグガガガガガ）、グググガガグガ 0 ガグガガガグガガガグググガ → ググガガグガガググガググガガガガ。

## 10. ググガググガ

ガガガググガグガガググ、ガガググガガガガガガガガ。ガガググガガグググガガググ、ガググガガガグググ**グガグググ**ガガグガガガガガガグ グガグガグガグガ、グググガグガグガググガガガグガグガグ。

- **グガググググ**。`PURE_LINE` ガ `^(?:[咕嘎グガぐが！？：!?: 　]|[Gg][Uu]|[Gg][Aa])+$` ググ。グググガググガググググググガガガガガガググ、グガガググガググガグガグ。ガガガガググガグガグガグガグガグガググ。
- **グガガグググガガガ**ガ `咕咕嘎嘎` グ、ググガガググググガ。グガガグガガガガガグガ、ガググググググガグググガガググガガグ。
- **ガググガグ codicon グガ**（`$(play)`）。SVG / PNG ガグググガガガガガグググ。グガグガグガグガガグガググガ、DPI グガグググガグガグガガ。
- **ググガガググググググ**：`editor/title` ガ `editor/context`。グググ `editorLangId == gugugaga` グガガ、ガグググガグガガグググガグガガ。
- **ググググガグガググガグググ**。ガグガグガググガ、グガグガガガグガグググガググ。
- ガグググガガガガグガガグガ ガグググガグ：`咕咕嘎嘎！ 咕咕嘎嘎`（グガ）、`咕咕嘎嘎！ 嘎嘎`（ググ）、`咕咕嘎嘎！ 咕：`（ググ）。

## 11. グググ

```bash
node --test "tests/**/*.test.ts"                   # language tests
cd translator && node --test "tests/**/*.test.ts"  # translator tests
node --test "vscode/gugugaga/tests/*.test.js"      # extension tests
npm run test:all                                    # everything, plus the translation checker
```

グガ 173 ガ、ガガ 167 ガ、グガグググググ 104 ガガ、ガガ 444 ガグガ。ググガググガガ `node scripts/check-translations.mjs` ガグガ、24 グガガガググガグガガガグガグググガググググガググ。

ガガグガガ：ガガガガグガガグググガググガグググガガガグガガガガガ。ググガグ `require("vscode")` グガガグガググ（ガグガガ API ガガガグガガガガガグガ。VS Code ガググググガガグガググガ）。ガガガググガガグガガグガガガガガググガグガガグガグガ。グガググガガグガグガガ、グガガガガググガガガググガグ。

## 12. ガガグググ

- **グガガガガグガグガガグガグ**ググ。グググググガググガガグググガグググググガガグ、ググガググガグガ。ググガガグググガガグガグ。
- **ググガガグガググググガググガガガガガガ**。ガグガガググガグガグガググガ、ガガグガガグガガガガガガガグガガグググググググガ。
- **`check` ガググガグガガ**ググ。ガガグガググ（`E4xx`）ガガガグガグガググ、グガガグガグガガグガグガガガガガグガガグ。`check` ガグガガガグググガガガグ、グガガググガググガガガググググガガガガガ。
- **ガガガググガガグガグガグガググガ**ガグガ、ガガガググガググガグガ。ガガガグガガググ、グガグガググ、グガガガガガグガガガガガグ。
- **`.ググ` ググガガガ NFC グガググガガガガガガ**ガガガ。ググガグググガガグガガガグググガグガガグガ、ガグガグググガガガグググガガガグガググググガガグガガグガガ。`src/language.js` ググググガグガグググガググググググ、グググググガグググ VS Code ガガガガグググ、グガグググガガガガガガグ。
- **ガガガグガグガガガガググガガググガガガ**。ググガグググガググガガグググガガ。350 ググガガガグググガグガガガガガガ、ググガググガグガグガ。
