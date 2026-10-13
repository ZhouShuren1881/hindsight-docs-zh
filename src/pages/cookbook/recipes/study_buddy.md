---
sidebar_position: 11
---

# 拥有 Hindsight 记忆的学习伙伴 {#study-buddy-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/study_buddy.ipynb)
:::


个性化学习助手，跟踪已学内容、识别知识空缺并辅助间隔重复。

## 功能 {#features}
- 跟踪学习过程和主题
- 观察各主题的熟悉程度
- 识别知识空缺
- 建议间隔重复复习主题

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

USER_ID = "student-demo"

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def record_study_session(topic: str, notes: str, confidence: str = "medium") -> str:
    """记录主题、笔记和自评熟悉程度。"""
    today = datetime.now().strftime("%B %d, %Y")

    content = f"""{today} - 学习记录
主题：{topic}
熟悉程度：{confidence}
笔记：{notes}"""

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

    return f"已记录 '{topic}' 学习（熟悉程度：{confidence}）"


def record_question(topic: str, question: str, understood: bool) -> str:
    """记录学习中提出的问题。"""
    today = datetime.now().strftime("%B %d, %Y")

    content = f"""{today} - 问题
主题：{topic}
问题：{question}
已理解：{"是" if understood else "否，需要复习"}"""

    hindsight.retain(
        bank_id=USER_ID,
        content=content,
        metadata={
            "category": "question",
            "topic": topic,
            "understood": str(understood),
        },
    )

    return f"已记录 '{topic}' 的问题"


def study_buddy(user_query: str) -> str:
    """与学习伙伴交互。"""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"学习 主题 笔记 问题 {user_query}",
        budget="high",
    )

    memory_context = ""
    if memories and memories.results:
        memory_context = "\n".join(f"- {m.text}" for m in memories.results[:8])

    system_prompt = f"""你是有帮助的学习伙伴和导师。
可访问学生的学习历史，包括：
- 已学主题和笔记
- 自评熟悉程度
- 提过的问题，以及是否理解答案

学习历史：
{memory_context if memory_context else "尚无学习历史。"}

你的职责：
1. 回答正在学习的主题问题
2. 根据历史识别知识空缺
3. 建议复习主题，支持间隔重复
4. 提供鼓励和学习技巧
5. 将新概念与已学内容联系

保持支持性和教学性，相关时引用此前学习。"""

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
        content=f"学生询问：{user_query}\n提供的解释：{answer[:300]}...",
        metadata={"category": "tutoring"},
    )

    return answer


def get_review_suggestions() -> str:
    """获取复习主题建议。"""
    suggestions = hindsight.reflect(
        bank_id=USER_ID,
        query="""分析学习历史并建议：
        1. 熟悉程度低、需要复习的主题
        2. 很久前学过、应重新回顾的主题
        3. 未充分理解的问题
        4. 可能遗漏的主题关联

        按对理解改善的价值排序。""",
        budget="high",
    )
    return suggestions.text if hasattr(suggestions, 'text') else str(suggestions)


def get_knowledge_summary(topic: str = None) -> str:
    """总结学生掌握的知识。"""
    query = f"总结学生对{topic}的了解" if topic else \
            "总结学生整体知识与进度"

    summary = hindsight.reflect(
        bank_id=USER_ID,
        query=query,
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)

print("辅助函数定义完成！")
```

## 5. 记录学习过程 {#5-record-study-sessions}


```python
print("正在记录学习过程……")

sessions = [
    {
        "topic": "经典力学：牛顿定律",
        "notes": "学习 F=ma、作用反作用和惯性，完成斜面问题。",
        "confidence": "high",
    },
    {
        "topic": "经典力学：动量守恒",
        "notes": "弹性与非弹性碰撞，二维碰撞题较困难。",
        "confidence": "low",
    },
    {
        "topic": "经典力学：广义坐标",
        "notes": "初步学习拉格朗日力学与自由度。",
        "confidence": "medium",
    },
    {
        "topic": "波动：简谐运动",
        "notes": "简谐运动方程、周期、频率，与弹簧和摆联系。",
        "confidence": "high",
    },
    {
        "topic": "波动：频域",
        "notes": "开始学习傅里叶变换，数学部分难懂，需练习。",
        "confidence": "low",
    },
]

for session in sessions:
    result = record_study_session(**session)
    print(f"  {result}")
```

## 6. 记录问题 {#6-record-questions}


```python
print("正在记录问题……")

questions = [
    ("动量守恒", "碰撞中为什么动量守恒？", True),
    ("动量守恒", "如何解二维碰撞题？", False),
    ("广义坐标", "拉格朗日方法相对牛顿方法有什么优势？", True),
    ("频域", "何时用傅里叶变换，何时用拉普拉斯变换？", False),
]

for topic, question, understood in questions:
    result = record_question(topic, question, understood)
    print(f"  {result}")
```

## 7. 交互学习 {#7-interactive-study-session}


```python
import time

print("=" * 60)
print("  学习对话")
print("=" * 60)

queries = [
    "再解释一下广义坐标好吗？记得学过，但细节模糊。",
    "下周考试前应复习什么？",
    "二维碰撞仍不懂，能带我解一个例题吗？",
]

for query in queries:
    print(f"\n学生：{query}")
    print("-" * 40)
    response = study_buddy(query)
    print(f"学习伙伴：{response}")
    time.sleep(1)
```

## 8. 获取复习建议 {#8-get-review-suggestions}


```python
print("=" * 60)
print("  推荐复习主题")
print("=" * 60)
print(get_review_suggestions())
```

## 9. 知识摘要 {#9-knowledge-summary}


```python
print("=" * 60)
print("  知识摘要")
print("=" * 60)
print(get_knowledge_summary())
```

## 10. 尝试自己的问题 {#10-try-your-own-question}


```python
your_question = "我目前最大的知识空缺是什么？"  # 可修改此问题

print(f"你：{your_question}")
print("-" * 40)
print(f"学习伙伴：{study_buddy(your_question)}")
```

## 11. 清理 {#11-cleanup}


```python
hindsight.close()
print("客户端连接已关闭。")
```
