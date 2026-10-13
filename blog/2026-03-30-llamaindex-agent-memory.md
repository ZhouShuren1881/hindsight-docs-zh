---
title: "教羊驼记住"
description: "LlamaIndex 每个会话都会智能体重置记忆。了解如何使用后视-llamaindex 分 3 个步骤添加持久的跨会话记忆。包含完整的代码示例。"
authors: [DK09876]
date: 2026-03-30T12:00
tags: [llamaindex, integrations, agents, memory, python, tutorial]
image: /img/blog/llamaindex-agent-memory.webp
hide_table_of_contents: true
---

![教羊驼记住](/img/blog/llamaindex-agent-memory.webp)

您已经构建了一个LlamaIndex智能体，可以出色地回答问题。然后会话结束，它会忘记所有内容，您的用户名、他们的偏好、您花了三轮建立的上下文。下一场比赛从零开始。

这是LlamaIndex内置记忆的核心限制：它是会话范围的。 `ChatMemoryBuffer` 在智能体运行时保存您的对话历史记录，但是当您重新启动时，该上下文就消失了。对于服务重复用户或运行多会话工作流程的智能体来说，这并不是一个小不便。这是根本性的能力差距。

​​`hindsight-llamaindex`解决了这个问题。它提供了两种互补的模式：`BaseToolSpec`提供智能体显式记忆存储/记忆召回/反思工具，以及`BaseMemory`实现在每个回合自动存储和回忆记忆。无论课程何时开始，您的智能体都会记住所学到的内容。

**你将学到什么：**
- 为什么LlamaIndex智能体记忆重置以及持久记忆的实际含义
- `hindsight-llamaindex`如何通过工具系统和记忆界面与任何LlamaIndex智能体集成
- 如何通过完整的代码示例分三步设置跨会话记忆
- 何时使用持久记忆以及何时跳过它

