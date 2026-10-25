# 咕咕嘎嘎语 VS Code 扩展 · 实现契约（v1，冻结）

> 本文件是三个并行执行者的唯一契约来源。与 `SPEC.md` 冲突时以 `SPEC.md` 为准；与事实冲突时先查 `src/keywords.ts`。

## 0. 目标与非目标

**目标**：一个能装进 VS Code 的扩展 `vscode/gugugaga/`，提供

1. 后缀识别：`.咕咕` 文件打开即为本语言（语言 id `gugugaga`），括号/缩进/折叠按缩进工作。
2. 关键字着色：TextMate 语法 `source.gugugaga`，覆盖全部 30 个保留记号 + 字面量 + 名字 + 标点。
3. 自动补全：按上下文（顶层 / 类体 / 方法体 / 表达式位 / 调用位）给出保留词、骨架片段与本文档内已定义的名字。
4. 语法检验：调用**真正的**解释器做 `check`，把 `<文件>:<行>:<列>: <码> <说明>` 解析成 VS Code 诊断。
5. 悬停说明：鼠标停在记号上显示中文释义；片段（snippets）给骨架。

**非目标**：不实现 LSP 服务器、不做语义高亮/重命名/跳转定义、不打包 TypeScript 编译器、不新增任何 npm 依赖、不联网。

## 1. 目录与归属（谁写哪些文件）

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

- 所有人只写自己那几行文件；**不得**改仓库其它目录（`src/`、`tests/`、`examples/`、`SPEC.md` 等）。
- `.vsix` 打包由 lead 做，执行者不要自己 zip。

## 2. 标识符

| 项 | 值 |
| --- | --- |
| 扩展 id | `gugugaga.gugugaga-language`（publisher `gugugaga`，name `gugugaga-language`） |
| 语言 id | `gugugaga` |
| 后缀 | `.咕咕` |
| TextMate scopeName | `source.gugugaga` |
| 诊断集合名 | `gugugaga` |
| 命令 | `gugugaga.checkFile`、`gugugaga.showOutput` |
| 配置前缀 | `gugugaga.` |

## 3. 权威保留词表（从 `src/keywords.ts` 抄出，30 条 / 29 个词形）

| 词形 | 家族 | 内部名 | 含义 |
| --- | --- | --- | --- |
| 咕 | BARE | Print | 打印：`咕：<表达式>` |
| 嘎嘎 | BARE | Return | 返回：`嘎嘎：<表达式>` 或裸 `嘎嘎` |
| 嘎嘎嘎 | BARE | If | 条件：`嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎 | BARE | Else | 否则（无冒号无表达式） |
| 嘎嘎嘎嘎嘎 | BARE | While | 循环：`嘎嘎嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎嘎嘎 | BARE | This | 自己（仅实例方法/构造器可用） |
| 嘎嘎嘎嘎嘎嘎嘎 | BARE | ReadByte | 读入一个字节（UTF-8 字节流，EOF 为空） |
| 咕咕 | DECL | Class | 类头：`咕咕！ <类名>：` |
| 咕咕嘎 | DECL | Method | 方法头：`咕咕嘎！ <方法名>：<参数名>`（新类里同名方法是构造器） |
| 咕咕嘎嘎 | DECL | Entry | 入口头：`咕咕嘎嘎！ <入口名>` |
| 咕嘎嘎 | DECL | New | 新建：`咕嘎嘎！ <类名>？ <实参>…` |
| 咕咕 | ACT | Bind | 绑定/字段：`咕咕！？ <名字>：<初值>` |
| 咕嘎 | ACT | ExprStmt | 表达式语句：`咕嘎 <表达式>` |
| 咕？ | VAL | Add | 加（二元，前缀） |
| 咕咕？ | VAL | Sub | 减（二元） |
| 咕嘎？ | VAL | Mul | 乘（二元） |
| 咕咕咕？ | VAL | Div | 除（二元，除零 E4005） |
| 咕咕嘎？ | VAL | Mod | 取余（二元） |
| 咕嘎咕？ | VAL | Eq | 相等（二元，跨类型恒假） |
| 咕嘎嘎？ | VAL | Lt | 小于（二元） |
| 咕嘎嘎咕？ | VAL | Gt | 大于（二元） |
| 咕嘎咕咕？ | VAL | And | 与（二元，不短路） |
| 咕嘎咕嘎？ | VAL | Or | 或（二元，不短路） |
| 咕咕咕咕？ | VAL | Not | 非（一元） |
| 咕咕嘎咕？ | VAL | Neg | 取负（一元） |
| 嘎嘎嘎？ | VAL | IntLit | 整数字面量：`嘎嘎嘎？<位串>`（无符号二进制，无负号） |
| 嘎嘎嘎嘎？ | VAL | BitsLit | 位串字面量：`嘎嘎嘎嘎？<位串>`（长度随意） |
| 嘎嘎？ | VAL | True | 真（输出 8 个 嘎） |
| 嘎嘎咕？ | VAL | False | 假（输出 8 个 咕） |
| 嘎咕？ | VAL | Null | 空 |

