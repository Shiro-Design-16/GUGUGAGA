# 咕咕嘎嘎咕 VS Code 咕咕 · 咕咕嘎嘎（v1）

咕咕嘎 `vscode/gugugaga/` 嘎咕嘎嘎嘎：咕咕嘎嘎咕咕、嘎咕咕咕嘎嘎咕、嘎嘎嘎嘎咕嘎咕嘎咕咕咕嘎嘎咕咕咕。嘎咕咕咕咕嘎 [SPEC.md](../SPEC.md)；咕咕嘎嘎咕嘎 VS Code 嘎嘎嘎咕嘎咕咕。

## 1. 咕咕咕嘎嘎嘎

嘎嘎咕咕嘎嘎嘎：

1. **嘎嘎咕咕**：咕咕 `.咕咕` / `.ググ` / `.gu` / `.gugugaga` 咕嘎咕咕咕嘎（咕嘎 id `gugugaga`）。
2. **嘎咕**：TextMate 咕咕 `source.gugugaga` 嘎嘎 30 嘎嘎咕嘎咕、嘎咕咕嘎嘎、咕咕咕咕嘎咕、咕咕嘎嘎嘎咕。
3. **嘎嘎**：嘎咕咕咕（咕咕 / 咕咕 / 咕嘎咕 / 咕嘎咕嘎 / 咕嘎嘎）嘎嘎嘎咕嘎、咕嘎咕嘎嘎咕咕咕咕嘎咕。
4. **嘎咕嘎咕**：嘎**咕咕嘎**嘎咕咕咕 `嘎嘎`，咕 GGDIAG 咕咕咕嘎嘎嘎嘎嘎。
5. **嘎嘎**：咕嘎咕咕嘎嘎嘎嘎嘎嘎嘎嘎。
6. **咕咕**：咕咕嘎嘎 ▶ 咕 `咕咕嘎嘎 <咕嘎>` 嘎嘎咕嘎咕嘎。

**咕咕嘎**：嘎嘎 LSP 咕咕咕，咕嘎咕咕嘎嘎 / 嘎嘎嘎 / 咕嘎咕咕，咕咕咕 TypeScript 咕咕咕，嘎咕嘎嘎 npm 嘎咕，咕嘎嘎。**嘎嘎咕嘎咕咕嘎嘎咕**——咕嘎嘎咕嘎咕咕嘎咕嘎咕咕（`bin/gg.ts` 嘎 `src/`），嘎咕嘎嘎嘎咕嘎嘎嘎嘎咕咕咕咕咕咕。

## 2. 咕嘎咕嘎嘎嘎咕

| 嘎咕 | 咕嘎 |
| --- | --- |
| `package.json` | 咕咕咕咕：咕嘎、咕咕、嘎嘎、咕嘎、咕嘎、嘎咕 |
| `language-configuration.json` | 咕咕、嘎咕咕嘎嘎嘎咕 |
| `syntaxes/gugugaga.tmLanguage.json` | 35 嘎咕嘎 `match` 嘎嘎 |
| `snippets/gugugaga.json` | 8 嘎咕嘎咕咕 |
| `src/keywords.js` | 嘎嘎嘎咕嘎嘎嘎咕嘎嘎，JS 咕嘎咕咕嘎 |
| `src/completion.js` | 咕嘎嘎嘎咕嘎嘎嘎咕嘎 |
| `src/hover.js` | 咕嘎咕嘎嘎嘎嘎 |
| `src/cli.js` | 嘎咕咕嘎、PATH 咕嘎、`execFile` 咕咕 |
| `src/diagnostics.js` | GGDIAG 嘎嘎嘎咕咕咕咕咕 |
| `src/extension.js` | 嘎咕、咕咕、咕嘎、咕嘎嘎嘎咕嘎嘎咕咕 |
| `src/language.js` | 嘎嘎咕咕（NFC 咕嘎、嘎咕嘎咕） |
| `src/run.js` | 嘎嘎嘎嘎：嘎咕嘎咕咕咕嘎嘎咕嘎 |
| `tests/*.test.js` | 嘎嘎咕咕，嘎 `require("vscode")` |
| `README.md` | 咕咕嘎咕咕 |

咕嘎咕咕嘎咕：`extension.js` → `diagnostics.js` / `run.js` / 咕咕嘎咕咕 → `cli.js` → `language.js`，咕咕嘎嘎嘎嘎。咕咕嘎 `extension.js` 嘎嘎嘎咕咕咕嘎 `require("vscode")`，咕咕嘎嘎咕咕咕咕 Node 咕嘎咕嘎嘎；`cli.js` 嘎 `diagnostics.js` 咕咕咕咕嘎咕嘎嘎咕嘎嘎嘎咕，嘎咕嘎嘎嘎咕嘎 require 嘎嘎嘎嘎嘎 `exports`。

