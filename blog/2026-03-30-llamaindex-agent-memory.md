---
title: "教会 Llama 记住信息"
description: LlamaIndex 智能体每次会话都会重置记忆。了解如何通过 3 个步骤，使用 hindsight-llamaindex 添加跨会话持久记忆。包含完整代码示例。
authors: [DK09876]
date: 2026-03-30T12:00
tags: [llamaindex, integrations, agents, memory, python, tutorial]
image: /img/blog/llamaindex-agent-memory.webp
hide_table_of_contents: true
---

![教会 Llama 记住信息](/img/blog/llamaindex-agent-memory.webp)

你已经构建了一个能出色回答问题的 LlamaIndex 智能体。可会话一结束，它就把一切都忘了：用户的姓名、偏好，以及你花了三个回合才建立起来的上下文。下一次会话又从零开始。

这是 LlamaIndex 内置记忆的核心限制：它的作用范围仅限当前会话。智能体运行时，`ChatMemoryBuffer` 会保存对话历史；但一旦重启，上下文就消失了。对于服务回访用户或运行多会话工作流的智能体来说，这不是小小的不便，而是能力上的根本缺口。

`hindsight-llamaindex` 可以解决这个问题。它提供两种互补模式：一种是基于 `BaseToolSpec` 的工具，让智能体显式调用 Retain（存入）、Recall（召回）和 Reflect（反思）工具；另一种是 `BaseMemory` 实现，可在每个回合自动存入和召回记忆。无论会话何时开始，智能体都能记住自己学到的内容。

**你将了解：**
- 为什么 LlamaIndex 智能体记忆会重置，以及持久记忆的实际含义
- `hindsight-llamaindex` 如何通过工具系统和记忆接口接入任何 LlamaIndex 智能体
- 如何通过三个步骤设置跨会话记忆，并查看完整代码示例
- 何时适合使用持久记忆，何时可以不使用

可搭配 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管版本使用。

<!-- truncate -->

## 什么是 LlamaIndex 智能体记忆？ {#what-is-llamaindex-agent-memory}

LlamaIndex 的记忆工具经历了两代发展。最初的 `ChatMemoryBuffer` 会在会话中保存原始对话历史，重启后则会重置。较新的 `Memory` 类加入了可插拔的 `MemoryBlock` 模块（包括 `FactExtractionMemoryBlock`），并以 SQLite 为后端，使记忆能够在重启后保留。

这确实是进步。但新系统仍有明显的局限：它只能按向量相似度检索，没有知识图谱或实体消歧能力，而且与 LlamaIndex 生态紧密耦合。如果你换用其他智能体框架，记忆层也无法随之迁移。

从完整意义上说，“持久”记忆应当能从对话中提取事实，随时间构建知识图谱，并并行使用多种策略检索相关上下文，而不只是返回最近的嵌入匹配结果。无论使用哪种智能体框架，这套记忆系统都应当能继续工作。

`hindsight-llamaindex` 通过两种模式提供这些能力**。工具模式**（`HindsightToolSpec`）会公开三个原生 LlamaIndex 工具：`retain_memory`（存储事实）、`recall_memory`（检索记忆）和 `reflect_on_memory`（根据已存储的全部内容综合推理并作答）**。记忆模式**（`HindsightMemory`）实现了 LlamaIndex 的 `BaseMemory` 接口，可自动存储消息，并在每个回合召回相关上下文，无需显式调用工具。

## LlamaIndex 内置记忆的问题 {#the-problem-with-llamaindexs-built-in-memory}

LlamaIndex 较新的 `Memory` API 加上 SQLite 持久化，确实是很大的进步：事实在重启后仍会保留，`FactExtractionMemoryBlock` 也能从对话中提取结构化信息。对于简单的用例，这已经够用。

但查询一复杂，它就会遇到明显的架构限制：

- **检索策略单一。** LlamaIndex Memory 只使用向量相似度。它没有用于精确匹配的 BM25、用于关系查询的图遍历，也没有用于按日期召回的时间检索。“我上周二在做什么？”得到的会是语义上相近的内容，而不一定是周二实际发生的事。
- **没有知识图谱。** 事实以嵌入向量存储，而不是作为带有关联关系的实体存储。如果“Priya 负责速率限制服务”和“速率限制问题已经解决”这两条事实没有出现在同一个对话回合中，系统就无法将它们联系起来。
- **与框架耦合。** LlamaIndex Memory 是为 LlamaIndex 设计的。如果迁移到其他智能体框架，记忆层不会随之迁移。
- **无法综合推理。** 它没有与 `reflect_on_memory` 对应的能力，无法对所有已存储的内容进行推理并给出综合答案；它只能返回按相关性排序的分块列表。

