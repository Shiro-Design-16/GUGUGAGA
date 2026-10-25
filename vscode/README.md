# 咕咕嘎嘎语的 VS Code 支持

这个目录是语言项目的编辑器侧配套：把 `.咕咕` / `.ググ` / `.gu` / `.gugugaga` 文件放进 VS Code 就能着色、补全、悬停、查语法。三种方言（中文 咕嘎、日语 グガ、英语 GU/GA）可以写在同一个文件、同一个词里，扩展全都认。它**不是**解释器，跑程序仍然用 `咕咕嘎嘎 程序.咕咕`。

| 路径 | 是什么 |
| --- | --- |
| `gugugaga/` | 扩展本体：清单 + 7 个 JS 模块 + 语法/片段/语言配置 + 11 个测试文件 |
| `gugugaga-language.vsix` | 打好的安装包（19 个条目，约 35 KB） |
| `build-vsix.sh` | 打包脚本：把 `gugugaga/` 里运行期需要的文件塞进 zip |
| `CONTRACT.md` | 动手前定下的接口契约与验收清单（历史文档，末尾有修订记录） |

## 装

```bash
code --install-extension vscode/gugugaga-language.vsix      # 在仓库根执行
```

也可以在 VS Code 里「扩展」视图 → 右上角 `...` → **从 VSIX 安装**，选这个文件。装完打开任意 `.咕咕` / `.ググ` / `.gu` / `.gugugaga` 文件，状态栏语言模式会显示「咕咕嘎嘎语」。

## 六样能力

| 能力 | 具体表现 | 实现位置 |
| --- | --- | --- |
| 语言基础 | 四个后缀（`.咕咕`/`.ググ`/`.gu`/`.gugugaga`，大小写不敏感）、以 `：` 或 `:` 结尾自动缩进、`嘎嘎`/`嘎嘎嘎嘎`/`嘎嘎嘎嘎嘎嘎` 回退缩进（日语 ガガ、英语 GAGA 同样生效）、按缩进折叠、单词规则同时认 咕/グ/ぐ/GU 与 嘎/ガ/が/GA、无注释语法；清单里另登记一条 `.ググ` 的分解写法（macOS 上文件名可能是 ク + ゛ 两个码位），认不出后缀的文档在运行时按 NFC 归一后再认一次 | `gugugaga/language-configuration.json` |
| 着色 | 30 个保留记号 + 两种字面量（位串整段着色）+ 类名/方法名/变量名 + `！？`/`：` 标点，35 条扁平规则；每条规则同时吃 咕/グ/ぐ/GU、嘎/ガ/が/GA 与全角/半角 `！？：`/`!?:`，`GU`/`GA` 是两个字母一个记号 | `gugugaga/syntaxes/gugugaga.tmLanguage.json` |
| 补全 | 按上下文给保留词、骨架片段与本文档已定义的名字；`！？` 之后只给方法名 | `gugugaga/src/completion.js` |
| 悬停 | 记号释义、家族归属与用法示例（文案同样是咕/嘎写的） | `gugugaga/src/hover.js` |
| 诊断 | 打开/保存/编辑（防抖 350ms）时真跑 `咕咕嘎嘎 嘎嘎`，解码 stderr 的 GGDIAG 帧（位名字形跟源文件后缀：`咕`/`嘎`、`グ`/`ガ`、`GU`/`GA`，解码器三套都吃），把 `E1xx`~`E3xx` 变成波浪线与 Problems 条目 | `gugugaga/src/cli.js` + `src/diagnostics.js` |
| 运行 | 编辑器标题栏右上角的 ▶ 与右键菜单「咕咕嘎嘎！ 咕咕嘎嘎」——把 `咕咕嘎嘎 <文件>` 发进集成终端（复用同一个名为 `咕咕嘎嘎` 的终端），脏文档先存盘；标题栏图标用 codicon `$(play)`，颜色随深浅主题 | `gugugaga/src/run.js` |

