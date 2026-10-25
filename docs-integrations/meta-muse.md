---
sidebar_position: 41
title: "使用 Hindsight 的 Meta Muse 记忆 | 集成"
description: "将 Meta Muse 连接到其他 AI 工具写入的 Hindsight 记忆库。Muse 使用 OAuth 登录，拥有自己的记忆库，并通过 MCP 调用 Recall、Retain 和 Reflect。"
---

# Meta Muse {#meta-muse}

[查看更新日志 →](/changelog/integrations/meta-muse)

将其他 AI 工具中的记忆带入 [Meta Muse](https://muse.ai)，这是 Meta 的个人 AI 智能体。Muse 通过 MCP 连接到你的 [Hindsight](https://vectorize.io/hindsight) 记忆库。你告诉 Claude、ChatGPT、Claude Code、Hermes 或 OpenClaw 的内容也能在 Muse 中使用；你告诉 Muse 的内容也能供它们使用。

Muse 会获取你所有的记忆库，而不只是一个。它会保留自己的 `muse` 记忆库，用来记录你和它共同完成的事；当问题涉及其他记忆库时，它也会读取那些记忆库。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)。Hindsight Cloud 已支持 Muse 使用的 OAuth 登录，因此无需运行或配置任何内容。
:::

## 工作原理 {#how-it-works}

Muse 在 Meta 的云端运行，没有插件宿主，因此 Hindsight 无法接入它的提示词或对话记录。Muse 会将 Hindsight 的远程 MCP 服务器作为自定义连接器，并自行调用记忆工具：

| 工具 | Muse 调用时机 |
|---|---|
| `recall` | 处理与人物、项目、计划或偏好有关的任务之前 |
| `retain` | 你陈述事实、决定或偏好时，或完成值得记住的任务时 |
| `reflect` | 回答有关你过往经历或习惯的问题时 |
| `get_mental_model` | 在对话开始时读取“关于我”个人资料 |
| `list_banks`、`create_bank` | 了解现有记忆库，并在首次连接时创建自己的 `muse` 记忆库 |

由于 Muse 没有钩子，连接提示词还会要求 Muse 创建一个每晚运行的定时任务，存入当天对话的摘要。

## 设置 {#setup}

1. 在 [vectorize.io/hindsight](https://vectorize.io/hindsight/) 注册。
2. 打开 Muse，并粘贴[连接提示词](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/meta-muse/connect-prompt.md)。
3. Muse 会显示 Hindsight 的 **Connect** 按钮。点击该按钮，并在 Hindsight 登录页面批准访问。
4. Muse 会列出它能访问的记忆库，创建自己的 `muse` 记忆库、“关于我”心智模型和每晚运行的任务，并告诉你它发现的关于你的三件事。

:::note 第 4 步包含四项操作，而非一项
列出记忆库和创建 `muse` 记忆库无需付费；`recall` 和心智模型会产生费用。对于没有额度的账户，前两项会成功，后两项会失败，结果是留下一个空的 `muse` 记忆库，以及一个已启用且指向该库的每晚任务。Muse 会告诉你哪一步失败。充值后，请让它重试受阻的步骤，不要再次粘贴连接提示词。
:::

提示词使用根 URL `https://api.hindsight.vectorize.io/mcp`（端点、工具和认证选项请参阅 [MCP 服务器参考](/developer/mcp-server)），该 URL 可以访问你账户中的所有记忆库。这正是设计目的：Muse 将内容写入自己的记忆库，并在问题需要时读取其他记忆库。由于根 URL 也开放记忆库管理功能，提示词明确禁止使用 `delete_bank`、`clear_memories` 和 `invalidate_memory`。若要让 Muse 只能访问一个记忆库，可将其连接到 `/mcp/<bank>/`：该端点使用相同的 OAuth 登录方式，并会从每个工具中移除 `bank_id` 参数。

## 自托管 Hindsight {#self-hosted-hindsight}

Muse 需要一个可公开访问的 HTTPS 端点，并支持 OAuth 2.1 发现和动态客户端注册。在你的实例前部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)，然后使用[集成目录](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/meta-muse)中的预检工具检查端点：

```bash
uvx --from ./hindsight-integrations/meta-muse hindsight-muse-preflight https://memory.example.com/mcp
```

该工具会重放 Muse 的操作：未经身份验证时的 401 挑战、OAuth 元数据（注册端点、PKCE S256），以及在设置了 `HINDSIGHT_API_KEY` 时执行 MCP `initialize` 和 `tools/list`。

## 验证设置 {#verifying-setup}

在 Muse 中：

- "Which memory banks can you see?" → `list_banks`
- "What was I working on last week?" → 跨你的工作记忆库执行 `recall`
- "Remember that I prefer window seats." → 使用 `retain` 存入 `muse`
- "How do I usually plan trips?" → `reflect`

Muse 存入的内容随后也会出现在连接到同一账户的其他工具中。

---
