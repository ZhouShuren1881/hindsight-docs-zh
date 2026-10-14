---
sidebar_position: 12
---

# Pydantic AI + Hindsight 记忆 {#pydantic-ai--hindsight-memory}

:::info 完整应用
这是一个完整、可运行的应用示例，展示了如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/pydantic-ai-memory)
:::

为你的 Pydantic AI 智能体提供持久的长期记忆。多次与助手聊天，看看它如何记住你在之前会话中告诉它的内容。

## 本示例展示的内容 {#what-this-demonstrates}

- **记忆工具** — 通过 `create_hindsight_tools()` 使用 Retain（存入）、Recall（召回）和 Reflect（反思）
- **自动注入上下文** — 通过 `memory_instructions()` 在每次运行时注入相关记忆
- **跨会话持久记忆** — 智能体在多次脚本运行之间保留记忆
- **交互式聊天循环**，并复用消息历史记录

## 架构 {#architecture}

```
会话 1：
    你："I'm a Python developer working on a FastAPI project"
    │
    ├─ memory_instructions() ──► 召回先前的上下文（首次运行时为空）
    ├─ 智能体决定调用 hindsight_retain ──► 存入事实
    └─ 智能体确认收到信息

会话 2：
    你："What do you know about me?"
    │
    ├─ memory_instructions() ──► 注入 "User is a Python developer..."
    ├─ 智能体调用 hindsight_recall ──► 找到已存储的事实
    └─ 智能体将记住的全部信息作为回答
```

## 前置条件 {#prerequisites}

1. **运行中的 Hindsight**

   ```bash
   export OPENAI_API_KEY=your-key

   docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
     -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
     -e HINDSIGHT_API_LLM_MODEL=o3-mini \
     -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
     ghcr.io/vectorize-io/hindsight:latest
   ```

2. **OpenAI API 密钥**（供 Pydantic AI 的 LLM 使用）

   ```bash
   export OPENAI_API_KEY=your-key
   ```

3. **安装依赖**

   ```bash
   cd applications/pydantic-ai-memory
   pip install -r requirements.txt
   ```

## 快速开始 {#quick-start}

### 交互式聊天 {#interactive-chat}

```bash
python personal_assistant.py
```

示例会话：

```
Personal assistant ready (bank: personal-assistant)
Type 'quit' or 'exit' to stop.

You: I'm a Python developer and I love hiking on weekends
Assistant: I've noted that! You're a Python developer who enjoys weekend hiking.

You: What do you know about me?
Assistant: From my memory, I know that you're a Python developer and you
love hiking on weekends.

You: quit
```

再次运行，智能体仍然记得之前的内容：

```
You: What are my hobbies?
Assistant: Based on my memories, you enjoy hiking on weekends!
```

### 单次查询 {#single-query}

```bash
python personal_assistant.py "What do you remember about my preferences?"
```

### 重置记忆 {#reset-memory}

```bash
python personal_assistant.py --reset
```

## 工作原理 {#how-it-works}

### 1. 创建 Hindsight 客户端 {#1-create-a-hindsight-client}

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")
```

### 2. 创建记忆工具 {#2-create-memory-tools}

`create_hindsight_tools()` 会返回 Pydantic AI `Tool` 实例，供智能体调用：

```python
from hindsight_pydantic_ai import create_hindsight_tools

tools = create_hindsight_tools(client=client, bank_id="personal-assistant")
# 返回：[hindsight_retain, hindsight_recall, hindsight_reflect]
```

### 3. 添加记忆指令 {#3-add-memory-instructions}

`memory_instructions()` 会返回一个异步可调用对象：它会自动召回相关记忆，并在每次运行时将这些记忆注入系统提示中：

```python
from hindsight_pydantic_ai import memory_instructions

instructions_fn = memory_instructions(
    client=client,
    bank_id="personal-assistant",
    query="important context about the user",
    max_results=5,
)
```

### 4. 配置智能体 {#4-wire-up-the-agent}

```python
from pydantic_ai import Agent

agent = Agent(
    "openai:gpt-4o-mini",
    system_prompt="You are a helpful assistant with long-term memory...",
    tools=tools,
    instructions=[instructions_fn],
)

result = await agent.run("What do you know about me?")
```

## 核心文件 {#core-files}

| 文件 | 说明 |
|------|-------------|
| `personal_assistant.py` | 完整的可运行示例，包含交互式聊天和单次查询模式 |
| `requirements.txt` | Python 依赖项 |

## 自定义 {#customization}

### 仅使用工具（不自动注入） {#use-only-tools-no-auto-injection}

由智能体自行决定何时搜索记忆，而不是始终注入上下文：

```python
agent = Agent(
    "openai:gpt-4o-mini",
    tools=create_hindsight_tools(client=client, bank_id="my-bank"),
)
```

### 仅使用指令（不使用工具） {#use-only-instructions-no-tools}

自动注入记忆，但不向智能体提供显式的 Retain、Recall、Reflect 工具：

```python
agent = Agent(
    "openai:gpt-4o-mini",
    instructions=[memory_instructions(client=client, bank_id="my-bank")],
)
```

### 选择特定工具 {#select-specific-tools}

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="my-bank",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不包含 reflect
)
```

### 使用其他模型 {#use-a-different-model}

任何 [Pydantic AI 模型](https://ai.pydantic.dev/models/) 都可以使用：

```python
agent = Agent(
    "anthropic:claude-sonnet-4-20250514",
    tools=create_hindsight_tools(client=client, bank_id="my-bank"),
)
```

## 常见问题 {#common-issues}

**“Connection refused”**
- 确认 Hindsight 正在 `localhost:8888` 上运行。

**“OPENAI_API_KEY not set”**
```bash
export OPENAI_API_KEY=your-key
```

**“No module named 'hindsight_pydantic_ai'”**
```bash
pip install -r requirements.txt
```

---

**使用以下组件构建：**
- [Pydantic AI](https://ai.pydantic.dev) - 类型安全的 AI 智能体框架
- [hindsight-pydantic-ai](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/pydantic-ai) - 面向 Pydantic AI 的 Hindsight 记忆工具
- [Hindsight](https://github.com/vectorize-io/hindsight) - 面向 AI 智能体的长期记忆

---
