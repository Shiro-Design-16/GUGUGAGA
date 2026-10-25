/**
 * 咕咕嘎嘎语 · 诊断收集与 GGDIAG v1 位流解码（vscode/CONTRACT.md §4.5，SPEC.md §12）。
 *
 * 为什么是位流：整机对外可见面只许出现 咕/嘎/！/？/：/空格，所以 CLI 的 stderr
 * 不再打印「<文件>:<行>:<列>: E1001 说明」这种人话，而是吐 GGDIAG v1 帧。
 * 帧里唯一的自然语言是 message 正文（语言内核的说明原文）。它是给翻译器读的，
 * 所以面板里不留它：parseDiagnostics 交出的 message 是**整帧位串**（纯 咕/嘎），
 * 复制出去 `ggt decode --diag` 就能还原成人话；人话正文只走 detail 字段，进控制台。
 *
 * 帧布局（每字段 MSB 在前，咕=0、嘎=1）：
 *   magic 4 位 = 1010
 *   version 2 位 = 00
 *   code      8 位   1..21 = E1001..E4012；0 用法错误 / 22 帮助 / 23 读文件失败 / 24 内部错误
 *   line     16 位   1 基，0 = 无位置
 *   column   16 位   1 基，0 = 无位置
 *   mlen     16 位   正文的字节数
 *   正文   mlen×8 位  UTF-8 字节，逐字节 MSB 在前
 *   end 3 位 = 110
 * 总长恒为 65 + 8×mlen 位。帧与帧之间可以夹空格、换行；解码器丢弃一切非 咕/嘎 字符，
 * 因此 stderr 里多出来的空白不会影响定位。
 *
 * 容错口径（照抄 SPEC §12）：magic 或 version 不符 → 向后挪 1 位继续找下一帧；
 * 头对上了但 end 不是 110、或剩余位不够读完正文 → 该帧作废，挪过这段 magic 继续找。
 * 解码器永不抛异常：stderr 再脏也只是解出更少的帧。
 */
const path = require("node:path");

const { runCheck } = require("./cli.js");

const BITS_ZERO = "咕";
const BITS_ONE = "嘎";

/** magic 4 位 + version 2 位 */
const HEAD_PATTERN = [1, 0, 1, 0, 0, 0];
const HEAD_BITS = HEAD_PATTERN.length;
/** 3 位帧尾 */
const END_PATTERN = [1, 1, 0];
/** 不含正文时的固定长度：6 + 8 + 16 + 16 + 16 + 3 */
const FIXED_BITS = 65;
/** 正文起始位（相对帧头） */
const BODY_OFFSET = 62;

/**
 * 码名表：下标 + 1 即帧里的 code。
 * 顺序照 SPEC §9（也就是 src/errors.ts 的 CODE 表顺序），注意没有 E4009。
 */
const CODE_NAMES = [
  "E1001", "E1002", "E1003",
  "E2001", "E2002",
  "E3001", "E3002", "E3003", "E3004", "E3005",
  "E4001", "E4002", "E4003", "E4004", "E4005", "E4006", "E4007", "E4008", "E4010", "E4011", "E4012",
];

/** 外壳自己用的码（不属于语言错误，因此不进问题面板） */
const SHELL_NAMES = { 0: "用法错误", 22: "帮助", 23: "读文件失败", 24: "内部错误" };

/** code → 码名；1..21 是语言错误码，0/22/23/24 是外壳码，其余一律当内部错误 */
function codeName(code) {
  if (typeof code === "number" && code >= 1 && code <= CODE_NAMES.length) {
    return CODE_NAMES[code - 1];
  }
  if (typeof code === "number" && Object.prototype.hasOwnProperty.call(SHELL_NAMES, code)) {
    return SHELL_NAMES[code];
  }
  return SHELL_NAMES[24];
}

/** 只有 1..21 才算诊断问题；帮助帧、用法错误帧都不往问题面板塞 */
function isDiagnosticCode(code) {
  return typeof code === "number" && code >= 1 && code <= CODE_NAMES.length;
}

/** 把任意文本压成位数组：只认 咕=0 / 嘎=1，其余字符全部丢弃 */
function bitsOf(text) {
  const source = typeof text === "string" ? text : "";
  const bits = [];
  for (const ch of source) {
    if (ch === BITS_ZERO) bits.push(0);
    else if (ch === BITS_ONE) bits.push(1);
  }
  return bits;
}

/** 把位数组还原成源码拼写：0→咕、1→嘎 */
function bitsText(bits) {
  let out = "";
  for (const bit of bits) out += bit === 1 ? BITS_ONE : BITS_ZERO;
  return out;
}

/** 从 bits[start] 起读 width 位（MSB 在前）；位不够返回 -1 */
function readBits(bits, start, width) {
  if (start < 0 || width < 0 || start + width > bits.length) return -1;
  let value = 0;
  for (let i = 0; i < width; i += 1) value = value * 2 + bits[start + i];
  return value;
}

/** bits[pos..] 是否逐位等于 pattern（越界即 false） */
function matchesAt(bits, pos, pattern) {
  if (pos < 0 || pos + pattern.length > bits.length) return false;
  for (let i = 0; i < pattern.length; i += 1) {
    if (bits[pos + i] !== pattern[i]) return false;
  }
  return true;
}

