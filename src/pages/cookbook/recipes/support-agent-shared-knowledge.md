---
sidebar_position: 3
---

# 共享知识支持智能体 {#support-agent-with-shared-knowledge}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/03-support-agent-shared-knowledge.ipynb)
:::


此模式展示如何结合**用户专属记忆**与**共享产品知识**（RAG）构建支持智能体，让用户获得个性化支持，同时以统一的可信来源提供文档信息。

## 问题 {#the-problem}

你正在构建一个支持智能体，它需要：
- 记住每位用户的历史、偏好和问题
- 访问共享产品文档
- 完全隔离各用户数据

一种简单做法是将产品文档索引到每位用户的记忆库中，但这既昂贵又浪费：N 位用户就要存 N 份副本。

## 解决方案：多记忆库架构 {#the-solution-multi-bank-architecture}

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户 A 记忆库 │     │   用户 B 记忆库 │     │   共享文档      │
│                 │     │                 │     │     记忆库      │
│  - 对话         │     │  - 对话         │     │                 │
│  - 偏好         │     │  - 偏好         │     │  - 产品文档     │
│  - 历史问题     │     │  - 历史问题     │     │  - 常见问题     │
│  - 解法         │     │  - 解法         │     │  - 指南         │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                           智能体查询
                           多个记忆库
```

**主要优势：**
- 产品文档只索引一次，所有用户共享
- 用户记忆完全隔离
- 结构简单，无复杂筛选


```python
!pip install hindsight-client nest_asyncio openai python-dotenv -U
```

## 1. 设置记忆库 {#1-set-up-memory-banks}

创建三种记忆库：


```python
# Jupyter 已运行 asyncio 事件循环；Hindsight 客户端
# 内部使用 loop.run_until_complete()，Python 默认不允许嵌套。
# nest_asyncio 修补事件循环以支持嵌套。
import nest_asyncio
nest_asyncio.apply()

import os
from dotenv import load_dotenv
from openai import OpenAI as OpenAIClient

# 从 .env 加载环境变量
# 复制 .env.example 为 .env 并填写值
load_dotenv()

# 配置，可用环境变量覆盖
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_UI_URL = os.getenv("HINDSIGHT_UI_URL", "http://localhost:9999")

from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_API_URL)
llm = OpenAIClient()  # 使用 .env 中的 OPENAI_API_KEY

# 共享知识库，只创建一次
shared_bank = client.create_bank(
    bank_id="product-docs",
    name="Product Documentation"
)

# 用户注册时创建独立库
def create_user_bank(user_id: str):
    return client.create_bank(
        bank_id=f"user-{user_id}",
        name=f"Memory for {user_id}"
    )
```

## 2. 索引产品文档 {#2-index-product-documentation}

将产品文档索引到共享库，只需首次或更新时执行：


```python
# 索引产品文档，每篇分别存储
client.retain(
    bank_id="product-docs",
    content="# Pricing Tiers\n\nBasic: $10/mo, Pro: $25/mo, Enterprise: Contact us"
)

client.retain(
    bank_id="product-docs",
    content="# Getting Started\n\nTo set up your account, visit the dashboard and click 'New Project'"
)

# 在界面查看已存储文档：
print(f"View documents: {HINDSIGHT_UI_URL}/banks/product-docs?view=documents")
```

## 3. 存储用户对话 {#3-store-user-conversations}

每次支持交互后，存入用户库：


```python
def save_conversation(user_id: str, messages: list):
    # 将消息转换为字符串
    content = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    client.retain(
        bank_id=f"user-{user_id}",
        content=content
    )
```

## 4. 支持时查询多个库 {#4-query-multiple-banks-at-support-time}

处理查询时，从两库获取上下文：


```python
def get_support_context(user_id: str, query: str):
    # 获取用户个人上下文
    user_context = client.recall(
        bank_id=f"user-{user_id}",
        query=query
    )

    # 获取相关产品文档
    docs_context = client.recall(
        bank_id="product-docs",
        query=query
    )

    return {
        "user_history": user_context.results,
        "documentation": docs_context.results
    }
