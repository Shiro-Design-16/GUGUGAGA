# 咕嘎嘎咕嘎（ggt）

嘎嘎咕嘎咕咕嘎嘎咕嘎 stdout 咕嘎咕嘎嘎咕嘎嘎嘎咕嘎咕；咕咕咕咕嘎嘎嘎 / 咕咕嘎咕嘎咕嘎。

嘎嘎嘎、咕 ESM：`.ts` 咕嘎 Node 24 咕嘎咕咕咕嘎咕嘎嘎，咕嘎咕咕嘎嘎。

## 嘎咕

    ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]
    ggt decode --diag [<位流文件>]
    ggt encode [--int64|--as-literal] [--ja|--en] [<文本文件>]
    ggt --help

嘎 `translator/` 嘎咕嘎咕 `node bin/ggt.ts …` 咕咕，嘎咕咕咕嘎嘎：

    cd translator
    npm link                          # 嘎咕嘎咕咕嘎嘎 ggt
    node bin/ggt.ts --help

嘎嘎嘎嘎嘎咕 stdin（stdin 嘎咕嘎咕咕咕嘎嘎嘎咕）；咕咕咕咕嘎咕嘎咕、咕嘎 stdin。

嘎嘎嘎嘎：

    cd translator
    ../bin/gg.ts run ../examples/嘎咕嘎嘎.嘎咕 | node bin/ggt.ts decode --bytes
    # 咕

    printf 35 | ../bin/gg.ts run ../examples/嘎咕嘎嘎.嘎咕 | node bin/ggt.ts decode --plan plans/嘎咕嘎嘎.plan
    # 104
    # -2

## 咕咕咕咕

- --int64：咕 64 咕嘎咕，咕咕嘎咕咕咕咕嘎，嘎嘎嘎嘎。
- --bytes：咕 UTF-8 嘎咕咕咕，嘎咕嘎咕咕咕；嘎咕咕嘎嘎嘎咕。
- --hex：咕 16 咕咕嘎咕，嘎咕 0000: E5 97 A8  |...|（咕咕咕咕咕咕嘎嘎咕嘎，ASCII 咕咕咕嘎咕嘎咕）。
- --bits：咕 8 咕嘎嘎、咕咕嘎嘎，嘎嘎 8 咕，嘎咕咕嘎嘎嘎咕。
- --plan：咕 plan 嘎嘎嘎嘎咕嘎嘎，嘎咕咕嘎咕嘎嘎嘎嘎嘎（咕嘎嘎咕咕嘎咕嘎嘎）。
- 嘎咕嘎嘎：64 咕咕咕咕 --int64，嘎嘎 8 咕咕咕咕 --bytes，嘎嘎 --bits；咕咕嘎 stderr，stdout 嘎嘎咕嘎。
- --diag：咕嘎咕，咕嘎咕咕咕嘎 GGDIAG v1 嘎嘎咕（咕「嘎嘎咕」咕嘎），嘎咕嘎咕嘎嘎嘎嘎嘎。
- 嘎咕嘎嘎嘎嘎咕咕咕嘎嘎嘎咕嘎嘎嘎咕嘎（咕「嘎咕」），--diag 咕嘎嘎：咕嘎咕咕嘎嘎嘎嘎嘎咕嘎嘎嘎嘎嘎（.ググ 嘎 グ / ガ，.gu 嘎 GU / GA），嘎咕咕咕嘎。

## 嘎咕嘎

0 嘎咕；1 嘎咕 / 嘎嘎嘎嘎；2 嘎咕嘎嘎；3 plan 咕咕嘎咕。

## 咕嘎咕咕

