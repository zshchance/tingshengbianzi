#!/bin/bash

# 构建脚本，自动从wails.json读取版本号

set -e

echo "🚀 开始构建听声辨字应用..."

# 检查是否存在wails.json
if [ ! -f "wails.json" ]; then
    echo "❌ 错误: wails.json 文件不存在"
    exit 1
fi

# 从wails.json读取版本号
VERSION=$(jq -r '.info.productVersion' wails.json)
APP_NAME=$(jq -r '.info.productName' wails.json)

if [ "$VERSION" = "null" ] || [ -z "$VERSION" ]; then
    echo "❌ 错误: 无法从wails.json读取版本号"
    exit 1
fi

if [ "$APP_NAME" = "null" ] || [ -z "$APP_NAME" ]; then
    APP_NAME="tingshengbianzi"
fi

echo "📦 应用名称: $APP_NAME"
echo "🏷️  版本号: $VERSION"

# 构建Go应用，注入版本信息
echo "🔨 开始构建..."

# 使用ldflags注入版本信息（可以作为备选方案）
LDFLAGS="-X main.Version=$VERSION -X 'main.BuildTime=$(date -u '+%Y-%m-%d_%H:%M:%S')' -X main.BuildInfo=Wails"

# 执行Wails构建
wails build \
    -clean \
    -debug \
    -ldflags="$LDFLAGS"

echo "✅ 构建完成!"
echo "📱 打包后的应用版本: $VERSION"
echo "🎯 应用将显示为: $APP_NAME v$VERSION"

# 如果需要创建发布包，可以添加以下代码
echo ""
echo "💡 提示: 如需创建发布包，使用: wails build -clean -tags release"