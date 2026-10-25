<!-- i18n:begin -->
[中文](CONTRACT.md) | **English** | [日本語](CONTRACT.ja.md)

> This is an English translation. The Chinese [CONTRACT.md](CONTRACT.md) is authoritative; if they diverge, the Chinese version wins.
<!-- i18n:end -->

# The Gugu-Gaga Translator · Contract (frozen; changes require the dispatcher)

This file is the interface contract for the **Gugu-Gaga translator** project. The translator is a sibling project of the Gugugaga language (Chinese: 咕咕嘎嘎语): the language side only writes the raw bit stream to stdout; readability is this project's job.

## 0. Location and decoupling

- Landing directory: `translator/` (relative to the repository root; it sits here only because the sandbox can write inside this workspace — logically it is an independent project with its own package.json / README / tests).
- **Forbidden**: `import` any module of the language implementation (`../src/**`, `../bin/**`). The only allowed coupling is an end-to-end test that **spawns a child process** to run `../bin/gg.ts run ../examples/xxx.咕咕`.
- Zero dependencies: only Node built-in modules (`node:fs` / `node:process` / `node:path` / `node:test` / `node:assert`).
- The sources are `.ts` and run directly through Node type stripping (same as the main language project; verified working on Node 24).

## 1. Input conventions (from the language README §4)

Bit stream text contains only two characters: `咕`(0) and `嘎`(1). The decoder **tolerates whitespace**: spaces, `\t`, `\n`, `\r` are dropped while reading; any other character is an error (exit code 1), and the error message must report that character and its code point (form: `非法字符“x”（U+XXXX），位于输入第 N 个字符`), where N is its **1-based character index** in the input (counted by code point).

Value encoding (the decoder side must implement every row):

| Type | Bit width | Encoding |
| --- | --- | --- |
| Integer int64 | 64 | two's complement, most significant bit first |
| Bit string bits(n) | n | verbatim, most significant bit first |
| Bytes bytes(n) | 8n | one byte per 8 bits, most significant bit first, interpreted as UTF-8 as a whole |
| Boolean bool | 8 | 8 `咕` = false, 8 `嘎` = true |

## 2. CLI contract

```text
用法：
  ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]
  ggt encode [--int64|--as-literal] [<文本文件>]
  ggt --help

未给 <文件> 时从 stdin 读；给出时从文件读。
退出码：0 成功；1 输入/解码错误；2 用法错误；3 plan 文件错误。
```

> Translator's note: the code blocks in this document quote real program output and host-layer file formats, so they keep their original Chinese text.

### 2.1 The six forms of decode

| Invocation | Behavior |
| --- | --- |
| `--plan F` | Decode exactly per the plan's slots; after the slots are consumed, the input **must** be used up exactly — one bit too many or too few is an error (exit code 1) |
| `--int64` | One two's-complement integer per 64 bits, decimal with a minus sign, **one per line**; a total bit count that is not a multiple of 64 is an error |
| `--bytes` | One byte per 8 bits, output after strict UTF-8 decoding of the whole (**no trailing newline**); a count that is not a multiple of 8 or invalid UTF-8 is an error |
| `--hex` | One byte per 8 bits, output `偏移: 十六进制（两位大写，空格分隔）  |可打印 ASCII|`, 16 bytes per line, offset is four hex digits starting from 0 |
| `--bits` | The bit stream verbatim, one group per 8 bits separated by spaces, newline after each line of 8 groups (= 64 bits), no trailing spaces on the last line |
| No mode flag | Guess the mode and print one explanatory line on **stderr**: bit count is a multiple of 64 → `--int64`; otherwise a multiple of 8 → `--bytes`; otherwise → `--bits`. stdout carries only the result |

`--plan` together with any other mode flag = usage error (exit code 2).

### 2.2 encode

