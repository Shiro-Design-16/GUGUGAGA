/**
 * 多文件工程（祖先链可见性）的行为测试。
 *
 * 两条规则在这里被钉死：
 *  1. 有入口的文件是**程序**，没有入口的文件是**库**；
 *  2. 库的可见性只看目录位置——自己所在目录与所有祖先目录可见，兄弟分支与更深目录不可见。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GgError } from "../src/errors.ts";
import { collectProgramFiles, isVisibleDir, loadProject, projectRootOf } from "../src/project.ts";
import { decodeOne } from "./ggdiag.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "gg.ts");
const GU = "咕";
const GA = "嘎";
const ONLY_BITS = /^[咕嘎]*$/;
/** 64 位补码的 1：63 个 0 加一个 1。 */
const ONE_BITS = GU.repeat(63) + GA;

/** 库：类 嘎咕嘎咕嘎，字段 嘎咕咕嘎咕 初值 1，方法 嘎咕咕嘎嘎 返回它。没有入口。 */
const LIB = [
  "咕咕！ 嘎咕嘎咕嘎",
  "    咕咕！？ 嘎咕咕嘎咕：嘎嘎嘎？嘎",
  "    咕咕嘎！ 嘎咕咕嘎嘎",
  "        嘎嘎：嘎咕咕嘎咕？",
  "",
].join("\n");

/** 程序：新建该类、调用方法、打印 → 输出 64 位的 1。 */
const MAIN = [
  "咕咕嘎嘎！ 嘎嘎嘎咕嘎嘎",
  "    咕咕！？ 嘎嘎咕嘎咕：咕嘎嘎！ 嘎咕嘎咕嘎？",
  "    咕：嘎嘎咕嘎咕？ 嘎咕咕嘎嘎！",
  "",
].join("\n");

/** 另一个只定义无关类的库，用来把项目根撑到一层目录。 */
const OTHER_LIB = [
  "咕咕！ 嘎嘎咕嘎嘎",
  "    咕咕！？ 嘎咕咕嘎咕：嘎嘎嘎？咕",
  "",
].join("\n");