与[Hindsight Cloud](https://ui.hindsight.vectorize.io)配合使用或自行托管。

<!-- truncate -->

## 什么是LlamaIndex智能体记忆？ {#what-is-llamaindex-agent-memory}

LlamaIndex拥有两代记忆工具。原始的`ChatMemoryBuffer`存储会话中的原始对话历史记录并在重新启动时重置。较新的 `Memory` 类添加了可插入的 `MemoryBlock` 模块（包括 `FactExtractionMemoryBlock`），由 SQLite 支持，以便在重新启动后保持持久性。

这真是一个进步。但即使是较新的系统也有硬性限制：检索仅是向量相似度，没有知识图或实体解析，并且它与 LlamaIndex 生态系统紧密耦合。如果你切换智能体框架，你的记忆层也会随之改变。

“持久”记忆，从最完整的意义上来说，是指一个系统从对话中提取事实，随着时间的推移构建知识图，并使用多种并行策略检索相关上下文——而不仅仅是最近的嵌入匹配。无论您运行哪种智能体框架，它都应该可以工作。

`hindsight-llamaindex` 通过两种模式提供此功能。 **工具模式** (`HindsightToolSpec`) 公开了三个原生 LlamaIndex 工具：`retain_memory`（存储事实）、`recall_memory`（搜索记忆）和 `reflect_on_memory`（从存储的所有内容合成一个合理的答案）。 **记忆模式** (`HindsightMemory`) 实现了 LlamaIndex 的 `BaseMemory` 接口，可以自动存储消息和记忆召回相关上下文，无需显式工具调用。

## LlamaIndex内置记忆的问题 {#the-problem-with-llamaindexs-built-in-memory}

LlamaIndex 较新的 `Memory` API 和 SQLite 持久性是真正的进步 - 事实在重新启动后仍然存在，并且 `FactExtractionMemoryBlock` 可以从对话中提取结构化信息。对于简单的用例来说，这就足够了。

但是一旦查询变得复杂，它就会遇到硬架构限制：

- **单一检索策略。** LlamaIndex 记忆仅使用向量相似性。没有精确匹配的BM25，没有关系查询的图形遍历，没有日期限制记忆召回的时间搜索。 “上周二我在做什么？”返回语义上接近的任何内容——而不是周二实际发生的事情。
- **没有知识图谱。** 事实存储为嵌入，而不是具有关系的实体。如果这些事实没有出现在同一会话中，系统就无法将“Priya 拥有速率限制服务”与“速率限制阻止程序已解决”连接起来。
- **框架耦合。**LlamaIndex记忆是为LlamaIndex设计的。如果您迁移到不同的智能体框架，您的记忆层将不会随之而来。
- **无合成。** 没有`reflect_on_memory`的等价物——对存储的所有内容进行推理并返回综合答案的查询，而不仅仅是相关块的排名列表。

对于服务重复用户的智能体，您需要所有这些：

- 一个编码助手，可以记住您的堆栈、团队结构和未完成的工作项目
- 支持智能体，了解用户在数十个会话中的历史记录，并可以将过去的问题与当前的问题联系起来
- 研究助理，基于之前运行的结果并了解已经探索过的内容

这就是Hindsight的作用。并且 `hindsight-llamaindex` 将其连接到 LlamaIndex 的标准工具系统中，而无需更换您已有的任何东西。

## LlamaIndex持久记忆如何运作 {#how-llamaindex-persistent-memory-works}

```
LlamaIndex Agent (ReAct, FunctionCalling, etc.)
  ├─ HindsightToolSpec (extends BaseToolSpec) — agent-driven
  │    ├─ retain_memory()     → Hindsight retain
  │    ├─ recall_memory()     → Hindsight recall
  │    └─ reflect_on_memory() → Hindsight reflect
  │
  └─ HindsightMemory (extends BaseMemory) — automatic
       ├─ put()  → auto-retains user/assistant messages
       └─ get()  → auto-recalls relevant memories as context
```

`HindsightToolSpec` 扩展了LlamaIndex 的[`BaseToolSpec`](https://docs.llamaindex.ai/en/stable/api_reference/tools/)。调用`to_tool_list()`，您将获得标准的`FunctionTool`实例。 `HindsightMemory` 扩展了 `BaseMemory` 以实现透明、自动记忆。没有猴子修补，没有定制包装。任何接受工具或记忆参数的LlamaIndex智能体都可以使用它。

在底层，Hindsight提取结构化事实，识别实体，构建知识图，并通过跨编码器重排序运行四种并行检索策略。

## 第一步：开始Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

​​在`http://localhost:8888`本地运行，带有嵌入式Postgres、嵌入和重排序。

或者使用[Hindsight Cloud](https://ui.hindsight.vectorize.io)并完全跳过自托管。

## 第 2 步：安装集成 {#step-2-install-the-integration}

```bash
pip install hindsight-llamaindex
```

拉入`llama-index-core`和`hindsight-client`。

## 第 3 步：创建智能体 {#step-3-create-the-agent}

传递`mission`以在首次使用时自动创建记忆库。由于 LlamaIndex 智能体是异步的，因此将脚本的所有内容包装在 `asyncio.run()` 中（或在笔记本中使用顶级 `await`）：

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightToolSpec
from llama_index.llms.openai import OpenAI
from llama_index.core.agent import ReActAgent

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    spec = HindsightToolSpec(
        client=client,
        bank_id="user-123",
        mission="追踪用户偏好",
    )
    tools = spec.to_tool_list()

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
    response = await agent.run("记住我更喜欢深色模式")
    print(response)

asyncio.run(main())
```

三种工具，一个记忆库。 记忆在智能体实例中持续存在，因为它存储在Hindsight中，而不是存储在智能体对象中。

## 便利工厂 {#convenience-factory}

如果不需要完全`BaseToolSpec`控制：

```python
from hindsight_llamaindex import create_hindsight_tools

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="追踪用户偏好",
)
```

工厂包装`HindsightToolSpec`并返回一个过滤列表。使用 `include_retain`、`include_recall` 和 `include_reflect` 来控制公开哪些工具。

## 自动记忆（BaseMemory） {#automatic-memory-basememory}

如果您希望记忆透明地发生——没有工具调用，没有智能体提示——使用`HindsightMemory`。它实现了LlamaIndex的`BaseMemory`接口：消息保留在`put()`上，相关记忆在`get()`上调用。

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightMemory
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    memory = HindsightMemory.from_client(
        client=client,
        bank_id="user-123",
        mission="跟踪用户偏好和项目背景",
    )

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"), memory=memory)
    response = await agent.run("记住我更喜欢深色模式")
    print(response)

asyncio.run(main())
```

每条用户消息和助手回复都会自动保留。在下一个回合，相关记忆将被调用并作为系统消息注入。不需要系统提示工程——智能体可以从之前的会话中获取上下文，而无需被告知使用工具。

您还可以组合这两种模式：使用 `HindsightMemory` 进行自动上下文丰富，并仅公开 `reflect_on_memory` 作为智能体需要合成合理答案时的显式工具。

## 选择工具 {#selecting-tools}

您可以控制公开哪些工具：

```python
#通过 to_tool_list()
tools = spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])

#通过工厂标志
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,
)
```

当不同的智能体需要不同的权限时，这非常有用。研究智能体拥有所有这三种工具。报告智能体获得只读访问权限。

## 结合工具+记忆 {#combining-tools--memory}

同时使用两种模式以获得最大的灵活性：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

#自动记忆以丰富语境
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

#智能体驱动的显式工具 反思
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,   #记忆自动处理记忆存储
    include_recall=False,   #记忆自动处理记忆召回
    include_reflect=True,   #智能体还可以明确反思
)

agent = ReActAgent(tools=tools, llm=llm, memory=memory)
```

## 全局配置 {#global-configuration}

设置默认值一次，覆盖每次调用：

```python
from hindsight_llamaindex import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",  # or set HINDSIGHT_API_KEY env var
    budget="mid",
    tags=["source:llamaindex"],
    context="my-app",
    mission="追踪用户偏好",
)

