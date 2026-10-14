---
title: "借助 Hindsight 为 Google ADK 智能体添加长期记忆"
authors: [benfrank241]
slug: "2026/06/04/google-adk-persistent-memory"
date: 2026-06-04T12:00
tags: [integrations, google, adk, agents, memory, gemini, tutorial, hindsight]
description: "借助 Hindsight 为 Google ADK 智能体添加持久的长期记忆。插入即可使用的 BaseMemoryService 可在会话结束时自动存入记忆，并在调用 search_memory 时召回记忆；如有需要，也可以提供显式的存入、召回和反思工具。"
image: /img/blog/google-adk-persistent-memory.webp
hide_table_of_contents: true
---

![借助 Hindsight 为 Google ADK 智能体添加长期记忆](/img/blog/google-adk-persistent-memory.webp)

[Google 的 Agent Development Kit（ADK）](https://adk.dev/) 为构建 Gemini 驱动的智能体提供了清晰的抽象层，包括会话、运行器、工具、插件和多智能体组合。它也提供了一个记忆接口：`BaseMemoryService`，任何持久记忆后端都可以实现这一接口。不过，ADK 并未附带记忆后端，需要由你自行提供。

`hindsight-google-adk` 是一个可直接接入的实现。将它配置到 `Runner` 中，会话结束时就会自动存入记忆。下次智能体调用 `search_memory` 时，会从该用户对应的 Hindsight 记忆库中返回结果。你无需编写检索代码、管理向量存储，也不必预先决定数据模式。

<!-- truncate -->

## 概览 {#tldr}

- Google ADK 提供 `BaseMemoryService` 接口，但不提供记忆后端。
- `hindsight-google-adk` 是一个可直接接入的 `BaseMemoryService` 实现。
- 将 `memory_service=HindsightMemoryService.from_url(...)` 传给 ADK `Runner`，会话关闭时就会自动存入记忆，之后可通过 `search_memory` 召回。
- 也可以提供 `hindsight_retain` / `hindsight_recall` / `hindsight_reflect` 显式工具，让智能体在一轮对话中按需调用。
- 记忆库 ID 默认为 `{app_name}::{user_id}`，因此默认会按用户隔离记忆。

---

## 为什么 ADK 智能体需要记忆层 {#why-adk-agents-need-a-memory-layer}

ADK 提供智能体循环、工具框架以及会话和事件基础设施。默认情况下，这些基础设施中的数据不会持久保存：会话结束时，其中的事件会被清空。用户下次回来时，智能体读取的是一个全新的 `Session`，其中没有此前对话的记录。

`BaseMemoryService` 是 ADK 提供的扩展接口，可让长期记忆层与短期会话存储并行工作。实现 `add_session_to_memory` 和 `search_memory` 后，`Runner` 就会在合适的时机调用它们。ADK 提供了用于开发的 `InMemoryMemoryService`；用于生产环境时，则需要自行实现或安装能够真正持久保存数据的服务。

集成接口很简单，复杂工作在后端：提取事实、去重、实体消解、多策略检索和排序。这些正是 Hindsight 负责的部分。接入 ADK 只需一行代码。

---

## 工作原理 {#how-it-works}

`HindsightMemoryService` 实现了 ADK 的 `BaseMemoryService`，并将繁重工作交给 Hindsight。两者在以下三个生命周期节点交接：

```text
会话结束
  └─ Runner 调用 add_session_to_memory(session)
       └─ HindsightMemoryService 将事件整理成文档
            └─ Hindsight 将文档存入记忆库 {app_name}::{user_id}
                 （事实提取和实体消解在后台运行）

智能体调用 search_memory(query)
  └─ HindsightMemoryService 在同一记忆库中调用 Hindsight 召回记忆
       └─ 结果以 ADK MemoryEntry 对象的形式返回
            （每条呈现出的事实对应一个对象）

代码使用显式 MemoryEntry 对象调用 add_memory(...)
  └─ 每个条目都作为独立文档存入
```

了解实现时，有三点值得注意：

1. **失败不会中断智能体。** 每次存入和召回调用都有异常处理。如果 Hindsight 无法访问，系统会记录错误，`Runner` 仍会继续运行。此时智能体会在没有记忆的情况下运行，而不会崩溃。
2. **默认按 `(app_name, user_id)` 隔离记忆库。** 同一应用的不同用户使用不同记忆库；同一用户使用不同应用时也会进入不同记忆库。可以通过 `bank_id_template` 覆盖此设置。
3. **系统会自动添加标签。** 每次存入记忆时都会附加 `app:<name>` 和 `user:<id>` 标签；每次召回都会按 `user:<id>` 筛选。默认情况下，不同用户的记忆不会相互混杂。

---

## 设置 {#setup}

### 1. 安装 {#1-install}

```bash
pip install hindsight-google-adk
```

需要 Python 3.10+、`google-adk>=2.0` 和 `hindsight-client>=0.4.0`。

### 2. 选择 Hindsight 部署方式 {#2-pick-a-hindsight-deployment}

**Hindsight Cloud** 是最快的接入方式： [免费注册](https://ui.hindsight.vectorize.io)，获取 API key，并将代码指向 `https://api.hindsight.vectorize.io`。该集成默认使用 Cloud URL。

**自托管：**

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api  # 启动后监听 http://localhost:8888
```

### 3. 接入 Runner {#3-wire-it-into-your-runner}

```python
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from hindsight_google_adk import HindsightMemoryService

memory = HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_your_token_here",
)

agent = LlmAgent(name="assistant", model="gemini-2.0-flash")

runner = Runner(
    app_name="my-app",
    agent=agent,
    session_service=InMemorySessionService(),
    memory_service=memory,
)
```

接入就完成了。其余部分仍是常规 ADK 代码：`runner.run_async(...)`、工具、提示词和会话生命周期。会话结束时，`Runner` 会负责调用 `add_session_to_memory`，智能体也可以直接使用 `search_memory`。

---

## 显式工具：让智能体自行决定何时调用 {#explicit-tools-when-you-want-the-agent-to-decide}

通过 `BaseMemoryService` 接入时，系统会在会话结束时自动存入记忆，并在智能体调用 `search_memory` 时召回记忆。这是一个简洁的默认方案。不过，有时你会希望智能体在一轮对话中主动调用记忆工具：学到信息后立即存入，在转换话题前召回记忆，或一次性综合多条记忆生成连贯答案。

为此，该集成还提供了 `create_hindsight_tools()`，它会返回模型可以调用的 ADK `FunctionTool`：

```python
from google.adk.agents import LlmAgent
from hindsight_google_adk import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = LlmAgent(
    name="assistant",
    model="gemini-2.0-flash",
    tools=tools,
)
```

这里有三个工具，可通过 `include_retain` / `include_recall` / `include_reflect` 控制是否启用：

- **`hindsight_retain(content)`**：立即将信息存入长期记忆，无需等待会话结束。
- **`hindsight_recall(query)`**：搜索记忆，并返回带编号的匹配结果列表。
- **`hindsight_reflect(query)`**：基于记忆综合生成连贯答案，而不是返回原始事实。速度较慢，但对于“X 的当前情况如何？”这类问题，回答的信息密度更高。

两种接入方式可以组合使用。使用 `Runner(memory_service=HindsightMemoryService(...))` 实现会话结束时自动存入记忆，同时使用 `tools=create_hindsight_tools(...)` 实现智能体在一轮对话中主动调用工具。只要记忆库 ID 一致，两种方式就会读写同一记忆库。

---

## 记忆库范围 {#bank-scoping}

默认的 `bank_id_template` 是 `"{app_name}::{user_id}"`。大多数情况下都应保留此设置：每个应用中的每位用户都有自己的隔离记忆库，而且每次召回都会按 `user:<id>` 筛选，可再多一层保障。

以下两种情况可以考虑更改：

**同一用户在不同应用间共享记忆。** 例如，阅读清单智能体和日历智能体都需要了解用户偏好：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)
```

**使用固定的共享记忆库。** 整个应用共用一个记忆库，适合小型团队或共享记忆的社区：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

存入记忆时仍会添加 `app:` 和 `user:` 标签，因此即使使用共享记忆库，之后仍可按用户筛选记忆。

---

## 配置参考 {#configuration-reference}

以下内容直接摘自该集成：

| 参数 | 默认值 | 作用 |
|---|---|---|
| `hindsight_api_url` | `https://api.hindsight.vectorize.io` | Hindsight API URL（默认使用 Cloud） |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于 Hindsight Cloud 的 Bearer token |
| `bank_id_template` | `"{app_name}::{user_id}"` | 用于生成记忆库 ID 的格式字符串 |
| `budget` | `"mid"` | 召回预算：`low` / `mid` / `high` |
| `max_tokens` | `4096` | 召回响应的最大 token 数 |
| `tags` | `None` | 添加到每次存入操作的标签（除 `app:` / `user:` 外） |
| `recall_tags` | `None` | 附加到召回查询的标签（除 `user:` 外） |
| `recall_tags_match` | `"any"` | 标签匹配模式：`any` / `all` / `any_strict` / `all_strict` |
| `mission` | `None` | 如果设置，首次使用时会通过此事实提取任务说明幂等地创建记忆库 |
| `context` | `"google-adk"` | 附加到所存内容上的来源标签 |

### 全局配置 {#global-config}

如需设置应用级默认值，可在启动时调用一次 `configure(...)`。之后调用 `HindsightMemoryService.from_url()` / `create_hindsight_tools()` 时，会将这些值用作回退配置：

```python
from hindsight_google_adk import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=None,           # 未设置时回退使用 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
    bank_id_template="{app_name}::{user_id}",
)
```

---

## 生产环境模式 {#production-patterns}

### 按环境添加标签 {#per-environment-tagging}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    tags=["env:prod"],
    recall_tags=["env:prod"],
)
```

系统仍会额外添加 `app:` 和 `user:` 标签。这样，你就可以让开发、预发布和生产环境共用同一个 Hindsight 项目，而不会让彼此的召回结果相互污染。

### 使用任务说明初始化记忆库 {#bootstrapped-banks-with-a-mission}

新用户出现时，你不一定希望等到首次存入会话后才确定记忆库关注的内容。传入 `mission` 后，首次使用时会幂等地创建记忆库，并配置好以下事实提取提示词：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    mission=(
        "Extract user preferences, ongoing tasks, and project context. "
        "Ignore casual chit-chat unless it reveals a stable preference."
    ),
)
```

### 自托管 Hindsight {#self-hosted-hindsight}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="http://localhost:8888",
)
```

连接未启用身份认证的本地服务器时，无需提供 `api_key`。

### 召回预算 {#recall-budget}

`mid` 是默认值，也是合适的起点。如果智能体对延迟敏感，且首次响应预算有限，可降至 `low`；对于复杂智能体，例如研究、长期运行的规划器和多文档推理场景，可提高到 `high`，以便进行更深入的记忆召回。

---

## ADK + Hindsight 适用场景 {#where-adk--hindsight-pays-off}

只要 ADK 智能体会多次服务于同一用户，这种集成就能发挥作用：

- **长期运行的助手。** 由 Gemini 驱动的个人助手，可以跨越数天或数周记住用户偏好、进行中的项目和先前的决定。
- **多智能体设置。** 在一个应用下组合多个 ADK 智能体，并共用一个记忆库，让它们共享对用户的了解。需要时，仍可利用 `app:` / `user:` 标签按子智能体筛选记忆。
- **面向客户的副驾驶。** 法律、医疗、金融等领域的专用智能体需要跨会话保留背景信息，例如过往事项、已知病情和账户状态。
- **内部工具智能体。** ADK 智能体可以读取团队数据、向工单系统写入信息或处理接收请求。历史工单及其解决方案会自动出现在后续会话中。

只要短期会话记忆不够用，Hindsight 就可以接入 `BaseMemoryService` 这个扩展位。

---

## 生产环境注意事项 {#production-notes}

**故障隔离。** `add_*` 和 `search_memory` 都会捕获 Hindsight 异常并记录日志。网络短暂中断或临时出现 5xx 错误都不会导致 `Runner` 崩溃。最坏情况下，智能体这一轮会在没有记忆的情况下运行。

**隐私与保留。** 每位用户使用独立记忆库，因此删除某位用户的数据很简单：`await client.adelete_bank(bank_id=f"{app_name}::{user_id}")`。REST API 提供对应操作 `DELETE /v1/default/banks/{bank_id}`。如果记忆库 ID 使用内部用户 ID，处理用户要求删除数据的请求只需调用一次。

**延迟。** `search_memory` 触发的召回只需调用一次 Hindsight，通常耗时 50–300 ms，具体取决于 `budget` 和记忆量。会话关闭时会异步存入记忆，因此这一过程不会增加智能体响应循环的延迟。

**记忆库创建。** 如果不传入 `mission`，记忆库会在首次存入记忆时创建。如果传入 `mission`，集成会在首次使用时幂等地创建记忆库，并在进程内记录已初始化的记忆库，避免重复创建。

---

## 回顾 {#recap}

ADK 提供智能体运行时和 `BaseMemoryService` 扩展位；Hindsight 提供可接入其中的记忆后端。只需一行集成代码，就能为 Gemini 驱动的智能体添加持久的长期记忆。

- **自动方式：** 在 `Runner` 中设置 `memory_service=HindsightMemoryService.from_url(...)`，会话关闭时自动存入记忆，并可通过 `search_memory` 召回。
- **显式方式：** 使用 `create_hindsight_tools(...)`，让智能体在一轮对话中主动调用存入、召回和反思工具。
- **同时使用：** 只要记忆库 ID 一致，两种方式就会共用同一记忆库。

无需编写检索代码、管理向量存储或预先设计数据模式。智能体会随着使用而不断改进。

---

## 后续步骤 {#next-steps}

- **从 Hindsight Cloud 开始：** [注册](https://ui.hindsight.vectorize.io)，获取 API key，并将 `Runner` 指向它。
- **阅读 [Google ADK 集成文档](https://hindsight.vectorize.io/integrations/google-adk)**，查看完整配置参考。
- **选择符合用户模型的 `bank_id_template`：** 按用户隔离是安全的默认设置。
- **决定使用自动方式、显式方式还是两者兼用：** 先从 `BaseMemoryService` 开始；如果智能体适合在一轮对话中调用记忆工具，再添加这些工具。
- **根据需要调整 `budget`：** 对延迟敏感时使用 `low`，需要深入推理时使用 `high`。
- **浏览[完整集成列表](https://hindsight.vectorize.io/integrations/)**：Hermes、OpenAI Agents、n8n、Vapi、AgentCore 等 30 多种集成都共用同一记忆层。

---

**延伸阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基础概念。
- [Hindsight Google ADK 集成文档](https://hindsight.vectorize.io/integrations/google-adk) — 完整配置参考。
- [使用 AWS AgentCore 实现多轮智能体记忆](/blog/2026/05/01/agentcore-persistent-memory) — 类似的运行时适配器模式。
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全面比较各类方案。
