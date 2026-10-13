#!/bin/bash
# Hindsight CLI 存储示例
# 运行：bash examples/api/retain.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLE_FILE="$SCRIPT_DIR/sample.pdf"

# =============================================================================
# 准备，文档中不展示
# =============================================================================
# 在临时目录创建文件上传示例的占位文件，
# 避免在启动目录留下文件
cd "$(mktemp -d)"
echo "%PDF-1.4 示例文档" > report.pdf
mkdir -p documents
cp report.pdf documents/report.pdf

# =============================================================================
# 文档示例
# =============================================================================

# [docs:retain-basic]
hindsight memory retain my-bank "Alice 在 Google 担任软件工程师"
# [/docs:retain-basic]


# [docs:retain-conversation]
# 将完整对话作为一个文档存储。
CONVERSATION="Alice (2024-03-15T09:00:00Z): Bob，你上周最后去看医生了吗？
Bob (2024-03-15T09:01:00Z): 去了，发现有轻度花生过敏。
Alice (2024-03-15T09:02:00Z): 哎呀，你还好吗？
Bob (2024-03-15T09:03:00Z): 还好，不严重，只需随身带抗组胺药。
Alice (2024-03-15T09:04:00Z): 知道了，团队午餐会避开花生。"

hindsight memory retain my-bank "$CONVERSATION" \
    --context "团队聊天" \
    --doc-id "chat-2024-03-15-alice-bob"
# [/docs:retain-conversation]


# [docs:retain-with-context]
hindsight memory retain my-bank "Alice 晋升了" \
    --context "职业变化"
# [/docs:retain-with-context]


# [docs:retain-batch]
# 逐次调用批量摄取，CLI 每次处理一个条目
hindsight memory retain my-bank "Alice 在 Google 工作" \
    --context "career" --doc-id "conversation_001_msg_1"
hindsight memory retain my-bank "Bob 在 Meta 担任数据科学家" \
    --context "career" --doc-id "conversation_001_msg_2"
hindsight memory retain my-bank "Alice 和 Bob 是朋友" \
    --context "relationship" --doc-id "conversation_001_msg_3"
# [/docs:retain-batch]


# [docs:retain-async]
hindsight memory retain my-bank "会议记录" --async
# [/docs:retain-async]


# [docs:retain-files]
# 上传单文件，支持文档、表格、图片、音频等
hindsight memory retain-files my-bank "$SAMPLE_FILE"

# 上传目录文件
hindsight memory retain-files my-bank "$SCRIPT_DIR/"

# 文件入队后台处理，立即返回
hindsight memory retain-files my-bank "$SCRIPT_DIR/" --async
# [/docs:retain-files]


# [docs:retain-files-curl]
# 通过 HTTP API，使用 multipart/form-data
curl -X POST "${HINDSIGHT_URL}/v1/default/banks/my-bank/files/retain" \
    -F "files=@${SAMPLE_FILE};type=application/octet-stream" \
    -F "request={\"files_metadata\": [{\"context\": \"季度报告\"}]}"
# [/docs:retain-files-curl]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/my-bank" > /dev/null

echo "retain.sh: 所有示例通过"
