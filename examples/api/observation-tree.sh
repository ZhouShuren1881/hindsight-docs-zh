#!/bin/bash
# Hindsight CLI 观测树示例
# 运行：bash examples/api/observation-tree.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="observation-tree-demo-bank-cli"
OUT_DIR=$(mktemp -d)

# =============================================================================
# 准备工作（文档未展示）
# =============================================================================
hindsight bank create "$BANK_ID" --name "Observation Tree Demo"
# 添加条目级标签，让下方按范围查询的调用有结果。
# CLI 的 retain 仅支持已弃用的文档标签。
for item in \
  '{"content": "The API runs on Kubernetes behind an nginx ingress.", "tags": ["team:platform"]}' \
  '{"content": "Redis keys expire after an hour.", "tags": ["team:platform"]}' \
  '{"content": "The GPU nodes serve Gemma with vLLM.", "tags": ["team:ml"]}'; do
  curl -s -X POST "$HINDSIGHT_URL/v1/default/banks/$BANK_ID/memories" \
    -H "Content-Type: application/json" -d "{\"items\": [$item]}" > /dev/null
done
sleep 5

# =============================================================================
# 文档示例
# =============================================================================

# [docs:get-tree]
# 整个记忆库的目录、主题文件和各目录的 index.md（使用 -o json 获取完整观测树）。
hindsight memory observation-tree "$BANK_ID"

# 仅查看一个范围，标签筛选方式与 Recall 相同。
hindsight memory observation-tree "$BANK_ID" --tags team:platform --tags-match any_strict
# [/docs:get-tree]

# [docs:write-bundle]
# 将文件包写入磁盘，按每个文件的路径保存相应的 Markdown 内容。
hindsight memory observation-tree "$BANK_ID" --out "$OUT_DIR"
# [/docs:write-bundle]
test -f "$OUT_DIR/index.md"

# =============================================================================
# 清理（文档未展示）
# =============================================================================
curl -s -X DELETE "$HINDSIGHT_URL/v1/default/banks/$BANK_ID" > /dev/null

echo "observation-tree.sh: All examples passed"
