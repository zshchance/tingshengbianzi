#!/bin/bash

# 强制更新图标脚本
# 彻底清理并重新构建以强制更新图标

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$PROJECT_ROOT/frontend/assets/icons"
BUILD_DIR="$PROJECT_ROOT/build"

echo "🔧 强制更新图标 - 彻底重建模式"
echo "📁 项目根目录: $PROJECT_ROOT"

# 1. 停止所有相关进程
echo ""
echo "🛑 第1步: 停止所有Wails进程..."
pkill -f "wails" || true
pkill -f "tingshengbianzi" || true
sleep 3
echo "✅ 进程已停止"

# 2. 彻底清理构建文件
echo ""
echo "🧹 第2步: 彻底清理构建文件..."
rm -rf "$BUILD_DIR"
rm -rf "$PROJECT_ROOT/.wails"
rm -rf "$PROJECT_ROOT/frontend/dist"
echo "✅ 构建文件已清理"

# 3. 重新生成所有图标文件
echo ""
echo "🎨 第3步: 重新生成所有图标文件..."
cd "$ICON_DIR"

# 删除所有图标相关文件
rm -f *.icns *.ico icon.* app.* *.png 听生辩字logo.png.backup 2>/dev/null || true

# 恢复原始logo
if [ ! -f "听生辩字logo.png" ]; then
    echo "❌ 原始logo文件不存在: 听生辩字logo.png"
    exit 1
fi

# 重新生成iconset
rm -rf icon.iconset
mkdir -p icon.iconset

echo "📐 生成图标尺寸..."
sips -z 16   16   "听生辩字logo.png" --out "icon.iconset/icon_16x16.png"
sips -z 32   32   "听生辩字logo.png" --out "icon.iconset/icon_16x16@2x.png"
sips -z 32   32   "听生辩字logo.png" --out "icon.iconset/icon_32x32.png"
sips -z 64   64   "听生辩字logo.png" --out "icon.iconset/icon_32x32@2x.png"
sips -z 128  128  "听生辩字logo.png" --out "icon.iconset/icon_128x128.png"
sips -z 256  256  "听生辩字logo.png" --out "icon.iconset/icon_128x128@2x.png"
sips -z 256  256  "听生辩字logo.png" --out "icon.iconset/icon_256x256.png"
sips -z 512  512  "听生辩字logo.png" --out "icon.iconset/icon_256x256@2x.png"
sips -z 512  512  "听生辩字logo.png" --out "icon.iconset/icon_512x512.png"
sips -z 1024 1024 "听生辩字logo.png" --out "icon.iconset/icon_512x512@2x.png"

# 生成icns文件
echo "🍎 生成icns文件..."
iconutil -c icns icon.iconset
if [ ! -f "icon.icns" ]; then
    echo "❌ icns文件生成失败"
    exit 1
fi

# 生成其他格式
sips -z 256 256 "听生辩字logo.png" --out "app-icon.png"
cp "icon.icns" "app.icns"
cp "app-icon.png" "icon.png"

echo "✅ 图标生成完成"
ls -la *.icns *.png 2>/dev/null || true

# 4. 强制更新wails.json
echo ""
echo "⚙️ 第4步: 强制更新wails.json..."
cat > "$PROJECT_ROOT/wails.json" << 'EOF'
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "tingshengbianzi",
  "outputfilename": "tingshengbianzi",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "这家伙很懒",
    "email": "zshchance@qq.com"
  },
  "info": {
    "companyName": "administrator.wiki",
    "productName": "听声辨字",
    "productVersion": "1.0.0",
    "copyright": "© 2025 administrator.wiki",
    "comments": "智能音频识别工具 - 软件免费，严禁不良商家贩卖获利"
  },
  "icon": "frontend/assets/icons/icon.icns"
}
EOF

echo "✅ wails.json已强制更新"

# 5. 设置正确的文件权限
echo ""
echo "🔐 第5步: 设置文件权限..."
chmod -R 644 "$ICON_DIR"/*.icns "$ICON_DIR"/*.png 2>/dev/null || true
echo "✅ 权限已设置"

# 6. 确保环境变量
echo ""
echo "🔧 第6步: 设置环境变量..."
export PATH=$PATH:~/go/bin

# 7. 重新构建
echo ""
echo "🔨 第7步: 重新构建开发版本..."
cd "$PROJECT_ROOT"

echo "📦 构建应用程序（这将为开发模式创建新的.app）..."
if command -v wails &> /dev/null; then
    wails build -debug
else
    echo "❌ 未找到wails命令"
    exit 1
fi

# 8. 验证构建结果
APP_PATH="$BUILD_DIR/bin/tingshengbianzi.app"
if [ -d "$APP_PATH" ]; then
    echo ""
    echo "✅ 构建成功！"
    ICON_RESOURCE="$APP_PATH/Contents/Resources/iconfile.icns"

    if [ -f "$ICON_RESOURCE" ]; then
        ICON_SIZE=$(stat -f%z "$ICON_RESOURCE" 2>/dev/null || echo "unknown")
        echo "📋 应用程序图标信息:"
        echo "   - 文件: iconfile.icns"
        echo "   - 大小: ${ICON_SIZE} bytes"
        echo "   - 路径: $ICON_RESOURCE"

        # 检查是否是我们生成的新图标
        if [ "$ICON_SIZE" -gt 700000 ]; then
            echo "   - 状态: ✅ 新图标已正确嵌入 (大小符合预期)"
        else
            echo "   - 状态: ⚠️ 可能是旧图标 (大小过小)"
        fi
    else
        echo "❌ 图标文件未找到"
    fi
else
    echo "❌ 构建失败"
    exit 1
fi

# 9. 启动开发服务器
echo ""
echo "🚀 第9步: 启动开发服务器..."
echo "💡 提示：现在应用程序应该显示正确的图标了"
echo ""
echo "如果图标仍未显示，请尝试以下操作："
echo "1. 在Dock中右键点击应用程序"
echo "2. 选择'选项' > '从Dock中移除'"
echo "3. 重新启动应用程序"
echo "4. 或者使用系统设置 > 应用程序重新分配图标"

echo ""
echo "正在启动开发服务器..."
wails dev