## 3. 嘎咕咕

| 嘎 | 咕 |
| --- | --- |
| 咕咕 id | `gugugaga.gugugaga-language`（publisher `gugugaga`，name `gugugaga-language`） |
| 咕嘎 id | `gugugaga` |
| 嘎咕嘎嘎 | `.咕咕`、`.ググ`（咕嘎嘎咕嘎）、`.gu`、`.gugugaga` |
| TextMate scopeName | `source.gugugaga` |
| 嘎咕嘎嘎咕 | `咕咕嘎嘎` |
| 咕嘎 | `gugugaga.run`、`gugugaga.checkFile`、`gugugaga.showOutput` |
| 嘎嘎咕咕 | `gugugaga.` |

manifest 咕咕嘎咕嘎咕嘎咕咕，嘎 macOS 嘎咕咕咕咕咕咕嘎嘎嘎**嘎咕**嘎嘎（グ = ク U+30AF + ゛ U+3099），咕咕咕嘎嘎咕嘎嘎 グ（U+30B0）咕咕咕咕。`src/language.js` 咕咕嘎嘎 NFC 咕嘎咕嘎咕咕嘎嘎，嘎嘎咕咕咕咕 `setTextDocumentLanguage`，`.ググ` 嘎咕咕嘎嘎嘎嘎咕嘎咕咕。

## 4. 咕嘎咕咕嘎

| 咕嘎 | 咕嘎 | 咕嘎 |
| --- | --- | --- |
| `gugugaga.run` | `咕咕嘎嘎！ 咕咕嘎嘎` | 咕嘎咕嘎咕嘎咕咕嘎嘎咕嘎咕 |
| `gugugaga.checkFile` | `咕咕嘎嘎！ 嘎嘎` | 咕咕嘎嘎咕嘎咕嘎，嘎咕咕嘎 |
| `gugugaga.showOutput` | `咕咕嘎嘎！ 咕：` | 嘎嘎咕咕咕咕，嘎 CLI 咕咕咕 stderr |

| 嘎咕 | 咕咕 | 咕嘎嘎 | 嘎咕 |
| --- | --- | --- | --- |
| `gugugaga.cliPath` | string | `咕咕嘎嘎` | 咕咕嘎嘎咕咕咕嘎咕嘎，咕咕嘎嘎嘎 |
| `gugugaga.nodePath` | string | `node` | 咕 node 嘎咕咕 `.ts` 咕咕咕嘎咕咕咕嘎嘎 |
| `gugugaga.checkOnChange` | boolean | `true` | 嘎嘎咕嘎咕咕嘎嘎嘎咕嘎咕咕嘎 |
| `gugugaga.debounceMs` | number | `350` | 嘎嘎嘎咕咕嘎咕咕嘎咕嘎 |
| `gugugaga.maxSteps` | integer 咕 null | `null` | 嘎咕咕嘎咕嘎嘎咕咕嘎，`null` 咕嘎嘎咕 |

咕咕嘎嘎咕咕嘎咕 `editor/title` 嘎 `editor/context` 咕咕咕咕，`when` 咕咕 `editorLangId == gugugaga`，咕咕咕咕咕咕咕嘎。

## 5. 咕咕咕嘎嘎咕

30 咕嘎咕，29 嘎咕咕：`咕咕` 咕嘎咕咕咕嘎嘎咕，嘎咕嘎 `！` 嘎 `！？` 咕咕。咕嘎嘎嘎咕嘎咕嘎嘎咕嘎，嘎咕咕咕嘎嘎咕嘎嘎嘎咕。

