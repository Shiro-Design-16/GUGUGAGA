#!/bin/sh
# 咕咕嘎嘎语 · 安装脚本：把 咕咕嘎嘎 / ググガガ / gggg / gg / ggt 链接到 PATH 上的一个目录。
# 用法： ./install.sh [--uninstall] [--bin <目录>]
set -eu

REPO=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MODE=install
BIN_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) MODE=uninstall ;;
    --bin) shift; BIN_DIR=${1:-} ;;
    -h|--help)
      echo "用法： ./install.sh [--uninstall] [--bin <目录>]"
      echo ""
      echo "把 咕咕嘎嘎 / ググガガ / gggg / gg / ggt 五个命令链接到 <目录>（默认自动挑 ~/.local/bin、~/bin、/usr/local/bin 里第一个可写的）。"
      exit 0 ;;
    -*) echo "未知选项 $1" >&2; exit 2 ;;
    *) BIN_DIR=$1 ;;
  esac
  shift
done

if [ -z "$BIN_DIR" ]; then
  for cand in "$HOME/.local/bin" "$HOME/bin" "/usr/local/bin"; do
    if [ -d "$cand" ] && [ -w "$cand" ]; then BIN_DIR=$cand; break; fi
  done
fi
if [ -z "$BIN_DIR" ]; then
  BIN_DIR="$HOME/.local/bin"
fi
mkdir -p "$BIN_DIR" || { echo "无法创建 ${BIN_DIR}" >&2; exit 1; }

if [ "$MODE" = uninstall ]; then
  for name in 咕咕嘎嘎 ググガガ gggg gg ggt; do rm -f "$BIN_DIR/$name"; done
  echo "已从 ${BIN_DIR} 移除 咕咕嘎嘎 / ググガガ / gggg / gg / ggt"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "找不到 node：请先安装 Node.js ≥ 23（本语言依赖原生 TypeScript 类型剥离）" >&2
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 23 ]; then
  echo "Node 版本过低（$(node -v)）：需要 ≥ 23" >&2
  exit 1
fi

chmod +x "$REPO/bin/gg.ts" "$REPO/translator/bin/ggt.ts"
ln -sf "$REPO/bin/gg.ts" "$BIN_DIR/咕咕嘎嘎"
ln -sf "$REPO/bin/gg.ts" "$BIN_DIR/ググガガ"
ln -sf "$REPO/bin/gg.ts" "$BIN_DIR/gggg"
ln -sf "$REPO/bin/gg.ts" "$BIN_DIR/gg"
ln -sf "$REPO/translator/bin/ggt.ts" "$BIN_DIR/ggt"

echo "已链接到 ${BIN_DIR}："
echo "  咕咕嘎嘎 -> $REPO/bin/gg.ts"
echo "  ググガガ -> $REPO/bin/gg.ts"
echo "  gggg  -> $REPO/bin/gg.ts"
echo "  gg    -> $REPO/bin/gg.ts"
echo "  ggt   -> $REPO/translator/bin/ggt.ts"
case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo ""
    echo "现在可以： 咕咕嘎嘎 程序.咕咕   （或 ググガガ プログラム.ググ）" ;;
  *)
    echo ""
    echo "注意：$BIN_DIR 不在 PATH 里。把下面一行加进 ~/.zshrc 或 ~/.bashrc 后重开终端："
    echo "    export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac
