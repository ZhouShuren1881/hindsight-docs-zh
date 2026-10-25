---
title: "Agno 持久记忆：为 Agno 智能体提供长期记忆"
authors: [benfrank241]
date: 2026-04-09T09:00
tags: [agno, integrations, agents, memory, persistent-memory, python, tutorial]
description: "Agno 智能体每次运行都会从头开始。hindsight-agno 添加了 HindsightTools 和 memory_instructions，让智能体能够跨会话存入、召回并反思记忆。"
image: /img/blog/agno-persistent-memory.webp
hide_table_of_contents: true
---

![Agno 持久记忆：为 Agno 智能体提供长期记忆](/img/blog/agno-persistent-memory.webp)

如果你使用 [Agno](https://docs.agno.com/) 构建过智能体，就会知道这个框架能够很好地处理多模态输入、团队协作和结构化输出。但它无法处理多次运行之间的记忆。每次调用 `agent.run()` 时，上下文窗口都是空的。智能体不知道用户上周说过什么、分享过哪些偏好，也不知道自己已经研究过什么。

添加持久记忆不需要自行构建 RAG 管道或维护向量存储。`hindsight-agno` 包扩展了 Agno 原生的 `Toolkit` 模式，为智能体提供长期记忆：存入事实，通过语义检索召回事实，并根据积累的知识综合生成连贯的答案。

<!-- truncate -->

## 概览 {#tldr}

- Agno 没有内置的持久记忆。每次调用 `agent.run()` 都从头开始。
- `hindsight-agno` 添加了 `HindsightTools`，这是一个原生 Agno `Toolkit`，包含存入、召回和反思工具。
- 三步即可完成设置：安装软件包、创建 `HindsightTools`，再将其传给 `Agent`。
- 每次运行时，`memory_instructions()` 都会将相关记忆预载入 `Agent(instructions=[...])`，让智能体在每次对话开始时就拥有上下文。
- 通过 `user_id` 或自定义的 `bank_resolver`，系统会自动按用户隔离记忆库。
- [Hindsight Cloud](https://ui.hindsight.vectorize.io) 无需本地设置。配置两行即可开始运行。

## 问题：Agno 没有持久记忆 {#the-problem-agno-has-no-persistent-memory}

[Agno](https://docs.agno.com/) 是一个功能强大的智能体框架。它的 `Toolkit` 模式便于添加工具，团队协作原语能够处理多智能体工作流，结构化输出和流式处理也开箱即用。但 Agno 没有内置记忆层。

每次调用 `agent.run()` 都从头开始。智能体不知道用户在上一次会话中提到过什么，也不知道用户的偏好、反复提出的问题，或智能体自己已经研究过什么。如果用户今天告诉智能体一件重要的事，到了明天，这条事实就不复存在。

你可以传入 `messages`，在单次运行中延续对话。但那只是会话历史，不是记忆。会话历史不会提取结构化事实，会随着每轮对话线性增长，也不会归纳概括或去重；进程一退出，它就会完全消失。

真正的智能体记忆有所不同，它会：

- 从对话中提取离散事实并持久存储
- 构建包含实体及其关系的知识图谱
- 通过语义检索，跨越数天、数周乃至数月找回相关上下文
- 根据零散积累的知识综合生成连贯的答案

[Hindsight](/) 提供的正是这些能力。`hindsight-agno` 包将 Hindsight 直接接入 Agno 的 `Toolkit` 系统，因此你无需自行构建这些功能。

## Agno 持久记忆如何与 Hindsight 配合 {#how-agno-persistent-memory-works-with-hindsight}

`hindsight-agno` 集成通过两个入口连接 Agno：工具和指令。

```text
Agno Agent
  |-- tools=[HindsightTools(...)]
  |     |-- retain_memory      -> store facts to long-term memory
  |     |-- recall_memory      -> search memory for relevant facts
  |     |-- reflect_on_memory  -> synthesize an answer from memories
  |
  |-- instructions=[memory_instructions(...)]
        |-- auto-recalls relevant memories into the system prompt
```

*工具* 让智能体在对话过程中显式存入和检索记忆。*指令* 会在智能体开始响应前，将相关记忆注入系统提示。整个过程无需调用工具。

`HindsightTools` 直接扩展 Agno 的 `Toolkit` 基类，采用的模式与 Agno 生态系统中的 `Mem0Tools` 相同。你可以像添加其他 Agno 工具包一样，将它添加到 `tools=[...]` 中。

了解每个工具的作用以及智能体何时会使用它们，会有所帮助：

- **`retain_memory`**：智能体遇到值得保留的信息时会调用此工具，例如用户明确表达的偏好、一项决定，或关于用户或项目的事实。
- **`recall_memory`**：返回过去会话中匹配的事实列表。智能体需要查找信息时会使用它。
- **`reflect_on_memory`**：将这些事实综合成连贯的答案。`recall_memory` 返回列表，而 `reflect_on_memory` 会结合所有相关记忆进行推理，生成单个答复。与直接检索事实相比，它更适合回答“你对我的工程风格了解多少？”之类的问题。

## 设置 Agno 持久记忆 {#setting-up-agno-persistent-memory}

### 第 1 步：启动 Hindsight {#step-1-start-hindsight}

```bash
pip install hindsight-all
```

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

这会在本地 `http://localhost:8888` 启动 Hindsight。唯一的外部依赖是用于实体提取的 LLM API 密钥。

不想自行托管？使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，即可完全跳过这一步。

### 第 2 步：安装 Agno 集成 {#step-2-install-the-agno-integration}

```bash
pip install hindsight-agno agno
```

### 第 3 步：将 `HindsightTools` 添加到智能体 {#step-3-add-hindsighttools-to-your-agent}

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
)
```

至此就完成了全部设置。现在，智能体拥有三个工具：

- **`retain_memory`**：将信息存入长期记忆
- **`recall_memory`**：在长期记忆中搜索相关事实
- **`reflect_on_memory`**：根据积累的记忆综合生成有理有据的答案

### 第 4 步：测试跨会话记忆 {#step-4-test-cross-session-memory}

```python
# 第一次会话：智能体存入上下文
agent.print_response(
    "Remember that I prefer functional programming patterns "
    "and I am building a data pipeline in Python."
)

# 后续会话：智能体召回上下文
agent.print_response("What approach should I take for error handling?")
```

重启进程，再次运行第二个调用。智能体依然记得这些信息。Agno 的持久记忆存储在 Hindsight 中，而非智能体的上下文窗口里。

### 第 5 步：使用 `memory_instructions` 自动注入记忆 {#step-5-auto-inject-memories-with-memoryinstructions}

如果你希望在每次运行开始时自动注入记忆，请使用 `memory_instructions`：

```python
from hindsight_agno import HindsightTools, memory_instructions

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
    instructions=[memory_instructions(
        bank_id="user-123",
        hindsight_api_url="http://localhost:8888",
    )],
)
```

每次调用 `agent.run()` 时，`memory_instructions` 都会调用 Hindsight 的召回 API，并将相关记忆注入系统提示。智能体在每次对话开始时就能获得上下文，无需调用工具。

你可以自定义召回查询、结果数量和前缀：

```python
memory_instructions(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    query="user preferences, history, and context",
    max_results=10,
    prefix="Here is what you know about this user:\n",
)
```

如果 Recall 没有返回内容或调用失败，`memory_instructions` 会返回空字符串。智能体仍会照常运行。

## Agno 记忆高级配置 {#advanced-agno-memory-configuration}

### 按用户隔离记忆库 {#per-user-bank-isolation}

对于服务多个用户的智能体，`HindsightTools` 会动态解析记忆库 ID。解析顺序如下：

1. `bank_resolver`：用于自定义逻辑的可调用对象 `(RunContext) -> str`
2. `bank_id`：传给构造函数的静态记忆库 ID
3. `RunContext.user_id`：用于自动创建按用户隔离的记忆库

```python
# 根据 RunContext 为每个用户创建记忆库
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="http://localhost:8888")],
    user_id="user-123",
)