| 嘎咕 | 嘎咕 | 咕嘎嘎 | 咕嘎 |
| --- | --- | --- | --- |
| 咕 | BARE | Print | 嘎嘎：`咕：<咕咕咕>` |
| 嘎嘎 | BARE | Return | 嘎嘎：`嘎嘎：<咕咕咕>`；嘎 `嘎嘎` 咕咕嘎嘎 |
| 嘎嘎嘎 | BARE | If | 嘎嘎：`嘎嘎嘎：<嘎嘎>` |
| 嘎嘎嘎嘎 | BARE | Else | 嘎咕咕嘎，嘎咕咕咕嘎咕咕 |
| 嘎嘎嘎嘎嘎 | BARE | While | 咕嘎：`嘎嘎嘎嘎嘎：<嘎嘎>` |
| 嘎嘎嘎嘎嘎嘎 | BARE | This | 咕咕咕嘎，咕咕嘎嘎咕咕嘎咕嘎嘎咕 |
| 嘎嘎嘎嘎嘎嘎嘎 | BARE | ReadByte | 咕嘎咕咕咕咕，UTF-8 嘎嘎嘎，EOF 咕嘎 |
| 咕咕 | DECL | Class | 嘎嘎：`咕咕！ <嘎咕>：` |
| 咕咕嘎 | DECL | Method | 咕咕嘎：`咕咕嘎！ <咕嘎咕>：<咕咕>`；咕嘎咕嘎咕嘎嘎嘎嘎嘎 |
| 咕咕嘎嘎 | DECL | Entry | 咕咕嘎：`咕咕嘎嘎！ <嘎嘎嘎>` |
| 咕嘎嘎 | DECL | New | 咕嘎：`咕嘎嘎！ <嘎咕>？ <咕嘎>…` |
| 咕咕 | ACT | Bind | 咕嘎咕咕嘎：`咕咕！？ <咕咕>：<咕咕>` |
| 咕嘎 | ACT | ExprStmt | 咕咕咕咕嘎：`咕嘎 <咕咕咕>` |
| 咕？ | VAL | Add | 咕（咕嘎） |
| 咕咕？ | VAL | Sub | 咕（咕嘎） |
| 咕嘎？ | VAL | Mul | 嘎（咕嘎） |
| 咕咕咕？ | VAL | Div | 咕（咕嘎，咕咕咕 E4005） |
| 咕咕嘎？ | VAL | Mod | 咕咕（咕嘎） |
| 咕嘎咕？ | VAL | Eq | 咕咕（咕嘎，咕嘎咕咕嘎） |
| 咕嘎嘎？ | VAL | Lt | 嘎嘎（咕嘎） |
| 咕嘎嘎咕？ | VAL | Gt | 嘎咕（咕嘎） |
| 咕嘎咕咕？ | VAL | And | 嘎（咕嘎，咕嘎嘎） |
| 咕嘎咕嘎？ | VAL | Or | 咕（咕嘎，咕嘎嘎） |
| 咕咕咕咕？ | VAL | Not | 咕（嘎咕） |
| 咕咕嘎咕？ | VAL | Neg | 咕咕（嘎咕） |
| 嘎嘎嘎？ | VAL | IntLit | 嘎嘎嘎咕嘎：`嘎嘎嘎？<嘎嘎>`，嘎咕嘎嘎嘎嘎 |
| 嘎嘎嘎嘎？ | VAL | BitsLit | 咕嘎嘎嘎嘎：`嘎嘎嘎嘎？<嘎嘎>`，咕嘎咕嘎 |
| 嘎嘎？ | VAL | True | 嘎，咕咕 8 嘎 嘎 |
| 嘎嘎咕？ | VAL | False | 嘎，咕咕 8 嘎 咕 |
| 嘎咕？ | VAL | Null | 嘎 |

嘎咕嘎咕：

- 嘎嘎嘎咕嘎 `！`（`咕咕！`、`咕咕嘎！`、`咕咕嘎嘎！`、`咕嘎嘎！`）；嘎咕咕嘎咕 `？`；嘎嘎嘎嘎 `：`；咕咕嘎嘎嘎 `！？`，嘎嘎咕 `<咕咕咕>！？ <咕嘎咕>`。
- 咕嘎嘎 `：` 咕咕咕嘎咕嘎嘎咕咕咕咕：`咕咕！ 咕咕` 咕嘎咕 `咕咕！ 咕咕：`。
- 咕嘎嘎咕咕 咕 嘎 嘎，嘎咕咕嘎咕咕嘎咕咕咕嘎。咕咕咕咕：1 咕 1 嘎（嘎）、2 咕 0 嘎、3 咕 2 嘎（`嘎咕咕`、`嘎咕嘎`）、4 咕 9 嘎。咕嘎咕咕嘎嘎咕嘎咕咕咕嘎嘎咕嘎 `嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕`。
- 嘎咕嘎嘎嘎嘎。嘎咕嘎 shebang（CLI 嘎嘎咕）嘎，嘎咕咕嘎嘎 咕/嘎/！/？/：/咕嘎/嘎嘎 咕嘎咕咕咕嘎 E1001。
- 嘎嘎咕咕咕咕嘎咕（咕 = 0，嘎 = 1），嘎咕嘎嘎咕嘎嘎嘎；`咕：` 嘎嘎嘎嘎嘎，咕嘎嘎。

## 6. 嘎咕咕咕

咕嘎嘎咕嘎嘎咕嘎：嘎嘎咕嘎嘎咕嘎嘎嘎，咕咕嘎嘎咕咕嘎嘎咕嘎嘎。嘎嘎 CommonJS（`module.exports`），嘎咕 ESM `import/export`，咕嘎嘎 `"type": "module"`。

### 6.1 `src/keywords.js`

