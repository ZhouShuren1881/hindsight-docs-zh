---
title: "Google ADK 智能体与 Hindsight 的长期记忆"
authors: [benfrank241]
slug: "2026/06/04/google-adk-persistent-memory"
date: 2026-06-04T12:00
tags: [integrations, google, adk, agents, memory, gemini, tutorial, hindsight]
description: "通过Hindsight为Google ADK智能体添加持久的长期记忆。插入式 BaseMemoryService 用于会话结束时的自动记忆存储和 search_memory 上的记忆召回 - 以及在您需要时提供显式记忆存储/记忆召回/回想工具。"
image: /img/blog/google-adk-persistent-memory.webp
hide_table_of_contents: true
---

![Google ADK 智能体与 Hindsight 的长期记忆](/img/blog/google-adk-persistent-memory.webp)

[Google的智能体开发套件](https://adk.dev/) 为您提供了构建Gemini驱动的智能体的清晰抽象——会话、运行器、工具、插件、多智能体组合。它也有一个记忆接口：`BaseMemoryService`，任何持久记忆后端都可以实现的合约。它不提供记忆后端。那留给你了。

`hindsight-google-adk` 是直接实现。将其连接到您的`Runner`，会话结束时会自动保留。下次智能体调用 `search_memory` 时，结果会从该用户范围内的 Hindsight 记忆库返回。无需编写检索代码，无需管理向量存储，无需预先做出模式决策。

<!-- truncate -->

## 概览 {#tldr}

- ​​Google ADK 提供 `BaseMemoryService` 接口，但没有记忆后端。
- `hindsight-google-adk` 是一个直接的 `BaseMemoryService` 实现。
- 将 `memory_service=HindsightMemoryService.from_url(...)` 传递给您的 ADK `Runner`，会话将在关闭时自动保留 + 可通过 `search_memory` 调用。
- 或者公开智能体可以在回合中调用的显式`hindsight_retain` / `hindsight_recall` / `hindsight_reflect` 工具。
- 记忆库 ID 默认为 `{app_name}::{user_id}`，因此记忆范围开箱即用。

---

## 为什么ADK智能体需要记忆层 {#why-adk-agents-need-a-memory-layer}

ADK 为您提供智能体循环、工具框架以及会话和事件基础设施。默认情况下，该基础设施是短暂的：当会话结束时，其事件将被刷新。下次用户回来时，智能体会从新的 `Session` 中读取，而没有先前对话的记录。

`BaseMemoryService` 是 ADK 的逃生舱口——该接口让长期记忆层与短期会话存储并存。实现`add_session_to_memory`和`search_memory`，`Runner`将在正确的时刻调用它们。 ADK 提供了用于开发的`InMemoryMemoryService`；对于生产，您实现（或安装）实际持续存在的东西。

集成点很干净。工作在后端：事实提取、去重、实体解析、多策略检索、排序。这就是 Hindsight 的作用。只需一行即可将其插入 ADK。

---

## 它是如何工作的 {#how-it-works}

`HindsightMemoryService` 实现 ADK 的 `BaseMemoryService` 并将繁重的工作交给 Hindsight。切换发生在生命周期的三个点：

```text
会议结束
└─ Runner 调用 add_session_to_memory(session)
└─ HindsightMemoryService 将事件格式化为文档
└─ Hindsight 将其保留到记忆库{app_name}::{user_id}
（事实提取+实体解析在后台运行）

智能体调用search_memory(query)
└─ HindsightMemoryService 在同一个记忆库上调用 Hindsight 记忆召回
└─ 结果作为 ADK MemoryEntry 对象返回
（每个浮出水面的事实一个）

代码使用显式 MemoryEntry 对象调用 add_memory(...)
└─ 每个条目都保留为自己的文档
```

有关实现的三件事值得了解：

1. **失败永远不会摧毁智能体。** 每个记忆存储和记忆召回调用都会被包装 — 如果Hindsight 无法访问，则会记录错误并且`Runner` 继续。智能体运行时没有记忆，而不是崩溃。
默认情况下，
2. **记忆库范围是 per-`(app_name, user_id)`。** 同一个应用程序的两个用户获得单独的记忆库；两个应用程序中的同一用户也获得单独的记忆库。通过`bank_id_template`覆盖。
3. **标签会自动添加。** 每个记忆存储都带有`app:<name>`和`user:<id>`标签。每个记忆都会通过`user:<id>`过滤。默认情况下，跨用户污染是不可能的。

---

## 设置 {#setup}

### 1。安装 {#1-install}

```bash
pip install hindsight-google-adk
```

需要 Python 3.10+、`google-adk>=2.0` 和 `hindsight-client>=0.4.0`。

### 2。选择 Hindsight 部署 {#2-pick-a-hindsight-deployment}

**Hindsight Cloud**是最快的路径 - [免费注册](https://ui.hindsight.vectorize.io)，抓住API键，将代码指向`https://api.hindsight.vectorize.io`。集成默认为云 URL。

**自托管**：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api  # starts at http://localhost:8888
```

### 3。将其连接到您的跑步者中 {#3-wire-it-into-your-runner}

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

这就是整合。剩下的就是你的普通 ADK 代码 - `runner.run_async(...)`、你的工具、你的提示、你的会话生命周期。跑步者负责在会话结束时调用`add_session_to_memory`，智能体免费获得`search_memory`。

---

## 显式工具：当您希望智能体做出决定时 {#explicit-tools-when-you-want-the-agent-to-decide}

`BaseMemoryService` 路径是自动的 — 保留发生在会话结束时，每当智能体调用 `search_memory` 时就会发生记忆召回。这是一个干净的默认设置，但有时您希望智能体在中间有意地进行记忆调用：在学习发生后立即存储，在旋转主题之前进行记忆召回，立即从许多记忆中合成一个连贯的答案。

为此，集成还公开了 `create_hindsight_tools()`，它返回模型可以调用的 ADK `FunctionTool`：

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

您获得三个工具，可通过`include_retain` / `include_recall` / `include_reflect`切换：

- **`hindsight_retain(content)`** — 立即将信息存储到长期记忆中，无需等待会话结束。
- **`hindsight_recall(query)`** — 搜索记忆并返回匹配的编号列表。
- **`hindsight_reflect(query)`** — 从记忆中合成一个连贯的答案，而不是返回原始事实。对于“X 的状态如何？”而言，速度较慢，但​​信号强度更高。问题。

​​两个模式组成。运行 `Runner(memory_service=HindsightMemoryService(...))` 以实现自动会话结束保留 *和* `tools=create_hindsight_tools(...)` 以实现中途智能体驱动呼叫。只要记忆库 ID 对齐，两条路径都会读取和写入相同的记忆。

---

## 记忆库 范围界定 {#bank-scoping}

默认`bank_id_template`为`"{app_name}::{user_id}"`。大多数设置应该保留它 - 每个应用程序中的每个用户都有自己独立的记忆库，并且每个记忆召回`user:<id>`标签过滤器是皮带和吊带。

需要更改的两种情况：

**同一用户在不同应用程序之间共享记忆。** 阅读列表智能体和日历智能体都了解用户的偏好：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)
```

**静态共享记忆库。** 整个应用程序的一个记忆库 - 对于小型团队或社区共享记忆有用：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

`app:`和`user:`标签仍然添加在记忆存储上，因此即使使用共享记忆库，如果需要，您也可以按用户进行事后切片。

---

## 配置参考 {#configuration-reference}

直接从集成中提取：

|论证|默认|它的作用|
|---|---|---|
|`hindsight_api_url`|`https://api.hindsight.vectorize.io`|Hindsight API URL（默认云）|
|`api_key`|`HINDSIGHT_API_KEY`环境|Hindsight Cloud的Bearer 令牌|
|`bank_id_template`|`"{app_name}::{user_id}"`|格式化字符串以导出记忆库id|
|`budget`|`"mid"`|记忆召回预算：`low` / `mid` / `high`|
|`max_tokens`|`4096`|记忆召回响应中的最大令牌|
|`tags`|`None`|添加到每个记忆存储的标签（在`app:` / `user:`之上）|
|`recall_tags`|`None`|附加到记忆召回查询的标签（在`user:`之上）|
|`recall_tags_match`|`"any"`|标签匹配模式：`any` / `all` / `any_strict` / `all_strict`|
|`mission`|`None`|如果设置，则在首次使用（幂等）时通过此事实提取任务创建记忆库|
|`context`|`"google-adk"`|保留内容附带来源标签|

### 全局配置 {#global-config}

对于应用程序范围的默认设置，请在启动时调用`configure(...)`一次。随后的 `HindsightMemoryService.from_url()` / `create_hindsight_tools()` 调用将其用作后备：

```python
from hindsight_google_adk import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=None,           # falls back to HINDSIGHT_API_KEY env var
    budget="mid",
    max_tokens=4096,
    bank_id_template="{app_name}::{user_id}",
)
```

---

## 生产模式 {#production-patterns}

### 每个环境标记 {#per-environment-tagging}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    tags=["env:prod"],
    recall_tags=["env:prod"],
)
```

`app:`和`user:`仍然添加在上面。现在，您可以针对同一个 Hindsight 项目运行 dev/staging/prod，而不会污染彼此的记忆。

### 带有使命的引导记忆库 {#bootstrapped-banks-with-a-mission}

当新用户出现时，您并不总是希望等待第一个保留的会话来定义记忆库的角色。通过 `mission` ，记忆库将在首次使用时以幂等方式创建，并包含以下事实提取提示：

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    mission=(
        "提取用户偏好、正在进行的任务和项目上下文。"
        "忽略随意的闲聊，除非它显示出稳定的偏好。"
    ),
)
```

### 自托管Hindsight {#self-hosted-hindsight}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="http://localhost:8888",
)
```

`api_key`。

### 记忆召回预算 {#recall-budget}

`mid` 是默认值，也是正确的起点。如果您的智能体对延迟敏感且第一响应预算紧张，则降至`low`；对于复杂的智能体来说，达到`high`，其中更深层次的记忆召回会带来回报（研究、长期运行的规划器、多文档推理）。

---

## ADK + Hindsight 的回报 {#where-adk--hindsight-pays-off}

只要您的 ADK 智能体多次看到同一用户，该集成就会发挥作用：

- **长期运行的助手。** Gemini 驱动的个人助理，可以记住数天和数周内的偏好、正在进行的项目和先前的决定。
- **多重智能体设置。** 在一个应用程序下组合多个ADK智能体；共享一个记忆库，让他们对用户有一个共同的认识。 `app:` / `user:` 标记意味着您仍然可以在需要时对每个子智能体进行记忆切片。
- **面向客户的副驾驶。** 特定领域的智能体（法律、医疗、金融），其中背景（过去的事情、已知的条件、账户状态）应该在整个会话中持续存在。
- **内部工具智能体。** 一种 A​​DK 智能体，可以读取团队的数据、写入票务系统或处理接收情况。过去的票证和解决方案会自动显示在下一个会话中。

任何短期会话记忆不够的地方，`BaseMemoryService` 插槽正是 Hindsight 所在的位置。

---

## 制作笔记 {#production-notes}

**故障隔离。** `add_*` 和 `search_memory` 吞下 Hindsight 异常并记录它们。网络故障或临时 5xx 永远不会使 `Runner` 崩溃。最坏的情况是，智能体在该回合运行时没有记忆。

**隐私与数据保留。** 每个用户使用独立记忆库，便可通过 `await client.adelete_bank(bank_id=f"{app_name}::{user_id}")` 删除该用户的记忆。REST API 对应操作是 `DELETE /v1/default/banks/{bank_id}`。按内部用户 ID 命名记忆库时，遗忘请求只需一次调用。

`search_memory` 上的**延迟。** 记忆召回是单个Hindsight 调用，通常为 50–300 毫秒，具体取决于 `budget` 和记忆大小。会话记忆存储在关闭时异步进行，因此保留不会给智能体的响应循环增加延迟。

**​​记忆库创建。** 如果你没有通过`mission`，记忆库将在第一个记忆存储上实现。如果您确实传递了`mission`，集成会在首次使用时幂等地创建记忆库，并跟踪（进程中）已初始化的记忆库以避免重复创建调用。

---

## 回顾 {#recap}

ADK 为您提供智能体运行时和`BaseMemoryService` 插槽。 Hindsight 为您提供插入的记忆后端。在一起：通过一行集成代码为Gemini 驱动的智能体提供持久的长期记忆。

- **自动路径：
`Runner` 上的** `memory_service=HindsightMemoryService.from_url(...)` — 关闭时保留会话，`search_memory` 上的记忆召回。
- **显式路径：**`create_hindsight_tools(...)`用于智能身体驱动的中转记忆存储/记忆召回/回忆。
- **同时两者：** 当记忆库 ID 对齐时，它们共享一个记忆库。

无需编写检索代码，无需管理矢量存储，无需预先设计模式。智能体使用得越多就会越好。

---

## 后续步骤 {#next-steps}

- **从Hindsight Cloud开始**：[注册](https://ui.hindsight.vectorize.io)，拿起一把钥匙，将你的`Runner`指向它
- **阅读[Google ADK 集成文档](/sdks/integrations/google-adk)**完整配置参考
- **选择一个`bank_id_template`** 与您的用户模型匹配 - 每个用户是安全的默认值
- **在自动/显式/两者之间做出选择** — 从 `BaseMemoryService` 开始，如果智能体受益于中途呼叫，则添加工具
- **调音`budget`** 如果您对延迟敏感 (`low`) 或进行深度推理 (`high`)
- **浏览[完整集成列表](https://hindsight.vectorize.io/integrations/)** — Hermes, OpenAI智能体、n8n、Vapi、AgentCore 和其他 30 多个都共享相同的记忆层

---

**进一步阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
- [Hindsight Google ADK 集成文档](/sdks/integrations/google-adk) — 完整配置参考
- [使用 AWS AgentCore 进行多轮智能体记忆](/blog/2026/05/01/agentcore-persistent-memory) — 类似的运行时适配器模式
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全景观比较
