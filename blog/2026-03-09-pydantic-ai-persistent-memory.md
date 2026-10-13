---
title: "Pydantic AI持久记忆：用5行代码添加它"
authors: [benfrank241]
date: 2026-03-09T12:00
tags: [memory, openai, anthropic, gemini, python, rust, agents, rag, vector, pydantic-ai, knowledge-graph, tutorial]
image: /img/blog/pydantic-ai-persistent-memory.webp
hide_table_of_contents: true
---

如果您使用[Pydantic AI](https://ai.pydantic.dev/)构建了AI智能体，您已经知道它可以很好地处理类型化输出、依赖项注入和异步工作流程。但有一件事它没有做：记住运行之间的任何事情。每次对 `agent.run()` 的调用都是从一张白纸开始的。你的智能体不知道用户昨天说了些什么，他们分享了什么偏好，或者它已经研究过什么。

添加**Pydantic AI持久记忆**不需要构建自定义RAG管道或管理您自己的矢量数据库。通过`hindsight-pydantic-ai`集成，您可以通过Python的五行将长期记忆连接到任何Pydantic AI智能体中​​。本指南介绍了从安装到生产就绪模式的完整设置。

<!-- truncate -->

## 概览 {#tldr}

- Pydantic AI没有内置的持久记忆。每次跑步，您的智能体都会从头开始。
- `hindsight-pydantic-ai` 添加了记忆存储、记忆召回和反思工具以及自动注入的记忆指令。
- 五行设置：创建客户端，调用`create_hindsight_tools()`，并将它们传递给你的智能体。
每次运行时，
- `memory_instructions()`都会默默地将相关记忆预加载到系统提示符中，因此智能体会根据上下文开始每次对话。
- 可与任何模型提供商合作，包括OpenAI、Anthropic和Gemini。

---

## 问题：Pydantic AI没有持久记忆 {#the-problem-pydantic-ai-has-no-persistent-memory}

[Pydantic AI](https://ai.pydantic.dev/)是一个坚实的框架。类型化输出、依赖注入、异步原生设计和干净的工具API使其成为构建基于Python的智能体的流行选择。然而，它根本没有记忆层。

每个`agent.run()`都从零开始。智能体不知道用户昨天说了什么。它不知道他们的喜好。它不知道它已经研究了什么。因此，在多个会话中与用户交互的智能体会丢失运行之间所有积累的上下文。

您可以通过`message_history`在单个会话中继续对话。但这是聊天记录，而不是记忆。聊天记录并不概括事实。它不会合并重复的信息。它会线性增长，直到超过您的上下文窗口和令牌限制。

真正的智能体记忆意味着不同的东西：

- 从对话中提取结构化事实
- 构建实体和关系的知识图谱
- 检索几天、几周和几个月的相关上下文
- 从分散的记忆中合成连贯的答案

这就是[Hindsight](https://hindsight.vectorize.io/)提供的。如果您将 Hindsight 与其他框架（如 [CrewAI](/blog/2026/03/02/crewai) 或 [OpenAI](/blog/2026/03/05/add-memory-to-openai-application)）一起使用，概念是相同的。并且`hindsight-pydantic-ai`将其直接连接到Pydantic AI的工具和指令系统中，因此您不需要自己构建任何这些。

---

## Pydantic AI持久记忆如何与Hindsight配合使用 {#how-pydantic-ai-persistent-memory-works-with-hindsight}

在深入研究代码之前，它有助于了解当您通过 Hindsight 集成添加 Pydantic AI 持久记忆时，幕后会发生什么。

Hindsight是一个在本地或云端运行的记忆引擎。当您的智能体存储事实时，Hindsight不仅仅保存原始文本。相反，它提取结构化实体和关系，构建知识图，并为多策略检索的所有内容建立索引。这意味着当你的智能体稍后搜索记忆时，它可以通过语义搜索、BM25关键字匹配、图遍历和时间排名等组合来找到相关信息。

`hindsight-pydantic-ai`包通过两个集成点将该引擎连接到Pydantic AI：

```
Pydantic AI Agent
  |-- tools=[create_hindsight_tools(...)]
  |     |-- hindsight_retain  -> store facts to memory
  |     |-- hindsight_recall  -> search memory for relevant info
  |     |-- hindsight_reflect -> synthesize an answer from all memories
  |
  |-- instructions=[memory_instructions(...)]
        |-- auto-recalls relevant memories into the system prompt
```

**工具** 让智能体在对话期间显式存储和检索记忆。 **使用说明**在智能体开始思考之前就默默地注入相关记忆。两者都是可选的。您可以根据您的用例使用其中之一，或同时使用两者。

这些工具是直接调用Hindsight的API的异步函数。由于 Pydantic AI 是异步原生的，因此闭包使用 `aretain()`、`arecall()` 和 `areflect()`。不需要线程池黑客或兼容性层。如果您更喜欢基于协议的方法，也可以使用 [Hindsight的MCP记忆服务器](/blog/2026/03/04/mcp-agent-memory) 而不是直接工具集成。

---

## 设置Pydantic AI 5个步骤实现持久记忆 {#setting-up-pydantic-ai-persistent-memory-in-5-steps}

设置过程大约需要五分钟。您将安装Hindsight，添加Pydantic AI记忆集成包，将工具连接到您的智能体中，并测试记忆在会话中是否持久。

### 第1步：安装并启动Hindsight {#step-1-install-and-start-hindsight}

首先，安装Hindsight服务器并在本地启动：

```bash
pip install hindsight-all
```

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

这在`http://localhost:8888`本地运行。它包括嵌入式Postgres、本地嵌入和本地重排序。除了用于实体提取的 LLM API 密钥之外，不需要任何外部服务。

> **注意：** 您还可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并完全跳过自托管设置。云版本提供相同的API以及托管基础设施。

### 第2步：安装Pydantic AI记忆集成 {#step-2-install-the-pydantic-ai-memory-integration}

接下来，安装集成包：

```bash
pip install hindsight-pydantic-ai
```

你还需要一个模型提供者。对于 OpenAI：

```bash
pip install "pydantic-ai-slim[openai]"
```

其他提供商的工作方式相同。根据需要交换 `[anthropic]` 或 `[google]`。 Pydantic AI 持久记忆集成与模型无关，因此无论您选择哪个 LLM，记忆层的工作方式都是相同的。 Hindsight支持[100+ LLM 通过 LiteLLM 提供者](/blog/2026/03/03/litellm)。

### 第 3 步：为您的 Pydantic AI 智能体添加持久记忆工具 {#step-3-add-persistent-memory-tools-to-your-pydantic-ai-agent}

这里是五行的来源。创建一个Hindsight客户端，生成Pydantic AI持久记忆工具，并将它们传递给您的智能体：

```python
from hindsight_client import Hindsight
from hindsight_pydantic_ai import create_hindsight_tools
from pydantic_ai import Agent

client = Hindsight(base_url="http://localhost:8888")

agent = Agent(
    "openai:gpt-4o-mini",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
)
```

这是完整的Pydantic AI持久记忆设置。智能体现在拥有三种工具：

- `hindsight_retain(content)` 将信息存储到长期记忆中
- `hindsight_recall(query)` 搜索记忆并返回匹配的事实
- `hindsight_reflect(query)` 从所有相关记忆中综合出一个合理的答案

智能体根据对话上下文决定何时使用每个工具。您不需要手动调用它们。

### 第四步：测试跨会话记忆 {#step-4-test-cross-session-memory}

运行两个单独的对话，以验证Pydantic AI智能体记忆在会话中持续存在：

```python
import asyncio

async def main():
    #第一次对话
    r1 = await agent.run(
        "记住我更喜欢函数式编程模式"
        "我正在Python构建数据管道。"
    )
    print(r1.output)

    #后来的对话——智能体回忆上下文
    r2 = await agent.run("我应该采取什么方法来处理错误？")
    print(r2.output)

asyncio.run(main())
```

在第一次运行中，智能体通过`hindsight_retain`存储偏好。在第二次运行中，智能体调用`hindsight_recall`来查找相关上下文。然后，它根据其所知提供建议：功能模式、Python、数据管道。

这是Pydantic AI持久记忆的核心优势：它可以跨运行、跨天、跨进程重新启动。记忆存在于Hindsight的知识图中，而不是智能体的上下文窗口中。即使您完全重新启动Python进程，智能体也会从中断处继续。

### 第5步：使用Pydantic AI指令自动注入记忆 {#step-5-auto-inject-memories-with-pydantic-ai-instructions}

上述工具需要智能体自行决定搜索记忆。有时，您希望在智能体开始响应之前自动注入Pydantic AI持久记忆。

Pydantic AI 的 `instructions` 参数支持在每个 `agent.run()` 上运行的异步可调用对象。这非常适合记忆注入：

```python
from hindsight_pydantic_ai import create_hindsight_tools, memory_instructions

agent = Agent(
    "openai:gpt-4o-mini",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
    instructions=[memory_instructions(client=client, bank_id="user-123")],
)
```

现在每次运行时，`memory_instructions`都会调用Hindsight的记忆召回API并将相关记忆注入系统提示符中。智能体开始与用户上下文的每次对话，而不需要工具调用。

您可以自定义查询、结果计数和前缀来控制注入的内容：

```python
memory_instructions(
    client=client,
    bank_id="user-123",
    query="用户偏好、历史记录和上下文",
    max_results=10,
    prefix="以下是你已知的用户信息：\n",
)
```

如果记忆召回失败或不返回任何内容，则指令函数返回空字符串。它永远不会阻止智能体做出响应。

---

## 高级Pydantic AI记忆配置 {#advanced-pydantic-ai-memory-configuration}

### 选择要包含的记忆工具 {#selecting-which-memory-tools-to-include}

您并不总是需要所有三种持久记忆工具。 `create_hindsight_tools` 让您选择要包含的内容：

```python
#只读智能体：可以搜索记忆但不能写入
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,
    include_recall=True,
    include_reflect=True,
)

#只写智能体：存储数据但不查询
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=False,
    include_reflect=False,
)
```

这种灵活性在多智能体架构中非常有用。例如，您可能有一个Pydantic AI智能体，它收集信息并写入持久记忆，而另一个智能体则读取记忆来回答问题。拆分读取和写入访问权限可以使每个智能体专注于其角色，并防止只应消耗上下文的智能体进行意外的记忆写入。

### 多种智能体的全局配置 {#global-configuration-for-multiple-agents}

如果您有多个Pydantic AI智能体共享同一个Hindsight持久记忆实例，请使用全局配置而不是在各处传递`client`：

```python
from hindsight_pydantic_ai import configure, create_hindsight_tools

configure(hindsight_api_url="http://localhost:8888", api_key="YOUR_KEY")

#不需要客户端：工具使用全局配置
agent1_tools = create_hindsight_tools(bank_id="agent-1")
agent2_tools = create_hindsight_tools(bank_id="agent-2")
```

显式`client=`参数始终优先于全局配置。这使您可以在需要时基于每个智能体进行覆盖。

---

## Pydantic AI持久记忆的完整工作示例 {#full-working-example-of-pydantic-ai-persistent-memory}

将其另存为`memory_agent.py`并运行它以查看Pydantic AI持久记忆的作用：

```python
import asyncio

from hindsight_client import Hindsight
from hindsight_pydantic_ai import create_hindsight_tools, memory_instructions
from pydantic_ai import Agent

BANK_ID = "demo-user"


async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id=BANK_ID, name="演示用户记忆")

    agent = Agent(
        "openai:gpt-4o-mini",
        tools=create_hindsight_tools(client=client, bank_id=BANK_ID),
        instructions=[memory_instructions(client=client, bank_id=BANK_ID)],
    )

    print("--- 运行 1：教授智能体 ---")
    r1 = await agent.run(
        "记住：我是一名后端工程师。我使用 Python 和 Rust。"
        "与大型框架相比，我更喜欢小型、可组合的库。"
    )
    print(f"Agent: {r1.output}\n")

    print("--- 运行 2：智能体回忆上下文 ---")
    r2 = await agent.run("为我的下一个项目推荐一个网络框架。")
    print(f"Agent: {r2.output}\n")

    print("--- 运行3：智能体合成---")
    r3 = await agent.run("你对我的工程理念了解多少？")
    print(f"Agent: {r3.output}")


asyncio.run(main())
```

运行它：

```bash
export OPENAI_API_KEY=YOUR_KEY
python memory_agent.py
```

第一次执行完成后再次运行。智能体会记住第一次会话中的所有内容，因为Pydantic AI持久记忆将事实存储在Hindsight中，而不是在过程中。

---

## Pydantic AI 持久记忆：陷阱和边缘情况 {#pydantic-ai-persistent-memory-pitfalls-and-edge-cases}

**记忆库ID冲突。** 每个`bank_id` 都是一个单独的持久记忆存储。如果两个不相关的智能体共享一个记忆库，它们的记忆就会以意想不到的方式融合。每个用户、每个智能体或每个项目使用唯一的记忆库 ID。

**指令延迟。** `memory_instructions` 在每个 `agent.run()` 上调用记忆召回 API。对于延迟敏感的应用程序，请使用`budget="low"`和较小的`max_results`。或者，完全跳过自动记忆注入，仅在需要时依靠智能体调用记忆召回工具。在大多数情况下，持久记忆查找会增加 50-200 毫秒的延迟，具体取决于记忆大小和网络条件。

**重复的记忆。** 如果智能体多次存储相同的信息，Hindsight 在事实级别进行重复数据删除。然而，最好在系统提示中向智能体提供关于何时存储新事实以及何时跳过的明确指导。

**异步事件循环冲突。** 同步 `create_bank()` 方法在 `asyncio.run()` 中不起作用，因为它尝试创建嵌套事件循环。始终在异步代码中使用 `await client.acreate_bank()`。这是一个常见的 Python 异步陷阱，并非特定于 Hindsight 或 Pydantic AI 持久记忆。

---

## Pydantic AI 记忆：权衡和替代方案 {#pydantic-ai-memory-tradeoffs-and-alternatives}

### 当Pydantic AI持久记忆有意义时 {#when-pydantic-ai-persistent-memory-makes-sense}

Pydantic AI Hindsight 的持久记忆最适合在多个会话中与同一用户或上下文交互的智能体。好的用例包括个人助理、支持机器人、积累知识的研究智能体，以及任何记住过去交互的Python智能体，随着时间的推移，可以提高质量。

### 何时不使用它 {#when-not-to-use-it}

跳过智能体持久记忆，以获得不再运行的一次性智能体、无状态API处理程序（其中每个请求都是独立的），或者您想要完全控制提示中的内容的智能体。在最后一种情况下，直接使用 Hindsight Python 客户端而不是 Pydantic AI 集成。

### 与替代品相比如何 {#how-it-compares-to-alternatives}

|方法|优势|弱点|最适合|
|---|---|---|---|
|**Hindsight + Pydantic AI**|多策略检索（语义+BM25+图+时态）、结构化事实提取、合成引擎|需要运行 Hindsight 服务器或使用云|需要深度记忆的多会话智能体|
|**手动消息_历史记录**|内置于Pydantic AI，无额外依赖|不概括事实，增长直至上下文窗口限制|简短的单会话对话|
|**自定义矢量存储+RAG**|完全控制嵌入和检索|您自己管理分块、索引和检索|具有现有矢量基础设施的团队|
|**Mem0**|另一种外部记忆选项，简单API|较少的检索策略，没有基于图形的记忆召回|没有实体关系的更简单的记忆需求|

正确的选择取决于您的要求。对于大多数需要以最少的设置跨会话保持记忆的Pydantic AI智能体来说，Hindsight集成提供了最快的生产路径。

---

## 回顾：Pydantic AI 持久记忆整合 {#recap-pydantic-ai-persistent-memory-integration}

添加Pydantic AI持久记忆不需要复杂的基础设施或自定义检索管道。 `hindsight-pydantic-ai`集成提供了两个涵盖完整智能体记忆生命周期的功能：

- **`create_hindsight_tools()`** 返回智能体调用的异步工具，以跨会话存储和检索知识
- **`memory_instructions()`** 在每次运行时自动注入相关记忆，因此智能体从上下文开始，无需调用工具

集成在设计上是最小的。两个函数，没有子类化，没有改变你的 deps 类型。只是连接到真正的记忆引擎的Pydantic AI工具和指令。

记忆会在流程重新启动后继续存在，随着时间的推移构建知识图，并随着您的智能体对每个用户的更多了解而增值。为了Python开发商大楼Pydantic AI需要持久记忆的智能体，这是从无状态到有状态的最简单路径。

---

## 后续步骤 {#next-steps}

- **本地尝试**: `pip install hindsight-all hindsight-pydantic-ai "pydantic-ai-slim[openai]"` 并运行上面的示例
- **使用Hindsight Cloud**：使用 [免费帐户](https://ui.hindsight.vectorize.io) 跳过自托管
- **标记记忆以确定范围**：在记忆存储上使用`tags`，在搜索上使用`recall_tags`，按项目、环境或主题对记忆进行分区
- **结合工具和说明**：使用`memory_instructions`作为自动上下文和在对话期间显式存储和检索的工具
- **阅读Pydantic AI文档**：了解更多[Pydantic AI工具和说明](https://ai.pydantic.dev/tools/)，进一步拓展你的智能体
- **探索其他集成**：通过[MCP](/blog/2026/03/04/mcp-agent-memory)将记忆添加到[CrewAI智能体](/blog/2026/03/02/crewai)、[OpenAI 应用程序](/blog/2026/03/05/add-memory-to-openai-application)或任何框架
- **检查知识图谱**：运行Hindsight控制平面或使用[云仪表板](https://ui.hindsight.vectorize.io)浏览提取的事实、实体和关系