配套事实（写补全/悬停时用得上）：

- 声明后缀 `！`（`咕咕！`、`咕咕嘎！`、`咕咕嘎嘎！`、`咕嘎嘎！`）；取值后缀 `？`；引导符 `：`；调用后缀 `！？`（`<接收者>！？ <方法名>`）。
- 行末的 `：` 若后面只剩空格，可省略（`咕咕！ 名字` 等价 `咕咕！ 名字：`）。
- 名字只能用 咕/嘎，且不得等于任何保留词形；可用名字长度：1 位 1 个（嘎）、2 位 0 个、3 位 2 个（嘎咕咕 嘎咕嘎）、4 位 9 个。**示例/测试里统一用这 4 个安全名字：`嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕`。**
- 注释：没有。除首行 shebang（CLI 预处理）外，源码里出现 咕/嘎/！/？/：/空格/换行 之外的字符即 E1001。
- 输出永远是裸位流（咕=0 嘎=1），没有字符串/数组。

## 4. 模块 API（全部 CommonJS：`module.exports`，禁止 ESM `import/export`，禁止 `"type": "module"`）

测试用 `node --test`（CJS 的 `.js`），运行方式：`cd vscode/gugugaga && node --test "tests/*.test.js"`。测试里 **不 require vscode**。

### 4.1 `src/keywords.js`（T6）

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

- `RESERVED` 必须与上表逐条一致（文本、家族、内部名）；`desc` 用中文一句话；`docs` 可含用法示例（markdown 单行）。

### 4.2 `src/completion.js`（T6）

```js
module.exports = { contextAt, completionsAt, collectNames }
// contextAt(text, offset) → { kind, indent, lineText, lineStart, prefix, inClass, inMethod }
//   kind ∈ "top" | "class" | "statement" | "expression" | "call"
// completionsAt(text, offset) → Array<{label, kind, detail, documentation, insertText, insertTextFormat}>
//   kind ∈ "keyword" | "snippet" | "name" | "class" | "method" | "field" | "operator"
// collectNames(text) → { classes: string[], methods: string[], fields: string[] }（正则扫描，用于补全/悬停）
```

上下文判定（必须按此实现，测试逐条覆盖）：

1. `prefix` = 当前行从行首到 `offset` 的文本；`indent` = 该行前导空格数。
2. `prefix` 全为空格（空行/刚缩进）：向上找最近的非空行 `head`；若 `head` 以 `：` 结尾，或以它的省略形式结尾，则本行属于 `head` 的块。
   - `indent === 0` → `kind = "top"`（只给 `咕咕！`、`咕咕嘎嘎！`）。
   - `head` 是类头（`咕咕！`）且 `indent > 0` → `kind = "class"`（给 `咕咕！？`、`咕咕嘎！`）。
   - 其余缩进行 → `kind = "statement"`。
3. `prefix` 恰以 `咕：` 结尾，或行首是 `咕：`/`嘎嘎：`/`嘎嘎嘎：`/`嘎嘎嘎嘎嘎：`/`嘎嘎：` 之后的位置 → `kind = "expression"`（只给表达式起始词 + 名字）。
4. `prefix` 以 `！？` 结尾 → `kind = "call"`（给本文档内的方法名 + 3 个常见名字？——只给方法名即可）。
5. 其它非空 `prefix` → `kind = "statement"`。

