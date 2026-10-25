<!-- i18n:begin -->
[中文](CONTRACT.md) ｜ **日本語** ｜ [English](CONTRACT.en.md)

> 本ファイルは日本語訳です。内容の正本は中国語版 [CONTRACT.md](CONTRACT.md) で、差分があれば中国語版が優先します。
<!-- i18n:end -->

# ググガガ語 VS Code 拡張機能 · 実装契約（v1、凍結）

> 本ファイルは三人の並行実装者にとって唯一の契約ソースです。`SPEC.md` と衝突する場合は `SPEC.md` を優先し、事実と衝突する場合はまず `src/keywords.ts` を確認してください。

## 0. 目標と非目標

**目標**：VS Code にインストールできる拡張機能 `vscode/gugugaga/` を提供し、次の機能を実現します。

1. 拡張子の認識：`.咕咕` ファイルを開けばそのまま本言語（言語 id `gugugaga`）として扱われ、括弧・インデント・折りたたみがインデント基準で動作します。
2. キーワードの色分け：TextMate 文法 `source.gugugaga` で、30 個の予約トークンすべて + リテラル + 名前 + 記号をカバーします。
3. 自動補完：コンテキスト（トップレベル / クラス本体 / メソッド本体 / 式の位置 / 呼び出し位置）に応じて、予約語・骨組みスニペット・本ドキュメント内で定義済みの名前を提示します。
4. 構文検査：**本物の**インタプリタに `check` を実行させ、`<文件>:<行>:<列>: <码> <说明>` を VS Code の診断に変換します。
5. ホバー説明：記号にマウスを置くと中国語の語義を表示します。スニペット（snippets）は骨組みを提供します。

**非目標**：LSP サーバは実装せず、意味的ハイライト / 名前変更 / 定義ジャンプも行わず、TypeScript コンパイラも同梱せず、npm 依存も一切追加せず、ネットワークにも接続しません。

## 1. ディレクトリと担当（誰がどのファイルを書くか）

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

- 全員が自分の担当する数行のファイルだけを書きます。リポジトリの他のディレクトリ（`src/`、`tests/`、`examples/`、`SPEC.md` など）は**変更してはいけません**。
- `.vsix` のパッケージングは lead が行います。実装者が自分で zip を作らないでください。

## 2. 識別子

| 項目 | 値 |
| --- | --- |
| 拡張機能 id | `gugugaga.gugugaga-language`（publisher `gugugaga`、name `gugugaga-language`） |
| 言語 id | `gugugaga` |
| 拡張子 | `.咕咕` |
| TextMate scopeName | `source.gugugaga` |
| 診断コレクション名 | `gugugaga` |
| コマンド | `gugugaga.checkFile`、`gugugaga.showOutput` |
| 設定プレフィックス | `gugugaga.` |

## 3. 正規の予約語表（`src/keywords.ts` から転記、30 件 / 29 個の語形）

