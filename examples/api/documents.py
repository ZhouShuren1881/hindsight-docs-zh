#!/usr/bin/env python3
"""
Hindsight 文档 API 示例.
运行： python examples/api/documents.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:document-retain]
# 使用文档 ID 存储
client.retain(
    bank_id="my-bank",
    content="Alice 介绍了第四季度路线图...",
    document_id="meeting-2024-03-15"
)

# 分章节批量存储文档
client.retain_batch(
    bank_id="my-bank",
    items=[
        {"content": "事项 1：产品发布延期至第二季度", "document_id": "meeting-2024-03-15-section-1"},
        {"content": "事项 2：公布新招聘目标", "document_id": "meeting-2024-03-15-section-2"},
        {"content": "事项 3：机器学习团队预算获批", "document_id": "meeting-2024-03-15-section-3"}
    ]
)
# [/docs:document-retain]


# [docs:document-update]
# Original
client.retain(
    bank_id="my-bank",
    content="项目截止日期：3 月 31 日",
    document_id="project-plan"
)

# 更新（删除旧事实，创建新事实）
client.retain(
    bank_id="my-bank",
    content="项目截止日期：4 月 15 日（已延期）",
    document_id="project-plan"
)
# [/docs:document-update]


# [docs:document-list]
from hindsight_client_api import ApiClient, Configuration
from hindsight_client_api.api import DocumentsApi

async def list_documents_example():
    config = Configuration(host="http://localhost:8888")
    api_client = ApiClient(config)
    api = DocumentsApi(api_client)

    # 列出全部文档
    result = await api.list_documents(bank_id="my-bank")
    print(f"文档总数： {result.total}")

    # 按文档 ID 子串筛选
    result = await api.list_documents(bank_id="my-bank", q="report")

    # 按标签筛选，仅 team-a 文档（排除无标签）
    result = await api.list_documents(
        bank_id="my-bank",
        tags=["team-a"],
        tags_match="any_strict",
    )

    # 组合 ID 搜索与标签
    result = await api.list_documents(
        bank_id="my-bank",
        q="meeting",
        tags=["team-a", "team-b"],
        tags_match="all_strict",  # 必须同时包含两个标签
    )

    # Paginate
    result = await api.list_documents(bank_id="my-bank", limit=20, offset=40)
    print(f"本页条目： {len(result.items)}")

import asyncio
asyncio.run(list_documents_example())
# [/docs:document-list]


# [docs:document-get]
from hindsight_client_api import ApiClient, Configuration
from hindsight_client_api.api import DocumentsApi

async def get_document_example():
    config = Configuration(host="http://localhost:8888")
    api_client = ApiClient(config)
    api = DocumentsApi(api_client)

    # 获取文档，扩展召回上下文
    doc = await api.get_document(
        bank_id="my-bank",
        document_id="meeting-2024-03-15"
    )

    print(f"Document: {doc.id}")
    print(f"原始文本： {doc.original_text}")
    print(f"记忆数量： {doc.memory_unit_count}")
    print(f"Created: {doc.created_at}")

asyncio.run(get_document_example())
# [/docs:document-get]


# [docs:document-update-tags]
from hindsight_client_api import ApiClient, Configuration
from hindsight_client_api.api import DocumentsApi
from hindsight_client_api.models import UpdateDocumentRequest

async def update_document_example():
    config = Configuration(host="http://localhost:8888")
    api_client = ApiClient(config)
    api = DocumentsApi(api_client)

    # 修正文档错误范围标签
    result = await api.update_document(
        bank_id="my-bank",
        document_id="meeting-2024-03-15",
        update_document_request=UpdateDocumentRequest(tags=["team-a", "team-b"]),
    )
    print(f"Updated: {result.success}")

    # 移除全部标签，使文档在所有范围可见
    await api.update_document(
        bank_id="my-bank",
        document_id="meeting-2024-03-15",
        update_document_request=UpdateDocumentRequest(tags=[]),
    )

asyncio.run(update_document_example())
# [/docs:document-update-tags]


# [docs:document-delete]
from hindsight_client_api import ApiClient, Configuration
from hindsight_client_api.api import DocumentsApi

async def delete_document_example():
    config = Configuration(host="http://localhost:8888")
    api_client = ApiClient(config)
    api = DocumentsApi(api_client)

    # 删除文档及其全部记忆
    result = await api.delete_document(
        bank_id="my-bank",
        document_id="meeting-2024-03-15"
    )

    print(f"Deleted {result.memory_units_deleted} memories")

asyncio.run(delete_document_example())
# [/docs:document-delete]


# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")

print("documents.py: 全部示例通过")
