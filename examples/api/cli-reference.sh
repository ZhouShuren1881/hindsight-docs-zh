#!/bin/bash
# Hindsight CLI 参考示例 (docs/sdks/cli.mdx)
# 运行： bash examples/api/cli-reference.sh

set -e

# 确认提示读取 stdin，EOF 表示否，因此无标志
# 下面的变体输出原错误消息 "Operation cancelled"，不会阻塞。
exec </dev/null

export HINDSIGHT_API_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
BANK="my-cli-bank"
DEMO_BANK="cli-demo"

# configure/profile 示例写 ~/.hindsight，让 HOME 指向临时目录
# 避免修改实际用户配置。
REAL_HOME="$HOME"
export HOME="$(mktemp -d)"
WORK_DIR="$(mktemp -d)"
cleanup() {
  hindsight bank delete "$BANK" -y >/dev/null 2>&1 || true
  hindsight bank delete "$DEMO_BANK" -y >/dev/null 2>&1 || true
  rm -rf "$HOME" "$WORK_DIR"
  export HOME="$REAL_HOME"
}
trap cleanup EXIT

# 从干净记忆库开始
hindsight bank delete "$BANK" -y >/dev/null 2>&1 || true
hindsight bank delete "$DEMO_BANK" -y >/dev/null 2>&1 || true

# =============================================================================
# Configuration
# =============================================================================

# [docs:cli-configure]
# 直接设置
hindsight configure --api-url http://localhost:8888

# 使用 API 密钥认证
hindsight configure --api-url http://localhost:8888 --api-key your-api-key
# [/docs:cli-configure]

# [docs:cli-profiles]
# 创建或覆盖档案
hindsight profile create prod \
  --api-url https://api.hindsight.vectorize.io \
  --api-key hsk_...

# 列出并查看档案
hindsight profile list
hindsight profile show prod

# 单命令使用档案
hindsight -p prod bank list

# 或让当前 shell 持续使用
export HINDSIGHT_PROFILE=prod
hindsight bank list

# 移除档案
hindsight profile delete prod -y
# [/docs:cli-profiles]
unset HINDSIGHT_PROFILE

# =============================================================================
# 核心命令
# =============================================================================

# [docs:cli-retain]
hindsight memory retain my-cli-bank "Alice 在 Google 担任软件工程师"

# 带上下文
hindsight memory retain my-cli-bank "Bob 喜欢徒步" --context "兴趣讨论"

# 排队后台处理
hindsight memory retain my-cli-bank "会议记录" --async

# 带事件日期，ISO 8601 日期时间或日期
hindsight memory retain my-cli-bank "项目已发布" --timestamp 2024-01-15

# 不设时间戳，覆盖默认当前时间
hindsight memory retain my-cli-bank "背景事实" --timestamp unset
# [/docs:cli-retain]

# retain-files 初始化：示例文件和 conversations 策略
cd "$WORK_DIR"
mkdir -p documents/sub data
echo "Carol 领导平台团队。" > notes.txt
echo "API 通过 Helm 部署。" > documents/deploy.md
echo "预发布环境在单节点运行。" > documents/sub/staging.md
echo "每周同步：同意周五发布。" > meeting-notes.txt
echo "Dave 维护计费服务。" > data/billing.txt
curl -sf -X PATCH "$HINDSIGHT_API_URL/v1/default/banks/$BANK/config" \
  -H "Content-Type: application/json" \
  -d '{"updates": {"retain_strategies": {"conversations": {"retain_extraction_mode": "concise"}}}}' >/dev/null

# [docs:cli-retain-files]
# 单文件
hindsight memory retain-files my-cli-bank notes.txt

# 目录，默认递归
hindsight memory retain-files my-cli-bank ./documents/

# 带上下文
hindsight memory retain-files my-cli-bank meeting-notes.txt --context "团队会议"

# 使用命名策略，见库配置 retain_strategies
hindsight memory retain-files my-cli-bank ./documents/ --strategy conversations

# 后台处理
hindsight memory retain-files my-cli-bank ./data/ --async
# [/docs:cli-retain-files]

# [docs:cli-recall]
hindsight memory recall my-cli-bank "Alice 做什么工作？"

# 带选项
hindsight memory recall my-cli-bank "徒步建议" \
  --budget high \
  --max-tokens 8192

# 按事实类型筛选
hindsight memory recall my-cli-bank "查询" --fact-type world,observation

# 按标签筛选
hindsight memory recall my-cli-bank "查询" --tags work,project \
  --tags-match all

