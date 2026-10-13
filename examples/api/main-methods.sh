#!/bin/bash
# Hindsight CLI 核心方法示例
# 运行：bash examples/api/main-methods.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="main-methods-sh-demo-bank"

# =============================================================================
# 准备，文档中不展示
# =============================================================================
WORKDIR=$(mktemp -d)
cd "$WORKDIR"
mkdir docs
echo "Alice：完成了机器学习流水线评审。Bob：很好，发布吧。" > conversation.txt
echo "团队使用 GitHub 进行代码评审." > docs/process.txt

# =============================================================================
# 文档示例
# =============================================================================

# [docs:main-retain]
# 存储单条事实
hindsight memory retain "$BANK_ID" "Alice 于 2024 年 3 月加入 Google，担任高级机器学习工程师"

# 从文件存储
hindsight memory retain-files "$BANK_ID" conversation.txt --context "每日站会"

# 存储多个文件
hindsight memory retain-files "$BANK_ID" docs/
# [/docs:main-retain]

# [docs:main-recall]
# 基本搜索
hindsight memory recall "$BANK_ID" "Alice 在 Google 做什么工作？"

# 附带选项搜索
hindsight memory recall "$BANK_ID" "去年春天发生了什么？" \
    --budget high \
    --max-tokens 8192 \
    --fact-type world,experience

# 详细输出
hindsight memory recall "$BANK_ID" "介绍一下 Alice" -v
# [/docs:main-recall]

# [docs:main-reflect]
# 基本反思
hindsight memory reflect "$BANK_ID" "后端应该采用 TypeScript 吗？"

# 使用更高推理预算
hindsight memory reflect "$BANK_ID" "分析技术栈" --budget high
# [/docs:main-reflect]

# =============================================================================
# 清理，文档中不展示
# =============================================================================
rm -rf "$WORKDIR"
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}" > /dev/null

echo "main-methods.sh: 所有示例通过"
