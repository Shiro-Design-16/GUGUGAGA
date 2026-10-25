"use strict";

/**
 * 输出面板的纯净性（vscode/CONTRACT.md §4.6、SPEC.md §12）。
 *
 * 面板是对外可见面：只许出现 咕/嘎/！/？/：/空格。错误原因（diagnostics.collect 的 error
 * 里带着「读文件失败」这类中文外壳码名与帧正文里的 ASCII 路径）一律只进开发者控制台。
 * 三层钉子：
 *   行为层 —— isPureLine 的字符表 + append 守卫（不写面板、不抛）；
 *   集成层 —— 假 vscode + 假 CLI 真跑 activate → 保存事件 → collect，看面板到底落了哪几行；
 *   静态层 —— 扫源码，钉死每个 append( 的实参都不含错误对象与路径。
 *
 * 测试环境没有 vscode 宿主，所以用 Module._load 拦住 require("vscode") 换手写 stub。
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");

const EXTENSION_PATH = path.join(__dirname, "..", "src", "extension.js");
const SOURCE = fs.readFileSync(EXTENSION_PATH, "utf8");

/** 面板里出现过的两条典型的「成功激活」行，后面用来比对失败路径有没有偷偷加行 */
const ACTIVATION_LINE = "咕咕嘎嘎！ 咕？ 嘎嘎咕咕";

// ---------------------------------------------------------------- 假 vscode

function makeVscodeStub() {
  const state = {
    channelName: null,
    collectionName: null,
    panelLines: [],
    panelShown: 0,
    collectionSets: [],
    collectionDeletes: 0,
    collectionCleared: false,
    commands: new Map(),
    handlers: {},
    settings: {},
    disposed: { output: 0, collection: 0 },
  };

  class Position {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  }

  class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
      this.start = new Position(startLine, startCharacter);
      this.end = new Position(endLine, endCharacter);
    }
  }

  class Diagnostic {
    constructor(range, message, severity) {
      this.range = range;
      this.message = message;
      this.severity = severity;
    }
  }

  class CompletionItem {
    constructor(label, kind) {
      this.label = label;
      this.kind = kind;
    }
  }

  class MarkdownString {
    constructor(value) {
      this.value = value;
    }
  }

  class SnippetString {
    constructor(value) {
      this.value = value;
    }
  }

  class Hover {
    constructor(contents, range) {
      this.contents = contents;
      this.range = range;
    }
  }

  const disposable = function () {
    return { dispose: function () {} };
  };

  const vscode = {
    Position: Position,
    Range: Range,
    Diagnostic: Diagnostic,
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    CompletionItem: CompletionItem,
    CompletionItemKind: { Variable: 5 },
    MarkdownString: MarkdownString,
    SnippetString: SnippetString,
    Hover: Hover,
    window: {
      activeTextEditor: null,
      terminals: [],
      createTerminal: function (options) {
        const terminal = {
          name: options.name,
          cwd: options.cwd,
          exitStatus: undefined,
          shown: [],
          texts: [],
          show: function (preserveFocus) {
            this.shown.push(preserveFocus);
          },
          sendText: function (text, addNewline) {
            this.texts.push([text, addNewline]);
          },
          dispose: function () {},
        };
        vscode.window.terminals.push(terminal);
        return terminal;
      },
      createOutputChannel: function (name) {
        state.channelName = name;
        return {
          appendLine: function (line) {
            state.panelLines.push(line);
          },
          show: function () {
            state.panelShown += 1;
          },
          dispose: function () {
            state.disposed.output += 1;
          },
        };
      },
    },
    languages: {
      createDiagnosticCollection: function (name) {
        state.collectionName = name;
        return {
          set: function (uri, diags) {
            state.collectionSets.push({ uri: uri, diags: diags });
          },
          delete: function () {
            state.collectionDeletes += 1;
          },
          clear: function () {
            state.collectionCleared = true;
          },
          dispose: function () {
            state.disposed.collection += 1;
          },
        };
      },
      registerCompletionItemProvider: function (languageId, provider) {
        state.completion = { languageId: languageId, provider: provider };
        return disposable();
      },
      registerHoverProvider: function (languageId, provider) {
        state.hover = { languageId: languageId, provider: provider };
        return disposable();
      },
    },
    commands: {
      registerCommand: function (id, handler) {
        state.commands.set(id, handler);
        return disposable();
      },
    },
    workspace: {
      workspaceFolders: null,
      textDocuments: [],
      getConfiguration: function () {
        return {
          get: function (key, fallback) {
            return Object.prototype.hasOwnProperty.call(state.settings, key)
              ? state.settings[key]
              : fallback;
          },
        };
      },
      onDidOpenTextDocument: function (handler) {
        state.handlers.open = handler;
        return disposable();
      },
      onDidChangeTextDocument: function (handler) {
        state.handlers.change = handler;
        return disposable();
      },
      onDidSaveTextDocument: function (handler) {
        state.handlers.save = handler;
        return disposable();
      },
      onDidCloseTextDocument: function (handler) {
        state.handlers.close = handler;
        return disposable();
      },
    },
  };

  return { vscode: vscode, state: state };
}

