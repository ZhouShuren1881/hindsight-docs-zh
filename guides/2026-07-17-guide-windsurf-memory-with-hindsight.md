---
title: "指南：使用 Hindsight 为 Windsurf 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, windsurf, coding-agents, memory]
description: "使用 hindsight-windsurf CLI 将 Hindsight MCP 服务器接入 Windsurf，并添加始终启用的召回/存入规则，让 Cascade 能跨任务记住信息。"
image: /img/guides/guide-windsurf-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Windsurf 添加记忆](/img/guides/guide-windsurf-memory-with-hindsight.svg)

如果你想让 **Windsurf 拥有 Hindsight 记忆**，最简单的配置方式是使用 `hindsight-windsurf` CLI。运行一次 `init` 命令，就能将 Windsurf 的 Cascade 智能体连接到 Hindsight MCP 服务器，并添加一条始终启用的规则，要求智能体在开始任务前召回相关记忆，并在工作过程中存入值得长期保留的事实。这样，Windsurf 就能跨任务保留长期记忆，不必在每次新对话中重新发现相同的项目背景。

这套方案很适合 Windsurf，因为 Windsurf 可以运行 MCP 服务器，并将工作区规则应用到每个 Cascade 请求中。该集成同时利用了这两项能力：它会注册 Hindsight MCP 端点，让 Cascade 可以使用 Recall（召回）、Retain（存入）和 Reflect（反思）工具（`recall` / `retain` / `reflect`）；还会写入一条简短的 `trigger: always_on` 规则，要求智能体先召回记忆，再存入它学到的信息。Recall 会在查询时根据你实际发送的消息运行，因此对你来说是自动完成的。

本指南将介绍如何安装 CLI、将其接入 Windsurf、了解 MCP 与规则结合的工作方式，以及如何快速验证记忆是否确实在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-windsurf`。
> 2. 进入你的项目目录。
> 3. 运行 `hindsight-windsurf init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory`。
> 4. 重新加载 Windsurf（或在 Cascade 中刷新 MCP 服务器），以加载 `hindsight` 工具。
> 5. 验证后续任务是否记得先前任务存入的信息。

## 前提条件 {#prerequisites}

开始前，请确认你已准备好：

- 已安装并正常运行 Windsurf (Codeium)，且可以使用 Cascade 智能体
- 可连接的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 已安装 Python 和 `pip`，以便安装 `hindsight-windsurf` CLI

## 第一步：安装 CLI {#step-1-install-the-cli}

使用 pip 安装集成 CLI。

```bash
pip install hindsight-windsurf
```

`hindsight-windsurf` 不会取代 Windsurf。它只是一次性配置工具：`init` 会把 Hindsight MCP 服务器和规则接入 Windsurf 配置，之后 Cascade 会自行使用这些工具。

## 第二步：将 Hindsight 接入 Windsurf {#step-2-wire-hindsight-into-windsurf}

在项目目录中，运行 `init` 并提供 Hindsight 密钥和记忆库 ID。

```bash
cd your-project
hindsight-windsurf init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 会将 `hindsight` MCP 服务器添加到 `~/.codeium/windsurf/mcp_config.json`（Windsurf 唯一的全局 MCP 配置文件），并将召回/存入规则写入 `./.windsurf/rules/hindsight.md`。重新加载 Windsurf（或在 Cascade 中刷新 MCP 服务器）后，就可以使用 `hindsight` 服务器提供的工具。

如果使用自托管的 Hindsight 服务器，可通过 `--api-url` 指定服务器，而不是使用 Cloud 令牌（开放的本地服务器不需要令牌）：

```bash
hindsight-windsurf init --api-url http://localhost:8888 --bank-id my-memory
```

如果你的 `mcp_config.json` 不是普通 JSON 文件，`init` 不会重写它，而是打印出需要你手动粘贴的配置项。你也可以随时运行 `hindsight-windsurf init --print-only`，只获取 MCP 片段和规则文本，不写入任何文件。

## 集成如何使用记忆 {#how-the-integration-uses-memory}

Windsurf 支持这套集成所用的两项功能，并且会同时配置它们：