不变式（**必须有测试**）：

- 返回的每个 `label` 只由 咕 / 嘎 / ！ / ？ / ： / 空格 组成（即 ≤6 种符号，不含字母数字换行）。
- `insertTextFormat: 2`（snippet）的条目，其 `insertText` 去掉 `$1`/`${1:...}` 占位后，仍只含上述 6 种符号。
- `kind` 不越界；同一上下文内不出现重复 `label`。

### 4.3 `src/hover.js`（T6）

```js
module.exports = { hoverAt }
// hoverAt(text, offset) → { contents: string[], range: { start, end } } | null
//   contents 是 markdown 行（中文）；range 是 0-based 字符偏移
```

规则：取 `offset` 处最长的保留记号（含尾部 `！`/`？`，例如 `咕嘎嘎咕？` 不能只匹配 `咕嘎嘎？`）；否则取该处的名字（`collectNames` 命中 → 类/方法/字段）；都不是 → `null`。内容至少含：记号本身、家族、含义、以及该记号在 SPEC 里的用法一句。

### 4.4 `src/cli.js`（T7）

```js
module.exports = { resolveCommand, parseDiagnostics, runCheck }
// resolveCommand({ config, workspaceRoot }) → { exec, args, source }   // source ∈ "setting" | "repo" | "path"
// parseDiagnostics(stderr, filePath) → Array<{ line, column, code, message, sourceLine }>  // line/column 1-based
// runCheck({ exec, args, cwd, timeoutMs }) → Promise<{ code, stdout, stderr }>
```

`resolveCommand` 顺序：

1. 配置 `gugugaga.cliPath`（默认 `"gggg"`）：若非默认值且是绝对/相对存在的路径 → `{exec: cliPath, args: ["check", file], source: "setting"}`（若该文件以 `.ts` 结尾，exec 换成配置的 `gugugaga.nodePath`，默认 `node`，args 前面插入路径）。
2. 否则 `<workspaceRoot>/bin/gg.ts` 存在 → `{exec: nodePath, args: [<bin/gg.ts>, "check", file], source: "repo"}`。
3. 否则 `{exec: "gggg", args: ["check", file], source: "path"}`。

`parseDiagnostics` 必须吃下这两种**真实**输出（尾随换行、缩进原样）：

```text
/tmp/坏1.咕咕:2:7: E1001 非法字符“噶”（U+5676）
      咕：【噶】
```

```text
/tmp/坏2.咕咕:2:15: E2001 语法错误：这里需要一个取值，见到换行
      咕：咕？ 嘎嘎嘎？咕
```

以及必须**忽略**：`无法读取文件 /tmp/不存在.咕咕：ENOENT: ...`（没有 `行:列:` 的行）、空行、`【】` 标记行本身（`sourceLine` 取带标记那行，去掉前导缩进与【】，或原样保存均可——写清楚选了哪种）。

### 4.5 `src/diagnostics.js`（T7）

```js
module.exports = { collect }
// collect({ filePath, resolved, timeoutMs = 15000 }) → Promise<Array<{ line, column, code, message, sourceLine }>>
// 内部：runCheck(resolved) → parseDiagnostics(stderr)；CLI 超时/启动失败 → 返回 [] 并附 {error} 由调用方决定是否提示
```

诊断严重级别由扩展层统一设 Error；`E1xx/E2xx/E3xx` 与 `E4xx` 都是 error（`check` 不跑运行时，实际只会出 E1/E2/E3）。

### 4.6 `src/extension.js`（T7）

- `activate(context)`：注册 `DiagnosticCollection("gugugaga")`、`CompletionItemProvider`（触发字符 `咕`,`嘎`,`！`,`？`,`：`,` `）、`HoverProvider`、命令 `gugugaga.checkFile`（立即检查当前文档）与 `gugugaga.showOutput`（输出通道）。
- 文档变化 350ms 防抖；`onDidOpenTextDocument` / `onDidChangeTextDocument` / `onDidSaveTextDocument` 均触发；关闭文档时 `delete` 诊断。
- 只对 `languageId === "gugugaga"` 生效；自己找文件路径（`document.uri.fsPath`）与 `workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath`。
- 任何异常都 `console.error` 进输出通道，不弹窗打断。
- 文件必须**可被 `node --check` 通过**（即使无法 require vscode）。

