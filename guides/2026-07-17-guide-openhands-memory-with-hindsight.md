---
title: "指南：使用 Hindsight 为 OpenHands 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, openhands, coding-agents, memory]
description: "使用 hindsight-openhands 包为 OpenHands 添加 Hindsight 记忆。该包会将 Hindsight MCP 服务器接入 OpenHands，并添加 Recall（召回）/Retain（存入）规则，让智能体在任务开始时召回记忆，并在工作过程中存入值得长期保留的事实。"
image: /img/guides/guide-openhands-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 OpenHands 添加记忆](/img/guides/guide-openhands-memory-with-hindsight.svg)

如果想为 OpenHands 添加 Hindsight 记忆，最简便的方式是使用 `hindsight-openhands` 包。只需运行一条 `init` 命令，就能将 Hindsight MCP 服务器接入 OpenHands 的 `config.toml`，并在项目的 `AGENTS.md` 中添加召回/存入规则。这样，OpenHands 就能跨任务使用长期记忆，无需每次开始新任务时都重新发现相同的决策和约定。

这种方式很适合 OpenHands，因为它原生支持 Streamable-HTTP MCP，Hindsight MCP 端点可以直接连接，无需桥接。OpenHands 还会在每项任务中将 `AGENTS.md` 加载到智能体上下文，而召回/存入规则正适合放在这里。两者配置就绪后，智能体便可使用 `recall`（Recall，召回）、`retain`（Retain，存入）和 `reflect`（Reflect，反思）工具，并在规则的指导下于任务开始时召回相关记忆、工作过程中存入值得长期保留的事实。

