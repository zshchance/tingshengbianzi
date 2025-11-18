#!/bin/bash

# 修复构建后的图标文件
# 手动替换Wails构建过程中生成的低质量图标

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_ICON="$PROJECT_ROOT/frontend/assets/icons/icon-custom.icns"
TARGET_APP="$PROJECT_ROOT/build/bin/tingshengbianzi.app"
TARGET_ICON="$TARGET_APP/Contents/Resources/iconfile.icns"

echo -e "${BLUE}🎨 听声辨字 - 构建后图标修复工具${NC}"
echo "========================================"

# 检查源图标文件
echo ""
echo "🔍 检查源图标文件..."
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}❌ 源图标文件不存在: $SOURCE_ICON${NC}"
    echo "请先运行: ./scripts/fix-icons-simple.sh"
    exit 1
fi

SOURCE_SIZE=$(stat -f%z "$SOURCE_ICON" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ 源图标文件: $SOURCE_SIZE bytes${NC}"

# 检查目标应用
echo ""
echo "🔍 检查目标应用..."
if [ ! -d "$TARGET_APP" ]; then
    echo -e "${RED}❌ 目标应用不存在: $TARGET_APP${NC}"
    echo "请先构建应用: wails build -clean"
    exit 1
fi

echo -e "${GREEN}✅ 目标应用存在${NC}"

# 检查并备份当前图标
echo ""
echo "🔍 检查当前图标..."
if [ -f "$TARGET_ICON" ]; then
    CURRENT_SIZE=$(stat -f%z "$TARGET_ICON" 2>/dev/null || echo "unknown")
    echo -e "${YELLOW}⚠️ 当前图标: $CURRENT_SIZE bytes${NC}"

    # 如果当前图标太小，说明需要替换
    if [ "$CURRENT_SIZE" -lt 100000 ]; then
        echo -e "${RED}❌ 当前图标过小，需要替换${NC}"

        # 备份当前图标
        BACKUP_ICON="$TARGET_ICON.backup"
        cp "$TARGET_ICON" "$BACKUP_ICON"
        echo -e "${GREEN}✅ 已备份当前图标: $BACKUP_ICON${NC}"
    else
        echo -e "${GREEN}✅ 当前图标大小正常，无需替换${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ 目标图标文件不存在${NC}"
fi

# 替换图标文件
echo ""
echo "🔧 替换图标文件..."
cp "$SOURCE_ICON" "$TARGET_ICON"
NEW_SIZE=$(stat -f%z "$TARGET_ICON" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ 图标替换完成: $NEW_SIZE bytes${NC}"

# 更新应用包信息
echo ""
echo "🔧 更新应用包信息..."

# 重新生成应用包缓存
echo "清理应用图标缓存..."
if command -v touch >/dev/null 2>&1; then
    touch "$TARGET_APP"
    touch "$TARGET_APP/Contents"
    touch "$TARGET_APP/Contents/Resources"
fi

# 删除系统图标缓存
echo "删除系统图标缓存..."
if [ -d ~/Library/Caches/com.apple.iconservices.store ]; then
    find ~/Library/Caches/com.apple.iconservices.store -name "*tingshengbianzi*" -delete 2>/dev/null || true
fi

# 重启相关服务
echo ""
echo "🔄 重启图标服务..."
killall Dock 2>/dev/null || echo "Dock进程未运行或无法重启"
killall Finder 2>/dev/null || echo "Finder进程未运行或无法重启"

# 验证结果
echo ""
echo "🔍 验证修复结果..."
echo "源图标大小: $SOURCE_SIZE bytes"
echo "目标图标大小: $NEW_SIZE bytes"

if [ "$NEW_SIZE" -gt "$SOURCE_SIZE" ]; then
    echo -e "${GREEN}✅ 图标修复成功！${NC}"
else
    echo -e "${YELLOW}⚠️ 图标大小有变化，请手动验证${NC}"
fi

echo ""
echo "🚀 测试建议:"
echo "1. 启动应用查看图标: open $TARGET_APP"
echo "2. 在Finder中查看应用图标"
echo "3. 在Dock中查看应用图标"

echo ""
echo "💡 如果图标仍然不清晰:"
echo "1. 重启Mac系统"
echo "2. 清理所有图标缓存: rm -rf ~/Library/Caches/com.apple.iconservices.store"
echo "3. 重新构建应用: wails build -clean && ./scripts/fix-build-icons.sh"

echo ""
echo -e "${GREEN}🎉 构建后图标修复完成！${NC}"