| Invocation | Behavior |
| --- | --- |
| `--int64` | Read decimal integers from the input (whitespace/newline separated, a minus sign allowed) and output one 64-bit two's-complement bit stream each; an invalid integer or a value outside the int64 range (-2^63 .. 2^63-1) is an error |
| `--as-literal` | Put a literal prefix in front of the output bit stream so it can be pasted into source: text mode → `嘎嘎嘎嘎？<位流>`; `--int64` mode → `嘎嘎嘎？<该值的无符号二进制位串>` (a negative value is an error in literal mode: the source has no negative literal, use `咕咕嘎咕？` to negate) |
| No mode flag | Encode the input text as a UTF-8 byte bit stream (8 bits per byte, most significant bit first), **no trailing newline** |

encode output is always a pure `咕`/`嘎` string (no spaces, no newlines) and can go straight into a pipe.

## 3. The plan file format (host-layer ASCII, line-oriented)

```text
# 以 # 开头的行为注释；空行忽略
int64        # 64 位补码整数
bits <n>     # n 位位串（n 为正整数，原样输出）
bytes <n>    # n 个字节 = 8n 位，按 UTF-8 输出
bool         # 8 位布尔，输出 真 / 假
```

- Unknown type name, missing argument, argument that is not a positive integer, stray token → exit code 3, reporting the **line number**.
- `int64`/`bool`/`bytes` each take one line in the output; `bits <n>` outputs the bit string verbatim and then a newline.

## 4. Files you must deliver (your write boundary)

```text
translator/package.json          # {"type":"module","scripts":{"test":"node --test \"tests/**/*.test.ts\""},"bin":{"ggt":"bin/ggt.ts"}}
translator/bin/ggt.ts            # shebang + import main，chmod 755
translator/src/bits.ts           # 位流解析/拼接/整数⇄位串 helper（可自定签名）
translator/src/plan.ts           # plan 解析
translator/src/decode.ts         # 五种解码模式（plan/int64/bytes/hex/bits）+ 无模式猜测
translator/src/encode.ts         # 文本→位流、整数→位流、--as-literal
translator/src/cli.ts            # main(argv): number，参数解析、退出码、诊断
translator/tests/*.test.ts       # 见 §5
translator/plans/咕嘎咕嘎.plan # 内容应为 bytes 3（对应 examples/咕嘎咕嘎.咕咕 的 24 位）
translator/plans/咕嘎嘎咕.plan       # 内容应为 int64 + int64（对应 examples/咕嘎嘎咕.咕咕 的 128 位）
```

**Do not** modify `translator/CONTRACT.md` or any file in the root directory (`SPEC.md`/`README.md`/`src/**`/`tests/**`/`examples/**`).

## 5. Test list (every item needs a real assertion)

1. `bits.ts`: `咕嘎咕` → value 2; `咕`×64 → 0; `嘎`×64 → -1 (int64); `300` → low 64 bits = 300; the negative -2 → 64-bit two's complement; whitespace tolerance; an illegal character reports the code point and the index.
2. `decode --int64`: 320 bits → 5 integers; a count that is not a multiple of 64 → error.
3. `decode --bytes`: 24 bits = `E5 97 A8` → `嗨`; multi-byte mixed text (ASCII + Chinese + emoji) round-trips; invalid UTF-8 (such as `F0 FF FF`) → error.
4. `decode --hex`: 24 bits → `0000: E5 97 A8`; correct line break at 17 bytes.
5. `decode --bits`: `咕`×9 → `咕咕咕咕咕咕咕咕 咕` (grouped per 8 bits).
6. plan: `bytes 3` consumes exactly 24 bits; 8 bits left after `int64` → error (the remaining bit count appears in the message); plan syntax error → exit code 3 with a line number.
7. The three tiers of mode guessing: a multiple of 64 → int64 (stderr has a note, stdout has only numbers); a multiple of 8 → bytes; neither → bits.
8. encode: `嗨` → a 24-bit bit stream (the 8 bits of each byte of `E5 97 A8`, high bit first, asserted bit by bit); the `--as-literal` prefix is correct; `--int64` negative values and boundaries (-2^63, 2^63-1, 2^63 → error).
9. CLI: `--help` → 0; no arguments → 2; unknown subcommand → 2; `--plan` together with `--bytes` → 2; missing file → 2.
10. End to end (child process): pipe the output of `../bin/gg.ts run ../examples/咕嘎咕嘎.咕咕` into `decode --bytes` → `嗨`; into `decode` (no mode) → `嗨` as well; `printf 35 | ../bin/gg.ts run ../examples/咕嘎嘎咕.咕咕 | decode --plan plans/咕嘎嘎咕.plan` → two lines, `104` and `-2`.

