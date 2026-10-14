---
sidebar_position: 9
title: "借助 Hindsight 为 Google ADK 提供持久记忆 | 集成"
description: "通过 Hindsight 为 Google ADK 智能体添加长期记忆。实现 ADK 的 BaseMemoryService，以便在会话结束时自动存入记忆，并在调用 search_memory 时召回记忆；同时提供显式的 FunctionTool 封装。"
---

# Google ADK {#google-adk}

借助 Hindsight，为 [Google ADK](https://adk.dev/) 智能体提供持久的长期记忆。`hindsight-google-adk` 包提供两种互补的使用模式：

- **`HindsightMemoryService`** — 实现 ADK 的 `BaseMemoryService`。将它传给 `Runner(memory_service=...)` 后，会话结束时会自动存入记忆；智能体调用 `search_memory` 时，会从 Hindsight 获取匹配结果。
- **`create_hindsight_tools(...)`** — 返回一组 ADK `FunctionTool`（`hindsight_retain`、`hindsight_recall`、`hindsight_reflect`），模型可以在一个回合中直接调用。

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)，获取 Hindsight Cloud API 密钥。此集成默认连接生产环境中的服务，无需自行管理本地服务器。
:::

[查看更新日志 →](/changelog/integrations/google-adk)

## 安装 {#installation}

```bash
pip install hindsight-google-adk
```

## 自动记忆（BaseMemoryService） {#automatic-memory-basememoryservice}

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from hindsight_google_adk import HindsightMemoryService

memory = HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = LlmAgent(name="assistant", model="gemini-2.0-flash")

runner = Runner(
    app_name="my-app",
    agent=agent,
    session_service=InMemorySessionService(),
    memory_service=memory,
)

# ... 按常规方式使用 runner.run_async(...)，记忆会自动处理。
```

会话结束时，`add_session_to_memory` 会将会话中的所有事件存入 Hindsight 记忆库；记忆库由 `(app_name, user_id)` 推导得出。智能体调用 `search_memory` 时，此集成会在同一记忆库中执行 Hindsight 召回，并将结果作为 ADK `MemoryEntry` 对象返回。

### 记忆库 ID 推导 {#bank-id-derivation}

默认情况下，每个 `(app_name, user_id)` 组合都会使用独立的记忆库，ID 为 `"{app_name}::{user_id}"`。可通过 `bank_id_template` 覆盖此设置：

```python
# 每位用户一个记忆库，并在不同应用间共享
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)

# 静态记忆库（所有用户共享）
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

## 显式工具（FunctionTool） {#explicit-tools-functiontool}

如果希望智能体自行决定在当前回合的何时调用工具，可以直接向它提供用于存入记忆、召回记忆和反思的工具：

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

智能体会获得三个工具（通过 `include_retain` / `include_recall` / `include_reflect` 控制是否启用）：

- **`hindsight_retain(content)`** — 将信息存入长期记忆
- **`hindsight_recall(query)`** — 搜索记忆，并以带编号的列表返回匹配项
- **`hindsight_reflect(query)`** — 基于记忆综合生成连贯的答案

## 全局配置 {#global-configuration}

如需设置应用范围内的默认值，可在启动时调用一次 `configure(...)`。后续调用 `HindsightMemoryService.from_url()` / `create_hindsight_tools()` 时，会将这些配置用作回退值：

```python
from hindsight_google_adk import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=None,           # 回退使用 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
    bank_id_template="{app_name}::{user_id}",
)
```

## 配置参考 {#configuration-reference}

| 参数 | 默认值 | 说明 |
|---|---|---|
| `hindsight_api_url` | `https://api.hindsight.vectorize.io` | Hindsight API URL。默认使用云服务。 |
| `api_key` | `HINDSIGHT_API_KEY` 环境变量 | 用于 Hindsight Cloud 的 Bearer 令牌。 |
| `bank_id_template` | `"{app_name}::{user_id}"` | 根据 ADK 的 `app_name` / `user_id` 推导记忆库 ID 时使用的格式字符串。 |
| `budget` | `"mid"` | 召回预算级别：`low` / `mid` / `high`。 |
| `max_tokens` | `4096` | 召回结果的最大 token 数。 |
| `tags` | `None` | 添加到每个存入文档的标签。始终会添加 `app:<name>` 和 `user:<id>`。 |
| `recall_tags` | `None` | 附加到召回查询的标签。始终会添加 `user:<id>`。 |
| `recall_tags_match` | `"any"` | 标签匹配模式：`any` / `all` / `any_strict` / `all_strict`。 |
| `mission` | `None` | 若设置，则首次使用时会以此事实提取任务幂等地创建记忆库。 |
| `context` | `"google-adk"` | 附加到存入内容的来源标签。 |

## 生产环境模式 {#production-patterns}

### 按环境为记忆添加标签 {#tagging-memories-per-environment}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    tags=["env:prod"],
    recall_tags=["env:prod"],
)
```

除这些标签外，始终还会添加 `app:` 和 `user:` 标签。

### 自托管 Hindsight {#self-hosted-hindsight}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="http://localhost:8888",
)
```

对于无需身份认证的本地服务器，不需要提供 `api_key`。

### 组合使用记忆服务和工具 {#combining-memory-service--tools}

两者可以同时使用：`Runner(memory_service=HindsightMemoryService(...))` 用于在会话结束时自动存入记忆，`tools=create_hindsight_tools(...)` 则用于在回合中由智能体主动召回记忆。记忆库 ID 相同时，两者会共用同一个记忆库。

## 环境要求 {#requirements}

- Python 3.10+
- `google-adk>=2.0`
- `hindsight-client>=0.4.0`

---