/** 临时工程：files 是 相对路径 -> 源码，body 跑完即删。 */
function withProject(files: Record<string, string>, body: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-project-"));
  try {
    for (const [name, source] of Object.entries(files)) {
      const full = path.join(dir, name);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, source, "utf8");
    }
    body(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function gg(args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: "utf8" });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function catchGg(fn: () => void): GgError {
  try {
    fn();
  } catch (err) {
    if (err instanceof GgError) return err;
    throw err;
  }
  throw new Error("期望抛出 GgError，实际没有抛");
}

test("isVisibleDir：同目录与祖先可见，兄弟与更深不可见", () => {
  assert.equal(isVisibleDir("/p/app", "/p"), true, "父目录可见");
  assert.equal(isVisibleDir("/p/app", "/p/app"), true, "自己所在的目录可见");
  assert.equal(isVisibleDir("/p/app", "/p/app/deep"), false, "更深的目录不可见");
  assert.equal(isVisibleDir("/p/app", "/p/other"), false, "兄弟分支不可见");
  assert.equal(isVisibleDir("/p/app", "/p/ap"), false, "前缀相同的目录不算祖先");
});

test("projectRootOf：父目录里还有程序文件就继续爬，临时目录不当根", () => {
  withProject({ "base.咕咕": LIB, "app/main.咕咕": MAIN }, (dir) => {
    assert.equal(projectRootOf(path.join(dir, "app", "main.咕咕")), dir, "爬到含 base.咕咕 的那层");
    assert.equal(projectRootOf(path.join(dir, "base.咕咕")), dir, "系统临时目录之上不再爬");
  });
});

test("projectRootOf：/tmp 只是软链，也不当项目根", () => {
  const dir = fs.mkdtempSync("/tmp/gg-project-");
  try {
    fs.writeFileSync(path.join(dir, "base.咕咕"), LIB, "utf8");
    assert.equal(projectRootOf(path.join(dir, "base.咕咕")), dir, "入口在 /tmp 下，根就是它自己那层");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("collectProgramFiles：递归、按路径排序、跳过隐藏目录与 node_modules", () => {
  withProject(
    {
      "b.咕咕": LIB,
      "a.gu": LIB,
      "sub/c.ググ": LIB,
      ".hidden/d.咕咕": LIB,
      "node_modules/e.咕咕": LIB,
      "notes.md": "x",
    },
    (dir) => {
      const found = collectProgramFiles(dir).map((file) => path.relative(dir, file));
      assert.deepEqual(found, ["a.gu", "b.咕咕", path.join("sub", "c.ググ")]);
    },
  );
});

test("跨文件：入口在子目录，类在上层目录的库里，能 new 能调", () => {
  withProject({ "base.咕咕": LIB, "app/main.咕咕": MAIN }, (dir) => {
    const res = gg(["run", path.join(dir, "app", "main.咕咕")]);
    assert.equal(res.status, 0, "stderr=" + res.stderr);
    assert.match(res.stdout, ONLY_BITS, "stdout 只许是位流");
    assert.equal(res.stdout, ONE_BITS, "字段初值 1 经方法返回并打印");
  });
});

test("既有类又有入口的文件是程序：它自己跑得动，类却不进别人的工程", () => {
  const libWithEntry = LIB + "咕咕嘎嘎！ 嘎嘎嘎咕嘎嘎\n    咕：嘎嘎嘎？咕\n";
  withProject({ "base.咕咕": libWithEntry, "app/main.咕咕": MAIN }, (dir) => {
    const self = gg(["run", path.join(dir, "base.咕咕")]);
    assert.equal(self.status, 0, "它自己的入口照旧能跑，stderr=" + self.stderr);
    assert.equal(self.stdout, GU.repeat(64), "它自己的入口打印整数 0");

    const other = gg(["run", path.join(dir, "app", "main.咕咕")]);
    assert.equal(other.status, 2, "main 看不见它的类，stderr=" + other.stderr);
    assert.equal(decodeOne(other.stderr).code, 10, "E3005 的帧码是 10");
  });
});

test("嘎嘎（检查）也走同一个载入器：跨文件能过，且 stderr 为空", () => {
  withProject({ "base.咕咕": LIB, "app/main.咕咕": MAIN }, (dir) => {
    const res = gg(["嘎嘎", path.join(dir, "app", "main.咕咕")]);
    assert.equal(res.status, 0, "stderr=" + res.stderr);
    assert.equal(res.stdout, "");
    assert.equal(res.stderr, "");
  });
});

test("两个可见库声明同一个类：E3001，正文里带两份文件名", () => {
  withProject({ "a.咕咕": LIB, "b.咕咕": LIB, "main.咕咕": MAIN }, (dir) => {
    const err = catchGg(() => loadProject(path.join(dir, "main.咕咕"), MAIN));
    assert.equal(err.code, "E3001");
    assert.match(err.message, /嘎咕嘎咕嘎/, "要说是哪个类名");
    assert.match(err.message, /a\.咕咕/);
    assert.match(err.message, /b\.咕咕/);
  });
});

test("更深目录里的库对上层入口不可见：新建时报 E3005，并提示它在哪", () => {
  withProject({ "base.咕咕": OTHER_LIB, "main.咕咕": MAIN, "lib/base.咕咕": LIB }, (dir) => {
    const res = gg(["run", path.join(dir, "main.咕咕")]);
    assert.equal(res.status, 2, "类不可见属静态错误段 E3xx，stderr=" + res.stderr);
    const frame = decodeOne(res.stderr);
    assert.equal(frame.code, 10, "E3005 的帧码是 10");
    assert.match(frame.message, /未定义/, frame.message);
    assert.match(frame.message, /lib[\/]base\.咕咕/, "要指出它其实在哪个文件：" + frame.message);
    assert.match(frame.message, /不可见/, frame.message);
  });
});

test("兄弟分支的库既不可见、也不在类表里", () => {
  withProject(
    { "base.咕咕": OTHER_LIB, "a/main.咕咕": MAIN, "b/base.咕咕": LIB },
    (dir) => {
      const load = loadProject(path.join(dir, "a", "main.咕咕"), MAIN);
      assert.deepEqual(load.program.classes.map((cls) => cls.name).sort(), ["嘎嘎咕嘎嘎"]);
      assert.equal(load.hidden.get("嘎咕嘎咕嘎"), path.join("b", "base.咕咕"), "只留一句提示用的索引");
    },
  );
});

test("可见库有语法错误：报 E2001 且正文带文件名", () => {
  withProject({ "base.咕咕": "咕：咕？ 嘎？\n", "main.咕咕": MAIN }, (dir) => {
    const err = catchGg(() => loadProject(path.join(dir, "main.咕咕"), MAIN));
    assert.equal(err.code, "E2001");
    assert.match(err.message, /^base\.咕咕：/, "正文要以文件名开头：" + err.message);
  });
});

test("邻居在词法上就写坏了：跳过它，入口照旧能跑", () => {
  const brokenLex = "咕咕嘎嘎！ 嘎嘎嘎咕嘎嘎\n    咕：噶\n";
  withProject({ "main.咕咕": MAIN, "base.咕咕": LIB, "broken.咕咕": brokenLex }, (dir) => {
    const res = gg(["run", path.join(dir, "main.咕咕")]);
    assert.equal(res.status, 0, "词法都过不去的邻居不该连累入口，stderr=" + res.stderr);
    assert.equal(res.stdout, ONE_BITS);
  });
});

test("邻居自己是有入口的程序且写坏了：不连累入口程序", () => {
  const broken = "咕咕嘎嘎！ 嘎咕\n    咕：咕？ 嘎？\n";
  withProject({ "main.咕咕": MAIN, "base.咕咕": LIB, "broken.咕咕": broken }, (dir) => {
    const res = gg(["run", path.join(dir, "main.咕咕")]);
    assert.equal(res.status, 0, "坏掉的邻居是独立程序，不该拖累 main，stderr=" + res.stderr);
    assert.equal(res.stdout, ONE_BITS);
  });
});
