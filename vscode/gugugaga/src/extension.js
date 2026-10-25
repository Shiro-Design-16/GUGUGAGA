/**
 * 咕咕嘎嘎语 · VS Code 扩展入口（vscode/CONTRACT.md §4.6）。
 *
 * 关键约束：completion / hover / diagnostics 由其它执行者落盘，所以只在 activate()
 * 内部 require（懒加载）。这样这三个模块还没写出来时本文件仍能被 node --check 通过，
 * 测试也不必真的把扩展跑起来。
 */
"use strict";

const vscode = require("vscode");

const LANGUAGE_ID = "gugugaga";
const COLLECTION_NAME = "咕咕嘎嘎";
const TRIGGER_CHARACTERS = ["咕", "嘎", "！", "？", "：", " "];
const CHECK_TIMEOUT_MS = 15000;

/**
 * 输出面板里的散文只许出现 咕/嘎/！/？/：/空格（SPEC.md §12 的位流口径）。
 * 词形表（左边是这里想表达的意思，右边是落到面板上的咕嘎拼写）：
 *   跳过非文件文档 嘎嘎咕嘎 嘎咕嘎嘎
 *   解析命令失败   咕咕嘎嘎 嘎嘎咕咕
 *   检查失败       嘎咕嘎咕 咕咕嘎
 *   补全失败       咕咕嘎！ 咕咕嘎
 *   悬停失败       咕咕嘎嘎 咕咕嘎
 *   解析结果       咕咕嘎嘎 嘎咕嘎咕
 *   工作区根       嘎嘎咕嘎 嘎咕嘎嘎
 *   没有           嘎嘎嘎？咕
 *   不是本语言文件 咕咕嘎嘎！ 咕咕！？ 咕咕嘎
 *   触发原因       咕（手动）/ 咕嘎（打开）/ 咕嘎咕（编辑）/ 嘎嘎（保存）
 * 拼写冲突时以本表为准；改这里就要同步改 tests/manifest.test.js 的纯咕嘎断言。
 */

let collection = null;
let output = null;
/** activate() 里装进来的模块束；未激活时为 null */
let deps = null;
/** 每个文档一个防抖定时器，key 是 uri.toString() */
const timers = new Map();

/** 面板正文的字符表：只许 咕/嘎/！/？/：/空格（空串不算一条正文） */
const PURE_LINE = /^[咕嘎！？： ]+$/;

/**
 * 面板是对外可见面。任何准备写进面板的整行都要先过这道闸：
 * 只允许 咕/嘎/！/？/：/空格。错误原因、路径、码名都不算正文，只走 console.error。
 */
function isPureLine(text) {
  return PURE_LINE.test(String(text));
}

function append(line) {
  const text = String(line);
  if (!isPureLine(text)) {
    // 不写面板、也不抛：不纯的内容只进开发者控制台，扩展不许为一行日志崩掉
    console.error("[gugugaga] 面板拒绝了不纯的行：", text);
    return;
  }
  if (output) output.appendLine(text);
}

// 输出面板是对外可见面，只许出现 咕/嘎/！/？/：/空格；
// 完整错误（含英文栈）只进开发者控制台，用户看不到。
function logError(where, err) {
  append(where + " 嘎嘎咕");
  console.error("[gugugaga] " + where + ":", err);
}

function workspaceRootOf() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0].uri.fsPath;
}

/** 读 5 个设置；取值非法时退回与 package.json 一致的默认值 */
function readSettings() {
  const config = vscode.workspace.getConfiguration("gugugaga");
  const debounceRaw = config.get("debounceMs", 350);
  const debounceMs = typeof debounceRaw === "number" && debounceRaw >= 0 ? debounceRaw : 350;
  return {
    cliPath: config.get("cliPath", "咕咕嘎嘎"),
    nodePath: config.get("nodePath", "node"),
    checkOnChange: config.get("checkOnChange", true) !== false,
    debounceMs: debounceMs,
    maxSteps: config.get("maxSteps", null),
  };
}

/** 把 CLI 的行/列（1 基）落到文档上，越界一律夹到合法范围，别让 Range 抛错 */
function toDiagnostic(document, issue) {
  const lastLine = Math.max(0, document.lineCount - 1);
  const line = Math.min(Math.max(Number(issue.line) - 1, 0), lastLine);
  const lineText = document.lineAt(line).text;
  const startChar = Math.min(Math.max(Number(issue.column) - 1, 0), lineText.length);
  const endChar = Math.min(startChar + 1, lineText.length);
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(line, startChar, line, endChar),
    issue.message,
    vscode.DiagnosticSeverity.Error
  );
  // 面板里不写 code：它是 E1001 这类 ASCII 码名，会破坏「可见面只有咕嘎」。
  // 位置由 range 给出，正文是整帧位串，码与说明都在位串里，交给 ggt 解。
  diagnostic.source = COLLECTION_NAME;
  return diagnostic;
}