JS 咕嘎咕咕嘎：30 嘎咕嘎咕咕、嘎咕咕咕（咕咕 咕/嘎、咕嘎 グ/ガ/ぐ/が、咕咕 GU/GA）嘎咕咕、咕咕嘎嘎嘎咕。咕咕咕咕咕咕咕咕咕嘎，咕嘎嘎咕嘎咕嘎嘎嘎。

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

嘎咕嘎嘎嘎（咕咕 / 咕咕 / 咕嘎咕 / 咕嘎咕嘎 / 咕嘎嘎），咕咕咕咕咕咕咕：咕嘎嘎咕嘎嘎咕嘎咕咕嘎咕咕嘎咕嘎咕咕咕，咕嘎咕咕咕嘎咕咕嘎嘎咕嘎，嘎嘎咕嘎咕嘎嘎。咕咕嘎 `sortText`，嘎咕嘎嘎嘎咕咕嘎嘎咕嘎。

```js
module.exports = { contextAt, completionsAt, collectNames }

// contextAt(text, offset)      -> where the caret is, in grammar terms
// completionsAt(opts)          -> candidates for that context
// collectNames(text)           -> names defined in this document
```

### 6.3 `src/hover.js`

咕嘎嘎咕咕嘎咕嘎嘎嘎咕咕（咕咕咕咕咕咕），嘎咕咕嘎；嘎咕咕咕嘎咕咕嘎嘎嘎咕嘎咕咕嘎嘎嘎嘎。嘎咕咕嘎嘎 `null`，嘎嘎咕嘎嘎咕咕咕嘎嘎嘎。

```js
module.exports = { hoverAt }

// hoverAt({ text, offset })    -> MarkdownString | null
```

### 6.4 `src/cli.js`

嘎嘎咕嘎咕咕嘎咕咕咕嘎嘎咕：`gugugaga.cliPath` 嘎咕 → 嘎咕咕咕 `bin/gg.ts`（咕 `gugugaga.nodePath` 嘎） → `PATH` 咕嘎 `咕咕嘎嘎` / `ググガガ` / `gggg` / `gg`。`runCheck` 咕 `execFile` 嘎咕嘎咕咕，咕咕 shell，**咕嘎 reject**：嘎咕、嘎嘎、嘎咕嘎咕咕咕嘎嘎 `code` / `timedOut` / `error` 咕咕，嘎咕咕咕嘎咕咕嘎嘎嘎咕。咕咕咕嘎 15 嘎，咕嘎咕嘎咕嘎嘎嘎嘎咕 4 MiB。

```js
module.exports = { resolveCommand, parseDiagnostics, runCheck }

// resolveCommand(opts) -> { exec, args, source }   source: setting | repo | path
// runCheck(opts)       -> Promise<{ code, stdout, stderr, timedOut, error }>
// parseDiagnostics(stderr, filePath) -> { issues, error }
```

### 6.5 `src/diagnostics.js`

咕 CLI 咕 stderr 咕嘎咕咕：嘎嘎咕咕 咕/グ/ぐ/GU 嘎咕 0、咕 嘎/ガ/が/GA 嘎咕 1，咕嘎嘎嘎嘎咕咕咕，嘎咕咕嘎嘎嘎 GGDIAG 咕。嘎咕咕咕嘎嘎咕——咕嘎嘎咕咕嘎嘎咕咕嘎咕嘎咕嘎咕咕。咕咕嘎 `message` 嘎嘎咕咕嘎咕咕嘎嘎嘎嘎咕，咕嘎嘎嘎嘎嘎 CLI 咕咕嘎嘎嘎咕。

```js
module.exports = { collect, parseDiagnostics, decodeFrames, bitsText, codeName, CODE_NAMES }

// decodeFrames(stderr) -> Array<{ code, line, column, message, bits }>
// collect(opts)        -> Promise<Array<{ line, column, code, message, sourceLine }>>
```

### 6.6 `src/extension.js`

咕咕嘎咕嘎咕咕嘎咕、嘎嘎嘎嘎嘎（嘎嘎咕咕 `咕`、`嘎`、`！`、`？`、`：`、咕嘎）、咕嘎嘎嘎咕嘎嘎咕嘎嘎。咕咕嘎咕 350 咕嘎嘎咕，咕咕、咕嘎、嘎咕咕咕咕，嘎嘎嘎咕咕咕嘎咕咕咕咕。咕咕嘎咕嘎嘎嘎咕嘎咕咕，嘎嘎嘎咕咕。

```js
module.exports = { activate, deactivate, isPureLine, append }

// activate(context)   registers the collection, the three providers and the commands
// isPureLine(text)    the purity gate: true when the line holds only bit glyphs
```

### 6.7 `src/language.js`

manifest 嘎嘎嘎嘎嘎嘎嘎：NFC 咕咕咕咕嘎嘎嘎嘎咕，咕嘎 `.咕咕`、`.ググ`、`.gu`、`.gugugaga`。咕嘎咕咕嘎嘎咕嘎嘎嘎嘎嘎咕嘎咕，嘎嘎嘎咕咕嘎嘎嘎嘎嘎咕嘎。

