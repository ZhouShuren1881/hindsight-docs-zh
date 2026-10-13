#!/usr/bin/env python3
"""
Hindsight 核心方法示例。
运行：python examples/api/main-methods.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 准备，文档中不展示
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# =============================================================================
# 文档示例：存储
# =============================================================================

# [docs:main-retain]
# 存储单条事实
client.retain(
    bank_id="my-bank",
    content="Alice 于 2024 年 3 月加入 Google，担任高级机器学习工程师"
)

# 存储对话
conversation = """
用户：今天做了什么？
助手：评审了新的机器学习流水线架构。
用户：效果如何？
助手：很有前景，但需要改进错误处理。
"""

client.retain(
    bank_id="my-bank",
    content=conversation,
    context="每日站会对话"
)

# 批量存储多个条目
client.retain_batch(
    bank_id="my-bank",
    items=[
        {"content": "Bob 偏好使用 Python 进行数据科学工作"},
        {"content": "Alice 建议用 pytest 测试"},
        {"content": "团队使用 GitHub 进行代码评审"}
    ]
)
# [/docs:main-retain]


# =============================================================================
# 文档示例：召回
# =============================================================================

# [docs:main-recall]
# 基本搜索
results = client.recall(
    bank_id="my-bank",
    query="Alice 在 Google 做什么工作？"
)

for result in results.results:
    print(f"- {result.text}")

# 附带选项搜索
results = client.recall(
    bank_id="my-bank",
    query="去年春天发生了什么？",
    budget="high",  # 更深入的图遍历
    max_tokens=8192,  # 返回更多上下文
    types=["world"]  # 仅世界事实
)

# 包含来源分块，提供更多上下文
results = client.recall(
    bank_id="my-bank",
    query="介绍一下 Alice",
    include_chunks=True,
    max_chunk_tokens=500
)

# 检查分块详情，分块位于响应层，以记忆 ID 为键
for result in results.results:
    print(f"记忆： {result.text}")
    if results.chunks and result.id in results.chunks:
        chunk = results.chunks[result.id]
        print(f"  来源： {chunk.text[:100]}...")
# [/docs:main-recall]


# =============================================================================
# 文档示例：反思
# =============================================================================

# [docs:main-reflect]
# 基本反思
response = client.reflect(
    bank_id="my-bank",
    query="后端应该采用 TypeScript 吗？",
    include_facts=True,
)

print(response.text)
print("\n依据：", len(response.based_on.memories if response.based_on else []), "条事实")

# 附带选项反思
response = client.reflect(
    bank_id="my-bank",
    query="Alice 担任团队负责人的优势是什么？",
    budget="high",  # 更深入推理
    include_facts=True,
)

# 查看影响回答的事实
for fact in (response.based_on.memories if response.based_on else []):
    print(f"- {fact.text}")
# [/docs:main-reflect]


# =============================================================================
# 文档示例：记忆列表
# =============================================================================

# [docs:main-list-memories]
# 列出全部记忆
memories = client.list_memories(
    bank_id="my-bank",
    limit=10
)

for memory in memories.items:
    print(f"- [{memory.fact_type}] {memory.text}")

# 按类型筛选
world_facts = client.list_memories(
    bank_id="my-bank",
    type="world",
    limit=5
)

# 在记忆内搜索
search_results = client.list_memories(
    bank_id="my-bank",
    search_query="Alice",
    limit=10
)
# [/docs:main-list-memories]


# =============================================================================
# 文档示例：异步方法
# =============================================================================

# [docs:main-async]
import asyncio

async def async_example():
    # 为异步操作创建新客户端
    async_client = Hindsight(base_url=HINDSIGHT_URL)

    # 所有同步方法都有以 a 开头的异步版本
    await async_client.aretain(bank_id="my-bank", content="异步记忆")

    results = await async_client.arecall(bank_id="my-bank", query="异步")
    for r in results:
        print(f"- {r.text}")

    response = await async_client.areflect(bank_id="my-bank", query="存储了什么？")
    print(response.text)

asyncio.run(async_example())
# [/docs:main-async]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")

print("main-methods.py: 所有示例通过")
