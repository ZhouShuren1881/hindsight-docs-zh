---
title: "指南：用Hindsight添加OpenHands记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, openhands, coding-agents, memory]
description: "使用后视开放手包将OpenHands记忆与Hindsight一起添加，它将HindsightMCP服务器连接到OpenHands并添加recall/retain规则，以便智能体在任务开始时回忆记忆并在工作时保留持久的事实。"
image: /img/guides/guide-openhands-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OpenHands 添加记忆](/img/guides/guide-openhands-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 OpenHands 添加记忆**，使用 `hindsight-openhands` 包。一个 `init` 命令将 MCP 服务器配置到 OpenHands 的 `config.toml`，并在项目 `AGENTS.md` 添加召回/存储规则，让记忆跨任务延续，无需重新发现相同决策和约定。

这非常适合OpenHands因为OpenHands有原生 Streamable-HTTPMCP支持，所以HindsightMCP端点直接连接，无需桥接。OpenHands也加载`AGENTS.md` 进入智能体的每项任务的上下文，这正是  属于recall/retain规则。两者都到位后，智能体就拥有 `recall`，`retain`，和`reflect` 工具，并在规则的指导下，在任务开始时回忆相关记忆，并在工作时保留持久的事实。

本指南将逐步安装该软件包，并将其指向您的Hindsight后端，了解如何MCP服务器和规则组合在一起，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-openhands`。
> 2. `cd your-project`。
> 3.运行`hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project`。
> 4.开始OpenHands在该项目中 — `recall`/`retain`/`reflect` 工具可用并自动使用。
> 5.验证后面的任务是否记住前面的任务存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- OpenHands已安装并工作
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 您想要记忆范围的项目目录

## 第 1 步：安装软件包 {#step-1-install-the-package}

使用pip安装软件包。

```bash
pip install hindsight-openhands
```

`hindsight-openhands`是一个小设置CLI。它不作为后台进程运行——它只是编写配置OpenHands读取。

## 第 2 步：连接MCP 服务器和规则 {#step-2-wire-up-the-mcp-server-and-rule}

从您想要记忆的项目内部运行`init`：

```bash
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 合并 `[mcp]`进入`./config.toml` 并写下recall/retain规则为 `./AGENTS.md`。使用[Hindsight Cloud](https://hindsight.vectorize.io) 键，或使用 指向自托管服务器 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。

如果`config.toml` 无法安全解析，`init` 打印准确的 `[mcp]` 粘贴片段而不是触摸文件。你也可以运行`hindsight-openhands init --print-only` 随时查看代码片段和规则，无需编写任何内容。

完成后，在项目中启动OpenHands。 Hindsight MCP 工具可用并自动使用。

## MCP服务器和规则如何协同工作 {#how-the-mcp-server-and-rule-work-together}

OpenHands 具有原生 Streamable-HTTP MCP 支持，因此 Hindsight MCP 端点直接连接（无桥接）：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

这给了智能体`recall`，`retain`，和`reflect`工具。OpenHands也加载`AGENTS.md`（和回购微代理）进入智能体的每项任务的上下文中——这就是recall/retain规则存在，告诉智能体首先进行记忆召回，并在其工作时记忆存储持久的事实。

- **召回（任务开始）：** 规则告诉智能体调用 `recall` 根据用户的请求，在执行之前加载相关决策、偏好和项目上下文。
- **存储（工作期间）：** 当智能体学习到一个持久的事实 - 架构决策、用户偏好、约定 - 规则告诉它调用 `retain`跨会话存储它。

对于较低级别的行为，请阅读[Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 记忆库 {#memory-banks}

TheMCP服务器连接到记忆库 ID — `--bank-id` 你传给`init`（默认：`openhands`）。记忆库是一个孤立的记忆存储，因此将项目指向自己的记忆库可以使其记忆与不相关的工作分开，而将多个工具指向同一个记忆库可以让它们共享项目记忆。

这意味着，如果您还使用Hindsight与另一个编辑器或针对相同的记忆库编码智能体，它们会从同一个项目记忆中提取。在一种工具中学到的约定在其他工具中也可用。

记忆库也可以来自`HINDSIGHT_OPENHANDS_BANK_ID`环境变量。有关完整的配置选项集，请参阅 [包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openhands)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

可以先检查接线，再检查往返。

检查服务器和规则是否已配置：

```bash
hindsight-openhands status
```

那么一个好的测试序列是：

1. 在项目中启动OpenHands，让它记录任务期间的决定或约定
2. 在同一项目中开始新任务
3. 询问之前的决定

例如：

- 一个任务重构了 auth 模块并记录了重试逻辑发生变化的原因
- 稍后的任务询问当前的身份验证约定是什么

如果智能体回忆起之前的决定，则设置正在运行。

## 常见错误 {#common-mistakes}

### 在项目外运行 init {#running-init-outside-the-project}

`init` 写`./config.toml` 和 `./AGENTS.md`在当前目录下，所以在运行之前， `cd`进入您想要记忆的项目。

### 忘记 Cloud 令牌 {#forgetting-the-cloud-token}

Hindsight Cloud需要令牌。通过`--api-token`（或设置`HINDSIGHT_API_TOKEN`）。自托管开放本地服务器不需要令牌。

### 当 init 无法解析 config.toml 时手动编辑它 {#editing-configtoml-by-hand-when-init-couldnt-parse-it}

如果`init` 报告无法安全编辑 `config.toml`，它打印出准确的`[mcp]` 片段 — 将其粘贴进去而不是猜测。

### 假设记忆在记忆库中是全局的 {#assuming-memory-is-global-across-banks}

记忆的范围是MCP服务器指向的记忆库。不要期望一个记忆库上的项目能够记忆另一个记忆库的上下文。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也能工作 — 点 `init` 与 `--api-url`（例如`--api-url http://localhost:8888`），并且开放本地服务器不需要令牌。

### 这会运行后台进程吗？ {#does-this-run-a-background-process}

没有。 `hindsight-openhands`只写配置。 `recall`/`retain`/`reflect`工具贯穿OpenHands'母语MCP支持。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

按记忆库id — `--bank-id` 传递给`init`（默认`openhands`)，也可以来自`HINDSIGHT_OPENHANDS_BANK_ID`。

### 如何删除它？ {#how-do-i-remove-it}

奔跑`hindsight-openhands uninstall` 删除MCP服务器入口和recall/retain规则。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[OpenHands 集成文档](/sdks/integrations/openhands)