# 固定结果到特定时间
hindsight memory recall my-cli-bank "查询" --query-timestamp "2026-01-15T00:00:00Z"

# 显示跟踪信息
hindsight memory recall my-cli-bank "查询" --trace
# [/docs:cli-recall]

# [docs:cli-reflect]
hindsight memory reflect my-cli-bank "你了解 Alice 什么？"

# 带额外上下文
hindsight memory reflect my-cli-bank "我应该学习 Python 吗？" --context "职业建议"

# 复杂问题使用更高预算
hindsight memory reflect my-cli-bank "总结我的一周" --budget high

# 按事实类型筛选
hindsight memory reflect my-cli-bank "查询" \
  --fact-types world,experience \
  --exclude-mental-models
# [/docs:cli-reflect]

# 供历史/清空观察用的实际记忆单元 ID
MEMORY_ID=$(hindsight memory list "$BANK" -o json | jq -r '.items[0].id')

# [docs:cli-memory-history]
hindsight memory history my-cli-bank "$MEMORY_ID"
# [/docs:cli-memory-history]

# [docs:cli-memory-clear-observations]
hindsight memory clear-observations my-cli-bank "$MEMORY_ID"

# 跳过确认提示
hindsight memory clear-observations my-cli-bank "$MEMORY_ID" -y
# [/docs:cli-memory-clear-observations]

# =============================================================================
# 记忆库管理
# =============================================================================

# [docs:cli-bank-list]
hindsight bank list
# [/docs:cli-bank-list]

# [docs:cli-bank-disposition]
hindsight bank disposition my-cli-bank
# [/docs:cli-bank-disposition]

# [docs:cli-bank-set-disposition]
hindsight bank set-disposition my-cli-bank --skepticism 3 --literalism 4 --empathy 5
# [/docs:cli-bank-set-disposition]

# [docs:cli-bank-stats]
hindsight bank stats my-cli-bank
# [/docs:cli-bank-stats]

# [docs:cli-bank-name]
hindsight bank name my-cli-bank "我的助手"
# [/docs:cli-bank-name]

# [docs:cli-bank-mission]
hindsight bank mission my-cli-bank "我是对技术感兴趣、乐于助人的 AI 助手"
# [/docs:cli-bank-mission]

# [docs:cli-bank-clear-observations]
hindsight bank clear-observations my-cli-bank

# 跳过确认提示
hindsight bank clear-observations my-cli-bank -y
# [/docs:cli-bank-clear-observations]

# [docs:cli-bank-consolidation-recover]
hindsight bank consolidation-recover my-cli-bank
# [/docs:cli-bank-consolidation-recover]

# =============================================================================
# 文档管理
# =============================================================================

hindsight memory retain "$BANK" "Carol 是项目经理" --doc-id meeting-2024-01-15 >/dev/null
DOCUMENT_ID="meeting-2024-01-15"

# [docs:cli-documents]
# 列出文档
hindsight document list my-cli-bank

# 获取文档细节
hindsight document get my-cli-bank "$DOCUMENT_ID"

# 替换文档标签
hindsight document update my-cli-bank "$DOCUMENT_ID" --tags project-x,meetings

# 删除文档和记忆
hindsight document delete my-cli-bank "$DOCUMENT_ID"
# [/docs:cli-documents]

# =============================================================================
# 实体管理
# =============================================================================

ENTITY_ID=$(hindsight entity list "$BANK" -o json | jq -r '.items[0].id')

# [docs:cli-entities]
# 列出实体
hindsight entity list my-cli-bank

# 获取实体细节
hindsight entity get my-cli-bank "$ENTITY_ID"
# [/docs:cli-entities]

# =============================================================================
# 操作管理
# =============================================================================

# 待处理异步操作，查看取消后重试
OPERATION_ID=$(hindsight memory retain "$BANK" "Erin 加入了团队" --async -o json | jq -r '.operation_id')

# [docs:cli-operations]
# 列出操作
hindsight operation list my-cli-bank

# 获取操作状态
hindsight operation get my-cli-bank "$OPERATION_ID"

# 取消待处理操作
hindsight operation cancel my-cli-bank "$OPERATION_ID"

# 重试失败操作
hindsight operation retry my-cli-bank "$OPERATION_ID"
# [/docs:cli-operations]

# =============================================================================
# Webhook 管理
# =============================================================================

