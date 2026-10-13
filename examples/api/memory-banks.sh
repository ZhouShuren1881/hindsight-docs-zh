#!/bin/bash
# Hindsight 记忆库 API 示例 CLI
# 运行： bash examples/api/memory-banks.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-bank]
hindsight bank create my-bank
# [/docs:create-bank]

# [docs:bank-with-disposition]
hindsight bank create architect-bank \
  --mission "你是一位高级软件架构师，跟踪系统设计、技术决策和架构模式。相比前沿技术，优先简单性。" \
  --skepticism 4 \
  --literalism 4 \
  --empathy 2
# [/docs:bank-with-disposition]

# [docs:bank-background]
hindsight bank create my-bank \
  --mission "我是专注机器学习的研究助手。"
# [/docs:bank-background]

# [docs:bank-mission]
hindsight bank create my-bank \
  --mission "你是一位高级软件架构师，跟踪系统设计、技术决策和架构模式。"
# [/docs:bank-mission]

# [docs:bank-support-agent]
hindsight bank create support-bank
hindsight bank set-config support-bank \
  --observations-mission "我是客户支持智能体，跟踪客户偏好、重复问题和解决历史。"
# [/docs:bank-support-agent]

# [docs:update-bank-config]
hindsight bank set-config my-bank \
  --retain-mission "始终包含技术决策、API 设计选择及架构取舍。忽略会议安排和社交交流。" \
  --retain-extraction-mode verbose \
  --observations-mission "观察是关于人员和项目的稳定事实。始终包含偏好、技能和重复模式，忽略一次性事件。" \
  --disposition-skepticism 4 \
  --disposition-literalism 4 \
  --disposition-empathy 2
# [/docs:update-bank-config]

# [docs:get-bank-config]
# 返回解析配置（服务默认合并库覆盖）
hindsight bank config my-bank

# 仅显示库特定覆盖
hindsight bank config my-bank --overrides-only
# [/docs:get-bank-config]

# [docs:reset-bank-config]
# 移除全部库级覆盖，恢复服务默认
hindsight bank reset-config my-bank -y
# [/docs:reset-bank-config]

# [docs:prompts-preview]
curl --fail-with-body -X POST "$HINDSIGHT_URL/v1/default/banks/my-bank/prompts/preview" \
  -H "Content-Type: application/json" \
  -d '{"operation": "retain"}'
# [/docs:prompts-preview]
echo

# -----------------------------------------------------------------------------
# 转移初始化，不在文档展示：来源库有两文档。
# chunks 模式原样存文本，无需 LLM。
# -----------------------------------------------------------------------------
API_KEY="${HINDSIGHT_API_KEY:-}"
TRANSFER_BANKS="transfer-bank transfer-bank-copy transfer-other-bank transfer-bank-clone"
for bank_id in $TRANSFER_BANKS; do
  curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${bank_id}" > /dev/null
done
hindsight bank create transfer-bank > /dev/null
hindsight bank set-config transfer-bank --retain-extraction-mode chunks > /dev/null
curl -sf -X POST "$HINDSIGHT_URL/v1/default/banks/transfer-bank/memories" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"content": "Alice 领导支付团队。", "document_id": "doc-1"},
                 {"content": "Bob 调到柏林办公室。", "document_id": "doc-2"}]}' > /dev/null
hindsight bank create transfer-other-bank > /dev/null

# 等待完成，未完成则明确报错。
wait_op() {
  for _ in $(seq 1 120); do
    status=$(curl -s "$HINDSIGHT_URL/v1/default/banks/$1/operations/$2" | jq -r .status)
    case "$status" in
      completed) return 0 ;;
      failed|cancelled) echo "operation $2 $status" >&2; return 1 ;;
    esac
    sleep 1
  done
  echo "operation $2 超时" >&2
  return 1
}

