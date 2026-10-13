---
title: "指南：用Hindsight添加Zed记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zed, coding-agents, memory]
description: "通过将智能体面板连接到HindsightMCP服务器，将Zed记忆与Hindsight一起添加，以便助手在执行任务之前回忆相关记忆，并在执行过程中保留持久的事实。"
image: /img/guides/guide-zed-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Zed 添加记忆](/img/guides/guide-zed-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Zed 添加记忆**，使用 `hindsight-zed` 包。一个命令将 Agent Panel 连接到 MCP 服务器并添加使用规则，让助手任务开始时召回、工作期间存储持久事实，实现跨对话延续。

这非常适合Zed因为Zed没有预提示钩子，但支持MCP上下文服务器和全局指令文件。集成使用两者：它注册HindsightMCP下的服务器 `context_servers` `settings.json`，赋予智能体`recall` / `retain` / `reflect`工具，并且在上添加了一个小规则 `~/.config/zed/AGENTS.md` 首先告诉智能体记忆召回和记忆存储它学到了什么。 记忆召回是在查询时针对您的实际消息进行的，因此没有延迟，并且从您的座位上它是自动的。

本指南逐步介绍安装包、运行`init` 连接一切，了解如何MCP工具和始终在线规则协同工作，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-zed`。
> 2.运行`hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory`。
> 3.重新启动Zed并打开智能体面板 — `hindsight` 服务器应显示一个绿点。
> 4.永远在线的规则告诉智能体首先进行记忆召回，然后记忆存储它学到了什么。
> 5.验证后面的对话是否记得前面的对话存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Zed安装了AI助手/智能体面板
- Node.js已安装，自MCP服务器通过 连接 `mcp-remote` stdio 桥（通过 运行 `npx`)
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 第 1 步：安装软件包 {#step-1-install-the-package}

安装`hindsight-zed` 包装。

```bash
pip install hindsight-zed
```

`hindsight-zed` 很小CLI配置Zed使用Hindsight。它不会改变如何Zed工作 — 它将智能体面板连接到HindsightMCP服务器并添加一个recall/retain规则。

## 第 2 步：将 Zed 连接到 Hindsight {#step-2-wire-zed-to-hindsight}

奔跑`init` 与你的HindsightAPI键和您要使用的记忆库：

```bash
hindsight-zed init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-memory
```

`init` 添加 `hindsight`MCP服务器到 `~/.config/zed/settings.json` 和recall/retain规则`~/.config/zed/AGENTS.md`。重新启动Zed，打开智能体面板，`hindsight` 服务器应显示一个绿点。

对于自托管Hindsight服务器，用指向它 `--api-url` 改为：

```bash
hindsight-zed init --api-url http://localhost:8888 --bank-id my-memory
```

开放的本地服务器不需要令牌。

如果你的`settings.json` 包含注释 (JSONC)，`init` 不会重写它 — 它会打印准确的 `context_servers` 条目供您粘贴。您可以随时查看该片段，而无需编写文件：

```bash
hindsight-zed init --print-only
```

## 第三步：确认接线 {#step-3-confirm-the-wiring}

使用`status`命令检查服务器和规则是否配置：

```bash
hindsight-zed status
```

可用的命令有：

|命令|说明|
| --- | --- |
|`hindsight-zed init`|添加 MCP 服务器 + recall/retain 规则|
|`hindsight-zed status`|显示服务器+规则是否配置|
|`hindsight-zed uninstall`|删除服务器+规则|
|`hindsight-zed init --print-only`|打印配置以手动添加|

## 整合如何使用记忆 {#how-the-integration-uses-memory}

Zed 没有预提示钩子，因此集成在 Zed 暴露的两个点上工作：

- **MCP 上下文服务器：**Zed运行MCP在下配置的服务器 `context_servers` `settings.json` 并在智能体面板中显示他们的工具。 `hindsight-zed` 注册HindsightMCP服务器在那里，提供智能体`recall` / `retain` / `reflect`工具。因为Zed还没有原生HTTP-MCP传输，服务器通过连接 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) stdio 桥，通过 运行 `npx` — 这就是原因  需要Node.js。
- **全局指令文件** (`~/.config/zed/AGENTS.md`）那个Zed包含在每一次对话中。集成在围栏内添加了一条小规则 `<!-- HINDSIGHT -->` 块，使文件的其余部分保持不变，告诉智能体首先进行记忆召回并存储记忆持久的事实。

记忆召回和记忆存储通过智能体调用的MCP工具运行，并遵循始终在线的规则。这使得记忆召回查询时间变得精确——它会毫无延迟地针对您的实际消息运行——但代价是它依赖于遵循“记忆第一”指令的智能体，而不是由编辑器强制执行。

对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 运行`hindsight-zed status` 确认服务器和规则已配置
2. 打开智能体面板Zed并检查 `hindsight` 服务器显示绿点
3. 在一次对话中，告诉智能体一个持久的事实或约定，并让它记忆存储
4. 开始新对话
5. 询问之前的事实

例如：

- 对话一建立一个身份验证约定并要求智能体记住它
- 对话二询问当前的身份验证约定是什么

如果智能体回忆起之前的事实，则设置正在运行。

## 常见错误 {#common-mistakes}

### Node.js 未安装 {#nodejs-not-installed}

TheMCP服务器贯穿`mcp-remote` stdio 桥接器 `npx`，所以  必须安装Node.js，否则`hindsight` 服务器无法连接。

### 编辑 JSONC 设置文件 {#editing-a-jsonc-settings-file}

如果你的`settings.json`有评论，`init` 不会重写它 - 它会打印要粘贴的条目。粘贴该片段，或运行 `hindsight-zed init --print-only`再看一遍。

### 不重启Zed {#not-restarting-zed}

`hindsight` 服务器和规则在重新启动时拾取。如果没有显示绿点，请重新启动Zed并重新打开智能体面板。

### 期待编辑器强制执行记忆召回 {#expecting-the-editor-to-force-recall}

记忆召回依赖于遵循始终在线的“记忆召回第一”规则的智能体，而不是强制执行它的编辑器。如果任务没有记忆召回，则提醒智能体进行记忆召回。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 用 指向它 `--api-url http://localhost:8888`（开放本地服务器不需要令牌）。

### 这会改变我使用Zed的方式吗？ {#does-this-change-how-i-use-zed}

没有。该集成将智能体面板连接到 Hindsight MCP 服务器并添加规则。您继续以同样的方式使用Zed的AI助手。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

记忆库。通过`--bank-id` `init`（默认记忆库id为`zed`）。

### 这与其他编码-智能体集成相似吗？ {#is-this-similar-to-other-coding-agent-integrations}

精神上是的。 Zed 使用 MCP 上下文服务器和全局指令文件而不是包装器或挂钩，但前记忆召回/后记忆召回模式是相同的。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Zed 集成文档](/sdks/integrations/zed)