```

## 5. 构建智能体提示词 {#5-build-the-agent-prompt}

合并两种上下文：


```python
def format_results(results):
    """Format recall results for the prompt."""
    if not results:
        return "No relevant information found."
    return "\n".join([f"- {r.text}" for r in results])

def build_prompt(query: str, context: dict) -> str:
    return f"""You are a helpful support agent.

## User's History
{format_results(context["user_history"])}

## Product Documentation
{format_results(context["documentation"])}

## Current Question
{query}

Use the user's history to personalize your response and the documentation
for accurate product information. If you find a solution, remember it for
future reference.
"""
```

## 将经验提升为共享知识 {#promoting-learnings-to-shared-knowledge}

发现文档未记录的解法时，可选地写入共享经验库：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户 A 记忆库 │     │   共享文档      │     │   经验知识      │
│                 │     │     记忆库      │     │     记忆库      │
│  - 对话         │     │                 │     │                 │
│  - 偏好         │     │  - 产品文档     │     │  - 已验证       │
│  - 历史问题     │     │  - 常见问题     │     │    解法         │
│  - 解法         │     │  - 指南         │     │  - 规避方法     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                           智能体查询
                           全部三个库
```


```python
# 可选：创建整理后的共享经验库
learnings_bank = client.create_bank(
    bank_id="support-learnings",
    name="Curated Support Learnings"
)

# 成功解决问题后
def promote_learning(insight: str):
    client.retain(
        bank_id="support-learnings",
        content=insight
    )
```

## 完整示例 {#complete-example}


```python
def format_results(results):
    if not results:
        return "No relevant information found."
    return "\n".join([f"- {r.text}" for r in results])

def handle_support_request(user_id: str, query: str):
    # 1. 召回用户记忆
    user_recall = client.recall(
        bank_id=f"user-{user_id}",
        query=query
    )

    # 2. 召回共享文档
    docs_recall = client.recall(
        bank_id="product-docs",
        query=query
    )

    # 3. 召回经验，可选
    learnings_recall = client.recall(
        bank_id="support-learnings",
        query=query
    )

    # 4. 构建包含上下文的系统提示词
    system_prompt = f"""You are a helpful support agent. Use the context below to answer the user's question.

## User's History
{format_results(user_recall.results)}

## Product Documentation
{format_results(docs_recall.results)}

## Known Solutions
{format_results(learnings_recall.results)}

Provide helpful, accurate responses based on the documentation. Reference the user's history when relevant."""

    # 5. 使用 OpenAI 生成回复
    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
    )
    assistant_response = response.choices[0].message.content

    # 6. 将对话存入用户记忆
    conversation = f"user: {query}\nassistant: {assistant_response}"
    client.retain(
        bank_id=f"user-{user_id}",
        content=conversation
    )

    return assistant_response

# 测试函数
create_user_bank("bob")
print("User: How do I get started?")
result = handle_support_request("bob", "How do I get started?")
print(f"Assistant: {result}")
print(f"\nView user memory: {HINDSIGHT_UI_URL}/banks/user-bob?view=documents")
```

## 适用场景 {#when-to-use-this-pattern}

**适合：**
- 使用共享文档的支持智能体
- 共享参考数据的多租户应用
- 需要用户隔离和共享知识的场景

**以下情况考虑替代方案：**
- 需要跨用户学习，让用户受益于他人的解法
- 实体关系需跨用户和文档

## 清理 {#cleanup}

删除本笔记本创建的记忆库：


```python
import requests

# 删除本笔记本创建的全部记忆库
for bank_id in ["product-docs", "support-learnings", "user-bob"]:
    response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/{bank_id}")
    print(f"Deleted {bank_id}: {response.json()}")
```