/**
 * 装上假 vscode 后加载 extension.js，带着 stub 跑完 fn，再恢复 Module._load。
 * 之所以整个 fn 期间都保持替换：activate() 会懒加载 ./completion / ./hover，
 * 它们将来若 require("vscode") 也不该炸在测试里。
 */
async function withExtension(fn) {
  const stub = makeVscodeStub();
  const originalLoad = Module._load;
  Module._load = function (request) {
    if (request === "vscode") return stub.vscode;
    return originalLoad.apply(this, arguments);
  };
  try {
    delete require.cache[require.resolve(EXTENSION_PATH)];
    const extension = require(EXTENSION_PATH);
    return await fn(extension, stub.state, stub.vscode);
  } finally {
    Module._load = originalLoad;
    delete require.cache[require.resolve(EXTENSION_PATH)];
  }
}

/** 劫持 console.error，收集开发者控制台里真正落下的行 */
async function withCapturedConsoleError(fn) {
  const lines = [];
  const originalError = console.error;
  console.error = function () {
    const parts = Array.prototype.map.call(arguments, function (value) {
      if (typeof value === "string") return value;
      if (value instanceof Error) return value.message;
      return String(value);
    });
    lines.push(parts.join(" "));
  };
  try {
    const value = await fn(lines);
    return { value: value, lines: lines };
  } finally {
    console.error = originalError;
  }
}

// ---------------------------------------------------------------- GGDIAG 帧

/** 按 SPEC §12 的位布局编码一帧：咕=0、嘎=1，每字段 MSB 在前 */
function bitsOfNumber(value, width) {
  let out = "";
  for (let i = width - 1; i >= 0; i -= 1) out += (value >> i) & 1 ? "嘎" : "咕";
  return out;
}

function encodeFrame(code, line, column, message) {
  const bytes = Buffer.from(String(message), "utf8");
  let bits =
    "嘎咕嘎咕" +
    "咕咕" +
    bitsOfNumber(code, 8) +
    bitsOfNumber(line, 16) +
    bitsOfNumber(column, 16) +
    bitsOfNumber(bytes.length, 16);
  for (const byte of bytes) bits += bitsOfNumber(byte, 8);
  return bits + "嘎嘎咕";
}

/** 假 CLI：往 stderr 打一帧，然后按给定退出码退出（真跑，不是打桩 execFile） */
function writeFakeCli(dir, frame, exitCode) {
  const file = path.join(dir, "fake-cli.ts");
  const script = [
    '"use strict";',
    "const frame = " + JSON.stringify(frame) + ";",
    "process.stderr.write(frame);",
    "process.exit(" + exitCode + ");",
    "",
  ].join("\n");
  fs.writeFileSync(file, script, "utf8");
  return file;
}

function makeDocument(filePath, text) {
  const lines = String(text).split("\n");
  return {
    languageId: "gugugaga",
    version: 1,
    isClosed: false,
    lineCount: lines.length,
    uri: {
      scheme: "file",
      fsPath: filePath,
      toString: function () {
        return "file://" + filePath;
      },
    },
    getText: function () {
      return String(text);
    },
    lineAt: function (index) {
      return { text: lines[index] === undefined ? "" : lines[index] };
    },
    offsetAt: function () {
      return 0;
    },
    positionAt: function () {
      return { line: 0, character: 0 };
    },
  };
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + (timeoutMs === undefined ? 15000 : timeoutMs);
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise(function (resolve) {
      setTimeout(resolve, 20);
    });
  }
  return predicate();
}

/** 起一个临时工作目录，塞进假 CLI 与一个 .咕咕 文件 */
function makeWorkdir(frameMessage, exitCode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-purity-"));
  const docFile = path.join(dir, "坏.咕咕");
  fs.writeFileSync(docFile, "咕咕嘎\n咕咕噶嘎\n", "utf8");
  const cliFile = writeFakeCli(dir, frameMessage.frame, exitCode);
  return { dir: dir, docFile: docFile, cliFile: cliFile };
}

// ---------------------------------------------------------------- 行为层

