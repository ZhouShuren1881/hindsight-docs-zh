#!/bin/bash
# Hindsight 指令 API 示例 CLI
# 运行： bash examples/api/directives.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="directives-example-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
hindsight bank create "$BANK_ID" --name "测试记忆库"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-directive]
# 创建指令（反思的硬性规则）
hindsight directive create "$BANK_ID" \
  "正式语言" \
  "始终使用正式英语回复，避免俚语和口语表达。"
# [/docs:create-directive]

# 获取指令 ID 供后续操作
DIRECTIVE_ID=$(hindsight directive list "$BANK_ID" -o json | python3 -c "import sys,json; items=json.load(sys.stdin).get('items',[]); print(items[0]['id'] if items else '')" 2>/dev/null || echo "")

# [docs:list-directives]
# 列出记忆库中的全部指令
hindsight directive list "$BANK_ID"
# [/docs:list-directives]

if [ -n "$DIRECTIVE_ID" ]; then
  # [docs:update-directive]
  # 更新指令（如禁用而不删除）
  hindsight directive update "$BANK_ID" "$DIRECTIVE_ID" --is-active false
  # [/docs:update-directive]

  # [docs:delete-directive]
  # 删除指令
  hindsight directive delete "$BANK_ID" "$DIRECTIVE_ID" -y
  # [/docs:delete-directive]
fi

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
hindsight bank delete "$BANK_ID" -y

echo "directives.sh: 全部示例通过"