- ggt encode：stdin / 嘎嘎嘎嘎嘎咕 UTF-8 咕咕嘎咕嘎嘎，咕咕嘎嘎嘎 咕 / 嘎。
- ggt encode --as-literal：嘎嘎嘎咕咕 咕嘎嘎嘎？ 咕咕；咕 --int64 嘎嘎 嘎咕嘎？ 咕咕。
- ggt encode --int64：咕嘎嘎咕咕咕咕（咕咕嘎嘎、嘎嘎嘎咕，咕嘎 -2^63 .. 2^63-1），嘎咕嘎嘎 64 咕嘎咕。
- ggt encode --ja：咕咕嘎嘎 グ / ガ，嘎嘎嘎嘎嘎；嘎咕咕咕咕嘎嘎嘎嘎 ガガガガ？ / ガガガ？。
- ggt encode --en：咕咕嘎嘎 GU / GA（咕咕咕嘎咕咕，咕嘎咕咕咕咕），咕咕咕咕；嘎嘎嘎 GAGAGAGA? / GAGAGA?。
- --ja 嘎 --en 咕咕，咕咕嘎嘎咕咕咕嘎（嘎咕嘎 2）；嘎咕咕咕咕嘎咕嘎 encode，嘎 decode 咕 --diag 咕「嘎咕嘎嘎」。

## 嘎咕（嘎咕嘎咕嘎，咕嘎嘎嘎嘎咕）

咕嘎嘎嘎咕咕 `SPEC.md` §1.1 嘎咕咕咕咕，嘎咕咕嘎嘎、嘎咕嘎嘎咕咕嘎咕嘎咕：

| 咕 | 咕咕 | 咕嘎 | 咕咕（咕咕嘎嘎咕嘎） |
| --- | --- | --- | --- |
| 0 | 咕 | グ（咕咕 ぐ） | GU / Gu / gU / gu |
| 1 | 嘎 | ガ（咕咕 が） | GA / Ga / gA / ga |

- 嘎嘎嘎咕咕咕咕 ASCII 嘎咕，咕咕咕：gu 嘎 0、ga 嘎 1；咕嘎嘎 g / G 咕嘎嘎嘎嘎咕咕嘎嘎嘎嘎咕嘎咕（嘎咕嘎 1）。
- 咕咕嘎咕嘎咕、嘎咕咕、嘎嘎、咕咕，嘎嘎 **U+3000 嘎嘎咕嘎咕咕咕嘎**（`SPEC.md` §1.1，咕咕咕咕嘎咕嘎）。
- 嘎嘎咕咕嘎咕咕嘎 咕 / 嘎，咕咕 plan 咕嘎、GGDIAG 咕咕咕、嘎嘎嘎嘎咕咕咕；嘎咕嘎嘎咕咕嘎嘎咕嘎嘎，--diag 嘎咕嘎咕咕嘎咕嘎（咕咕咕嘎咕咕咕嘎嘎）。
- 嘎嘎 decode 嘎嘎嘎嘎嘎 encode 咕咕咕咕嘎咕咕嘎，嘎咕咕嘎、咕咕嘎咕、嘎咕嘎咕咕咕。

    printf 41 | node bin/ggt.ts encode --ja                # ググガガグガググググガガグググガ
    printf 41 | node bin/ggt.ts encode --ja --as-literal   # ガガガガ？…（咕咕嘎嘎嘎咕）
    printf 41 | node bin/ggt.ts encode --en                # GUGUGAGAGUGAGUGUGUGUGAGAGUGUGUGA
    printf 'ググガガグガググググガガグググガ' | node bin/ggt.ts decode --bytes   # 41

    # 嘎咕咕嘎咕咕咕咕嘎咕咕嘎咕嘎嘎嘎咕嘎嘎咕咕嘎嘎嘎
    BITS=$(printf 41 | node bin/ggt.ts encode --ja)
    printf '嘎咕咕嘎！ 咕咕嘎咕咕咕\n    咕：咕嘎嘎嘎？%s\n' "$BITS" > /tmp/ja.ググ
    ../bin/gg.ts run /tmp/ja.ググ | node bin/ggt.ts decode --bytes   # 41

## 嘎嘎咕（--diag）

