---
title: "5 分钟内让您的 OpenAI 应用程序记忆"
authors: [benfrank241]
date: 2026-03-05T12:00
tags: [memory, openai, python, docker, rag, llm, vector, embedding, tutorial]
image: /img/blog/add-memory-to-openai-application.webp
hide_table_of_contents: true
---

使用OpenAISDK和Hindsight构建具有持久记忆的ChatGPT式聊天机器人。三个 API 调用 — `retain()`、`recall()`、`reflect()` — 您的应用程序会在重新启动后记住用户，无需向量数据库或 RAG 管道。

<!-- truncate -->

## 概览 {#tldr}

您将构建一个ChatGPT风格的聊天机器人：

- 重新启动时记住事实
- 自动回忆相关上下文
- 按需综合长期知识

全部包含三个 API 调用：

- `retain()` — 存储记忆
- `recall()` — 检索相关的
- `reflect()` — 综合一切

没有矢量数据库。无嵌入管道。没有RAG管道。

复制、粘贴、运行。

---

## 问题：你的聊天机器人有失忆症 {#the-problem-your-chatbot-has-amnesia}

您使用OpenAI构建一个聊天机器人：

```python
messages = [{"role": "system", "content": "你是一个有用的助手。"}]
```

效果很好。

直到您重新启动该过程。

现在它什么都不记得了。

您可以将`messages`序列化到磁盘。但随后：

- 上下文窗口填满
- token成本爆炸
- 你开始截断历史
- 助理忘记了早期的决定

我们遇到了这栋大楼 Jerri，我们 Vectorize 的内部 AI 项目经理。

Jerri 住在 Slack 中。它提取会议记录、跟踪行动项目并回答“我们对 X 做了什么决定？”没有持久的记忆，每一节课都从零开始。

那不是记忆。这是无状态自动完成。

你真正需要的是：

1. 存储发生的事实
2. 仅检索相关内容
3. 必要时合成

这就是我们正在构建的。

---

## 建筑 {#architecture}

这是整个循环：

```
User message
     ↓
recall(query)      ← pull relevant memories
     ↓
OpenAI completion  ← inject memory into system prompt
     ↓
retain(exchange)   ← store conversation
     ↓
Response
```

三通电话。 Jerri 在生产中运行相同的模式。

---

## 第 1 步 — 启动记忆层 {#step-1--start-the-memory-layer}

安装：

```bash
pip install hindsight-all
```

启动服务器：

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY

hindsight-api
```

它在`http://localhost:8888`本地运行。

它包括：

- 嵌入式Postgres
- 事实提取
- 语义搜索
- 知识图谱
- 合成引擎

没有外部基础设施。

> **不想自行托管？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 为您提供相同的 API，无需任何设置 — 只需将 `base_url` 交换为您的云端点即可。

---

## 第 2 步 — 基线聊天（无记忆） {#step-2--baseline-chat-no-memory}

让我们从损坏的版本开始：

```python
from openai import OpenAI

openai = OpenAI()
messages = [{"role": "system", "content": "你是一个有用的助手。"}]

while True:
    user_input = input("You: ")
    if user_input in ("quit", "exit"):
        break

    messages.append({"role": "user", "content": user_input})

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )

    reply = response.choices[0].message.content
    messages.append({"role": "assistant", "content": reply})

    print(reply)
```

效果很好。

重新启动。

问：“我叫什么名字？”

茫然地凝视。

---

## 步骤 3 — 添加 `retain()` {#step-3--add-retain}

创建一个记忆库：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="chatbot",
    name="聊天机器人记忆",
    reflect_mission="记住用户偏好和重要事实。",
)
```

现在记忆存储每次交换：

```python
hindsight.retain(
    bank_id="chatbot",
    content=f"User: {user_input}\nAssistant: {reply}",
)
```

就是这样。

Hindsight 提取事实、识别实体、建立关系并将其存储在知识图中。这些你都管不了。

---

## 步骤 4 — 添加 `recall()` {#step-4--add-recall}

调用OpenAI之前，调取相关记忆：

```python
memories = hindsight.recall(
    bank_id="chatbot",
    query=user_input,
    budget="low",
)

memory_context = "\n".join(r.text for r in memories.results)
```

在系统提示符下注入：

```python
system_prompt = "你是一个有用的助手。"

if memory_context:
    system_prompt += "\n\n此前相关上下文：\n" + memory_context
