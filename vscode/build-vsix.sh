#!/bin/sh
# 把 vscode/gugugaga 打包成可安装的 .vsix（零依赖，只用 zip 与 node）
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
EXT="$HERE/gugugaga"
OUT="${1:-$HERE/gugugaga-language.vsix}"

for f in package.json language-configuration.json syntaxes/gugugaga.tmLanguage.json snippets/gugugaga.json src/extension.js; do
  if [ ! -f "$EXT/$f" ]; then
    echo "缺少文件：$EXT/$f" >&2
    exit 1
  fi
done

VERSION=$(node -p "require('$EXT/package.json').version")
NAME=$(node -p "require('$EXT/package.json').name")
PUBLISHER=$(node -p "require('$EXT/package.json').publisher")
if [ -z "$VERSION" ] || [ -z "$NAME" ] || [ -z "$PUBLISHER" ]; then
  echo "package.json 里读不到 name/version/publisher" >&2
  exit 1
fi

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/ggvsix.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/extension/src" "$STAGE/extension/syntaxes" "$STAGE/extension/snippets"

# 只搬运行时需要的内容（.vscodeignore 的等价物，测试与契约不进包）
cp "$EXT/package.json" "$EXT/language-configuration.json" "$STAGE/extension/"
cp "$EXT"/src/*.js "$STAGE/extension/src/"
cp "$EXT"/syntaxes/*.json "$STAGE/extension/syntaxes/"
cp "$EXT"/snippets/*.json "$STAGE/extension/snippets/"
if [ -f "$EXT/README.md" ]; then cp "$EXT/README.md" "$STAGE/extension/"; fi

cat > "$STAGE/[Content_Types].xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Default Extension="xml" ContentType="text/xml" />
  <Override PartName="/extension.vsixmanifest" ContentType="text/xml" />
</Types>
XML

cat > "$STAGE/extension.vsixmanifest" <<XML
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$NAME" Version="$VERSION" Publisher="$PUBLISHER" />
    <DisplayName>咕咕嘎嘎语</DisplayName>
    <Description xml:space="preserve">咕咕嘎嘎语的 VS Code 语言支持：着色、补全、悬停、片段与语法检验。</Description>
    <Tags>gugugaga,language</Tags>
    <GalleryFlags>Public</GalleryFlags>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
  </Assets>
  <Content>
    <ItemType Type="Extension" Path="extension" />
  </Content>
</PackageManifest>
XML

rm -f "$OUT"
cd "$STAGE" && zip -q -X -r "$OUT" "[Content_Types].xml" extension.vsixmanifest extension
echo "已生成 $OUT"
unzip -l "$OUT" | tail -4
