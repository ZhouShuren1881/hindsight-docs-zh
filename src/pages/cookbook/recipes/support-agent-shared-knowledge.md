---
sidebar_position: 3
---

# 共享知识的支持智能体 {#support-agent-with-shared-knowledge}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/03-support-agent-shared-knowledge.ipynb)
:::


结合**用户专属记忆**和**共享产品知识**（RAG）构建支持智能体，提供个性化支持，同时使用统一文档来源。

## 问题 {#the-problem}

支持智能体需要：
- 记住每位用户的历史、偏好和问题
- 访问共享产品文档
- 完全隔离各用户数据

将产品文档复制到每个用户库很昂贵且浪费，N 个用户需要 N 份。

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

创建三类库：


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
    name="产品文档"
)

# 用户注册时创建独立库
def create_user_bank(user_id: str):
    return client.create_bank(
        bank_id=f"user-{user_id}",
        name=f"{user_id} 的记忆"
    )
```

## 2. 索引产品文档 {#2-index-product-documentation}

将产品文档索引到共享库，只需首次或更新时执行：


```python
# 索引产品文档，每篇分别存储
client.retain(
    bank_id="product-docs",
    content="# 价格方案\n\n基础版：每月 10 美元，专业版：每月 25 美元，企业版：联系我们"
)

client.retain(
    bank_id="product-docs",
    content="# 入门\n\n访问仪表盘，点击 New Project（新项目）配置账号"
)

# 在界面查看已存储文档：
print(f"查看文档：{HINDSIGHT_UI_URL}/banks/product-docs?view=documents")
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
    """格式化召回结果，用于提示词。"""
    if not results:
        return "未找到相关信息。"
    return "\n".join([f"- {r.text}" for r in results])

def build_prompt(query: str, context: dict) -> str:
    return f"""你是有帮助的支持智能体。

## 用户历史
{format_results(context["user_history"])}

## 产品文档
{format_results(context["documentation"])}

## 当前问题
{query}

根据用户历史个性化回复，并用文档保证
产品信息准确。找到解法时，请记住它，
供未来参考。
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
    name="整理后的支持经验"
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
        return "未找到相关信息。"
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
    system_prompt = f"""你是有帮助的支持智能体，请用以下上下文回答。

## 用户历史
{format_results(user_recall.results)}

## 产品文档
{format_results(docs_recall.results)}

## 已知解法
{format_results(learnings_recall.results)}

依据文档提供有用、准确的回答，相关时引用用户历史。"""

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
print("用户：如何开始？")
result = handle_support_request("bob", "如何开始？")
print(f"助手：{result}")
print(f"\n查看用户记忆：{HINDSIGHT_UI_URL}/banks/user-bob?view=documents")
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
    print(f"已删除 {bank_id}：{response.json()}")
```