```js
module.exports = { PROGRAM_SUFFIXES, normalizeName, isProgramFile }

// PROGRAM_SUFFIXES      [.咕咕, .ググ, .gu, .gugugaga]
// isProgramFile(name)   NFC normalizes before comparing
```

### 6.8 `src/run.js`

嘎嘎嘎嘎：嘎嘎 `咕咕嘎嘎 <咕嘎>`（嘎嘎咕嘎咕咕），咕嘎咕嘎 `咕咕嘎嘎` 嘎咕咕咕咕，嘎咕咕咕咕，嘎咕咕嘎咕。嘎咕咕嘎咕咕咕咕——咕咕咕咕嘎嘎嘎 stdin、嘎嘎嘎嘎嘎咕咕、嘎嘎咕嘎嘎嘎嘎嘎嘎嘎。咕咕咕嘎嘎嘎嘎嘎咕嘎嘎，咕咕咕嘎咕咕咕嘎。

```js
module.exports = {
  LANGUAGE_ID, TERMINAL_NAME, REASON,
  quoteArg, buildCommandLine, resolveRun,
  findTerminal, runInTerminal, runFile
}

// buildCommandLine(opts)  -> shell line for `咕咕嘎嘎 <file>`
// findTerminal()          -> the reusable integrated terminal, when one is alive
```

## 7. TextMate 咕咕咕嘎

### 7.1 嘎嘎咕

1. `patterns` 咕嘎咕咕咕，嘎咕咕咕 `match` 嘎 `name`，嘎咕 `captures`；咕咕 `begin` / `end` / `include` / `repository` / `while`。
2. 咕咕 `match` 咕咕嘎嘎 `new RegExp(pattern)` 咕嘎。嘎咕 `(?<=)`、`(?<!)`、\b、\G：嘎嘎咕嘎咕 JS，咕咕咕咕咕嘎嘎咕咕咕咕嘎咕咕咕嘎，咕嘎咕嘎咕咕嘎嘎嘎嘎咕咕咕咕。
3. 咕嘎咕咕咕咕，咕咕咕嘎嘎咕咕嘎嘎。嘎咕嘎嘎嘎嘎咕咕咕嘎嘎咕：`咕嘎嘎咕？` 嘎 `咕嘎嘎？` 嘎，`嘎嘎嘎嘎？` 嘎 `嘎嘎嘎？` 嘎，`咕咕嘎嘎！` 嘎 `咕咕嘎！` 嘎嘎 `咕咕！` 嘎。`咕咕！？` 咕咕咕咕嘎咕 `咕咕！`。
4. `name` 咕嘎咕 7.2 咕 scope，咕嘎咕嘎咕。
5. 嘎嘎嘎咕咕咕 `examples/` 咕咕咕嘎咕咕嘎嘎：嘎咕咕咕咕嘎咕，嘎嘎嘎嘎咕嘎嘎嘎嘎咕咕咕咕咕嘎咕嘎嘎。

### 7.2 scope 咕嘎嘎

| scope | 咕嘎咕嘎嘎 |
| --- | --- |
| `keyword.control.flow.gugugaga` | `嘎嘎`、`嘎嘎嘎`、`嘎嘎嘎嘎`、`嘎嘎嘎嘎嘎` |
| `keyword.declaration.class.gugugaga` | `咕咕！` |
| `keyword.declaration.method.gugugaga` | `咕咕嘎！` |
| `keyword.declaration.entry.gugugaga` | `咕咕嘎嘎！` |
| `keyword.declaration.bind.gugugaga` | `咕咕！？` |
| `keyword.other.gugugaga` | `咕`、`咕嘎`（咕咕咕咕嘎） |
| `keyword.other.this.gugugaga` | `嘎嘎嘎嘎嘎嘎` |
| `keyword.other.read.gugugaga` | `嘎嘎嘎嘎嘎嘎嘎` |
| `keyword.operator.new.gugugaga` | `咕嘎嘎！` |
| `keyword.operator.call.gugugaga` | `！？` |
| `keyword.operator.arithmetic.gugugaga` | `咕？`、`咕咕？`、`咕嘎？`、`咕咕咕？`、`咕咕嘎？` |
| `keyword.operator.comparison.gugugaga` | `咕嘎咕？`、`咕嘎嘎？`、`咕嘎嘎咕？` |
| `keyword.operator.logical.gugugaga` | `咕嘎咕咕？`、`咕嘎咕嘎？`、`咕咕咕咕？` |
| `keyword.operator.unary.gugugaga` | `咕咕嘎咕？` |
| `constant.numeric.integer.gugugaga` | `嘎嘎嘎？` 嘎咕咕咕咕咕嘎 |
| `constant.numeric.bits.gugugaga` | `嘎嘎嘎嘎？` 嘎咕咕咕咕咕嘎 |
| `constant.language.boolean.gugugaga` | `嘎嘎？`、`嘎嘎咕？` |
| `constant.language.null.gugugaga` | `嘎咕？` |
| `entity.name.class.gugugaga` | 嘎咕：`咕咕！` 嘎咕、`咕嘎嘎！` 嘎咕 |
| `entity.name.function.gugugaga` | 嘎咕嘎咕咕咕嘎：`咕咕嘎！` 嘎咕、`咕咕嘎嘎！` 嘎咕、`！？` 嘎咕 |
| `variable.other.gugugaga` | 嘎嘎 `[咕嘎]+` 咕咕 |
| `punctuation.separator.colon.gugugaga` | `：` |