# 现在无需传客户端或 URL 即可创建工具
tools = create_hindsight_tools(bank_id="user-123")
```

每次调用参数覆盖全局配置。您不传递的参数将采用全局默认值。

## 真实世界用例 {#real-world-use-cases}

持久记忆在为持续的多会话关系设计的智能体中最有价值。一些效果很好的模式：

**个人编码助手。** 开发人员在数十个会话中使用相同的智能体。在第一次会话之后，智能体知道他们的堆栈（Python、gRPC、Postgres）、他们的团队结构以及他们的开放工作项目。每个后续会话都以完整的上下文而不是空白状态开始。开发人员从不重新解释他们的环境。

**客户支持智能体。** 支持机器人为在两个月内联系它五次的用户提供服务。如果没有持久记忆，每次交互都从身份验证和问题重新解释开始。通过Hindsight，智能体可以回忆起用户的帐户级别、之前的问题历史记录以及已经尝试过的解决步骤。由于智能体跳过定向阶段，解决时间会缩短。

**研究助理。** 知识收集智能体通过跨多个会话的为期数周的研究项目进行工作。每个会话都会从上一个会话结束的地方继续；智能体回忆起哪些来源已被审查，哪些假设已被测试，以及哪些问题仍然悬而未决。智能体会积累专业知识，而不是重新开始。

在每种情况下，值都是相同的：智能体的上下文随着时间的推移而增长而不是重置。关系越长，智能体就越有用。

## 常见陷阱 {#common-pitfalls}

**记忆库自动创建与使命。** 将`mission=`传递给`HindsightToolSpec`或`HindsightMemory`，首次使用时会自动创建记忆库。如果您更喜欢显式控制，请在智能体启动之前调用 `client.create_bank(bank_id, name=...)`。

**异步处理延迟。** 在`retain_memory`之后，Hindsight异步处理内容。提取事实、实体和嵌入需要 1-3 秒。如果您在同一个会话中记忆存储和立即记忆召回，新的记忆可能还无法搜索。

​​**预算调整。** 默认`budget="mid"` 平衡速度和彻底性。使用`"low"`进行延迟敏感的智能体，使用`"high"`进行深度分析。预算控制运行多少检索策略以及发生多少重排序。

**反思与记忆召回。** 使用 `recall_memory` 获取原始事实（“我使用什么 IDE？”）。使用 `reflect_on_memory` 进行综合（“根据你所知道的一切，我应该优先考虑什么？”）。 推测速度较慢，但​​会产生基于完整知识图的合理答案。

**LlamaIndex智能体是异步的。** `HindsightToolSpec` 提供同步和异步两种工具方法。像[`ReActAgent`](https://docs.llamaindex.ai/en/stable/api_reference/agent/react/)这样的异步智能体直接使用异步变体（`aretain`、`arecall`、`areflect`）。

## 何时不使用此功能 {#when-not-to-use-this}

持久记忆并不总是正确的工具。

- **仅限会话中的上下文。** 如果您的智能体只需要记住单个对话中的内容，LlamaIndex 的`ChatMemoryBuffer` 更简单且零延迟开销。不要仅仅因为可以就添加 Hindsight。
- **文档搜索（RAG）。** 如果您需要对文档语料库进行矢量搜索，请使用LlamaIndex的内置`VectorStoreIndex`。 Hindsight 是一个记忆系统，用于记录随着时间​​的推移学到的事实，而不是文档存储。
- **短暂的智能体。** 如果每个智能体调用在设计上都是无状态的——批处理、一次性任务——持久记忆会增加复杂性，但没有任何好处。
- **延迟关键型热路径。** 每个记忆操作都会增加一次网络往返。如果 100 毫秒以下的响应时间比个性化更重要，请跳过它。

## 比较如何 {#how-this-compares}

||`ChatMemoryBuffer`|LlamaIndex `Memory` (SQLite)|原始矢量存储|Hindsight|
|---|---|---|---|---|
|**范围**|仅限会议期间|持久|持久|持久|
|**它存储什么**|原始对话历史记录|提取的事实（扁平）|任意内容的嵌入|抽取事实+实体+知识图谱|
|**检索**|顺序上下文窗口|仅向量相似度|仅向量相似度|语义+BM25+图形+时间，带重排序|
|**实体解析**|否|否|否|是的|
|**合成**|否|否|否|是 (`reflect_on_memory`)|
|**框架耦合**|仅限 LlamaIndex|仅限 LlamaIndex|无|无|
|**最适合**|单会话聊天|LlamaIndex 内的简单跨会话记忆|文档搜索（RAG）|跨框架的长期用户/智能体记忆|

**vs。 LangGraph/LangChain：** 如果您使用 LangGraph 而不是 LlamaIndex，请参阅 [`hindsight-langgraph`](https://hindsight.vectorize.io/sdks/integrations/langgraph)，它提供了工具、图形节点和 `BaseStore` 适配器。

## 常见问题解答 {#faq}

**为什么`recall_memory`没有返回我刚刚存储的结果？**
Hindsight 异步处理保留的内容。调用`retain_memory`后，等待1-3秒再调用`recall_memory`。在生产中，构建您的工作流程，以便记忆存储和记忆召回在单独的会话中发生，而不是在同一个会话中连续发生。

**如果我在记忆库存在之前调用`recall_memory`会发生什么？**
调用将会失败。最简单的解决方法是在创建`HindsightToolSpec`或`HindsightMemory`时传递`mission=`——记忆库是在第一次使用时自动创建的。或者，在初始化规范之前调用`client.create_bank(bank_id)`。

**我的智能体没有自动呼叫`retain_memory`。为什么？**
智能体根据系统提示决定何时调用工具。如果您的系统提示没有指示智能体存储重要的事实，它就不会可靠地执行此操作。包括明确的指令：`"使用 retain_memory 存储用户分享的事实、偏好和上下文。"` 然后进行几轮测试以确认行为。

**我可以将 Hindsight 与非 ReAct LlamaIndex 智能体一起使用吗？**
是的。 `HindsightToolSpec`通过`to_tool_list()`返回标准`FunctionTool`实例。任何接受工具列表的LlamaIndex智能体都支持它，包括`FunctionCallingAgent`和使用LlamaIndex工具抽象的自定义智能体实现。

## 回顾 {#recap}

会话记忆重置。长期记忆不一定如此。

`hindsight-llamaindex`适合任何LlamaIndex智能体，只需三个步骤：安装包、创建记忆库、传递工具。从那时起，您的智能体学到的每个事实都会在当前会话和随后的每个会话中存储、索引和检索。当用户在三月份返回时，在一月份为用户提供服务的智能体知道它在一月份学到了什么。

这就是会话范围的工具和具有真正记忆的智能体之间的实际区别。使用得越多，它就变得越有用。

立即尝试：`pip install hindsight-all hindsight-llamaindex`并运行上面的示例。或者如果您想跳过自托管，请从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 开始。

## 后续步骤 {#next-steps}

- **文档**：[LlamaIndex集成指南](https://hindsight.vectorize.io/sdks/integrations/llamaindex)
- **其他集成**：[LangGraph](https://hindsight.vectorize.io/sdks/integrations/langgraph)、[Pydantic AI](https://hindsight.vectorize.io/sdks/integrations/pydantic-ai)、[CrewAI](https://hindsight.vectorize.io/sdks/integrations/crewai)