| 綴り | ファミリ | 内部名 | 意味 |
| --- | --- | --- | --- |
| 咕 | BARE | Print | 表示：`咕：<表达式>` |
| 嘎嘎 | BARE | Return | 返す：`嘎嘎：<表达式>` または裸の `嘎嘎` |
| 嘎嘎嘎 | BARE | If | 条件：`嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎 | BARE | Else | そうでなければ（コロンも式もなし） |
| 嘎嘎嘎嘎嘎 | BARE | While | ループ：`嘎嘎嘎嘎嘎：<条件>` |
| 嘎嘎嘎嘎嘎嘎 | BARE | This | 自分自身（インスタンスメソッド / コンストラクタでのみ使用可） |
| 嘎嘎嘎嘎嘎嘎嘎 | BARE | ReadByte | 一バイト読み込み（UTF-8 バイト列、EOF では空） |
| 咕咕 | DECL | Class | クラスヘッダ：`咕咕！ <类名>：` |
| 咕咕嘎 | DECL | Method | メソッドヘッダ：`咕咕嘎！ <方法名>：<参数名>`（新クラス内の同名メソッドはコンストラクタ） |
| 咕咕嘎嘎 | DECL | Entry | エントリヘッダ：`咕咕嘎嘎！ <入口名>` |
| 咕嘎嘎 | DECL | New | 新規作成：`咕嘎嘎！ <类名>？ <实参>…` |
| 咕咕 | ACT | Bind | 束縛 / フィールド：`咕咕！？ <名字>：<初值>` |
| 咕嘎 | ACT | ExprStmt | 式文：`咕嘎 <表达式>` |
| 咕？ | VAL | Add | 加算（二項、前置） |
| 咕咕？ | VAL | Sub | 減算（二項） |
| 咕嘎？ | VAL | Mul | 乗算（二項） |
| 咕咕咕？ | VAL | Div | 除算（二項、ゼロ除算は E4005） |
| 咕咕嘎？ | VAL | Mod | 剰余（二項） |
| 咕嘎咕？ | VAL | Eq | 等値（二項、型を跨げば常に偽） |
| 咕嘎嘎？ | VAL | Lt | 小なり（二項） |
| 咕嘎嘎咕？ | VAL | Gt | 大なり（二項） |
| 咕嘎咕咕？ | VAL | And | 論理積（二項、短絡しない） |
| 咕嘎咕嘎？ | VAL | Or | 論理和（二項、短絡しない） |
| 咕咕咕咕？ | VAL | Not | 否定（単項） |
| 咕咕嘎咕？ | VAL | Neg | 符号反転（単項） |
| 嘎嘎嘎？ | VAL | IntLit | 整数リテラル：`嘎嘎嘎？<位串>`（符号なし二進、負号なし） |
| 嘎嘎嘎嘎？ | VAL | BitsLit | ビット列リテラル：`嘎嘎嘎嘎？<位串>`（長さは任意） |
| 嘎嘎？ | VAL | True | 真（嘎 を 8 個出力） |
| 嘎嘎咕？ | VAL | False | 偽（咕 を 8 個出力） |
| 嘎咕？ | VAL | Null | 空 |

付随する事実（補完 / ホバーを書くときに使います）：

- 宣言の接尾辞 `！`（`咕咕！`、`咕咕嘎！`、`咕咕嘎嘎！`、`咕嘎嘎！`）、値の接尾辞 `？`、導出記号 `：`、呼び出しの接尾辞 `！？`（`<接收者>！？ <方法名>`）。
- 行末の `：` は、後ろが空白だけなら省略できます（`咕咕！ 名字` は `咕咕！ 名字：` と等価）。
- 名前は 咕/嘎 だけで書き、どの予約語形とも一致してはいけません。使える名前の長さ：1 ビット 1 個（嘎）、2 ビット 0 個、3 ビット 2 個（嘎咕咕 嘎咕嘎）、4 ビット 9 個。**サンプル / テストではこの 4 つの安全な名前を統一して使います：`嘎咕咕`、`嘎咕嘎`、`嘎咕嘎嘎`、`嘎嘎咕咕`。**
- コメント：ありません。先頭行の shebang（CLI の前処理）を除き、ソースに 咕/嘎/！/？/：/空白/改行 以外の文字が現れれば E1001 です。
- 出力は常に裸のビットストリーム（咕=0 嘎=1）で、文字列も配列もありません。

## 4. モジュール API（すべて CommonJS：`module.exports`、ESM の `import/export` は禁止、`"type": "module"` も禁止）

テストは `node --test`（CJS の `.js`）を使い、実行方法は `cd vscode/gugugaga && node --test "tests/*.test.js"` です。テスト内で **vscode を require しません**。

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

- `RESERVED` は上表と一件ずつ一致していなければなりません（テキスト・ファミリ・内部名）。`desc` は中国語の一文で書き、`docs` には用法の例（markdown の一行）を含めてかまいません。

### 4.2 `src/completion.js`（T6）

```js
module.exports = { contextAt, completionsAt, collectNames }
// contextAt(text, offset) → { kind, indent, lineText, lineStart, prefix, inClass, inMethod }
//   kind ∈ "top" | "class" | "statement" | "expression" | "call"
// completionsAt(text, offset) → Array<{label, kind, detail, documentation, insertText, insertTextFormat}>
//   kind ∈ "keyword" | "snippet" | "name" | "class" | "method" | "field" | "operator"
// collectNames(text) → { classes: string[], methods: string[], fields: string[] }（正则扫描，用于补全/悬停）
```

コンテキストの判定（このとおりに実装し、テストで一件ずつカバーします）：

1. `prefix` = 現在行の行頭から `offset` までのテキスト、`indent` = その行の先頭空白の数。
2. `prefix` がすべて空白（空行 / インデントしただけ）：上方向で最も近い非空行 `head` を探します。`head` が `：` もしくは `：` の省略形で終わっていれば、この行は `head` のブロックに属します。
   - `indent === 0` → `kind = "top"`（`咕咕！`、`咕咕嘎嘎！` だけを出します）。
   - `head` がクラスヘッダ（`咕咕！`）で `indent > 0` → `kind = "class"`（`咕咕！？`、`咕咕嘎！` を出します）。
   - それ以外のインデント行 → `kind = "statement"`。
3. `prefix` がちょうど `咕：` で終わる場合、または行頭が `咕：`/`嘎嘎：`/`嘎嘎嘎：`/`嘎嘎嘎嘎嘎：`/`嘎嘎：` の直後の位置 → `kind = "expression"`（式の開始語 + 名前だけを出します）。
4. `prefix` が `！？` で終わる → `kind = "call"`（本文書内のメソッド名 + よく使う名前 3 つ？——メソッド名だけで十分です）。
5. それ以外の非空 `prefix` → `kind = "statement"`。

不変条件（**テストが必須**）：

- 返す各 `label` は 咕 / 嘎 / ！ / ？ / ： / 空白 だけで構成される（つまり 6 種類以下の記号で、英数字と改行を含まない）。
- `insertTextFormat: 2`（snippet）の項目は、`insertText` から `$1`/`${1:...}` のプレースホルダを除いても、上記 6 種類の記号だけを含む。
- `kind` が範囲外にならず、同じコンテキスト内で `label` が重複しない。

### 4.3 `src/hover.js`（T6）

```js
module.exports = { hoverAt }
// hoverAt(text, offset) → { contents: string[], range: { start, end } } | null
//   contents 是 markdown 行（中文）；range 是 0-based 字符偏移
```

規則：`offset` の位置で最も長く一致する予約トークン（末尾の `！`/`？` を含む。たとえば `咕嘎嘎咕？` を `咕嘎嘎？` だけで照合してはいけません）を取り、なければその位置の名前（`collectNames` に一致 → クラス / メソッド / フィールド）を取ります。どちらでもなければ `null`。内容には少なくとも、記号そのもの・ファミリ・意味・およびその記号の SPEC 上の用法を一文含めます。

### 4.4 `src/cli.js`（T7）

```js
module.exports = { resolveCommand, parseDiagnostics, runCheck }
// resolveCommand({ config, workspaceRoot }) → { exec, args, source }   // source ∈ "setting" | "repo" | "path"
// parseDiagnostics(stderr, filePath) → Array<{ line, column, code, message, sourceLine }>  // line/column 1-based
// runCheck({ exec, args, cwd, timeoutMs }) → Promise<{ code, stdout, stderr }>
```

`resolveCommand` の順序：

1. 設定 `gugugaga.cliPath`（既定値 `"gggg"`）：既定値ではなく、絶対パスまたは相対パスとして実在するパスなら → `{exec: cliPath, args: ["check", file], source: "setting"}`（そのファイルが `.ts` で終わる場合は、exec を設定 `gugugaga.nodePath`（既定値 `node`）に差し替え、args の先頭にパスを挿入します）。
2. そうでなく `<workspaceRoot>/bin/gg.ts` が存在すれば → `{exec: nodePath, args: [<bin/gg.ts>, "check", file], source: "repo"}`。
3. そうでなければ `{exec: "gggg", args: ["check", file], source: "path"}`。

`parseDiagnostics` は次の 二種類の**実出力**をそのまま受け取れなければなりません（末尾の改行・インデントはそのまま）：

```text
/tmp/坏1.咕咕:2:7: E1001 非法字符“噶”（U+5676）
      咕：【噶】
