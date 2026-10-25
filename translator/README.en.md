<!-- i18n:begin -->
[中文](README.md) | **English** | [日本語](README.ja.md)

> This is an English translation. The Chinese [README.md](README.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Guga translator (ggt)

Decode the bare bit stream a Gugugaga program writes to stdout into human-readable text; it also works the other way, encoding text / integers into a bit stream.
Zero dependencies, pure ESM, `.ts` handed straight to Node 24 and run by its type stripping.

## Usage

    ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]
    ggt decode --diag [<位流文件>]
    ggt encode [--int64|--as-literal] [--ja|--en] [<文本文件>]
    ggt --help

With no file it reads stdin (an empty input when stdin is a terminal); with a file it reads the file and ignores stdin.

    cd translator
    ../bin/gg.ts run ../examples/咕嘎咕嘎.咕咕 | node bin/ggt.ts decode --bytes
    # 嗨

    printf 35 | ../bin/gg.ts run ../examples/咕嘎嘎咕.咕咕 | node bin/ggt.ts decode --plan plans/咕嘎嘎咕.plan
    # 104
    # -2

## Decode modes

- `--int64`: one 64-bit block at a time, printed as a signed decimal, one block per line.
- `--bytes`: strict UTF-8 decoding, an illegal sequence is an error; no trailing newline appended.
- `--hex`: one line per 16 bytes, shaped like `0000: E5 97 A8  |...|` (the offset is four hex digits, uppercase; bytes that are not printable become dots in the ASCII column).
- `--bits`: groups of 8 bits separated by spaces, 8 groups per line, no trailing newline appended.
- `--plan`: one slot at a time, driven by a plan file; every bit has to be consumed exactly (one bit too many or too few is an error).
- No mode given: a multiple of 64 is guessed as `--int64`, otherwise a multiple of 8 is guessed as `--bytes`, otherwise `--bits`; the explanation goes to stderr, stdout carries only the result.
- `--diag`: no guessing, it decodes the host's GGDIAG v1 diagnostic frames directly (see the next section), and is mutually exclusive with the five modes above.
- The input bit stream of every mode may mix all three dialects (see “Dialects”), and `--diag` is no exception: the glyphs of a diagnostic frame follow the program's dialect (a .ググ file gives グ / ガ, a .gu file gives GU / GA), while the frame structure stays the same.

## Exit codes

0 success; 1 input / decoding error; 2 usage error; 3 plan file error.

## The encode direction

- `ggt encode`: the text on stdin / in the file is encoded into a byte bit stream as UTF-8, and pure 咕 / 嘎 is written out by default.
- `ggt encode --as-literal`: text mode adds a 嘎嘎嘎嘎？ prefix; with `--int64` it adds a 嘎嘎嘎？ prefix.
- `ggt encode --int64`: the input is decimal tokens (whitespace-separated, a leading minus allowed, range -2^63 .. 2^63-1), each one written out as a 64-bit two's complement.
- `ggt encode --ja`: bit names switch to グ / ガ, and the punctuation is full-width too; the literal prefix it generates is ガガガガ？ / ガガガ？.
- `ggt encode --en`: bit names switch to GU / GA (two letters per bit, so the output doubles in length), and the punctuation is half-width; the prefix is GAGAGAGA? / GAGAGA?.
- `--ja` and `--en` are mutually exclusive; giving both is a usage error (exit code 2). Those two switches belong to encode only; handing them to decode reports “unknown option”.

## Dialects (three on input, two switches on output)

Bit stream input accepts the three spellings of `SPEC.md` §1.1, equivalent position by position, and they can be mixed inside one input:

| Bit | Chinese | Japanese | English (case-insensitive) |
| --- | --- | --- | --- |
| 0 | 咕 | グ (also ぐ) | GU / Gu / gU / gu |
| 1 | 嘎 | ガ (also が) | GA / Ga / gA / ga |

