#!/usr/bin/env python3
"""
Hindsight 存储 API 示例。
运行：python examples/api/retain.py
"""
import os
import requests
from pathlib import Path

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
EXAMPLES_DIR = Path(__file__).parent

# =============================================================================
# 准备，文档中不展示
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:retain-basic]
client.retain(
    bank_id="my-bank",
    content="Alice 在 Google 担任软件工程师"
)
# [/docs:retain-basic]


# [docs:retain-conversation]
# 将完整对话作为一个文档存储。
# 将每条消息写为“姓名（时间戳）：文本”，使 LLM 可将
# 事实归属于正确的人，并解析对话中的相对时间。
conversation = "\n".join([
    "Alice (2024-03-15T09:00:00Z): Bob，你上周最后去看医生了吗？",
    "Bob (2024-03-15T09:01:00Z): 去了，发现有轻度花生过敏。",
    "Alice (2024-03-15T09:02:00Z): 哎呀，你还好吗？",
    "Bob (2024-03-15T09:03:00Z): 还好，不严重，只需随身带抗组胺药。",
    "Alice (2024-03-15T09:04:00Z): 知道了，团队午餐会避开花生。",
])

client.retain(
    bank_id="my-bank",
    content=conversation,
    context="团队聊天",
    timestamp="2024-03-15T09:04:00Z",
    document_id="chat-2024-03-15-alice-bob",
)
# [/docs:retain-conversation]


# [docs:retain-with-context]
client.retain(
    bank_id="my-bank",
    content="Alice 晋升为高级工程师",
    context="职业变化",
    timestamp="2024-03-15T10:00:00Z"
)
# [/docs:retain-with-context]


# [docs:retain-batch]
client.retain_batch(
    bank_id="my-bank",
    items=[
        {"content": "Alice 在 Google 工作", "context": "career", "document_id": "conversation_001_msg_1"},
        {"content": "Bob 在 Meta 担任数据科学家", "context": "career", "document_id": "conversation_001_msg_2"},
        {"content": "Alice 和 Bob 是朋友", "context": "relationship", "document_id": "conversation_001_msg_3"}
    ]
)
# [/docs:retain-batch]


# [docs:retain-async]
# 开始异步摄取，立即返回
result = client.retain_batch(
    bank_id="my-bank",
    items=[
        {"content": "大批量条目一", "document_id": "large-doc-1"},
        {"content": "大批量条目二", "document_id": "large-doc-2"},
    ],
    retain_async=True
)

# 检查是否异步处理
print(result.var_async)  # True
# [/docs:retain-async]


# [docs:retain-with-tags]
# 为各条目加标签，限制可见范围
client.retain_batch(
    bank_id="my-bank",
    items=[
        {
            "content": "用户 Alice 说喜欢新仪表盘",
            "tags": ["user:alice", "feedback"],
            "document_id": "user_feedback_001"
        },
        {
            "content": "用户 Bob 报告搜索功能问题",
            "tags": ["user:bob", "bug-report"],
            "document_id": "user_feedback_002"
        }
    ]
)
# [/docs:retain-with-tags]


# [docs:retain-with-document-tags]
# 为整批条目加标签
client.retain_batch(
    bank_id="my-bank",
    items=[
        {"content": "Alice 提到偏好深色模式", "document_id": "support_session_123_msg_1"},
        {"content": "Bob 询问键盘快捷键", "document_id": "support_session_123_msg_2"}
    ],
    document_tags=["session:123", "support"]  # 应用于所有条目
)
# [/docs:retain-with-document-tags]


# [docs:retain-files]
# 上传文件，将内容存为记忆。
# 支持 PDF、DOCX、PPTX、XLSX、图片 OCR、音频转录及文本。
# 传入路径，客户端自动读取并上传。
result = client.retain_files(
    bank_id="my-bank",
    files=[EXAMPLES_DIR / "sample.pdf"],
    context="季度报告",
)
print(result.operation_ids)  # 通过操作端点跟踪进度
# [/docs:retain-files]


# [docs:retain-files-batch]
# 上传多个文件及各自元数据，每批最多十个。
# 每文件有独立 context、document_id 和 tags。
result = client.retain_files(
    bank_id="my-bank",
    files=[
        EXAMPLES_DIR / "sample.pdf",
        EXAMPLES_DIR / "sample.pdf",  # 替换为第二个文件路径
    ],
    files_metadata=[
        {"context": "季度报告", "document_id": "q1-report", "tags": ["project:alpha"]},
        {"context": "会议记录", "document_id": "q1-notes", "tags": ["project:alpha"]},
    ],
)
print(result.operation_ids)  # 每文件一个操作 ID
# [/docs:retain-files-batch]


# [docs:retain-list-tags]
# 列出记忆库全部标签
response = requests.get(f"{HINDSIGHT_URL}/v1/default/banks/my-bank/tags")
tags = response.json()
for tag in tags["items"]:
    print(f"{tag['tag']}: {tag['count']} 条记忆")

# 通配符搜索，* 匹配任意字符
response = requests.get(f"{HINDSIGHT_URL}/v1/default/banks/my-bank/tags", params={"q": "user:*"})
user_tags = response.json()
response = requests.get(f"{HINDSIGHT_URL}/v1/default/banks/my-bank/tags", params={"q": "*-admin"})
admin_tags = response.json()
# [/docs:retain-list-tags]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")

print("retain.py: 所有示例通过")
