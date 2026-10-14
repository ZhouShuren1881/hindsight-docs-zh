---
title: "指南：使用 Hindsight 为 Claude Agent SDK 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, claude-agent-sdk, agents, memory]
description: "使用 hindsight-claude-agent-sdk 包为 Anthropic 的 Claude Agent SDK 添加持久长期记忆，让智能体每轮召回相关记忆，并存入它们学到的内容。"
image: /img/guides/guide-claude-agent-sdk-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Claude Agent SDK 添加记忆](/img/guides/guide-claude-agent-sdk-memory-with-hindsight.svg)

如果你想为 **Claude Agent SDK 添加 Hindsight 记忆**，`hindsight-claude-agent-sdk` 包提供两种方式，为 Anthropic 的 Claude Agent SDK 添加持久的长期记忆。你可以将 Retain（存入）、Recall（召回）、Reflect（反思）操作暴露为 MCP 工具，让智能体决定何时使用记忆；也可以接入钩子，在每轮开始前注入相关记忆，并在之后存入对话内容，全程无需显式调用工具。

Claude Agent SDK 很适合采用这种方式，因为 SDK 已支持进程内 MCP 服务器和生命周期钩子。该包同时接入这两种能力：`create_hindsight_server` 会构建智能体可调用的 MCP 服务器，`create_memory_hooks` 会构建自动执行召回和存入的钩子。记忆通过 `bank_id` 按智能体或用户隔离，因此一个智能体的记忆会与其他智能体分开。

本指南将介绍如何安装该包、将其连接到 Hindsight 后端、在工具和钩子两种方式之间作出选择，以及如何通过快速验证流程确认记忆确实在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 执行 `pip install hindsight-claude-agent-sdk`。
> 2. 设置 `HINDSIGHT_API_KEY`（Cloud），或为自托管服务传入 `hindsight_api_url`。
> 3. 使用 `create_hindsight_server(bank_id="my-agent")` 构建服务器。
> 4. 将其作为 MCP 服务器传给 `ClaudeAgentOptions`，或添加 `create_memory_hooks` 来启用自动记忆。
> 5. 验证后续轮次能否召回较早轮次存入的内容。

## 前提条件 {#prerequisites}

开始之前，请确认你具备以下条件：

- 已安装并能正常使用 Claude Agent SDK（`claude-agent-sdk`）。
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器。
- 有一个 `bank_id`，用于将记忆限定到特定智能体或用户。

## 步骤 1：安装软件包 {#step-1-install-the-package}

安装集成软件包：

```bash
pip install hindsight-claude-agent-sdk
```

该软件包提供 `create_hindsight_server`、`create_memory_hooks` 和 `configure` 辅助函数。它不会改变 Claude Agent SDK 的工作方式，而是提供一个进程内 MCP 服务器以及可选钩子，你可以通过 `ClaudeAgentOptions` 接入它们。

## 步骤 2：将软件包连接到 Hindsight {#step-2-point-the-package-at-hindsight}

默认情况下，该软件包连接到 Hindsight Cloud，地址为 `https://api.hindsight.vectorize.io`。使用 Cloud 时，请设置 API 密钥：

```bash
export HINDSIGHT_API_KEY="your-api-key"
```

如果使用自托管的 Hindsight 服务器，请在构建服务器时传入 URL：

```python
server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)
```

你也可以通过 `configure` 全局设置连接选项和默认设置：

```python
from hindsight_claude_agent_sdk import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",
    budget="mid",
)
```

## 步骤 3：为智能体提供记忆工具 {#step-3-give-the-agent-memory-tools}

将 Retain、Recall 和 Reflect 操作暴露为 MCP 工具，让智能体自行决定何时使用记忆：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server

server = create_hindsight_server(
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

async for msg in query(
    prompt="Remember that I prefer dark mode. Then check what you know about me.",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
    ),
):
    print(msg)
```

现在，智能体可以将 Retain、Recall 和 Reflect 作为工具使用，并会在判断记忆与当前任务相关时调用它们。

## 步骤 4：添加自动记忆钩子 {#step-4-add-automatic-memory-hooks}

如果你不想依赖智能体自行决定是否调用工具，可以添加钩子。它们会在每次提示前召回相关记忆，并在每次会话后存入结果，无需显式调用工具：

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from hindsight_claude_agent_sdk import create_hindsight_server, create_memory_hooks

server = create_hindsight_server(bank_id="my-agent", hindsight_api_url="http://localhost:8888")
hooks = create_memory_hooks(bank_id="my-agent", hindsight_api_url="http://localhost:8888")

async for msg in query(
    prompt="Help me refactor the auth module.",
    options=ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
        hooks=hooks,
    ),
):
    print(msg)
```

