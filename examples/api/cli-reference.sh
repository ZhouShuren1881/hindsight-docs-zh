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

# 使用 API 密钥进行身份认证
hindsight configure --api-url http://localhost:8888 --api-key your-api-key
# [/docs:cli-configure]

# [docs:cli-profiles]
# 创建或覆盖命名配置文件
hindsight profile create prod \
  --api-url https://api.hindsight.vectorize.io \
  --api-key hsk_...

# 列出并查看命名配置文件
hindsight profile list
hindsight profile show prod

# 为单次命令调用使用命名配置文件
hindsight -p prod bank list

# 或让当前 shell 持续使用该配置文件
export HINDSIGHT_PROFILE=prod
hindsight bank list

# 删除命名配置文件
hindsight profile delete prod -y
# [/docs:cli-profiles]
unset HINDSIGHT_PROFILE

# =============================================================================
# 核心命令
# =============================================================================

# [docs:cli-retain]
hindsight memory retain my-cli-bank "Alice works at Google as a software engineer"

# 附带上下文
hindsight memory retain my-cli-bank "Bob loves hiking" --context "hobby discussion"

# 加入队列，交由后台处理
hindsight memory retain my-cli-bank "Meeting notes" --async

# 指定事件日期（ISO 8601 日期时间或日期）
hindsight memory retain my-cli-bank "Project launched" --timestamp 2024-01-15

# 存入时不设置时间戳（覆盖默认的“当前时间”）
hindsight memory retain my-cli-bank "Background fact" --timestamp unset
# [/docs:cli-retain]

# retain-files 初始化：示例文件和 conversations 策略
cd "$WORK_DIR"
mkdir -p documents/sub data
echo "Carol leads the platform team." > notes.txt
echo "The API is deployed with Helm." > documents/deploy.md
echo "Staging runs on a single node." > documents/sub/staging.md
echo "Weekly sync: we agreed to ship on Friday." > meeting-notes.txt
echo "Dave maintains the billing service." > data/billing.txt
curl -sf -X PATCH "$HINDSIGHT_API_URL/v1/default/banks/$BANK/config" \
  -H "Content-Type: application/json" \
  -d '{"updates": {"retain_strategies": {"conversations": {"retain_extraction_mode": "concise"}}}}' >/dev/null

# [docs:cli-retain-files]
# 单个文件
hindsight memory retain-files my-cli-bank notes.txt

# 目录（默认递归处理）
hindsight memory retain-files my-cli-bank ./documents/

# 附带上下文
hindsight memory retain-files my-cli-bank meeting-notes.txt --context "team meeting"

# 使用命名存入策略（参见记忆库配置中的 retain_strategies）
hindsight memory retain-files my-cli-bank ./documents/ --strategy conversations

# 后台处理
hindsight memory retain-files my-cli-bank ./data/ --async
# [/docs:cli-retain-files]

# [docs:cli-recall]
hindsight memory recall my-cli-bank "What does Alice do?"

# 指定选项
hindsight memory recall my-cli-bank "hiking recommendations" \
  --budget high \
  --max-tokens 8192

# 按事实类型筛选
hindsight memory recall my-cli-bank "query" --fact-type world,observation

# 按标签筛选
hindsight memory recall my-cli-bank "query" --tags work,project \
  --tags-match all

# 将结果固定到特定时间
hindsight memory recall my-cli-bank "query" --query-timestamp "2026-01-15T00:00:00Z"

# 显示执行追踪信息
hindsight memory recall my-cli-bank "query" --trace
# [/docs:cli-recall]

# [docs:cli-reflect]
hindsight memory reflect my-cli-bank "What do you know about Alice?"

# 附带额外上下文
hindsight memory reflect my-cli-bank "Should I learn Python?" --context "career advice"

# 为复杂问题设置更高的预算
hindsight memory reflect my-cli-bank "Summarize my week" --budget high

# 按事实类型筛选
hindsight memory reflect my-cli-bank "query" \
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
hindsight bank name my-cli-bank "My Assistant"
# [/docs:cli-bank-name]

# [docs:cli-bank-mission]
hindsight bank mission my-cli-bank "I am a helpful AI assistant interested in technology"
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

hindsight memory retain "$BANK" "Carol is a project manager" --doc-id meeting-2024-01-15 >/dev/null
DOCUMENT_ID="meeting-2024-01-15"

# [docs:cli-documents]
# 列出文档
hindsight document list my-cli-bank

# 获取文档详情
hindsight document get my-cli-bank "$DOCUMENT_ID"

# 替换文档的标签
hindsight document update my-cli-bank "$DOCUMENT_ID" --tags project-x,meetings

# 删除文档及其记忆
hindsight document delete my-cli-bank "$DOCUMENT_ID"
# [/docs:cli-documents]

# =============================================================================
# 实体管理
# =============================================================================

ENTITY_ID=$(hindsight entity list "$BANK" -o json | jq -r '.items[0].id')

# [docs:cli-entities]
# 列出实体
hindsight entity list my-cli-bank

# 获取实体详情
hindsight entity get my-cli-bank "$ENTITY_ID"
# [/docs:cli-entities]

# =============================================================================
# 操作管理
# =============================================================================

# 待处理异步操作，查看取消后重试
OPERATION_ID=$(hindsight memory retain "$BANK" "Erin joined the team" --async -o json | jq -r '.operation_id')