# 按团队划分记忆库的自定义解析器
def resolve_bank(ctx):
    return f"team-{ctx.user_id.split('-')[0]}"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_resolver=resolve_bank,
        hindsight_api_url="http://localhost:8888",
    )],
)
```

### 选择要加入的记忆工具 {#selecting-which-memory-tools-to-include}

```python
# 只读智能体：可以召回和反思，但不存入记忆
tools = HindsightTools(
    bank_id="user-123",
    hindsight_api_url="http://localhost:8888",
    enable_retain=False,
    enable_recall=True,
    enable_reflect=True,
)
```

这在多智能体设置中很有用：一个智能体积累知识，另一个智能体据此回答问题。

### 全局配置 {#global-configuration}

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
    max_tokens=4096,
)

agent1_tools = HindsightTools(bank_id="user-alice")
agent2_tools = HindsightTools(bank_id="user-bob")
```

### Hindsight Cloud 配置 {#hindsight-cloud-configuration}

```python
from hindsight_agno import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_your_token",
)
```

无需管理守护进程，也无需本地 Postgres。云端服务器会处理提取、索引和检索。

## 完整示例 {#full-working-example}

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools, memory_instructions

BANK_ID = "demo-user"
HINDSIGHT_URL = "http://localhost:8888"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id=BANK_ID,
        hindsight_api_url=HINDSIGHT_URL,
    )],
    instructions=[memory_instructions(
        bank_id=BANK_ID,
        hindsight_api_url=HINDSIGHT_URL,
    )],
)

