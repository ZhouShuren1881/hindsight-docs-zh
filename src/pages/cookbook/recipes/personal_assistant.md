---
sidebar_position: 9
---

# 拥有 Hindsight 记忆的个人 AI 助手 {#personal-ai-assistant-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/personal_assistant.ipynb)
:::


通用个人助手，记住偏好、日程、家人、工作上下文和过去对话。

## 功能 {#features}
- 记住家庭、工作和个人信息
- 跟踪偏好和习惯
- 帮助安排日程与提醒
- 跨对话保持上下文

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行 Hindsight，配置见下文

## 本地启动 Hindsight {#start-hindsight-locally}

运行笔记本前，在终端启动 Hindsight：

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

按提示输入 OpenAI API 密钥，Hindsight 和演示共同使用。


```python
import getpass
import os

# 设置 Hindsight 与演示共同使用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("请输入 OpenAI API 密钥：")

print("API 密钥配置完成！")
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

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def remember(info: str, category: str = "general") -> str:
    """存储需要记住的信息。"""
    today = datetime.now().strftime("%B %d, %Y")

    hindsight.retain(
        bank_id=USER_ID,
        content=f"{today}: {info}",
        metadata={"category": category, "date": today},
    )

    return f"我会记住：{info}"


def recall_context(query: str) -> str:
    """召回相关上下文。"""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:8])
    return ""


def chat(user_message: str) -> str:
    """与个人助手对话。"""
    context = recall_context(user_message)

    system_prompt = f"""你是具有长期记忆的个人 AI 助手。
记住用户偏好、日程、家人、工作上下文和过去对话。

你记得的用户信息：
{context if context else "尚无记忆。"}

你的能力：
- 用户要求时记住信息，例如“记住”“别忘了”
- 召回过去信息，例如“我告诉过你什么”“什么时候”
- 根据已知偏好提供个性化建议
- 帮助安排日程与提醒
- 自然对话并保持上下文

主动提供帮助，自然引用相关记忆。"""

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

    # 检查用户是否要求记住内容
    lower_msg = user_message.lower()
    if any(phrase in lower_msg for phrase in ["remember that", "don't forget", "remind me", "note that", "记住", "别忘了", "提醒我", "记录"]):
        hindsight.retain(
            bank_id=USER_ID,
            content=f"用户要求记住：{user_message}",
            metadata={"category": "reminder"},
        )

    # 存储交互
    hindsight.retain(
        bank_id=USER_ID,
        content=f"对话 - 用户：{user_message[:100]} | 助手：{answer[:100]}",
        metadata={"category": "conversation"},
    )

    return answer


def get_summary(topic: str = None) -> str:
    """生成记忆摘要。"""
    query = f"总结你了解的{topic}" if topic else \
            "总结你对用户的全部了解"

    summary = hindsight.reflect(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("辅助函数定义完成！")
```

## 5. 建立上下文 {#5-build-context}


```python
print("正在建立上下文……")

initial_context = [
    ("我是 Alex，在 TechCorp 担任产品经理", "personal"),
    ("妻子叫 Sarah，有两个孩子：Emma 七岁，Jack 四岁", "family"),
    ("偏好上午开会，下午留给深度工作", "preference"),
    ("母亲生日是三月十五日", "event"),
    ("希望增加阅读，正在读《原子习惯》", "hobby"),
    ("每周一上午十点团队站会", "schedule"),
    ("对猫过敏", "health"),
    ("最喜欢燕麦奶馥芮白", "preference"),
    ("正在为四月半程马拉松训练", "goal"),
]

for info, category in initial_context:
    result = remember(info, category)
    print(f"  {result}")
```

## 6. 开始对话 {#6-have-a-conversation}


```python
import time

print("=" * 60)
print("  对话")
print("=" * 60)

conversations = [
    "妻子叫什么来着？",
    "记住，第一季度评审是下周四下午两点",
    "母亲生日该送什么礼物？",
    "周一站会几点？",
    "推荐适合我的咖啡吧。",
    "我正在读什么书？",
]

for message in conversations:
    print(f"\nAlex: {message}")
    print("-" * 40)
    response = chat(message)
    print(f"助手：{response}")
    time.sleep(1)
```

## 7. 查看摘要 {#7-view-summary}


```python
print("=" * 60)
print("  我对你的了解")
print("=" * 60)
print(get_summary())
```


```python
print("=" * 60)
print("  你的家人")
print("=" * 60)
print(get_summary("家人"))
```

## 8. 尝试自己的消息 {#8-try-your-own-message}


```python
your_message = "本月训练应重点关注什么？"  # 可修改此问题

print(f"你：{your_message}")
print("-" * 40)
print(f"助手：{chat(your_message)}")
```

## 9. 清理 {#9-cleanup}


```python
hindsight.close()
print("客户端连接已关闭。")
```
