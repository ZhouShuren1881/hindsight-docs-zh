---
sidebar_position: 2
---

# 按用户划分记忆 {#per-user-memory}


:::tip 运行此笔记本
此菜谱提供交互式 Jupyter 笔记本。
[**在 GitHub 上打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/02-per-user-memory.ipynb)
:::


最简单的模式：为每位用户的智能体提供持久记忆。智能体可以跨会话记住以往的对话、用户偏好和上下文。

## 问题 {#the-problem}

没有记忆时，每次对话都会从头开始：

```
Session 1: "I prefer dark mode and use Python"
Session 2: "What's my preferred language?" → Agent doesn't know
```

## 解决方案：每位用户一个记忆库 {#the-solution-one-bank-per-user}

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 用户 A 的记忆库 │     │ 用户 B 的记忆库 │     │ 用户 C 的记忆库 │
│                 │     │                 │     │                 │
│  - 对话         │     │  - 对话         │     │  - 对话         │
│  - 偏好         │     │  - 偏好         │     │  - 偏好         │
│  - 上下文       │     │  - 上下文       │     │  - 上下文       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
    完全隔离                完全隔离                完全隔离
```

每位用户都有自己的记忆库。这样可以实现完全隔离，概念也很简单。


```python
!pip install hindsight-client nest_asyncio openai python-dotenv -U
```

## 1. 用户注册时创建记忆库 {#1-create-a-bank-when-user-signs-up}


```python
# Jupyter 笔记本已经运行着 asyncio 事件循环。Hindsight 客户端
# 内部使用 loop.run_until_complete()，但 Python 默认不允许嵌套事件循环。
# nest_asyncio 会修补这一限制，以允许嵌套事件循环。
import nest_asyncio
nest_asyncio.apply()

import os
from dotenv import load_dotenv
from openai import OpenAI as OpenAIClient

# 从 .env 文件加载环境变量
# 将 .env.example 复制为 .env，然后填写配置值
load_dotenv()

# 配置（如果设置了环境变量，则使用其值覆盖）
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_UI_URL = os.getenv("HINDSIGHT_UI_URL", "http://localhost:9999")

from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_API_URL)
llm = OpenAIClient()  # 使用 .env 中的 OPENAI_API_KEY

def on_user_signup(user_id: str):
    client.create_bank(
        bank_id=f"user-{user_id}",
        name=f"Memory for {user_id}"
    )
    print(f"View bank: {HINDSIGHT_UI_URL}/banks/user-{user_id}?view=documents")
```

## 2. 管理对话会话 {#2-manage-conversation-sessions}

使用 `document_id` 将属于同一对话的消息归为一组。使用相同的 `document_id` 调用 retain 时，Hindsight 会替换先前的版本（即 upsert），让记忆随着对话的发展保持最新。


```python
import uuid
import json

class ConversationSession:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.session_id = str(uuid.uuid4())  # 此对话的唯一 ID
        self.messages = []

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def save(self, client: Hindsight):
        """Save the entire conversation. Replaces previous version if session_id exists."""
        # 将消息转换为供 retain 使用的字符串格式
        content = "\n".join([f"{m['role']}: {m['content']}" for m in self.messages])
        client.retain(
            bank_id=f"user-{self.user_id}",
            content=content,
            document_id=self.session_id  # 相同 ID 会触发 upsert（替换旧版本）
        )
```

## 3. 回答前召回上下文 {#3-recall-context-before-responding}


```python
def get_context(user_id: str, query: str):
    result = client.recall(
        bank_id=f"user-{user_id}",
        query=query
    )
    return result.results
```

## 4. 完整的智能体循环 {#4-complete-agent-loop}


```python
def format_results(results):
    """Format recall results for the prompt."""
    if not results:
        return "No relevant memories found."
    return "\n".join([f"- {r.text}" for r in results])

def format_messages(messages):
    """Format conversation messages for the prompt."""
    return "\n".join([f"{m['role']}: {m['content']}" for m in messages])

def handle_message(session: ConversationSession, user_message: str):
    # 1. 将用户消息添加到会话中
    session.add_message("user", user_message)

    # 2. 从先前对话中召回相关上下文
    context = client.recall(
        bank_id=f"user-{session.user_id}",
        query=user_message
    )

    # 3. 在系统提示词中加入记忆
    system_prompt = f"""You are a helpful assistant with memory of past conversations.

## What you remember about this user
{format_results(context.results)}

Respond helpfully and reference relevant memories when appropriate."""

    # 4. 使用 OpenAI 生成回复
    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            *[{"role": m["role"], "content": m["content"]} for m in session.messages]
        ]
    )
    assistant_response = response.choices[0].message.content

    # 5. 将助手回复添加到会话中
    session.add_message("assistant", assistant_response)

    # 6. 保存更新后的对话（根据 session_id 执行 upsert）
    session.save(client)

    print(f"User: {user_message}")
    print(f"Assistant: {assistant_response}\n")
    
    return assistant_response
```

## 5. 开始新对话 {#5-starting-a-new-conversation}


```python
# 创建用户的记忆库
on_user_signup("alice")

# 每次新对话都会分配一个新的唯一 ID
session = ConversationSession(user_id="alice")

# 在同一对话中进行多轮交互
handle_message(session, "Hi! I'm working on a Python project")
handle_message(session, "Can you help me with async/await?")

# 在界面中查看已存储的对话。
# 每条消息都会通过 document_id 更新同一文档，因此你会看到
# 一份包含完整对话历史的文档，而不是多个独立条目。
print(f"\nView documents: {HINDSIGHT_UI_URL}/banks/user-alice?view=documents")
```

## 文档 ID 的工作方式 {#how-document-id-works}

`document_id` 参数是管理不断演变的对话的关键：

| 场景 | 行为 |
|----------|----------|
| 首次使用 `document_id="session_123"` 调用 retain | 创建新文档 |
| 再次使用相同的 `document_id="session_123"` 调用 retain | **替换**先前版本（upsert） |
| 使用不同的 `document_id="session_456"` 调用 retain | 创建独立文档 |
| 调用 retain 时不提供 `document_id` | 每次都会创建新文档 |

这种 upsert 行为意味着：
- 始终存入**完整的对话**状态
- 从完整对话中重新提取事实
- 不会留下来自旧版本的重复或过时事实
- 随着对话的发展，记忆始终保持一致

## 会记住哪些内容 {#what-gets-remembered}

Hindsight 会自动提取并关联：

- **事实**：“用户偏好 Python”“用户正在构建 CLI 工具”
- **实体**：提到的人物、项目和技术
- **关系**：实体之间的关联方式
- **时间上下文**：事情发生的时间

无需手动提取或组织内容，只要存入对话即可。

## 何时使用此模式 {#when-to-use-this-pattern}

**适用场景：**
- 聊天机器人和助手
- 个人 AI 伙伴
- 任何一对一的用户与智能体交互

**以下情况可考虑加入共享知识：**
- 需要参考产品文档或 FAQ
- 多位用户需要访问相同的信息
- 参见“支持智能体与共享知识”笔记本

## 清理 {#cleanup}

删除此笔记本创建的记忆库：


```python
import requests

# 删除 user-alice 记忆库
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/user-alice")
print(f"Deleted user-alice: {response.json()}")
```