test("isPureLine 接受面板里的咕嘎正文与 reason 标签", async function () {
  await withExtension(function (extension) {
    const accepted = [
      "咕",
      "嘎",
      " ",
      "！？：咕",
      "咕嘎咕",
      "咕咕嘎嘎 嘎嘎咕咕",
      "嘎嘎",
      "咕咕嘎嘎！ 咕咕！？ 咕咕嘎",
      ACTIVATION_LINE,
      // 三方言之后 gu/ga 两字母就是一位：这类纯位串算正文
      "gugugaga",
    ];
    for (const text of accepted) {
      assert.strictEqual(extension.isPureLine(text), true, "应判为纯咕嘎：" + JSON.stringify(text));
    }
  });
});

test("isPureLine 拒绝中文原因、路径、码名、空串、换行与制表符", async function () {
  await withExtension(function (extension) {
    const rejected = [
      "用法错误",
      "读文件失败 /tmp/x.咕咕",
      "E1001",
      "咕咕\n嘎嘎",
      "咕咕\t嘎嘎",
      "咕咕\r嘎嘎",
      "",
      // "gugugaga" 原先在这里；三方言放宽后它是合法的纯位串，已移到接受组
      "ENOENT no such file or directory",
      "非法字符“噶”（U+5676）",
    ];
    for (const text of rejected) {
      assert.strictEqual(extension.isPureLine(text), false, "应判为不纯：" + JSON.stringify(text));
    }
    assert.strictEqual(extension.isPureLine(undefined), false);
    assert.strictEqual(extension.isPureLine(null), false);
    assert.strictEqual(extension.isPureLine(0), false);
  });
});

test("isPureLine 容纳三方言位名（グ/ガ、GU/GA 大小写），仍拒绝中文散文", async function () {
  await withExtension(function (extension) {
    const accepted = ["グ", "ガ", "グガグ", "ぐが", "GUGA", "guga", "GuGa", "グ咕GU！？：", "GUGU!?:", "　"];
    for (const text of accepted) {
      assert.strictEqual(extension.isPureLine(text), true, "应判为纯位名：" + JSON.stringify(text));
    }
    // 落单的 G/U/A 与任何散文都进不去：英文位名必须成对
    const rejected = [
      "G",
      "U",
      "A",
      "GUEST",
      "咕咕 嘎嘎（注释）",
      "ググ ガガ 説明",
      "用法错误",
      "读文件失败 /tmp/x.咕咕",
    ];
    for (const text of rejected) {
      assert.strictEqual(extension.isPureLine(text), false, "应判为不纯：" + JSON.stringify(text));
    }
  });
});

test("append 守卫：不纯的行只进 console.error，不写面板也不抛", async function () {
  const dirty = "读文件失败 /tmp/x.咕咕";
  const captured = await withCapturedConsoleError(async function () {
    await withExtension(async function (extension, state) {
      extension.activate({ subscriptions: [] });
      state.panelLines.length = 0;

      extension.append("咕咕嘎嘎！ 咕？ 嘎嘎咕咕");
      assert.deepStrictEqual(state.panelLines, ["咕咕嘎嘎！ 咕？ 嘎嘎咕咕"]);

      assert.doesNotThrow(function () {
        extension.append(dirty);
      });
      assert.deepStrictEqual(state.panelLines, ["咕咕嘎嘎！ 咕？ 嘎嘎咕咕"], "不纯的行不许写进面板");

      extension.deactivate();
    });
  });
  assert.ok(
    captured.lines.some(function (line) {
      return line.indexOf(dirty) !== -1;
    }),
    "不纯的行要完整落到 console.error，实际：" + JSON.stringify(captured.lines)
  );
});

// ---------------------------------------------------------------- 集成层