WEBHOOK_ID=$(hindsight webhook create "$BANK" https://example.com/setup-hook -o json | jq -r '.id')

# [docs:cli-webhooks]
# 列出 Webhook
hindsight webhook list my-cli-bank

# 创建 Webhook，默认 consolidation.completed 事件
hindsight webhook create my-cli-bank https://example.com/hook

# 指定事件和签名密钥创建
hindsight webhook create my-cli-bank https://example.com/hook \
  --event-types retain.completed,consolidation.completed \
  --secret my-hmac-secret

# 更新 Webhook
hindsight webhook update my-cli-bank "$WEBHOOK_ID" --url https://new-url.com

# 查看投递历史
hindsight webhook deliveries my-cli-bank "$WEBHOOK_ID"

# 删除 Webhook
hindsight webhook delete my-cli-bank "$WEBHOOK_ID" -y
# [/docs:cli-webhooks]

# =============================================================================
# 知识库
# =============================================================================

# [docs:cli-kb-tree]
# 显示文件夹/页面树，落后页面标为 stale
hindsight knowledge-base tree my-cli-bank
# [/docs:cli-kb-tree]

# [docs:cli-kb-create-folder]
# 创建文件夹，可嵌套
hindsight knowledge-base create-folder my-cli-bank "运维"
# [/docs:cli-kb-create-folder]
FOLDER_ID=$(hindsight knowledge-base tree "$BANK" -o json | jq -r '[.. | objects | select(.kind? == "folder" and .name? == "运维")][0].id')

# [docs:cli-kb-create-subfolder]
hindsight knowledge-base create-folder my-cli-bank "运行手册" --parent-id "$FOLDER_ID"
# [/docs:cli-kb-create-subfolder]

# [docs:cli-kb-create-page]
# 创建页面，后台生成
hindsight knowledge-base create-page my-cli-bank \
  "部署 API" \
  "API 如何部署？" \
  --parent-id "$FOLDER_ID" \
  --tags ops,type:runbook

# 使用原始事实构建，而非默认仅观察
hindsight knowledge-base create-page my-cli-bank "近期事故" \
  "近期发生哪些事故？" \
  --fact-types experience,world --mode full
# [/docs:cli-kb-create-page]
PAGE_ID=$(hindsight knowledge-base tree "$BANK" -o json | jq -r '[.. | objects | select(.kind? == "page" and .name? == "近期事故")][0].id')
NODE_ID="$FOLDER_ID"

# [docs:cli-kb-manage]
# 以 Markdown 读取页面
hindsight knowledge-base get-page my-cli-bank "$PAGE_ID"

# 整页全文和向量混合搜索
hindsight knowledge-base search my-cli-bank "如何部署" --limit 5

# 重命名、移动或重新配置节点
hindsight knowledge-base update my-cli-bank "$NODE_ID" --name "新名称"
hindsight knowledge-base update my-cli-bank "$PAGE_ID" --source-query "新问题？"

# 导出完整知识库为 Markdown 包
hindsight knowledge-base export my-cli-bank

# 删除文件夹或页面及其子项
hindsight knowledge-base delete my-cli-bank "$NODE_ID" -y
# [/docs:cli-kb-manage]

# =============================================================================
# 审计日志
# =============================================================================

# [docs:cli-audit]
# 列出审计条目
hindsight audit list my-cli-bank

# 按操作和传输筛选
hindsight audit list my-cli-bank --action recall --transport mcp

# 按日期范围筛选
hindsight audit list my-cli-bank \
  --start-date "2026-04-01T00:00:00Z" \
  --end-date "2026-04-10T00:00:00Z"

# Pagination
hindsight audit list my-cli-bank --limit 50 --offset 100
# [/docs:cli-audit]

# =============================================================================
# 输出格式
# =============================================================================

# [docs:cli-output]
# Pretty (default)
hindsight memory recall my-cli-bank "查询"

# JSON
hindsight memory recall my-cli-bank "查询" -o json

# YAML
hindsight memory recall my-cli-bank "查询" -o yaml
# [/docs:cli-output]

# =============================================================================
# 工作流示例
# =============================================================================

# [docs:cli-workflow]
# 配置 API URL
hindsight configure --api-url http://localhost:8888

# 存储一些记忆
hindsight memory retain cli-demo "Alice 在 Google 工作"
hindsight memory retain cli-demo "Bob 是数据科学家"
hindsight memory retain cli-demo "Alice 和 Bob 是同事"

# 搜索记忆
hindsight memory recall cli-demo "谁与 Alice 共事？"

# 生成回复
hindsight memory reflect cli-demo "你了解团队什么？"

# 查看记忆库倾向
hindsight bank disposition cli-demo
# [/docs:cli-workflow]

echo "cli-reference.sh: 全部示例通过"
