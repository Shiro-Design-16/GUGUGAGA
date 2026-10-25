// 咕咕嘎嘎语 · 片段（snippets）测试。
// 结构断言 + 硬证据：每条片段把占位符展开成合法名字、补成最小程序，写进系统临时目录的
// .咕咕 文件，再用 node bin/gg.ts check 真跑一遍，断言退出码 0。
// 离线、零依赖、不 require("vscode")。
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PKG_DIR = path.join(__dirname, "..");
const REPO_ROOT = path.join(PKG_DIR, "..", "..");
const CLI = path.join(REPO_ROOT, "bin", "gg.ts");
const SNIPPETS = JSON.parse(
  fs.readFileSync(path.join(PKG_DIR, "snippets", "gugugaga.json"), "utf8")
);

// 正文只允许这六种符号（加换行）
const BODY_ALLOWED = /^[咕嘎！？： \n]*$/;
// 前缀只允许这六种符号（不含换行）
const PREFIX_ALLOWED = /^[咕嘎！？： ]+$/;
const LEGAL_NAME = /^[咕嘎]+$/;
// SPEC §3 四张表的并集：21 个保留词形，名字不得与之相同
const RESERVED = new Set([
  "咕",
  "嘎嘎",
  "嘎嘎嘎",
  "嘎嘎嘎嘎",
  "嘎嘎嘎嘎嘎",
  "嘎嘎嘎嘎嘎嘎",
  "嘎嘎嘎嘎嘎嘎嘎",
  "咕咕",
  "咕咕嘎",
  "咕咕嘎嘎",
  "咕嘎嘎",
  "咕嘎",
  "咕咕咕",
  "咕嘎咕",
  "咕嘎嘎咕",
  "咕嘎咕咕",
  "咕嘎咕嘎",
  "咕咕咕咕",
  "咕咕嘎咕",
  "嘎嘎咕",
  "嘎咕",
]);
// CONTRACT §3 指定的安全名字池
const SAFE_NAMES = ["嘎咕咕", "嘎咕嘎", "嘎咕嘎嘎", "嘎嘎咕咕"];

const ENTRIES = Object.entries(SNIPPETS);

function bodyOf(snippet) {
  return Array.isArray(snippet.body) ? snippet.body.join("\n") : String(snippet.body);
}

// 取出所有占位符的默认文本（美元符+花括号+序号+冒号+默认值）
function defaultsOf(text) {
  const out = [];
  text.replace(/\$\{(\d+):([^}]*)\}/g, (whole, index, def) => {
    out.push(def);
    return whole;
  });
  return out;
}

// 把占位符替换成默认文本（$1 / 花括号形式都覆盖），用于「展开后只含六种符号」的检查
function expand(text) {
  return text
    .replace(/\$\{(\d+):([^}]*)\}/g, (whole, index, def) => def)
    .replace(/\$\{\d+\}/g, "")
    .replace(/\$\d+/g, "");
}

// ---------- 把片段补成「能通过静态检查的最小程序」 ----------
// 统一约定：类名用 嘎咕嘎，入口名用 嘎咕嘎嘎，入口里打印整数 0。
// 每条 case 都写明了补的是什么，避免「片段本身合法、补全后不合法」被掩盖。
const ENTRY_LINES = ["咕咕嘎嘎！ 嘎咕嘎嘎", "    咕：嘎嘎嘎？咕"];

function indentLines(lines) {
  return lines.map((line) => (line.trim() === "" ? line : "    " + line));
}

function padToProgram(snippet) {
  // 先展开占位符：补全后的程序里不能残留占位符语法
  const lines = expand(bodyOf(snippet)).split("\n");
  switch (snippet.prefix) {
    case "咕咕":
      // 类骨架：类本身完整，但整份程序还缺入口块（否则 E3003 缺少入口），补一个入口。
      return [...lines, "", ...ENTRY_LINES];
    case "咕咕嘎":
      // 方法骨架：方法只能写在类体里，补一个类头 + 一个字段，外面再补入口块。
      return ["咕咕！ 嘎咕嘎", "    咕咕！？ 嘎嘎咕咕：嘎嘎嘎？咕", ...indentLines(lines), "", ...ENTRY_LINES];
    case "咕咕嘎嘎":
      // 入口骨架：本身就是一份完整程序，不补任何东西。
      return lines;
    case "咕咕！？":
      // 字段片段：字段只能写在类体里，补一个类头 + 一个占位字段，外面再补入口块。
      return ["咕咕！ 嘎咕嘎", "    咕咕！？ 嘎嘎咕咕：嘎嘎嘎？咕", ...indentLines(lines), "", ...ENTRY_LINES];
    case "咕：":
    case "嘎嘎嘎：":
    case "嘎嘎嘎嘎嘎：":
      // 语句/语句块片段：补一个入口块把它们包起来。
      return ["咕咕嘎嘎！ 嘎咕嘎嘎", ...indentLines(lines)];
    case "咕嘎嘎！": {
      // 新建表达式片段：补一个被新建的类（嘎咕嘎），入口块里把表达式绑到变量上。
      const expr = lines.join(" ").trim();
      return [
        "咕咕！ 嘎咕嘎",
        "    咕咕！？ 嘎嘎咕咕：嘎嘎嘎？咕",
        "",
        "咕咕嘎嘎！ 嘎咕嘎嘎",
        "    咕咕！？ 嘎嘎咕咕：" + expr,
      ];
    }
    default:
      assert.fail("没有为片段前缀「" + snippet.prefix + "」准备补全模板");
  }
}

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gugugaga-snippets-"));
test.after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test("片段文件是合法 JSON 对象，且至少 7 条", () => {
  assert.equal(typeof SNIPPETS, "object");
  assert.ok(SNIPPETS !== null && !Array.isArray(SNIPPETS));
  assert.ok(ENTRIES.length >= 7, "片段少于 7 条：" + ENTRIES.length);
});