test("集成：collect 走 code 23 读文件失败时，面板一行不多、错误只进控制台", async function () {
  const frame = encodeFrame(
    23,
    0,
    0,
    "ENOENT no such file or directory, open '/tmp/gg-坏.咕咕'"
  );
  const work = makeWorkdir({ frame: frame }, 3);

  const captured = await withCapturedConsoleError(async function () {
    await withExtension(async function (extension, state) {
      state.settings.cliPath = work.cliFile;
      state.settings.checkOnChange = false;
      extension.activate({ subscriptions: [] });

      const before = state.panelLines.slice();
      assert.ok(before.length > 0, "激活本身应该已经写过面板");
      assert.ok(
        before.every(function (line) {
          return extension.isPureLine(line);
        }),
        "激活写下的每一行都必须是纯咕嘎：" + JSON.stringify(before)
      );

      state.handlers.save(makeDocument(work.docFile, "咕咕嘎\n咕咕噶嘎\n"));

      const settled = await waitFor(function () {
        return state.collectionSets.length > 0;
      });
      assert.ok(settled, "假 CLI 应在超时前跑完一次检查");

      // 失败路径只写一行纯咕嘎的「检查失败」（以前的泄漏点写的是中文原因 + 路径）
      const added = state.panelLines.slice(before.length);
      assert.deepStrictEqual(added, ["嘎嘎 嘎咕嘎咕 咕咕嘎"]);
      for (const line of added) {
        assert.strictEqual(extension.isPureLine(line), true, "失败路径新增的行必须是纯咕嘎：" + line);
      }
      assert.deepStrictEqual(state.collectionSets[state.collectionSets.length - 1].diags, []);

      const panelText = state.panelLines.join("\n");
      assert.strictEqual(panelText.indexOf("读文件失败"), -1);
      assert.strictEqual(panelText.indexOf("/tmp"), -1);

      extension.deactivate();
    });
  });

  const consoleText = captured.lines.join("\n");
  assert.ok(consoleText.indexOf("读文件失败") !== -1, "外壳码名要落到 console.error：" + consoleText);
  assert.ok(consoleText.indexOf("/tmp/gg-坏.咕咕") !== -1, "帧正文里的路径要落到 console.error");
});

test("集成：E1001 诊断进问题面板，source 用纯咕嘎的集合名", async function () {
  const frame = encodeFrame(1, 2, 7, "非法字符“噶”（U+5676）");
  const work = makeWorkdir({ frame: frame }, 2);

  await withExtension(async function (extension, state) {
    state.settings.cliPath = work.cliFile;
    state.settings.checkOnChange = false;
    extension.activate({ subscriptions: [] });
    assert.strictEqual(state.collectionName, "咕咕嘎嘎");
    assert.strictEqual(extension.isPureLine(state.collectionName), true);

    const before = state.panelLines.slice();
    state.handlers.save(makeDocument(work.docFile, "咕咕嘎\n咕咕噶嘎\n"));

    const settled = await waitFor(function () {
      return state.collectionSets.length > 0;
    });
    assert.ok(settled, "假 CLI 应在超时前跑完一次检查");

    const diags = state.collectionSets[state.collectionSets.length - 1].diags;
    assert.strictEqual(diags.length, 1);
    // 面板可见面：code 不设（否则渲染成 ASCII 的 E1001）、message 是纯位串
    assert.strictEqual(diags[0].code, undefined);
    assert.strictEqual(diags[0].source, "咕咕嘎嘎");
    assert.strictEqual(diags[0].range.start.line, 1, "E1001 在文件的第 2 行");
    assert.match(diags[0].message, /^[咕嘎]+$/);
    assert.strictEqual(extension.isPureLine(diags[0].message), true);
    assert.strictEqual(diags[0].message, frame.trim());
    assert.deepStrictEqual(state.panelLines, before, "有诊断时也不往面板加行");

    extension.deactivate();
  });
});

test("集成：运行命令把 咕咕嘎嘎 <文件> 发进终端，不带动作词、面板只加纯咕嘎一行", async function () {
  const work = makeWorkdir({ frame: encodeFrame(1, 2, 7, "非法字符“噶”（U+5676）") }, 2);

  await withExtension(async function (extension, state, vscode) {
    state.settings.cliPath = work.cliFile;
    extension.activate({ subscriptions: [] });
    vscode.window.activeTextEditor = { document: makeDocument(work.docFile, "咕咕嘎嘎！ 嘎嘎\n") };

    const before = state.panelLines.length;
    await state.commands.get("gugugaga.run")();

    const terminals = vscode.window.terminals;
    assert.strictEqual(terminals.length, 1, "第一次运行应新开一个终端");
    assert.strictEqual(terminals[0].name, "咕咕嘎嘎");
    assert.strictEqual(terminals[0].cwd, path.dirname(work.docFile), "没有工作区时 cwd 取文件所在目录");
    const sent = terminals[0].texts[0];
    assert.strictEqual(sent[1], true, "sendText 要带回车");
    // 命令形如 <node> <cli.ts> <文件>：末尾是文件、且没有 check 的动作词
    assert.strictEqual(sent[0].slice(-work.docFile.length), work.docFile);
    assert.strictEqual(sent[0].indexOf("嘎嘎"), -1, "运行必须是隐式执行，不能带动作词");

    const added = state.panelLines.slice(before);
    assert.deepStrictEqual(added, ["咕咕嘎嘎 咕咕嘎嘎"], "面板只留一行纯咕嘎标记");
    assert.strictEqual(extension.isPureLine(added[0]), true, "面板只留纯咕嘎标记");

    await state.commands.get("gugugaga.run")();
    assert.strictEqual(vscode.window.terminals.length, 1, "第二次运行复用同一个终端");
    assert.strictEqual(terminals[0].texts.length, 2);

    extension.deactivate();
  });
});