## 5. TextMate 语法契约（T5）

文件 `syntaxes/gugugaga.tmLanguage.json`：`{ "scopeName": "source.gugugaga", "patterns": [ ... ] }`。

**硬约束（会被测试逐条验证）：**

1. `patterns` 是**扁平数组**，每项只允许 `{ "match": "...", "name": "..." }` 可选 `"captures": {"1": {"name": "..."}}`。**禁止** `begin`/`end`/`include`/`repository`/`while`。
2. 每条 `match` 必须能被 `new RegExp(pattern)` 编译（只用 JS 支持的语法，别用 `(?<=)`、`\b`、`\G`）。
3. 顺序即优先级：同一位置先命中者胜。长记号在其前缀之前（`咕嘎嘎咕？` 在 `咕嘎嘎？` 前；`嘎嘎嘎嘎？` 在 `嘎嘎嘎？` 前；`咕咕嘎嘎！` 在 `咕咕嘎！` 再在 `咕咕！` 前）。
4. 每条规则的 `name` 必须用下列 scope 之一（不允许自造）：

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

5. 高亮必须能覆盖 `examples/` 五个文件里的每一行：至少每行的保留记号都被命中（用下面的小驱动器自查）。

`tests/grammar.test.js` 必须实现一个 ~40 行的**迷你驱动器**：对一行文本，按 `patterns` 顺序用全局正则找**最左最长**匹配（同起点取先出现者），得到 `[{start, end, name}]`，重叠区域先到先得；然后断言一些具体位置/片段的 scope，例如：

```text
咕咕嘎嘎！ 嘎咕嘎嘎嘎咕   → 0..4 keyword.declaration.entry.gugugaga；5..12 entity.name.class?（入口名用 entity.name.function 也可，写清你的选择）
    咕：咕？ 嘎嘎嘎嘎？嘎嘎嘎咕咕嘎咕嘎 嘎嘎嘎嘎？嘎咕咕嘎咕嘎嘎嘎  → 咕： 关键字+标点；咕？ 算术；嘎嘎嘎嘎？ 位串字面量；其后的 咕嘎 串必须被 constant.numeric.bits 覆盖
```

另外：`language-configuration.json` 用 `"folding": {"offSide": true}`（缩进折叠）、`"indentationRules": {"increaseIndentPattern": "：\\s*$", "decreaseIndentPattern": "^\\s*(嘎嘎|嘎嘎嘎嘎|嘎嘎嘎嘎嘎嘎)"}`、`"comments": {}`（没有注释语法，**不要**写 lineComment/blockComment）、`"wordPattern": "[咕嘎！？：]+"`。

`snippets/gugugaga.json` 至少 5 条：类骨架 `咕咕！ ${1:嘎咕咕}：`、方法骨架、入口骨架、`咕咕！？` 字段、`嘎嘎嘎：` 条件块、`嘎嘎嘎嘎嘎：` 循环、`咕：` 打印。片段正文里的占位符只能用 `${n:嘎咕咕}` 这种形式（占位文本必须是合法名字）。

## 6. 测试与验收

- 每个执行者至少 15 条 `node:test` 断言（总计 ≥ 55），全部离线、零依赖、不 require vscode。
- T5 额外要求：**片段展开后必须真能跑** —— 把每条 snippet 的占位符替换成 §3 的 4 个安全名字，写成临时文件，用 `node bin/gg.ts check <文件>` 验证退出码 0（这条测试就是你交付里的硬证据）。
- T7 额外要求：用**真实的** CLI 造一个出错文件，验证 `parseDiagnostics` + `collect` 端到端拿到 `E1001`，行列为 `2:7`。
- 全部测试命令：`cd vscode/gugugaga && node --test "tests/*.test.js"`。
- 交付回报必须给出：你写的文件与行数、测试条数与通过数、你实际跑过的命令与输出片段、以及你**没有**验证到的部分（诚实写）。

