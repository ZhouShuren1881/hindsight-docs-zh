#!/usr/bin/env python3
"""
Hindsight Python SDK 页面示例（docs/sdks/python.mdx）。
运行： python examples/api/python-sdk.py
"""
import os

import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:quickstart]
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")

# 存储记忆
client.retain(bank_id="python-sdk-bank", content="Alice 在 Google 工作")

# 召回记忆
results = client.recall(bank_id="python-sdk-bank", query="Alice 做什么工作？")
for r in results.results:
    print(r.text)

# 反思，生成带上下文回答
answer = client.reflect(bank_id="python-sdk-bank", query="介绍一下 Alice")
print(answer.text)
# [/docs:quickstart]


# [docs:client-init]
from hindsight_client import Hindsight

client = Hindsight(
    base_url="http://localhost:8888",  # Hindsight API URL
    timeout=30.0,                       # 请求超时，单位秒
    # api_key="your-api-key",          # 可选 Bearer 令牌
)

# 核心操作
client.retain(bank_id="python-sdk-test", content="你好，世界")
results = client.recall(bank_id="python-sdk-test", query="你好")

# 记忆库、心智模型、指令和记忆辅助方法
client.create_bank(bank_id="python-sdk-test", name="测试记忆库")
models = client.list_mental_models(bank_id="python-sdk-test")
directives = client.list_directives(bank_id="python-sdk-test")
memories = client.list_memories(bank_id="python-sdk-test")
# [/docs:client-init]


# [docs:get-version]
version = client.get_version()

print(version.api_version)

if not version.features.mcp:
    raise RuntimeError("此服务器未提供 MCP 端点")
# [/docs:get-version]


# [docs:retain]
# Simple
client.retain(
    bank_id="python-sdk-bank",
    content="Alice 在 Google 担任软件工程师",
)

# 带选项
from datetime import datetime

client.retain(
    bank_id="python-sdk-bank",
    content="Alice 升职了",
    context="职业动态",
    timestamp=datetime(2024, 1, 15),
    document_id="conversation_001",
    metadata={"source": "slack"},
    retain_async=False,  # Set True for background processing
)
# [/docs:retain]


# [docs:retain-batch]
client.retain_batch(
    bank_id="python-sdk-bank",
    items=[
        {"content": "Alice 在 Google 工作", "context": "职业"},
        {"content": "Bob 是数据科学家", "context": "职业"},
    ],
    document_id="conversation_001",
    retain_async=False,  # Set True for background processing
)
# [/docs:retain-batch]


# [docs:recall]
# 简单调用，返回 RecallResponse
results = client.recall(
    bank_id="python-sdk-bank",
    query="Alice 做什么工作？",
)

for r in results.results:
    print(f"{r.text} (type: {r.type})")

# 带选项
results = client.recall(
    bank_id="python-sdk-bank",
    query="Alice 做什么工作？",
    types=["world", "observation"],  # 按事实类型筛选
    max_tokens=4096,
    budget="high",  # low, mid, or high
)
# [/docs:recall]


# [docs:recall-chunks]
# 返回包含来源文本块的 RecallResponse
response = client.recall(
    bank_id="python-sdk-bank",
    query="Alice 做什么工作？",
    types=["world", "experience"],
    budget="mid",
    max_tokens=4096,
    include_chunks=True,
    max_chunk_tokens=500
)

print(f"Found {len(response.results)} memories")
for r in response.results:
    print(f"  - {r.text}")
    chunk = (response.chunks or {}).get(r.chunk_id)
    if chunk:
        print(f"    Source: {chunk.text[:100]}...")
# [/docs:recall-chunks]


# [docs:reflect]
answer = client.reflect(
    bank_id="python-sdk-bank",
    query="关于 Alice，我应该了解什么？",
    budget="low",  # low, mid, or high
    context="准备会议",
)

print(answer.text)  # Generated response
# [/docs:reflect]


# [docs:create-bank]
client.create_bank(
    bank_id="python-sdk-bank",
    name="Assistant",
    mission="你是一位乐于助人的 AI 助手，跟踪用户偏好和对话历史。",
    disposition={
        "skepticism": 3,    # 1-5：信任到怀疑
        "literalism": 3,    # 1-5：灵活到字面
        "empathy": 3,       # 1-5：冷淡到共情
    },
)
# [/docs:create-bank]


# [docs:list-memories]
client.list_memories(
    bank_id="python-sdk-bank",
    type="world",  # 可选：按类型筛选
    search_query="Alice",  # 可选：文本搜索
    limit=100,
    offset=0,
)
# [/docs:list-memories]

client.close()


# [docs:async]
import asyncio
from hindsight_client import Hindsight

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    # 异步存储
    await client.aretain(bank_id="python-sdk-bank", content="你好，世界")

    # 异步召回
    results = await client.arecall(bank_id="python-sdk-bank", query="你好")
    for r in results.results:
        print(r.text)

    # 异步反思
    answer = await client.areflect(bank_id="python-sdk-bank", query="我说了什么？")
    print(answer.text)

    await client.aclose()

asyncio.run(main())
# [/docs:async]


# [docs:context-manager]
from hindsight_client import Hindsight

with Hindsight(base_url="http://localhost:8888") as client:
    client.retain(bank_id="python-sdk-bank", content="Hello")
    results = client.recall(bank_id="python-sdk-bank", query="你好")
# 客户端自动关闭
# [/docs:context-manager]


# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/python-sdk-bank")
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/python-sdk-test")

print("python-sdk.py: 全部示例通过")
