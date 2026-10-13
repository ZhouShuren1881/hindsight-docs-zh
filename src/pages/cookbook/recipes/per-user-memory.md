---
sidebar_position: 2
---

# 按用户划分记忆 {#per-user-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/02-per-user-memory.ipynb)
:::


最简单的模式：为每位用户提供持久记忆，跨会话记住对话、偏好和上下文。

## 问题 {#the-problem}

没有记忆，每次对话都从头开始：

```
会话一：“我偏好深色模式，使用 Python”
会话二：“我偏好什么语言？” → 智能体不知道
```

## 解决方案：每用户一个记忆库 {#the-solution-one-bank-per-user}

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户 A 记忆库 │     │   用户 B 记忆库 │     │   用户 C 记忆库 │
│                 │     │                 │     │                 │
│  - 对话         │     │  - 对话         │     │  - 对话         │
│  - 偏好         │     │  - 偏好         │     │  - 偏好         │
│  - 上下文       │     │  - 上下文       │     │  - 上下文       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
    完全隔离                完全隔离                完全隔离
```

每位用户使用独立记忆库，完全隔离，概念简单。


```python
!pip install hindsight-client nest_asyncio openai python-dotenv -U
```

## 1. 用户注册时创建记忆库 {#1-create-a-bank-when-user-signs-up}


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

def on_user_signup(user_id: str):
    client.create_bank(
        bank_id=f"user-{user_id}",
        name=f"{user_id} 的记忆"
    )
    print(f"查看记忆库：{HINDSIGHT_UI_URL}/banks/user-{user_id}?view=documents")
```

## 2. 管理对话会话 {#2-manage-conversation-sessions}

通过 `document_id` 分组同一对话消息，使用相同 ID 存储会替换旧版本（更新或插入），随对话变化保持最新。


```python
import uuid
import json

class ConversationSession:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.session_id = str(uuid.uuid4())  # 当前对话唯一 ID
        self.messages = []

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def save(self, client: Hindsight):
        """保存完整对话；已有 session_id 时替换旧版本。"""
        # 将消息转换为存储用的字符串
        content = "\n".join([f"{m['role']}: {m['content']}" for m in self.messages])
        client.retain(
            bank_id=f"user-{self.user_id}",
            content=content,
            document_id=self.session_id  # 相同 ID 更新并替换旧版本
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

## 4. 完整智能体循环 {#4-complete-agent-loop}


```python
def format_results(results):
    """将召回结果格式化为提示词。"""
    if not results:
        return "未找到相关记忆。"
    return "\n".join([f"- {r.text}" for r in results])

def format_messages(messages):
    """格式化对话消息。"""
    return "\n".join([f"{m['role']}: {m['content']}" for m in messages])

def handle_message(session: ConversationSession, user_message: str):
    # 1. 将用户消息加入会话
    session.add_message("user", user_message)

    # 2. 召回过去对话的相关上下文
    context = client.recall(
        bank_id=f"user-{session.user_id}",
        query=user_message
    )

    # 3. 构建包含记忆的系统提示词
    system_prompt = f"""你是记得过去对话的助手。

## 你记得的用户信息
{format_results(context.results)}

提供有用回答，并在适当时引用相关记忆。"""

    # 4. 使用 OpenAI 生成回答
    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            *[{"role": m["role"], "content": m["content"]} for m in session.messages]
        ]
    )
    assistant_response = response.choices[0].message.content

    # 5. 将助手回复加入会话
    session.add_message("assistant", assistant_response)

    # 6. 保存更新后的对话，按 session_id 更新
    session.save(client)

    print(f"用户：{user_message}")
    print(f"助手：{assistant_response}\n")
    
    return assistant_response
```

## 5. 开始新对话 {#5-starting-a-new-conversation}


```python
# 创建用户记忆库
on_user_signup("alice")

# 每次新对话获得唯一会话 ID
session = ConversationSession(user_id="alice")

# 同一对话中的多轮交互
handle_message(session, "你好！我在做 Python 项目")
handle_message(session, "能帮助我使用 async/await 吗？")

# 在界面查看存储的对话。
# 每条消息通过 document_id 更新同一文档，
# 因此完整历史在一个文档中，而非多个独立条目。
print(f"\n查看文档：{HINDSIGHT_UI_URL}/banks/user-alice?view=documents")
```

## 文档 ID 如何工作 {#how-document-id-works}

`document_id` 是管理持续增长对话的关键：

| 场景 | 行为 |
|----------|----------|
| 首次使用 `document_id="session_123"` | 创建文档 |
| 再次使用相同 `document_id="session_123"` | **替换**旧版本 |
| 使用不同 `document_id="session_456"` | 创建独立文档 |
| 不指定 `document_id` | 每次创建新文档 |

因此：
- 始终存储**完整对话**状态
- 从完整对话重新提取事实
- 不留下旧版本重复或过时事实
- 对话发展时记忆保持一致

## 会记住什么 {#what-gets-remembered}

Hindsight 自动提取并关联：

- **事实**：“用户偏好 Python”“用户在构建 CLI 工具”
- **实体**：提及的人、项目、技术
- **关系**：实体之间的关联
- **时间上下文**：事情发生的时间

无需手动提取或结构化，直接存储对话即可。

## 适用场景 {#when-to-use-this-pattern}

**适合：**
- 聊天机器人和助手
- 个人 AI 伙伴
- 任意一对一用户与智能体交互

**以下情况可加入共享知识：**
- 需要参考产品文档或 FAQ
- 多个用户需要相同信息
- 参见共享知识支持智能体笔记本

## 清理 {#cleanup}

删除本笔记本创建的记忆库：


```python
import requests

# 删除 user-alice 记忆库
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/user-alice")
print(f"已删除 user-alice：{response.json()}")
```
