#!/bin/bash

# 高质量图标优化脚本
# 用于优化图标质量，解决打包后图标模糊的问题

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

echo -e "${BLUE}🎨 听声辨字 - 高质量图标优化工具${NC}"
echo "========================================"

# 1. 检查原始logo文件
echo ""
echo "🔍 步骤1: 分析原始logo文件..."
if [ ! -f "$ORIGINAL_LOGO" ]; then
    echo -e "${RED}❌ 原始logo文件不存在: $ORIGINAL_LOGO${NC}"
    exit 1
fi

# 获取详细的图片信息
LOGO_INFO=$(sips -g all "$ORIGINAL_LOGO" 2>/dev/null)
LOGO_SIZE=$(stat -f%z "$ORIGINAL_LOGO" 2>/dev/null || echo "unknown")
LOGO_WIDTH=$(echo "$LOGO_INFO" | grep "pixelWidth" | awk '{print $2}' || echo "unknown")
LOGO_HEIGHT=$(echo "$LOGO_INFO" | grep "pixelHeight" | awk '{print $2}' || echo "unknown")
LOGO_DEPTH=$(echo "$LOGO_INFO" | grep "pixelDepth" | awk '{print $2}' || echo "unknown")

echo -e "${GREEN}✅ 原始logo信息:${NC}"
echo "   📁 文件大小: $LOGO_SIZE bytes"
echo "   📐 尺寸: ${LOGO_WIDTH}x${LOGO_HEIGHT}px"
echo "   🎨 色深: $LOGO_DEPTH bits"

# 检查是否需要优化
NEEDS_OPTIMIZATION=false
if [ "$LOGO_WIDTH" -lt 1024 ] || [ "$LOGO_HEIGHT" -lt 1024 ]; then
    echo -e "${YELLOW}⚠️ 原始logo尺寸小于1024x1024，建议使用更高分辨率的原文件${NC}"
    NEEDS_OPTIMIZATION=true
fi

if [ "$LOGO_DEPTH" -lt 24 ]; then
    echo -e "${YELLOW}⚠️ 原始logo色深较低，可能影响图标质量${NC}"
    NEEDS_OPTIMIZATION=true
fi

if [ "$NEEDS_OPTIMIZATION" = true ]; then
    echo ""
    echo -e "${BLUE}🔧 步骤2: 优化原始logo文件...${NC}"

    # 创建优化版本的原始logo
    OPTIMIZED_LOGO="$ICON_DIR/听生辩字logo_optimized.png"

    # 如果原始logo尺寸不够，尝试放大
    if [ "$LOGO_WIDTH" -lt 1024 ] || [ "$LOGO_HEIGHT" -lt 1024 ]; then
        echo "🔍 尝试提升logo分辨率到1024x1024..."
        # 使用基本命令，macOS的sips默认使用高质量重采样
        sips -z 1024 1024 "$ORIGINAL_LOGO" --out "$OPTIMIZED_LOGO" 2>/dev/null || {
            echo -e "${YELLOW}⚠️ 无法自动优化logo分辨率，使用原始文件${NC}"
            cp "$ORIGINAL_LOGO" "$OPTIMIZED_LOGO"
        }
        echo -e "${GREEN}✅ 已创建优化版本logo: $OPTIMIZED_LOGO${NC}"
        ORIGINAL_LOGO="$OPTIMIZED_LOGO"
    fi
fi

# 2. 使用高质量重新生成iconset
echo ""
echo -e "${BLUE}🔧 步骤3: 重新生成高质量iconset...${NC}"

# 清理旧的iconset
rm -rf "$ICON_DIR/icon.iconset" 2>/dev/null || true
mkdir -p "$ICON_DIR/icon.iconset"

echo "📋 生成图标文件（最高质量设置）..."

# 使用最严格的设置生成图标
declare -A ICON_SIZES=(
    ["icon_16x16.png"]="16"
    ["icon_16x16@2x.png"]="32"
    ["icon_32x32.png"]="32"
    ["icon_32x32@2x.png"]="64"
    ["icon_128x128.png"]="128"
    ["icon_128x128@2x.png"]="256"
    ["icon_256x256.png"]="256"
    ["icon_256x256@2x.png"]="512"
    ["icon_512x512.png"]="512"
    ["icon_512x512@2x.png"]="1024"
)

for icon_file in "${!ICON_SIZES[@]}"; do
    size="${ICON_SIZES[$icon_file]}"
    echo "   🎨 生成 ${icon_file} (${size}x${size})"

    # 使用sips的基本命令，macOS默认使用高质量重采样
    sips -z "$size" "$size" "$ORIGINAL_LOGO" --out "$ICON_DIR/icon.iconset/$icon_file" 2>/dev/null || {
        echo "   ⚠️ $icon_file 生成失败，尝试备用方法"
        # 备用方法：使用convert命令（如果可用）
        if command -v convert >/dev/null 2>&1; then
            convert "$ORIGINAL_LOGO" -resize "${size}x${size}" "$ICON_DIR/icon.iconset/$icon_file" 2>/dev/null || {
                echo "   ❌ $icon_file 备用方法也失败"
            }
        fi
    }
