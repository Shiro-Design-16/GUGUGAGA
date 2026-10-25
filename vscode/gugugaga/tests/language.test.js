"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const language = require(path.join(__dirname, "..", "src", "language.js"));

// macOS 上从 Finder 拿到的文件名可能是分解写法：グ = ク + ゛（U+30AF U+3099）
const NFD_JA = ".\u30AF\u3099\u30AF\u3099";

test("后缀表：四种后缀，与 manifest 的清单同源", function () {
  assert.deepEqual(language.PROGRAM_SUFFIXES, [".咕咕", ".ググ", ".gu", ".gugugaga"]);
});

test("isProgramFile：四种后缀都认", function () {
  assert.equal(language.isProgramFile("/tmp/咕嘎咕嘎.咕咕"), true);
  assert.equal(language.isProgramFile("/tmp/ガググガグ.ググ"), true);
  assert.equal(language.isProgramFile("/tmp/gugugaga.gu"), true);
  assert.equal(language.isProgramFile("/tmp/gugugaga.gugugaga"), true);
});

test("isProgramFile：大写后缀也认（.GU / .Gu）", function () {
  assert.equal(language.isProgramFile("/tmp/upper.GU"), true);
  assert.equal(language.isProgramFile("/tmp/mixed.Gu"), true);
});

test("isProgramFile：分解写法的 .ググ 也认", function () {
  const decomposed = "/tmp/ガググガグ" + NFD_JA;
  assert.notEqual(decomposed, "/tmp/ガググガグ.ググ", "构造出来的必须是分解写法");
  assert.equal(decomposed.normalize("NFC"), "/tmp/ガググガグ.ググ");
  assert.equal(language.isProgramFile(decomposed), true);
});

test("isProgramFile：不相干的名字一律 false", function () {
  assert.equal(language.isProgramFile("/tmp/readme.md"), false);
  assert.equal(language.isProgramFile("/tmp/咕咕"), false);
  assert.equal(language.isProgramFile("/tmp/gugu"), false);
  assert.equal(language.isProgramFile("/tmp/x.gxx"), false);
  assert.equal(language.isProgramFile(""), false);
  assert.equal(language.isProgramFile(null), false);
});
