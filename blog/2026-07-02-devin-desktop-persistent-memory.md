---
title: "Devin Desktop 持久记忆（前身为 Windsurf）"
authors: [benfrank241]
slug: "2026/07/02/devin-desktop-persistent-memory"
date: 2026-07-02T13:00
tags: [hindsight, devin-desktop, devin, windsurf, codeium, memory, persistent-memory, mcp, tutorial]
description: "为 Devin Desktop（前身为 Windsurf）添加持久记忆：连接远程 MCP 服务器，并配置一条始终生效的规则，在每项任务开始时召回记忆、工作过程中存入记忆。"
image: /img/blog/devin-desktop-persistent-memory.webp
hide_table_of_contents: true
---

![Devin Desktop 持久记忆与 Hindsight](/img/blog/devin-desktop-persistent-memory.webp)

[Devin Desktop](https://devin.ai) 是 Cognition 将 Windsurf（前身为 Codeium）于 2026 年 6 月重新命名后的编辑器。名称变了，问题依旧：Devin 会读取代码库，并在一次会话中保留计划，但不会把任何内容带到下一次会话。关闭编辑器，第二天重新打开时，智能体又变成了一个全新的模型；它不记得你上周讨论过的决定，也不记得你周二制定的约定。

`hindsight-devin-desktop` 集成为 Devin 添加持久的长期记忆。了解它如何实现这一点很有必要，因为 Devin Desktop 没有向第三方开放生命周期钩子。没有接口可以挂接 `sessionStart` 时的记忆召回或 `stop` 时的记忆存入。因此，这个集成使用编辑器确实支持的两种机制：**远程 [模型上下文协议](https://modelcontextprotocol.io)（MCP）服务器**和**始终生效的工作区规则**。

<!-- truncate -->

## 概览 {#tldr}

- Devin Desktop（前身为 Windsurf）没有第三方生命周期钩子，因此记忆通过 MCP 和规则接入，而不是通过钩子脚本。
- `hindsight-devin-desktop init` 会连接 Hindsight **远程 MCP 服务器**（向 Devin 提供 Recall（召回）、Retain（存入）和 Reflect（反思）工具），并将一条**始终生效的规则**写入 `.devin/rules/hindsight.md`。
- 这条规则要求 Devin 在每项任务开始时调用 `recall`，并在工作过程中将有长期价值的事实存入记忆。
- 无需本地守护进程、插件脚本或逐轮钩子。MCP 端点直接连接到 [Hindsight Cloud](https://hindsight.vectorize.io) 或你的自托管服务器。
- 这是**模型驱动的记忆**：规则会随每个请求一起发送，但是否实际调用 `recall` 或 `retain` 由 Devin 决定。这是相较于确定性钩子集成的主要取舍。

## 为什么 Devin Desktop 需要持久记忆 {#why-devin-desktop-needs-persistent-memory}

新的 Devin 会话从它能看到的内容开始：你打开的文件、工作区，以及你写在 `.devin/rules/` 中的规则。它看不到的是过去。比如你昨天跨三个文件追查的错误、你选择某个库的原因，以及你一直坚持的命名约定。除非你把这些内容写到 Devin 能读取的地方，否则它们都无法跨越会话边界。

你可以用规则文件手动固定上下文；对于稳定事实，这种方法有效。但它无法记录那些你事先不知道需要记录的内容。持久记忆可以弥补这个缺口：工作过程中，有长期价值的事实会被存入记忆；下次需要时，相关内容会再次出现。

对于整天都在使用的编辑器，这一点尤其重要。一个每天早上都要重新熟悉情况的编程智能体，很难称得上助手。记忆能让每次会话都从头开始的模型，逐渐建立在前一天的工作之上。

## Devin Desktop 持久记忆的工作方式 {#how-devin-desktop-persistent-memory-works}

Devin Desktop 为第三方提供了两个集成入口，`hindsight-devin-desktop` 会同时使用它们。

**远程 MCP 服务器。** Devin Desktop 从一个全局配置文件读取 MCP 服务器，并支持通过 `serverUrl` 和自定义请求头连接*远程*服务器。因此，该集成可以让 Devin 直接连接到 Hindsight MCP 端点，无需管理本地进程：

```json
{
  "mcpServers": {
    "hindsight": {
      "serverUrl": "https://api.hindsight.vectorize.io/mcp/my-project/",
      "headers": { "Authorization": "Bearer hsk_..." }
    }
  }
}
```

这样 Devin 就能使用三个工具：`recall`（检索记忆）、`retain`（存入有长期价值的事实）和 `reflect`（生成基于记忆的综合回答）。记忆库 ID 编码在端点路径中，因此只需一行配置，就能将整个连接限定到一个记忆库。

**始终生效的规则。** Devin Desktop 会将工作区 `.devin/rules/` 目录下、frontmatter 中声明了 `trigger: always_on` 的规则文件应用到每个请求。该集成会写入专用文件 `.devin/rules/hindsight.md`，告诉 Devin 如何以及何时使用这些工具：

```markdown
---
trigger: always_on
---

<!-- Managed by hindsight-devin-desktop -->
You have persistent long-term memory through the Hindsight MCP server
(`recall`, `retain`, and `reflect` tools).

- At the start of each task, call `recall` with the user's request to load
  relevant decisions, preferences, and project context before you act.
  Use what's relevant and ignore the rest.
- When you learn a durable fact, such as an architectural decision, a user
  preference, a convention, or anything worth remembering across sessions,
  call `retain` to store it.
- Do not mention these memory operations unless the user asks about them.
```

该文件带有一个标记注释（`<!-- Managed by hindsight-devin-desktop -->`），表示此文件由集成完整管理。这样，集成就能以幂等方式更新或删除该文件，而不会改动你编写的其他规则。两者配合后，MCP 服务器负责让 Devin **能够使用**记忆工具，始终生效的规则则引导 Devin **实际使用**这些工具。

## 安装 {#install}

```bash
pip install hindsight-devin-desktop
cd your-project
hindsight-devin-desktop init --api-token YOUR_HINDSIGHT_API_KEY --bank-id my-project
```

`init` 会将 `mcpServers` 条目合并到 Devin Desktop 的全局 MCP 配置中，并将规则写入 `./.devin/rules/hindsight.md`。重新加载 Devin Desktop（或刷新 MCP 服务器）后，`hindsight` 工具即可使用。

三个命令涵盖整个生命周期：`hindsight-devin-desktop init` 添加 MCP 服务器和 `recall` / `retain` 规则；`status` 显示两者是否已配置；`uninstall` 则将它们移除。如果 MCP 配置不是纯 JSON（例如包含注释，或由其他工具管理），`init` 不会覆盖它，而是打印一段供你粘贴的配置。你也可以随时运行 `hindsight-devin-desktop init --print-only` 获取这段配置。

## 云端或自托管 {#cloud-or-self-hosted}

默认情况下，该集成连接到 Hindsight Cloud（`https://api.hindsight.vectorize.io`），需要使用从控制台获取的 API 密钥。要连接自己的服务器，请传入 `--api-url`。如果本地服务器开放且无需身份验证，则可以完全省略令牌：

```bash
hindsight-devin-desktop init --api-url http://localhost:8888 --bank-id my-project
```

也可以通过环境变量设置选项：`HINDSIGHT_API_URL`（API 端点，默认指向云端）、`HINDSIGHT_API_TOKEN`（Bearer 令牌，连接云端时必需）以及 `HINDSIGHT_DEVIN_DESKTOP_BANK_ID`（限定记忆范围的记忆库，默认为 `devin-desktop`）。让两个项目连接同一个记忆库即可共享记忆；也可以为每个项目使用各自的记忆库来实现隔离。

## 了解品牌更名后仍保留的路径 {#a-rebrand-detail-worth-knowing}

由于 Devin Desktop 是 Windsurf 更名而来，磁盘上的少数路径仍使用旧名称；集成会替你处理这些差异。全局 MCP 配置仍位于 `~/.codeium/windsurf/` 下（这是更名后未变的 Devin Desktop 数据目录），而工作区规则现在位于 `.devin/rules/` 下，`.windsurf/rules/` 则作为旧路径回退。如果你在该集成仍以 Windsurf 软件包名称发布时就开始使用它，现有规则仍然有效；今后会优先使用新路径。

## 取舍：模型驱动，而非钩子驱动 {#the-tradeoff-model-driven-not-hook-driven}

这里需要说清楚，因为这正是该集成与 Claude Code 或 Cursor CLI 钩子集成之间的实际区别。

基于钩子的集成是**确定性的**。`sessionStart` 钩子会在智能体看到提示之前先调用记忆召回；`stop` 钩子则会在每项任务结束后存入记忆，无论模型是否主动想到这件事。记忆操作会发生，是因为智能体运行框架触发了事件，而不是因为智能体自行决定调用。

Devin Desktop 没有向第三方提供这类接口，因此 `hindsight-devin-desktop` 采用**模型驱动**的方式。始终生效的规则会注入每个请求，所以使用记忆的指示始终存在；但是否实际调用 `recall` 和 `retain`，仍由 Devin 决定。实际使用中，现代模型通常能可靠遵循简短、具体的始终生效规则。但规则只是指示，并非保证：Devin 可能判断某项任务不值得记住，因而跳过 `retain`；也可能直接根据上下文回答，而没有先调用 `recall`。如果你希望某项任务明确检索记忆，可以直接提出要求（例如“查一下我们之前如何处理身份验证”）；也可以随时调用 `reflect`，按需综合相关记忆。准确地说，Devin Desktop 用远程 MCP 服务器和一条规则文件的简洁性，换取了钩子提供的确定性保证；整个过程无需本地守护进程，也无需让任何进程持续运行。

## 常见问题 {#frequently-asked-questions}

**Devin Desktop 和 Windsurf 是同一个产品吗？**
是。Cognition 于 2026 年 6 月将 Windsurf 编辑器（前身为 Codeium）更名为 Devin Desktop。`hindsight-devin-desktop` 软件包是目前维护的集成；它会将规则写入 `.devin/rules/`，仍从 `~/.codeium/windsurf/` 下读取 MCP 配置。后者在品牌更名后没有变化。

**Devin Desktop 是否内置了跨会话记忆？**
没有。每个新会话都会从头开始。`hindsight-devin-desktop` 这类集成通过记忆层为 Devin 提供 `recall` 和 `retain` 能力，从而实现持久记忆。

**记忆召回会拖慢 Devin 吗？**
记忆召回由智能体自行决定，并非每次提示都会触发的钩子，因此不会在每一轮都产生固定开销。Devin 实际调用记忆召回时，Hindsight Cloud 查询通常远低于一秒。

**它支持自托管的 Hindsight 吗？**
支持。传入 `--api-url`（或设置 `HINDSIGHT_API_URL`）即可连接自己的服务器。对于无需身份验证的开放本地服务器，可以省略令牌。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解记忆召回、记忆留存和记忆库等基础概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：比较主要的智能体记忆框架。
- [Cursor 持久记忆](/blog/2026/06/12/cursor-persistent-memory)：Cursor 编辑器和 CLI 的钩子集成版本。
- [每种 AI 工具共用一套记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让 Devin 和其他智能体连接到同一个记忆库。