## 7. 修订记录（实现期确定的偏差，均已落地并有测试钉住）

契约是先写的，实现时有三处必须改口，另有两处执行者做了更优选择，一处是集成时抓到的类型契约漏洞。逐条记下，避免以后按旧契约复审。

1. **诊断第二行装订线是 2 个空格**，不是 4 个。见 `src/errors.ts:73` 的 `return head + "\n  " + markColumn(line, err.pos.col)`；`sourceLine` 保留语言源码自身的缩进、剥掉【】标记，编辑器侧直接拿它做诊断行展示。
2. **`collect()` 返回 `{issues, error}`，不是纯数组**。纯数组表达不了「CLI 起不来 / 超时 / 命令找不到」这类非诊断原因，所以额外挂一个 `error` 字段（成功时为 `null`）。
3. **`resolveCommand({config, workspaceRoot, file})` 多收一个 `file`**。三级回退最终要拼出 `check <文件>` 的完整 args，只给工作区根拼不出来；返回值的 `source` 取 `"setting"|"repo"|"path"`，供输出面板显示回退来源。
4. **`keywords.js` 的 `TOKEN_INDEX` 是超集**：除了 §3 的 30 条保留记号，还登记了「词干+！」「词干+！？」以及 `咕：` 等完整源码拼写，因此 `isReserved("咕：") === true`。`RESERVED` 仍严格 30 条、`text` 必须逐字等于 §3 表。理由：补全与悬停要按源码拼写查，而 `src/keywords.ts` 里 VAL 的键是**不带 `？` 的词干**（真正的唯一键 21 个），tokenizer 事后补 `？`。
5. **补全的 `kind` 必须是 `vscode.CompletionItemKind` 数值，不许在扩展层做字符串映射**。`completion.js` 与 `extension.js` 最初各写一套（一边返回数值、一边按 `"snippet"` 字符串 switch），拼起来全部落到 `Variable` 图标。改为 `new vscode.CompletionItem(item.label, item.kind)` 直接透传，并在 `tests/manifest.test.js` 里用静态断言钉死（源码不得出现 `completionKind(` 与 `case "snippet"`）。教训：跨模块的「枚举 vs 字符串」契约必须写进契约本身，否则两个执行者各自正确、拼起来错。
6. **语法规则一律带左侧边界捕获组**（`(^| +)` / `(^| +|：)`，组 1 上色为 `punctuation.separator.colon`）。契约没写这一条，但 TextMate 禁 lookbehind，不锚定必然错位。配套另加 4 条「名字护栏」规则并带负向前瞻（排除 12 个运算符词干、`嘎嘎嘎嘎`/`嘎嘎嘎`/`嘎嘎咕`、`嘎咕`），否则 `咕嘎！？` 的 `嘎` 会被名字规则吃掉、`咕咕？` 会在取值名里被当成减法。

### 第二次修订（纯净外壳改造之后）

解释器把 stderr 全改成 GGDIAG v1 位流（`SPEC.md` §12）之后，契约里「诊断是两行文本」的前提整体作废。以下六条取代对应旧条款：

