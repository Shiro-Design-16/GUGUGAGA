<!-- i18n:begin -->
[中文](README.md) | **English** | [日本語](README.ja.md)

> This is an English translation. The Chinese [README.md](README.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugugaga language · VS Code extension

> Editor support for `.咕咕` / `.ググ` / `.gu` / `.gugugaga` files: syntax highlighting, context-aware completion, hover explanations, and real syntax diagnostics. The three dialects — Chinese 咕嘎, Japanese グガ, English GU/GA — can be mixed inside a single file.

## What it is / what it isn't

**It is**

- Opening a `.咕咕` / `.ググ` / `.gu` / `.gugugaga` file is enough for it to be recognized as Gugugaga (language id `gugugaga`, extensions are case-insensitive); brackets, indentation and folding all follow indentation. The manifest also registers the decomposed spelling of `.ググ` (on macOS a filename may carry ク + ゛ as two code points), and a document whose suffix is not recognised is judged again on open after NFC normalisation.
- TextMate syntax highlighting `source.gugugaga`: 30 reserved tokens, integer and bit-string literals, names and punctuation.
- Reserved words, skeleton snippets and names already defined in this document, offered by context (top level / class body / statement / expression / call).
- Hovering a token shows what it means and which family it belongs to; this wording again uses only 咕/嘎/！/？/：/space/newline.
- Brings the **real** diagnostics of `咕咕嘎嘎 嘎嘎` into the editor: it decodes the 咕/嘎 diagnostic frames on stderr into Problems entries and squiggles.

**It is not**

- An interpreter, and it ships no runtime; running a program is still the CLI's job.
- An LSP implementation: no cross-file semantics, no go-to-definition, no rename, no find-references, no formatting.

## Installation

The `.vsix` is packaged by the project maintainer (the lead); install it with:

```bash
code --install-extension vscode/gugugaga-language.vsix      # 在仓库根执行
```

After installing, **just open a `.咕咕` / `.ググ` / `.gu` / `.gugugaga` file** (the status bar language mode then reads 咕咕嘎嘎语).

## Three feature areas

### 1. Language basics

Four extensions `.咕咕` `.ググ` `.gu` `.gugugaga` (case-insensitive), comments off (this language has none), auto-indent after a trailing `：` or `:`, outdent on `嘎嘎`/`嘎嘎嘎嘎`/`嘎嘎嘎嘎嘎嘎` (Japanese `ガガ` and English `GAGA` do the same), folding by indentation, word rules that accept 咕/グ/ぐ/GU and 嘎/ガ/が/GA at once, and syntax highlighting.

The three dialects side by side (all of them can be mixed inside one file and even inside one word; internally everything is normalized to 咕/嘎):

| Bit | Chinese | Japanese | English |
| --- | --- | --- | --- |
| 0 | 咕 | グ / ぐ | GU / gu |
| 1 | 嘎 | ガ / が | GA / ga |
| Punctuation | ！ ？ ： | ！ ？ ： | ! ? : |

`グ咕GU！` is a legal declaration head; completion candidates and hover explanations still come out in canonical Chinese, and the diagnostic body is Chinese human language too.

### 2. Editing aids

- Completion: at top level class heads and entry heads, in a class body fields and methods, in statement position statement starters, after a leading token such as `咕：`/`嘎嘎：` only expression starters and names, after `！？` only method names defined in this document.
- Snippets: skeletons for classes, methods, entries, fields, conditional blocks, loops, printing and the like.
- Hover: the token itself, its family, its Chinese meaning and a usage example.

### 3. Syntax diagnostics

On open, on save, on edit (350ms debounce by default) and when you run the command by hand, the extension runs `咕咕嘎嘎 嘎嘎 <文件>` once in the background. stderr carries no text, only **咕/嘎 diagnostic frames** (GGDIAG v1, format in `SPEC.md` §12); `src/diagnostics.js` ships its own zero-dependency decoder that turns a frame into `{行, 列, 码, 说明}` before handing it to VS Code. Diagnostics never execute the program, so only `E1xx / E2xx / E3xx` can show up.

## Diagnostics need a reachable CLI

The extension has no parser of its own; diagnostics come from the real interpreter. Locating the command is a three-step fallback:

| Priority | Condition | What actually runs |
| --- | --- | --- |
| 1 | The value of `gugugaga.cliPath` is not a known command name (`咕咕嘎嘎`/`ググガガ`/`gggg`/`gg`) and that path exists | Run it directly; if it ends in `.ts`, use `<nodePath> <that path> 嘎嘎 <文件>` |
| 2 | `bin/gg.ts` exists at the workspace root | `<nodePath> <workspace>/bin/gg.ts 嘎嘎 <文件>` |
| 3 | None of the above holds | The first of `咕咕嘎嘎` → `ググガガ` → `gggg` → `gg` that exists on PATH |

Notes:

- A relative `cliPath` resolves against the **current workspace root**; with no folder open it resolves against the process working directory.
- Only code 1–21 (that is `E1xx`~`E4xx`; note there is no `E4009`) become diagnostics; code 22 is a help frame and is not a problem; code 0/23/24 (usage error / file read failure / internal error) become one silent failure with no squiggle.
- A CLI that fails to start or times out **never pops a dialog** at you, and nothing is written to the output panel either (the panel allows only 咕/嘎): the full reason (exec, args, workspace, stack) goes to `console.error`, which you read in the console under Help → Toggle Developer Tools.

stderr carries a bit stream, not text. The shape of one frame (`SPEC.md` §12):

```text
magic 4（1010）| version 2（00）| code 8 | line 16 | col 16 | mlen 16 | msg(mlen×8) | end 3（110）
```

What lands in the panel is **not Chinese**: an entry's body is that frame's raw bit string (pure 咕/嘎) and the code column is left empty. Hand it to the sister project's translator to get human words:

```sh
ggt decode --diag <<< "嘎咕嘎咕咕咕…"     # → 2:7 E1001 非法字符“噶”（U+5676）
```

The code name, position and Chinese body are also written to the developer console. The extension itself neither generates nor translates any explanatory text.

## Settings (5)

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `gugugaga.cliPath` | string | `咕咕嘎嘎` | Interpreter entry point; give a path to pin a particular `gg.ts` or executable |
| `gugugaga.nodePath` | string | `node` | Node used to run a `.ts` interpreter (the executable name must be ASCII) |
| `gugugaga.checkOnChange` | boolean | `true` | Check automatically while editing (after the debounce) |
| `gugugaga.debounceMs` | number | `350` | How long editing must stop before a check fires (milliseconds) |
| `gugugaga.maxSteps` | integer or null | `null` | Reserved execution step cap; `check` does not execute the program, so this version does not use it |

## Commands (3)

| Command | What it does |
| --- | --- |
| `咕咕嘎嘎语：咕咕嘎嘎` | Run the current file: save it first, then send `咕咕嘎嘎 <文件>` to the integrated terminal. It appears in two places — the editor title bar button (▶, the codicon `$(play)`, so its colour follows the light and dark themes), and the editor context menu; only on files with one of the four extensions |
| `咕咕嘎嘎语：检查当前文件` | Run one check on the current document right away, without waiting for the debounce |
| `咕咕嘎嘎语：显示输出面板` | Open the output panel (its content is only 咕/嘎 phrases; paths and command lines are never printed) |

Running **does not capture output**: the real program bit stream stays in the terminal, so you can keep feeding stdin, pipe into `| ggt decode --bytes` and read the exit code. Terminal reuse: if a terminal named `咕咕嘎嘎` is still alive it is reused, otherwise a new one opens with the workspace root as its working directory (or the file's directory when there is no workspace). ASCII from the command line (`node`, `bin/gg.ts`, absolute paths) goes only to the developer console; the panel keeps a single pure-咕嘎 marker. No keybinding: an ASCII chord in the command palette would break the purity.

## The purity gate

The output panel is a user-visible surface, so it allows only 咕/嘎/！/？/：/space. Every `append()` goes through `isPureLine()` first: an impure line is neither written to the panel nor thrown, the full content falls back to `console.error` (the developer console). So questions like “why are there no diagnostics” require Help → Toggle Developer Tools.

## Known limitations

- No LSP: completion and hover are context scans plus regular expressions, with no cross-file ability whatsoever.
- Diagnostics depend on `node` and `咕咕嘎嘎` (or the workspace `bin/gg.ts`) being reachable; in a broken environment you silently get no diagnostics, and the reason only shows up in the developer console.
- To run a program use the terminal: `咕咕嘎嘎 程序.咕咕` (same for `.ググ` / `.gu` / `.gugugaga`). The extension only does `嘎嘎` (check); it neither executes programs nor shows bit-stream output.
- `gugugaga.maxSteps` has no effect yet (see the table above).
- An unsaved new buffer (untitled) has no file path and is not checked; save it as a `.咕咕` file first.
- Highlighting, bracket/folding configuration and snippets come from `syntaxes/`, `language-configuration.json` and `snippets/`; when such a file is missing VS Code skips that part and the extension itself does not crash.

## Development and tests

```bash
cd vscode/gugugaga
node --check src/extension.js
node --test "tests/*.test.js"
```

The tests never `require("vscode")` (it only exists inside the host); they run offline, with zero dependencies, on `node --test` alone.

## Layout

```text
package.json                      扩展清单
language-configuration.json       括号 / 缩进 / 折叠 / 单词规则
syntaxes/gugugaga.tmLanguage.json TextMate 语法
snippets/gugugaga.json            骨架片段
src/keywords.js                   保留词表（30 条，唯一 JS 真源）
src/completion.js                 上下文补全
src/hover.js                      悬停释义
src/cli.js                        CLI 调用桥（三级回退 + PATH 探测）
src/run.js                        运行按钮（命令行、引号、复用终端）
src/diagnostics.js                GGDIAG 帧解码 + 诊断采集
src/extension.js                  激活入口
tests/                            11 个文件、167 条断言（含 4 条真 CLI e2e、9 条纯净度闸）
```
