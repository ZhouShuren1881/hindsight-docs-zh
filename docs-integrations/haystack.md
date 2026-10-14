---
sidebar_position: 34
title: "使用 Hindsight 为 Haystack 提供持久记忆 | 集成"
description: "通过 Hindsight 为 Haystack 智能体添加持久的长期记忆。提供 retain/recall/reflect 工具，以及支持可选自动召回和自动存入的 HindsightMemoryWrapper。"
---

# Haystack {#haystack}

借助 Hindsight，为 [Haystack](https://haystack.deepset.ai/) 智能体提供持久的长期记忆。`hindsight-haystack` 包提供两种互补的使用方式：

- **`create_hindsight_tools(...)`** — 返回一个 Haystack `Tool` 列表（`retain_memory`、`recall_memory`、`reflect_on_memory`），模型可以在一次对话中直接调用这些工具。
- **`HindsightMemoryWrapper`** — 一个 Haystack `Toolset`，封装相同的工具，并支持可选的**自动召回**（每轮对话开始前将相关记忆注入系统提示）和**自动存入**（每轮对话结束后存储用户和助手的消息）。

[查看更新日志 →](/changelog/integrations/haystack)

## 安装 {#installation}

```bash
pip install hindsight-haystack
```

## 快速入门 {#quick-start}

```python
from hindsight_client import Hindsight
from hindsight_haystack import create_hindsight_tools
from haystack.components.agents import Agent
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

client = Hindsight(base_url="http://localhost:8888")

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=tools,
    system_prompt=(
        "You are a helpful assistant with long-term memory. "
        "Use retain_memory to store important facts. "
        "Use recall_memory to search memory before answering."
    ),
)

result = agent.run(messages=[ChatMessage.from_user("Remember that I prefer dark mode")])
print(result["messages"][-1].text)
```

## 使用 HindsightMemoryWrapper 自动管理记忆 {#automatic-memory-with-hindsightmemorywrapper}

如果希望自动召回和存入记忆，而不依赖智能体主动调用工具，可以使用以下方式：

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
    auto_recall=True,   # 每轮对话开始前将记忆注入系统提示
    auto_retain=True,   # 每轮对话结束后存储用户和助手的消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="You are a helpful assistant with long-term memory.",
)

# 使用 toolset.run() 启用自动记忆行为
result = toolset.run(agent, messages=[ChatMessage.from_user("I prefer dark mode")])
```

## 选择性使用工具 {#selective-tools}

```python
# 仅使用 retain 和 recall（不使用 reflect）
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

## 配置 {#configuration}

调用一次 `configure()` 即可设置连接默认值，之后每次调用都可以省略 `client=` 和 `hindsight_api_url=`：

```python
from hindsight_haystack import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    tags=["source:haystack"],
    context="my-app",
    mission="Track user preferences",
)

tools = create_hindsight_tools(bank_id="user-123")
```

API URL 默认指向 Hindsight Cloud（`https://api.hindsight.vectorize.io`）；API 密钥则回退到 `HINDSIGHT_API_KEY` 环境变量。

## 环境要求 {#requirements}

- Python 3.10+
- `haystack-ai >= 2.12.0`
- `hindsight-client >= 0.4.0`

## 前置条件 {#prerequisites}

需要有一个正在运行的 Hindsight 实例：

**Hindsight Cloud（推荐）：**[注册](https://ui.hindsight.vectorize.io)，无需自行托管。

**自托管：**

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # starts on http://localhost:8888
```
