---
title: "Pydantic AI 持久记忆：用 5 行代码接入"
authors: [benfrank241]
date: 2026-03-09T12:00
tags: [memory, openai, anthropic, gemini, python, rust, agents, rag, vector, pydantic-ai, knowledge-graph, tutorial]
image: /img/blog/pydantic-ai-persistent-memory.webp
hide_table_of_contents: true
---

如果你使用 [Pydantic AI](https://ai.pydantic.dev/) 构建过 AI 智能体，就会知道它擅长处理类型化输出、依赖注入和异步工作流。但它有一项缺失：无法在多次运行之间记住信息。每次调用 `agent.run()` 都从空白状态开始。智能体不知道用户昨天说过什么、分享了哪些偏好，也不知道自己已经研究过什么。

为 Pydantic AI 添加**持久记忆**，不需要构建自定义 RAG 管道，也不必自行管理向量数据库。借助 `hindsight-pydantic-ai` 集成，只需 5 行 Python 代码，就能为任意 Pydantic AI 智能体接入长期记忆。本指南将介绍从安装到生产环境实践的完整配置过程。

<!-- truncate -->

## 概览 {#tldr}

- Pydantic AI 没有内置持久记忆，每次运行时智能体都会从头开始。
- `hindsight-pydantic-ai` 会添加 Retain（存入）、Recall（召回）和 Reflect（反思）工具，并自动注入记忆指令。
- 只需 5 行即可完成设置：创建客户端、调用 `create_hindsight_tools()`，再将工具传给 Agent。
- `memory_instructions()` 会在每次运行时静默地将相关记忆预先载入系统提示，让智能体在每次对话开始时就获得上下文。
- 支持 OpenAI、Anthropic 和 Gemini 等各种模型服务提供方。

---

## 问题：Pydantic AI 没有持久记忆 {#the-problem-pydantic-ai-has-no-persistent-memory}

[Pydantic AI](https://ai.pydantic.dev/) 是一个可靠的框架。类型化输出、依赖注入、原生异步设计和简洁的工具 API，使它成为构建 Python 智能体的热门选择。不过，它完全没有内置记忆层。

每次调用 `agent.run()` 都从零开始。智能体不知道用户昨天说过什么、有什么偏好，也不知道自己已经研究过什么。因此，与用户跨多个会话交互的智能体会在每次运行之间丢失积累的上下文。

你可以通过 `message_history` 在单个会话中延续对话，但那只是聊天历史，不是记忆。聊天历史不会归纳事实，也不会整合重复信息；它还会线性增长，直到超出上下文窗口和 token 限额。

真正的智能体记忆意味着：

- 从对话中提取结构化事实
- 构建包含实体及其关系的知识图谱
- 跨越数天、数周和数月检索相关上下文
- 从零散记忆中综合生成连贯的答案

这正是 [Hindsight](https://hindsight.vectorize.io/) 提供的能力。如果你用过 Hindsight 与 [CrewAI](/blog/2026/03/02/crewai) 或 [OpenAI](/blog/2026/03/05/add-memory-to-openai-application) 等其他框架集成，原理是相同的。`hindsight-pydantic-ai` 会将这些能力直接接入 Pydantic AI 的工具和指令系统，因此你无需自行构建这一切。

---

## Hindsight 如何为 Pydantic AI 提供持久记忆 {#how-pydantic-ai-persistent-memory-works-with-hindsight}

开始写代码前，先了解通过 Hindsight 集成添加 Pydantic AI 持久记忆时，底层会发生什么。

Hindsight 是一个可在本地或云端运行的记忆引擎。智能体存储事实时，Hindsight 不会只保存原始文本，而是会提取结构化实体和关系、构建知识图谱，并为所有内容建立索引，以支持多策略检索。这样，智能体日后搜索记忆时，就能结合语义检索、BM25 关键词匹配、图遍历和时间排序来查找相关信息。

`hindsight-pydantic-ai` 通过两个集成点将这个引擎接入 Pydantic AI：

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

**工具**让智能体在对话过程中显式存储和检索记忆。**指令**则会在智能体开始思考之前静默注入相关记忆。两者都是可选的，你可以根据使用场景选择其中一个或同时使用。

这些工具是直接调用 Hindsight API 的异步函数。由于 Pydantic AI 原生支持异步，闭包会使用 `aretain()`、`arecall()` 和 `areflect()`。无需使用线程池技巧或兼容层。如果你更倾向于基于协议的方式，也可以使用 [Hindsight 的 MCP 记忆服务器](/blog/2026/03/04/mcp-agent-memory)，而不是直接集成工具。

---

## 5 步为 Pydantic AI 接入持久记忆 {#setting-up-pydantic-ai-persistent-memory-in-5-steps}

整个配置过程大约需要 5 分钟。你将安装 Hindsight 和 Pydantic AI 记忆集成包，把工具接入智能体，并测试记忆能否跨会话保留。

### 第 1 步：安装并启动 Hindsight {#step-1-install-and-start-hindsight}

首先安装 Hindsight 服务器，并在本地启动：

```bash
pip install hindsight-all
```

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

服务将在本地的 `http://localhost:8888` 运行，内含嵌入式 Postgres、本地嵌入模型和本地重排序。除用于实体提取的 LLM API 密钥外，无需依赖外部服务。

> **注意：** 你也可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，完全跳过自托管配置。云版本提供相同的 API，并由托管基础设施支持。

### 第 2 步：安装 Pydantic AI 记忆集成 {#step-2-install-the-pydantic-ai-memory-integration}

接下来安装集成包：

```bash
pip install hindsight-pydantic-ai
```

你还需要一个模型服务提供方。若使用 OpenAI：

```bash
pip install "pydantic-ai-slim[openai]"
```

其他服务提供方的配置方式相同，按需替换为 `[anthropic]` 或 `[google]`。Pydantic AI 持久记忆集成与模型无关，因此无论选择哪种 LLM，记忆层的工作方式都相同。Hindsight 通过 LiteLLM 支持 [100 多种 LLM 服务提供方](/blog/2026/03/03/litellm)。

### 第 3 步：为 Pydantic AI 智能体添加持久记忆工具 {#step-3-add-persistent-memory-tools-to-your-pydantic-ai-agent}

下面就是 5 行代码的部分：创建 Hindsight 客户端，生成 Pydantic AI 持久记忆工具，再将它们传给智能体：

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

以上就是 Pydantic AI 持久记忆的完整配置。现在，智能体有了三个工具：

- `hindsight_retain(content)`：将信息存入长期记忆
- `hindsight_recall(query)`：搜索记忆并返回匹配的事实
- `hindsight_reflect(query)`：基于所有相关记忆进行推理，综合生成答案

智能体会根据对话上下文决定何时使用各个工具，你不需要手动调用它们。

### 第 4 步：测试跨会话记忆 {#step-4-test-cross-session-memory}

运行两次独立对话，验证 Pydantic AI 智能体能否跨会话保留记忆：

```python
import asyncio

async def main():
    # 第一次对话
    r1 = await agent.run(
        "Remember that I prefer functional programming patterns "
        "and I'm building a data pipeline in Python."
    )
    print(r1.output)

    # 稍后的对话——智能体召回上下文
    r2 = await agent.run("What approach should I take for error handling?")
    print(r2.output)

asyncio.run(main())
```

第一次运行时，智能体会通过 `hindsight_retain` 存储这些偏好。第二次运行时，它会调用 `hindsight_recall` 查找相关上下文，然后根据已知信息给出建议：函数式编程模式、Python 和数据管道。

这就是 Pydantic AI 持久记忆的核心优势：记忆可以跨运行、跨天保留，即使进程重启也不会丢失。记忆存储在 Hindsight 的知识图谱中，而不是智能体的上下文窗口里。即使完全重启 Python 进程，智能体也能接续之前的状态。

### 第 5 步：通过 Pydantic AI 指令自动注入记忆 {#step-5-auto-inject-memories-with-pydantic-ai-instructions}

上面的工具需要智能体自行决定是否搜索记忆。有时，你可能希望在智能体开始响应前自动注入持久记忆。

Pydantic AI 的 `instructions` 参数支持异步可调用对象，并会在每次 `agent.run()` 时运行。这正适合用于注入记忆：

```python
from hindsight_pydantic_ai import create_hindsight_tools, memory_instructions

agent = Agent(
    "openai:gpt-4o-mini",
    tools=create_hindsight_tools(client=client, bank_id="user-123"),
    instructions=[memory_instructions(client=client, bank_id="user-123")],
)
```

现在，每次运行时，`memory_instructions` 都会调用 Hindsight 的 Recall API，并把相关记忆注入系统提示。智能体在每次对话开始时就能获得用户相关上下文，无需调用工具。

你可以自定义查询、结果数量和前缀，以控制注入的内容：

```python
memory_instructions(
    client=client,
    bank_id="user-123",
    query="user preferences, history, and context",
    max_results=10,
    prefix="Here is what you know about this user:\n",
)
```

如果 Recall 失败或没有返回结果，指令函数就会返回空字符串，不会阻止智能体作答。

---

## 高级 Pydantic AI 记忆配置 {#advanced-pydantic-ai-memory-configuration}

### 选择要包含的记忆工具 {#selecting-which-memory-tools-to-include}

你不一定需要全部三个持久记忆工具。`create_hindsight_tools` 可以让你选择要包含哪些工具：

```python
# 只读智能体：可以搜索记忆，但不能写入
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,
    include_recall=True,
    include_reflect=True,
)

# 只写智能体：可以存入数据，但不查询
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=False,
    include_reflect=False,
)
```

这种灵活性适用于多智能体架构。例如，一个 Pydantic AI 智能体可以负责收集信息并写入持久记忆，另一个智能体则读取记忆来回答问题。将读写权限分开，能让每个智能体专注于自己的职责，也能避免本应只读取上下文的智能体意外写入记忆。

### 为多个智能体配置全局设置 {#global-configuration-for-multiple-agents}

如果多个 Pydantic AI 智能体共享同一个 Hindsight 持久记忆实例，可以使用全局配置，省去在各处传递 `client`：

```python
from hindsight_pydantic_ai import configure, create_hindsight_tools

configure(hindsight_api_url="http://localhost:8888", api_key="YOUR_KEY")

# 无需客户端：工具使用全局配置
agent1_tools = create_hindsight_tools(bank_id="agent-1")
agent2_tools = create_hindsight_tools(bank_id="agent-2")
```

显式传入的 `client=` 始终优先于全局配置，因此你可以为单个智能体覆盖设置。

---

## Pydantic AI 持久记忆完整示例 {#full-working-example-of-pydantic-ai-persistent-memory}

将以下代码保存为 `memory_agent.py` 并运行，即可体验 Pydantic AI 持久记忆：

```python
import asyncio

from hindsight_client import Hindsight
from hindsight_pydantic_ai import create_hindsight_tools, memory_instructions
from pydantic_ai import Agent

BANK_ID = "demo-user"


async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id=BANK_ID, name="Demo User Memory")

    agent = Agent(
        "openai:gpt-4o-mini",
        tools=create_hindsight_tools(client=client, bank_id=BANK_ID),
        instructions=[memory_instructions(client=client, bank_id=BANK_ID)],
    )

    print("--- Run 1: Teaching the agent ---")
    r1 = await agent.run(
        "Remember: I'm a backend engineer. I use Python and Rust. "
        "I prefer small, composable libraries over large frameworks."
    )
    print(f"Agent: {r1.output}\n")

    print("--- Run 2: Agent recalls context ---")
    r2 = await agent.run("Recommend a web framework for my next project.")
    print(f"Agent: {r2.output}\n")

    print("--- Run 3: Agent synthesizes ---")
    r3 = await agent.run("What do you know about my engineering philosophy?")
    print(f"Agent: {r3.output}")


asyncio.run(main())
```

运行代码：

```bash
export OPENAI_API_KEY=YOUR_KEY
python memory_agent.py
```

第一次执行完成后，再运行一次。智能体会记住首次会话中的所有内容，因为 Pydantic AI 持久记忆把事实存储在 Hindsight 中，而不是当前进程中。

---

## Pydantic AI 持久记忆：注意事项与边缘情况 {#pydantic-ai-persistent-memory-pitfalls-and-edge-cases}

**记忆库 ID 冲突。** 每个 `bank_id` 都对应一个独立的持久记忆存储。如果两个互不相关的智能体共用一个记忆库，它们的记忆可能会以意料之外的方式混在一起。请为每个用户、智能体或项目使用不同的记忆库 ID。

**指令导致的延迟。** `memory_instructions` 会在每次 `agent.run()` 时调用 Recall API。对延迟敏感的应用可以使用 `budget="low"` 并减少 `max_results`。也可以完全跳过自动注入记忆，只在需要时由智能体调用 Recall 工具。在大多数情况下，持久记忆查询会额外增加 50–200 ms 延迟，具体取决于记忆量和网络状况。

**重复记忆。** 如果智能体多次存储同一信息，Hindsight 会在事实层面去重。不过，最好还是在系统提示中明确指导智能体何时存储新事实、何时跳过。

**异步事件循环冲突。** 同步方法 `create_bank()` 不能在 `asyncio.run()` 内使用，因为它会尝试创建嵌套事件循环。在异步代码中始终使用 `await client.acreate_bank()`。这是常见的 Python 异步编程陷阱，并非 Hindsight 或 Pydantic AI 持久记忆特有的问题。

---

## Pydantic AI 记忆：权衡与替代方案 {#pydantic-ai-memory-tradeoffs-and-alternatives}

### 适合使用 Pydantic AI 持久记忆的场景 {#when-pydantic-ai-persistent-memory-makes-sense}

对于需要跨多个会话与同一用户或同一上下文交互的智能体，Pydantic AI 与 Hindsight 的持久记忆最为适用。典型场景包括个人助理、客服机器人、需要积累知识的研究智能体，以及任何能通过记住过去交互来逐步提升质量的 Python 智能体。

### 不适合使用的场景 {#when-not-to-use-it}

对于只运行一次的智能体、每个请求彼此独立的无状态 API 处理程序，或需要完全控制提示中包含哪些内容的智能体，不必使用持久记忆。最后一种情况下，可以直接使用 Hindsight Python 客户端，而不接入 Pydantic AI 集成。

### 与替代方案的比较 {#how-it-compares-to-alternatives}

| 方案 | 优势 | 不足 | 适用场景 |
| --- | --- | --- | --- |
| **Hindsight + Pydantic AI** | 多策略检索（语义检索、BM25、图检索和时间检索）、结构化事实提取、综合生成引擎 | 需要运行 Hindsight 服务器或使用云服务 | 需要深入记忆能力的多会话智能体 |
| **手动使用 `message_history`** | Pydantic AI 内置，无需额外依赖 | 不会归纳事实，历史会不断增长，直至达到上下文窗口上限 | 简短的单会话对话 |
| **自定义向量存储 + RAG** | 可完全控制嵌入和检索 | 需要自行管理分块、索引和检索 | 已有向量基础设施的团队 |
| **Mem0** | 另一种外部记忆方案，API 简单 | 检索策略较少，不支持基于图的 Recall | 不需要实体关系的简单记忆场景 |

应根据需求选择方案。对于大多数需要以最少配置实现跨会话持久记忆的 Pydantic AI 智能体，Hindsight 集成提供了最快的生产落地路径。

---

## 回顾：Pydantic AI 持久记忆集成 {#recap-pydantic-ai-persistent-memory-integration}

为 Pydantic AI 添加持久记忆，不需要复杂的基础设施或自定义检索管道。`hindsight-pydantic-ai` 集成通过两个函数覆盖智能体记忆的完整生命周期：

- **`create_hindsight_tools()`** 返回异步工具，供智能体调用，以便跨会话存储和检索知识。
- **`memory_instructions()`** 会在每次运行时自动注入相关记忆，让智能体带着上下文开始工作，无需调用工具。

该集成刻意保持轻量：只需两个函数，无须子类化，也不必修改 deps 类型。只需使用 Pydantic AI 工具和指令，即可连接到真正的记忆引擎。

记忆不会因进程重启而丢失，并会随着时间推移构建知识图谱；智能体对每位用户了解得越多，记忆的价值也会不断累积。对于需要持久记忆的 Pydantic AI 智能体开发者来说，这是从无状态转向有状态的最简单路径。

---

## 后续步骤 {#next-steps}

- **本地试用**：运行 `pip install hindsight-all hindsight-pydantic-ai "pydantic-ai-slim[openai]"`，然后执行上面的示例。
- **使用 Hindsight Cloud**：注册[免费账户](https://ui.hindsight.vectorize.io)，跳过自托管配置。
- **通过标签划分记忆范围**：在 Retain 时使用 `tags`，在搜索时使用 `recall_tags`，按项目、环境或主题划分记忆。
- **组合使用工具和指令**：使用 `memory_instructions` 自动注入上下文，并在对话过程中通过工具显式存入和检索记忆。
- **阅读 Pydantic AI 文档**：深入了解 [Pydantic AI 工具和指令](https://ai.pydantic.dev/tools/)，进一步扩展智能体能力。
- **探索其他集成**：为 [CrewAI 智能体](/blog/2026/03/02/crewai)、[OpenAI 应用](/blog/2026/03/05/add-memory-to-openai-application)，或通过 [MCP](/blog/2026/03/04/mcp-agent-memory) 为任意框架接入记忆。
- **查看知识图谱**：运行 Hindsight 控制台，或使用[云端控制台](https://ui.hindsight.vectorize.io)，浏览提取出的事实、实体和关系。