服务回访用户的智能体需要具备这些能力：

- 编程助手能够记住你的技术栈、团队结构和待办事项
- 支持智能体能够了解用户数十次会话中的历史，并把过去的问题与当前问题联系起来
- 研究助手能够在此前运行的基础上继续工作，并了解哪些内容已经探索过

这正是 Hindsight 的用途。`hindsight-llamaindex` 能把它接入 LlamaIndex 的标准工具系统，无需替换你已有的任何组件。

## LlamaIndex 持久记忆的工作方式 {#how-llamaindex-persistent-memory-works}

```
LlamaIndex Agent (ReAct, FunctionCalling, etc.)
  ├─ HindsightToolSpec (extends BaseToolSpec) — 智能体驱动
  │    ├─ retain_memory()     → Hindsight Retain
  │    ├─ recall_memory()     → Hindsight Recall
  │    └─ reflect_on_memory() → Hindsight Reflect
  │
  └─ HindsightMemory (extends BaseMemory) — 自动
       ├─ put()  → 自动存入用户/助手消息
       └─ get()  → 自动召回相关记忆作为上下文
```

`HindsightToolSpec` 扩展了 LlamaIndex 的 [`BaseToolSpec`](https://docs.llamaindex.ai/en/stable/api_reference/tools/)。调用 `to_tool_list()` 后，会得到标准的 `FunctionTool` 实例。`HindsightMemory` 扩展了 `BaseMemory` 接口，实现透明、自动的记忆管理。无需猴子补丁，也无需自定义封装。任何接受工具或 memory 参数的 LlamaIndex 智能体都可以使用它。

在底层，Hindsight 会提取结构化事实、识别实体、构建知识图谱，并并行运行四种检索策略，再通过交叉编码器进行重排序。

## 第 1 步：启动 Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

服务会在本地 `http://localhost:8888` 运行，并内置 Postgres、嵌入模型和重排序功能。

也可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，完全跳过自托管部署。

## 第 2 步：安装集成包 {#step-2-install-the-integration}

```bash
pip install hindsight-llamaindex
```

安装时会一并引入 `llama-index-core` 和 `hindsight-client`。

## 第 3 步：创建智能体 {#step-3-create-the-agent}

传入 `mission`，即可在首次使用时自动创建记忆库。由于 LlamaIndex 智能体是异步的，编写脚本时要用 `asyncio.run()` 包装整个流程（在笔记本中也可以使用顶层 `await`）：

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
        mission="Track user preferences",
    )
    tools = spec.to_tool_list()

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
    response = await agent.run("Remember that I prefer dark mode")
    print(response)

asyncio.run(main())
```

三个工具，一个记忆库。记忆存储在 Hindsight 中，而不是智能体对象里，因此智能体实例之间可以共享记忆。

## 便捷工厂函数 {#convenience-factory}

如果不需要完全控制 `BaseToolSpec`，可以使用便捷工厂函数：

```python
from hindsight_llamaindex import create_hindsight_tools

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="Track user preferences",
)
```

这个工厂函数会封装 `HindsightToolSpec` 并返回经过筛选的工具列表。使用 `include_retain`、`include_recall` 和 `include_reflect` 控制要公开哪些工具。

## 自动记忆（BaseMemory） {#automatic-memory-basememory}

如果希望记忆过程自动进行，不调用工具，也不需要在提示词中要求智能体使用工具，可以使用 `HindsightMemory`。它实现了 LlamaIndex 的 `BaseMemory` 接口：消息通过 `put()` 存入，相关记忆通过 `get()` 召回。

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
        mission="Track user preferences and project context",
    )

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"), memory=memory)
    response = await agent.run("Remember that I prefer dark mode")
    print(response)

asyncio.run(main())
```

每条用户消息和助手回复都会自动存入记忆。下一回合中，系统会召回相关记忆，并将其作为系统消息注入。无需专门设计系统提示词，智能体就能获取此前会话的上下文，而不用被要求调用工具。

也可以组合这两种模式：使用 `HindsightMemory` 自动补充上下文，并只把 `reflect_on_memory` 作为显式工具公开，让智能体在需要综合推理并作答时调用。

