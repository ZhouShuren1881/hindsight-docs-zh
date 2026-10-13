---
sidebar_position: 34
title: "Haystack 持久记忆Hindsight |整合"
description: "通过Hindsight为Haystack智能体添加持久的长期记忆。提供 retain/recall/reflect 工具以及 HindsightMemoryWrapper 以及可选的自动记忆召回和自动记忆存储。"
---

# Haystack {#haystack}

持久的长期记忆[Haystack](https://haystack.deepset.ai/)智能体，通过 Hindsight 提供记忆。 `hindsight-haystack` 包为您提供了两种互补的模式：

- **`create_hindsight_tools(...)`** — 返回列表Haystack`Tool`s (`retain_memory`，`recall_memory`，`reflect_on_memory`) 模型可以在回合内直接调用。
- **`HindsightMemoryWrapper`** — AHaystack`Toolset` 捆绑相同的工具并添加可选的 **自动记忆召回**（每回合前将相关记忆注入系统提示）和**自动记忆存储**（每回合后存储用户+助理消息）。

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
    mission="追踪用户偏好",
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=tools,
    system_prompt=(
        "你是一个有长期记忆的得力助手。"
        "使用retain_memory存储重要事实。"
        "回答前使用recall_memory搜索记忆。"
    ),
)

result = agent.run(messages=[ChatMessage.from_user("记住我更喜欢深色模式")])
print(result["messages"][-1].text)
```

## 使用 HindsightMemoryWrapper 自动记忆 {#automatic-memory-with-hindsightmemorywrapper}

对于不依赖智能体调用工具的自动记忆召回和记忆存储：

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="追踪用户偏好",
    auto_recall=True,   #每回合前将记忆注入系统提示
    auto_retain=True,   #每回合后存储用户+助手消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="你是一个有长期记忆力的得力助手。",
)

#使用toolset.run() 进行自动记忆行为
result = toolset.run(agent, messages=[ChatMessage.from_user("我更喜欢深色模式")])
```

## 选择性工具 {#selective-tools}

```python
#只有记忆召回 + 记忆召回（无回忆）
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

## 配置 {#configuration}

致电`configure()`一次设置连接默认值，这样你就可以省略每次通话时 `client=`/`hindsight_api_url=`：

```python
from hindsight_haystack import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    tags=["source:haystack"],
    context="my-app",
    mission="追踪用户偏好",
)

tools = create_hindsight_tools(bank_id="user-123")
```

TheAPIURL 默认为Hindsight Cloud (`https://api.hindsight.vectorize.io`），以及API 密钥回落至 `HINDSIGHT_API_KEY`环境变量。

## 环境要求 {#requirements}

- Python 3.10+
- `haystack-ai >= 2.12.0`
- `hindsight-client >= 0.4.0`

## 前置条件 {#prerequisites}

正在运行的Hindsight实例：

**Hindsight Cloud（推荐）：**[注册](https://ui.hindsight.vectorize.io) — 无需自托管。

**自托管：**

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-api-key
hindsight-api  # starts on http://localhost:8888
```