test("每条片段都有 prefix / body / description", () => {
  for (const [name, snippet] of ENTRIES) {
    assert.ok(snippet.prefix && typeof snippet.prefix === "string", "「" + name + "」缺 prefix");
    assert.ok(snippet.description && typeof snippet.description === "string", "「" + name + "」缺 description");
    const body = snippet.body;
    const bodyOk = typeof body === "string" || (Array.isArray(body) && body.length > 0 && body.every((l) => typeof l === "string"));
    assert.ok(bodyOk, "「" + name + "」的 body 必须是字符串或非空字符串数组");
  }
});

test("每条 prefix 只含 咕/嘎/！/？/：/空格", () => {
  for (const [name, snippet] of ENTRIES) {
    assert.ok(PREFIX_ALLOWED.test(snippet.prefix), "「" + name + "」的前缀含非法字符：" + snippet.prefix);
  }
});

test("片段正文以它自己的 prefix 开头（触发词就是插入的第一段文字）", () => {
  for (const [name, snippet] of ENTRIES) {
    assert.ok(bodyOf(snippet).startsWith(snippet.prefix), "「" + name + "」正文没以 prefix 开头");
  }
});

test("占位符默认文本都在安全名字池里，且是合法名字（非保留词）", () => {
  let count = 0;
  for (const [name, snippet] of ENTRIES) {
    for (const def of defaultsOf(bodyOf(snippet))) {
      count += 1;
      assert.ok(LEGAL_NAME.test(def), "「" + name + "」的占位默认值不是 咕/嘎 名字：" + def);
      assert.equal(RESERVED.has(def), false, "「" + name + "」的占位默认值是保留词：" + def);
      assert.ok(SAFE_NAMES.includes(def), "「" + name + "」的占位默认值不在安全名字池里：" + def);
    }
  }
  assert.ok(count >= 3, "片段里的占位符太少：" + count);
});

test("展开占位符后正文只含 咕/嘎/！/？/：/空格/换行", () => {
  for (const [name, snippet] of ENTRIES) {
    const expanded = expand(bodyOf(snippet));
    assert.ok(BODY_ALLOWED.test(expanded), "「" + name + "」展开后出现别的字符：" + JSON.stringify(expanded));
    // 展开后不该残留占位符语法
    assert.equal(expanded.includes("$"), false, "「" + name + "」还残留美元符");
    assert.equal(expanded.includes("{") || expanded.includes("}"), false, "「" + name + "」还残留花括号");
  }
});

test("必备片段齐全（类/方法/入口/字段/打印/条件/循环）", () => {
  const prefixes = new Set(ENTRIES.map(([, snippet]) => snippet.prefix));
  for (const required of ["咕咕", "咕咕嘎", "咕咕嘎嘎", "咕咕！？", "咕：", "嘎嘎嘎：", "嘎嘎嘎嘎嘎："]) {
    assert.ok(prefixes.has(required), "缺少片段前缀：" + required);
  }
});

test("补全的前提成立：node 与 bin/gg.ts 都在", () => {
  assert.ok(fs.existsSync(CLI), "找不到 CLI：" + CLI);
  assert.equal(typeof process.execPath, "string");
});

// 每条片段一条测试：展开 → 补全 → 写临时 .咕咕 → node bin/gg.ts check → 退出码必须是 0。
for (const [name, snippet] of ENTRIES) {
  test("片段「" + name + "」展开补全后能通过 node bin/gg.ts check", () => {
    const program = padToProgram(snippet);
    const file = path.join(TMP_DIR, name + ".咕咕");
    fs.writeFileSync(file, program.join("\n") + "\n", "utf8");

    let status = 0;
    let stderr = "";
    try {
      execFileSync(process.execPath, [CLI, "check", file], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      status = typeof error.status === "number" ? error.status : -1;
      stderr = String(error.stderr || error.message || "");
    }
    assert.equal(status, 0, "check 退出码 " + status + "（" + name + "）：\n" + stderr + "\n--- 程序 ---\n" + program.join("\n"));
  });
}

module.exports = { expand, defaultsOf, padToProgram };

test("片段名与描述只有咕嘎字符（片段名与描述都会显示在补全弹窗里）", () => {
  for (const [name, snippet] of ENTRIES) {
    assert.ok(name.length > 0);
    assert.match(name, PREFIX_ALLOWED);
    assert.equal(typeof snippet.description, "string", name + " 的 description 不是字符串");
    assert.ok(snippet.description.length > 0, name + " 缺 description");
    assert.match(snippet.description, PREFIX_ALLOWED);
  }
});

