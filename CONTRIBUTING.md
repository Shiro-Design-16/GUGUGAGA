# 嘎咕嘎嘎

**咕嘎**：咕咕 ｜ [グガグ](CONTRIBUTING.ja.md) ｜ [GUGUGUGUGAGUGA](CONTRIBUTING.en.md)

嘎咕嘎咕咕嘎：咕嘎嘎嘎咕咕、咕嘎咕咕嘎嘎、`node` 嘎咕咕 `.ts` 嘎 `.mjs`。咕咕咕咕嘎咕嘎嘎咕咕咕嘎，咕咕嘎嘎咕嘎嘎嘎 Node。

## 0. 嘎咕咕嘎

- Node **≥ 23**（嘎咕嘎咕 TypeScript 嘎嘎咕咕；`package.json` 咕 `engines` 嘎嘎咕）
- POSIX shell（`install.sh`、`vscode/build-vsix.sh` 嘎嘎 `sh` + `ln` + `zip`）
- 咕嘎嘎 npm install：咕嘎咕嘎 `dependencies`，`npm test` 咕嘎嘎

## 1. 咕嘎咕

```bash
git clone https://github.com/Shiro-Design-16/GUGUGAGA.git
cd GUGUGAGA
npm test          # 咕嘎咕 174 咕
npm run test:all  # 咕嘎 174 + 嘎嘎嘎 104 + 咕咕 173 + 嘎嘎咕嘎 24
```

嘎嘎咕咕咕咕咕嘎咕嘎，嘎咕咕嘎咕：

```bash
./install.sh                # 咕 `咕咕嘎嘎` / `ググガガ` / `gggg` / `gg` / `ggt` 咕 PATH
./install.sh --uninstall    # 咕咕咕嘎
```

## 2. 嘎嘎嘎咕

| 咕咕 | 咕嘎咕 | 嘎嘎 |
| --- | --- | --- |
| `src/` | 咕嘎嘎（嘎咕 → 咕咕 → 嘎咕咕咕 → 嘎咕）嘎 CLI | `tests/*.test.ts` |
| `translator/` | `ggt`：咕咕嘎咕咕嘎咕、嘎咕咕咕嘎 | `translator/tests/*.test.ts` |
| `vscode/gugugaga/` | VS Code 咕咕（嘎嘎、嘎嘎、嘎嘎、嘎嘎、咕咕、咕咕） | `vscode/gugugaga/tests/*.test.js` |
| `examples/` | 嘎咕咕嘎咕嘎 + 嘎咕咕嘎 + 嘎咕咕咕 | `tests/e2e.test.ts`、`tests/charset.test.ts` |
| `demos/` | 嘎咕咕「咕咕嘎嘎嘎嘎」咕嘎嘎嘎咕（shebang、嘎嘎咕） | 嘎 `tests/e2e.test.ts` 咕咕 |
| `scripts/` | `check-translations.mjs`（咕嘎咕咕嘎）嘎 `md-bits.mjs`（咕嘎嘎咕嘎嘎） | 嘎 `npm run test:all` 嘎咕嘎嘎 |
| `docs/` | 嘎嘎咕嘎、咕嘎咕嘎咕 | — |

## 3. 咕咕嘎咕咕咕

1. **嘎嘎嘎**：咕咕咕 `dependencies`。咕嘎嘎嘎嘎嘎 Node 嘎咕咕咕咕咕嘎。
2. **咕嘎嘎咕嘎嘎**：`src/` 嘎嘎嘎嘎咕咕嘎咕咕 0/1，咕咕（咕/嘎、グ/ガ、GU/GA）嘎咕嘎嘎嘎嘎嘎。咕咕咕咕嘎嘎嘎嘎咕嘎嘎。
3. **咕嘎咕嘎嘎咕嘎**：`src/errors.ts` 咕 `CODE` 咕咕 GGDIAG 咕嘎 8 咕 code 咕咕咕咕（咕咕嘎 + 1），**咕咕咕咕嘎嘎嘎嘎咕咕**。嘎嘎嘎咕嘎咕嘎嘎咕咕嘎咕 `SPEC.md` §9 嘎 §12。
4. **咕咕嘎咕咕**：GGDIAG v1 嘎嘎咕嘎（magic / version / code / line / col / mlen / msg / end）咕咕咕嘎嘎咕咕；嘎嘎咕嘎咕嘎咕嘎咕，咕咕咕嘎 `translator/src/diag.ts` 嘎 `vscode/gugugaga/src/diagnostics.js`。
5. **嘎咕嘎嘎嘎**：咕嘎嘎咕嘎嘎咕咕 CLI 嘎咕嘎咕咕咕咕，嘎嘎「嘎咕嘎咕嘎」。咕嘎咕咕嘎咕嘎嘎咕咕嘎嘎嘎嘎咕。