/** 检查一个文档并刷新诊断。永不抛：异常只写输出面板 */
async function checkDocument(document, reason) {
  if (!deps || !collection) return;
  if (!document || document.languageId !== LANGUAGE_ID) return;
  if (document.uri.scheme !== "file") {
    append(reason + " 嘎嘎咕嘎 嘎咕嘎嘎");
    return;
  }
  const filePath = document.uri.fsPath;
  const settings = readSettings();

  let resolved;
  try {
    resolved = deps.cli.resolveCommand({
      config: settings,
      workspaceRoot: workspaceRootOf(),
      file: filePath,
    });
  } catch (err) {
    logError("咕咕嘎嘎 嘎嘎咕咕", err);
    return;
  }

  const version = document.version;
  let result;
  try {
    result = await deps.diagnostics.collect({
      filePath: filePath,
      resolved: resolved,
      timeoutMs: CHECK_TIMEOUT_MS,
    });
  } catch (err) {
    logError("嘎咕嘎咕 咕咕嘎", err);
    return;
  }

  // 等待期间文档被关掉或又被改过：这次结果作废，交给下一次（防抖后的）检查
  if (document.isClosed === true) return;
  if (document.version !== version) return;

  collection.set(
    document.uri,
    result.issues.map(function (issue) {
      // 人话正文与码名只进控制台：面板留给纯咕嘎的位串
      console.error("[gugugaga] " + issue.code + " " + issue.line + ":" + issue.column + " " + issue.detail);
      return toDiagnostic(document, issue);
    })
  );

  if (result.error) {
    // 面板只写一行纯咕嘎的「检查失败」；失败详情（中文外壳码名 / 帧里的路径）只进控制台
    append(reason + " 嘎咕嘎咕 咕咕嘎");
    console.error("[gugugaga] " + reason + " 检查未完成：", result.error);
  }
}

function runCheckSafe(document, reason) {
  checkDocument(document, reason).catch(function (err) {
    logError("嘎咕嘎咕 咕咕嘎", err);
  });
}

/** 编辑防抖：同一文档反复触发时只保留最后一个定时器 */
function scheduleCheck(document) {
  if (!document || document.languageId !== LANGUAGE_ID) return;
  const key = document.uri.toString();
  const existing = timers.get(key);
  if (existing !== undefined) clearTimeout(existing);
  const timer = setTimeout(function () {
    timers.delete(key);
    runCheckSafe(document, "咕嘎咕");
  }, readSettings().debounceMs);
  timers.set(key, timer);
}

function cancelCheck(document) {
  const key = document.uri.toString();
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(key);
  }
}

function buildCompletionProvider(completion) {
  return {
    provideCompletionItems: function (document, position) {
      try {
        const items = completion.completionsAt(document.getText(), document.offsetAt(position)) || [];
        return items.map(function (item) {
          // completion.js 已经给出 VS Code CompletionItemKind 数值（它不能在测试里 require("vscode")），
          // 这里只透传，不要再做字符串 → 枚举的映射，否则图标与排序全错。
          const completionItem = new vscode.CompletionItem(item.label, item.kind);
          if (item.detail) completionItem.detail = item.detail;
          if (item.documentation) {
            completionItem.documentation = new vscode.MarkdownString(String(item.documentation));
          }
          if (item.insertText !== undefined && item.insertText !== null) {
            completionItem.insertText =
              item.insertTextFormat === 2
                ? new vscode.SnippetString(String(item.insertText))
                : String(item.insertText);
          }
          return completionItem;
        });
      } catch (err) {
        logError("咕咕嘎！ 咕咕嘎", err);
        return [];
      }
    },
  };
}

function buildHoverProvider(hover) {
  return {
    provideHover: function (document, position) {
      try {
        const found = hover.hoverAt(document.getText(), document.offsetAt(position));
        if (!found) return null;
        const contents = (found.contents || []).map(function (line) {
          return new vscode.MarkdownString(String(line));
        });
        if (found.range) {
          return new vscode.Hover(
            contents,
            new vscode.Range(document.positionAt(found.range.start), document.positionAt(found.range.end))
          );
        }
        return new vscode.Hover(contents);
      } catch (err) {
        logError("咕咕嘎嘎 咕咕嘎", err);
        return null;
      }
    },
  };
}

/** 把解析到的 CLI 命令写进输出面板，排查「诊断不出来」时很有用 */
function logResolvedCommand() {
  try {
    const editor = vscode.window.activeTextEditor;
    const file = editor && editor.document.uri.scheme === "file" ? editor.document.uri.fsPath : null;
    const resolved = deps.cli.resolveCommand({
      config: readSettings(),
      workspaceRoot: workspaceRootOf(),
      file: file,
    });
    append("咕咕嘎嘎 嘎咕嘎咕");
    append("嘎嘎咕嘎 嘎咕嘎嘎");
  } catch (err) {
    logError("咕咕嘎嘎 嘎嘎咕咕", err);
  }
}