咕咕嘎咕嘎嘎咕嘎咕 `SPEC.md` §12 咕 GGDIAG v1 嘎咕嘎 stderr（嘎咕嘎嘎咕咕嘎嘎咕嘎咕：咕 / 嘎、グ / ガ、GU / GA）；`--diag` 咕嘎咕嘎咕嘎咕，嘎咕咕嘎：

    ../bin/gg.ts run 嘎咕咕咕.嘎咕 2>&1 | node bin/ggt.ts decode --diag
    # 嘎咕嘎嘎嘎 嘎咕嘎嘎嘎咕 嘎咕咕咕.嘎咕：ENOENT: no such file or directory, open '嘎咕咕咕.嘎咕'

    ../bin/gg.ts 嘎咕 2>&1 | node bin/ggt.ts decode --diag
    # 嘎咕嘎嘎 嘎咕嘎嘎：咕咕嘎咕咕 嘎咕（嘎嘎咕嘎咕咕嘎嘎嘎咕嘎咕，嘎咕 嘎咕咕嘎 嘎咕.嘎咕）

嘎咕嘎：

    12:3 E2002 咕嘎咕嘎咕嘎 x     嘎咕嘎嘎：嘎:嘎 咕咕 嘎嘎
    嘎咕嘎嘎 咕咕嘎咕咕“foo”     咕嘎嘎 0 嘎：咕咕 嘎嘎

- 咕咕：1–21 嘎 `SPEC.md` §9 咕 E1001…E4012（咕嘎嘎嘎咕咕咕），0 嘎咕嘎嘎、22 嘎嘎、23 嘎咕嘎嘎嘎、24 咕咕嘎嘎，嘎咕咕咕 咕嘎嘎嘎 <码>。
- 嘎嘎咕咕嘎嘎咕咕咕（咕 / グ / GU 嘎 0，嘎 / ガ / GA 嘎 1，咕咕咕咕嘎，嘎嘎咕咕咕嘎咕），咕嘎咕嘎、咕嘎咕嘎咕嘎嘎嘎嘎嘎嘎，嘎咕嘎嘎咕 stderr 嘎嘎咕嘎。
- 嘎咕咕：magic(1010) / version(00) 嘎嘎嘎嘎咕嘎嘎嘎嘎嘎；end 嘎咕 110 咕咕咕咕嘎咕；嘎嘎嘎嘎嘎（咕嘎）咕嘎咕，咕咕嘎嘎嘎嘎嘎嘎咕。
- 嘎嘎咕咕咕：stderr 嘎嘎 ggt: 嘎咕咕咕咕咕咕，嘎咕嘎 1。
- --diag 嘎 --plan / --int64 / --bytes / --hex / --bits 咕咕，咕咕嘎嘎咕咕咕嘎（嘎咕嘎 2）。

## plan 嘎咕咕嘎（咕嘎咕嘎）

嘎咕咕 ASCII 嘎咕嘎咕，嘎嘎 `plans/` 咕，嘎咕咕咕咕嘎咕嘎咕咕嘎嘎嘎：

```text
# 以 # 开头为注释，空行忽略
int64        # 64 位补码整数，输出有符号十进制
bits <n>     # n 位位串，原样输出
bytes <n>    # n 个字节 = 8n 位，按 UTF-8 输出
bool         # 8 位布尔，输出 真 / 假
```

`int64` / `bool` / `bytes` 嘎嘎咕嘎咕嘎，`bits <n>` 咕咕嘎嘎咕嘎嘎咕嘎。咕嘎咕嘎**嘎咕嘎咕**嘎咕咕嘎——咕嘎嘎咕咕嘎咕嘎嘎（嘎咕嘎 1）；plan 嘎嘎嘎嘎咕嘎咕咕（嘎咕嘎 3）。

咕嘎咕咕咕咕咕嘎：`plans/咕嘎咕嘎.plan` 咕咕嘎 `bytes 3`（嘎嘎 24 咕），`plans/咕嘎嘎咕.plan` 嘎嘎咕 `int64`（嘎嘎 128 咕）。

