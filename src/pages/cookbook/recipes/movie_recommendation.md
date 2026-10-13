---
sidebar_position: 8
---

# 拥有 Hindsight 记忆的电影推荐助手 {#movie-recommendation-assistant-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/movie_recommendation.ipynb)
:::


个性化推荐助手，记住偏好、观影历史和品味，让建议逐步改善。

## 功能 {#features}
- 记住喜欢的类型、导演和演员
- 跟踪看过并喜欢的电影
- 根据心情提供相关建议

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

from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端，连接本地 Docker 实例
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

# 初始化 OpenAI 客户端
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 用户记忆库的唯一标识符
USER_ID = "movie-fan-demo"

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}

函数演示三个核心操作：
- **retain()**：存储记忆
- **recall()**：检索相关记忆
- **reflect()**：综合记忆形成洞察


```python
def get_recommendation(user_query: str) -> str:
    """
    根据查询和记忆中的偏好推荐电影。
    """
    # 召回用户电影偏好的相关记忆
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"电影 偏好 品味 类型 {user_query}",
        budget="mid",
    )

    # 根据记忆构建上下文
    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(
            f"- {m.text}" for m in memories.results[:5]
        )

    # 结合上下文生成推荐
    system_prompt = f"""你是有帮助的电影推荐助手。
记住用户偏好和过去对话，提供个性化建议。

你对用户的了解：
{memory_context if memory_context else "尚未记录偏好。"}

根据品味给出经过考虑的个性化建议。
提及新偏好时，确认你已了解。"""

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

    # 存储交互，供未来使用
    hindsight.retain(
        bank_id=USER_ID,
        content=f"用户询问：{user_query}\n推荐：{recommendation}",
        metadata={"category": "movie_recommendation"},
    )

    return recommendation


def store_preference(preference: str) -> None:
    """存储明确的用户偏好。"""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"用户偏好：{preference}",
        metadata={"category": "preference"},
    )
    print(f"已存储偏好：{preference}")


def get_preference_summary() -> str:
    """总结已了解的电影品味。"""
    summary = hindsight.reflect(
        bank_id=USER_ID,
        query="总结用户的电影偏好、喜欢的类型和演员，以及喜欢或不喜欢的电影。",
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("辅助函数定义完成！")
```

## 5. 运行演示 {#5-run-the-demo}

观察助手如何跨对话学习和记住偏好。


```python
import time

print("=" * 60)
print("  具有记忆的电影推荐助手")
print("=" * 60)
print()

# 模拟持续对话
conversations = [
    "今晚想看电影，有什么推荐？",
    "特别喜欢《盗梦空间》和《星际穿越》，Christopher Nolan 很棒！",
    "推荐类似的电影吧，我喜欢烧脑情节。",
    "现在不想看沉重的，来点轻松的？",
    "上周看了《布达佩斯大饭店》，很喜欢！",
    "今晚该看什么？记得我的偏好！",
]

for i, query in enumerate(conversations, 1):
    print(f"\n[对话 {i}]")
    print(f"用户：{query}")
    print("-" * 40)

    response = get_recommendation(query)
    print(f"助手：{response}")
    print()

    time.sleep(1)
```

## 6. 查看已学到的偏好 {#6-view-learned-preferences}

使用 `reflect()` 综合 Hindsight 已了解的电影品味。


```python
print("=" * 60)
print("  已了解的电影品味：")
print("=" * 60)
print(get_preference_summary())
```

## 7. 尝试自己的查询 {#7-try-your-own-queries}

尝试输入自己的电影偏好。


```python
# 尝试自己的查询
your_query = "我想看科幻惊悚片"  # 可修改此问题

print(f"你：{your_query}")
print("-" * 40)
print(f"助手：{get_recommendation(your_query)}")
```

## 8. 清理 {#8-cleanup}

关闭 Hindsight 客户端连接。


```python
hindsight.close()
print("客户端连接已关闭。")
```


```python

```


```python

```
