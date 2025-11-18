#!/bin/bash

# 清除macOS图标缓存脚本
# 强制刷新Dock和Finder的图标缓存

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="tingshengbianzi"
BUILD_DIR="$PROJECT_ROOT/build/bin"

echo "🧹 清除macOS图标缓存"
echo "📁 项目根目录: $PROJECT_ROOT"

# 1. 停止所有相关进程
echo ""
echo "🛑 停止应用程序进程..."
pkill -f "$APP_NAME" || true
pkill -f "wails" || true
sleep 2

# 2. 清除macOS图标缓存
echo ""
echo "🧹 清除系统图标缓存..."
# 清除Finder图标缓存
sudo rm -rf /Library/Caches/com.apple.iconservices.store 2>/dev/null || echo "⚠️ 需要管理员权限来清除系统缓存"

# 清除用户图标缓存
rm -rf ~/Library/Caches/com.apple.iconservices.store 2>/dev/null || echo "ℹ️ 用户图标缓存不存在"
rm -rf ~/Library/Caches/com.apple.finder* 2>/dev/null || echo "ℹ️ Finder缓存不存在"

# 3. 更新所有图标文件
echo ""
echo "🔄 更新图标文件..."

# 确保build/appicon.png是最新的
if [ -f "$PROJECT_ROOT/frontend/assets/icons/app-icon.png" ]; then
    cp "$PROJECT_ROOT/frontend/assets/icons/app-icon.png" "$PROJECT_ROOT/build/appicon.png"
    echo "✅ 更新 build/appicon.png"
else
    echo "❌ 源图标文件不存在"
    exit 1
fi

# 4. 删除并重新创建.app包
echo ""
echo "🗑️ 重新创建应用程序包..."
if [ -d "$BUILD_DIR/$APP_NAME.app" ]; then
    rm -rf "$BUILD_DIR/$APP_NAME.app"
    echo "✅ 删除旧的.app包"
fi

# 5. 重新构建
echo ""
echo "🔨 重新构建应用程序..."
cd "$PROJECT_ROOT"

export PATH=$PATH:~/go/bin

# 构建应用
wails build -debug

# 6. 验证新构建
if [ -d "$BUILD_DIR/$APP_NAME.app" ]; then
    echo "✅ 应用程序重新构建成功"

    # 检查图标
    ICON_RESOURCE="$BUILD_DIR/$APP_NAME.app/Contents/Resources/iconfile.icns"
    if [ -f "$ICON_RESOURCE" ]; then
        ICON_SIZE=$(stat -f%z "$ICON_RESOURCE" 2>/dev/null || echo "unknown")
        echo "📋 应用程序图标: ${ICON_SIZE} bytes"
    fi
else
    echo "❌ 应用程序构建失败"
    exit 1
fi

# 7. 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "💡 如果图标仍未更新，请尝试："
echo "   1. 重启Finder: Option + Command + Esc → 选择Finder → 重新打开"
echo "   2. 重启Dock: killall Dock"
echo "   3. 在系统设置中重新分配应用程序图标"

# 重启Dock以刷新图标
echo ""
echo "🔄 重启Dock以刷新图标..."
killall Dock 2>/dev/null || echo "ℹ️ Dock重启失败或不需要重启"
sleep 2

# 启动开发服务器
echo "正在启动开发服务器..."
wails dev