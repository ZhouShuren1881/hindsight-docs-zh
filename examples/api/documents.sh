#!/bin/bash
# Hindsight 文档 API 示例 CLI
# 运行： bash examples/api/documents.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="documents-sh-demo-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
WORKDIR=$(mktemp -d)
cd "$WORKDIR"
mkdir docs
echo "Alice 向整个团队介绍第四季度路线图。" > docs/meeting-notes.txt

# =============================================================================
# 文档示例
# =============================================================================

# [docs:document-retain]
# 带文档 ID 存储
hindsight memory retain "$BANK_ID" "会议记录内容..." --doc-id notes-2024-03-15

# 从文件批量存储
hindsight memory retain-files "$BANK_ID" docs/
# [/docs:document-retain]

# [docs:document-update]
# Original
hindsight memory retain "$BANK_ID" "项目截止日期：3 月 31 日" --doc-id project-plan

# Update
hindsight memory retain "$BANK_ID" "项目截止日期：4 月 15 日（已延期）" --doc-id project-plan
# [/docs:document-update]

# [docs:document-get]
hindsight document get "$BANK_ID" notes-2024-03-15
# [/docs:document-get]

# [docs:document-update-tags]
# 以新值替换标签（逗号分隔）
hindsight document update "$BANK_ID" notes-2024-03-15 --tags team-a,team-b

# 移除全部标签，使文档在所有范围可见
hindsight document update "$BANK_ID" notes-2024-03-15 --tags ""
# [/docs:document-update-tags]

# 空值应清空集合，而非存入一个空字符串标签。
TAGS=$(curl -sf "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}/documents/notes-2024-03-15" | jq -c '.tags')
[ "$TAGS" = "[]" ] || { echo "预期无标签，实际为 $TAGS"; exit 1; }

# [docs:document-list]
# 列出全部文档
hindsight document list "$BANK_ID"

# 按 ID 子串筛选
hindsight document list "$BANK_ID" --query notes
# [/docs:document-list]

# [docs:document-delete]
hindsight document delete "$BANK_ID" notes-2024-03-15
# [/docs:document-delete]

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
rm -rf "$WORKDIR"
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}" > /dev/null

echo "documents.sh: 全部示例通过"