```

```text
/tmp/坏2.咕咕:2:15: E2001 语法错误：这里需要一个取值，见到换行
      咕：咕？ 嘎嘎嘎？咕
```

さらに次を**無視**しなければなりません：`无法读取文件 /tmp/不存在.咕咕：ENOENT: ...`（`行:列:` のない行）、空行、`【】` の付いた行そのもの（`sourceLine` は印の付いた行から先頭のインデントと【】を除いて取る、そのまま保存する、のどちらでもよい——どちらを選んだか明記してください）。

### 4.5 `src/diagnostics.js`（T7）

```js
module.exports = { collect }
// collect({ filePath, resolved, timeoutMs = 15000 }) → Promise<Array<{ line, column, code, message, sourceLine }>>
// 内部：runCheck(resolved) → parseDiagnostics(stderr)；CLI 超时/启动失败 → 返回 [] 并附 {error} 由调用方决定是否提示
```

診断の重要度は拡張機能側で一律 Error にします。`E1xx/E2xx/E3xx` も `E4xx` も error です（`check` は実行時を走らせないため、実際に出るのは E1/E2/E3 だけです）。

### 4.6 `src/extension.js`（T7）

- `activate(context)`：`DiagnosticCollection("gugugaga")`、`CompletionItemProvider`（トリガー文字 `咕`,`嘎`,`！`,`？`,`：`,` `）、`HoverProvider`、コマンド `gugugaga.checkFile`（現在のドキュメントを即座に検査）と `gugugaga.showOutput`（出力チャネル）を登録します。
ドキュメントの変化は 350ms のデバウンスで、`onDidOpenTextDocument` / `onDidChangeTextDocument` / `onDidSaveTextDocument` のいずれでも起動し、ドキュメントを閉じたら診断を `delete` します。
- `languageId === "gugugaga"` のときだけ動作し、ファイルパス（`document.uri.fsPath`）と `workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` は自分で求めます。
- 例外はすべて `console.error` で出力チャネルに出し、ポップアップで中断しません。
- ファイルは **`node --check` を通せなければなりません**（vscode を require できなくても）。

## 5. TextMate 文法の契約（T5）

ファイル `syntaxes/gugugaga.tmLanguage.json`：`{ "scopeName": "source.gugugaga", "patterns": [ ... ] }`。

**厳格な制約（テストで一件ずつ検証されます）：**

1. `patterns` は**フラットな配列**で、各項目は `{ "match": "...", "name": "..." }` と任意の `"captures": {"1": {"name": "..."}}` だけを許します。`begin`/`end`/`include`/`repository`/`while` は**禁止**です。
2. 各 `match` は `new RegExp(pattern)` でコンパイルできなければなりません（JS が対応する文法だけを使い、`(?<=)`、`\b`、`\G` は使わないこと）。
3. 順序がそのまま優先順位です：同じ位置では先に一致したものが勝ちます。長い記号はその接頭辞より前に置きます（`咕嘎嘎咕？` は `咕嘎嘎？` より前、`嘎嘎嘎嘎？` は `嘎嘎嘎？` より前、`咕咕嘎嘎！` は `咕咕嘎！` より前、さらに `咕咕！` より前）。
4. 各規則の `name` は次の scope のいずれかでなければなりません（独自のものは不可）：

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

5. ハイライトは `examples/` の 五つのファイルの一行一行をカバーできなければなりません：少なくとも各行の予約トークンが一致すること（下の小さなドライバで自己確認してください）。

`tests/grammar.test.js` は 40 行ほどの**ミニドライバ**を実装しなければなりません：一行のテキストに対し、`patterns` の順にグローバル正規表現で**最左最長**の一致（同じ開始位置なら先に現れたもの）を求め、`[{start, end, name}]` を得ます。重なった領域は先に来たものが優先です。そのうえで具体的な位置 / 断片の scope をアサートします。例えば：

```text
咕咕嘎嘎！ 嘎咕嘎嘎嘎咕   → 0..4 keyword.declaration.entry.gugugaga；5..12 entity.name.class?（入口名用 entity.name.function 也可，写清你的选择）
    咕：咕？ 嘎嘎嘎嘎？嘎嘎嘎咕咕嘎咕嘎 嘎嘎嘎嘎？嘎咕咕嘎咕嘎嘎嘎  → 咕： 关键字+标点；咕？ 算术；嘎嘎嘎嘎？ 位串字面量；其后的 咕嘎 串必须被 constant.numeric.bits 覆盖