### 7.3 咕咕嘎咕嘎咕咕嘎嘎嘎咕

嘎咕 lookbehind，嘎咕咕「嘎嘎咕咕咕嘎」咕咕嘎嘎嘎。嘎嘎嘎嘎咕嘎咕嘎咕咕嘎咕咕咕咕嘎嘎咕嘎咕咕咕咕咕嘎嘎咕——咕咕、咕嘎咕嘎咕咕咕，嘎嘎嘎嘎咕嘎 `：`——嘎咕嘎嘎嘎嘎嘎；咕咕嘎嘎嘎咕嘎嘎咕咕嘎。咕嘎 `咕咕！` 嘎嘎咕嘎 `咕咕嘎咕！` 嘎嘎咕，`咕咕？` 咕咕嘎咕嘎咕嘎咕咕。

嘎咕嘎嘎嘎嘎咕嘎咕咕：嘎咕咕 `match` 嘎咕咕咕咕咕嘎嘎嘎咕咕咕，咕咕嘎嘎嘎咕咕嘎嘎嘎嘎嘎，嘎咕咕咕咕嘎咕嘎嘎咕嘎 `name` 嘎嘎、咕嘎咕 `entity.name.class` / `entity.name.function` 嘎嘎。咕咕嘎嘎咕咕嘎咕嘎咕，「嘎嘎 + 咕咕」咕咕咕嘎咕咕咕嘎嘎咕，`咕嘎嘎！`（咕嘎）嘎咕咕咕嘎嘎咕咕嘎嘎咕。

嘎嘎嘎咕嘎嘎嘎咕咕咕嘎嘎：`咕咕？`、`咕咕！？`、`咕咕！` 嘎咕咕嘎咕，咕咕嘎咕咕嘎嘎嘎咕嘎嘎，嘎嘎咕咕咕嘎嘎咕。嘎嘎嘎嘎「嘎嘎嘎嘎咕咕嘎嘎咕」咕嘎咕嘎咕咕，咕嘎嘎咕嘎嘎咕咕咕嘎嘎咕咕嘎嘎。

## 8. 嘎嘎嘎咕嘎咕咕

### 8.1 `language-configuration.json`

- `comments` 咕咕嘎嘎。嘎嘎嘎嘎嘎嘎嘎嘎嘎；咕嘎 `lineComment` 咕嘎嘎咕咕咕 `//` 咕咕咕嘎咕咕咕嘎，嘎咕咕咕咕嘎嘎嘎咕咕咕嘎咕。
- `folding.offSide` 嘎 `true`：嘎嘎咕嘎咕嘎咕，嘎嘎嘎嘎咕嘎——嘎嘎咕咕咕咕嘎。
- `indentationRules.increaseIndentPattern` 嘎 `\s*(：|:)\s*$`：嘎嘎嘎嘎嘎（咕咕咕嘎嘎）咕嘎咕咕，嘎嘎咕嘎咕咕嘎。
- `indentationRules.decreaseIndentPattern` 嘎 `^\s*(?:嘎|ガ|咕|[Gg][Aa]){2}(?:(?:嘎|ガ|咕|[Gg][Aa]){2}){0,2}`：嘎嘎、嘎嘎咕咕嘎嘎嘎嘎（咕咕嘎咕）嘎咕咕嘎嘎咕咕嘎——嘎嘎、嘎嘎嘎咕咕嘎咕嘎嘎咕。
- `wordPattern` 嘎 `[咕嘎！？：グガ咕嘎!?:GgUuAa]+`：咕咕咕咕咕嘎嘎咕咕嘎咕咕嘎咕咕。嘎嘎咕 Unicode 咕嘎咕咕咕嘎咕咕嘎嘎嘎咕咕咕，咕咕 `咕咕嘎！` 嘎嘎嘎咕咕嘎，嘎咕咕咕嘎咕嘎嘎嘎嘎；咕嘎咕嘎咕咕嘎嘎嘎嘎咕嘎咕。
- `autoClosingPairs` 嘎 `surroundingPairs` 咕嘎嘎咕：嘎嘎嘎嘎嘎嘎嘎咕嘎。