/**
 * 后缀兜底（见 src/language.js）：清单里的 extensions 是字面比对，macOS 上分解写法的
 * .ググ 对不上预组合的清单项，文件就一直不算本语言。认出后缀就把语言 id 改过来，
 * 用户不必手动「更改语言模式」。已经是对的、或认不出的，什么都不做。
 */
function adoptDocument(document) {
  if (!document || document.languageId === LANGUAGE_ID) return;
  if (!deps || !deps.language) return;
  const uri = document.uri;
  const name = uri ? uri.fsPath || uri.path || "" : "";
  if (!deps.language.isProgramFile(name)) return;
  vscode.languages.setTextDocumentLanguage(document, LANGUAGE_ID).then(
    function (adopted) {
      runCheckSafe(adopted, "咕嘎");
    },
    function (err) {
      logError("咕咕嘎嘎 嘎嘎咕咕", err);
    }
  );
}

function activate(context) {
  // 懒加载：这几个模块的落盘时机不由本文件决定
  deps = {
    cli: require("./cli"),
    completion: require("./completion"),
    hover: require("./hover"),
    diagnostics: require("./diagnostics"),
    run: require("./run"),
    language: require("./language"),
  };

  output = vscode.window.createOutputChannel("咕咕嘎嘎");
  collection = vscode.languages.createDiagnosticCollection(COLLECTION_NAME);
  context.subscriptions.push(output, collection);

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      LANGUAGE_ID,
      buildCompletionProvider(deps.completion),
      TRIGGER_CHARACTERS[0],
      TRIGGER_CHARACTERS[1],
      TRIGGER_CHARACTERS[2],
      TRIGGER_CHARACTERS[3],
      TRIGGER_CHARACTERS[4],
      TRIGGER_CHARACTERS[5]
    ),
    vscode.languages.registerHoverProvider(LANGUAGE_ID, buildHoverProvider(deps.hover))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("gugugaga.checkFile", function () {
      const editor = vscode.window.activeTextEditor;
      const document = editor ? editor.document : null;
      if (!document || document.languageId !== LANGUAGE_ID) {
        append("咕咕嘎嘎！ 咕咕！？ 咕咕嘎");
        return undefined;
      }
      return checkDocument(document, "咕");
    }),
    vscode.commands.registerCommand("gugugaga.run", function () {
      const editor = vscode.window.activeTextEditor;
      const document = editor ? editor.document : null;
      if (!document || document.languageId !== LANGUAGE_ID) {
        append(deps.run.REASON.noEditor);
        return undefined;
      }
      // 终端里跑：能喂 stdin、能接 | ggt decode、退出码看得见（CONTRACT §4.7）
      return deps.run
        .runFile(vscode, {
          document: document,
          config: readSettings(),
          workspaceRoot: workspaceRootOf(),
        })
        .then(function (result) {
          if (!result.ok) {
            append(result.reason);
            return undefined;
          }
          // 命令行含 ASCII（解释器名、脚本路径、文件路径），只进 DevTools。
          // 这里刻意不用 logError：它会往面板多补一行，运行成功不该留两行。
          console.error("[gugugaga] 咕咕嘎嘎 咕咕嘎嘎:", result.line);
          append("咕咕嘎嘎 咕咕嘎嘎");
          return undefined;
        });
    }),
    vscode.commands.registerCommand("gugugaga.showOutput", function () {
      logResolvedCommand();
      if (output) output.show(true);
      return undefined;
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(function (document) {
      adoptDocument(document);
      runCheckSafe(document, "咕嘎");
    }),
    vscode.workspace.onDidChangeTextDocument(function (event) {
      if (!readSettings().checkOnChange) return;
      scheduleCheck(event.document);
    }),
    vscode.workspace.onDidSaveTextDocument(function (document) {
      runCheckSafe(document, "嘎嘎");
    }),
    vscode.workspace.onDidCloseTextDocument(function (document) {
      cancelCheck(document);
      if (collection) collection.delete(document.uri);
    })
  );

  // 激活时已经打开的 .咕咕 文档补一次检查
  vscode.workspace.textDocuments.forEach(function (document) {
    if (document.languageId === LANGUAGE_ID) runCheckSafe(document, "咕嘎");
    else adoptDocument(document);
  });

  append("咕咕嘎嘎！ 咕？ 嘎嘎咕咕");
}

function deactivate() {
  timers.forEach(function (timer) {
    clearTimeout(timer);
  });
  timers.clear();
  if (collection) {
    collection.clear();
    collection.dispose();
    collection = null;
  }
  if (output) {
    output.dispose();
    output = null;
  }
  deps = null;
}

module.exports = {
  activate: activate,
  deactivate: deactivate,
  // 导出这两者只为测试能直接钉住面板守卫（宿主里不会有人用到）
  isPureLine: isPureLine,
  append: append,
};
