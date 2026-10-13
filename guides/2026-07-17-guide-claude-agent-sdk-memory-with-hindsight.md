---
title: "指南：使用 Hindsight 为 Claude Agent SDK 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, claude-agent-sdk, agents, memory]
description: "用 hindsight-claude-agent-sdk 每轮召回相关记忆并存储所学，为智能体添加持久记忆。"
image: /img/guides/guide-claude-agent-sdk-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Claude Agent SDK 添加记忆](/img/guides/guide-claude-agent-sdk-memory-with-hindsight.svg)

包提供两种持久记忆方式：MCP 工具让智能体决定存储、召回和反思；钩子每轮前注入、之后存储，无需显式调用。

SDK 已支持进程内 MCP 和生命周期钩子。`create_hindsight_server` 创建服务器，`create_memory_hooks` 创建自动钩子。`bank_id` 按智能体或用户隔离。

本指南介绍安装、连接、工具与钩子选择及验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-claude-agent-sdk`.
> 2. Cloud 设置密钥，自托管传 URL。
> 3. `create_hindsight_server(bank_id="my-agent")` 创建服务器。
> 4. 传入 MCP 配置，或添加 `create_memory_hooks` 自动记忆。
> 5. 验证后续召回。

## 前提条件 {#prerequisites}

开始前确认：

- 正常 Claude Agent SDK（`claude-agent-sdk`）。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 限定用户或智能体的 `bank_id`。

## 步骤 1：安装包 {#step-1-install-the-package}

安装集成。

```bash
pip install hindsight-claude-agent-sdk
```

增加服务器、钩子和 `configure`，不改变 SDK，通过 `ClaudeAgentOptions` 接入。

## 步骤 2：连接 Hindsight {#step-2-point-the-package-at-hindsight}

默认 Cloud URL。设置密钥：

```bash
export HINDSIGHT_API_KEY="your-api-key"
```

自托管创建时传 URL：

```python
server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)
```

也可全局设置：

```python
from hindsight_claude_agent_sdk import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
)
```

## 步骤 3：提供记忆工具 {#step-3-give-the-agent-memory-tools}

以 MCP 暴露存储、召回、反思，让智能体决定：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server

server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

async for msg in query(
    prompt="记住，我喜欢深色模式。然后看看你了解我什么。",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
    ),
):
    print(msg)
```

智能体判断相关时调用。

## 步骤 4：添加自动钩子 {#step-4-add-automatic-memory-hooks}

不依赖主动调用时用钩子，每提示前召回、每会话后存储：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server, create_memory_hooks

server = create_hindsight_server(bank_id="my-agent", hindsight_api_url="http://localhost:8888")
hooks = create_memory_hooks(bank_id="my-agent", hindsight_api_url="http://localhost:8888")

async for msg in query(
    prompt="帮我重构认证模块。",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
        hooks=hooks,
    ),
):
    print(msg)
```

用 `MemoryHookConfig` 调整：

```python
from hindsight_claude_agent_sdk import MemoryHookConfig, create_memory_hooks

hooks = create_memory_hooks(
    bank_id="my-agent",
    hook_config=MemoryHookConfig(
        auto_recall=True,           # 每提示前注入
        auto_retain=True,           # 每会话后保存
        retain_on_tools=["Bash"],   # 也保存重要 Bash 输出
        recall_max_results=5,       # 最大注入条数
        retain_tags=["source:my-app"],
    ),
)
```

底层见[记忆召回 API](/developer/api/recall)和[记忆存储 API](/developer/api/retain)。

## 工具与钩子的区别 {#what-you-get-tools-vs-hooks}

两条互补路径访问同后端：

- **工具（显式）**：相关时智能体主动调用 MCP 操作。
- **钩子（自动）**：每轮前注入，之后存储，无需工具。

可独立或同时用，相同 ID 使一方存储可被另一方召回。

## 按智能体记忆库 {#per-agent-memory-banks}

各用户或智能体独立 ID，跨会话重用保持持久。

需共享则相同 ID，完整选项见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/claude-agent-sdk)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 查询存事实，如“记住，我喜欢深色模式”。
2. 工具或自动钩子存储。
3. 同库第二查询：“你了解我什么？”
4. 确认召回。

第二轮呈现第一事实就有效。

## 常见错误 {#common-mistakes}

### 忘记允许工具 {#forgetting-to-allow-the-tools}

工具在 `mcp__hindsight__*`，不加入 `allowed_tools` 就无法调用。

### 会话间改变 ID {#changing-the-bank_id-between-sessions}

不同库不能召回。

### 未注册却期待钩子 {#expecting-hooks-without-registering-them}

仅创建服务器只有工具，自动需传 `create_memory_hooks(...)` 给 `hooks=`。

### 指向错误后端 {#pointing-at-the-wrong-backend}

默认 Cloud，自托管需 URL 或全局配置。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，传自托管 URL。

### 工具还是钩子？ {#should-i-use-tools-or-hooks}

主动决定用工具，自动每轮用钩子，也可同 ID 两者。

### 如何限定？ {#how-is-memory-scoped}

各自 ID 隔离，需共享者同库。

### 可调自动行为吗？ {#can-i-fine-tune-the-automatic-behavior}

可配置自动开关、工具输出、注入数量和标签。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Claude Agent SDK 集成文档](/sdks/integrations/claude-agent-sdk)。