## 选择工具 {#selecting-tools}

你可以控制要公开哪些工具：

```python
# 通过 to_tool_list() 指定
tools = spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])

# 通过工厂函数的标志指定
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,
)
```

当不同智能体需要不同权限时，这很有用。研究智能体可以使用全部三个工具；报告智能体则只获得只读访问权限。

## 组合使用工具和记忆 {#combining-tools--memory}

同时使用两种模式，获得最大的灵活性：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

# 自动补充上下文
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

# 让智能体显式调用 Reflect 工具
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,   # 记忆接口会自动存入记忆
    include_recall=False,   # 记忆接口会自动召回记忆
    include_reflect=True,   # 智能体仍可显式调用 Reflect
)

agent = ReActAgent(tools=tools, llm=llm, memory=memory)
```

## 全局配置 {#global-configuration}

设置一次默认值，并按调用覆盖：

```python
from hindsight_llamaindex import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    tags=["source:llamaindex"],
    context="my-app",
    mission="Track user preferences",
)

# 无需传入 client 或 URL，即可创建工具
tools = create_hindsight_tools(bank_id="user-123")
```

每次调用时传入的参数会覆盖全局配置。未传入的参数则使用全局默认值。

## 实际用例 {#real-world-use-cases}

对于需要与用户持续互动、跨多个会话工作的智能体，持久记忆最有价值。以下是几种实用模式：

**个人编程助手。** 开发者在数十个会话中使用同一个智能体。第一次会话结束后，智能体便了解开发者的技术栈（Python、gRPC、Postgres）、团队结构和待办事项。之后每次会话都能从完整上下文开始，而不是面对空白状态。开发者无需再三解释自己的工作环境。

**客户支持智能体。** 支持机器人在两个月内为同一位用户服务五次。如果没有持久记忆，每次交流都得重新验证身份、了解问题。使用 Hindsight 后，智能体可以召回用户的账户等级、过往问题以及已经尝试过的解决步骤。由于可以跳过了解背景的阶段，问题解决时间会缩短。

**研究助手。** 知识收集型智能体在多个会话中推进一项为期数周的研究项目。每次会话都能从上次结束处继续；智能体会记得哪些来源已经审阅、哪些假设已经测试、还有哪些问题尚未解决。智能体不断积累专业知识，而不是每次都从头开始。

在所有这些场景中，价值都相同：智能体的上下文会随时间不断积累，而不是反复重置。互动越久，智能体就越有用。

## 常见问题与易错点 {#common-pitfalls}

**通过 mission 自动创建记忆库。** 将 `mission=` 传给 `HindsightToolSpec` 或 `HindsightMemory`，首次使用时就会自动创建记忆库。如果你希望显式控制，也可以在启动智能体前调用 `client.create_bank(bank_id, name=...)`。

**异步处理延迟。** 调用 `retain_memory` 后，Hindsight 会异步处理内容。提取事实和实体、生成嵌入需要 1-3 秒。如果存入记忆后立即在同一会话中召回，新记忆可能还无法检索。

**调整预算。** 默认的 `budget="mid"` 兼顾速度和全面性。对延迟敏感的智能体可使用 `"low"`，深度分析可使用 `"high"`。预算决定运行多少种检索策略，以及进行多少重排序。

**Reflect 与 Recall。** 使用 `recall_memory` 获取原始事实（“我用的 IDE 是什么？”）；使用 `reflect_on_memory` 进行综合推理（“基于你对我的了解，我应该优先处理什么？”）。Reflect 速度较慢，但会结合完整知识图谱推理并给出答案。

**LlamaIndex 智能体是异步的。** `HindsightToolSpec` 同时提供同步和异步工具方法。像 [`ReActAgent`](https://docs.llamaindex.ai/en/stable/api_reference/agent/react/) 这样的异步智能体会直接使用异步变体（`aretain`、`arecall`、`areflect`）。

## 何时不应使用 {#when-not-to-use-this}

持久记忆并不总是合适的工具。

- **只需要会话内上下文。** 如果智能体只需记住单次对话中的信息，LlamaIndex 的 `ChatMemoryBuffer` 更简单，而且不会增加延迟。不要只是因为能用 Hindsight 就添加它。
- **文档检索（RAG）。** 如果需要对文档语料库进行向量检索，请使用 LlamaIndex 内置的 `VectorStoreIndex`。Hindsight 用于记忆随时间学到的事实，不是文档存储系统。
- **短暂运行的智能体。** 如果每次调用都按设计保持无状态（例如批处理或一次性任务），持久记忆会增加复杂度，却没有收益。
- **对延迟要求极高的关键路径。** 每次记忆操作都会增加一次网络往返。如果响应时间必须低于 100 ms，且这比个性化更重要，就不要使用持久记忆。

## 功能对比 {#how-this-compares}

| | `ChatMemoryBuffer` | LlamaIndex `Memory`（SQLite） | 原始向量存储 | Hindsight |
|---|---|---|---|---|
| **作用范围** | 仅限当前会话 | 持久 | 持久 | 持久 |
| **存储内容** | 原始对话历史 | 提取的事实（扁平存储） | 任意内容的嵌入向量 | 提取的事实、实体和知识图谱 |
| **检索方式** | 按顺序使用上下文窗口 | 仅向量相似度 | 仅向量相似度 | 语义检索、BM25、图检索和时间检索，并进行重排序 |
| **实体消歧** | 否 | 否 | 否 | 是 |
| **综合推理** | 否 | 否 | 否 | 是（`reflect_on_memory`） |
| **与框架耦合** | 仅限 LlamaIndex | 仅限 LlamaIndex | 无 | 无 |
| **适用场景** | 单会话聊天 | 在 LlamaIndex 中进行简单的跨会话召回 | 文档检索（RAG） | 跨框架的用户和智能体长期记忆 |

**与 LangGraph/LangChain 对比：** 如果你使用的是 LangGraph 而非 LlamaIndex，请参阅 [`hindsight-langgraph`](https://hindsight.vectorize.io/sdks/integrations/langgraph)。它提供工具、图节点和 `BaseStore` 适配器。

## 常见问题 {#faq}

**为什么 `recall_memory` 没有返回我刚存入的内容？**
Hindsight 会异步处理存入的内容。调用 `retain_memory` 后，等待 1-3 秒再调用 `recall_memory`。在生产环境中，应将工作流设计为在不同会话中执行存入和召回，而不是在同一会话中连续操作。

**如果记忆库尚不存在，我就调用 `recall_memory`，会发生什么？**
调用会失败。最简单的解决方法是在创建 `HindsightToolSpec` 或 `HindsightMemory` 时传入 `mission=`，这样记忆库会在首次使用时自动创建。也可以在初始化工具规范前调用 `client.create_bank(bank_id)`。

**为什么我的智能体不会自动调用 `retain_memory`？**
智能体会根据系统提示决定何时调用工具。如果系统提示没有要求它存储重要事实，它就不会可靠地执行这项操作。请加入明确指令：`"使用 retain_memory 存储用户分享的事实、偏好或上下文。"` 然后通过几轮对话测试，确认其行为符合预期。

**我可以在非 ReAct 的 LlamaIndex 智能体中使用 Hindsight 吗？**
可以。`HindsightToolSpec` 通过 `to_tool_list()` 返回标准 `FunctionTool` 实例。任何接受工具列表的 LlamaIndex 智能体都可以使用它，包括 `FunctionCallingAgent`，以及使用 LlamaIndex 工具抽象的自定义智能体实现。

## 回顾 {#recap}

会话记忆会重置，长期记忆则不必如此。

只需三个步骤，`hindsight-llamaindex` 就能接入任何 LlamaIndex 智能体：安装程序包、创建记忆库、传入工具。从那以后，智能体学到的每条事实都会被存储、建立索引，并可在当前及之后的每个会话中检索。用户三月再次回来时，一月曾为其服务的智能体还记得一月学到的内容。

这就是作用范围仅限会话的工具与真正拥有记忆的智能体之间的实际区别。使用得越多，它就越有用。

立即试用：运行 `pip install hindsight-all hindsight-llamaindex`，然后执行上面的示例。如果想跳过自托管部署，也可以从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 开始。

## 后续步骤 {#next-steps}

- **文档：** [LlamaIndex 集成指南](https://hindsight.vectorize.io/sdks/integrations/llamaindex)
- **其他集成：** [LangGraph](https://hindsight.vectorize.io/sdks/integrations/langgraph)、[Pydantic AI](https://hindsight.vectorize.io/sdks/integrations/pydantic-ai)、[CrewAI](https://hindsight.vectorize.io/sdks/integrations/crewai)