# [docs:document-export]
# 1. 提交整库导出，可加 ?document_id=… 限定
OPERATION_ID=$(curl -sf -X POST -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/document-transfer/export" | jq -r .operation_id)
# -> {"operation_id": "…", "status": "pending"}

# 2. 轮询至完成
until [ "$(curl -s -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/operations/$OPERATION_ID" | jq -r .status)" = completed ]; do
  sleep 1
done
DOWNLOAD_URL=$(curl -s -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/operations/$OPERATION_ID" | jq -r .result_metadata.download_url)
# -> {"status":"completed","result_metadata":{
#      "download_url":"/v1/default/files/download/banks/transfer-bank/exports/…/transfer.zip",
#      "storage_key":"banks/transfer-bank/exports/…/transfer.zip","byte_size":12345,"filename":"transfer-bank-documents.zip"}}

# 3. 下载归档
curl -sf -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL$DOWNLOAD_URL" -o transfer-bank-documents.zip
# [/docs:document-export]
unzip -tq transfer-bank-documents.zip > /dev/null

# [docs:document-import]
OPERATION_ID=$(curl -sf -H "Authorization: Bearer $API_KEY" -F "file=@transfer-bank-documents.zip" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/document-transfer?on_conflict=replace" | jq -r .operation_id)
# -> {"operation_id": "…", "status": "pending"}

curl --fail-with-body -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/operations/$OPERATION_ID"
# -> {"status":"completed","result_metadata":{"documents_imported":3,"facts_imported":42,"observations_imported":5,...}}
# [/docs:document-import]
echo
wait_op transfer-other-bank "$OPERATION_ID"

# [docs:transfer-export]
# 整个库，记忆和配置，不含历史
curl --fail-with-body -X POST -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/transfer/export"

# 仅记忆
curl --fail-with-body -X POST -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/transfer/export?include_bank_config=false"

# 特定文档，文档子集不含库级部分
curl --fail-with-body -X POST -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/transfer/export?document_id=doc-1&document_id=doc-2&include_bank_config=false"
# [/docs:transfer-export]
echo

# 构建导入示例用整库归档，不在文档展示：
# export, poll, download.
OPERATION_ID=$(curl -s -X POST "$HINDSIGHT_URL/v1/default/banks/transfer-bank/transfer/export" | jq -r .operation_id)
wait_op transfer-bank "$OPERATION_ID"
DOWNLOAD_URL=$(curl -s "$HINDSIGHT_URL/v1/default/banks/transfer-bank/operations/$OPERATION_ID" | jq -r .result_metadata.download_url)
curl -sf "$HINDSIGHT_URL$DOWNLOAD_URL" -o transfer-bank.zip

# [docs:transfer-import]
# 以新 ID 恢复库
curl --fail-with-body -H "Authorization: Bearer $API_KEY" -F "file=@transfer-bank.zip" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/transfer/import?target_bank_id=transfer-bank-copy"

# 将归档文档合并到现有库
curl --fail-with-body -H "Authorization: Bearer $API_KEY" -F "file=@transfer-bank.zip" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/transfer/import?mode=merge&document_conflict=replace"
# [/docs:transfer-import]
echo

# 等待两次导入，恢复记录在来源库。
for op in $(curl -s "$HINDSIGHT_URL/v1/default/banks/transfer-bank/operations?limit=50" \
    | jq -r '.operations[] | select(.status=="pending" or .status=="processing") | .id'); do
  wait_op transfer-bank "$op"
done
for op in $(curl -s "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/operations?limit=50" \
    | jq -r '.operations[] | select(.status=="pending" or .status=="processing") | .id'); do
  wait_op transfer-other-bank "$op"
done
curl -sf "$HINDSIGHT_URL/v1/default/banks/transfer-bank-copy/documents" | jq -e '.total == 2' > /dev/null

# [docs:clone-bank]
curl --fail-with-body -X POST -H "Authorization: Bearer $API_KEY" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-bank/clone?target_bank_id=transfer-bank-clone"
# -> {"operation_id": "…", "status": "pending"}
# [/docs:clone-bank]
echo
for op in $(curl -s "$HINDSIGHT_URL/v1/default/banks/transfer-bank/operations?limit=50" \
    | jq -r '.operations[] | select(.status=="pending" or .status=="processing") | .id'); do
  wait_op transfer-bank "$op"
done
curl -sf "$HINDSIGHT_URL/v1/default/banks/transfer-bank-clone/documents" | jq -e '.total == 2' > /dev/null

# [docs:transfer-import-external]
mkdir -p external/documents
echo '{"schema_version": 1, "source_bank_id": "external"}' > external/manifest.json
cat > external/documents/session-2026-09-22.json <<'JSON'
{
  "id": "session-2026-09-22",
  "original_text": "完整原始会话文本...",
  "chunks": [{"chunk_index": 0, "chunk_text": "调用方定义的来源区域..."}],
  "facts": [{
    "text": "用户偏好轻量本地语音识别模型。",
    "fact_type": "experience",
    "chunk_index": 0,
    "mentioned_at": "2026-09-22T18:34:00Z",
    "entities": ["Parakeet"]
  }]
}
JSON
(cd external && zip -qr ../import.zip manifest.json documents)

curl --fail-with-body -H "Authorization: Bearer $API_KEY" -F "file=@import.zip" \
  "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/transfer/import?mode=merge&document_conflict=replace"
# [/docs:transfer-import-external]
echo
for op in $(curl -s "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/operations?limit=50" \
    | jq -r '.operations[] | select(.status=="pending" or .status=="processing") | .id'); do
  wait_op transfer-other-bank "$op"
done
curl -sf "$HINDSIGHT_URL/v1/default/banks/transfer-other-bank/documents/session-2026-09-22" \
  | jq -e '.memory_unit_count == 1' > /dev/null
rm -rf external import.zip

rm -f transfer-bank.zip transfer-bank-documents.zip

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
for bank_id in my-bank architect-bank support-bank $TRANSFER_BANKS; do
  curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${bank_id}" > /dev/null
done

echo "memory-banks.sh: 全部示例通过"