- **MCP 服务器：**`init` 会在 `~/.codeium/windsurf/mcp_config.json` 的 `mcpServers` 下注册 Hindsight MCP 端点。Windsurf 通过 `serverUrl` 字段连接远程服务器，并可选地使用请求标头，因此 Cascade 可以直接连接 Hindsight 端点，无需桥接，并使用 `recall` / `retain` / `reflect` 工具。
- **始终启用的规则：**`init` 会将带有 `trigger: always_on` frontmatter 的规则写入 `./.windsurf/rules/hindsight.md`。Windsurf 会在工作区的每个 Cascade 请求中加入这条规则，因此智能体会先召回相关记忆，并在工作过程中存入值得长期保留的事实。

Recall 会在查询时根据你实际发送的消息运行，因此结果准确且没有延迟。相应的取舍是：这依赖智能体遵守“先召回”的指令，而不是由编辑器强制执行。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 检查和移除配置 {#checking-and-removing-the-setup}

CLI 提供三个命令，可用于检查或撤销这项配置：

| 命令 | 说明 |
| --- | --- |
| `hindsight-windsurf init` | 添加 MCP 服务器和召回/存入规则 |
| `hindsight-windsurf status` | 显示服务器和规则是否已配置 |
| `hindsight-windsurf uninstall` | 移除服务器和规则 |

运行 `init` 后，再运行 `hindsight-windsurf status`，即可确认 MCP 服务器和规则都已安装。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 在项目中运行 `hindsight-windsurf init`，然后重新加载 Windsurf
2. 在 Cascade 中执行一项任务，让智能体记录一项决定或约定
3. 开始一项新任务或新对话
4. 询问先前的决定

例如：

- 某项任务重构了 auth 模块，并记录了更改重试逻辑的原因
- 后续任务询问当前的身份验证约定

如果 Cascade 能召回先前的决定，就说明配置已生效。

## 常见错误 {#common-mistakes}

### 忘记重新加载 Windsurf {#forgetting-to-reload-windsurf}

只有重新加载 Windsurf 或在 Cascade 中刷新 MCP 服务器后，才会出现 `hindsight` 工具。如果找不到这些工具，请先重新加载。

### 手动编辑非 JSON 格式的 mcp_config.json {#editing-a-non-json-mcp_configjson-by-hand}

如果你的 `mcp_config.json` 不是普通 JSON 文件，`init` 不会重写它，而是打印出需要粘贴的配置项。请自行添加该配置项，不要等待文件自动更改。

### 以为编辑器会强制执行记忆召回 {#expecting-the-editor-to-force-recall}

召回和存入操作通过智能体调用的 MCP 工具执行，并由始终启用的规则引导。编辑器不会强制执行这些操作，因此如果智能体跳过了记忆召回，请提示它先召回相关记忆。

### 忘记为 Cloud 提供 API 令牌 {#forgetting-the-api-token-on-cloud}

Hindsight Cloud 需要密钥。请传入 `--api-token`，或设置 `HINDSIGHT_API_TOKEN`。自托管的开放本地服务器不需要令牌。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需通过 `--api-url` 将 `init` 指向该服务器（开放的本地服务器不需要令牌）。

### 这会改变我使用 Windsurf 的方式吗？ {#does-this-change-how-i-use-windsurf}

不会。`init` 是一次性配置命令。之后你可以照常使用 Cascade，它会在始终启用的规则引导下自行调用 Hindsight 工具。

### 记忆的作用范围是什么？ {#how-is-memory-scoped}

作用范围由你在 `init` 中通过 `--bank-id` 指定的记忆库 ID 决定（默认记忆库为 `windsurf`）。在不同工具中使用同一个记忆库，即可共享项目记忆。

### 这与其他编码智能体集成类似吗？ {#is-this-similar-to-other-coding-agent-integrations}

理念相似。Windsurf 使用 MCP 服务器和始终启用的规则，而不是包装器命令，但“先召回、后存入”的模式相同。请参阅集成文档中的[完整配置选项](https://hindsight.vectorize.io/docs/integrations/windsurf)。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [Windsurf 集成文档](https://hindsight.vectorize.io/docs/integrations/windsurf)