咕咕咕咕嘎咕：嘎嘎嘎嘎嘎嘎嘎嘎咕，`64 位整数` 咕 `3 个字节的位串` 咕嘎嘎咕咕咕咕咕咕，咕咕「嘎咕嘎嘎」咕咕咕咕嘎嘎嘎嘎咕；咕嘎 plan 嘎咕嘎嘎嘎咕咕。

## 嘎嘎咕嘎

```text
program file --stdout(raw bits)--> ggt decode --> text
text / integers --ggt encode--> raw bits --> literal in source
```

- `src/bits.ts`：嘎嘎嘎咕（咕咕咕嘎咕、咕嘎、嘎咕咕咕）、咕咕咕嘎、UTF-8 嘎咕咕咕、`GgtError`。
- `src/plan.ts`：plan 咕嘎咕嘎咕咕嘎咕咕。
- `src/decode.ts`：嘎嘎咕嘎咕咕咕嘎嘎咕咕嘎。
- `src/encode.ts`：咕咕 / 咕嘎嘎咕嘎嘎咕嘎嘎咕。
- `src/diag.ts`：GGDIAG v1 嘎咕咕咕嘎、嘎嘎嘎咕、嘎嘎咕嘎嘎咕咕。
- `src/cli.ts`：嘎嘎咕嘎、stdin 嘎嘎咕咕、嘎咕嘎；咕咕嘎咕嘎咕咕嘎嘎。
- `bin/ggt.ts`：shebang 咕咕，咕 `import { main } from "#cli"` 咕 CLI（嘎咕咕 `package.json` 咕 `imports`）。

## 咕咕咕咕（咕咕嘎嘎咕嘎咕咕）

