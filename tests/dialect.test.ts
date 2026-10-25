/**
 * 方言外壳测试（SPEC §1.4）：程序输出与诊断帧的字形跟随文件后缀，
 * 但位本身与方言无关——同一份程序在三种写法下归一化后逐位相同。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dialectOfFile, renderBits } from "../src/keywords.ts";
import { decodeOne } from "./ggdiag.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIN = path.join(ROOT, "bin", "gg.ts");

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function gg(args: readonly string[], input = ""): Run {
  const res = spawnSync(process.execPath, [BIN, ...args], { cwd: ROOT, input, encoding: "utf8" });
  if (res.error) throw res.error;
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

const JA = ["グ", "ガ"] as const;
const EN = ["GU", "GA"] as const;

/** 0/1 位串 -> 某方言的字形（期望值自己算，不复用被测代码）。 */
function render(bits: string, glyphs: readonly [string, string]): string {
  let out = "";
  for (const ch of bits) out += ch === "0" ? glyphs[0] : glyphs[1];
  return out;
}

/** 整数 0 的 64 位补码：64 个 0。 */
const ZERO64 = "0".repeat(64);

/** 一份会抛 E4002 的程序（中文写法）。 */
const SRC_UNDEFINED_METHOD = [
  "咕咕！ 嘎咕嘎咕嘎",
  "    咕咕嘎！ 嘎咕咕嘎嘎",
  "        嘎嘎：嘎嘎嘎？咕",
  "",
  "咕咕嘎嘎！ 嘎咕嘎嘎嘎咕",
  "    咕咕！？ 嘎嘎咕嘎咕：咕嘎嘎！ 嘎咕嘎咕嘎？",
  "    咕：嘎嘎咕嘎咕？ 嘎咕嘎咕嘎！",
  "",
].join("\n");

/** 同一份程序的日语写法：咕→グ、嘎→ガ，空格→全角空格（仍是一份合法程序）。 */
function toJa(source: string): string {
  return source.split("咕").join("グ").split("嘎").join("ガ").split(" ").join("\u3000");
}

/** 同一份程序的英语写法：咕→GU、嘎→GA（大小写混排也合法）。 */
function toEn(source: string): string {
  return source.split("咕").join("GU").split("嘎").join("GA");
}

test("dialectOfFile：三方言后缀、大小写不敏感，无后缀/其它后缀一律 zh", () => {
  assert.equal(dialectOfFile("程序.咕咕"), "zh");
  assert.equal(dialectOfFile("程序.ググ"), "ja");
  assert.equal(dialectOfFile("程序.gu"), "en");
  assert.equal(dialectOfFile("程序.GU"), "en", "后缀大小写不敏感");
  assert.equal(dialectOfFile("程序.Gu"), "en");
  assert.equal(dialectOfFile("程序.gugugaga"), "en");
  assert.equal(dialectOfFile("程序.GUGUGAGA"), "en");
  assert.equal(dialectOfFile("程序"), "zh", "无后缀按中文");
  assert.equal(dialectOfFile("程序.txt"), "zh", "不认识的缀按中文");
  assert.equal(dialectOfFile(""), "zh");
});

test("renderBits：zh 原样，ja 换成 グ/ガ，en 换成 GU/GA（长度翻倍）", () => {
  assert.equal(renderBits("咕嘎咕", "zh"), "咕嘎咕");
  assert.equal(renderBits("咕嘎咕", "ja"), "グガグ");
  assert.equal(renderBits("咕嘎咕", "en"), "GUGAGU");
  assert.equal(renderBits("", "en"), "");
});

test(".ググ 程序输出日语字形：只有 グ/ガ、64 位 192 字节", () => {
  const res = gg(["run", path.join("examples", "ガググガグ.ググ")]);
  assert.equal(res.status, 0, "stderr=" + res.stderr);
  assert.match(res.stdout, /^[グガ]+$/, "stdout 只应是日语字形：" + JSON.stringify(res.stdout));
  assert.equal([...res.stdout].length, 64, "仍是 64 位");
  assert.equal(Buffer.byteLength(res.stdout, "utf8"), 192, "64 个三字节字形 = 192 字节");
  assert.equal(res.stdout, render(ZERO64, JA), "位应与中文样例完全一致，只是字形不同");
});