print("--- Run 1: Teaching the agent ---")
agent.print_response(
    "Remember: I am a backend engineer. I use Python and Rust. "
    "I prefer small, composable libraries over large frameworks."
)

print("\n--- Run 2: Agent recalls context ---")
agent.print_response("Recommend a web framework for my next project.")

print("\n--- Run 3: Agent synthesizes ---")
agent.print_response("What do you know about my engineering philosophy?")
```

运行两遍。智能体会记住第一次执行以来的所有信息。

## 何时不该使用 Agno 持久记忆 {#when-not-to-use-agno-persistent-memory}

对于只运行一次、不会与同一用户再次交互的智能体；每个请求都完全独立的无状态 API 处理程序；或需要完全控制哪些内容进入提示的智能体，可以跳过记忆层。在这些情况下，直接使用 Hindsight Python 客户端，而不是 Agno 集成。

## 与其他方案的比较 {#how-it-compares-to-alternatives}

| 方案 | 优势 | 劣势 | 适用场景 |
|---|---|---|---|
| **Hindsight + Agno** | 多策略检索（语义 + BM25 + 图谱 + 时间）、结构化事实提取、综合生成 | 需要 Hindsight 服务器或云服务 | 需要深度记忆的多会话智能体 |
| **手动传递消息** | Agno 内置，无依赖项 | 不具持久性，内容会增长至上下文窗口上限 | 简短的单会话对话 |

## 注意事项 {#pitfalls}

**记忆库 ID 冲突。** 每个 `bank_id` 都对应一个独立的记忆存储。请为每位用户、每个智能体或每个项目使用唯一的记忆库 ID，避免无关智能体之间的记忆相互串扰。

**记忆指令带来的延迟。** `memory_instructions` 会在每次调用 `agent.run()` 时请求召回 API。对于延迟敏感的应用，请使用 `budget="low"` 并设置较小的 `max_results`。根据记忆库大小和网络状况，召回大约会增加 50 到 200 ms 的延迟。

**重复记忆。** Hindsight 会在事实层面去重，但在系统提示中指导智能体何时存入新事实也会有所帮助。

## 回顾 {#recap}

| | Agno 默认情况 | 使用 Hindsight |
|---|---|---|
| 跨会话记忆 | 无 | 自动提供 |
| 记忆设置 | 无 | `pip install hindsight-agno` |
| 召回机制 | 不可用 | 通过工具或指令进行语义检索 |
| 按用户隔离 | 不支持 | 通过 `user_id` 或 `bank_resolver` 实现 |
| 托管方式 | 不适用 | 本地或 [Hindsight Cloud](https://ui.hindsight.vectorize.io) |

## 后续步骤 {#next-steps}

- **Hindsight Cloud**：[免费注册](https://ui.hindsight.vectorize.io)
- **在本地试用**：运行上面的示例，或执行 `pip install hindsight-all hindsight-agno agno`
- **配置参考**：[Agno 集成文档](/sdks/integrations/agno)
- **了解其他集成**：[Pydantic AI](/sdks/integrations/pydantic-ai)、[LangGraph](/sdks/integrations/langgraph)、[CrewAI](/sdks/integrations/crewai)
- **查看知识图谱**：使用 [Hindsight Cloud 控制面板](https://ui.hindsight.vectorize.io)浏览提取出的事实、实体及关系
