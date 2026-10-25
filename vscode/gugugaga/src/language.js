/**
 * 后缀识别（manifest 之外的兜底）。
 *
 * manifest 的 contributes.languages[].extensions 只能按字面比对：macOS 上从 Finder /
 * 终端拿到的文件名可能用**分解**后的假名（グ = ク U+30AF + ゛ U+3099），而清单里写的是
 * 预组合的 グ（U+30B0），两边永不相等 —— 表现就是 .ググ 文件打开后语言 id 还是 plaintext。
 * 所以运行时按 NFC 归一后再比一次，认出来就让调用方 setTextDocumentLanguage 接管。
 */
"use strict";

/** 有这四种后缀的文件都算本语言程序（与 package.json 的 extensions 一致） */
const PROGRAM_SUFFIXES = [".咕咕", ".ググ", ".gu", ".gugugaga"];

/** NFC + 小写：把「分解的假名」「大写后缀」折回清单里的写法 */
function normalizeName(text) {
  return String(text == null ? "" : text).normalize("NFC").toLowerCase();
}

/** 文件名（或整条路径）是否以本语言的后缀结尾 */
function isProgramFile(name) {
  const value = normalizeName(name);
  if (value === "") return false;
  for (const suffix of PROGRAM_SUFFIXES) {
    if (value.endsWith(normalizeName(suffix))) return true;
  }
  return false;
}

module.exports = {
  PROGRAM_SUFFIXES: PROGRAM_SUFFIXES,
  normalizeName: normalizeName,
  isProgramFile: isProgramFile,
};