/**
 * 解出 stderr 里所有合法帧，返回 Array<{ code, line, column, message, bits }>。
 * bits 是该帧的原始位串（纯 咕/嘎），message 是解出来的 UTF-8 正文，
 * 坏帧被静默跳过——解析器不该因为一行杂音就整体失败。
 */
function decodeFrames(stderr) {
  const bits = bitsOf(stderr);
  const frames = [];
  let pos = 0;
  while (pos + FIXED_BITS <= bits.length) {
    if (!matchesAt(bits, pos, HEAD_PATTERN)) {
      pos += 1;
      continue;
    }
    const code = readBits(bits, pos + 6, 8);
    const line = readBits(bits, pos + 14, 16);
    const column = readBits(bits, pos + 30, 16);
    const size = readBits(bits, pos + 46, 16);
    const bodyStart = pos + BODY_OFFSET;
    const endStart = bodyStart + size * 8;
    if (size < 0 || endStart + END_PATTERN.length > bits.length) {
      // 剩余位不够读完这一帧：作废，挪过 magic 继续找（后面可能还有完整帧）
      pos += HEAD_BITS;
      continue;
    }
    if (!matchesAt(bits, endStart, END_PATTERN)) {
      pos += HEAD_BITS;
      continue;
    }
    const bytes = [];
    for (let i = 0; i < size; i += 1) bytes.push(readBits(bits, bodyStart + i * 8, 8));
    frames.push({
      code: code,
      line: line,
      column: column,
      message: Buffer.from(bytes).toString("utf8"),
      bits: bitsText(bits.slice(pos, endStart + END_PATTERN.length)),
    });
    pos = endStart + END_PATTERN.length;
  }
  return frames;
}

/**
 * 解析一次 check 的 stderr，返回诊断数组 Array<{ line, column, code, message, detail }>。
 *
 * 只收 code 1..21。面板与悬停只看两个字段：
 *   message —— 整帧原始位串（纯 咕/嘎），复制出去 `ggt decode --diag` 就是人话
 *   code    —— 面板不显示（会渲染成 ASCII 码名），只给日志与测试用
 * detail 是解出来的中文正文，一律只进 console.error。
 * filePath 只为 API 对齐（一帧只带一个位置），不参与匹配。
 */
function parseDiagnostics(stderr, filePath) {
  const issues = [];
  const frames = decodeFrames(stderr);
  for (const frame of frames) {
    if (!isDiagnosticCode(frame.code)) continue;
    issues.push({
      line: frame.line,
      column: frame.column,
      code: codeName(frame.code),
      message: frame.bits,
      detail: frame.message,
    });
  }
  return issues;
}

/**
 * 收集一个文件的诊断，永不抛。返回 Promise<{ issues, error }>：
 *   issues 是诊断数组（可能为空），error 是字符串或 null。
 * 退出码与帧的关系按 SPEC §8：失败路径只写 stderr 帧，
 * 所以「没有帧」本身就是一种失败信号，要把原因落进 error，不能装作干净。
 */
async function collect(options) {
  const opts = options || {};
  const filePath = typeof opts.filePath === "string" ? opts.filePath : "";
  const resolved = opts.resolved || null;
  const timeoutMs =
    typeof opts.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : 15000;

  if (!resolved || typeof resolved.exec !== "string" || resolved.exec === "") {
    return { issues: [], error: "咕咕嘎嘎 嘎嘎咕嘎" };
  }

  const result = await runCheck({
    exec: resolved.exec,
    args: resolved.args,
    cwd: path.dirname(filePath || "."),
    timeoutMs: timeoutMs,
  });
  if (result.timedOut) {
    return { issues: [], error: result.error || "咕咕嘎嘎！ 嘎嘎嘎嘎 " + timeoutMs };
  }
  if (result.error) {
    return { issues: [], error: result.error };
  }

  const frames = decodeFrames(result.stderr);
  const issues = parseDiagnostics(result.stderr, filePath);
  if (issues.length > 0) {
    return { issues: issues, error: null };
  }

  // 外壳码（用法错误 / 读文件失败 / 内部错误）自带一句正文，直接当原因显示
  const shellFrames = frames.filter(function (frame) {
    return frame.code === 0 || frame.code === 23 || frame.code === 24;
  });
  if (shellFrames.length > 0) {
    return {
      issues: [],
      error: shellFrames
        .map(function (frame) {
          return codeName(frame.code) + " " + frame.message;
        })
        .join(" "),
    };
  }

  // 帮助帧（22）只是把用法吐了一遍：既不是问题，也不是错误
  const helpOnly = frames.some(function (frame) {
    return frame.code === 22;
  });
  if (helpOnly || result.code === 0) {
    return { issues: [], error: null };
  }

  return { issues: [], error: "嘎咕嘎咕 " + result.code };
}

module.exports = {
  collect: collect,
  parseDiagnostics: parseDiagnostics,
  decodeFrames: decodeFrames,
  bitsText: bitsText,
  codeName: codeName,
  CODE_NAMES: CODE_NAMES,
};
