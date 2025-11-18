#!/bin/bash

# 图标生成脚本
# 使用macOS的sips命令生成不同尺寸的图标

set -e

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_ICON="$PROJECT_ROOT/frontend/assets/icons/听生辩字logo.png"
OUTPUT_DIR="$PROJECT_ROOT/frontend/assets/icons"
ICONSET_DIR="$OUTPUT_DIR/icon.iconset"

echo "🎯 图标生成脚本"
echo "📁 项目根目录: $PROJECT_ROOT"
echo "📄 源图标: $SOURCE_ICON"
echo "📁 输出目录: $OUTPUT_DIR"

# 检查源文件是否存在
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ 源图标文件不存在: $SOURCE_ICON"
    exit 1
fi

# 创建iconset目录
echo "📁 创建iconset目录..."
mkdir -p "$ICONSET_DIR"
mkdir -p "$OUTPUT_DIR/../favicon"

# 生成不同尺寸的图标
echo "🎨 生成图标..."

# 标准尺寸图标
sips -z 16   16   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16.png"
sips -z 32   32   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -z 32   32   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32.png"
sips -z 64   64   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -z 128  128  "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128.png"
sips -z 256  256  "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -z 256  256  "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256.png"
sips -z 512  512  "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -z 512  512  "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512.png"
sips -z 1024 1024 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512@2x.png"

# 生成应用图标
sips -z 256 256 "$SOURCE_ICON" --out "$OUTPUT_DIR/app-icon.png"

# 生成favicon
sips -z 32 32 "$SOURCE_ICON" --out "$OUTPUT_DIR/../favicon/favicon-32x32.png"
sips -z 180 180 "$SOURCE_ICON" --out "$OUTPUT_DIR/../favicon/apple-touch-icon.png"

echo "✅ 图标生成完成！"

# 如果有iconutil命令，生成icns文件
if command -v iconutil &> /dev/null; then
    echo "🍎 生成macOS icns文件..."
    iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_DIR/icon.icns"
    echo "✅ icns文件生成完成: $OUTPUT_DIR/icon.icns"
else
    echo "ℹ️ 未找到iconutil命令，跳过icns文件生成"
fi

# 列出生成的文件
echo ""
echo "📋 生成的文件:"
ls -la "$ICONSET_DIR/"
ls -la "$OUTPUT_DIR/"*.png 2>/dev/null || true
ls -la "$OUTPUT_DIR/../favicon/" 2>/dev/null || true

echo ""
echo "🎉 图标生成脚本执行完成！"