# 咕嘎翻译器（ggt）

把咕咕嘎嘎语程序写到 stdout 的裸位流解码成人可读文本，也能反向把文本 / 整数编码成位流。
零依赖，纯 ESM，.ts 直接交给 Node 24 的类型剥离执行。

## 用法

    ggt decode [--plan <文件>] [--int64|--bytes|--hex|--bits] [<位流文件>]
    ggt decode --diag [<位流文件>]
    ggt encode [--int64|--as-literal] [--ja|--en] [<文本文件>]
    ggt --help

不给文件就读 stdin（stdin 是终端时按空输入处理）；给了文件就读文件、忽略 stdin。

    cd translator
    ../bin/gg.ts run ../examples/咕嘎咕嘎.咕咕 | node bin/ggt.ts decode --bytes
    # 嗨

    printf 35 | ../bin/gg.ts run ../examples/咕嘎嘎咕.咕咕 | node bin/ggt.ts decode --plan plans/咕嘎嘎咕.plan
    # 104
    # -2

## 解码模式

- --int64：每 64 位一块，输出有符号十进制，一块一行。
- --bytes：按 UTF-8 严格解码，非法序列报错；不追加结尾换行。
- --hex：每 16 字节一行，形如 0000: E5 97 A8  |...|（偏移四位大写十六进制，ASCII 列不可打印记点）。
- --bits：每 8 位一组、空格分隔，每行 8 组，不追加结尾换行。
- --plan：按 plan 文件逐槽位输出，必须精确消费完所有位（多一位少一位都报错）。
- 不给模式：64 的倍数猜 --int64，否则 8 的倍数猜 --bytes，否则 --bits；说明写 stderr，stdout 只放结果。
- --diag：不猜测，直接解宿主的 GGDIAG v1 诊断帧（见下节），与上面五种模式互斥。
- 所有模式的输入位流都可以是三方言混排（见「方言」），--diag 例外：诊断帧永远只认 咕 / 嘎。

## 退出码

0 成功；1 输入 / 解码错误；2 用法错误；3 plan 文件错误。

## 编码方向

- ggt encode：stdin / 文件的文本按 UTF-8 编成字节位流，默认输出纯 咕 / 嘎。
- ggt encode --as-literal：文本模式加 嘎嘎嘎嘎？ 前缀；配 --int64 时加 嘎嘎嘎？ 前缀。
- ggt encode --int64：输入十进制记号（空白分隔、允许负号，范围 -2^63 .. 2^63-1），逐个输出 64 位补码。
- ggt encode --ja：位名改用 グ / ガ，标点也全角；生成的字面量前缀是 ガガガガ？ / ガガガ？。
- ggt encode --en：位名改用 GU / GA（每位两个字母，输出长度翻倍），标点半角；前缀是 GAGAGAGA? / GAGAGA?。
- --ja 与 --en 互斥，同时给报用法错误（退出码 2）；这两个开关只属于 encode，给 decode 报「未知选项」。

## 方言（输入三方言、输出两个开关）

位流输入接受 SPEC.md §1.1 的三种写法，逐位置等价、同一份输入里可以混用：

| 位 | 中文 | 日语 | 英语（不区分大小写） |
| --- | --- | --- | --- |
| 0 | 咕 | グ（兼容 ぐ） | GU / Gu / gU / gu |
| 1 | 嘎 | ガ（兼容 が） | GA / Ga / gA / ga |

- 英文位名是两个 ASCII 字母，配对读：gu 是 0、ga 是 1；落单的 g / G 与其它字符一样按非法字符报错（退出码 1）。
- 空白仍是空格、制表符、换行、回车，另外 **U+3000 全角空格也当空白**（SPEC §1.1，日语源码的缩进）。
- 内部一律归一化成 咕 / 嘎，所以 plan 文件、GGDIAG 帧、诊断正文都不变；--diag 仍然只认 咕 / 嘎（SPEC §8.1：外壳不跟随方言）。
- 只有 decode 的输入侧与 encode 的输出侧换了写法，位流本身、模式语义、退出码都没变。

    printf 41 | node bin/ggt.ts encode --ja                # ググガガグガググググガガグググガ
    printf 41 | node bin/ggt.ts encode --ja --as-literal   # ガガガガ？…（粘回日语源码）
    printf 41 | node bin/ggt.ts encode --en                # GUGUGAGAGUGAGUGUGUGUGAGAGUGUGUGA
    printf 'ググガガグガググググガガグググガ' | node bin/ggt.ts decode --bytes   # 41

    # 生成的日语位串直接当 咕咕嘎嘎 程序的位串字面量
    BITS=$(printf 41 | node bin/ggt.ts encode --ja)
    printf '咕咕嘎嘎！ 嘎咕嘎嘎嘎咕\n    咕：嘎嘎嘎嘎？%s\n' "$BITS" > /tmp/ja.ググ
    ../bin/gg.ts run /tmp/ja.ググ | node bin/ggt.ts decode --bytes   # 41

## 诊断帧（--diag）

宿主把错误报告写成 SPEC.md §12 的 GGDIAG v1 帧（纯 咕 / 嘎）打到 stderr；--diag 把它们翻回人话，一帧一行：

    ../bin/gg.ts run 不存在的.咕咕 2>&1 | node bin/ggt.ts decode --diag
    # 读文件失败 无法读取文件 不存在的.咕咕：ENOENT: no such file or directory, open '不存在的.咕咕'

    ../bin/gg.ts 咕咕 2>&1 | node bin/ggt.ts decode --diag
    # 用法错误 用法错误：未知子命令 咕咕（执行程序请直接写文件路径，例如 咕咕嘎嘎 程序.咕咕）