## 4. 咕咕咕嘎咕咕

咕嘎嘎**嘎嘎**咕：咕嘎嘎嘎 `x.md`，咕嘎 `x.ja.md`，咕咕 `x.en.md`。咕嘎咕嘎咕：

1. 咕咕嘎嘎嘎咕咕咕 PR 咕咕嘎咕咕嘎嘎（`npm run test:i18n` 嘎咕嘎咕嘎嘎咕、嘎咕嘎、嘎咕嘎嘎咕、咕嘎嘎嘎咕嘎咕咕嘎咕咕）。
2. **咕咕嘎咕咕**：咕嘎、嘎咕、嘎嘎、嘎咕嘎、咕咕、咕嘎嘎嘎嘎；嘎嘎咕咕嘎嘎咕嘎嘎嘎咕嘎（咕咕 咕/嘎、咕嘎 グ/ガ + 嘎嘎嘎嘎、咕咕 GU/GA + 咕嘎咕咕），嘎嘎嘎嘎咕咕嘎咕咕。
3. 咕嘎嘎嘎嘎咕嘎咕咕嘎咕嘎咕：嘎嘎 `scripts/check-translations.mjs` 咕 `SOURCES`、嘎嘎 `scripts/md-bits.mjs` 咕 `DOC_FILES`、咕嘎 i18n 嘎嘎嘎（咕嘎嘎 `docs/翻译规范.md`）。

咕咕咕嘎 `.md` 嘎**咕嘎嘎**：咕咕咕嘎咕嘎嘎嘎嘎咕嘎咕嘎咕嘎嘎（咕咕 咕/嘎、咕嘎 グ/ガ、咕咕 GU/GA），Markdown 嘎咕、咕咕、嘎咕、嘎咕咕嘎嘎嘎嘎嘎，嘎咕咕咕嘎咕、咕嘎、咕嘎、咕嘎嘎嘎嘎嘎咕嘎咕嘎。嘎嘎嘎嘎嘎嘎咕咕嘎咕咕嘎——嘎咕嘎咕嘎嘎嘎咕咕咕咕，咕嘎嘎、咕嘎嘎嘎嘎 ASCII 咕嘎咕嘎。咕咕咕咕咕嘎嘎嘎嘎 SHA-256，嘎嘎咕嘎嘎咕嘎咕咕咕咕咕咕咕，嘎咕咕咕嘎。咕嘎咕嘎咕嘎嘎咕：`咕`/`嘎`/`グ`/`ガ` 嘎咕嘎嘎嘎咕、咕嘎嘎 `咕咕嘎嘎` / `ググガガ` / `GUGUGAGA`（咕嘎咕咕嘎）、嘎嘎嘎嘎嘎咕嘎咕咕嘎咕咕。嘎嘎嘎嘎嘎 `backup/readable/`，嘎咕嘎咕咕咕。

嘎咕嘎咕：嘎咕 `backup/readable/` 嘎嘎咕咕，嘎嘎嘎咕嘎嘎。

```bash
# 咕咕嘎嘎，嘎嘎咕嘎咕咕咕（嘎咕嘎嘎咕 = 嘎嘎 36 嘎）
$EDITOR backup/readable/README.md
node scripts/md-bits.mjs README.md
# 咕嘎嘎嘎咕嘎咕咕嘎嘎咕嘎嘎（CI 咕嘎咕咕嘎，咕嘎咕咕嘎）
node scripts/md-bits.mjs --check
```

嘎嘎嘎咕咕嘎咕嘎咕嘎，咕咕嘎嘎——咕嘎咕咕嘎嘎咕嘎嘎咕。

## 5. 咕咕咕 PR

- 咕咕 PR 咕嘎嘎，嘎咕咕嘎咕嘎嘎嘎（咕嘎嘎嘎嘎嘎咕）。
- 嘎嘎咕嘎嘎咕 `npm run test:all`，CI 咕嘎咕嘎咕嘎嘎。
- 咕咕嘎嘎嘎，PR 嘎嘎咕咕咕「嘎嘎 / 嘎咕」咕咕咕嘎咕咕咕咕。

## 6. 咕咕嘎嘎

嘎咕咕咕咕咕嘎：

1. 嘎嘎嘎咕（嘎嘎咕咕咕，咕咕嘎嘎嘎嘎 `examples/` 咕嘎）
2. 咕嘎嘎嘎嘎
3. 咕嘎嘎嘎嘎嘎嘎咕嘎（stderr 咕嘎嘎嘎嘎嘎，咕 `ggt decode --diag` 咕嘎嘎咕咕嘎）

## 7. 嘎嘎咕

MIT。嘎咕 PR 嘎咕咕嘎嘎嘎咕嘎咕嘎咕咕咕嘎咕咕咕嘎。
