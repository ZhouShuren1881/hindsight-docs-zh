---
title: "Haystack 持久记忆：任何智能体的插入式工具和自动记忆识别"
authors: [benfrank241]
slug: "2026/06/11/haystack-persistent-memory"
date: 2026-06-11T13:00
tags: [haystack, memory, persistent-memory, hindsight, agents, tutorial]
description: "使用Hindsight为任何Haystack智能体添加持久的长期记忆。三个 Haystack 工具（记忆存储、记忆召回、反思）加上一个可选的 HindsightMemoryWrapper，它在每个回合之前注入记忆并在之后存储转录本。"
image: /img/blog/haystack-persistent-memory.webp
hide_table_of_contents: true
---

![Haystack 持久记忆Hindsight](/img/blog/haystack-persistent-memory.webp)

[Haystack](https://haystack.deepset.ai/) 是 Deepset 的开源框架，用于构建生产 LLM 应用程序：管道、智能体、RAG、整个堆栈。 `Agent` 组件可以很好地处理工具使用和对话控制，但它在运行过程中是无状态的。下一个疗程开始冷。

这篇文章是`hindsight-haystack`的演练，该集成添加了三个插入式Haystack`Tool`实例（记忆存储、记忆召回、反思）和一个可选的`HindsightMemoryWrapper`工具集，该工具集自动执行记忆工作，而无需智能体决定何时调用工具。

## 概览 {#tldr}

<!-- truncate -->

- `pip install hindsight-haystack`。两个入口点涵盖了两种集成方式：
  - **`create_hindsight_tools()`** 返回您传递给任何 Haystack `Agent` 的 `list[Tool]`。智能体决定何时呼叫它们。
  - **`HindsightMemoryWrapper`** 是`Toolset` 子类，具有 `auto_recall` 和 `auto_retain` 标志。使用`toolset.run(agent, ...)`，记忆工作会在每回合前后自动运行。
- 两者都具有相同的三个记忆原语：**记忆存储**存储内容，**记忆召回**搜索，**反思**合成。
- 使用`include_retain` / `include_recall` / `include_reflect` 单独放置工具。
- Hindsight Cloud为推荐路径；一旦您将客户端 URL 指向您的实例，自托管就会以相同的方式工作。

## 为什么持久记忆对于Haystack智能体很重要 {#why-persistent-memory-matters-for-haystack-agents}

Haystack 的 `Agent` 组件适用于单个对话：它在整个运行过程中携带消息历史记录，并且聊天模型将其置于上下文中。它不能做的是一旦运行结束就记住任何事情。下一个调用将从您在 `messages` 中传递的任何内容开始，仅此而已。

对于一次性RAG端点来说，这很好。对于应该记住跨会话偏好的面向客户的助理、应该积累已知问题修复的支持智能体，或者应该在数周内建立项目模型的研究智能体，您需要一个能够在运行过程中幸存下来的层。这就是这次整合所填补的空白。

## 两种集成模式 {#two-integration-modes}

集成提供了两个入口点，它们涵盖了团队通常希望连接记忆的两种方式。

### 模式1：智能体决定调用的工具 {#mode-1-tools-the-agent-decides-to-call}

`create_hindsight_tools()` 返回Haystack `Tool` 实例的列表。您将它们传递给`Agent(tools=...)`，模型根据工具描述和用户的请求决定何时调用它们。

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
        "使用retain_memory来存储重要的事实。"
        "在回答之前使用recall_memory搜索记忆。"
    ),
)

result = agent.run(messages=[ChatMessage.from_user("记住我更喜欢深色模式")])
print(result["messages"][-1].text)
```

默认情况下您会获得三个工具：`retain_memory`、`recall_memory`、`reflect_memory`。系统提示告诉智能体何时应该开火。当您想要显式控制时，此模式非常适合：智能体在有意义的转弯处调用记忆，并在无意义的转弯处跳过它。

权衡是模型必须记住使用工具。在繁忙的提示下，较弱的模型有时不会。

### 模式2：自动记忆`HindsightMemoryWrapper` {#mode-2-automatic-memory-with-hindsightmemorywrapper}

`HindsightMemoryWrapper` 是 `Toolset` 子类，用于处理记忆生命周期，因此智能体不必这样做。使用`auto_recall=True`，每回合都会在聊天模型运行之前将相关记忆添加到系统提示中。使用 `auto_retain=True`，用户和助理消息会在每轮后存储。

```python
from hindsight_haystack import HindsightMemoryWrapper

toolset = HindsightMemoryWrapper(
    client=client,
    bank_id="user-123",
    mission="追踪用户偏好",
    auto_recall=True,    #每回合前将记忆注入系统提示
    auto_retain=True,    #每回合后存储用户+助手消息
)

agent = Agent(
    chat_generator=OpenAIChatGenerator(model="gpt-4o-mini"),
    tools=toolset,
    system_prompt="你是一个有长期记忆力的得力助手。",
)

