---
sidebar_position: 11
---

# 基于 Hindsight 记忆的学习伙伴 {#study-buddy-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/study_buddy.ipynb)
:::


个性化学习助手，可跟踪学习内容、识别知识空缺，并帮助安排间隔复习。

## 功能 {#features}
- 跟踪学习过程和已学主题
- 监测各主题的信心水平
- 识别知识空缺
- 建议通过间隔复习回顾相关主题

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 在本地通过 Docker 运行 Hindsight（设置方法见下文）

## 在本地启动 Hindsight {#start-hindsight-locally}

运行此笔记本前，请先在终端启动 Hindsight：

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

按提示输入 OpenAI API 密钥；Hindsight 和本演示都会使用此密钥。


```python
import getpass
import os

# 设置 Hindsight 和本演示共用的 OpenAI API 密钥
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

USER_ID = "student-demo"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def record_study_session(topic: str, notes: str, confidence: str = "medium") -> str:
    """Record a study session with topic, notes, and self-assessed confidence."""
    today = datetime.now().strftime("%B %d, %Y")

    content = f"""{today} - STUDY SESSION
Topic: {topic}
Confidence Level: {confidence}
Notes: {notes}"""

    hindsight.retain(
        bank_id=USER_ID,
        content=content,
        metadata={
            "category": "study_session",
            "topic": topic,
            "confidence": confidence,
            "date": today,
        },
    )

    return f"Recorded study session on '{topic}' (confidence: {confidence})"


def record_question(topic: str, question: str, understood: bool) -> str:
    """Record a question asked during study."""
    today = datetime.now().strftime("%B %d, %Y")

    content = f"""{today} - QUESTION
Topic: {topic}
Question: {question}
Understood: {"Yes" if understood else "No - needs review"}"""

    hindsight.retain(
        bank_id=USER_ID,
        content=content,
        metadata={
            "category": "question",
            "topic": topic,
            "understood": str(understood),
        },
    )

    return f"Recorded question on '{topic}'"


def study_buddy(user_query: str) -> str:
    """Interact with the study buddy."""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"study session topic notes questions {user_query}",
        budget="high",
    )

    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(f"- {m.text}" for m in memories.results[:8])

    system_prompt = f"""You are a helpful study buddy and tutor.
You have access to the student's study history, including:
- Topics they've studied and their notes
- Their self-assessed confidence levels
- Questions they've asked and whether they understood the answers

Study History:
{memory_context if memory_context else "No study history recorded yet."}

Your role:
1. Answer questions about topics they're studying
2. Identify knowledge gaps based on their history
3. Suggest topics to review (spaced repetition)
4. Provide encouragement and study tips
5. Connect new concepts to things they've already learned

Be supportive and pedagogical. Reference their previous learning when relevant."""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0.7,
        max_tokens=800,
    )

    answer = response.choices[0].message.content

    hindsight.retain(
        bank_id=USER_ID,
        content=f"Student asked: {user_query}\nExplanation given: {answer[:300]}...",
        metadata={"category": "tutoring"},
    )

    return answer


def get_review_suggestions() -> str:
    """Get suggestions for topics to review."""
    suggestions = hindsight.reflect(
        bank_id=USER_ID,
        query="""Analyze this student's study history and suggest:
        1. Topics with low confidence that need more review
        2. Topics studied a while ago that should be revisited
        3. Questions that weren't fully understood
        4. Connections between topics they might have missed

        Prioritize by what would most improve their understanding.""",
        budget="high",
    )
    return suggestions.text if hasattr(suggestions, 'text') else str(suggestions)


def get_knowledge_summary(topic: str = None) -> str:
    """Get a summary of what the student knows."""
    query = f"Summarize what this student knows about {topic}" if topic else \
            "Summarize this student's overall knowledge and progress"

    summary = hindsight.reflect(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("Helper functions defined!")
```

## 5. 记录学习过程 {#5-record-study-sessions}


```python
print("Recording study sessions...")

sessions = [
    {
        "topic": "Classical Mechanics - Newton's Laws",
        "notes": "Covered F=ma, action-reaction pairs, inertia. Solved problems on inclined planes.",
        "confidence": "high",
    },
    {
        "topic": "Classical Mechanics - Conservation of Momentum",
        "notes": "Elastic vs inelastic collisions. Struggled with 2D collision problems.",
        "confidence": "low",
    },
    {
        "topic": "Classical Mechanics - Generalized Coordinates",
        "notes": "Introduction to Lagrangian mechanics. Degrees of freedom concept.",
        "confidence": "medium",
    },
    {
        "topic": "Waves - Simple Harmonic Motion",
        "notes": "SHM equations, period, frequency. Connected to springs and pendulums.",
        "confidence": "high",
    },
    {
        "topic": "Waves - Frequency Domain",
        "notes": "Started Fourier transforms. Math is confusing, need more practice.",
        "confidence": "low",
    },
]

for session in sessions:
    result = record_study_session(**session)
    print(f"  {result}")
```

## 6. 记录问题 {#6-record-questions}


```python
print("Recording questions...")

questions = [
    ("Conservation of Momentum", "Why is momentum conserved in collisions?", True),
    ("Conservation of Momentum", "How do I solve 2D collision problems?", False),
    ("Generalized Coordinates", "What's the advantage of Lagrangian over Newtonian?", True),
    ("Frequency Domain", "When do I use Fourier transforms vs Laplace?", False),
]

for topic, question, understood in questions:
    result = record_question(topic, question, understood)
    print(f"  {result}")
```

## 7. 互动学习过程 {#7-interactive-study-session}


```python
import time

print("=" * 60)
print("  Study Session")
print("=" * 60)

queries = [
    "Can you explain generalized coordinates again? I remember we covered it but I'm fuzzy on the details.",
    "What topics should I review before my exam next week?",
    "I'm still confused about 2D collision problems. Can you walk me through an example?",
]

for query in queries:
    print(f"\nStudent: {query}")
    print("-" * 40)
    response = study_buddy(query)
    print(f"Study Buddy: {response}")
    time.sleep(1)
```

## 8. 获取复习建议 {#8-get-review-suggestions}


```python
print("=" * 60)
print("  Recommended Review Topics")
print("=" * 60)
print(get_review_suggestions())
```

## 9. 知识总结 {#9-knowledge-summary}


```python
print("=" * 60)
print("  Knowledge Summary")
print("=" * 60)
print(get_knowledge_summary())
```

## 10. 尝试提出自己的问题 {#10-try-your-own-question}


```python
your_question = "What are my biggest knowledge gaps right now?"  # 可替换为自己的问题

print(f"You: {your_question}")
print("-" * 40)
print(f"Study Buddy: {study_buddy(your_question)}")
```

## 11. 清理 {#11-cleanup}


```python
hindsight.close()
print("Client connection closed.")
```
