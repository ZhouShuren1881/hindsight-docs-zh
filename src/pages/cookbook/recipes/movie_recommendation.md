---
sidebar_position: 8
---

# 使用 Hindsight 记忆的电影推荐助手 {#movie-recommendation-assistant-with-hindsight-memory}


:::tip 运行此笔记本
本示例提供可交互的 Jupyter 笔记本。
[**在 GitHub 中打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/movie_recommendation.ipynb)
:::


这是一款个性化电影推荐助手。它会记住你的偏好、观影记录和品味，随着时间推移给出更合适的建议。

## 功能 {#features}
- 记住你喜欢的电影类型、导演和演员
- 记录你看过并喜欢的电影
- 根据你的心情提供有针对性的推荐

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行的 Hindsight（设置方法见下文）

## 在本地启动 Hindsight {#start-hindsight-locally}

运行此笔记本前，先在终端中启动 Hindsight：

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

按提示输入 OpenAI API 密钥，Hindsight 和此演示都会使用该密钥。


```python
import getpass
import os

# 设置 Hindsight 和演示共用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

print("API key configured!")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端（连接本地 Docker 实例）
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

# 初始化 OpenAI 客户端
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 此用户记忆库的唯一标识符
USER_ID = "movie-fan-demo"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}

以下函数演示 Hindsight 的三个核心操作：
- **retain()**：存入记忆
- **recall()**：召回相关记忆
- **reflect()**：基于记忆进行反思


```python
def get_recommendation(user_query: str) -> str:
    """
    Get a movie recommendation based on user query and remembered preferences.
    """
    # 召回与该用户电影偏好相关的记忆
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"movie preferences tastes genres {user_query}",
        budget="mid",
    )

    # 根据记忆构建上下文
    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(
            f"- {m.text}" for m in memories.results[:5]
        )

    # 结合上下文生成推荐
    system_prompt = f"""You are a helpful movie recommendation assistant.
You remember the user's preferences and past conversations to give personalized suggestions.

What you know about this user:
{memory_context if memory_context else "No previous preferences recorded yet."}

Give thoughtful, personalized recommendations based on their tastes.
If they mention new preferences, acknowledge them."""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0.7,
        max_tokens=500,
    )

    recommendation = response.choices[0].message.content

    # 存储本次交互，供后续使用
    hindsight.retain(
        bank_id=USER_ID,
        content=f"User asked: {user_query}\nRecommendation given: {recommendation}",
        metadata={"category": "movie_recommendation"},
    )

    return recommendation


def store_preference(preference: str) -> None:
    """Store an explicit user preference."""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"User preference: {preference}",
        metadata={"category": "preference"},
    )
    print(f"Stored preference: {preference}")


def get_preference_summary() -> str:
    """Get a summary of what we know about the user's movie tastes."""
    summary = hindsight.reflect(
        bank_id=USER_ID,
        query="Summarize this user's movie preferences, favorite genres, actors they like, and movies they've mentioned enjoying or disliking.",
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("Helper functions defined!")
```

## 5. 运行演示 {#5-run-the-demo}

观察助手如何在多次对话中逐渐了解并记住用户偏好。


```python
import time

print("=" * 60)
print("  Movie Recommendation Assistant with Memory")
print("=" * 60)
print()

# 模拟一段持续一段时间的对话
conversations = [
    "I'm looking for a movie to watch tonight. Any suggestions?",
    "I really loved Inception and Interstellar. Christopher Nolan is amazing!",
    "Can you suggest something similar to those? I like mind-bending plots.",
    "Actually, I'm not in the mood for something heavy. Something lighter?",
    "I watched The Grand Budapest Hotel last week and loved it!",
    "What should I watch tonight? Remember what I like!",
]

for i, query in enumerate(conversations, 1):
    print(f"\n[Conversation {i}]")
    print(f"User: {query}")
    print("-" * 40)

    response = get_recommendation(query)
    print(f"Assistant: {response}")
    print()

    time.sleep(1)
```

## 6. 查看已了解的偏好 {#6-view-learned-preferences}

使用 `reflect()` 综合 Hindsight 对你电影品味的了解。


```python
print("=" * 60)
print("  What I've learned about your movie tastes:")
print("=" * 60)
print(get_preference_summary())
```

## 7. 尝试自行提问 {#7-try-your-own-queries}

试着输入你自己的电影偏好！


```python
# 试着输入自己的查询！
your_query = "I'm in the mood for a sci-fi thriller"  # 可以修改这里！

print(f"You: {your_query}")
print("-" * 40)
print(f"Assistant: {get_recommendation(your_query)}")
```

## 8. 清理 {#8-cleanup}

关闭 Hindsight 客户端连接。


```python
hindsight.close()
print("Client connection closed.")
```


```python

```


```python

```