7. **诊断来源从文本变成帧**。`src/diagnostics.js` 自带零依赖解码器：头 6 位 = magic `1010` + version `00`、code 8、line 16、col 16、mlen 16、msg = mlen×8（逐字节 MSB 在前 → `Buffer.toString("utf8")`）、end 3 = `110`。头不符时前移 1 位继续找，头匹配但尾错或位不够则前移 6 位重扫。§4.4 里 `parseDiagnostics(text)` 的旧语义（抓 `<文件>:<行>:<列>: …`）作废；`collect()` 的 `{issues, error}` 形状保留。第 1 条修订（2 空格装订线）随之退休。
8. **`issues` 只装 code 1–21**（`E1001`…`E4012`，无 `E4009`），元素为 `{line, column, code, message, detail}`（第 14 条把 `message` 改成了位串），不再有 `sourceLine`。code 22（帮助）不算问题；0/23/24（用法错误/读文件失败/内部错误）变成 `{issues: [], error: "<外壳码名> <帧正文>"}`。
9. **`resolveCommand` 的 PATH 回退不再是写死的 `gggg`**：按 `咕咕嘎嘎` → `gggg` → `gg` 探测第一个存在的（零依赖自实现，Windows 下补 `PATHEXT`），`source` 仍取 `"setting"|"repo"|"path"`。第一步的判据从「不等于默认值」改成「不在已知命令名集合里」，于是旧设置值 `gggg` 仍按命令名走。
10. **动作词改用规范写法 `嘎嘎`**，args 为 `["嘎嘎", 文件]`（`check` 是解释器保留的拉丁别名，扩展不用）。`gugugaga.cliPath` 的默认值改为 `咕咕嘎嘎`。
11. **用户可见的字符串一律纯咕嘎**：`displayName`、命令标题、输出面板标题与内容、设置分组标题、片段 `description`、补全的 `detail`/`documentation`、悬停 label/hint。原输出面板里拼的 `uri`、`exec`、`args`、`workspaceRoot`、`err.stack` 全部退到 `console.error`。代价要认清：排查「诊断不出来」现在必须开开发者工具。
12. **结构性 ASCII 不动**：扩展 `name`/`publisher`/`engines.vscode`/`main`/`activationEvents`、`languages[0].id`、`grammars[0].scopeName`、命令 id、设置 id 与 `type`/`scope`/`minimum`、`nodePath` 默认值 `node`。它们是 VS Code schema 的匹配键，不是文案。帧正文（`message`）保留原文人话，因为按 §12 那正是帧的定义。

另外记一笔边界：清 skip 时改动了 `tests/diagnostics.test.js` 与 `tests/manifest.test.js:69`，原本不在授权文件列表里 —— 因为「`skipped 0` 且 `fail 0`」与「改测试而不是改主意」两条要求同时成立时，这两处必须动。

13. **输出面板有了运行时闸**。复审发现 `extension.js` 仍把 `result.error`（中文外壳码名 + 帧里的 ASCII 路径）写进面板，与「面板纯咕嘎」自相矛盾。现在 `append()` 先过 `isPureLine()`（只认 咕/嘎/！/？/：/空格）：不纯的行不写面板、不抛异常，完整内容走 `console.error`；失败路径只在面板留一行纯咕嘎标记。`COLLECTION_NAME` 也从 `"gugugaga"` 改成 `"咕咕嘎嘎"`（它会显示在 Problems 面板的来源列）。（这一条结尾关于 `diagnostic.code` 的决定已被第 14 条推翻。）回归测试在 `tests/purity.test.js`（9 条，含变异验证：把泄漏改回去会红）。

**边界补记**：本轮另有两处越界但必要 —— `tests/diagnostics.test.js`（解 skip）与 `tests/manifest.test.js:69`（默认值断言），理由同前：`skipped 0` + `fail 0` 与「改测试不改主意」同时成立时必须动。

14. **Problems 面板也全纯了**。此前 `diagnostic.message` 是帧正文的中文原文、`diagnostic.code` 是 `E1001`，于是用户可见面里还漏着中文与 ASCII。现在：
   - `decodeFrames()` 额外返回 `bits`（该帧的原始位串，纯 咕/嘎；新增 `bitsText()` 把内部 0/1 位数组打回源码拼写）；
   - `parseDiagnostics()` 的 `message` = **整帧位串**（交给 `ggt decode --diag` 即可还原），中文原文移到 `detail`，`code` 保留码名但**不再写进 `Diagnostic`**；
   - `extension.js` 的 `toDiagnostic()` 删掉 `diagnostic.code = issue.code`，改为把 `code + 位置 + detail` 打进 `console.error`；
   - 回归：`tests/cli.test.js` 新增 1 条真 e2e（`issues[0].message` 喂 `translator/bin/ggt.ts decode --diag`，断言还原出 `E1001` / `2:7` / 中文），`tests/purity.test.js` 断言 `diags[0].code === undefined` 且 `message` 过 `isPureLine()`。扩展测试 127 → 128。