test(".gu 程序输出英文位名：只有大写 GU/GA、128 字符 128 字节", () => {
  const res = gg(["run", path.join("examples", "gugugaga.gu")]);
  assert.equal(res.status, 0, "stderr=" + res.stderr);
  assert.match(res.stdout, /^(GU|GA)+$/, "stdout 只应是 GU/GA：" + JSON.stringify(res.stdout));
  assert.equal(res.stdout.length, 128, "64 位 × 2 字母 = 128 字符");
  assert.equal(Buffer.byteLength(res.stdout, "utf8"), 128, "全是 ASCII = 128 字节");
  assert.equal(res.stdout, render(ZERO64, EN));
});

test("无后缀文件仍按中文输出 咕/嘎", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-dialect-"));
  try {
    const source = fs.readFileSync(path.join(ROOT, "examples", "咕嘎咕嘎.咕咕"), "utf8");
    const file = path.join(dir, "prog");
    fs.writeFileSync(file, source, "utf8");
    const res = gg(["run", file]);
    assert.equal(res.status, 0, "stderr=" + res.stderr);
    assert.match(res.stdout, /^[咕嘎]+$/, "无后缀 → 中文字形：" + JSON.stringify(res.stdout));
    assert.equal(res.stdout.length, 24);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("同一份程序三种写法：输出归一化后逐位相同（只有字形不同）", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gg-dialect-"));
  try {
    const files = {
      zh: path.join(dir, "same.咕咕"),
      ja: path.join(dir, "same.ググ"),
      en: path.join(dir, "same.gu"),
    };
    fs.writeFileSync(files.zh, SRC_UNDEFINED_METHOD, "utf8");
    fs.writeFileSync(files.ja, toJa(SRC_UNDEFINED_METHOD), "utf8");
    fs.writeFileSync(files.en, toEn(SRC_UNDEFINED_METHOD), "utf8");
    const outs = {
      zh: gg(["run", files.zh]),
      ja: gg(["run", files.ja]),
      en: gg(["run", files.en]),
    };
    for (const [name, res] of Object.entries(outs)) {
      assert.equal(res.status, 1, name + "：三份都应撞上同一个运行时错误，stderr=" + res.stderr);
    }
    assert.match(outs.zh.stderr, /^[咕嘎\n]+$/);
    assert.match(outs.ja.stderr, /^[グガ\n]+$/);
    assert.match(outs.en.stderr, /^[GUA\n]+$/);
    const frames = {
      zh: decodeOne(outs.zh.stderr),
      ja: decodeOne(outs.ja.stderr),
      en: decodeOne(outs.en.stderr),
    };
    assert.equal(frames.zh.code, 12, "E4002 未定义方法 → code 12");
    // 中日字形都是一个码位宽，同一份程序的列号因此逐项相同。
    assert.deepEqual(frames.ja, frames.zh, "日语帧与中文帧必须解出同一组 code/位置/正文");
    // 英文位名占两个码位，同一逻辑位置的列号本来就更靠右（列号按源码码位计），
    // 所以只要求码/行/正文相同，列号单独断言它确实右移了。
    assert.equal(frames.en.code, frames.zh.code);
    assert.equal(frames.en.line, frames.zh.line);
    assert.equal(frames.en.message, frames.zh.message);
    assert.ok(frames.en.col > frames.zh.col, "英语源码更宽，列号应更大：" + JSON.stringify(frames));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("帮助帧保持 咕/嘎：没有具体程序，不跟随后缀", () => {
  const res = gg(["--help"]);
  assert.equal(res.status, 0);
  assert.match(res.stderr, /^[咕嘎\n]+$/);
  assert.equal(decodeOne(res.stderr).code, 22);
});

test("用法错误帧保持 咕/嘎，即使参数里带着 .ググ 路径", () => {
  const res = gg(["嘎嘎嘎嘎", "咕", path.join("examples", "ガググガグ.ググ")]);
  assert.equal(res.status, 3, "步数位串为 0 应是用法错误");
  assert.match(res.stderr, /^[咕嘎\n]+$/, "用法错误没有具体程序，仍用 咕/嘎：" + JSON.stringify(res.stderr));
  assert.equal(decodeOne(res.stderr).code, 0);
});