运行按钮**不捕获输出**：程序只吐位流，终端才是能喂 stdin、能自己接 `| ggt decode --bytes`、还能看退出码的地方。命令行走**隐式执行**（只有文件路径，不带动作词 `嘎嘎`），拼装时会按 POSIX/win32 规则给参数加引号，路径里有空格也不会散。键盘上不绑快捷键：命令面板里一条带 ASCII 和弦的入口会破坏纯净度。

外带 8 条片段（类、构造器、方法、入口、字段、条件、循环、新建表达式），正文只用 咕/嘎/！/？/：/空格/换行。

## 三种方言

| 位 | 中文 | 日语 | 英语 |
| --- | --- | --- | --- |
| 0 | 咕 | グ / ぐ | GU / gu |
| 1 | 嘎 | ガ / が | GA / ga |
| 标点 | ！ ？ ： | ！ ？ ： | ! ? : |

同一份文件、同一个词里都能混着写（`グ咕GU！` 是同一个声明头）；内部一律归一化成 咕/嘎，所以补全候选、悬停释义、诊断正文仍然是规范中文。后缀 `.咕咕` `.ググ` `.gu` `.gugugaga` 大小写不敏感；命令名除了 `咕咕嘎嘎`，还认日语别名 `ググガガ` 与拉丁旧名 `gggg`、`gg`。

## 外壳纯净度：哪些字是咕嘎，哪些必须 ASCII

**咕嘎写成的**（用户能看见的一切）：`displayName`、命令标题、输出面板标题与内容、Problems 面板的来源列（诊断集合名 `咕咕嘎嘎`）、5 个设置的分组标题、片段 `description`、补全候选的 `detail`/`documentation`、悬停文案、`cliPath` 的默认值（`咕咕嘎嘎`）。面板写入前还有运行时闸 `isPureLine()`：只认三种方言的位名（`咕`/`嘎`、`グ`/`ガ`、成对的 `GU`/`GA`）与 `！？：!?:`、空格与 U+3000，其它一律不写面板、只进开发者控制台；`tests/purity.test.js` 用变异测试证明这道闸会拒。

**必须保持 ASCII 的**：扩展 `name`/`publisher`、`engines.vscode`、`main`、`activationEvents`、`languages[0].id`、`grammars[0].scopeName`、命令 id、设置 id 与 `type`/`scope`。这些不是文案而是 **VS Code schema 的匹配键** —— 扩展标识、激活点、TextMate `source.gugugaga` 注入、命令面板 API 都按这些字符串匹配，改一个字符扩展就不加载。同理，`nodePath` 的默认值只能是 `node`。

Problems 面板里显示的**也不是中文**：诊断条目的正文是该诊断的**整帧原始位串**（纯 咕/嘎），码名列留空（否则会渲染出 `E1001` 这种 ASCII）。想读人话就把那串位串交给姊妹项目的翻译器：

```sh
ggt decode --diag <<< "嘎咕嘎咕咕咕…"     # → 2:7 E1001 非法字符“噶”（U+5676）
```

这条取舍是刻意的：编辑器里留下的可见面与语言本身一样纯，人话只从翻译器出。代价是悬停里看到的是位串 —— 扩展故意不替你「顺便翻译」，否则翻译器的存在就失去意义。中文正文与码名仍会打进开发者控制台（`console.error`），排查时开 DevTools 就能看到。

## 诊断怎么找到解释器

扩展自己不实现解析器 —— 诊断完全来自真实解释器，因此命令必须可达（三级回退）：

| 优先级 | 条件 | 实际执行 |
| --- | --- | --- |
| 1 | 设置 `gugugaga.cliPath` 的值不是已知命令名（`咕咕嘎嘎`/`ググガガ`/`gggg`/`gg`）且该路径存在 | 直接执行；以 `.ts` 结尾则 `<nodePath> <该路径> 嘎嘎 <文件>` |
| 2 | 工作区根有 `bin/gg.ts` | `<nodePath> <工作区>/bin/gg.ts 嘎嘎 <文件>` |
| 3 | 都不成立 | PATH 上按 `咕咕嘎嘎` → `ググガガ` → `gggg` → `gg` 取第一个存在的 |

