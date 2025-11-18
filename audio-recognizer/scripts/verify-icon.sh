#!/bin/bash

# 图标验证和缓存清理脚本
# 用于验证发布版应用是否使用了正确的自定义图标

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="$PROJECT_ROOT/release/听声辨字-v2.0.0-macOS-ARM64/tingshengbianzi.app"
ICON_PATH="$APP_PATH/Contents/Resources/iconfile.icns"

echo -e "${BLUE}🎨 听声辨字图标验证工具${NC}"
echo "========================================"

# 1. 验证应用包存在
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ 应用包不存在: $APP_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 应用包存在${NC}"

# 2. 验证图标文件存在
if [ ! -f "$ICON_PATH" ]; then
    echo -e "${RED}❌ 图标文件不存在: $ICON_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 图标文件存在${NC}"

# 3. 显示图标文件信息
ICON_SIZE=$(stat -f%z "$ICON_PATH" 2>/dev/null || echo "unknown")
echo -e "${BLUE}📊 图标文件信息:${NC}"
echo "   路径: $ICON_PATH"
echo "   大小: $ICON_SIZE bytes"

# 4. 检查图标文件类型
ICON_TYPE=$(file "$ICON_PATH" 2>/dev/null || echo "unknown")
echo "   类型: $ICON_TYPE"

# 5. 比较与源图标文件
SOURCE_ICON="$PROJECT_ROOT/frontend/assets/icons/icon-custom.icns"
if [ -f "$SOURCE_ICON" ]; then
    SOURCE_SIZE=$(stat -f%z "$SOURCE_ICON" 2>/dev/null || echo "unknown")
    echo -e "${BLUE}📋 源图标文件:${NC}"
    echo "   路径: $SOURCE_ICON"
    echo "   大小: $SOURCE_SIZE bytes"

    if [ "$ICON_SIZE" != "$unknown" ] && [ "$SOURCE_SIZE" != "unknown" ]; then
        if [ "$ICON_SIZE" -eq "$SOURCE_SIZE" ]; then
            echo -e "${GREEN}✅ 图标文件大小匹配源文件${NC}"
        else
            echo -e "${YELLOW}⚠️ 图标文件大小与源文件不同，可能已优化${NC}"
        fi
    fi
fi

echo ""
echo -e "${BLUE}🧹 图标缓存清理:${NC}"

# 6. 清理系统图标缓存
echo "清理用户图标缓存..."
rm -rf ~/Library/Caches/com.apple.iconservices.store 2>/dev/null || echo "   用户图标缓存不存在"

echo "清理Finder图标缓存..."
rm -rf ~/Library/Caches/com.apple.finder* 2>/dev/null || echo "   Finder图标缓存不存在"

echo -e "${GREEN}✅ 图标缓存清理完成${NC}"

echo ""
echo -e "${BLUE}🚀 建议的图标验证步骤:${NC}"
echo "1. 重新启动Finder: Option + Command + Esc → 选择Finder → 重新打开"
echo "2. 重启Dock: killall Dock"
echo "3. 在终端中运行: open '$APP_PATH'"
echo "4. 检查Dock中的应用图标"
echo "5. 检查Applications文件夹中的应用图标"

echo ""
echo -e "${BLUE}💡 如果图标仍未更新:${NC}"
echo "- 尝试重启系统"
echo "- 在系统设置中重新分配应用程序图标"
echo "- 使用: touch '$APP_PATH' 然后重启Finder"

echo ""
echo -e "${GREEN}🎉 图标验证完成！${NC}"

# 7. 询问是否立即启动应用测试
read -p "是否立即启动应用进行图标测试？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 启动应用程序...${NC}"
    open "$APP_PATH"
    echo -e "${GREEN}✅ 应用程序已启动，请检查Dock中的图标显示${NC}"
fi