```

そのほか、`language-configuration.json` では `"folding": {"offSide": true}`（インデントによる折りたたみ）、`"indentationRules": {"increaseIndentPattern": "：\\s*$", "decreaseIndentPattern": "^\\s*(嘎嘎|嘎嘎嘎嘎|嘎嘎嘎嘎嘎嘎)"}`、`"comments": {}`（コメント文法はないので lineComment / blockComment は**書かない**でください）、`"wordPattern": "[咕嘎！？：]+"` を使います。

`snippets/gugugaga.json` は少なくとも 5 件：クラス骨組み `咕咕！ ${1:嘎咕咕}：`、メソッド骨組み、エントリ骨組み、`咕咕！？` フィールド、`嘎嘎嘎：` 条件ブロック、`嘎嘎嘎嘎嘎：` ループ、`咕：` 表示。スニペット本文のプレースホルダは `${n:嘎咕咕}` の形式だけを使えます（プレースホルダのテキストは正しい名前でなければなりません）。

## 6. テストと受け入れ

- 各実装者は少なくとも 15 件の `node:test` アサーションを書き（合計 ≥ 55）、すべてオフライン・依存ゼロで、vscode を require しません。
- T5 の追加要件：**スニペットを展開したものが実際に走ること** —— 各 snippet のプレースホルダを §3 の 4 つの安全な名前に置き換え、一時ファイルに書いて `node bin/gg.ts check <文件>` で終了コード 0 を検証します（このテストが納品における固い証拠です）。
- T7 の追加要件：**本物の** CLI でエラーのあるファイルを作り、`parseDiagnostics` + `collect` が端から端まで `E1001` を取得し、行・列が `2:7` になることを検証します。
- テストコマンドはすべてこれ：`cd vscode/gugugaga && node --test "tests/*.test.js"`。
- 納品の報告には必ず次を書きます：作ったファイルと行数、テストの件数と通過数、実際に実行したコマンドとその出力の抜粋、そして**検証できていない**部分（正直に書くこと）。

## 7. 改訂記録（実装期に確定した差分で、いずれも反映済みかつテストで固定）

契約は先に書かれたもので、実装時に 三か所は言い方を変える必要があり、ほかに 二か所は実装者がより良い選択をし、一か所は統合のときに見つかった型契約の穴でした。一件ずつ記録し、今後この旧契約で再レビューしないようにします。

1. **診断の 第二行目の綴じ代は 2 個の空白**で、4 個ではありません。`src/errors.ts:73` の `return head + "\n  " + markColumn(line, err.pos.col)` を参照。`sourceLine` は言語ソース自身のインデントを残し【】の印を剥がしたうえで、エディタ側はそのまま診断行の表示に使います。
2. **`collect()` は `{issues, error}` を返し、素の配列ではありません**。素の配列では「CLI が起動しない / タイムアウト / コマンドが見つからない」といった診断以外の原因を表せないため、`error` フィールドを追加で持たせます（成功時は `null`）。
3. **`resolveCommand({config, workspaceRoot, file})` は `file` をひとつ多く受け取ります**。三段階のフォールバックでは最終的に `check <文件>` の完全な args を組み立てる必要があり、ワークスペースのルートだけでは組み立てられません。返り値の `source` は `"setting"|"repo"|"path"` を取り、出力パネルにフォールバック元を表示するために使います。
4. **`keywords.js` の `TOKEN_INDEX` は上位集合です**：§3 の 30 件の予約トークンに加えて、「語幹+！」「語幹+！？」および `咕：` などの完全なソース表記も登録しているため、`isReserved("咕：") === true` になります。`RESERVED` は厳密に 30 件のままで、`text` は §3 の表と逐字一致しなければなりません。理由：補完とホバーはソース表記で引く必要がありますが、`src/keywords.ts` では VAL のキーが**`？` を付けない語幹**（真に一意なキーは 21 個）であり、tokenizer が後から `？` を補うからです。
5. **補完の `kind` は `vscode.CompletionItemKind` の数値でなければならず、拡張機能側で文字列に写像してはいけません**。`completion.js` と `extension.js` は当初それぞれ別々に実装され（一方は数値を返し、他方は `"snippet"` 文字列で switch）、組み合わせるとすべて `Variable` のアイコンになりました。`new vscode.CompletionItem(item.label, item.kind)` でそのまま透過させ、`tests/manifest.test.js` の静的アサーションで固定します（ソースに `completionKind(` と `case "snippet"` が現れてはいけない）。教訓：モジュールをまたぐ「列挙か文字列か」の契約は契約そのものに書かなければ、二人の実装者がそれぞれ正しくても、組み合わせると壊れます。
6. **文法規則はすべて左側境界の捕獲グループを付けます**（`(^| +)` / `(^| +|：)`、グループ 1 を `punctuation.separator.colon` に着色）。契約にはこの一条がありませんでしたが、TextMate は lookbehind を禁じるため、アンカーしないと必ず位置がずれます。あわせて 4 条の「名前ガード」規則を負の先読み付きで追加します（12 個の演算子語幹、`嘎嘎嘎嘎`/`嘎嘎嘎`/`嘎嘎咕`、`嘎咕` を除外）。そうしないと `咕嘎！？` の `嘎` が名前規則に食われ、`咕咕？` は値の名前の位置で減算と見なされます。

### 第二次改訂（純粋なシェル化のあと）

インタプリタが stderr をすべて GGDIAG v1 のビットストリーム（`SPEC.md` §12）に変えたあと、契約の「診断は二行のテキスト」という前提は全体として無効になりました。次の六条が対応する旧条項を置き換えます：

7. **診断の出どころがテキストからフレームに変わります**。`src/diagnostics.js` は依存ゼロのデコーダを自前で持ちます：先頭 6 ビット = magic `1010` + version `00`、code 8、line 16、col 16、mlen 16、msg = mlen×8（各バイトは MSB が先 → `Buffer.toString("utf8")`）、end 3 = `110`。ヘッダが一致しないときは 1 ビット前進して探し続け、ヘッダは一致したが末尾が違うかビットが足りないときは 6 ビット前進して走査し直します。§4.4 にある `parseDiagnostics(text)` の旧意味（`<文件>:<行>:<列>: …` を拾う）は無効になり、`collect()` の `{issues, error}` という形は維持します。第 1 条の改訂（2 個の空白の綴じ代）もこれに伴い引退します。
8. **`issues` に入るのは code 1–21 だけです**（`E1001`…`E4012`、`E4009` は無し）。要素は `{line, column, code, message, detail}` で、`message` は第 14 条でビット列に変わり、`sourceLine` はもうありません。code 22（ヘルプ）は問題として扱わず、0/23/24（用法エラー / ファイル読み取り失敗 / 内部エラー）は `{issues: [], error: "<外壳码名> <帧正文>"}` になります。
9. **`resolveCommand` の PATH フォールバックは固定の `gggg` ではなくなりました**：`咕咕嘎嘎` → `gggg` → `gg` の順に最初に存在するものを探し（依存ゼロの自前実装、Windows では `PATHEXT` を補う）、`source` は依然 `"setting"|"repo"|"path"` を取ります。第一段の判定基準は「既定値と異なる」から「既知のコマンド名の集合に含まれない」に変わり、そのため旧設定値 `gggg` はコマンド名として扱われます。
10. **動作語は正規表記の `嘎嘎` に変わり**、args は `["嘎嘎", 文件]` です（`check` はインタプリタが予約しているラテン文字の別名で、拡張機能は使いません）。`gugugaga.cliPath` の既定値は `咕咕嘎嘎` になります。
11. **ユーザーに見える文字列はすべて純粋な咕嘎にします**：`displayName`、コマンドのタイトル、出力パネルのタイトルと内容、設定グループのタイトル、スニペットの `description`、補完の `detail`/`documentation`、ホバーの label/hint。もとの出力パネルで組み立てていた `uri`、`exec`、`args`、`workspaceRoot`、`err.stack` はすべて `console.error` に退避します。代償は自覚してください：「診断が出ない」を調べるには、いまや開発者ツールを開く必要があります。
12. **構造的な ASCII は動かしません**：拡張機能の `name`/`publisher`/`engines.vscode`/`main`/`activationEvents`、`languages[0].id`、`grammars[0].scopeName`、コマンド id、設定 id と `type`/`scope`/`minimum`、`nodePath` の既定値 `node`。これらは VS Code スキーマの照合キーであり、文案ではありません。フレームの本文（`message`）は原文の人語を残します。§12 によれば、それこそがフレームの定義だからです。

また境界をひとつ記します：skip を外したときに `tests/diagnostics.test.js` と `tests/manifest.test.js:69` を変更しましたが、本来は認可されたファイル一覧にありませんでした —— 「`skipped 0` かつ `fail 0`」と「決め方を変えるのではなくテストを直す」の二つの要求が同時に成り立つとき、この二か所は動かさざるを得ないからです。

13. **出力パネルに実行時のゲートが付きました**。再レビューで、`extension.js` が依然として `result.error`（中国語のシェルコード名 + フレーム内の ASCII パス）をパネルに書いており、「パネルは純粋な咕嘎」という方針と自己矛盾していることが分かりました。現在は `append()` が先に `isPureLine()`（咕/嘎/！/？/：/空白だけを認める）を通します：純粋でない行はパネルに書かず例外も投げず、完全な内容は `console.error` に出します。失敗経路ではパネルに純粋な咕嘎の一行だけを残します。`COLLECTION_NAME` も `"gugugaga"` から `"咕咕嘎嘎"` に変わります（Problems パネルのソース列に表示されるため）。（この条の結びにある `diagnostic.code` に関する決定は、第 14 条で覆されました。）回帰テストは `tests/purity.test.js`（9 件、変異検証つき：漏れを元に戻すと赤になります）。

**境界の補記**：今回はほかに二か所の越境がありましたが必要でした —— `tests/diagnostics.test.js`（skip の解除）と `tests/manifest.test.js:69`（既定値のアサーション）。理由は前述のとおりで、`skipped 0` + `fail 0` と「テストを直して決め方は変えない」が同時に成り立つときには動かさなければなりません。

14. **Problems パネルもすべて純粋になりました**。これまで `diagnostic.message` はフレーム本文の中国語原文、`diagnostic.code` は `E1001` だったため、ユーザーに見える面にまだ中国語と ASCII が漏れていました。現在は：
   - `decodeFrames()` が追加で `bits` を返します（そのフレームの生のビット列で、純粋な 咕/嘎。新たに `bitsText()` が内部の 0/1 ビット配列をソース表記に戻します）。
   - `parseDiagnostics()` の `message` = **フレーム全体のビット列**（`ggt decode --diag` に渡せば元に戻せます）。中国語原文は `detail` に移し、`code` はコード名を保つものの**`Diagnostic` には書き込みません**。
   - `extension.js` の `toDiagnostic()` から `diagnostic.code = issue.code` の行を削除し、代わりに `code + 位置 + detail` を `console.error` に出します。
   - 回帰：`tests/cli.test.js` に真の e2e を 1 件追加し（`issues[0].message` を `translator/bin/ggt.ts decode --diag` に食わせ、`E1001` / `2:7` / 中国語が復元されることをアサート）、`tests/purity.test.js` は `diags[0].code === undefined` かつ `message` が `isPureLine()` を通ることをアサートします。拡張機能のテストは 127 → 128。

15. **実行ボタン（`gugugaga.run`）**。ユーザーは「`python x.py` のようにエディタから直接走らせたい」と求め、出力先を**統合ターミナル**（出力パネルや webview ではなく）に選びました。実装は次のとおり：
   - `src/run.js` を新設（`require("vscode")` せず、vscode は呼び出し側が注入するので純粋な Node でテスト可能）：`quoteArg` / `buildCommandLine` / `resolveRun` / `findTerminal` / `runInTerminal` / `runFile`、定数 `TERMINAL_NAME = "咕咕嘎嘎"`、`REASON` の純粋な咕嘎による理由文字列 四本。
   - `src/cli.js` の `checkArgs(file, action)` が `action` をひとつ多く受け取ります：省略 = `嘎嘎`（check）、`null` = **暗黙の実行**（args はファイルパスだけ）。`resolveCommand` は `opts.action` を透過させます。この変更の理由：実行は暗黙の実行でなければならず、そうでないとターミナルで走るのは「まず検査する」だけで、プログラムが実行されません。
   - コマンド `gugugaga.run`、タイトル `咕咕嘎嘎！ 咕咕嘎嘎`、`icon` は `media/run.svg` を指します（▶、`currentColor` でテーマに追随。ファイル名は ASCII でなければなりません —— zip は非 ASCII パスに UTF-8 フラグを書かないため、展開すると cp437 で文字化けし、アイコンが 404 になります）。メニューは 三か所 `editor/title`、`editor/title/run`、`editor/context` で、`when` は常に `editorLangId == gugugaga`。**ショートカットは割り当てません**：コマンドパレットに ASCII のコード和音が現れると、シェルの純粋さが壊れるからです。
   - `runFile` の挙動：言語が `gugugaga` でない → `REASON.wrongLanguage`、ドキュメントが無い → `noEditor`、`uri.scheme !== "file"` → `notFile`、ダーティなドキュメントはまず `await document.save()` し、それでもダーティなら → `saveFailed`。成功時は `{ok:true, line, source, reused}` を返し、`extension.js` が `line` を `console.error` に出します（ASCII を含み、DevTools にだけ入ります）。パネルは純粋な咕嘎の一行 `咕咕嘎嘎 咕咕嘎嘎` を append するだけです。
   - ターミナル：`name === "咕咕嘎嘎"` かつ `!exitStatus` のターミナルを再利用し、そうでなければ `createTerminal({name, cwd})` で新規作成します（cwd = ワークスペースのルート、ワークスペースが無ければファイルのあるディレクトリ）。その後 `show(true)` + `sendText(line, true)`。
   - パッケージング：`build-vsix.sh` の事前チェック一覧に `media/run.svg` を追加、ステージングディレクトリに `media/` を追加、`cp media/*.svg`、`[Content_Types].xml` に `svg → image/svg+xml` を追加。
   - テスト：`tests/run.test.js` に 15 件を追加（両プラットフォームでの引用符エスケープ、`buildCommandLine`、`resolveRun` の三経路、ターミナルの再利用と新規作成、`runFile` の四種類の境界、理由文字列の純粋さ、`extension.js` の静的登録アサーション）。`tests/manifest.test.js` の commands を二個から三個に変え、menus/icon の 二件を追加。拡張機能のテストは 128 → 146。
   - 既知の制限：Windows 分岐（`cmd.exe` の引用符の二重化）は単体テストだけで、Windows 上では実際に走らせていません。ターミナル内のビットストリームは今も手で `ggt decode` に繋ぐ必要があります。

### 第四次改訂（多方言）

16. **三つの方言すべてを専用言語のようにサポートします**。`SPEC.md` §1 で 咕/グ/ぐ/GU と 嘎/ガ/が/GA という二つの「ビット」の四表記、約物の全角・半角の等価、同一ファイル・同一語での混在を定めたので、エディタ側もすべて追随します：
   - **マニフェスト**：`languages[0].extensions` = `[".咕咕", ".ググ", ".gu", ".gugugaga"]`（大文字小文字を区別しない）、`aliases` に `ググガガ` を追加。コマンド id、設定 id、`cliPath` の既定値 `咕咕嘎嘎` はすべて据え置き。`aliases` は言語セレクタに出す名前なので日本語表記を許しますが、他のユーザー可視の文案は第 11 / 13 / 14 条の制約下にあります（パネルは純粋な咕嘎、診断の本文はビット列）。
   - **正規化は `keywords.js` の中だけ**：`normalizeWithOffsets()` → `{text, starts, ends}`、`normalizeText()`、`canonicalOffsetOf()`、`sourceStartOf()`、`sourceEndOf()`、`dialectsOf()` を新設。`isReserved` / `describe` / `BY_TEXT` はまず 咕/嘎 に正規化してから表を引きます（`BY_TEXT` は Proxy として公開し、任意の方言のキーが規範語形に当たり、`Object.keys` は 29 個の規範キーのまま）。補完とホバーが受け取るのは規範文字列で、エディタの位置に書き戻すときは `sourceStartOf/EndOf` で原文のオフセットに戻します —— 英語のビット名は幅 2 なので、オフセット変換を `+1` で済ませてはいけません。
   - **文法**：35 条の規則で、各ビットを `(?:咕|グ|ぐ|[Gg][Uu])` / `(?:嘎|ガ|が|[Gg][Aa])` に展開し、約物は `[！!]` `[？?]` `[：:]` と書き、match 内のインデント用スペースは `[ 　]` に変えます。展開は**すべて非捕獲グループ**なので、`captures` の番号は一つも変わりません（グループ 1 は約物色、グループ 2 は名前、グループ 3 は接尾辞のまま）。英語の `GU`/`GA` は二文字で一記号です：`((?:…)+)` の繰り返しグループによって一つの token に繋がり、分割されません。`tests/grammar.test.js` は `canonicalMatch()` で展開を改造前の元の pattern に戻すため、「長い記号を短い記号より前に置く」11 対の順序アサーションは今も有効です。
   - **language-configuration.json**：`wordPattern` は 咕/嘎/グ/ガ/ぐ/が/英字/全角・半角の `！？：` を認め、`increaseIndentPattern` は `：` と `:` の両方を認め、`decreaseIndentPattern` は `(?:嘎|ガ|が|[Gg][Aa]){2}(…){0,2}` で 2/4/6 ビットの終わり語をカバーします。
   - **CLI の探査順**：`咕咕嘎嘎` → `ググガガ` → `gggg` → `gg`（`src/cli.js` の `CLI_CANDIDATES`、win32 の `PATHEXT` 分岐は維持）。`src/run.js` は `cli.resolveCommand` を再利用するので、名簿を別に書く必要はありません。
   - **テスト**：拡張機能のテストは 147 → 160（`keywords`/`completion`/`hover`/`grammar`/`manifest` の五か所にそれぞれ方言の用例を追加。`grammar` の 29 条の予約トークンを日本語 / 英語で一件ずつ再検証し、ほかに混在行、`GU`/`GA` が分割されないこと、半角約物、三方言の例文行の非空白文字の全カバー）。`tests/purity.test.js` の 9 条のパネル純粋性アサーションは一件も変えておらず、すべて引き続き通っています：パネルは今も中国語のビット名で、方言に追随しません。
   - **既知の制限**：文法規則は文字種ごとに展開するため、規則の行は長くなりますが条数は変わりません（依然 35 条）。`GU`/`GA` の大文字小文字混在（`Gu`、`gA`）は文法が受け入れますが、同一記号内での大小混在に専用の用例はありません。
17. **実行ボタンの黒いアイコン、`.ググ` の分解表記、日本語サンプルの空白**（ユーザーが実機で見つけた三か所）。`icon` を `media/run.svg` から codicon `$(play)` に変えました：SVG の中の `currentColor` は `<img>` として読み込まれると CSS の文脈を持たず黒に解釈されますが、codicon はテーマが色を付けます；`media/` ディレクトリ、パッケージスクリプトの svg 事前確認と `cp`、`[Content_Types].xml` の svg 行も一緒に削除しました。`languages[0].extensions` には `.ググ` の分解表記（`ク` と `゛` の二つの符号位置）を追加しました：マニフェストはリテラル比較なので、macOS のファイル名が分解形式だと合成済みの項目は決して一致しません。実行時の保険として `src/language.js`（純粋な関数で、vscode を require しません）を新設：`isProgramFile()` はまず `normalize("NFC").toLowerCase()` してから四つの拡張子を比べます；`extension.js` の `adoptDocument()` は有効化時と `onDidOpenTextDocument` 時に呼ばれ、拡張子を認識できたら `setTextDocumentLanguage` して続けて一度チェックします；`activationEvents` に `onStartupFinished` を追加し、コールドスタートで既に開いている文書も拾います。日本語サンプルの区切り空白はすべて全角空白に変え、`SPEC.md` / `SPEC.ja.md` / `SPEC.en.md` / `TUTORIAL.md` / `TUTORIAL.en.md` の同じコードも同期しました。拡張機能のテストは 160 → 167（`tests/language.test.js` を 5 条新設し、`manifest` に icon、拡張子、有効化の三種類のアサーションを追加）。さらに `editor/title/run` のメニュー寄与も削除しました：そこにも ▶ が描画されるため、同じコマンドが同じ画面に二つのボタンとして現れてしまうからです——残すのは `editor/title`（右上）と `editor/context`（右クリックメニュー）だけです。

18. **診断フレームのビット名の字形はソースファイルの拡張子に従います**（第 16 条「パネルは今も中国語のビット名で、方言に追随しません」への補足であり、覆すものではありません：変わるのは stderr 上のフレームの**字形**だけで、パネル内のビット列は今も中国語のビット名です）。シェル側では `src/wire.ts` の `frameBits` / `encodeDiag` と `src/errors.ts` の `frameOfError` がそろって `dialect: Dialect = "zh"` 引数を取り、`src/cli.ts` が `dialectOfFile(ファイル)` で渡すため、`.ググ` の stderr は グ/ガ、`.gu` の stderr は GU/GA になります。ヘルプのフレームとコマンドラインの使い方エラーには具体的なプログラムがないので、常に中国語です。エディタ側は三か所が追随します：
   - `src/diagnostics.js`（245 → 280）：`ZERO_CHARS` / `ONE_CHARS` を新設し、`bitsOf()` を符号位置ごとの走査に変えました（咕/グ/ぐ→0、嘎/ガ/が→1；`[Gg][Uu]`→0、`[Gg][Aa]`→1 は一巡で二つの符号位置を消費し、それ以外の文字は捨てます）。これで三方言のフレームがすべて解けます。`bitsText` / `decodeFrames` / `parseDiagnostics` / `collect` の意味は一つも変わらず、パネルの `message` は今も**中国語**のビット列です（第 14 条は変わりません）。
   - `src/extension.js`（403 → 408）：変えたのは `PURE_LINE` だけで、ホワイトリストを 咕/嘎 から `[咕嘎グガぐが！？：!?:\u3000 ]` に `[Gg][Uu]` / `[Gg][Aa]` を加えた形へ広げました。英語のビット名は対になっている必要があり、片方だけの `G` / `U` / `A` や `GUEST` のような混在は今も純粋でないと判定されます。
   - **テスト**：拡張機能のテストは 167 → 173（`tests/diagnostics.test.js` 211 → 322：日本語フレーム、英語の大文字フレーム、三方言の混在、小文字 / 大小混在 / ひらがな、`collect` の端から端までの日本語フレーム；`tests/purity.test.js` 624 → 649 に三方言のホワイトリストを一条追加——`"gugugaga"` は拒否側から受け入れ側へ移りました。GU/GA が合法になった後では、ちょうど純粋なビット列になるからです）。
   - **既知の制限**：stderr に英語のログが混ざり、そこに `gu`/`ga` の文字対がたまたま現れると、ビットを一つ余計に数えます。GGDIAG の magic/version/end の三重チェックが最後の砦になるので例外は投げませんが、その状況をわざと作る用例はありません。
