/**
 * package.json 清单与语法检查（node --test）。不 require vscode，也不 require 其它执行者的模块。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const EXT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(EXT_ROOT, "package.json");
const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
const manifest = JSON.parse(raw);

/** 对外可见文案的白名单：咕 嘎 ！ ？ ： 空格（SPEC §12 的位流口径） */
const VISIBLE_ONLY = /^[咕嘎！？： ]+$/;

test("package.json 是合法 JSON，标识与版本齐全", function () {
  assert.equal(manifest.name, "gugugaga-language");
  assert.equal(manifest.publisher, "gugugaga");
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.displayName, "咕咕嘎嘎");
  assert.ok(typeof manifest.description === "string" && manifest.description.length > 0);
});

test("main / activationEvents / engines 指向本扩展入口", function () {
  assert.equal(manifest.main, "./src/extension.js");
  assert.deepEqual(manifest.activationEvents, ["onLanguage:gugugaga", "onStartupFinished"]);
  assert.equal(manifest.engines.vscode, "^1.75.0");
});

test("categories 同时声明语言与 linter", function () {
  assert.ok(manifest.categories.includes("Programming Languages"));
  assert.ok(manifest.categories.includes("Linters"));
});

test("languages[0]：id / 后缀 / 别名 / 语言配置文件", function () {
  const language = manifest.contributes.languages[0];
  assert.equal(language.id, "gugugaga");
  // SPEC §1.4：四个后缀，大小写不敏感（.GU 也算 .gu，由 VS Code 自己折叠大小写）。
  // 第五项是 .ググ 的分解写法：清单按字面比对，macOS 的文件名可能是 ク + ゛。
  assert.deepEqual(language.extensions, [".咕咕", ".ググ", ".ググ", ".gu", ".gugugaga"]);
  assert.equal(language.configuration, "./language-configuration.json");
  assert.deepEqual(language.aliases, ["咕咕嘎嘎", "ググガガ"]);
});

test("grammars[0]：language / scopeName / path", function () {
  const grammar = manifest.contributes.grammars[0];
  assert.equal(grammar.language, "gugugaga");
  assert.equal(grammar.scopeName, "source.gugugaga");
  assert.equal(grammar.path, "./syntaxes/gugugaga.tmLanguage.json");
});

test("snippets[0]：language / path", function () {
  const snippet = manifest.contributes.snippets[0];
  assert.equal(snippet.language, "gugugaga");
  assert.equal(snippet.path, "./snippets/gugugaga.json");
});

test("configuration：5 个设置与默认值", function () {
  const properties = manifest.contributes.configuration.properties;
  assert.deepEqual(Object.keys(properties).sort(), [
    "gugugaga.checkOnChange",
    "gugugaga.cliPath",
    "gugugaga.debounceMs",
    "gugugaga.maxSteps",
    "gugugaga.nodePath",
  ]);
  // 设置页会把默认值显示给用户，所以默认命令名也必须是纯咕嘎
  assert.equal(properties["gugugaga.cliPath"].default, "咕咕嘎嘎");
  assert.equal(properties["gugugaga.nodePath"].default, "node");
  assert.equal(properties["gugugaga.checkOnChange"].default, true);
  assert.equal(properties["gugugaga.debounceMs"].default, 350);
  assert.equal(properties["gugugaga.maxSteps"].default, null);
  assert.ok(Array.isArray(properties["gugugaga.maxSteps"].type));
});

test("commands：三个命令各带纯咕嘎标题", function () {
  const commands = manifest.contributes.commands;
  const byId = {};
  commands.forEach(function (command) {
    byId[command.command] = command;
  });
  assert.deepEqual(Object.keys(byId).sort(), [
    "gugugaga.checkFile",
    "gugugaga.run",
    "gugugaga.showOutput",
  ]);
  assert.equal(byId["gugugaga.run"].title, "咕咕嘎嘎！ 咕咕嘎嘎");
  assert.equal(byId["gugugaga.checkFile"].title, "咕咕嘎嘎！ 嘎嘎");
  assert.equal(byId["gugugaga.showOutput"].title, "咕咕嘎嘎！ 咕：");
  assert.equal(VISIBLE_ONLY.test(byId["gugugaga.run"].title), true);
  assert.equal(VISIBLE_ONLY.test(byId["gugugaga.checkFile"].title), true);
  assert.equal(VISIBLE_ONLY.test(byId["gugugaga.showOutput"].title), true);
});

