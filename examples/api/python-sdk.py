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

# 存入一条记忆
client.retain(bank_id="python-sdk-bank", content="Alice works at Google")

# 召回记忆
results = client.recall(bank_id="python-sdk-bank", query="What does Alice do?")
for r in results.results:
    print(r.text)

# 反思：结合上下文生成答案
answer = client.reflect(bank_id="python-sdk-bank", query="Tell me about Alice")
print(answer.text)
# [/docs:quickstart]


# [docs:client-init]
from hindsight_client import Hindsight

client = Hindsight(
    base_url="http://localhost:8888",  # Hindsight API URL
    timeout=30.0,                       # 请求超时时间，单位为秒
    # api_key="your-api-key",          # 可选 Bearer 令牌
)

# 核心操作
client.retain(bank_id="python-sdk-test", content="Hello world")
results = client.recall(bank_id="python-sdk-test", query="Hello")

# 记忆库、心智模型、强制指令和记忆的辅助方法
client.create_bank(bank_id="python-sdk-test", name="Test Bank")
models = client.list_mental_models(bank_id="python-sdk-test")
directives = client.list_directives(bank_id="python-sdk-test")
memories = client.list_memories(bank_id="python-sdk-test")
# [/docs:client-init]


# [docs:get-version]
version = client.get_version()

print(version.api_version)

if not version.features.mcp:
    raise RuntimeError("This server does not expose the MCP endpoint")
# [/docs:get-version]


# [docs:retain]
# 简单调用
client.retain(
    bank_id="python-sdk-bank",
    content="Alice works at Google as a software engineer",
)

# 带选项
from datetime import datetime

client.retain(
    bank_id="python-sdk-bank",
    content="Alice got promoted",
    context="career update",
    timestamp=datetime(2024, 1, 15),
    document_id="conversation_001",
    metadata={"source": "slack"},
    retain_async=False,  # 设为 True 可在后台处理
)
# [/docs:retain]


# [docs:retain-batch]
client.retain_batch(
    bank_id="python-sdk-bank",
    items=[
        {"content": "Alice works at Google", "context": "career"},
        {"content": "Bob is a data scientist", "context": "career"},
    ],
    document_id="conversation_001",
    retain_async=False,  # 设为 True 可在后台处理
)
# [/docs:retain-batch]


# [docs:recall]
# 简单调用，返回 RecallResponse
results = client.recall(
    bank_id="python-sdk-bank",
    query="What does Alice do?",
)

for r in results.results:
    print(f"{r.text} (type: {r.type})")

# 带选项
results = client.recall(
    bank_id="python-sdk-bank",
    query="What does Alice do?",
    types=["world", "observation"],  # 按事实类型筛选
    max_tokens=4096,
    budget="high",  # 可选 low、mid 或 high
)
# [/docs:recall]


# [docs:recall-chunks]
# 返回包含来源文本分块的 RecallResponse
response = client.recall(
    bank_id="python-sdk-bank",
    query="What does Alice do?",
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
    query="What should I know about Alice?",
    budget="low",  # 可选 low、mid 或 high
    context="preparing for a meeting",
)

print(answer.text)  # 生成的响应
# [/docs:reflect]


# [docs:create-bank]
client.create_bank(
    bank_id="python-sdk-bank",
    name="Assistant",
    mission="You're a helpful AI assistant - keep track of user preferences and conversation history.",
    disposition={
        "skepticism": 3,    # 1-5：从信任到怀疑
        "literalism": 3,    # 1-5：从灵活解读到字面解读
        "empathy": 3,       # 1-5：从疏离到共情
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

    # 异步存入
    await client.aretain(bank_id="python-sdk-bank", content="Hello world")

    # 异步召回
    results = await client.arecall(bank_id="python-sdk-bank", query="Hello")
    for r in results.results:
        print(r.text)

    # 异步反思
    answer = await client.areflect(bank_id="python-sdk-bank", query="What did I say?")
    print(answer.text)

    await client.aclose()

asyncio.run(main())
# [/docs:async]


# [docs:context-manager]
from hindsight_client import Hindsight

with Hindsight(base_url="http://localhost:8888") as client:
    client.retain(bank_id="python-sdk-bank", content="Hello")
    results = client.recall(bank_id="python-sdk-bank", query="Hello")
# 客户端自动关闭
# [/docs:context-manager]


# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/python-sdk-bank")
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/python-sdk-test")

print("python-sdk.py: All examples passed")
