#!/bin/bash
# Hindsight 记忆 API 示例 CLI — 读取、列出和整理记忆单元。
# 运行： bash examples/api/memories.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="memories-demo-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
hindsight bank create "$BANK_ID" --name "记忆演示"
hindsight memory retain "$BANK_ID" "助手在 2023 年访问巴黎。"
hindsight memory retain "$BANK_ID" "部署服务器 srv-04 运行 PostgreSQL 14。"
sleep 3

# =============================================================================
# 文档示例
# =============================================================================

# [docs:list-memories]
# 列出记忆单元，默认包含失效行
hindsight memory list "$BANK_ID"

# 仅筛选失效事实，如审查重复项
curl -s "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/list?state=invalidated"
# [/docs:list-memories]

# 选择 world/experience 原始事实整理。
MEMORY_ID=$(hindsight memory list "$BANK_ID" -o json | python3 -c "import sys,json; items=json.load(sys.stdin).get('items',[]); print(next((u['id'] for u in items if u['fact_type'] in ('world','experience')), ''))")

if [ -n "$MEMORY_ID" ]; then
  # [docs:get-memory]
  # 获取单个记忆单元（元数据、实体、日期、状态）
  curl -s "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$MEMORY_ID"
  # [/docs:get-memory]

  # [docs:edit-memory]
  # 修正文本，重新嵌入、移除派生观察及链接，
  # 自动重新整合并重算图。
  curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$MEMORY_ID" \
    -H "Content-Type: application/json" \
    -d '{"text": "用户在 2023 年访问巴黎。", "reason": "主体错误"}'
  # [/docs:edit-memory]

  # [docs:edit-memory-fields]
  # 一次修正日期、类型和实体。空字符串清字段；
  # entities 替换集合（[] 全解除），省略则不变。
  # resolve_entities false 防止输入实体名匹配
  # 到已有的相似实体。
  curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$MEMORY_ID" \
    -H "Content-Type: application/json" \
    -d '{"occurred_start": "2023-06-01", "fact_type": "experience", "entities": ["Alice", "Paris"], "resolve_entities": false}'
  # [/docs:edit-memory-fields]

  # [docs:invalidate-memory]
  # 使事实软失效：移出召回/整合/图，剪除链接，
  # 重新计算不含它的观察，但保留审计。
  curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$MEMORY_ID" \
    -H "Content-Type: application/json" \
    -d '{"state": "invalidated", "reason": "服务器于 2026-06-01 停用"}'
  # [/docs:invalidate-memory]

  # [docs:restore-memory]
  # 恢复此前失效事实。
  curl -s -X PATCH "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$MEMORY_ID" \
    -H "Content-Type: application/json" \
    -d '{"state": "valid"}'
  # [/docs:restore-memory]
fi

# 派生观察展示来源到达时的演变。
OBSERVATION_ID=$(hindsight memory list "$BANK_ID" -o json | python3 -c "import sys,json; items=json.load(sys.stdin).get('items',[]); print(next((u['id'] for u in items if u['fact_type']=='observation'), ''))")
if [ -n "$OBSERVATION_ID" ]; then
  # [docs:observation-history]
  # 获取派生观察刷新历史
  curl -s "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories/$OBSERVATION_ID/history"
  # [/docs:observation-history]
fi

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
curl -s -X DELETE "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" > /dev/null

echo "memories.sh: 全部示例通过"