#使用toolset.run()而不是智能体.run()来获取自动行为
result = toolset.run(agent, messages=[ChatMessage.from_user("我更喜欢深色模式")])
```

需要注意的一个细节是，您必须调用`toolset.run(agent, ...)`而不是`agent.run(...)`才能启动自动记忆召回/记忆存储。该工具集将智能体的运行与转弯前和转弯后的记忆工作结合起来；绕过包装器就绕过了自动化。这三个显式工具仍然附加到智能体上，因此如果模型需要更精细的控制，也可以在中间调用它们（例如用于综合问题的`reflect_memory`）。

当您希望记忆“正常工作”而不依赖于模型的工具路由时，此模式非常适合。

## 三种记忆工具 {#the-three-memory-tools}

无论您选择哪种模式，都可以使用相同的三个工具。

**`retain_memory`** 在记忆库中存储自由文本内容。 Hindsight 在调用返回后异步提取结构化事实，因此该工具快速返回并且提取发生在服务器端。

**`recall_memory`** 在记忆库中搜索与查询相关的内容。结果是一组经过排序的记忆。预算 (`low` / `mid` / `high`) 控制搜索的深度。

**`reflect_memory`**要求Hindsight使用LLM在记忆库上综合答案，而不是返回原始记忆。适合“我们对 X 了解多少？”您想要一个段落的样式问题，而不是五个单独的片段。

你可以在构建时丢弃其中任何一个：

```python
#只有记忆召回 + 记忆召回（无回忆）
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_reflect=False,
)
```

`HindsightMemoryWrapper` 上存在相同的标志：`include_retain`、`include_recall`、`include_reflect`。这三个的默认值是 `True`。

## 配置 {#configuration}

对于大多数应用程序，相同的连接设置适用于所有地方。 `configure()` 设置默认值一次，因此每个后续 `create_hindsight_tools()` 或 `HindsightMemoryWrapper()` 调用仅需要 `bank_id`：

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

#现在，bank_id 是唯一必需的参数
当您需要每租户路由或自定义 HTTP 设置时，
tools = create_hindsight_tools(bank_id="user-123")
```

您仍然可以传递显式 `client=`（已配置的 `Hindsight` 实例）。

## 设置 {#setup}

您需要一个Hindsight帐户和API密钥。 Hindsight Cloud是最快的路径：

1. **注册** 在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io)。免费套餐足以端到端尝试。
仪表板上的
2. **创建API密钥
仪表板上的**。格式为`hsk_...`。
3. **指向客户** 在云端：
   ```python
   from hindsight_client import Hindsight
   client = Hindsight(
       base_url="https://api.hindsight.vectorize.io",
       api_key="hsk_your_key",
   )
   ```
   也可以在 `configure()` 中一次设置 URL 和密钥，省略显式客户端。

一旦您指向，自托管的工作方式就相同`base_url`在您的本地实例（通常`http://localhost:8888`).

## 权衡 {#tradeoffs}

**模式选择是有意义的。** 仅工具模式可保持智能体的控制，并在记忆不相关的回合中保存Hindsight 调用。自动模式更可靠（每个回合都会调用并保留），但需要更多的 Hindsight 调用，并且每个回合的首次令牌时间稍长。对于高风险的制作助理来说，自动模式通常是正确的默认模式；对于廉价的RAG式流程，仅使用工具就可以了。

​​**记忆库路由属于您的应用程序。**`bank_id`是谁拥有记忆的路由密钥。大多数生产应用程序都希望每个用户（或每个项目或每个租户）都有一个记忆库。将不同用户的记忆混合到同一个记忆库中在技术上是可行的，但会消除持久记忆的大部分意义。

**记忆存储是异步的。** `retain_memory` 调用在内容到达记忆库时返回，而不是在提取器完成时返回。事实在几秒钟内就可以回忆起来。对于聊天流来说，这很好，因为下一轮发生在提取完成后。对于在同一运行中先记忆存储再记忆召回的自动化脚本，请添加短暂的延迟或使用 挫（这不依赖于提取是否完成）。

## 回顾 {#recap}

||Haystack `Agent` 默认|与 `hindsight-haystack`|
| --- | --- | --- |
|跑步过程中的记忆|无|持久，根据记忆库|
|记忆设置|手动上下文传递|三个工具或自动包装器|
|跨工具共享|不适用|可从 Claude Code、Cline、Flowise、API 读取相同的记忆库|
|转弯前自动记忆召回|不适用|`auto_recall=True`|
|回合后自动记忆存储|不适用|`auto_retain=True`|
|选择性工具表面|不适用|`include_retain/recall/reflect` 标志|
|综合答案|不适用|`reflect_memory` 返回 LLM 合成文本|

## 后续步骤 {#next-steps}

- **Hindsight Cloud：**[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **集成文档：**[Haystack + Hindsight](/sdks/integrations/haystack)
- **来源：**[`vectorize-io/hindsight/hindsight-integrations/haystack`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/haystack)
- **HindsightAPI参考：**[API 快速入门](/developer/api/quickstart)