行格式：

    12:3 E2002 未定义的变量 x     有位置时：行:列 码名 正文
    用法错误 未知子命令“foo”     位置是 0 时：码名 正文

- 码名：1–21 是 SPEC.md §9 的 E1001…E4012（顺序即错误码表），0 用法错误、22 帮助、23 读文件失败、24 内部错误，其余打印 未知事件 <码>。
- 只认 咕 / 嘎：宿主警告、帧间空格与换行一律忽略，所以直接接 stderr 全文即可。
- 帧边界：magic(1010) / version(00) 不符就后移一位继续找；end 不是 110 的帧整帧丢弃；消息没写全（截断）也丢弃，但都不吞掉后面的帧。
- 一帧都没有：stderr 一行 ggt: 没有找到诊断帧，退出码 1。
- --diag 与 --plan / --int64 / --bytes / --hex / --bits 互斥，同时给报用法错误（退出码 2）。

## 实现结构

- src/bits.ts：位流解析、补码转换、UTF-8 严格解码、GgtError。
- src/plan.ts：plan 文件解析与槽位宽度。
- src/decode.ts：五种解码模式与无模式猜测。
- src/encode.ts：文本 / 整数编码与字面量前缀。
- src/diag.ts：GGDIAG v1 诊断帧解码、码名映射、一帧一行的排版。
- src/cli.ts：参数解析、stdin 同步读取、退出码。
- bin/ggt.ts：shebang 入口，import "#cli"（见下）。

## 契约未写死处的取舍

1. bin 里的模块解析：契约要求 bin/ggt.ts 复用 CLI 实现，而验收又要求 translator/bin 不出现 ../src。
   解法是 package.json 的 imports 映射 "#cli" -> "./src/cli.ts"，bin 里写 import { main } from "#cli"。
2. --hex 的 ASCII 列：契约 §2.1 规定总带 |可打印 ASCII| 列，§5 的示例只写了十六进制。
   这里始终输出 ASCII 列（不可打印字节记点），行尾带换行，偏移从 0000 起四位大写。
3. --bits 不追加结尾换行；空位流输出空串。
4. plan 的 bool 只认 8 个 咕（假）或 8 个 嘎（真），混合位视为损坏输入并报错。
5. plan 语法：整行 # 注释、空行忽略；行内 # 当成多余记号；参数只接受 ASCII 十进制正整数
   （+1、1e3、1.5 都拒绝）；bits 0 也拒绝；空 plan 合法（此时任何非空位流都会报剩余）。
6. encode --int64 只接受可选负号 + ASCII 数字，+1 与内嵌空格都拒绝；空输入得到空输出。
7. 字面量模式每个值各带一个前缀；负数在字面量模式报错（源码没有负数字面量）。
8. 文本模式原样编码输入的每个字节，包括结尾换行；不做 trim。
9. 错误信息统一 "ggt: " 前缀；退出码 2 时把用法再打到 stderr。
10. --help / -h 出现在任意位置都优先处理并返回 0。
11. stdin 是 TTY 时按空输入处理，避免交互挂起；读 stdin 用 readSync 循环，EAGAIN 时小睡重试。
12. --int64 / --plan 每项一行并带结尾换行；--bytes 不追加换行（直接输出解码文本）。
13. 输入文件读不到 = 退出码 2；plan 文件读不到 = 退出码 3。
14. --diag 与其它模式互斥时按契约的「2 = 用法错误」退出（任务书里曾写成 3，此处以 CONTRACT.md 为准）。
15. 位置只给一半（行号非 0、列号 0）时仍打印「行:列」，不丢行号；只有行列都为 0 才省略位置。正文为空时不打印尾随空格。
16. 帧出错只后移一位重新同步，不跳过「声称的消息长度」：截断的头部可能是噪声，后面还有完整帧。
17. 诊断正文用非严格 UTF-8 解码（坏字节变 U+FFFD），一个坏字节不该毁掉整帧。
18. 三方言只作用在「输入解析」与「encode 输出」两处：内部位流、plan 槽位、GGDIAG 帧一律 咕 / 嘎，避免方言渗进协议层。
19. --en 的位名是两位一个位，所以输出长度是位数的两倍；gu 与 GA 混着写也能解析（大小写不敏感）。
20. --ja / --en 只挂在 encode，不新增 decode 选项：decode 的输出本来就是人话，不需要方言。

## 测试

    cd translator && npm test

node:test + node:assert/strict，共 100 项：bits / decode / plan / encode / cli / diag / dialect / e2e 八个文件。
CLI 测试用 spawnSync 跑 node bin/ggt.ts（不依赖可执行权限）；e2e 用 ../bin/gg.ts 生成位流。

## plan 文件格式（精确解码）

宿主层 ASCII 行式文件，放在 `plans/` 下，用来描述一段位流的槽位结构：

```text
# 以 # 开头为注释，空行忽略
int64        # 64 位补码整数，输出有符号十进制
bits <n>     # n 位位串，原样输出
bytes <n>    # n 个字节 = 8n 位，按 UTF-8 输出
bool         # 8 位布尔，输出 真 / 假
```

`int64` / `bool` / `bytes` 各占一行输出，`bits <n>` 输出原样位串后换行。槽位必须**精确消费**整段位流——多一位少一位都报错（退出码 1）；plan 本身语法错报行号（退出码 3）。

已有示例：`plans/咕嘎咕嘎.plan` 内容是 `bytes 3`（对应 24 位），`plans/咕嘎嘎咕.plan` 是两行 `int64`（对应 128 位）。

为什么需要它：位流没有自描述框架，`64 位整数` 和 `3 个字节的位串` 在字节层面不可区分，所以「精确解释」必须由人给出槽位表；不给 plan 时才有猜测模式。
