#!/bin/bash
# Hindsight 心智模型 API 示例 CLI
# 运行： bash examples/api/mental-models.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="mental-models-demo-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
hindsight bank create "$BANK_ID" --name "心智模型演示"
hindsight memory retain "$BANK_ID" "团队偏好通过 Slack 异步沟通"
hindsight memory retain "$BANK_ID" "紧急问题使用 #incidents 频道"
hindsight memory retain "$BANK_ID" "每周同步会议在周一上午 10 点"
sleep 2

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-mental-model]
# 创建心智模型，后台反思
hindsight mental-model create "$BANK_ID" \
  "团队沟通偏好" \
  "团队偏好如何沟通？"
# [/docs:create-mental-model]

# [docs:create-mental-model-with-id]
# 创建指定自定义 ID 的心智模型
hindsight mental-model create "$BANK_ID" \
  "沟通政策" \
  "团队沟通准则是什么？" \
  --id communication-policy
# [/docs:create-mental-model-with-id]

sleep 5

# [docs:create-mental-model-with-trigger]
# 创建并获取 ID 供后续操作
hindsight mental-model create "$BANK_ID" \
  "项目状态" \
  "当前项目状态如何？"
# [/docs:create-mental-model-with-trigger]

# [docs:create-mental-model-tags-match]
# 覆盖刷新时模型标签筛选来源的方式。
# 带标签默认 all_strict，需全部标签；
# 记忆仅单主题时传 --tags-match any，
# 刷新读取至少带一个标签的记忆。
hindsight mental-model create "$BANK_ID" \
  "当前项目" \
  "用户目前处理哪些项目？" \
  --tags projects,mental-model \
  --tags-match any
# [/docs:create-mental-model-tags-match]

sleep 5

# [docs:list-mental-models]
# 列出全部心智模型
hindsight mental-model list "$BANK_ID"
# [/docs:list-mental-models]

# 获取首个模型 ID 供示例
MENTAL_MODEL_ID=$(hindsight mental-model list "$BANK_ID" -o json | python3 -c "import sys,json; items=json.load(sys.stdin).get('items',[]); print(items[0]['id'] if items else '')" 2>/dev/null || echo "")

if [ -n "$MENTAL_MODEL_ID" ]; then
  # [docs:get-mental-model]
  # 获取指定心智模型
  hindsight mental-model get "$BANK_ID" "$MENTAL_MODEL_ID"
  # [/docs:get-mental-model]

  # [docs:refresh-mental-model]
  # 刷新心智模型，更新为当前知识
  hindsight mental-model refresh "$BANK_ID" "$MENTAL_MODEL_ID"
  # [/docs:refresh-mental-model]

  # [docs:clear-mental-model]
  # 清空内容再刷新，完整重新综合
  curl -s -X POST "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}/mental-models/${MENTAL_MODEL_ID}/clear"

  # 触发全新完整重建
  hindsight mental-model refresh "$BANK_ID" "$MENTAL_MODEL_ID"
  # [/docs:clear-mental-model]

  # [docs:update-mental-model]
  # 更新模型元数据
  hindsight mental-model update "$BANK_ID" "$MENTAL_MODEL_ID" \
    --name "更新后的团队沟通偏好"
  # [/docs:update-mental-model]

  # [docs:get-mental-model-history]
  # 获取模型变更历史
  hindsight mental-model history "$BANK_ID" "$MENTAL_MODEL_ID"
  # [/docs:get-mental-model-history]

  # [docs:mental-model-detail]
  # CLI 无 --detail，用 HTTP API
  # 列表默认仅元数据，最小响应
  curl "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/mental-models"

  # 列表包含内容，不含来源链，需显式选择
  curl "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/mental-models?detail=content"

  # 获取单模型，默认完整细节
  curl "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/mental-models/$MENTAL_MODEL_ID"
  # [/docs:mental-model-detail]

  # [docs:dry-run-refresh]
  # 预览刷新，不写入
  hindsight mental-model dry-run-refresh "$BANK_ID" "$MENTAL_MODEL_ID"
  # [/docs:dry-run-refresh]

  # [docs:keep-trace]
  # 记录每次刷新（含计划）如何得出结果
  hindsight mental-model update "$BANK_ID" "$MENTAL_MODEL_ID" \
    --trigger-mode delta \
    --trigger-keep-trace true
  # [/docs:keep-trace]

  # [docs:delete-mental-model]
  # 删除心智模型
  hindsight mental-model delete "$BANK_ID" "$MENTAL_MODEL_ID" -y
  # [/docs:delete-mental-model]
fi

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}" > /dev/null

echo "mental-models.sh: 全部示例通过"
