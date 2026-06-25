#!/bin/bash
#
# AgentHub 一键配对脚本
# 用法: curl -sSL https://agenthub.your-domain.com/pair.sh | bash
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
WORKER_URL="${AGENTHUB_WORKER_URL:-https://agenthub.your-domain.com}"
CONFIG_DIR="$HOME/.hermes/agenthub"
CONFIG_FILE="$CONFIG_DIR/config.json"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检测Agent类型
detect_agent_type() {
    if [ -d "$HOME/.openclaw" ]; then
        echo "openclaw"
    elif [ -d "$HOME/.hermes" ]; then
        echo "hermes"
    elif [ -d "$HOME/.claude" ]; then
        echo "claude-code"
    elif [ -d "$HOME/.codex" ]; then
        echo "codex"
    elif [ -n "$KIMI_CODE" ]; then
        echo "kimi-code"
    else
        echo "unknown"
    fi
}

# 检测Agent名称
detect_agent_name() {
    if [ -f "$HOME/.hermes/config.yaml" ]; then
        name=$(grep "^name:" "$HOME/.hermes/config.yaml" | cut -d':' -f2 | tr -d ' ')
        if [ -n "$name" ]; then
            echo "$name"
            return
        fi
    fi
    echo "Hermes Agent"
}

# 生成配对码
generate_pair_code() {
    # 生成8位大写字母+数字，排除容易混淆的字符
    cat /dev/urandom | tr -dc 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' | head -c 8
}

# 注册到云端
register_to_cloud() {
    local code=$1
    local agent_type=$2
    local agent_name=$3
    
    response=$(curl -s -X POST "$WORKER_URL/api/pair" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\",\"type\":\"$agent_type\",\"name\":\"$agent_name\"}")
    
    if echo "$response" | grep -q '"success":true'; then
        return 0
    else
        return 1
    fi
}

# 保存配置
save_config() {
    local code=$1
    local agent_type=$2
    local agent_name=$3
    
    mkdir -p "$CONFIG_DIR"
    
    cat > "$CONFIG_FILE" << EOF
{
  "code": "$code",
  "type": "$agent_type",
  "name": "$agent_name",
  "paired_at": "$(date -Iseconds)",
  "worker_url": "$WORKER_URL"
}
EOF
}

# 显示配对码
show_pair_code() {
    local code=$1
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎉 配对码已生成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}📱 请在手机APP中输入以下配对码：${NC}"
    echo ""
    echo -e "${GREEN}${BLUE}$code${NC}"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示：${NC}"
    echo -e "  - 配对码有效期：24小时"
    echo -e "  - 如需取消配对，请运行: $0 --unpair"
    echo -e "  - 如需查看状态，请运行: $0 --status"
    echo ""
}

# 取消配对
unpair() {
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "未找到配对配置"
        exit 1
    fi
    
    code=$(grep -o '"code":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    
    response=$(curl -s -X POST "$WORKER_URL/api/unpair" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\"}")
    
    if echo "$response" | grep -q '"success":true'; then
        rm -f "$CONFIG_FILE"
        print_success "配对已取消"
    else
        print_error "取消配对失败"
        exit 1
    fi
}

# 查看状态
status() {
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "未找到配对配置"
        exit 1
    fi
    
    code=$(grep -o '"code":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    
    echo ""
    print_info "正在查询Agent状态..."
    echo ""
    
    curl -s "$WORKER_URL/api/agent/$code" | python3 -m json.tool
}

# 主函数
main() {
    # 处理命令行参数
    case "${1:-}" in
        --unpair|-u)
            unpair
            exit 0
            ;;
        --status|-s)
            status
            exit 0
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  无参数      执行配对"
            echo "  --unpair    取消配对"
            echo "  --status    查看状态"
            echo "  --help      显示帮助"
            exit 0
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🔗 AgentHub 一键配对${NC}"
    echo ""
    
    # 检测环境
    print_info "正在检测环境..."
    agent_type=$(detect_agent_type)
    agent_name=$(detect_agent_name)
    print_success "Agent类型: $agent_type"
    print_success "Agent名称: $agent_name"
    echo ""
    
    # 生成配对码
    print_info "正在生成配对码..."
    code=$(generate_pair_code)
    print_success "配对码: $code"
    echo ""
    
    # 注册到云端
    print_info "正在注册到云端..."
    if register_to_cloud "$code" "$agent_type" "$agent_name"; then
        print_success "注册成功！"
    else
        print_error "注册失败，请检查网络连接"
        exit 1
    fi
    echo ""
    
    # 保存配置
    save_config "$code" "$agent_type" "$agent_name"
    print_success "配置已保存"
    
    # 显示配对码
    show_pair_code "$code"
}

# 执行主函数
main "$@"
