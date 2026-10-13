#!/bin/bash
# Hindsight CLI 快速开始示例
# 运行：bash examples/api/quickstart.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:quickstart-full]
# Retain：存储信息
hindsight memory retain my-bank "Alice 在 Google 担任软件工程师"

# Recall：搜索记忆
hindsight memory recall my-bank "Alice 做什么工作？"

# Reflect：生成回答
hindsight memory reflect my-bank "介绍一下 Alice"
# [/docs:quickstart-full]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/my-bank" > /dev/null

echo "quickstart.sh: 所有示例通过"