# [docs:cli-operations]
# 列出操作
hindsight operation list my-cli-bank

# 获取操作状态
hindsight operation get my-cli-bank "$OPERATION_ID"

# 取消等待处理的操作
hindsight operation cancel my-cli-bank "$OPERATION_ID"

# 重试已失败的操作
hindsight operation retry my-cli-bank "$OPERATION_ID"
# [/docs:cli-operations]

# =============================================================================
# Webhook 管理
# =============================================================================

WEBHOOK_ID=$(hindsight webhook create "$BANK" https://example.com/setup-hook -o json | jq -r '.id')

# [docs:cli-webhooks]
# 列出 Webhook
hindsight webhook list my-cli-bank

# 创建 Webhook（默认订阅 consolidation.completed 事件）
hindsight webhook create my-cli-bank https://example.com/hook

# 创建时指定事件和签名密钥
hindsight webhook create my-cli-bank https://example.com/hook \
  --event-types retain.completed,consolidation.completed \
  --secret my-hmac-secret

# 更新 Webhook
hindsight webhook update my-cli-bank "$WEBHOOK_ID" --url https://new-url.com

# 查看投递历史记录
hindsight webhook deliveries my-cli-bank "$WEBHOOK_ID"

# 删除 Webhook
hindsight webhook delete my-cli-bank "$WEBHOOK_ID" -y
# [/docs:cli-webhooks]

# =============================================================================
# 知识库
# =============================================================================

# [docs:cli-kb-tree]
# 显示文件夹/页面树（内容待更新的页面标记为 stale）
hindsight knowledge-base tree my-cli-bank
# [/docs:cli-kb-tree]

# [docs:cli-kb-create-folder]
# 创建文件夹，可选择嵌套在另一个文件夹下
hindsight knowledge-base create-folder my-cli-bank "Operations"
# [/docs:cli-kb-create-folder]
FOLDER_ID=$(hindsight knowledge-base tree "$BANK" -o json | jq -r '[.. | objects | select(.kind? == "folder" and .name? == "Operations")][0].id')

# [docs:cli-kb-create-subfolder]
hindsight knowledge-base create-folder my-cli-bank "Runbooks" --parent-id "$FOLDER_ID"
# [/docs:cli-kb-create-subfolder]

# [docs:cli-kb-create-page]
# 创建知识页，内容在后台生成
hindsight knowledge-base create-page my-cli-bank \
  "Deploying the API" \
  "How is the API deployed?" \
  --parent-id "$FOLDER_ID" \
  --tags ops,type:runbook

# 从原始事实构建知识页，替代默认仅使用观测的方式
hindsight knowledge-base create-page my-cli-bank "Recent Incidents" \
  "What incidents happened recently?" \
  --fact-types experience,world --mode full
# [/docs:cli-kb-create-page]
PAGE_ID=$(hindsight knowledge-base tree "$BANK" -o json | jq -r '[.. | objects | select(.kind? == "page" and .name? == "Recent Incidents")][0].id')
NODE_ID="$FOLDER_ID"

# [docs:cli-kb-manage]
# 以 Markdown 文档形式读取知识页
hindsight knowledge-base get-page my-cli-bank "$PAGE_ID"

# 以整页为单位进行混合检索（全文检索 + 向量检索）
hindsight knowledge-base search my-cli-bank "how do we deploy" --limit 5

# 重命名、移动或重新配置节点
hindsight knowledge-base update my-cli-bank "$NODE_ID" --name "New name"
hindsight knowledge-base update my-cli-bank "$PAGE_ID" --source-query "New question?"

# 将整个知识库导出为 Markdown 文件包
hindsight knowledge-base export my-cli-bank

# 删除文件夹或知识页及其下所有内容
hindsight knowledge-base delete my-cli-bank "$NODE_ID" -y
# [/docs:cli-kb-manage]

# =============================================================================
# 审计日志
# =============================================================================

# [docs:cli-audit]
# 列出审计条目
hindsight audit list my-cli-bank

# 按操作和传输方式筛选
hindsight audit list my-cli-bank --action recall --transport mcp

# 按日期范围筛选
hindsight audit list my-cli-bank \
  --start-date "2026-04-01T00:00:00Z" \
  --end-date "2026-04-10T00:00:00Z"

# 分页
hindsight audit list my-cli-bank --limit 50 --offset 100
# [/docs:cli-audit]

# =============================================================================
# 输出格式
# =============================================================================

# [docs:cli-output]
# 易读格式（默认）
hindsight memory recall my-cli-bank "query"

# JSON
hindsight memory recall my-cli-bank "query" -o json

# YAML
hindsight memory recall my-cli-bank "query" -o yaml
# [/docs:cli-output]

# =============================================================================
# 工作流示例
# =============================================================================

# [docs:cli-workflow]
# 配置 API URL
hindsight configure --api-url http://localhost:8888

# 存入一些记忆
hindsight memory retain cli-demo "Alice works at Google"
hindsight memory retain cli-demo "Bob is a data scientist"
hindsight memory retain cli-demo "Alice and Bob are colleagues"

# 搜索记忆
hindsight memory recall cli-demo "Who works with Alice?"

# 生成响应
hindsight memory reflect cli-demo "What do you know about the team?"

# 查看记忆库的性格倾向
hindsight bank disposition cli-demo
# [/docs:cli-workflow]

echo "cli-reference.sh: All examples passed"
