#!/bin/bash
# Hindsight 记忆库模板 API 示例 CLI
# 运行： bash examples/api/bank-templates.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# 导出示例写入 template.json；不要放在脚本启动目录
cd "$(mktemp -d)"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:import-template]
curl -X POST "$HINDSIGHT_URL/v1/default/banks/my-bank/import" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1",
    "bank": {
      "retain_mission": "提取客户问题、解决方案和情绪。",
      "enable_observations": true,
      "observations_mission": "跟踪重复出现的客户痛点。"
    },
    "mental_models": [
      {
        "id": "sentiment-overview",
        "name": "客户情绪概览",
        "source_query": "整体情绪趋势是什么？",
        "trigger": { "refresh_after_consolidation": true }
      }
    ],
    "directives": [
      {
        "name": "认可不满情绪",
        "content": "提供解决方案前，始终先认可用户的不满情绪。",
        "priority": 10
      }
    ]
  }'
# [/docs:import-template]

# [docs:import-dry-run]
curl -X POST "$HINDSIGHT_URL/v1/default/banks/my-bank/import?dry_run=true" \
  -H "Content-Type: application/json" \
  -d '{"version": "1", "bank": {"retain_mission": "试运行测试。"}}'
# [/docs:import-dry-run]

# [docs:export-template]
curl "$HINDSIGHT_URL/v1/default/banks/my-bank/export"
# [/docs:export-template]

# [docs:export-reimport]
# 从来源记忆库导出
curl "$HINDSIGHT_URL/v1/default/banks/source-bank/export" > template.json

# 导入新记忆库
curl -X POST "$HINDSIGHT_URL/v1/default/banks/new-bank/import" \
  -H "Content-Type: application/json" \
  -d @template.json
# [/docs:export-reimport]

# [docs:get-schema]
curl "$HINDSIGHT_URL/v1/bank-template-schema"
# [/docs:get-schema]