动作词用规范写法 `嘎嘎`（= 只检查不执行）；`check` 是解释器保留的拉丁别名，扩展不使用。

起不来或超时不会弹窗，也不写输出面板（面板只允许咕/嘎）：完整原因（exec、args、工作区、栈）走 `console.error`，在 VS Code 的「帮助 → 切换开发人员工具」里看。

## 重新打包

```bash
./vscode/build-vsix.sh                        # 输出 vscode/gugugaga-language.vsix
unzip -l vscode/gugugaga-language.vsix        # 看包内清单
unzip -p vscode/gugugaga-language.vsix extension.vsixmanifest   # 看 VSIX 清单
```

脚本会先预检必需文件，再从 `package.json` 读 name/version/publisher 生成 `extension.vsixmanifest` 与 `[Content_Types].xml`，最后用 `zip -q -X -r` 打包。只收运行期文件（`src/*.js`、`syntaxes/`、`snippets/`、`language-configuration.json`、`package.json`、`README.md`），`tests/`、`CONTRACT.md`、`.vscodeignore` 不进包。需要系统有 `zip`。

## 测试

```bash
node --test "vscode/gugugaga/tests/*.test.js"   # 173 条，11 个文件
npm run test:all                                # 142 + 104 + 173 = 419 条
```

4 条端到端用例会真 spawn `node bin/gg.ts 嘎嘎` 拿真帧解码，不是假绿；9 条纯净度用例给输出面板的运行时闸做行为与变异测试；全部离线、零依赖、**不** `require("vscode")`（宿主 mock 由 `Module._load` 拦截）。

## 模块与量级

| 文件 | 行数 | 职责 |
| --- | --- | --- |
| `gugugaga/package.json` | 118 | 清单：语言、语法、片段、3 个命令、菜单、图标、5 个设置 |
| `gugugaga/src/extension.js` | 408 | 激活入口、防抖、命令注册、输出面板（含 `isPureLine` 面板闸） |
| `gugugaga/src/cli.js` | 214 | CLI 调用桥：三级回退、PATH 探测、`execFile` 包装 |
| `gugugaga/src/diagnostics.js` | 280 | GGDIAG 帧解码 → 编辑器诊断 |
| `gugugaga/src/completion.js` | 303 | 上下文扫描与候选生成 |
| `gugugaga/src/hover.js` | 167 | 记号定位与释义 |
| `gugugaga/src/keywords.js` | 316 | 保留词表（30 条，唯一 JS 真源） |
| `gugugaga/src/run.js` | 151 | 运行按钮：解析命令行、引号、复用终端 |
| `gugugaga/syntaxes/gugugaga.tmLanguage.json` | 336 | 35 条扁平 match 规则 |
| `gugugaga/tests/*.test.js` | 11 个 / 173 条 | 含 4 条真 CLI e2e（其中 1 条回灌 `ggt decode --diag`）与 9 条纯净度闸测试 |

## 已知限制

- 不实现 LSP：补全与悬停是上下文扫描 + 正则，没有跨文件语义、跳转、重命名。
- 诊断依赖 `node` 与 `咕咕嘎嘎`（或工作区 `bin/gg.ts`）可达；环境没装好就静默无诊断，原因只在 DevTools 里。
- `gugugaga.maxSteps` 目前不生效（`嘎嘎` 不执行程序）。
- untitled 缓冲区没有路径，不参与检查。
- 未在真实 VS Code 宿主里激活过：着色、折叠、片段跳转、悬停样式、设置页显示都只有静态与离线证据。
- Windows 下 PATH 探测的 `PATHEXT` 分支未实跑（本机 macOS）。