### 8.2 嘎嘎

`snippets/gugugaga.json` 咕嘎咕：咕咕嘎、咕咕咕嘎、嘎咕咕嘎、咕嘎嘎咕、嘎嘎、咕咕咕、咕嘎嘎、咕嘎。咕咕咕咕 VS Code 咕咕（咕咕咕 + 咕嘎嘎 + 咕咕 + 咕咕 + 咕嘎嘎咕），咕嘎嘎嘎咕嘎咕嘎咕咕咕咕 `嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕`——咕嘎嘎嘎嘎咕咕嘎嘎咕，嘎嘎嘎咕嘎嘎嘎嘎嘎嘎咕嘎咕。

嘎咕咕嘎嘎 咕 / 嘎 / ！ / ？ / ： / 咕嘎 / 嘎嘎 咕咕嘎咕咕咕嘎咕咕。咕咕咕嘎嘎：嘎咕嘎嘎嘎嘎咕咕嘎咕咕咕嘎咕，咕嘎咕嘎咕 `.咕咕` 咕嘎，嘎嘎咕嘎嘎 `check`。咕咕嘎咕咕嘎嘎嘎咕嘎，嘎咕咕嘎咕咕嘎咕咕嘎。

## 9. 咕咕咕咕

### 9.1 嘎咕咕（GGDIAG v1）

| 嘎咕 | 咕咕 | 咕嘎 |
| --- | --- | --- |
| magic | 4 | 嘎嘎 `1010` |
| version | 2 | 嘎嘎 `00` |
| code | 8 | 嘎咕嘎咕嘎 |
| line | 16 | 嘎咕，咕 1 咕；`0` 嘎嘎嘎咕嘎嘎嘎嘎 |
| column | 16 | 嘎嘎，咕 1 咕 |
| mlen | 16 | 咕嘎嘎 UTF-8 咕嘎咕 |
| body | 8 × mlen | 嘎嘎，咕嘎咕咕咕咕 |
| end | 3 | 嘎嘎 `110` |

嘎咕 `65 + 8 × mlen` 咕。嘎咕咕 咕/グ/ぐ 嘎 GU 嘎咕 0，嘎/ガ/が 嘎 GA 嘎咕 1，咕咕嘎嘎嘎嘎咕咕——咕嘎咕嘎嘎嘎嘎嘎咕嘎咕嘎咕嘎嘎咕嘎嘎嘎嘎嘎。

### 9.2 嘎嘎

| 咕嘎 | 嘎 | 咕嘎 |
| --- | --- | --- |
| 1–3 | `E1001`–`E1003` | 嘎嘎嘎嘎嘎嘎：嘎咕咕咕、咕咕咕咕、咕咕咕嘎 |
| 4–5 | `E2001`–`E2002` | 咕咕咕嘎 |
| 6–10 | `E3001`–`E3005` | 咕咕嘎嘎咕嘎 |
| 11–21 | `E4001`–`E4012` | 咕咕咕；`E4009` 咕咕嘎，嘎嘎嘎 |
| 0 / 22 / 23 / 24 | — | 嘎咕嘎：嘎咕嘎嘎、嘎嘎、嘎咕嘎嘎嘎、咕咕嘎嘎。咕咕咕咕咕咕嘎嘎 |

### 9.3 咕咕

- magic 咕 version 嘎咕嘎，咕嘎嘎咕嘎咕咕咕：咕嘎嘎嘎咕咕嘎咕嘎嘎嘎咕咕咕嘎嘎。
- 嘎嘎咕咕嘎嘎咕 `110`、嘎咕咕嘎嘎嘎咕，咕咕咕嘎，咕嘎嘎 magic 咕嘎嘎咕嘎。
- 咕咕咕咕咕咕嘎咕。咕咕嘎咕嘎咕，咕咕咕嘎嘎嘎嘎咕嘎嘎咕嘎嘎咕咕咕咕咕嘎咕。
- 嘎咕咕咕嘎咕嘎嘎咕咕嘎：咕嘎咕嘎 → 咕咕嘎；咕咕嘎咕咕嘎 → 咕咕咕嘎（嘎嘎嘎嘎咕，嘎嘎嘎嘎）；咕嘎咕咕 0 嘎咕嘎咕咕嘎 → 嘎咕咕咕嘎嘎嘎嘎咕。

## 10. 嘎嘎嘎咕咕

嘎咕嘎嘎嘎咕，嘎嘎嘎咕咕咕咕咕。咕咕咕咕咕咕咕咕咕咕咕嘎，嘎咕嘎嘎咕咕嘎**咕嘎嘎**嘎咕咕嘎嘎咕嘎咕嘎嘎，咕咕嘎嘎嘎嘎咕咕。

