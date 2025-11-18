#!/bin/bash

# 重启开发服务器脚本
# 用于测试图标更改

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 重启Wails开发服务器测试图标..."
echo "📁 项目根目录: $PROJECT_ROOT"

# 查找并终止现有的Wails开发进程
echo "🔍 查找现有Wails进程..."
WAILS_PID=$(pgrep -f "wails dev" || true)

if [ ! -z "$WAILS_PID" ]; then
    echo "⚠️ 发现现有Wails进程 (PID: $WAILS_PID)，正在终止..."
    kill -TERM $WAILS_PID
    sleep 2

    # 如果进程仍在运行，强制终止
    if pgrep -f "wails dev" > /dev/null; then
        echo "🔨 强制终止进程..."
        kill -KILL $WAILS_PID
        sleep 1
    fi

    echo "✅ 旧进程已终止"
else
    echo "ℹ️ 未发现现有Wails进程"
fi

# 清理开发缓存
echo "🧹 清理开发缓存..."
rm -rf .wails/
rm -rf frontend/dist/
echo "✅ 缓存已清理"

# 确保PATH设置正确
echo "🔧 设置环境变量..."
export PATH=$PATH:~/go/bin

# 检查wails命令
if ! command -v wails &> /dev/null; then
    echo "❌ 未找到wails命令，请确保已正确安装"
    exit 1
fi

# 检查图标文件
ICON_PATH="$PROJECT_ROOT/frontend/assets/icons/icon.icns"
if [ ! -f "$ICON_PATH" ]; then
    echo "❌ 图标文件不存在: $ICON_PATH"
    exit 1
fi

echo "✅ 图标文件存在: $(basename $ICON_PATH) ($(stat -f%z "$ICON_PATH" 2>/dev/null || echo "unknown") bytes)"

# 启动开发服务器
echo ""
echo "🚀 启动Wails开发服务器..."
echo "📋 注意事项:"
echo "   - 开发模式可能需要几秒钟才能更新图标"
echo "   - 如果图标未显示，请检查Dock中的应用程序"
echo "   - 有时需要在Dock中右键点击应用程序并选择'在Finder中显示'"
echo ""

wails dev