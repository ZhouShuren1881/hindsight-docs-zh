#!/bin/bash
# Hindsight 配置示例（通过 HTTP 配置记忆库）
# 运行： bash examples/api/configuration.sh

set -e

HINDSIGHT_API_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:plain-retrieval-bank]
curl -X PUT "$HINDSIGHT_API_URL/v1/default/banks/plain-retrieval-bank" \
  -H "Authorization: Bearer $HINDSIGHT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "retain_extraction_mode": "chunks",
    "enable_observations": false,
    "enable_temporal_retrieval": false,
    "enable_graph_retrieval": false,
    "enable_reranking": false
  }'
# [/docs:plain-retrieval-bank]
echo

curl -sf "$HINDSIGHT_API_URL/v1/default/banks/plain-retrieval-bank/config" \
  | jq -e '.overrides.retain_extraction_mode == "chunks" and .overrides.enable_reranking == false' > /dev/null

# [docs:mcp-tools-per-bank]
# 将特定记忆库限制为只读 MCP 访问
curl -X PATCH http://localhost:8888/v1/default/banks/config-demo-bank/config \
  -H "Content-Type: application/json" \
  -d '{"updates": {"mcp_enabled_tools": ["recall"]}}'
# [/docs:mcp-tools-per-bank]
echo

curl -sf "$HINDSIGHT_API_URL/v1/default/banks/config-demo-bank/config" \
  | jq -e '.overrides.mcp_enabled_tools == ["recall"]' > /dev/null

# [docs:bank-config-examples]
# 更新记忆库存储设置
curl -X PATCH http://localhost:8888/v1/default/banks/config-demo-bank/config \
  -H "Content-Type: application/json" \
  -d '{
    "updates": {
      "retain_chunk_size": 4000,
      "retain_extraction_mode": "custom",
      "retain_custom_instructions": "关注技术细节和具体实现"
    }
  }'

# 注意：retain_extraction_mode 必须为 "custom" 才能使用 retain_custom_instructions

# 查看解析后的配置（遵循权限）
curl http://localhost:8888/v1/default/banks/config-demo-bank/config

# 重置为默认值
curl -X DELETE http://localhost:8888/v1/default/banks/config-demo-bank/config
# [/docs:bank-config-examples]
echo

curl -sf "$HINDSIGHT_API_URL/v1/default/banks/config-demo-bank/config" \
  | jq -e '.overrides == {}' > /dev/null

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
for bank_id in plain-retrieval-bank config-demo-bank; do
  curl -s -X DELETE "${HINDSIGHT_API_URL}/v1/default/banks/${bank_id}" > /dev/null
done

echo "configuration.sh: 全部示例通过"