你可以使用 `MemoryHookConfig` 微调自动行为：

```python
from hindsight_claude_agent_sdk import MemoryHookConfig, create_memory_hooks

hooks = create_memory_hooks(
    bank_id="my-agent",
    hook_config=MemoryHookConfig(
        auto_recall=True,           # 在每次提示前注入记忆
        auto_retain=True,           # 在每次会话后保存结果
        retain_on_tools=["Bash"],   # 也存入值得注意的 Bash 输出
        recall_max_results=5,       # 最多注入的记忆数
        retain_tags=["source:my-app"],
    ),
)
```

如需了解更底层的行为，请阅读 Hindsight 的[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 你将获得什么：工具与钩子 {#what-you-get-tools-vs-hooks}

该软件包提供两种互补方式，连接同一个记忆后端：

- **工具（显式记忆）：** Retain、Recall 和 Reflect 会作为 MCP 工具提供，智能体可以在自行判断记忆相关时调用它们。
- **钩子（自动记忆）：** 每轮开始前将相关记忆注入上下文，之后存入对话内容，无需智能体调用工具。

你可以单独使用其中一种，也可以同时使用两种方式。工具和钩子共用同一个 `bank_id`，因此一方存入的内容可由另一方召回。

## 每个智能体各自使用记忆库 {#per-agent-memory-banks}

记忆范围由你传入的 `bank_id` 决定。为每个智能体或用户分配单独的记忆库，就能隔离他们的记忆；跨会话重用同一个记忆库，则可以让记忆随时间持续保留。

如果要让多个智能体共享一个记忆库，请将它们指向同一个 `bank_id`。完整配置选项见[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/claude-agent-sdk)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 运行一个会存入事实的查询，例如 `"Remember that I prefer dark mode."`。
2. 让智能体通过 retain 工具或自动存入钩子保存该内容。
3. 在同一个记忆库中运行第二个查询，例如 `"What do you know about me?"`。
4. 确认智能体召回了先前存入的事实。

如果第二轮呈现了第一轮存入的事实，说明配置正在正常工作。

## 常见错误 {#common-mistakes}

### 忘记允许使用工具 {#forgetting-to-allow-the-tools}

工具名称都带有 `mcp__hindsight__*` 命名空间。如果你注册了服务器，却没有在 `allowed_tools` 中加入该模式，智能体就无法调用 Retain、Recall 和 Reflect。

### 在不同会话间更改 bank_id {#changing-the-bank_id-between-sessions}

记忆按 `bank_id` 隔离。如果第二次运行时使用了不同的记忆库，它就无法召回第一次运行时存入的内容。

### 期望钩子生效，却没有注册钩子 {#expecting-hooks-without-registering-them}

只创建 `create_hindsight_server` 只会向智能体提供工具，并不会启用自动记忆。如果希望自动执行召回和存入，请将 `create_memory_hooks(...)` 传给 `hooks=`。

### 连接到了错误的后端 {#pointing-at-the-wrong-backend}

该软件包默认连接到 Hindsight Cloud。若使用自托管服务器，请设置 `hindsight_api_url`（或调用 `configure(...)`），确保 retain 和 recall 请求发送到你的部署环境。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以使用自托管的 Hindsight 服务器：将指向你部署环境的 `hindsight_api_url` 传给 `create_hindsight_server`（或 `configure`）即可。

### 我应该使用工具还是钩子？ {#should-i-use-tools-or-hooks}

如果希望智能体决定何时使用记忆，请使用工具；如果希望每轮都自动执行召回和存入，请使用钩子。你也可以让两者共用同一个 `bank_id`。

### 记忆如何限定范围？ {#how-is-memory-scoped}

范围由 `bank_id` 决定。为每个智能体或用户分配单独的记忆库可隔离记忆；需要多个智能体共享记忆时，则让它们共用一个记忆库。

### 我可以微调自动行为吗？ {#can-i-fine-tune-the-automatic-behavior}

可以。将 `MemoryHookConfig` 传给 `create_memory_hooks`，即可控制自动召回、自动存入、要存入哪些工具输出、注入多少条记忆，以及使用哪些存入标签。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 Hindsight 的[召回 API](/developer/api/recall)。
- 查看 Hindsight 的[存入 API](/developer/api/retain)。
- 阅读 [Claude Agent SDK 集成文档](/sdks/integrations/claude-agent-sdk)。