test("menus：运行按钮挂在标题栏与右键菜单，只对 .咕咕 生效", function () {
  const menus = manifest.contributes.menus;
  assert.ok(menus && typeof menus === "object");
  ["editor/title", "editor/context"].forEach(function (slot) {
    const entries = menus[slot];
    assert.ok(Array.isArray(entries) && entries.length === 1, "缺少菜单位：" + slot);
    assert.equal(entries[0].command, "gugugaga.run");
    assert.equal(entries[0].when, "editorLangId == gugugaga");
  });
});

test("icon：运行按钮用主题图标，颜色随深/浅色主题", function () {
  const commands = manifest.contributes.commands;
  const runCommand = commands.filter(function (command) {
    return command.command === "gugugaga.run";
  })[0];
  // 自带 SVG 里的 currentColor 作为 <img> 载入会解析成黑色，深色主题下几乎看不见。
  // 改用 codicon：颜色由主题决定。
  assert.equal(runCommand.icon, "$(play)");
  // 标题栏按钮来自 menus["editor/title"]，菜单项自带 icon 时才最稳。
  assert.equal(manifest.contributes.menus["editor/title"][0].icon, "$(play)");
  // 曾经的 editor/title/run 会在标题栏里再渲染一个按钮：同一页面出现两个 ▶。
  assert.equal(manifest.contributes.menus["editor/title/run"], undefined, "不要再往 editor/title/run 里放命令");
  const raw = fs.readFileSync(path.join(EXT_ROOT, "package.json"), "utf8");
  assert.equal(raw.includes("media/"), false, "清单里不该再有自带图标路径");
});

test("languages：四种后缀齐全，且额外含分解写法的 .ググ", function () {
  const language = manifest.contributes.languages[0];
  assert.deepEqual(language.extensions.slice(0, 2), [".咕咕", ".ググ"]);
  assert.equal(language.extensions.includes(".gu"), true);
  assert.equal(language.extensions.includes(".gugugaga"), true);
  const decomposed = language.extensions.filter(function (suffix) {
    return suffix !== ".ググ" && suffix.normalize("NFC") === ".ググ";
  });
  assert.equal(decomposed.length, 1, "缺分解写法的 .ググ（macOS 文件名）");
});

test("activationEvents：装上即激活，好给认不出后缀的文档兜底", function () {
  assert.equal(manifest.activationEvents.includes("onLanguage:gugugaga"), true);
  assert.equal(manifest.activationEvents.includes("onStartupFinished"), true);
});

test("用户可见文案只含 咕/嘎/！/？/：/空格", function () {
  const texts = [manifest.displayName, manifest.description, manifest.contributes.configuration.title];
  manifest.contributes.commands.forEach(function (command) {
    texts.push(command.title);
  });
  for (const text of texts) {
    assert.equal(typeof text, "string");
    assert.match(text, VISIBLE_ONLY, "文案里混进了别的字符：" + text);
  }
  // 语言别名是语言选择器里的名字，允许日语写法（ググガガ），但仍然只许位名
  for (const alias of manifest.contributes.languages[0].aliases) {
    assert.match(alias, /^[咕嘎グガぐが]+$/, "别名混进了别的字符：" + alias);
  }
});

test("language-configuration.json：单词 / 缩进 / 折叠规则都吃三种方言与半角标点", function () {
  const conf = JSON.parse(
    fs.readFileSync(path.join(EXT_ROOT, "language-configuration.json"), "utf8")
  );
  // 单词规则：中文位名、日语假名、英语字母、全角与半角标点都属于同一个词
  const word = new RegExp("^(?:" + conf.wordPattern + ")+$");
  ["咕咕嘎嘎！？：", "ググガガ！？：", "GUGU!?:", "グ咕GU！？："].forEach(function (text) {
    assert.match(text, word, "词规则没覆盖：" + text);
  });
  // 行末冒号（全角或半角）开启缩进
  const increase = new RegExp(conf.indentationRules.increaseIndentPattern);
  ["咕：", "グ：", "GU:", "  :"].forEach(function (line) {
    assert.match(line, increase, "增加缩进规则没覆盖：" + line);
  });
  // 收尾关键字（嘎嘎 / ガガ / GAGA）减少缩进
  const decrease = new RegExp(conf.indentationRules.decreaseIndentPattern);
  ["嘎嘎", "ガガ", "GAGA", "嘎嘎嘎嘎", "GAGAGAGA", "嘎嘎嘎嘎嘎嘎"].forEach(function (line) {
    assert.match(line, decrease, "减少缩进规则没覆盖：" + line);
  });
  assert.equal(conf.folding.offSide, true);
});

