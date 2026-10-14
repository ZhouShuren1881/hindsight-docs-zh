---
sidebar_position: 42
title: "使用 Hindsight 为 Grok Bot 提供记忆 | 集成"
description: "为 Grok Bot 和 Cursor 提供长期记忆。每个 Bot 都有自己的 Hindsight 记忆库和一个共享记忆库，可在例行运行之间延续状态，并读取其他 AI 工具写入的记忆库。"
---

# Grok Bot {#grok-bot}

[Grok Bot](https://x.ai) 和 Cursor 的长期记忆，可在你的多个 Bot 与其他 AI 工具之间共享。

每个 Grok Bot 都会保留自己的对话和习得的上下文，因此一个 Bot 无法看到另一个 Bot 得出的结论，而且定时例行任务每次运行时都会从头开始。[Hindsight](https://vectorize.io/hindsight) 为每个 Bot 提供独立的记忆库，并为整个团队提供一个共享记忆库；Bot 还可以读取其他智能体（Claude Code、ChatGPT、Hermes、OpenClaw）已经写入的记忆库。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io/signup)。该插件通过 OAuth 连接，无需复制 API 密钥，也无需进行任何配置。
:::

## 安装 {#install}

1. 在 Grok Bot 中，选择消息框下方的 **Connect apps**，打开 **Marketplace**。搜索 **Hindsight**，打开后选择 **Add**。
2. Grok Bot 会提示你连接 Hindsight。请在 Hindsight 自己的页面登录，并选择要授权的组织。
3. 让任意 Bot“设置 Hindsight 记忆”。`memory-setup` 技能会检查连接并创建下方列出的记忆库。请先为 Bot 命名：它的名称会成为记忆库 ID，因此名称仍为“Grok Bot”的 Bot 会先要求你提供名称，然后才继续设置。

同一插件也适用于 Cursor：从 Cursor Marketplace 安装即可。

## 记忆库 {#memory-banks}

| 记忆库 | 存储内容 | 写入方 |
|---|---|---|
| `grok-bot::<bot-name>` | 某个 Bot 在自己的工作中学到的内容。名为“Sales Researcher”的 Bot 使用 `grok-bot::sales-researcher`。 | 该 Bot |
| `cursor::<project-name>` | Cursor 智能体在某个项目中学到的内容，记忆库以当前打开的工作区文件夹命名。在 Grok Bot 中添加插件时，该插件也会安装到 Cursor 中。 | 该项目中的 Cursor 智能体 |
| `grok-bot::shared` | 所有 Bot 都应了解的信息、Bot 之间的交接内容，以及“About the user”用户资料。 | 任意 Bot |
| 你的其他记忆库 | 其他 AI 工具中的记忆。 | 仅由相应工具写入；Bot 可以读取 |

该插件连接到根级 [MCP 服务器](/developer/mcp-server) `https://api.hindsight.vectorize.io/mcp`，并可访问你授权组织中的所有记忆库。

## 工作原理 {#how-it-works}

在 Grok Bot 中，插件的钩子不会运行：Bot 只会安装插件的 MCP 服务器和技能。因此，这里的记忆由技能驱动，每项技能的说明都会告诉 Bot 何时使用它。

| 技能 | 用途 |
|---|---|
| `memory-setup` | 建立连接，使用 `list_banks` 验证连接，并创建记忆库和用户资料 |
| `memory-context` | 在开始任何任务前召回相关记忆 |
| `memory-retain` | 在任务结束时保存结果、决策和偏好 |
| `memory-reflect` | 使用 `reflect` 回答有关历史记录和过往决策的问题 |
| `routine-memory` | 将召回和存入记忆的步骤写入它创建的每项例行任务；在任务开始前读取上次运行记录，并在任务结束时记录本次运行 |
| `bot-handoff` | 为 Bot 之间交接的工作留下持久记录；即使某些 Bot 从未收到消息，也可以读取这些记录 |

这些技能绝不会调用 `delete_bank`、`clear_memories`、`invalidate_memory`、`delete_document` 或 `delete_mental_model`。如果需要删除内容，Bot 会告知你，由你在 Hindsight 控制台中执行删除。

## 自托管 Hindsight {#self-hosted-hindsight}

Grok Bot 需要一个可从公网访问的 HTTPS MCP 端点，并支持 OAuth 2.1 发现和动态客户端注册。请在你的实例前部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)，然后使用 [Meta Muse 集成](./meta-muse)中的预检工具检查配置（Grok Bot 使用相同的连接方式），最后修改插件 `mcp.json` 中的 `url`。

## 验证设置 {#verifying-setup}

向 Bot 提出以下请求：

- “Set up Hindsight memory.” → `memory-setup` 会列出你的记忆库，并创建该 Bot 自己的记忆库。
- “What do you remember about our vendor shortlist?” → `memory-context` 会在回答前召回相关记忆。
- “How do we usually handle renewals?” → `memory-reflect` 会回答。

然后检查 Hindsight 控制台：你应该能看到该 Bot 的记忆库和 `grok-bot::shared`，其中的记忆带有 `source:grok-bot` 标签。