- **咕咕嘎嘎**。`PURE_LINE` 嘎 `^(?:[咕嘎グガ咕嘎！？：!?: 　]|[Gg][Uu]|[Gg][Aa])+$`：咕咕咕嘎咕咕咕嘎嘎嘎咕咕嘎咕咕咕嘎咕咕，嘎嘎咕咕咕嘎嘎嘎嘎嘎。咕咕嘎嘎咕嘎咕嘎嘎嘎嘎嘎嘎嘎嘎咕咕嘎。
- **嘎咕嘎嘎咕**嘎 `咕咕嘎嘎`，咕咕嘎嘎嘎咕，咕咕咕嘎嘎嘎嘎咕咕嘎咕咕咕嘎咕嘎咕。
- **嘎咕嘎咕 codicon**（`$(play)`）。咕咕嘎嘎 SVG / PNG：嘎嘎咕咕咕嘎咕嘎咕嘎咕嘎，嘎咕嘎咕咕 DPI 嘎嘎咕。
- **咕嘎咕咕咕咕**：`editor/title` 嘎 `editor/context`，嘎咕 `editorLangId == gugugaga` 咕嘎，咕咕咕嘎咕咕咕咕嘎嘎咕。
- **咕咕嘎嘎嘎嘎**。嘎咕嘎咕嘎咕嘎，嘎咕咕嘎咕嘎咕嘎。
- 咕嘎咕嘎咕嘎咕嘎咕嘎咕嘎嘎：`咕咕嘎嘎！ 咕咕嘎嘎`（咕咕）、`咕咕嘎嘎！ 嘎嘎`（嘎咕）、`咕咕嘎嘎！ 咕：`（咕咕）。

## 11. 嘎嘎

```bash
node --test "tests/**/*.test.ts"                   # language tests
cd translator && node --test "tests/**/*.test.ts"  # translator tests
node --test "vscode/gugugaga/tests/*.test.js"      # extension tests
npm run test:all                                    # everything, plus the translation checker
```

咕咕 173 咕、咕嘎 176 咕、嘎嘎嘎 104 咕，咕嘎 453 咕。嘎嘎嘎嘎嘎 `node scripts/check-translations.mjs`，嘎嘎 24 咕嘎咕咕咕咕、嘎嘎嘎嘎嘎嘎嘎咕。

咕咕咕嘎：嘎咕嘎嘎咕嘎、嘎嘎嘎、咕咕咕；咕咕咕咕咕咕 `require("vscode")`（嘎咕嘎咕 API 嘎咕嘎咕，VS Code 咕嘎嘎咕嘎嘎咕）；嘎咕咕咕咕嘎咕嘎咕咕；嘎咕嘎嘎嘎嘎嘎咕咕咕咕咕咕咕。

## 12. 咕咕咕咕

- **嘎嘎嘎咕咕嘎咕咕咕嘎**。咕咕嘎咕嘎咕咕咕嘎咕嘎咕嘎咕嘎，咕嘎咕嘎嘎嘎，咕咕嘎咕嘎嘎咕嘎咕嘎嘎咕咕嘎嘎。
- **嘎嘎咕咕咕、咕嘎咕咕、嘎嘎咕**。咕咕嘎嘎嘎咕嘎嘎咕嘎嘎咕，咕嘎咕嘎嘎咕嘎嘎嘎嘎嘎咕嘎嘎嘎。
- **`check` 嘎咕嘎嘎咕嘎**。咕嘎咕咕嘎（`E4xx`）咕咕咕咕咕咕咕嘎，嘎嘎咕咕嘎咕嘎咕。`check` 咕嘎嘎咕咕咕，嘎咕咕咕咕嘎咕嘎咕嘎咕咕咕咕嘎嘎嘎。
- **嘎嘎嘎嘎嘎嘎嘎咕嘎咕**，咕嘎嘎嘎咕：咕咕、咕嘎、咕咕咕嘎咕嘎嘎嘎咕嘎咕嘎嘎。
- **`.ググ` 嘎嘎咕咕咕嘎 NFC 咕嘎**。manifest 咕咕咕嘎咕嘎嘎嘎，咕嘎咕咕嘎咕咕嘎咕咕咕咕嘎咕咕嘎咕咕；`src/language.js` 嘎咕嘎咕嘎咕嘎嘎咕嘎，嘎咕咕咕咕咕嘎嘎 VS Code 嘎嘎，咕嘎咕咕咕。
- **咕咕嘎嘎咕嘎嘎嘎嘎**。嘎咕咕嘎嘎嘎嘎嘎咕，350 嘎嘎咕咕嘎嘎咕嘎，咕咕嘎嘎。
