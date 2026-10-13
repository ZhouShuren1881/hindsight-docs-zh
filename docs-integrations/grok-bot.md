---
sidebar_position: 42
title: "Grok 机器人记忆Hindsight |整合"
description: "Grok机器人和Cursor的长期记忆。每个机器人都保留自己的 Hindsight 记忆库以及共享的记忆库，在例行运行之间携带状态，并读取其他 AI 工具写入的记忆库。"
---

# Grok 机器人 {#grok-bot}

的长期记忆 [Grok Bot](https://x.ai) 和Cursor，在您的机器人和其他机器人之间共享AI工具。

每个Grok机器人保留自己的对话和学习的上下文，因此一个机器人无法看到另一个机器人的工作成果，并且预定的例程从零开始每次运行。 [Hindsight](https://vectorize.io/hindsight) 为每个机器人提供自己的记忆库以及整个团队共享的记忆库，并让机器人读取您的其他智能体的记忆库（Claude Code，ChatGPT,Hermes,OpenClaw）已经写信给。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io/signup)。该插件与OAuth连接，所以没有API密钥可复制，无需配置。
:::

## 安装 {#install}

1. 在Grok机器人，选择**连接应用（Connect apps）**下方消息框打开**市场（Marketplace）**。搜索 **Hindsight**，打开它并选择**添加（Add）**。
2. Grok 机器人要求您连接Hindsight。登录Hindsight自身页面，选择授权机构。
3. 向任意 Bot 说“设置 Hindsight 记忆”。`memory-setup` 技能会检查连接并创建下述记忆库。请先为 Bot 命名，它的名称就是记忆库 ID；仍叫“Grok Bot”的 Bot 会要求你输入名称后再继续设置。

相同的插件适用于Cursor：从Cursor市场安装它。

## 记忆库 {#memory-banks}

|记忆库|持有|作者：|
|---|---|---|
|`grok-bot::<bot-name>`|机器人在自己的工作中学到了什么。名为“销售研究员”的机器人使用 `grok-bot::sales-researcher`。|那个机器人|
|`cursor::<project-name>`|Cursor 智能体在一个项目中学习什么，以打开的工作区文件夹命名。每当您将插件添加到 Grok Bot 中时，该插件都会安装到 Cursor 中。|Cursor智能体  该项目中的|
|`grok-bot::shared`|每个机器人都应该知道什么，机器人之间的切换，以及“关于用户”配置文件。|任何机器人|
|你的另一个记忆库|来自其他AI工具的记忆。|仅那些工具；机器人阅读它们|

插件连接到根[MCP 服务器](/developer/mcp-server)，`https://api.hindsight.vectorize.io/mcp`，到达您授权的组织中的每个记忆库。

## 工作原理 {#how-it-works}

在Grok Bot 中，插件的挂钩永远不会运行：Bot 安装插件的 MCP 服务器和技能，仅此而已。因此，这里的记忆是由技能驱动的，每个技能的描述都会告诉机器人何时使用它。

|技能|使用|
|---|---|
|`memory-setup`|连接，使用 进行验证 `list_banks`，创建记忆库和个人资料|
|`memory-context`|记忆召回 开始任何任务之前的相关记忆|
|`memory-retain`|任务完成时保存结果、决策和偏好|
|`memory-reflect`|用 回答有关历史和过去决策的问题 `reflect`|
|`routine-memory`|将记忆召回和记忆存储步骤写入它创建的每个例程中；在例程开始之前读取最后一次运行，并在例程结束时记录本次运行|
|`bot-handoff`|保留机器人之间传递的工作的持久记录，从未收到消息的机器人也可以接收这些记录|

技能永远不会召唤`delete_bank`，`clear_memories`，`invalidate_memory`，`delete_document`或`delete_mental_model`。如果应该删除某些内容，机器人会告诉您，您可以从Hindsight仪表板。

## 自托管Hindsight {#self-hosted-hindsight}

Grok Bot 需要可公开访问的 HTTPS MCP 端点，支持 OAuth 2.1 发现与动态客户端注册。将 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy) 放在实例前面，使用 [Meta Muse 集成文档](./meta-muse)中的预检工具检查（Grok Bot 的连接方式相同），然后修改插件 `mcp.json` 中的 `url`。

## 验证设置 {#verifying-setup}

询问机器人：

- “设置Hindsight记忆。” → `memory-setup` 列出您的记忆库并创建机器人自己的记忆库
- “您还记得我们的供应商候选名单吗？” → `memory-context` 回答前回忆
- “我们通常如何处理续订？” → `memory-reflect`

然后检查Hindsight仪表板：机器人的记忆库和 `grok-bot::shared` 应该出现，并带有标记为 的记忆 `source:grok-bot`。