15. **运行按钮（`gugugaga.run`）**。用户要求「像 `python x.py` 一样在编辑器里直接跑」，并选定输出投向**集成终端**（而非输出面板或 webview）。落地：
   - `src/run.js` 新增（不 `require("vscode")`，vscode 由调用方注入，纯 Node 可测）：`quoteArg` / `buildCommandLine` / `resolveRun` / `findTerminal` / `runInTerminal` / `runFile`，常量 `TERMINAL_NAME = "咕咕嘎嘎"`、`REASON` 四条纯咕嘎原因串。
   - `src/cli.js` 的 `checkArgs(file, action)` 多收 `action`：省略 = `嘎嘎`（check），`null` = **隐式执行**（args 只有一个文件路径）。`resolveCommand` 透传 `opts.action`。这条改动的理由：运行必须是隐式执行，否则终端里跑的是「先检查一遍」，程序根本不执行。
   - 命令 `gugugaga.run`，标题 `咕咕嘎嘎！ 咕咕嘎嘎`，`icon` 指向 `media/run.svg`（▶，`currentColor` 随主题；文件名必须 ASCII —— zip 不给非 ASCII 路径写 UTF-8 标志位，解包会按 cp437 成乱码、图标 404）；菜单三处 `editor/title`、`editor/title/run`、`editor/context`，`when` 恒为 `editorLangId == gugugaga`。**不绑快捷键**：命令面板里出现 ASCII 和弦会破坏外壳纯净度。
   - `runFile` 行为：语言不是 `gugugaga` → `REASON.wrongLanguage`；无文档 → `noEditor`；`uri.scheme !== "file"` → `notFile`；脏文档先 `await document.save()`，仍脏 → `saveFailed`。成功时返回 `{ok:true, line, source, reused}`，`extension.js` 把 `line` 打进 `console.error`（含 ASCII，只进 DevTools），面板只 append 一行纯咕嘎 `咕咕嘎嘎 咕咕嘎嘎`。
   - 终端：复用 `name === "咕咕嘎嘎"` 且 `!exitStatus` 的终端，否则用 `createTerminal({name, cwd})` 新建（cwd = 工作区根，无工作区则文件所在目录）；随后 `show(true)` + `sendText(line, true)`。
   - 打包：`build-vsix.sh` 预检清单加 `media/run.svg`、暂存目录加 `media/`、`cp media/*.svg`、`[Content_Types].xml` 加 `svg → image/svg+xml`。
   - 测试：`tests/run.test.js` 新增 15 条（引号转义两平台、`buildCommandLine`、`resolveRun` 三条路径、终端复用与新建、`runFile` 四类边界、原因串纯度、`extension.js` 静态注册断言）；`tests/manifest.test.js` 的 commands 从两个改三个并新增 menus/icon 两条。扩展测试 128 → 146。
   - 已知限制：Windows 分支（`cmd.exe` 引号翻倍）只做了单元测试、没在 Windows 上实跑；终端里的位流仍要人工接 `ggt decode`。

### 第四次修订（多方言）

