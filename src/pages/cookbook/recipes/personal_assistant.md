---
sidebar_position: 9
---

# 借助 Hindsight 记忆的个人 AI 助手 {#personal-ai-assistant-with-hindsight-memory}


:::tip 运行此笔记本
本示例配有可交互运行的 Jupyter 笔记本。
[**在 GitHub 中打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/personal_assistant.ipynb)
:::


一款通用型个人助手，可以记住你的偏好、日程、家庭和工作背景，以及过去的对话。

## 功能 {#features}
- 记住家庭、工作和个人信息
- 跟踪偏好与习惯
- 协助安排日程和提醒
- 在不同对话之间延续上下文

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行的 Hindsight（设置方法见下文）

## 在本地启动 Hindsight {#start-hindsight-locally}

运行此笔记本前，请先在终端中启动 Hindsight：

```bash
export OPENAI_API_KEY="your-openai-api-key"

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 1. 安装依赖 {#1-install-dependencies}


```python
!pip install -q hindsight-client openai nest-asyncio
```

## 2. 配置 OpenAI API 密钥 {#2-configure-openai-api-key}

按提示输入 OpenAI API 密钥，Hindsight 和本演示都会使用该密钥。


```python
import getpass
import os

# 设置 Hindsight 与演示共用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

print("API key configured!")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from datetime import datetime
from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端，连接本地 Docker 实例
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

USER_ID = "assistant-user-demo"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def remember(info: str, category: str = "general") -> str:
    """Store information to remember."""
    today = datetime.now().strftime("%B %d, %Y")

    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today}: {info}",
        metadata={"category": category, "date": today},
    )

    return f"I'll remember: {info}"


def recall_context(query: str) -> str:
    """Recall relevant memories for context."""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:8])
    return ""


def chat(user_message: str) -> str:
    """Chat with the personal assistant."""
    context = recall_context(user_message)

    system_prompt = f"""You are a helpful personal AI assistant with long-term memory.
You remember the user's preferences, schedule, family, work context, and past conversations.

What you remember about this user:
{context if context else "No memories recorded yet."}

Your capabilities:
- Remember things when asked ("Remember that...", "Don't forget...")
- Recall past information ("What did I tell you about...", "When is...")
- Provide personalized suggestions based on known preferences
- Help with scheduling and reminders
- Have natural conversations while maintaining context

Be helpful, proactive, and reference relevant memories naturally."""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=500,
    )

    answer = response.choices[0].message.content

    # 检查用户是否要求记住某件事
    lower_msg = user_message.lower()
    if any(phrase in lower_msg for phrase in ["remember that", "don't forget", "remind me", "note that"]):
        hindsight.retain(
            bank_id=USER_ID,
            content=f"User asked to remember: {user_message}",
            metadata={"category": "reminder"},
        )

    # 存储这次交互
    hindsight.retain(
        bank_id=USER_ID,
        content=f"Conversation - User: {user_message[:100]} | Assistant: {answer[:100]}",
        metadata={"category": "conversation"},
    )

    return answer


def get_summary(topic: str = None) -> str:
    """Get a summary of memories."""
    query = f"Summarize what you know about {topic}" if topic else \
            "Summarize everything you know about this user"

    summary = hindsight.reflect(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("Helper functions defined!")
```

## 5. 建立上下文 {#5-build-context}


```python
print("Building context...")

initial_context = [
    ("My name is Alex and I work as a product manager at TechCorp", "personal"),
    ("My wife's name is Sarah and we have two kids: Emma (7) and Jack (4)", "family"),
    ("I prefer morning meetings and try to keep afternoons for deep work", "preference"),
    ("My mom's birthday is March 15th", "event"),
    ("I'm trying to read more - currently reading 'Atomic Habits'", "hobby"),
    ("I have a weekly team standup every Monday at 10am", "schedule"),
    ("I'm allergic to cats", "health"),
    ("My favorite coffee is a flat white with oat milk", "preference"),
    ("I'm training for a half marathon in April", "goal"),
]

for info, category in initial_context:
    result = remember(info, category)
    print(f"  {result}")
```

## 6. 开始对话 {#6-have-a-conversation}


```python
import time

print("=" * 60)
print("  Conversation")
print("=" * 60)

conversations = [
    "Hey, what's my wife's name again?",
    "Remember that my Q1 review is next Thursday at 2pm",
    "I need a gift idea for my mom's birthday",
    "What time is my Monday standup?",
    "Can you recommend a coffee order for me?",
    "What books am I reading?",
]

for message in conversations:
    print(f"\nAlex: {message}")
    print("-" * 40)
    response = chat(message)
    print(f"Assistant: {response}")
    time.sleep(1)
```

## 7. 查看摘要 {#7-view-summary}


```python
print("=" * 60)
print("  What I Know About You")
print("=" * 60)
print(get_summary())
```


```python
print("=" * 60)
print("  Your Family")
print("=" * 60)
print(get_summary("family"))
```

## 8. 试着发送自己的消息 {#8-try-your-own-message}


```python
your_message = "What should I focus on this month with my training?"  # 修改这条消息！

print(f"You: {your_message}")
print("-" * 40)
print(f"Assistant: {chat(your_message)}")
```

## 9. 清理 {#9-cleanup}


```python
hindsight.close()
print("Client connection closed.")
```
