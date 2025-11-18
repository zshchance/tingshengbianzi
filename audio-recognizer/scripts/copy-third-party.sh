#!/bin/bash

# Wails构建钩子脚本
# 复制第三方依赖到构建目录

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd"
THIRD_PARTY_DIR="$PROJECT_ROOT/third-party/bin"
BUILD_DIR="$PROJECT_ROOT/build"
RESOURCES_DIR="$BUILD_DIR/third-party"

echo "📦 复制第三方依赖到构建目录..."

# 如果是生产构建，复制到Resources目录
if [[ "$1" == "production" ]]; then
    RESOURCES_DIR="$BUILD_DIR/bin/tingshengbianzi.app/Contents/Resources/third-party"
fi

# 创建目标目录
mkdir -p "$RESOURCES_DIR/bin"

# 复制所有第三方二进制文件
if [ -d "$THIRD_PARTY_DIR" ]; then
    echo "复制文件从 $THIRD_PARTY_DIR 到 $RESOURCES_DIR/bin"
    cp -R "$THIRD_PARTY_DIR"/* "$RESOURCES_DIR/bin/"

    # 设置可执行权限
    chmod +x "$RESOURCES_DIR/bin"/*

    echo "✅ 第三方依赖复制完成"
    echo "📋 复制的文件:"
    ls -la "$RESOURCES_DIR/bin/"
else
    echo "⚠️ 第三方依赖目录不存在: $THIRD_PARTY_DIR"
fi

echo "🎉 第三方依赖处理完成"