## 6. Acceptance criteria (the dispatcher reruns them)

1. `cd translator && npm test` is all green; report the number of passing tests.
2. I rerun the three commands from item 10 above by hand and they pass.
3. `grep -rn "../src\|../bin" translator/src translator/bin` has no hits (decoupling).
4. The hand-off notes explain item by item: which data structures were used, how boundaries are handled, and where conservative interpretations were made.

## 7. Revision log: multiple dialects (appended by task-12, append-only)

This section is appended under the authority of the multi-dialect task brief and **supersedes the conflicting wording in §1 and §2**; §3–§6 stay untouched.
`SPEC.md` §1 is authoritative: the translator merely implements the same set of bit-name rules on both sides, input parsing and encode output.

### 7.1 The input character set (an extension of §1)

Bit stream input accepts three notations per `SPEC.md` §1.1, **equivalent bit by bit and mixable within one input**:

| Bit | Chinese | Japanese | English (ASCII, case-insensitive) |
| --- | --- | --- | --- |
| 0 | 咕 U+5495 | グ U+30B0 (also accepts ぐ U+3050) | the letter g/G followed by u/U, i.e. GU/Gu/gU/gu |
| 1 | 嘎 U+560E | ガ U+30AC (also accepts が U+304C) | the letter g/G followed by a/A, i.e. GA/Ga/gA/ga |

- An English bit name is **two ASCII letters per bit** and is read in pairs; a g/G outside a pair (for example a lone g at the end of a line) and any character not in the table are
  always reported in the §1 manner: `非法字符“x”（U+XXXX），位于输入第 N 个字符`, exit code 1. N counts **code points** (an emoji is one character),
  and an English bit name occupies two character positions.
- Whitespace: spaces, tabs, newlines and carriage returns are still tolerated, **plus the U+3000 ideographic space** (the Japanese indentation in `SPEC.md` §1.1). Other whitespace (such as U+00A0) is still illegal.
- Everything is normalized internally to 咕 / 嘎: plan slots, GGDIAG frames and diagnostic text are unaffected by dialect.

### 7.2 The output dialect of encode (an extension of §2)

```text
用法：
  ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]
  ggt decode --diag [<位流文件>]
  ggt encode [--int64|--as-literal] [--ja|--en] [<文本文件>]
  ggt --help
```

- The default (no flag) is still 咕 / 嘎, and the output is byte-for-byte identical to the old version.
- `--ja`: bit names グ / ガ, full-width punctuation (literal prefixes `ガガガガ？`, `ガガガ？`).
- `--en`: bit names GU / GA (two letters per bit, so the output is twice as long as the bit count), half-width punctuation (prefixes `GAGAGAGA?`, `GAGAGA?`).
- `--ja` and `--en` together → usage error, exit code 2. Both belong to encode only; giving them to decode or `--diag` reports a usage error as an unknown option (exit code 2).
- The output of decode and `--diag`, the plan file semantics, and the GGDIAG v1 frame format and code table: **not a single byte changes**.

### 7.3 `--diag` accepts frames in all three dialects (appended by task-33)

The shell's bit-name glyphs follow the source file's suffix (`SPEC.md` §8.1), so a diagnostic frame on stderr may use `咕`/`嘎`, `グ`/`ガ` or `GU`/`GA`.

- The decoder first normalizes the input to 咕/嘎 with §7.1, then filters and parses it as GGDIAG v1; mixing the glyphs bit by bit within one frame is accepted as well.
- The frame structure, the code table, the output layout (`行:列 码名 正文`, the prefix dropped when both line and column are 0) and the exit codes 0/1/2/3: nothing changes.
- `--diag` still does not accept `--ja`/`--en` (they belong to encode only; giving them to decode or `--diag` reports a usage error as an unknown option, exit code 2).
- The price: a `gu`/`ga` letter pair that happens to appear in host warning text is taken as one bit — that is the protocol cost of spelling English bit names in ASCII.
