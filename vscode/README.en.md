<!-- i18n:begin -->
[中文](README.md) | **English** | [日本語](README.ja.md)

> This is an English translation. The Chinese [README.md](README.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# VS Code support for the Gugugaga language

This directory is the editor-side companion to the Gugugaga language (Chinese: 咕咕嘎嘎语): drop a `.咕咕` / `.ググ` / `.gu` / `.gugugaga` file into VS Code and you get highlighting, completion, hover and syntax checking. The three dialects (Chinese 咕嘎, Japanese グガ, English GU/GA) can be mixed inside one file and even inside a single word, and the extension accepts all of them. It is **not** an interpreter; to actually run a program you still use `咕咕嘎嘎 程序.咕咕`.

| Path | What it is |
| --- | --- |
| `gugugaga/` | The extension itself: manifest + 7 JS modules + syntax/snippet/language configuration + 11 test files |
| `gugugaga-language.vsix` | The packaged installer (19 entries, about 35 KB) |
| `build-vsix.sh` | Packaging script: zips up the files `gugugaga/` needs at runtime |
| `CONTRACT.md` | The interface contract and acceptance checklist agreed before any code was written (a historical document, with a revision log at the end) |

## Install

```bash
code --install-extension vscode/gugugaga-language.vsix      # 在仓库根执行
```

Or in VS Code open the Extensions view → `...` in the top right → **Install from VSIX** and pick this file. Once it is installed, open any `.咕咕` / `.ググ` / `.gu` / `.gugugaga` file and the language mode in the status bar shows `咕咕嘎嘎语`.

## Six capabilities

| Capability | What it actually does | Where it lives |
| --- | --- | --- |
| Language basics | Four suffixes (`.咕咕`/`.ググ`/`.gu`/`.gugugaga`, case-insensitive), auto-indent after a line ending in `：` or `:`, outdent on `嘎嘎`/`嘎嘎嘎嘎`/`嘎嘎嘎嘎嘎嘎` (Japanese ガガ and English GAGA work the same way), folding by indentation, word rules that accept 咕/グ/ぐ/GU and 嘎/ガ/が/GA at once, no comment syntax; the manifest also registers the decomposed spelling of `.ググ` (on macOS a filename may carry ク + ゛ as two code points), and a document whose suffix is not recognised is judged again at runtime after NFC normalisation | `gugugaga/language-configuration.json` |
| Highlighting | 30 reserved tokens + two literal kinds (a whole bit string gets one colour) + class/method/variable names + `！？`/`：` punctuation, in 35 flat rules; every rule accepts 咕/グ/ぐ/GU, 嘎/ガ/が/GA and both the full-width and the ASCII `！？：`/`!?:`; `GU`/`GA` are one token made of two letters | `gugugaga/syntaxes/gugugaga.tmLanguage.json` |
| Completion | Offers reserved words, skeleton snippets and names already defined in this document, depending on context; after `！？` it offers method names only | `gugugaga/src/completion.js` |
| Hover | Token meaning, which family it belongs to, and a usage example (the prose is written in 咕/嘎 as well) | `gugugaga/src/hover.js` |
| Diagnostics | On open/save/edit (350ms debounce) it really runs `咕咕嘎嘎 嘎嘎`, decodes the GGDIAG frames on stderr, and turns `E1xx`~`E3xx` into squiggles and Problems entries | `gugugaga/src/cli.js` + `src/diagnostics.js` |
| Run | The ▶ in the top right of the editor title bar and the context-menu item "咕咕嘎嘎！ 咕咕嘎嘎" — sends `咕咕嘎嘎 <文件>` to the integrated terminal (reusing the single terminal named `咕咕嘎嘎`), saving a dirty document first; the title-bar icon is the codicon `$(play)`, so its colour follows the light and dark themes | `gugugaga/src/run.js` |

The run button deliberately **does not capture output**: a program only emits a bit stream, and the terminal is the only place that can feed stdin, pipe into `| ggt decode --bytes`, and show the exit code. The command line takes the **implicit form** (just the file path, without the action word `嘎嘎`); when the command is assembled, arguments are quoted by POSIX/win32 rules, so a path with spaces does not fall apart. No shortcut key is bound: a command-palette entry carrying an ASCII chord would ruin the purity.

It also ships 8 snippets (class, constructor, method, entry point, field, condition, loop, new expression); the snippet bodies use nothing but 咕/嘎/！/？/：/space/newline.

## The three dialects

| Bit | Chinese | Japanese | English |
| --- | --- | --- | --- |
| 0 | 咕 | グ / ぐ | GU / gu |
| 1 | 嘎 | ガ / が | GA / ga |
| Punctuation | ！ ？ ： | ！ ？ ： | ! ? : |

You can mix them inside the same file and the same word (`グ咕GU！` is a single declaration head); internally everything is normalised to 咕/嘎, so completion candidates, hover text and diagnostic bodies stay in canonical Chinese. The suffixes `.咕咕` `.ググ` `.gu` `.gugugaga` are case-insensitive; besides `咕咕嘎嘎`, the command name also answers to the Japanese alias `ググガガ` and the legacy Latin names `gggg` and `gg`.

## Shell purity: which characters are 咕嘎, and which must stay ASCII

**Written in 咕嘎** (everything the user can see): `displayName`, command titles, the output panel's title and content, the Problems panel's source column (the diagnostic collection name `咕咕嘎嘎`), the group titles of the 5 settings, snippet `description`, the `detail`/`documentation` of completion candidates, hover text, and the default value of `cliPath` (`咕咕嘎嘎`). Before anything is written to the panel there is a runtime gate `isPureLine()`: it accepts 咕/嘎/！/？/：/space only, and anything else never reaches the panel but goes to the developer console; `tests/purity.test.js` uses mutation tests to prove the gate rejects.

**Must stay ASCII**: the extension `name`/`publisher`, `engines.vscode`, `main`, `activationEvents`, `languages[0].id`, `grammars[0].scopeName`, command ids, and setting ids with their `type`/`scope`. These are not copy but **matching keys in the VS Code schema** — extension identity, activation points, the TextMate `source.gugugaga` injection and the command-palette API all match on these strings, and a single changed character stops the extension from loading. By the same logic, the default value of `nodePath` can only be `node`.

What the Problems panel shows is **not Chinese either**: the body of a diagnostic entry is that diagnostic's **entire raw bit string** (pure 咕/嘎), and the code column is left empty (otherwise it would render ASCII such as `E1001`). To read actual words, hand that bit string to the sibling project's translator:

```sh
ggt decode --diag <<< "嘎咕嘎咕咕咕…"     # → 2:7 E1001 非法字符“噶”（U+5676）
```

The trade-off is deliberate: the visible surface left inside the editor stays as pure as the language itself, and human-readable text only ever comes out of the translator. The price is that a hover shows you a bit string — the extension deliberately does not translate for you on the side, because that would make the translator pointless. Chinese prose and code names still go to the developer console (`console.error`), so opening DevTools while debugging shows them.

## How diagnostics find the interpreter

The extension does not implement a parser itself — diagnostics come entirely from the real interpreter, so the command has to be reachable (three-level fallback):

| Priority | Condition | What actually runs |
| --- | --- | --- |
| 1 | The `gugugaga.cliPath` setting is not a known command name (`咕咕嘎嘎`/`ググガガ`/`gggg`/`gg`) and that path exists | Runs it directly; if it ends in `.ts`, `<nodePath> <path> 嘎嘎 <file>` |
| 2 | The workspace root has `bin/gg.ts` | `<nodePath> <workspace>/bin/gg.ts 嘎嘎 <file>` |
| 3 | None of the above | Takes the first that exists on PATH, in the order `咕咕嘎嘎` → `ググガガ` → `gggg` → `gg` |

The action word is the canonical `嘎嘎` (= check only, do not execute); `check` is a Latin alias the interpreter also reserves, and the extension does not use it.

A failure to start or a timeout shows no popup and writes nothing to the output panel (the panel only allows 咕/嘎): the full reason (exec, args, workspace, stack) goes to `console.error`, viewable in VS Code under Help → Toggle Developer Tools.

## Repacking

```bash
./vscode/build-vsix.sh                        # 输出 vscode/gugugaga-language.vsix
unzip -l vscode/gugugaga-language.vsix        # 看包内清单
unzip -p vscode/gugugaga-language.vsix extension.vsixmanifest   # 看 VSIX 清单
```

The script first pre-checks the required files, then reads name/version/publisher from `package.json` to generate `extension.vsixmanifest` and `[Content_Types].xml`, and finally packs everything with `zip -q -X -r`. It only takes runtime files (`src/*.js`, `syntaxes/`, `snippets/`, `language-configuration.json`, `package.json`, `README.md`); `tests/`, `CONTRACT.md` and `.vscodeignore` are not packed. It needs `zip` on the system.

## Tests

```bash
node --test "vscode/gugugaga/tests/*.test.js"   # 167 条，11 个文件
npm run test:all                                # 134 + 100 + 167 = 401 条
```

The 4 end-to-end cases really spawn `node bin/gg.ts 嘎嘎` and decode real frames, so they are not fake green; the 9 purity cases behaviour-test and mutation-test the runtime gate on the output panel; everything is offline, has zero dependencies, and does **not** `require("vscode")` (the host mock is intercepted through `Module._load`).

## Modules and size

| File | Lines | Responsibility |
| --- | --- | --- |
| `gugugaga/package.json` | 118 | Manifest: languages, grammars, snippets, 3 commands, menus, icons, 5 settings |
| `gugugaga/src/extension.js` | 379 | Activation entry point, debounce, command registration, output panel (including the `isPureLine` panel gate) |
| `gugugaga/src/cli.js` | 214 | CLI call bridge: three-level fallback, PATH probing, `execFile` wrapper |
| `gugugaga/src/diagnostics.js` | 245 | GGDIAG frame decoding → editor diagnostics |
| `gugugaga/src/completion.js` | 303 | Context scanning and candidate generation |
| `gugugaga/src/hover.js` | 167 | Token location and meaning |
| `gugugaga/src/keywords.js` | 316 | Reserved word table (30 entries, the single JS source of truth) |
| `gugugaga/src/run.js` | 151 | Run button: command-line parsing, quoting, terminal reuse |
| `gugugaga/syntaxes/gugugaga.tmLanguage.json` | 336 | 35 flat match rules |
| `gugugaga/tests/*.test.js` | 11 files / 167 cases | Includes 4 real CLI e2e cases (1 of them feeds `ggt decode --diag` back in) and 9 purity-gate tests |

## Known limitations

- No LSP: completion and hover are a context scan plus regular expressions; there is no cross-file semantics, no go-to-definition, no rename.
- Diagnostics depend on `node` and `咕咕嘎嘎` (or a workspace `bin/gg.ts`) being reachable; if the environment is not set up you silently get no diagnostics, and the reason is only visible in DevTools.
- `gugugaga.maxSteps` has no effect at the moment (`嘎嘎` does not execute the program).
- Untitled buffers have no path and are not checked.
- It has never been activated in a real VS Code host: highlighting, folding, snippet navigation, hover styling and the settings page are backed by static and offline evidence only.
- The `PATHEXT` branch of the PATH probe on Windows has not been exercised (this machine runs macOS).
