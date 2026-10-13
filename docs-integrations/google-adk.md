---
sidebar_position: 9
title: "Google ADK 持久记忆Hindsight |整合"
description: "通过Hindsight为Google ADK智能体添加长期记忆。实现 ADK 的 BaseMemoryService，用于会话端的自动记忆存储和 search_memory 上的记忆召回，以及显式的 FunctionTool 包装器。"
---

# Google ADK {#google-adk}

持久的长期记忆[Google ADK](https://adk.dev/)智能体，通过 Hindsight 提供记忆。 `hindsight-google-adk` 包为您提供了两种互补的模式：

- **`HindsightMemoryService`** — 实现 ADK 的 `BaseMemoryService`。传给`Runner(memory_service=...)`，会话结束时自动保留； 智能体通话 `search_memory` 获取匹配结果Hindsight。
- **`create_hindsight_tools(...)`** — 返回 ADK 列表 `FunctionTool`s (`hindsight_retain`，`hindsight_recall`，`hindsight_reflect`) 模型可以在回合内直接调用。

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 对于Hindsight CloudAPI 密钥。默认情况下，集成点位于生产环境 - 无需管理本地服务器。
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

#... 正常使用 runner.run_async(...) 。 记忆是自动的。
```

会话结束时，`add_session_to_memory` 会将所有事件存储到由 `(app_name, user_id)` 确定的 Hindsight 记忆库中。智能体调用 `search_memory` 时，集成会从同一记忆库执行记忆召回，并以 ADK `MemoryEntry` 对象返回结果。

### 记忆库ID推导 {#bank-id-derivation}

默认情况下，每个`(app_name, user_id)` 一对拥有自己的记忆库：`"{app_name}::{user_id}"`。用 覆盖 `bank_id_template`：

```python
#每用户，跨应用程序共享
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)

#静态记忆库（所有用户共享）
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

## 显式工具（FunctionTool） {#explicit-tools-functiontool}

当您希望智能体决定何时在中途调用它们时，给予智能体直接记忆存储 / 记忆召回 / 反思工具：

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

智能体获得三个工具（用切换 `include_retain` / `include_recall` / `include_reflect`):

- **`hindsight_retain(content)`** — 将信息存储到长期记忆中
- **`hindsight_recall(query)`** — 搜索记忆并返回匹配的编号列表
- **`hindsight_reflect(query)`** — 从记忆中合成一个连贯的答案

## 全局配置 {#global-configuration}

对于应用程序范围内的默认设置，请调用 启动时 `configure(...)`一次。后续`HindsightMemoryService.from_url()` / `create_hindsight_tools()` 调用将其用作后备：

```python
from hindsight_google_adk import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key=None,           # 回退到 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    max_tokens=4096,
    bank_id_template="{app_name}::{user_id}",
)
```

## 配置参考 {#configuration-reference}

|论证|默认|说明|
|---|---|---|
|`hindsight_api_url`|`https://api.hindsight.vectorize.io`|Hindsight API 网址。默认云。|
|`api_key`|`HINDSIGHT_API_KEY` 环境变量|用于 Hindsight Cloud 的 Bearer 令牌。|
|`bank_id_template`|`"{app_name}::{user_id}"`|用于从 ADK 导出记忆库 id 的格式字符串 `app_name` / `user_id`。|
|`budget`|`"mid"`|记忆召回预算水平：`low`/`mid`/`high`。|
|`max_tokens`|`4096`|记忆召回结果的最大 token 数。|
|`tags`|`None`|添加到每个保留文档的标签。 总是添加 `app:<name>` 和 `user:<id>`。|
|`recall_tags`|`None`|附加到记忆召回查询的标签。 总是添加 `user:<id>`。|
|`recall_tags_match`|`"any"`|标签匹配模式：`any` / `all` / `any_strict` / `all_strict`。|
|`mission`|`None`|如果设置，则在首次使用此事实提取任务时（幂等）创建记忆库。|
|`context`|`"google-adk"`|保留内容附带来源标签。|

## 生产环境模式 {#production-patterns}

### 根据环境标记记忆 {#tagging-memories-per-environment}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    tags=["env:prod"],
    recall_tags=["env:prod"],
)
```

`app:` 和 `user:` 标签始终添加在这些标签之上。

### 自托管Hindsight {#self-hosted-hindsight}

```python
HindsightMemoryService.from_url(
    hindsight_api_url="http://localhost:8888",
)
```

没有未经身份验证的本地服务器需要 `api_key`。

### 结合记忆服务+工具 {#combining-memory-service--tools}

您可以同时使用两者 — `Runner(memory_service=HindsightMemoryService(...))` 用于会话结束时的自动记忆存储，以及 `tools=create_hindsight_tools(...)` 用于中转智能身体驱动的记忆。当记忆库 ID 对齐时，它们共享一个记忆库。

## 环境要求 {#requirements}

- Python 3.10+
- `google-adk>=2.0`
- `hindsight-client>=0.4.0`