```

现在：

1. 告诉它你的名字
2. 重启
3. 再问一次

它记得。因为`recall`将相关的过去事实注入到提示中。

---

## 步骤 5 — 添加 `reflect()` 进行合成 {#step-5--add-reflect-for-synthesis}

`recall` 返回事实。 `reflect` 返回推理。

对于以下问题：

- “你对我了解多少？”
- “总结一下我们的谈话。”
- “你看到了什么图案？”

使用反思：

```python
reflection = hindsight.reflect(
    bank_id="chatbot",
    query=user_input,
)

memory_context = reflection.text
```

铰遍历知识图谱，运行LLM推理链，跨记忆进行综合。

在 Jerri 中，反思支持每周总结、冲刺评审和交叉会议分析。在您的聊天机器人中，它处理“退后一步思考”查询。

---

## 完整工作示例 {#full-working-example}

将其复制到`chat.py`：

```python
from openai import OpenAI
from hindsight_client import Hindsight

openai = OpenAI()
hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="chatbot",
    name="聊天机器人记忆",
    reflect_mission="记住用户偏好和关键事实。",
)

SYSTEM_PROMPT = "你是一个有长期记忆力的得力助手。"

SYNTHESIS_KEYWORDS = [
    "summarize",
    "你对我了解多少",
    "我们聊了什么",
]


def get_memory_context(user_input):
    if any(k in user_input.lower() for k in SYNTHESIS_KEYWORDS):
        reflection = hindsight.reflect(
            bank_id="chatbot",
            query=user_input,
        )
        return reflection.text

    memories = hindsight.recall(
        bank_id="chatbot",
        query=user_input,
        budget="low",
    )
    return "\n".join(r.text for r in memories.results)


def main():
    conversation = []

    print("带记忆的聊天，输入 'quit' 退出。\n")

    while True:
        user_input = input("You: ")
        if user_input in ("quit", "exit"):
            break

        memory_context = get_memory_context(user_input)

        conversation.append({"role": "user", "content": user_input})

        system = SYSTEM_PROMPT
        if memory_context:
            system += "\n\nRelevant context:\n" + memory_context

        messages = [{"role": "system", "content": system}] + conversation

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )

        reply = response.choices[0].message.content
        conversation.append({"role": "assistant", "content": reply})

        print(f"\nAssistant: {reply}\n")

        hindsight.retain(
            bank_id="chatbot",
            content=f"User: {user_input}\nAssistant: {reply}",
        )


if __name__ == "__main__":
    main()
```

运行：

```bash
export OPENAI_API_KEY=YOUR_KEY
python chat.py
```

重新启动。它仍然记得。

---

## 制作课程（来自 Building Jerri） {#production-lessons-from-building-jerri}

**1。 回复后记忆存储。** 否则助手会记住问题但不记得答案。

**2。使用 `budget="low"` 进行聊天循环。** 亚秒级延迟。仅在需要时升级。

**​​3。多用户应用程序中每个用户一个记忆库。** 否则记忆会在用户之间泄漏。

**4。设定一个使命。** 事实提取质量很大程度上取决于它。

**5。从保留一切开始。** 稍后优化。

---

## 何时使用此模式 {#when-to-use-this-pattern}

**在以下情况下使用它：**

- 你需要跨会话记忆
- 你想要跨时间的综合
- 你不想构建RAG基础设施

**如果出现以下情况，请勿使用它：**

- 你只需要单会话上下文
- 您正在存储结构化数据库记录

这解决了“聊天历史”和“知识库”之间的空间。

---

## 要记住的模式 {#the-pattern-to-remember}

- `retain` — 回复后
- `recall` — 回复之前
- `reflect` — 合成时

这就是循环。

这就是 Jerri 在数周会议中的动力。

这就是您在 15 分钟内刚刚构建的内容。

---

## 后续步骤 {#next-steps}

- **添加每个用户记忆库** 每个用户具有唯一的 `bank_id`
- **使用标签**用于范围记忆（`tags`用于记忆存储，`tags_match`用于记忆召回）
- **添加结构化JSON输出** 与 `response_schema` 反思
- **在 Web UI 中检查记忆** `localhost:9999` 经 Docker
- **尝试[托管 Hindsight](https://ui.hindsight.vectorize.io)**而不是自托管

持久记忆将聊天机器人变成智能体。

现在你记得了。
