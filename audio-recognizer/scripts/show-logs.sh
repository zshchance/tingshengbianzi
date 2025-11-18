#!/bin/bash

# 听声辨字 - 日志查看工具
# 用于查看和诊断应用程序的日志文件

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 听声辨字 - 日志查看工具${NC}"
echo "========================================"

# 确定日志文件位置
LOG_LOCATIONS=(
    "$HOME/Library/Logs/听声辨字"
    "$HOME/Library/Application Support/听声辨字/logs"
    "/tmp/听声辨字"
    "./logs"
    "./logs/听声辨字"
)

# 查找日志目录
echo ""
echo "🔍 搜索日志文件位置..."
FOUND_LOGS=false
LOG_DIR=""

for location in "${LOG_LOCATIONS[@]}"; do
    if [ -d "$location" ]; then
        echo -e "${GREEN}✅ 找到日志目录: $location${NC}"
        LOG_DIR="$location"
        FOUND_LOGS=true

        # 显示日志文件列表
        echo ""
        echo -e "${BLUE}📋 日志文件列表:${NC}"
        ls -la "$location"/*.log 2>/dev/null | tail -5 || echo "   没有找到.log文件"

        # 查找其他可能的日志文件
        if ls "$location"/*log* 1> /dev/null 2>&1; then
            echo ""
            echo -e "${BLUE}📋 所有日志相关文件:${NC}"
            ls -la "$location"/*log* 2>/dev/null
        fi
        break
    else
        echo -e "${YELLOW}⚠️ 目录不存在: $location${NC}"
    fi
done

if [ "$FOUND_LOGS" = false ]; then
    echo ""
    echo -e "${RED}❌ 未找到日志目录${NC}"
    echo ""
    echo -e "${BLUE}🔧 尝试创建日志目录:${NC}"
    DEFAULT_LOG_DIR="$HOME/Library/Logs/听声辨字"
    mkdir -p "$DEFAULT_LOG_DIR"
    echo -e "${GREEN}✅ 已创建默认日志目录: $DEFAULT_LOG_DIR${NC}"
    LOG_DIR="$DEFAULT_LOG_DIR"
fi

# 显示最新日志内容
echo ""
echo -e "${BLUE}📖 查看最新日志内容:${NC}"
echo "----------------------------------------"

# 查找最新的日志文件
LATEST_LOG=$(find "$LOG_DIR" -name "*.log" -type f -exec ls -t {} + 2>/dev/null | head -1)

if [ -n "$LATEST_LOG" ] && [ -f "$LATEST_LOG" ]; then
    echo -e "${GREEN}📁 正在显示: $LATEST_LOG${NC}"
    echo "最后修改时间: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_LOG")"
    echo "文件大小: $(stat -f%z "$LATEST_LOG") bytes"
    echo ""
    echo "📋 最近20行日志内容:"
    echo "----------------------------------------"
    tail -20 "$LATEST_LOG" | grep -E "(ERROR|WARN|INFO|DEBUG)" || tail -20 "$LATEST_LOG"
    echo "----------------------------------------"
else
    echo -e "${YELLOW}⚠️ 未找到日志文件${NC}"
    echo ""
    echo "可能的原因:"
    echo "1. 应用程序尚未启动"
    echo "2. 日志系统未正确初始化"
    echo "3. 应用程序崩溃，未能写入日志"
fi

# 提供日志操作选项
echo ""
echo -e "${BLUE}🔧 日志操作选项:${NC}"
echo "1. 查看完整日志文件"
echo "2. 监控实时日志"
echo "3. 搜索错误日志"
echo "4. 清理旧日志"
echo "5. 打开日志目录"
echo ""
read -p "请选择操作 (1-5): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo -e "${BLUE}📖 显示完整日志内容:${NC}"
        if [ -f "$LATEST_LOG" ]; then
            less "$LATEST_LOG"
        else
            echo -e "${RED}❌ 没有可显示的日志文件${NC}"
        fi
        ;;
    2)
        echo -e "${BLUE}📡 实时监控日志 (Ctrl+C 退出):${NC}"
        if [ -f "$LATEST_LOG" ]; then
            tail -f "$LATEST_LOG"
        else
            echo -e "${RED}❌ 没有可监控的日志文件${NC}"
            echo "请先启动应用程序以生成日志文件"
        fi
        ;;
    3)
        echo -e "${BLUE}🔍 搜索错误和警告日志:${NC}"
        if [ -f "$LATEST_LOG" ]; then
            echo "发现的错误和警告:"
            echo "----------------------------------------"
            grep -E "(ERROR|WARN|失败|错误)" "$LATEST_LOG" -i --color=auto || echo "未发现明显的错误或警告"
            echo "----------------------------------------"
        else
            echo -e "${RED}❌ 没有可搜索的日志文件${NC}"
        fi
        ;;
    4)
        echo -e "${BLUE}🧹 清理旧日志文件:${NC}"
        read -p "确定要删除7天前的日志文件吗? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete 2>/dev/null
            echo -e "${GREEN}✅ 清理完成${NC}"
        fi
        ;;
    5)
        echo -e "${BLUE}📁 打开日志目录:${NC}"
        if command -v open >/dev/null 2>&1; then
            open "$LOG_DIR"
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$LOG_DIR"
        else
            echo "日志目录路径: $LOG_DIR"
        fi
        ;;
    *)
        echo -e "${YELLOW}⏭️ 取消操作${NC}"
        ;;
esac

# 诊断建议
echo ""
echo -e "${BLUE}💡 诊断建议:${NC}"
echo "1. 如果没有日志文件，请:"
   echo "   - 确保应用程序已经启动"
   echo "   - 检查应用程序是否有权限写入日志目录"
   echo "   - 查看系统控制台获取更多信息"

echo ""
echo "2. 常见错误类型:"
   echo "   - ERROR: 严重错误，导致功能失败"
   echo "   - WARN: 警告信息，可能影响功能"
   echo "   - INFO: 一般信息，正常操作记录"

echo ""
echo "3. 如果日志为空，可能原因:"
   echo "   - 应用程序启动后立即崩溃"
   echo "   - 日志系统初始化失败"
   echo "   - 权限问题导致无法写入日志"

# 系统控制台日志
echo ""
echo -e "${BLUE}🖥️ 系统控制台日志 (macOS):${NC}"
echo "您还可以通过以下方式查看系统级日志:"
echo "1. 打开 控制台 应用"
echo "2. 搜索 'tingshengbianzi' 或 '听声辨字'"
echo "3. 查看崩溃报告和系统日志"