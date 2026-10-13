#!/bin/bash
# 运行全部文档示例脚本
# 用法：./examples/run-examples.sh [python|node|cli|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# 输出颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # 重置颜色

passed=0
failed=0
skipped=0

run_python_examples() {
    echo -e "${YELLOW}正在运行 Python 示例……${NC}"
    for f in "$SCRIPT_DIR"/api/*.py; do
        if [ -f "$f" ]; then
            echo -n "  $(basename "$f"): "
            if python "$f" 2>&1; then
                echo -e "${GREEN}通过${NC}"
                ((passed++))
            else
                echo -e "${RED}失败${NC}"
                ((failed++))
            fi
        fi
    done
}

run_node_examples() {
    echo -e "${YELLOW}正在运行 Node.js 示例……${NC}"
    for f in "$SCRIPT_DIR"/api/*.mjs; do
        if [ -f "$f" ]; then
            echo -n "  $(basename "$f"): "
            if node "$f" 2>&1; then
                echo -e "${GREEN}通过${NC}"
                ((passed++))
            else
                echo -e "${RED}失败${NC}"
                ((failed++))
            fi
        fi
    done
}

run_cli_examples() {
    echo -e "${YELLOW}正在运行 CLI 示例……${NC}"

    # 检查 hindsight CLI 是否可用
    if ! command -v hindsight &> /dev/null; then
        echo -e "  ${YELLOW}跳过（尚未安装 hindsight CLI）${NC}"
        for f in "$SCRIPT_DIR"/api/*.sh; do
            if [ -f "$f" ]; then
                ((skipped++))
            fi
        done
        return
    fi

    for f in "$SCRIPT_DIR"/api/*.sh; do
        if [ -f "$f" ]; then
            echo -n "  $(basename "$f"): "
            if bash "$f" 2>&1; then
                echo -e "${GREEN}通过${NC}"
                ((passed++))
            else
                echo -e "${RED}失败${NC}"
                ((failed++))
            fi
        fi
    done
}

# 等待服务器就绪
wait_for_server() {
    echo "正在等待位于 $HINDSIGHT_URL 的 Hindsight 服务器就绪……"
    for i in {1..30}; do
        if curl -s "$HINDSIGHT_URL/health" > /dev/null 2>&1; then
            echo "服务器已就绪！"
            return 0
        fi
        sleep 1
    done
    echo "等待 30 秒后服务器仍不可用"
    return 1
}

# 主流程
case "${1:-all}" in
    python)
        wait_for_server
        run_python_examples
        ;;
    node)
        wait_for_server
        run_node_examples
        ;;
    cli)
        wait_for_server
        run_cli_examples
        ;;
    all)
        wait_for_server
        run_python_examples
        echo ""
        run_node_examples
        echo ""
        run_cli_examples
        ;;
    *)
        echo "用法：$0 [python|node|cli|all]"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo -e "结果：${GREEN}$passed 项通过${NC}，${RED}$failed 项失败${NC}，${YELLOW}$skipped 项跳过${NC}"
echo "========================================"

if [ $failed -gt 0 ]; then
    exit 1
fi
