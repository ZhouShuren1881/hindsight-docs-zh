#!/bin/bash
# Hindsight 知识页面 API 示例 CLI
# 运行： bash examples/api/knowledge-pages.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK_ID="knowledge-pages-demo-bank-cli"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
hindsight bank create "$BANK_ID" --name "知识页面演示"
hindsight memory retain "$BANK_ID" "API 通过滚动更新部署到 Kubernetes"
hindsight memory retain "$BANK_ID" "CI 通过后从 main 分支部署"
hindsight memory retain "$BANK_ID" "部署失败时重新部署上一个标签以回滚"
sleep 2

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-folder]
# 创建文件夹，省略 --parent-id 则在根目录
hindsight knowledge-base create-folder "$BANK_ID" "运维"
# [/docs:create-folder]

FOLDER_ID=$(hindsight knowledge-base tree "$BANK_ID" -o json | jq -r '.roots[0].id')

# [docs:create-page]
# 创建页面，后台生成内容
hindsight knowledge-base create-page "$BANK_ID" \
  "部署 API" \
  "API 如何部署？" \
  --parent-id "$FOLDER_ID" \
  --tags ops,type:runbook
# [/docs:create-page]

# 等待首次构建
sleep 20

# [docs:get-tree]
# 显示文件夹/页面树，不含正文
hindsight knowledge-base tree "$BANK_ID"
# [/docs:get-tree]

PAGE_ID=$(hindsight knowledge-base tree "$BANK_ID" -o json | jq -r '.roots[0].children[0].id')

# [docs:get-page]
# 以 Markdown 文档读取页面
hindsight knowledge-base get-page "$BANK_ID" "$PAGE_ID"
# [/docs:get-page]

# [docs:search-pages]
# 整页全文和向量混合搜索
hindsight knowledge-base search "$BANK_ID" "如何部署" --limit 5
# [/docs:search-pages]

# [docs:filter-by-tags]
# 按标签限定树和搜索（召回的 tags / tags_match / tag_groups）
hindsight knowledge-base tree "$BANK_ID" --tags type:runbook --tags-match any_strict
hindsight knowledge-base search "$BANK_ID" "如何部署" --tags ops --tags-match all_strict

# 复合筛选使用 --tag-groups，此处排除草稿运行手册
hindsight knowledge-base search "$BANK_ID" "如何部署" \
    --tag-groups '[{"and":[{"tags":["type:runbook"]},{"not":{"tags":["draft"]}}]}]'
# [/docs:filter-by-tags]

# [docs:update-node]
# 重命名、移动节点或更新页面选项。
# 修改 --source-query 按新问题重建页面。
hindsight knowledge-base update "$BANK_ID" "$PAGE_ID" \
  --name "部署 API (v2)" \
  --tags ops,type:runbook,reviewed
# [/docs:update-node]

# [docs:export]
# 导出为可移植 Markdown 包
hindsight knowledge-base export "$BANK_ID"
# [/docs:export]

# [docs:delete-node]
# 删除文件夹或页面，删除文件夹会移除整棵子树
hindsight knowledge-base delete "$BANK_ID" "$FOLDER_ID" -y
# [/docs:delete-node]

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}" > /dev/null

echo "knowledge-pages.sh: 全部示例通过"
