import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GgtError } from "../src/bits.ts";

/** 嗨（U+55E8）的 UTF-8 字节 E5 97 A8 对应的 24 位位流。 */
export const HAI_BITS = "嘎嘎嘎咕咕嘎咕嘎嘎咕咕嘎咕嘎嘎嘎嘎咕嘎咕嘎咕咕咕";

export const TRANSLATOR_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const GGT_BIN = path.join(TRANSLATOR_ROOT, "bin", "ggt.ts");
export const GG_BIN = path.join(TRANSLATOR_ROOT, "..", "bin", "gg.ts");

/** 断言 fn 抛出 GgtError，且退出码与消息片段都对得上。 */
export function expectGgtError(fn: () => unknown, exitCode: 1 | 2 | 3, ...fragments: string[]): GgtError {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof GgtError, "期望抛出 GgtError，实际：" + String(error));
    assert.equal(error.exitCode, exitCode, "退出码不符：" + error.message);
    for (const fragment of fragments) {
      assert.ok(
        error.message.includes(fragment),
        "错误信息“" + error.message + "”不包含“" + fragment + "”",
      );
    }
    return error;
  }
  assert.fail("期望抛出 GgtError，但没有抛出");
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runNode(script: string, args: string[], input: string): RunResult {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: TRANSLATOR_ROOT,
    input,
    encoding: "utf8",
  });
  if (result.error !== undefined) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** 用 node bin/ggt.ts 跑命令行（不依赖可执行权限）。 */
export function runGgt(args: string[], input = ""): RunResult {
  return runNode(GGT_BIN, args, input);
}

/** 用语言实现生成位流，供端到端测试当上游。 */
export function runGg(args: string[], input = ""): RunResult {
  return runNode(GG_BIN, args, input);
}
