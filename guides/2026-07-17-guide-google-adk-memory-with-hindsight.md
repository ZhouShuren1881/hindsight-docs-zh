---
title: "指南：使用 Hindsight 为 Google ADK 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, google-adk, agents, memory]
description: "通过 ADK 原生记忆服务自动存储会话、搜索时召回，为 Google ADK 提供长期记忆。"
image: /img/guides/guide-google-adk-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Google ADK 添加记忆](/img/guides/guide-google-adk-memory-with-hindsight.svg)

包实现 BaseMemoryService，传 Runner 后会话结束自动存储，search_memory 返回匹配，跨会话延续。

直接接原生接口，默认 app_name/user_id 每组合独立。

还提供显式 FunctionTool，模型可中途控制，介绍两模式和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-google-adk`.
> 2. from_url 创建服务。
> 3. 传 Runner，结束自动存。
> 4. search_memory 同组合库召回。
> 5. 验证后续。

## 前提条件 {#prerequisites}

开始前确认：

- Python 3.10+。
- google-adk>=2.0 和可用智能体。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：安装包 {#step-1-install-the-package}

```bash
pip install hindsight-google-adk
```

依赖 hindsight-client>=0.4.0 访问后端。

## 步骤 2：接入服务 {#step-2-wire-up-the-memory-service}

from_url 构建并传 Runner：

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

# ...正常使用 runner.run_async(...)，记忆自动执行。 {#-use-runnerrun_async-as-normal-memory-is-automatic}
```

自托管换 URL、省密钥：

```python
HindsightMemoryService.from_url(hindsight_api_url="http://localhost:8888")
```

无认证本地不需密钥。

## 服务如何使用 {#how-the-memory-service-uses-memory}

两个接口点：

- **结束存储**：Runner 调 add_session_to_memory，全部事件存入组合库。
- **搜索召回**：search_memory 用同库，返回 MemoryEntry。

错误仅日志，不传播 Runner，不使智能体崩溃。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 按用户记忆库 {#per-user-memory-banks}

默认 `{app_name}::{user_id}`，模板覆盖：

```python
# 按用户，跨应用共享 {#per-user-bank-shared-across-apps}
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="user::{user_id}",
)

# 静态，所有用户共享 {#static-bank-shared-across-all-users}
HindsightMemoryService.from_url(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    bank_id_template="my-shared-bank",
)
```

事件还带 app/user 标签，召回自动用户标签，因此不互见。

## 可选显式工具 {#optional-explicit-retain--recall--reflect-tools}

模型中途控制可替代或并用：

```python
from google.adk.agents import LlmAgent
from hindsight_google_adk import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
)

agent = LlmAgent(name="assistant", model="gemini-2.0-flash", tools=tools)
```

三个工具，include 开关：

- retain：长期存储。
- recall：搜索返回匹配。
- reflect：综合连贯回答。

可服务自动结束存、工具中途主动召回，ID 一致则共享。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 接服务 Runner 运行。
2. 记录事实偏好决策。
3. 结束保存事件。
4. 同 app/user 新会话。
5. 问此前触发搜索。

结果呈现即有效。

## 常见错误 {#common-mistakes}

### 改组合 {#changing-app_name-or-user_id-between-sessions}

任一变化指向他库。

### 过早测试 {#testing-retain-too-early}

会话结束才存。

### 假定全局 {#assuming-memory-is-global}

默认组合独立，需共享模板。

### 本地传密钥 {#passing-an-api-key-to-a-local-server}

Cloud 必需，无认证本地不用。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，URL 自托管省密钥。

### 必须显式工具吗？ {#do-i-have-to-use-the-explicit-tools}

不用，服务处理结束和搜索，工具中途可选。

### 如何限定？ {#how-is-memory-scoped}

默认组合，模板覆盖。

### 可一次默认配置？ {#can-i-set-app-wide-defaults-once}

可以，启动 configure，后续 from_url 和工具作回退。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Google ADK 集成文档](/sdks/integrations/google-adk)。
