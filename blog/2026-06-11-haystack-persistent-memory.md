---
title: "Haystack 持久记忆：为任何智能体提供即插即用工具和自动召回"
authors: [benfrank241]
slug: "2026/06/11/haystack-persistent-memory"
date: 2026-06-11T13:00
tags: [haystack, memory, persistent-memory, hindsight, agents, tutorial]
description: "借助 Hindsight 为任何 Haystack 智能体添加持久的长期记忆。集成提供三个 Haystack 工具（retain、recall、reflect），还可选用 HindsightMemoryWrapper，在每轮对话前注入记忆，并在之后存储对话记录。"
image: /img/blog/haystack-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 Haystack 提供持久记忆](/img/blog/haystack-persistent-memory.webp)

[Haystack](https://haystack.deepset.ai/) 是 deepset 的开源框架，可用于构建生产级 LLM 应用：管道、智能体、RAG，涵盖整套技术栈。它的 `Agent` 组件擅长使用工具和控制对话，但每次运行结束后不会保留状态。下一次会话又要从头开始。

本文将介绍 `hindsight-haystack` 集成。它提供三个可即插即用的 Haystack `Tool` 实例（retain、recall、reflect），还提供可选的 `HindsightMemoryWrapper` 工具集，可自动处理记忆，无需智能体决定何时调用工具。

## 要点速览 {#tldr}

<!-- truncate -->

- 安装 `pip install hindsight-haystack`。两个入口点分别适用于两种集成方式：
  - **`create_hindsight_tools()`** 返回一个 `list[Tool]`，可传给任意 Haystack `Agent`。由智能体决定何时调用这些工具。
  - **`HindsightMemoryWrapper`** 是 `Toolset` 的子类，带有 `auto_recall` 和 `auto_retain` 标志。调用 `toolset.run(agent, ...)` 后，系统会在每轮对话前后自动处理记忆。
- 两种方式都使用相同的三个记忆操作：**retain（存入）**存储内容，**recall（召回）**搜索内容，**reflect（反思）**综合生成答案。
- 可通过 `include_retain` / `include_recall` / `include_reflect` 单独排除工具。
- 推荐使用 Hindsight Cloud；将客户端 URL 指向自托管实例后，使用方式也相同。

## 为什么 Haystack 智能体需要持久记忆 {#why-persistent-memory-matters-for-haystack-agents}

Haystack 的 `Agent` 组件适合处理单次对话：它会在本次运行期间携带消息历史，聊天模型也能在上下文中看到这些内容。但运行结束后，它无法记住任何信息。下一次调用只能从你传入 `messages` 的内容开始，没有其他记忆。

对于一次性 RAG 端点，这样就够了。但如果你要构建面向客户、需要跨会话记住偏好的助手，或是需要积累已知问题解决方案的支持智能体，又或者要在数周内逐步构建项目模型的研究智能体，就需要一层能在每次运行结束后继续存在的记忆。这正是此集成要解决的问题。

## 两种集成模式 {#two-integration-modes}

该集成提供两个入口点，分别适用于团队通常采用的两种记忆接入方式。

### 模式 1：由智能体决定何时调用工具 {#mode-1-tools-the-agent-decides-to-call}

`create_hindsight_tools()` 会返回一个 Haystack `Tool` 实例列表。将它们传给 `Agent(tools=...)` 后，模型会根据工具说明和用户请求决定何时调用。

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

默认情况下，你会获得三个工具：`retain_memory`、`recall_memory` 和 `reflect_memory`。系统提示会告诉智能体何时应调用各个工具。若你希望明确控制记忆调用时机，这种模式很合适：智能体在适合的轮次调用记忆工具，在不需要时跳过。

这种方式的代价是模型必须记得使用这些工具。在提示内容繁杂时，能力较弱的模型有时会忘记调用。

### 模式 2：使用 `HindsightMemoryWrapper` 自动处理记忆 {#mode-2-automatic-memory-with-hindsightmemorywrapper}

`HindsightMemoryWrapper` 是 `Toolset` 的子类，可负责处理整个记忆生命周期，让智能体不必操心。设置 `auto_recall=True` 后，每轮对话都会在聊天模型运行前，将相关记忆添加到系统提示中。设置 `auto_retain=True` 后，每轮结束后都会存储用户和助手的消息。

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
    auto_recall=True,    # 每轮开始前将记忆注入系统提示
    auto_retain=True,    # 每轮结束后存储用户和助手的消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="You are a helpful assistant with long-term memory.",
)

