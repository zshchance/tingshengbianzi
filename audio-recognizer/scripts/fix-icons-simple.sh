#!/bin/bash

# 简化版图标修复脚本
# 专门修复sips命令参数问题

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目配置
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$PROJECT_ROOT/frontend/assets/icons"
ORIGINAL_LOGO="$ICON_DIR/听生辩字logo.png"
MAIN_ICON="$ICON_DIR/icon.icns"
CUSTOM_ICON="$ICON_DIR/icon-custom.icns"

echo -e "${BLUE}🎨 听声辨字 - 简化版图标修复工具${NC}"
echo "========================================"

# 1. 检查原始logo文件
echo ""
echo "🔍 步骤1: 检查原始logo文件..."
if [ ! -f "$ORIGINAL_LOGO" ]; then
    echo -e "${RED}❌ 原始logo文件不存在: $ORIGINAL_LOGO${NC}"
    exit 1
fi

LOGO_SIZE=$(stat -f%z "$ORIGINAL_LOGO" 2>/dev/null || echo "unknown")
LOGO_INFO=$(sips -g all "$ORIGINAL_LOGO" 2>/dev/null || echo "无法读取图片信息")
echo -e "${GREEN}✅ 原始logo: ${LOGO_SIZE} bytes${NC}"
echo "$LOGO_INFO"

# 2. 清理并重新生成iconset
echo ""
echo "🔧 步骤2: 重新生成iconset..."
rm -rf "$ICON_DIR/icon.iconset" 2>/dev/null || true
mkdir -p "$ICON_DIR/icon.iconset"

echo "📋 生成图标文件（使用标准sips命令）..."

# 标准的图标尺寸生成
sips -z 16 16 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_16x16.png" 2>/dev/null || echo "⚠️ 16x16图标生成失败"
sips -z 32 32 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_16x16@2x.png" 2>/dev/null || echo "⚠️ 16x16@2x图标生成失败"
sips -z 32 32 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_32x32.png" 2>/dev/null || echo "⚠️ 32x32图标生成失败"
sips -z 64 64 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_32x32@2x.png" 2>/dev/null || echo "⚠️ 32x32@2x图标生成失败"
sips -z 128 128 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_128x128.png" 2>/dev/null || echo "⚠️ 128x128图标生成失败"
sips -z 256 256 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_128x128@2x.png" 2>/dev/null || echo "⚠️ 128x128@2x图标生成失败"
sips -z 256 256 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_256x256.png" 2>/dev/null || echo "⚠️ 256x256图标生成失败"
sips -z 512 512 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_256x256@2x.png" 2>/dev/null || echo "⚠️ 256x256@2x图标生成失败"
sips -z 512 512 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_512x512.png" 2>/dev/null || echo "⚠️ 512x512图标生成失败"
sips -z 1024 1024 "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/icon_512x512@2x.png" 2>/dev/null || echo "⚠️ 512x512@2x图标生成失败"

# 验证生成的文件
GENERATED_COUNT=$(ls -1 "$ICON_DIR/icon.iconset"/*.png 2>/dev/null | wc -l)
echo -e "${GREEN}✅ 生成了 $GENERATED_COUNT 个图标文件${NC}"

# 3. 生成ICNS文件
echo ""
echo "🏗️ 步骤3: 生成ICNS文件..."
if iconutil -c icns "$ICON_DIR/icon.iconset" -o "$MAIN_ICON"; then
    MAIN_SIZE=$(stat -f%z "$MAIN_ICON" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 主ICNS文件生成成功: ${MAIN_SIZE} bytes${NC}"
else
    echo -e "${RED}❌ 主ICNS文件生成失败${NC}"
    exit 1
fi

# 4. 复制到自定义图标位置
cp "$MAIN_ICON" "$CUSTOM_ICON"
echo -e "${GREEN}✅ 已复制到自定义图标位置${NC}"

# 5. 更新Wails配置
echo ""
echo "⚙️ 步骤4: 更新Wails配置文件..."
WAILS_CONFIG="$PROJECT_ROOT/wails.json"
if [ -f "$WAILS_CONFIG" ]; then
    if grep -q '"icon":' "$WAILS_CONFIG"; then
        sed -i '' 's|"icon":.*|"icon": "frontend/assets/icons/icon-custom.icns"|' "$WAILS_CONFIG"
        echo -e "${GREEN}✅ Wails配置已更新，指向自定义图标${NC}"
    else
        echo -e "${YELLOW}⚠️ Wails配置中没有找到icon配置${NC}"
    fi
else
    echo -e "${RED}❌ Wails配置文件不存在: $WAILS_CONFIG${NC}"
fi

# 6. 更新构建目录图标
echo ""
echo "🔨 步骤5: 更新构建目录图标..."
BUILD_ICON="$PROJECT_ROOT/build/appicon.png"
mkdir -p "$(dirname "$BUILD_ICON")" 2>/dev/null || true
if [ -f "$MAIN_ICON" ]; then
    cp "$MAIN_ICON" "$BUILD_ICON"
    BUILD_SIZE=$(stat -f%z "$BUILD_ICON" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 构建目录图标已更新: ${BUILD_SIZE} bytes${NC}"
fi

# 7. 验证最终结果
echo ""
echo "🧹 步骤6: 验证最终结果..."

# 检查生成的图标文件
echo -e "${BLUE}📋 生成的图标文件:${NC}"
find "$ICON_DIR" -name "*.icns" -o -name "*.png" | head -10

# 检查配置文件
echo ""
echo -e "${BLUE}📋 Wails配置:${NC}"
if [ -f "$WAILS_CONFIG" ]; then
    grep '"icon"' "$WAILS_CONFIG" 2>/dev/null || echo "   未找到icon配置"
fi

# 8. 显示构建建议
echo ""
echo "🚀 下一步建议："
echo "1. 重新构建应用：export PATH=\$PATH:~/go/bin && wails build -clean"
echo "2. 清理图标缓存：killall Dock"
echo "3. 启动应用验证图标：open build/bin/tingshengbianzi.app"

echo ""
echo -e "${GREEN}✅ 简化版图标修复完成！${NC}"
echo ""
echo -e "${BLUE}💡 图标优化建议：${NC}"
echo "- 原始logo建议使用1024x1024或更高分辨率的PNG文件"
echo "- 确保logo设计简洁，避免过于复杂的细节"
echo "- 如果图标仍然模糊，请检查原始logo的分辨率和质量"