// ---------------------------------------------------------------- 静态层

/** 取出源码里每个 append( 调用的实参文本（跳过 function append 的形参） */
function appendCallArgs(source) {
  const needle = "append(";
  const calls = [];
  let index = source.indexOf(needle);
  while (index !== -1) {
    const isDeclaration = /function\s+$/.test(source.slice(Math.max(0, index - 16), index));
    if (!isDeclaration) {
      let depth = 0;
      let end = -1;
      for (let i = index + needle.length - 1; i < source.length; i += 1) {
        if (source[i] === "(") depth += 1;
        else if (source[i] === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      assert.notStrictEqual(end, -1, "append( 的括号没配平：" + source.slice(index, index + 40));
      calls.push(source.slice(index + needle.length, end));
    }
    index = source.indexOf(needle, index + needle.length);
  }
  return calls;
}

test("静态：每个 append( 的实参都不含错误对象、路径与堆栈", function () {
  const calls = appendCallArgs(SOURCE);
  assert.ok(calls.length >= 4, "只扫到 " + calls.length + " 个 append( 调用点，疑似被改写");

  const forbidden = [
    "result.error",
    "err",
    "resolved",
    "uri",
    "args",
    "workspaceRoot",
    "stack",
    "filePath",
    "message",
  ];
  for (const arg of calls) {
    for (const word of forbidden) {
      const hit = new RegExp("\\b" + word.replace(/\./g, "\\.") + "\\b").test(arg);
      assert.strictEqual(hit, false, "append(" + arg + ") 引用了 " + word);
    }
  }

  // 实参里的字面量本身也必须是纯咕嘎（reason 变量由调用点给出，见下一条断言）
  for (const arg of calls) {
    const literals = arg.match(/"[^"]*"/g) || [];
    for (const literal of literals) {
      const text = literal.slice(1, -1);
      assert.match(text, /^[咕嘎！？： ]+$/, "append 实参里有非咕嘎字面量：" + literal);
    }
  }

  // reason / where 这些变量在调用点就只能是纯咕嘎字面量（否则 append 的拼接会漏中文）
  const labelCalls = SOURCE.match(/(?:checkDocument|runCheckSafe|logError)\([^)]*\)/g) || [];
  assert.ok(labelCalls.length >= 6, "只扫到 " + labelCalls.length + " 个标签调用点");
  for (const call of labelCalls) {
    const literal = call.match(/"([^"]*)"/);
    if (!literal) continue;
    assert.match(literal[1], /^[咕嘎！？： ]+$/, "标签实参不是纯咕嘎：" + call);
  }
});

test("静态：append 函数体带 isPureLine 守卫与 console.error 兜底", function () {
  const start = SOURCE.indexOf("function append(");
  assert.notStrictEqual(start, -1);
  const body = SOURCE.slice(start, SOURCE.indexOf("function logError"));
  assert.match(body, /isPureLine\(/);
  assert.match(body, /console\.error\(/);
  assert.match(body, /return;/);
  assert.doesNotMatch(body, /appendLine\(line\)/, "面板只许写守卫后的 text");
});

test("静态：result.error 只走 console.error，不再进面板", function () {
  const match = SOURCE.match(/if \(result\.error\) \{([\s\S]{0,240}?)\}/);
  assert.ok(match, "没找到 result.error 分支，疑似被改写");
  assert.match(match[1], /console\.error\(/);
  assert.doesNotMatch(match[1], /append\([^)]*result\.error/);
  assert.match(match[1], /append\(reason \+ " 嘎咕嘎咕 咕咕嘎"\)/);
});

test("静态：COLLECTION_NAME 是纯咕嘎，且同时用于诊断集合与 source", function () {
  const literal = SOURCE.match(/const COLLECTION_NAME = "([^"]*)";/);
  assert.ok(literal, "COLLECTION_NAME 已不是字符串字面量");
  assert.match(literal[1], /^[咕嘎！？： ]+$/, "问题面板「来源」列只许纯咕嘎，实际：" + literal[1]);
  assert.match(SOURCE, /createDiagnosticCollection\(COLLECTION_NAME\)/);
  assert.match(SOURCE, /diagnostic\.source = COLLECTION_NAME;/);
});