- An English bit name is two ASCII letters read as a pair: gu is 0, ga is 1; a lone g / G is an illegal character like any other and reports an error (exit code 1).
- Whitespace is still space, tab, newline and carriage return, and on top of that **a U+3000 full-width space also counts as whitespace** (SPEC §1.1, the indentation of Japanese sources).
- Inside, everything is normalized to 咕 / 嘎, so plan files, the GGDIAG frame structure and diagnostic text do not change; only the glyphs carried by a frame change, and `--diag` reads them through the same normalization (two letters per English bit name).
- Only the input side of decode and the output side of encode change spelling; the bit stream itself, the mode semantics and the exit codes do not.

    printf 41 | node bin/ggt.ts encode --ja                # ググガガグガググググガガグググガ
    printf 41 | node bin/ggt.ts encode --ja --as-literal   # ガガガガ？…（粘回日语源码）
    printf 41 | node bin/ggt.ts encode --en                # GUGUGAGAGUGAGUGUGUGUGAGAGUGUGUGA
    printf 'ググガガグガググググガガグググガ' | node bin/ggt.ts decode --bytes   # 41

    # 生成的日语位串直接当 咕咕嘎嘎 程序的位串字面量
    BITS=$(printf 41 | node bin/ggt.ts encode --ja)
    printf '咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：嘎嘎嘎嘎？%s\n' "$BITS" > /tmp/ja.ググ
    ../bin/gg.ts run /tmp/ja.ググ | node bin/ggt.ts decode --bytes   # 41

## Diagnostic frames (--diag)

