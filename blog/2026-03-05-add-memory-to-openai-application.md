---
title: "5 分钟为你的 OpenAI 应用添加记忆"
authors: [benfrank241]
date: 2026-03-05T12:00
tags: [memory, openai, python, docker, rag, llm, vector, embedding, tutorial]
image: /img/blog/add-memory-to-openai-application.webp
hide_table_of_contents: true
---

使用 OpenAI SDK 和 Hindsight，构建一个具有持久记忆的 ChatGPT 式聊天机器人。只需调用三个 API：`retain()`、`recall()` 和 `reflect()`，应用重启后仍能记住用户，无需向量数据库或 RAG 流程。

<!-- truncate -->

## 概要 {#tldr}

你将构建一个 ChatGPT 式聊天机器人，让它能够：

- 在重启后仍记得事实
- 自动召回相关上下文
- 按需综合长期知识

这一切只需调用三个 API：

- `retain()` — 存入记忆
- `recall()` — 检索相关记忆
- `reflect()` — 综合全部记忆

无需向量数据库，无需嵌入流程，也无需搭建 RAG 基础设施。

复制、粘贴、运行即可。

---

## 问题：你的聊天机器人会失忆 {#the-problem-your-chatbot-has-amnesia}

你用 OpenAI 构建了一个聊天机器人：

```python
messages = [{"role": "system", "content": "You are a helpful assistant."}]
```

一切运行良好。

直到你重启进程。

它就什么都不记得了。

你可以把 `messages` 序列化到磁盘。但这样一来：

- 上下文窗口会被占满
- token 成本会急剧上升
- 你会开始截断历史记录
- 助手会忘记早先做出的决定

我们在为 Vectorize 构建内部 AI 项目经理 Jerri 时也遇到了这个问题。

Jerri 运行在 Slack 中。它会摄取会议记录、跟踪行动事项，并回答“我们对 X 做了什么决定？”之类的问题。没有持久记忆，每次会话都得从头开始。

那不叫记忆，只是无状态的自动补全。

你真正需要的是：

1. 事实发生时就将其存入
2. 只检索相关内容
3. 必要时进行综合

这就是我们要构建的功能。

---

## 架构 {#architecture}

完整流程如下：

```
用户消息
     ↓
recall(query)      ← 提取相关记忆
     ↓
OpenAI completion  ← 将记忆注入系统提示词
     ↓
retain(exchange)   ← 存储对话
     ↓
响应
```

总共调用三次 API。这也是 Jerri 在生产环境中使用的模式。

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

服务会在本地的 `http://localhost:8888` 运行。

其中包括：

- 内嵌式 Postgres
- 事实提取
- 语义检索
- 知识图谱
- 综合引擎

无需外部基础设施。

> **不想自行托管？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 提供相同的 API，无需任何设置；只需将 `base_url` 换成你的 Cloud 端点即可。

---

## 第 2 步 — 基础聊天（无记忆） {#step-2--baseline-chat-no-memory}

先来看这个有缺陷的版本：

```python
from openai import OpenAI

openai = OpenAI()
messages = [{"role": "system", "content": "You are a helpful assistant."}]

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

运行得很好。

重启它。

问：“我叫什么名字？”

它只会茫然地看着你。

---

## 第 3 步 — 添加 `retain()` {#step-3--add-retain}

创建一个记忆库：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="chatbot",
    name="Chatbot Memory",
    reflect_mission="Remember user preferences and important facts.",
)
```

现在，把每轮对话都存入记忆库：

```python
hindsight.retain(
    bank_id="chatbot",
    content=f"User: {user_input}\nAssistant: {reply}",
)
```

就是这样。

Hindsight 会提取事实、识别实体、建立关系，并将它们存储在知识图谱中。所有这些都无需你管理。

---

## 第 4 步 — 添加 `recall()` {#step-4--add-recall}

调用 OpenAI 之前，先检索相关记忆：

```python
memories = hindsight.recall(
    bank_id="chatbot",
    query=user_input,
    budget="low",
)

memory_context = "\n".join(r.text for r in memories.results)
```

将记忆注入系统提示词：

```python
system_prompt = "You are a helpful assistant."

if memory_context:
    system_prompt += "\n\nRelevant past context:\n" + memory_context
```

现在：

1. 告诉它你的名字
2. 重启
3. 再问一次

它会记住，因为 `recall` 会把相关的过往事实注入提示词。

---

## 第 5 步 — 使用 `reflect()` 综合记忆 {#step-5--add-reflect-for-synthesis}

`recall` 返回事实，`reflect` 返回推理结果。

对于这类问题：

- “你对我了解多少？”
- “总结一下我们的对话。”
- “你发现了哪些规律？”

可以使用 reflect：

```python
reflection = hindsight.reflect(
    bank_id="chatbot",
    query=user_input,
)

memory_context = reflection.text
```

Reflect 会遍历知识图谱，运行 LLM 推理链，并综合多条记忆中的信息。

在 Jerri 中，reflect 用于生成每周摘要、冲刺回顾和跨会议分析。对于你的聊天机器人，它可以处理“退一步想想”这类问题。

---

## 完整示例 {#full-working-example}

将以下代码复制到 `chat.py`：

```python
from openai import OpenAI
from hindsight_client import Hindsight

openai = OpenAI()
hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="chatbot",
    name="Chatbot Memory",
    reflect_mission="Remember user preferences and key facts.",
)

SYSTEM_PROMPT = "You are a helpful assistant with long-term memory."

SYNTHESIS_KEYWORDS = [
    "summarize",
    "what do you know about me",
    "what have we talked about",
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

    print("Chat with memory. Type 'quit' to exit.\n")

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

重启后，它仍然记得。

---

## 生产环境经验（构建 Jerri 的经验） {#production-lessons-from-building-jerri}

**1. 回复后再存入记忆。** 否则，助手会记住问题，却不记得自己的回答。

**2. 在聊天循环中使用 `budget="low"`。** 延迟不到一秒。只有在需要时才调高预算。

**3. 多用户应用中，每位用户使用一个独立记忆库。** 否则，不同用户的记忆可能彼此泄漏。

**4. 设置任务说明。** 事实提取质量在很大程度上取决于它。

**5. 先从全部存入开始。** 之后再优化。

---

## 何时使用此模式 {#when-to-use-this-pattern}

**适合以下情况：**

- 你需要跨会话记忆
- 你希望综合一段时间内的信息
- 你不想搭建 RAG 基础设施

**以下情况不适合：**

- 你只需要单次会话内的上下文
- 你存储的是结构化数据库记录

这种模式填补了“聊天历史”和“知识库”之间的空白。

---

## 值得记住的模式 {#the-pattern-to-remember}

- `retain` — 回复后调用
- `recall` — 回复前调用
- `reflect` — 综合信息时调用

这就是整个循环。

Jerri 正是用这个模式处理数周的会议内容。

你刚才花 15 分钟就构建出了这样的应用。

---

## 后续步骤 {#next-steps}

- **为每位用户创建独立记忆库**，为每位用户设置唯一的 `bank_id`
- **使用标签**限定记忆范围（存入时使用 `tags`，召回时使用 `tags_match`）
- **为 reflect 添加结构化 JSON 输出**，使用 `response_schema`
- **通过 Docker 在 Web UI 中查看记忆**：`localhost:9999`
- **试试[托管版 Hindsight](https://ui.hindsight.vectorize.io)**，无需自行托管

持久记忆能让聊天机器人变成智能体。

现在，你的聊天机器人也能记住了。

---
