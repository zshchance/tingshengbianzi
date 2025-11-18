#!/bin/bash

# 修复开发模式图标的脚本
# 开发模式下，Wails可能需要特殊的图标处理

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$PROJECT_ROOT/frontend/assets/icons"
WAILS_DIR="$PROJECT_ROOT/.wails"

echo "🔧 修复开发模式图标"
echo "📁 项目根目录: $PROJECT_ROOT"

# 1. 确保图标文件存在
echo ""
echo "🔍 第1步: 检查图标文件..."

if [ ! -f "$ICON_DIR/icon.icns" ]; then
    echo "❌ icns文件不存在，正在生成..."
    cd "$ICON_DIR"
    if [ -d "icon.iconset" ]; then
        iconutil -c icns icon.iconset
    else
        echo "❌ iconset目录不存在，请先运行 ./scripts/generate-icons.sh"
        exit 1
    fi
else
    echo "✅ icns文件存在: icon.icns"
fi

# 2. 创建标准图标名称的副本
echo ""
echo "📋 第2步: 创建标准图标文件..."

# 创建app.icns（一些开发环境期望这个名称）
if [ -f "$ICON_DIR/icon.icns" ]; then
    cp "$ICON_DIR/icon.icns" "$ICON_DIR/app.icns"
    echo "✅ 创建app.icns副本"
fi

# 创建icon.png（如果不存在）
if [ ! -f "$ICON_DIR/icon.png" ]; then
    cp "$ICON_DIR/app-icon.png" "$ICON_DIR/icon.png"
    echo "✅ 创建icon.png副本"
fi

# 3. 更新wails.json配置
echo ""
echo "⚙️ 第3步: 更新配置文件..."

# 备份原配置文件
cp "$PROJECT_ROOT/wails.json" "$PROJECT_ROOT/wails.json.backup"

# 更新wails.json使用icns文件
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

echo "✅ wails.json已更新"

# 4. 清理Wails开发缓存
echo ""
echo "🧹 第4步: 清理开发缓存..."
if [ -d "$WAILS_DIR" ]; then
    rm -rf "$WAILS_DIR"
    echo "✅ Wails缓存已清理"
else
    echo "ℹ️ Wails缓存目录不存在"
fi

# 5. 检查文件权限
echo ""
echo "🔐 第5步: 检查文件权限..."
chmod 644 "$ICON_DIR"/*.icns
chmod 644 "$ICON_DIR"/*.png
echo "✅ 图标文件权限已设置"

# 6. 显示最终的图标文件
echo ""
echo "📋 最终图标文件:"
ls -la "$ICON_DIR/"*.icns "$ICON_DIR/"*.png 2>/dev/null || true

# 7. 提供重启建议
echo ""
echo "🚀 重启建议:"
echo "要应用图标更改，请执行以下操作之一："
echo ""
echo "选项1: 使用重启脚本"
echo "   ./scripts/restart-dev.sh"
echo ""
echo "选项2: 手动重启"
echo "   1. 按 Ctrl+C 停止当前开发服务器"
echo "   2. 运行: export PATH=\$PATH:~/go/bin && wails dev"
echo ""
echo "选项3: 终止现有进程"
echo "   kill \$(pgrep -f 'wails dev') && export PATH=\$PATH:~/go/bin && wails dev"

echo ""
echo "💡 提示:"
echo "   - 开发模式可能需要几秒钟才能更新图标"
echo "   - 如果图标仍未显示，请检查系统Dock中的应用程序"
echo "   - 有时需要在Activity Monitor中强制退出应用程序"