test("cli.js：PATH 探测顺序 咕咕嘎嘎 → ググガガ → gggg → gg", function () {
  const source = fs.readFileSync(path.join(EXT_ROOT, "src", "cli.js"), "utf8");
  // 顺序即优先级：日语别名排在中日对照第二位，拉丁旧名垫底
  assert.ok(
    source.includes('const CLI_CANDIDATES = ["咕咕嘎嘎", "ググガガ", "gggg", "gg"];'),
    "cli.js 的 PATH 探测顺序不对"
  );
});

test("设置项不带人话描述（设置页只会显示 ASCII 的设置 id）", function () {
  const properties = manifest.contributes.configuration.properties;
  for (const id of Object.keys(properties)) {
    assert.equal(Object.prototype.hasOwnProperty.call(properties[id], "description"), false, id);
    assert.equal(Object.prototype.hasOwnProperty.call(properties[id], "markdownDescription"), false, id);
  }
});

test("清单里没有 dependencies，也没有 type: module（公共 JS 必须是 CommonJS）", function () {
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, "type"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, "dependencies"), false);
});

test("contributes 里所有相对路径都以 ./ 开头", function () {
  const paths = [
    manifest.main,
    manifest.contributes.languages[0].configuration,
    manifest.contributes.grammars[0].path,
    manifest.contributes.snippets[0].path,
  ];
  paths.forEach(function (p) {
    assert.ok(typeof p === "string" && p.startsWith("./"), "路径应以 ./ 开头：" + String(p));
  });
});

test("src 下的 JS 都是 CommonJS，没有 ESM import/export", function () {
  ["cli.js", "diagnostics.js", "extension.js"].forEach(function (name) {
    const source = fs.readFileSync(path.join(EXT_ROOT, "src", name), "utf8");
    assert.doesNotMatch(source, /^\s*(import|export)\s/m, name + " 出现了 ESM 语句");
    assert.match(source, /module\.exports/, name + " 缺少 module.exports");
  });
});

test("补全 kind 必须是数值透传：completion.js 给的是 CompletionItemKind 数值，不许再做字符串分派", function () {
  // 回归：曾经用 completionKind(item.kind) 按 "snippet"/"keyword" 字符串 switch，数值全落 default → Variable。
  const source = fs.readFileSync(path.join(EXT_ROOT, "src", "extension.js"), "utf8");
  assert.match(
    source,
    /new vscode\.CompletionItem\(item\.label, item\.kind\)/,
    "补全 kind 必须是数值透传：期望 new vscode.CompletionItem(item.label, item.kind)"
  );
  assert.doesNotMatch(
    source,
    /completionKind\s*\(/,
    "补全 kind 必须是数值透传：不许出现按字符串分派的 completionKind()"
  );
  assert.doesNotMatch(
    source,
    /case\s+["'](snippet|keyword|class|method|field|operator)["']/,
    "补全 kind 必须是数值透传：extension.js 里不许有字符串 kind 的分支"
  );
});

test("悬停范围用 positionAt(字符偏移) 换算，不按行/列硬算", function () {
  const source = fs.readFileSync(path.join(EXT_ROOT, "src", "extension.js"), "utf8");
  assert.match(
    source,
    /new vscode\.Range\(\s*document\.positionAt\([^)]*range\.start\)\s*,\s*document\.positionAt\([^)]*range\.end\)\s*\)/,
    "悬停范围必须由 document.positionAt(range.start/end) 换算"
  );
});

test("node --check 能通过 src/extension.js、src/cli.js 与 src/diagnostics.js", function () {
  ["extension.js", "cli.js", "diagnostics.js"].forEach(function (name) {
    const result = spawnSync(process.execPath, ["--check", path.join(EXT_ROOT, "src", name)], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, name + " 语法检查失败：" + result.stderr);
  });
});
