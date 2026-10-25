<!-- i18n:begin -->
[中文](CONTRIBUTING.md) ｜ **日本語** ｜ [English](CONTRIBUTING.en.md)

> 本ファイルは日本語訳です。内容の正本は中国語版 [CONTRIBUTING.md](CONTRIBUTING.md) で、差分があれば中国語版が優先します。
<!-- i18n:end -->

# ガグググガグググ

**ガガ**：ググ ｜ [グガグ](CONTRIBUTING.ja.md) ｜ [GUGUGUGUGAGUGA](CONTRIBUTING.en.md)

グガグググガガガグググググガガガ：グググガググガグググ、ガガグガガグガグ、`node` グ `.ts` ガ `.mjs` グガガガググガグ。ガガガガグガググググガググガグガググググガガ。ガグガグガガ Node ガグググググガガガグ。

## 0. グガグガ

- Node **≥ 23**（ガグガガガガ TypeScript グガグガグガガガグ。`package.json` グ `engines` ガグガガガ）
- POSIX グガグ（`install.sh` ガ `vscode/build-vsix.sh` ガ `sh` + `ln` + `zip` ガガガグガガグ）
- npm install ガググググ：ググググググ `dependencies` ガググ、`npm test` ガグガガガグググググガガガ

## 1. グガガググガ

```bash
git clone https://github.com/Shiro-Design-16/GUGUGAGA.git
cd GUGUGAGA
npm test          # 语言侧 167 条
npm run test:all  # 语言 167 + 翻译器 104 + 扩展 173 + 译文检查 24
```

ガガガガガガガググガガガガガガグガグガグガガグガガ、グググガグガガガググガガガガガグガグ：

```bash
./install.sh                # 装 `咕咕嘎嘎` / `ググガガ` / `gggg` / `gg` / `ggt` 到 PATH
./install.sh --uninstall    # 全部撤掉
```

## 2. ガガグガガガグ

| ガガグガガグ | ググ | グググ |
| --- | --- | --- |
| `src/` | ガガガガググ（ガガガガ → グガグガ → ググガガ → ガグ）ガ CLI | `tests/*.test.ts` |
| `translator/` | `ggt`：ガガガガガガガガガグガグガググガガガ、ググガグガガガグググガ | `translator/tests/*.test.ts` |
| `vscode/gugugaga/` | VS Code グガガグ（ググガガガ、ガグ、ガグガ、ググガグガ、グガ、グガ） | `vscode/gugugaga/tests/*.test.js` |
| `examples/` | グググググガガガグガ + ガガグガガガググガガ + グガガグガググガガ | `tests/e2e.test.ts`、`tests/charset.test.ts` |
| `demos/` | 「グググガグガガググガグ」グググガグガグググガガググググガ（shebang、ガガグガガガグ） | `tests/e2e.test.ts` ガガガガグググ |
| `scripts/` | `check-translations.mjs`（ガガガググググ）ガ `md-bits.mjs`（ググガグググガグガグガガグ） | `npm run test:all` ガガグガググガグガ |
| `docs/` | グガググガグガグ、グガググガ | — |

## 3. グガグググガガガガガガガグ

1. **ガガググ**：`dependencies` ガグガガガガ。ガガガグガガ Node ガガグググガググガグググググググ。
2. **グググガガグガガ**：`src/` グガガグググガググ 0/1 グググググガ。ググ（グ/ガ、ガ/ガ、GU/GA）ガググググググガガグガ。ググガグガガググググググガガガグガグ。
3. **グガガグガガグガガガガ**：`src/errors.ts` グ `CODE` ググ GGDIAG ガガググガ 8 グガグ code グググガググガグググ（グガガガ + 1）。**ガグガグガグガガガガガガグガグガ**。ガガガグガググググガガガグ、`SPEC.md` グ §9 ガ §12 ガググググググガググググ。
4. **ガググガガググガグ**：GGDIAG v1 グググググググ（magic / version / code / line / col / mlen / msg / end）ガガガグガガガガグググガガグガガ。グガガグガガグググググガグググガググガガ、`translator/src/diag.ts` ガ `vscode/gugugaga/src/diagnostics.js` グガグガグガググ。
5. **ガガグガググガグガググ**：ググガググガガグガグガググググ CLI ガガガガガグガガガガガググ、「グガグガガグ」グガガグガガガ。グガガグガグガ、ググググガググガグガグガグガググガ。

## 4. ガガググガググガガガグガガグガガ

グガグガガググ**ガググ**ググ：ガグガググガ `x.md`、グガグ `x.ja.md`、ググ `x.en.md`。グググググガガグググガガガ：

1. ガグググガガガグググ、グガ PR グガグガガガガガガガググ（`npm run test:i18n` ガググガガググガ、ガガグガググガ、グガガググググ、ガガググガガガグ、グガガガガグガググガググググガググ）。
2. **グググググガグガググ**：ググガガ、グガ、ガガガグ、ググガガググ、ググ、グガガグガガガガグググガ。ググググガガガググググググググガグググガグガグガガガググ（グガガグ グ/ガ、ググググ ガ/ガ ガガガガグ、ググガ GU/GA ガガガグガ）。ガガガガグガググググガガガガ。
3. ガガガガガグググガググガグググ、ガガガガググググガグガグガ：`scripts/check-translations.mjs` グ `SOURCES` ガグガガ、`scripts/md-bits.mjs` グ `DOC_FILES` ガグガガ、i18n ガガガガグガグガグガグガ（ガガグ `docs/翻译规范.md` グググ）。

ガググガガグ `.md` ガ**グガガ**ググ：ガグググググガガググガグガガググガグガガグググガ（ガガグ グ/ガ、グガグ ガ/ガ、ググ GU/GA）。ググ、ガググ、ガガググガガガグ、グガ、Markdown グググガガガガガガグ、グガグガググガ、グガグガ、ググガガググ、ググガググググ。グググググガガガ SHA-256 ガガググガ、ググガガググガググガググガグガガグガガグ、ガガグガグガグガ。グガググガグ `backup/readable/` ガググ、ガググガガガガガガググガ。

ググガググガ、`backup/readable/` グガグガググググガガガガ、ググガガガガガグガガググガ。

```bash
# 改可读版，再重新生成产物（不带文件名 = 全部 36 份）
$EDITOR backup/readable/README.md
node scripts/md-bits.mjs README.md
# 校验产物与可读副本是否一致（CI 里没有备份，会自动跳过）
node scripts/md-bits.mjs --check
```

ググガググガグガグガググガガガグガグ。ガグググググガガグググ。ググガグガガガグガググガ。

## 5. ガガガガグ PR

- PR ググググガグガ、ガグガググガグガガガガガガグガガ（ガググガグググガガグガグググ）。
- ガグググググガグググガグ `npm run test:all` ガググガグガ。CI ググガググガガグガグガグガ。
- ググガグググガググ、PR ググガガ「グガガ / ググガ」ガグググガガグググガガガガガグガ。

## 6. ガググググググ

ガガガグググググガガ：

1. グガガガグガガググ（ガグガグガガガグガガググガガガ、ガガ `examples/` グググガグググガガグガ）
2. ググガググガガ
3. グググガガグガガグガググ（stderr ガグガガグガググガガググガガガググガガ、`ggt decode --diag` グガガグガグググガググガガ）

## 7. ググガググ

MIT。PR ガグガグガガガ、ガグガググガガググガガガガガググガググガググググググガガグガガグ。