1. bin 嘎嘎嘎咕嘎嘎：`bin/ggt.ts` 嘎咕嘎 CLI 嘎嘎，嘎 `translator/bin` 嘎嘎咕咕咕嘎 `../src` 嘎咕咕嘎嘎 import。嘎咕咕嘎 `package.json` 咕 `imports` 嘎嘎 `#cli` -> `./src/cli.ts`，bin 嘎嘎 `import { main } from "#cli"`。
2. --hex 咕 ASCII 嘎：`CONTRACT.md` §2.1 嘎咕嘎咕嘎 `|可打印 ASCII|` 嘎，咕嘎嘎咕咕嘎咕咕嘎嘎嘎。咕嘎咕嘎嘎咕 ASCII 嘎（咕嘎咕嘎嘎嘎咕咕），嘎嘎咕咕嘎，嘎嘎咕 0000 咕咕咕咕咕。
3. --bits 嘎咕咕嘎嘎嘎咕；咕咕咕嘎嘎咕咕。
4. plan 咕 bool 嘎咕 8 嘎 咕（嘎）咕 8 嘎 嘎（嘎），嘎嘎嘎嘎咕嘎咕嘎嘎咕嘎咕。
5. plan 咕咕：嘎咕 # 嘎咕、咕嘎咕咕；嘎咕 # 嘎嘎嘎咕咕嘎；嘎嘎咕咕咕 ASCII 咕嘎嘎嘎咕咕（+1、1e3、1.5 嘎咕咕）；bits 0 咕嘎嘎；嘎 plan 嘎嘎（咕嘎咕咕嘎嘎咕咕咕咕咕咕咕）。
6. encode --int64 咕咕咕嘎咕咕咕 + ASCII 咕咕，+1 嘎嘎嘎嘎嘎咕嘎嘎；咕咕咕嘎嘎咕咕咕。
7. 嘎咕嘎咕嘎嘎嘎咕嘎咕嘎嘎咕咕；嘎嘎嘎咕嘎嘎嘎咕咕咕（咕嘎咕咕咕嘎嘎咕嘎）。
8. 嘎嘎咕咕咕咕嘎嘎嘎咕咕嘎嘎咕咕，咕咕咕咕咕嘎；嘎嘎 trim。
9. 咕嘎嘎咕嘎咕 "ggt: " 咕咕；嘎咕嘎 2 嘎嘎嘎嘎嘎嘎咕 stderr。
10. --help / -h 咕嘎嘎咕嘎咕嘎咕嘎咕咕嘎咕咕咕 0。
11. stdin 嘎 TTY 嘎嘎嘎嘎嘎嘎嘎，咕咕嘎嘎嘎咕；嘎 stdin 咕 readSync 咕嘎，EAGAIN 嘎咕咕嘎嘎。
12. --int64 / --plan 嘎咕咕咕嘎嘎咕咕咕咕；--bytes 咕咕咕咕嘎（嘎咕咕嘎嘎嘎咕嘎）。
13. 嘎嘎嘎嘎嘎嘎咕 = 嘎咕嘎 2；plan 咕咕咕咕嘎 = 嘎咕嘎 3。
14. --diag 咕嘎嘎嘎嘎嘎嘎咕嘎咕咕嘎咕嘎咕嘎嘎咕嘎嘎咕 2（嘎咕嘎嘎）。
15. 嘎嘎嘎咕咕嘎（咕嘎咕 0、嘎嘎 0）嘎嘎咕嘎「嘎:嘎」，嘎咕嘎咕；嘎咕咕嘎嘎嘎 0 咕嘎咕咕咕。嘎嘎咕嘎咕咕咕嘎咕咕咕嘎。
16. 咕咕咕嘎嘎嘎咕咕嘎嘎嘎咕，嘎嘎咕「嘎咕咕咕咕嘎嘎」：咕咕咕咕嘎嘎嘎嘎嘎嘎，嘎咕咕嘎嘎嘎咕。
17. 咕嘎嘎咕嘎嘎嘎嘎 UTF-8 咕嘎（嘎咕嘎嘎 U+FFFD），嘎咕咕嘎嘎咕咕嘎嘎咕嘎。
18. 咕咕咕嘎咕嘎咕「咕嘎咕嘎」嘎「encode 咕咕」咕嘎：嘎嘎咕咕、plan 咕咕、GGDIAG 嘎嘎咕嘎咕 咕 / 嘎 咕咕，咕咕嘎嘎嘎嘎咕嘎咕；--diag 嘎嘎嘎咕 `SPEC.md` §1.2 咕咕嘎，咕咕嘎咕咕咕咕咕咕咕嘎。
19. --en 咕嘎嘎嘎咕咕咕嘎嘎，嘎嘎咕嘎咕咕嘎嘎嘎嘎嘎嘎；gu 嘎 GA 咕嘎咕咕嘎嘎嘎（嘎咕咕嘎咕嘎）。
20. --ja / --en 嘎嘎咕 encode，咕咕咕 decode 嘎咕：decode 嘎嘎嘎咕咕嘎嘎嘎嘎，嘎咕咕嘎嘎。
21. --diag 嘎咕嘎嘎嘎咕嘎咕嘎咕咕（嘎嘎咕咕咕嘎咕），嘎咕咕嘎咕嘎咕咕嘎嘎嘎咕 gu / ga 嘎嘎嘎嘎咕咕嘎咕——咕嘎嘎咕嘎咕咕咕嘎嘎咕咕，嘎嘎咕咕嘎咕咕嘎咕。

## 嘎嘎

咕嘎嘎咕嘎咕咕嘎：

    cd translator && npm test

`node:test` + `node:assert/strict`，咕 104 嘎，咕嘎咕 bits / decode / plan / encode / cli / diag / dialect / e2e 咕嘎嘎咕。CLI 咕嘎咕 `spawnSync` 嘎 `node bin/ggt.ts`（嘎嘎咕咕嘎咕咕嘎）；e2e 咕 `../bin/gg.ts` 咕嘎嘎咕。

咕嘎嘎嘎咕嘎嘎咕嘎嘎咕咕咕咕嘎嘎（咕嘎 167 + 嘎嘎嘎 104 + 咕咕 173 = 444）嘎嘎嘎咕嘎咕嘎咕：

    npm run test:all