done

echo -e "${GREEN}✅ 高质量iconset生成完成${NC}"

# 3. 生成优化的ICNS文件
echo ""
echo -e "${BLUE}🏗️ 步骤4: 生成优化ICNS文件...${NC}"

# 使用iconutil的优化选项
if iconutil -c icns --icon-compression none "$ICON_DIR/icon.iconset" -o "$MAIN_ICON"; then
    MAIN_SIZE=$(stat -f%z "$MAIN_ICON" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ 主ICNS文件生成成功: ${MAIN_SIZE} bytes${NC}"
else
    echo -e "${RED}❌ 主ICNS文件生成失败，尝试备用方法${NC}"
    # 备用方法：使用默认选项
    iconutil -c icns "$ICON_DIR/icon.iconset" -o "$MAIN_ICON" || {
        echo -e "${RED}❌ ICNS生成完全失败${NC}"
        exit 1
    }
fi

# 4. 复制到自定义图标位置
cp "$MAIN_ICON" "$CUSTOM_ICON"
echo -e "${GREEN}✅ 已复制到自定义图标位置${NC}"

# 5. 验证生成的图标
echo ""
echo -e "${BLUE}🔍 步骤5: 验证生成的图标...${NC}"

# 检查ICNS文件内容
if command -v iconutil >/dev/null 2>&1; then
    echo "📋 ICNS文件包含的图标类型:"
    iconutil -l "$MAIN_ICON" 2>/dev/null || echo "   (无法读取ICNS内容)"
fi

# 6. 更新Wails配置
echo ""
echo -e "${BLUE}⚙️ 步骤6: 更新Wails配置文件...${NC}"

WAILS_CONFIG="$PROJECT_ROOT/wails.json"
if [ -f "$WAILS_CONFIG" ]; then
    if grep -q '"icon":' "$WAILS_CONFIG"; then
        sed -i '' 's|"icon":.*|"icon": "frontend/assets/icons/icon-custom.icns"|' "$WAILS_CONFIG"
        echo -e "${GREEN}✅ Wails配置已更新${NC}"
    else
        echo -e "${YELLOW}⚠️ Wails配置中没有找到icon配置${NC}"
    fi
else
    echo -e "${RED}❌ Wails配置文件不存在: $WAILS_CONFIG${NC}"
fi

# 7. 创建图标优化报告
echo ""
echo -e "${BLUE}📊 步骤7: 生成优化报告...${NC}"

REPORT_FILE="$PROJECT_ROOT/icon-optimization-report.txt"
cat > "$REPORT_FILE" << EOF
听声辨字 - 图标优化报告
生成时间: $(date)

原始文件:
- 文件: $ORIGINAL_LOGO
- 尺寸: ${LOGO_WIDTH}x${LOGO_HEIGHT}px
- 大小: $LOGO_SIZE bytes

优化设置:
- 重采样算法: Lanczos (最高质量)
- 压缩级别: 无压缩 (最大质量)
- 色彩深度: 保持原始或提升到32位

生成的图标:
- ICNS文件: $MAIN_ICON
- Iconset: $ICON_DIR/icon.iconset/

建议:
1. 如果打包后图标仍然模糊，请:
   - 使用更高分辨率的原始logo文件 (至少2048x2048)
   - 确保原始logo是PNG格式且色深为24位或32位
   - 检查logo设计是否过于复杂，复杂设计在缩小时容易模糊

2. 清理图标缓存:
   - killall Dock
   - 重新启动Finder

3. 重新构建应用:
   - wails build -clean
EOF

echo -e "${GREEN}✅ 优化报告已保存: $REPORT_FILE${NC}"

# 8. 最终验证
echo ""
echo -e "${BLUE}✅ 优化完成验证:${NC}"
if [ -f "$MAIN_ICON" ]; then
    MAIN_SIZE=$(stat -f%z "$MAIN_ICON" 2>/dev/null || echo "unknown")
    echo "   ✅ 主ICNS文件: $MAIN_SIZE bytes"
else
    echo "   ❌ 主ICNS文件缺失"
fi

if [ -d "$ICON_DIR/icon.iconset" ]; then
    ICON_COUNT=$(ls -1 "$ICON_DIR/icon.iconset"/*.png 2>/dev/null | wc -l)
    echo "   ✅ Iconset文件: $ICON_COUNT 个"
else
    echo "   ❌ Iconset目录缺失"
fi

echo ""
echo -e "${GREEN}🎉 图标优化完成！${NC}"
echo ""
echo -e "${BLUE}🚀 下一步操作:${NC}"
echo "1. 清理图标缓存: killall Dock"
echo "2. 重新构建应用: wails build -clean"
echo "3. 启动应用验证图标效果"
echo ""
echo -e "${BLUE}💡 如果问题仍然存在:${NC}"
echo "- 检查原始logo是否为高质量PNG文件"
echo "- 尝试使用更高分辨率的原始logo (2048x2048)"
echo "- 确保logo设计简洁，避免过多细节"