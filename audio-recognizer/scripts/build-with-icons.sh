#!/bin/bash

# 带图标的构建脚本
# 确保图标正确生成和嵌入

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$PROJECT_ROOT/frontend/assets/icons"
BUILD_DIR="$PROJECT_ROOT/build/bin"

echo "🏗️ 听声辨字 - 带图标的构建脚本"
echo "📁 项目根目录: $PROJECT_ROOT"

# 1. 生成图标
echo ""
echo "🎨 第1步: 生成图标..."
if [ -f "$PROJECT_ROOT/scripts/generate-icons.sh" ]; then
    "$PROJECT_ROOT/scripts/generate-icons.sh"
else
    echo "⚠️ 图标生成脚本不存在，跳过图标生成"
fi

# 2. 验证图标文件
echo ""
echo "🔍 第2步: 验证图标文件..."
if [ -f "$ICON_DIR/app-icon.png" ]; then
    echo "✅ 应用图标存在: app-icon.png"
else
    echo "❌ 应用图标缺失: app-icon.png"
    exit 1
fi

# 3. 清理旧的构建文件
echo ""
echo "🧹 第3步: 清理旧构建文件..."
rm -rf "$BUILD_DIR/tingshengbianzi.app"

# 4. 开始构建
echo ""
echo "🔨 第4步: 开始构建..."
export PATH=$PATH:~/go/bin
cd "$PROJECT_ROOT"

if command -v wails &> /dev/null; then
    echo "📦 使用Wails构建..."
    wails build -debug
else
    echo "❌ 未找到wails命令，请确保已正确安装"
    exit 1
fi

# 5. 验证构建结果
echo ""
echo "🔍 第5步: 验证构建结果..."
APP_PATH="$BUILD_DIR/tingshengbianzi.app"

if [ -d "$APP_PATH" ]; then
    echo "✅ 应用程序构建成功: tingshengbianzi.app"

    # 检查图标文件
    ICON_RESOURCE="$APP_PATH/Contents/Resources/iconfile.icns"
    if [ -f "$ICON_RESOURCE" ]; then
        ICON_SIZE=$(stat -f%z "$ICON_RESOURCE" 2>/dev/null || echo "unknown")
        echo "✅ 图标已嵌入: iconfile.icns (${ICON_SIZE} bytes)"
    else
        echo "⚠️ 图标文件未找到: iconfile.icns"
    fi

    # 检查应用程序信息
    if [ -f "$APP_PATH/Contents/Info.plist" ]; then
        PRODUCT_NAME=$(plutil -extract CFBundleName raw "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo "听声辨字")
        PRODUCT_VERSION=$(plutil -extract CFBundleShortVersionString raw "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo "1.0.0")
        echo "📋 应用信息: $PRODUCT_NAME v$PRODUCT_VERSION"
    fi
else
    echo "❌ 应用程序构建失败"
    exit 1
fi

# 6. 运行应用程序（可选）
echo ""
echo "🚀 第6步: 启动应用程序进行测试..."
read -p "是否立即启动应用程序? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎯 启动 tingshengbianzi.app..."
    open "$APP_PATH"

    # 等待几秒钟让应用启动
    sleep 3

    echo "✅ 应用程序已启动！"
    echo "📝 请检查:"
    echo "   - 应用程序图标是否正确显示"
    echo "   - 程序界面是否正常加载"
    echo "   - 拖拽功能是否正常工作"
fi

echo ""
echo "🎉 构建完成！"
echo "📁 构建输出: $APP_PATH"
echo "🔗 如需启动应用程序: open $APP_PATH"