The host writes its error reports to stderr as GGDIAG v1 frames (`SPEC.md` §12; only the glyphs of the bit names vary — 咕 / 嘎, グ / ガ or GU / GA, following the program's dialect); `--diag` turns them back into human language, one frame per line:

    ../bin/gg.ts run 不存在的.咕咕 2>&1 | node bin/ggt.ts decode --diag
    # 读文件失败 无法读取文件 不存在的.咕咕：ENOENT: no such file or directory, open '不存在的.咕咕'

    ../bin/gg.ts 咕咕 2>&1 | node bin/ggt.ts decode --diag
    # 用法错误 用法错误：未知子命令 咕咕（执行程序请直接写文件路径，例如 咕咕嘎嘎 程序.咕咕）

The line format:

    12:3 E2002 未定义的变量 x     有位置时：行:列 码名 正文
    用法错误 未知子命令“foo”     位置是 0 时：码名 正文

- Code names: 1–21 are `E1001`…`E4012` from `SPEC.md` §9 (the order is the error-code table); 0 usage error, 22 help, 23 read-file failure, 24 internal error, anything else prints 未知事件 <码>.
- Bit names are normalized across the three dialects (咕 / グ / GU is 0, 嘎 / ガ / GA is 1, case-insensitive, two letters per English bit); host warnings and the spaces and newlines between frames are all ignored, so you can pipe the whole of stderr straight in.
- Frame boundaries: when magic(1010) / version(00) do not match it shifts one position and keeps looking; a frame whose end is not 110 is dropped whole; a message that was not written in full (truncated) is dropped too, but neither swallows the frames behind it.
- No frame at all: one line on stderr, ggt: 没有找到诊断帧, exit code 1.
- `--diag` is mutually exclusive with `--plan` / `--int64` / `--bytes` / `--hex` / `--bits`; giving both is a usage error (exit code 2).

## Implementation layout

- `src/bits.ts`: bit stream parsing, two's complement conversion, strict UTF-8 decoding, `GgtError`.
- `src/plan.ts`: plan file parsing and slot widths.
- `src/decode.ts`: the five decode modes and the guessing when no mode is given.
- `src/encode.ts`: text / integer encoding and the literal prefixes.
- `src/diag.ts`: GGDIAG v1 diagnostic frame decoding, code-name mapping, and the one-frame-per-line layout.
- `src/cli.ts`: argument parsing, synchronous stdin reading, exit codes.
- `bin/ggt.ts`: the shebang entry point, `import "#cli"` (see below).

## Judgement calls where the contract was silent

1. Module resolution inside bin: the contract requires `bin/ggt.ts` to reuse the CLI implementation, while acceptance also requires that `translator/bin` contains no `../src`.
   The way out is the imports map in `package.json`, `"#cli" -> "./src/cli.ts"`, with `import { main } from "#cli"` in bin.
2. The ASCII column of `--hex`: contract §2.1 says the `|printable ASCII|` column is always there, while the example in §5 only shows hex.
   Here the ASCII column is always written (bytes that are not printable become dots), lines end with a newline, and the offset starts at 0000 in four uppercase hex digits.
3. `--bits` appends no trailing newline; an empty bit stream prints an empty string.
4. A plan `bool` accepts only 8 咕 (false) or 8 嘎 (true); mixed bits count as corrupt input and report an error.
5. Plan syntax: a whole-line # comment and an empty line are ignored; a # inside a line counts as a stray token; an argument accepts only ASCII decimal positive integers
   (+1, 1e3 and 1.5 are all rejected); bits 0 is rejected too; an empty plan is legal (any non-empty bit stream then reports a remainder).
6. `encode --int64` accepts only an optional minus sign plus ASCII digits; +1 and embedded spaces are both rejected; empty input gives empty output.
7. Literal mode gives every value its own prefix; a negative number is an error in literal mode (the language has no negative literal).
8. Text mode encodes every byte of the input as-is, including a trailing newline; no trim.
9. Error messages uniformly carry the `"ggt: "` prefix; on exit code 2 the usage is printed to stderr as well.
10. `--help` / `-h` anywhere on the line is handled first and returns 0.
11. When stdin is a TTY it counts as empty input, so nothing hangs waiting for a human; stdin is read with a `readSync` loop that naps and retries on EAGAIN.
12. `--int64` / `--plan` put one item per line with a trailing newline; `--bytes` appends no newline (it writes the decoded text directly).
13. An input file that cannot be read = exit code 2; a plan file that cannot be read = exit code 3.
14. When `--diag` clashes with another mode it exits per the contract's “2 = usage error” (a task book once said 3; `CONTRACT.md` wins here).
15. When only half a position is given (a line that is not 0, a column that is 0) it still prints “line:column” and does not lose the line number; only when both are 0 is the position left out. When the text is empty, no trailing space is printed.
16. On a bad frame it shifts a single position and resynchronizes instead of skipping the “claimed message length”: a truncated header may be noise, with complete frames behind it.
17. Diagnostic text is decoded as non-strict UTF-8 (a bad byte becomes U+FFFD); one bad byte should not destroy a whole frame.
18. The three dialects act in exactly two places, “input parsing” and “encode output”: internal bit streams, plan slots and GGDIAG frames are always 咕 / 嘎, so the dialect never seeps into the protocol layer; `--diag` normalizes at the entrance per `SPEC` §1.2, which is why the frame structure does not change by a single bit.
19. With `--en` a bit name is two characters per bit, so the output is twice as long as the bit count; gu and GA may be mixed in one input (case-insensitive).
20. `--ja` / `--en` hang off encode only, adding no decode options: decode's output is human language already and needs no dialect.
21. The English bit names of `--diag` are read two letters at a time (never counted per character), so a gu / ga letter pair that happens to appear in a host warning is taken as a bit — the inherent ambiguity the three dialects share; the protocol only guarantees the glyphs of a bit name.

## Tests

    cd translator && npm test

`node:test` + `node:assert/strict`, 104 cases in total, across eight files: bits / decode / plan / encode / cli / diag / dialect / e2e.
The CLI tests run `node bin/ggt.ts` through `spawnSync` (no need for the executable bit); e2e generates bit streams with `../bin/gg.ts`.

## The plan file format (exact decoding)

A host-layer ASCII line-oriented file, kept under `plans/`, describing the slot structure of one bit stream:

```text
# 以 # 开头为注释，空行忽略
int64        # 64 位补码整数，输出有符号十进制
bits <n>     # n 位位串，原样输出
bytes <n>    # n 个字节 = 8n 位，按 UTF-8 输出
bool         # 8 位布尔，输出 真 / 假
```

`int64` / `bool` / `bytes` each take one line of output, `bits <n>` writes the bit string as-is and then a newline. The slots must **consume the whole bit stream exactly** — one bit too many or too few is an error (exit code 1); a syntax error in the plan itself reports the line number (exit code 3).

Existing examples: `plans/咕嘎咕嘎.plan` contains `bytes 3` (24 bits), and `plans/咕嘎嘎咕.plan` is two lines of `int64` (128 bits).

Why it is needed: a bit stream has no self-describing frame, so `64 位整数` and `3 个字节的位串` are indistinguishable at the byte level; an “exact interpretation” therefore has to come from a human-written slot table. Only when no plan is given is there a guessing mode.