16. **三种方言都要像专有语言支持**。`SPEC.md` §1 定下 咕/グ/ぐ/GU 与 嘎/ガ/が/GA 两「位」的四写法、标点全角半角等价、同文件同词可混排，编辑器侧全部跟随：
   - **清单**：`languages[0].extensions` = `[".咕咕", ".ググ", ".gu", ".gugugaga"]`（大小写不敏感），`aliases` 加 `ググガガ`；命令 id、设置 id、`cliPath` 默认值 `咕咕嘎嘎` 全部不动。`aliases` 是语言选择器里的名字，允许日语写法；其余用户可见文案仍受第 11 / 13 / 14 条约束（面板纯咕嘎、诊断正文是位串）。
   - **归一化只在 `keywords.js`**：新增 `normalizeWithOffsets()` → `{text, starts, ends}`、`normalizeText()`、`canonicalOffsetOf()`、`sourceStartOf()`、`sourceEndOf()`、`dialectsOf()`。`isReserved` / `describe` / `BY_TEXT` 先归一化成 咕/嘎 再查表（`BY_TEXT` 导出为 Proxy，任意方言键命中规范词形，`Object.keys` 仍是 29 个规范键）。补全与悬停拿到的是规范串，回写编辑器位置时用 `sourceStartOf/EndOf` 换回原文偏移 —— 英语位名宽 2，偏移换算不能靠 `+1`。
   - **语法**：35 条规则里每一位展开成 `(?:咕|グ|ぐ|[Gg][Uu])` / `(?:嘎|ガ|が|[Gg][Aa])`，标点写成 `[！!]` `[？?]` `[：:]`，缩进写在 match 里的空格改成 `[ 　]`。展开**全用非捕获组**，所以 `captures` 的编号一个都没变（组 1 仍上标点色、组 2 名字、组 3 后缀）。英语 `GU`/`GA` 是两个字母一个记号：`((?:…)+)` 的重复组让它们连成一个 token，不会被拆开。`tests/grammar.test.js` 用 `canonicalMatch()` 把展开还原成改造前的原始 pattern，于是「长记号排在短记号之前」的 11 对顺序断言仍然有效。
   - **language-configuration.json**：`wordPattern` 认 咕/嘎/グ/ガ/ぐ/が/英文字母/全角与半角 `！？：`；`increaseIndentPattern` 同时认 `：` 与 `:`；`decreaseIndentPattern` 用 `(?:嘎|ガ|が|[Gg][Aa]){2}(…){0,2}` 覆盖 2/4/6 位收尾词。
   - **CLI 探测顺序**：`咕咕嘎嘎` → `ググガガ` → `gggg` → `gg`（`src/cli.js` 的 `CLI_CANDIDATES`，win32 的 `PATHEXT` 分支保留）。`src/run.js` 复用 `cli.resolveCommand`，因此不用另写名单。
   - **测试**：扩展测试 147 → 160（`keywords`/`completion`/`hover`/`grammar`/`manifest` 五处各加方言用例；`grammar` 的 29 条保留记号逐条在日语/英语下复验，另有混排行、`GU`/`GA` 不拆、半角标点、三方言样例行逐非空格字符全覆盖）。`tests/purity.test.js` 的 9 条面板纯净度断言一条没改、全部继续通过：面板仍是中文位名，不跟随方言。
   - **已知限制**：语法规则按字符类别展开，规则行变长但条数不变（仍 35 条）；`GU`/`GA` 大小写混写（`Gu`、`gA`）由语法接受，但同一记号内混大小写没有专门的用例。
17. **运行按钮的黑图标、`.ググ` 的分解后缀与日语示例的空格**（用户实测三处）。`icon` 从 `media/run.svg` 换成 codicon `$(play)`：SVG 里的 `currentColor` 作为 `<img>` 载入时没有 CSS 上下文，会被解析成黑色，而 codicon 由主题着色；`media/` 目录、打包脚本里的 svg 预检与 `cp`、`[Content_Types].xml` 的 svg 行一并删掉。`languages[0].extensions` 追加 `.ググ` 的分解写法（`ク` 与 `゛` 两个码位）：清单是字面比对，macOS 文件名可能是分解形式，预组合项永不匹配。运行时兜底新增 `src/language.js`（纯函数，不 require vscode）：`isProgramFile()` 先 `normalize("NFC").toLowerCase()` 再比四种后缀；`extension.js` 的 `adoptDocument()` 在激活与 `onDidOpenTextDocument` 时调用，认出后缀就 `setTextDocumentLanguage` 并顺手检查一次；`activationEvents` 追加 `onStartupFinished`，冷启动时已打开的文档也被接住。日语示例的分隔空格全部改成全角空格，`SPEC.md` / `SPEC.ja.md` / `SPEC.en.md` / `TUTORIAL.md` / `TUTORIAL.en.md` 的同一段代码同步。扩展测试 160 → 167（新增 `tests/language.test.js` 5 条，`manifest` 加 icon、后缀、激活三类断言）。另外删掉了 `editor/title/run` 那一处菜单贡献：它会在标题栏里再渲染一个 ▶，同一条命令于是在同一页面上出现两个按钮——现在只留 `editor/title`（右上角）与 `editor/context`（右键菜单）。