# 使用 toolset.run() 代替 agent.run()，以启用自动处理
result = toolset.run(agent, messages=[ChatMessage.from_user("I prefer dark mode")])
```

有一点需要注意：要触发自动召回和存入，必须调用 `toolset.run(agent, ...)`，而不是 `agent.run(...)`。工具集会在智能体运行前后加入记忆处理；绕过包装器也就绕过了自动处理。三个显式工具仍会附加到智能体上，因此模型也可以在一轮对话中途调用它们，以便更精细地控制流程（例如，在需要综合生成答案的问题中调用 `reflect_memory`）。

如果你希望记忆自动发挥作用，不依赖模型的工具路由，这种模式很合适。

## 三种记忆工具 {#the-three-memory-tools}

无论选择哪种模式，都可以使用相同的三个工具。

**`retain_memory`** 会将自由文本内容存入记忆库。调用返回后，Hindsight 会异步提取结构化事实，因此工具会很快返回，提取工作则在服务端进行。

**`recall_memory`** 会在记忆库中搜索与查询相关的内容，并返回一组按相关性排序的记忆。预算（`low` / `mid` / `high`）控制检索深度。

**`reflect_memory`** 会让 Hindsight 使用 LLM 综合生成答案，而不是返回原始记忆。它适合回答“关于 X，我们目前知道什么？”这类问题：你希望得到一段综合回答，而不是五条独立片段。

创建工具时可以排除其中任意工具：

```python
# 只保留 retain 和 recall（不包含 reflect）
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

`HindsightMemoryWrapper` 也支持相同的标志：`include_retain`、`include_recall` 和 `include_reflect`。这三个标志的默认值均为 `True`。

## 配置 {#configuration}

大多数应用在各处使用相同的连接设置。调用一次 `configure()` 即可设置默认值，之后每次调用 `create_hindsight_tools()` 或 `HindsightMemoryWrapper()` 时只需提供 `bank_id`：

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

# 现在，bank_id 是唯一必需的参数
tools = create_hindsight_tools(bank_id="user-123")
```

如果需要按租户路由请求或自定义 HTTP 设置，仍可显式传入 `client=`（已配置好的 `Hindsight` 实例）。

## 设置 {#setup}

你需要一个 Hindsight 账户和 API key。使用 Hindsight Cloud 是最快的方式：

1. **注册**：[hindsight.vectorize.io](https://ui.hindsight.vectorize.io)。免费套餐足以让你完整体验整个流程。
2. **创建 API key**：在控制台中创建。密钥格式为 `hsk_...`。
3. **将客户端指向 Cloud**：
   ```python
   from hindsight_client import Hindsight
   client = Hindsight(
       base_url="https://api.hindsight.vectorize.io",
       api_key="hsk_your_key",
   )
   ```
   也可以在 `configure()` 中一次性设置 URL 和密钥，这样就不必显式创建客户端。

将 `base_url` 指向本地实例（通常为 `http://localhost:8888`）后，自托管的使用方式也相同。

## 权衡 {#tradeoffs}

**模式选择很重要。** 仅使用工具的模式由智能体控制；在记忆与当前轮次无关时，可以省去一次 Hindsight 调用。自动模式更可靠（每轮都会召回并存入记忆），但会增加 Hindsight 调用次数，而且每轮的首 token 延迟会稍长。对于高风险的生产环境助手，自动模式通常是合适的默认选择；对于轻量的 RAG 流程，仅使用工具即可。

**记忆库路由应由应用负责。** `bank_id` 是用于确定记忆归属的路由键。大多数生产应用都应保持一致，为每位用户（或每个项目、每个租户）使用一个记忆库。从技术上说，把不同用户的记忆混存在同一个记忆库中也可行，但这会让持久记忆失去大部分意义。

**存入是异步的。** `retain_memory` 会在内容进入记忆库后返回，而不是等到提取器完成工作才返回。几秒钟后即可召回提取出的事实。对于聊天流程，这没有问题，因为下一轮会在提取完成后才开始。对于在同一次运行中先存入再召回的自动化脚本，请稍作等待，或使用 Reflect（它不依赖提取是否已经完成）。

## 对照 {#recap}

| | Haystack `Agent` 默认行为 | 使用 `hindsight-haystack` |
| --- | --- | --- |
| 跨次运行保留记忆 | 无 | 持久化，按记忆库隔离 |
| 记忆设置 | 手动传递上下文 | 三个工具或自动包装器 |
| 跨工具共享 | 不适用 | 同一记忆库可从 Claude Code、Cline、Flowise 和 API 读取 |
| 每轮开始前自动召回 | 不适用 | `auto_recall=True` |
| 每轮结束后自动存入 | 不适用 | `auto_retain=True` |
| 可选工具 | 不适用 | `include_retain/recall/reflect` 标志 |
| 综合生成的答案 | 不适用 | `reflect_memory` 返回由 LLM 综合生成的文本 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Haystack + Hindsight](/sdks/integrations/haystack)
- **源码：**[`vectorize-io/hindsight/hindsight-integrations/haystack`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/haystack)
- **Hindsight API 参考：**[API 快速入门](/developer/api/quickstart)
