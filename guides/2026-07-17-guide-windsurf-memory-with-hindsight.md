---
title: "指南：用Hindsight添加Windsurf记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, windsurf, coding-agents, memory]
description: "使用事后风帆CLI添加Windsurf记忆与Hindsight，它将HindsightMCP服务器连接到Windsurf加上永远在线的recall/retain规则，以便Cascade跨任务记住。"
image: /img/guides/guide-windsurf-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Windsurf 添加记忆](/img/guides/guide-windsurf-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Windsurf 添加记忆**，运行 `hindsight-windsurf` CLI。一个 `init` 命令连接 Cascade 智能体与 MCP 服务器，添加始终启用的规则，指导任务前召回、工作期间保存持久事实，让上下文跨任务延续。

这非常适合Windsurf因为Windsurf运行MCP服务器并将工作区规则应用于每个 Cascade 请求。集成使用两者：它注册HindsightMCP端点，因此 Cascade 得到 `recall` / `retain` / `reflect`工具，里面写了一个小`trigger: always_on` 规则告诉智能体首先进行记忆召回并存储它所学到的内容。 记忆召回在查询时针对您的实际消息运行，因此从您的座位上它是自动的。

本指南逐步介绍如何安装CLI，将其连接到Windsurf，了解如何MCP加规则方法有效，并且有一个快速验证流程，因此您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-windsurf`。
> ​​2。 `cd` 进入您的项目。
> 3.运行项目目录中的 `hindsight-windsurf init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory`。
> 4.重新加载Windsurf（或刷新MCPCascade 中的服务器）因此 `hindsight` 工具加载。
> 5.验证后面的任务是否记住前面的任务存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Windsurf (Codeium) 安装并使用 Cascade 智能体
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- Python与 `pip`，这样你就可以安装`hindsight-windsurf`CLI

## 第一步：安装CLI {#step-1-install-the-cli}

安装CLI与pip的集成。

```bash
pip install hindsight-windsurf
```

`hindsight-windsurf` 不运行代替Windsurf。它是一个一次性设置工具：`init` 连接HindsightMCP服务器和规则Windsurf的配置，然后Cascade自己使用这些工具。

## 第 2 步：将Hindsight 连接到Windsurf {#step-2-wire-hindsight-into-windsurf}

从您的项目目录中，运行 `init` 与你的Hindsight密钥和记忆库 ID。

```bash
cd your-project
hindsight-windsurf init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 添加 `hindsight`MCP服务器到 `~/.codeium/windsurf/mcp_config.json` (Windsurf单曲全球MCP配置）并写入recall/retain规则`./.windsurf/rules/hindsight.md`。重新加载  Cascade 中的Windsurf（或刷新MCP服务器），以及 `hindsight` 服务器工具可用。

对于自托管Hindsight服务器，用指向它 `--api-url`代替云令牌（开放本地服务器不需要令牌）：

```bash
hindsight-windsurf init --api-url http://localhost:8888 --bank-id my-memory
```

如果你的`mcp_config.json`并不简单JSON，`init` 不会重写它 - 它会打印条目以供您自己粘贴。你也可以运行`hindsight-windsurf init --print-only` 随时获取MCP片段和规则文本，无需编写任何内容。

## 整合如何使用记忆 {#how-the-integration-uses-memory}

Windsurf 支持此集成使用的两种东西，并将两者连接起来：

- **MCP 服务器：**`init` 注册HindsightMCP下的端点 `mcpServers` `~/.codeium/windsurf/mcp_config.json`。Windsurf通过连接到远程服务器 `serverUrl` 具有可选标头的字段，因此Hindsight端点直接连接 - 无需桥接 - 提供级联 `recall` / `retain` / `reflect`工具。
- **始终启用的规则：**`init` 用 编写规则 `trigger: always_on` 至 `./.windsurf/rules/hindsight.md`。Windsurf在工作区中的每个级联请求中都包含该规则，因此智能体被告知首先记忆相关记忆，并在过程中记忆存储持久的事实。

记忆召回在查询时针对您的实际消息运行，因此它是精确的，没有延迟。权衡是，它依赖于遵循“记忆召回优先”指令的智能体，而不是强制执行它的编辑器。

对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 检查并删除设置 {#checking-and-removing-the-setup}

CLI 具有三个命令，因此您可以检查或反转接线：

|命令|说明|
| --- | --- |
|`hindsight-windsurf init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-windsurf status`|显示服务器+规则是否配置|
|`hindsight-windsurf uninstall`|删除服务器+规则|

奔跑`hindsight-windsurf status` 之后 `init` 确认MCP服务器和规则已安装。 在项目中运行

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 运行`hindsight-windsurf init` 在项目中并重新加载Windsurf
2. 在 Cascade 中，执行任务并让智能体记录决定或约定
3. 开始新任务或对话
4. 询问之前的决定

例如：

- 一个任务重构了 auth 模块并记录了重试逻辑发生变化的原因
- 稍后的任务询问当前的身份验证约定是什么

如果 Cascade 回忆起之前的决定，则该设置正在运行。

## 常见错误 {#common-mistakes}

### 忘记重新加载Windsurf {#forgetting-to-reload-windsurf}

`hindsight` 工具仅在重新加载后出现Windsurf或刷新MCP服务器。如果工具丢失，请先重新加载。

### 手动编辑非JSON mcp_config.json {#editing-a-non-json-mcpconfigjson-by-hand}

如果你的`mcp_config.json`并不简单JSON，`init` 不会重写它 - 它会打印要粘贴的条目。您自己添加该条目，而不是期望文件发生更改。

### 期待编辑器强制执行记忆召回 {#expecting-the-editor-to-force-recall}

记忆召回和记忆存储通过智能体调用的MCP工具运行，并遵循始终在线的规则。编辑器不会强制执行它，因此如果智能体跳过记忆召回，请先提示它记忆召回相关的记忆。

### 忘记云上的API令牌 {#forgetting-the-api-token-on-cloud}

Hindsight Cloud需要钥匙。通过`--api-token`（或设置`HINDSIGHT_API_TOKEN`）。自托管开放本地服务器不需要令牌。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也能工作 — 点 `init` 与 `--api-url`（开放本地服务器不需要令牌）。

### 这会改变我使用Windsurf的方式吗？ {#does-this-change-how-i-use-windsurf}

没有。 默认情况下 `init` 是一次性设置命令。之后你就可以正常使用Cascade了，它会调用Hindsight独立的工具，遵循始终在线的规则。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

通过你传递到的记忆库id`init` 与 `--bank-id`（记忆库默认为`windsurf`）。跨工具使用相同的记忆库来共享项目的记忆。

### 这与其他编码-智能体集成相似吗？ {#is-this-similar-to-other-coding-agent-integrations}

精神上是的。Windsurf使用MCP服务器加上永远在线的规则而不是包装器命令，但记忆召回之前/记忆存储之后模式是相同的。参见集成文档中的 [完整配置选项](/sdks/integrations/local-mcp)。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Windsurf 集成文档](/sdks/integrations/local-mcp)