本指南将介绍如何安装软件包、将其连接到 Hindsight 后端、了解 MCP 服务器与规则如何配合，以及如何快速验证记忆确实正在使用。操作时可同时参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-openhands`。
> 2. `cd your-project`。
> 3. 运行 `hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project`。
> 4. 在该项目中启动 OpenHands，即可使用 `recall`/`retain`/`reflect` 工具；这些工具会自动调用。
> 5. 检查后续任务是否记得较早任务存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保已准备好：

- 已安装并能正常运行的 OpenHands
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 一个需要启用记忆的项目目录

## 第 1 步：安装软件包 {#step-1-install-the-package}

使用 pip 安装软件包。

```bash
pip install hindsight-openhands
```

`hindsight-openhands` 是一个轻量的配置 CLI。它不会作为后台进程运行，只会写入 OpenHands 要读取的配置。

## 第 2 步：接入 MCP 服务器并添加规则 {#step-2-wire-up-the-mcp-server-and-rule}

在需要启用记忆的项目目录中运行 `init`：

```bash
cd your-project
hindsight-openhands init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `[mcp]` 配置项合并到 `./config.toml`，并将召回/存入规则写入 `./AGENTS.md`。可以使用 [Hindsight Cloud](https://hindsight.vectorize.io) 密钥；也可以通过 `--api-url http://localhost:8888` 指定自托管服务器（开放的本地服务器无需令牌）。

如果 `config.toml` 无法安全解析，`init` 会打印完整的 `[mcp]` 配置片段，供你手动粘贴，而不会修改文件。你也可以随时运行 `hindsight-openhands init --print-only`，查看配置片段和规则，但不写入文件。

完成后，在该项目中启动 OpenHands。Hindsight MCP 工具便可使用，并会自动调用。

## MCP 服务器与规则如何配合 {#how-the-mcp-server-and-rule-work-together}

OpenHands 原生支持 Streamable-HTTP MCP，因此 Hindsight MCP 端点可以直接连接，无需桥接：

```toml
[mcp]
shttp_servers = [
    {url = "https://api.hindsight.vectorize.io/mcp/my-project/", api_key = "hsk_..."}
]
```

这样，智能体就能使用 `recall`、`retain` 和 `reflect` 工具。OpenHands 还会在每项任务中将 `AGENTS.md`（以及仓库级 microagents）加载到智能体上下文；召回/存入规则就写在这里，告诉智能体先召回记忆，再在工作过程中存入值得长期保留的事实。

- **Recall（任务开始时召回）：** 规则会告诉智能体根据用户请求调用 `recall`，在采取行动前加载相关决策、偏好和项目上下文。
- **Retain（工作过程中存入）：** 当智能体了解到值得长期保留的事实，例如架构决策、用户偏好或约定时，规则会告诉它调用 `retain`，将这些内容存入记忆，以便在不同会话间使用。

有关更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 记忆库 {#memory-banks}

MCP 服务器会连接到一个记忆库 ID，也就是传给 `init` 的 `--bank-id`（默认值为 `openhands`）。记忆库是彼此隔离的记忆存储。将项目指向专属记忆库，可使其记忆与无关工作隔离；将多个工具指向同一个记忆库，则可以让它们共享项目记忆。

因此，如果你也在同一个记忆库中将 Hindsight 与其他编辑器或编程智能体配合使用，它们就能访问同一份项目记忆。在一种工具中学到的约定，也能在其他工具中使用。

记忆库 ID 也可以通过 `HINDSIGHT_OPENHANDS_BANK_ID` 环境变量设置。完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/openhands)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以先检查配置接入情况，再验证记忆的存入和召回是否连通。

检查服务器和规则是否已配置：

```bash
hindsight-openhands status
```

接着可以按以下步骤测试：

1. 在项目中启动 OpenHands，让它在执行任务时记录一项决策或约定。
2. 在同一项目中启动一项新任务。
3. 询问它前一项任务中的决策。

例如：

- 一项任务重构 auth 模块，并记录重试逻辑为何发生变化。
- 后续任务询问当前的 auth 约定是什么。

如果智能体能召回先前的决策，说明配置已经生效。

## 常见错误 {#common-mistakes}

### 在项目目录外运行 init {#running-init-outside-the-project}

`init` 会在当前目录中写入 `./config.toml` 和 `./AGENTS.md`，所以运行前要先 `cd` 到需要启用记忆的项目目录。

### 忘记提供 Cloud 令牌 {#forgetting-the-cloud-token}

Hindsight Cloud 需要令牌。请传入 `--api-token`，或设置 `HINDSIGHT_API_TOKEN`。自托管的开放本地服务器无需令牌。

### init 无法解析 config.toml 时仍手动编辑 {#editing-configtoml-by-hand-when-init-couldnt-parse-it}

如果 `init` 报告无法安全编辑 `config.toml`，它会打印完整的 `[mcp]` 配置片段。请直接粘贴该片段，不要自行猜测配置内容。

### 误以为不同记忆库之间共享记忆 {#assuming-memory-is-global-across-banks}

记忆的范围由 MCP 服务器所连接的记忆库决定。不要指望连接到一个记忆库的项目能够召回另一个记忆库中的上下文。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用：通过 `--api-url` 将 `init` 指向该服务器（例如 `--api-url http://localhost:8888`）；开放的本地服务器无需令牌。

### 这会运行后台进程吗？ {#does-this-run-a-background-process}

不会。`hindsight-openhands` 只写入配置。`recall`/`retain`/`reflect` 工具通过 OpenHands 原生的 MCP 支持运行。

### 记忆的范围由什么决定？ {#how-is-memory-scoped}

范围由记忆库 ID 决定，也就是传给 `init` 的 `--bank-id`（默认值为 `openhands`）；该值也可以通过 `HINDSIGHT_OPENHANDS_BANK_ID` 设置。

### 如何移除配置？ {#how-do-i-remove-it}

运行 `hindsight-openhands uninstall`，即可移除 MCP 服务器配置项和召回/存入规则。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 阅读[快速入门指南](/developer/api/quickstart)
- 阅读 [Hindsight 的 Recall API](/developer/api/recall)
- 阅读 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [OpenHands 集成文档](/sdks/integrations/openhands)
