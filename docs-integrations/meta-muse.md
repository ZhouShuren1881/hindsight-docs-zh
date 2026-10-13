---
sidebar_position: 41
title: "Meta Muse 与 Hindsight 记忆 |整合"
description: "将Meta Muse连接到其他AI工具写入的Hindsight记忆库。 Muse 使用 OAuth 登录，保留自己的记忆库，并通过 MCP 调用记忆召回、记忆存储和回忆。"
---

# Meta Muse {#meta-muse}

带上你其他人的记忆AI工具进入[Meta Muse](https://muse.ai)，Meta 个人AI智能体。 Muse 连接到您的 [Hindsight](https://vectorize.io/hindsight) 记忆库结束MCP。你告诉的Claude,ChatGPT,Claude Code，Hermes或OpenClaw在 Muse 中可用，并且您告诉 Muse 的内容对他们也可用。

Muse 获取您所有的记忆库，而不是一个。它保留了自己的`muse` 记忆库，用于记录您和它一起做什么，并在遇到问题时读取您的其他记忆库。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)。HindsightCloud 已经支持 Muse 使用的 OAuth 登录，因此无需运行或配置任何内容。
:::

## 工作原理 {#how-it-works}

Muse 在 Meta 的云中运行，没有插件主机，因此 Hindsight 无法连接到其提示或记录。 Muse 作为自定义连接器连接到 Hindsight 的远程 MCP 服务器并调用记忆工具本身：

|工具|当缪斯召唤它时|
|---|---|
|`recall`|在有关人员、项目、计划或偏好的任务之前|
|`retain`|当你陈述一个事实、决定或偏好，或完成一项值得记住的任务时|
|`reflect`|有关您的历史或习惯的问题|
|`get_mental_model`|在对话开始时阅读“关于我”个人资料|
|`list_banks`，`create_bank`|了解存在哪个记忆库并创建自己的`muse` 首次连接时的记忆库|

因为 Muse 没有钩子，所以连接提示还要求 Muse 创建一个夜间计划任务，以保留当天对话的摘要。

## 设置 {#setup}

1. 注册[vectorize.io/hindsight](https://vectorize.io/hindsight/)。
2. 打开Muse并粘贴[连接提示](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/meta-muse/connect-prompt.md)。
3. 缪斯展示了**连接（Connect）** 按钮Hindsight。单击它并批准访问Hindsight的登录页面。
4. Muse 列出它可以看到的记忆库，创建自己的`muse`记忆库加上“关于我”心智模型和夜间任务，并告诉你它发现的关于你的三件事。

:::note 步骤 4 是四次操作，而不是一次
列出记忆库并创建`muse`记忆库免费； `recall`和心智模型开票了。在没有积分的帐户上，前两个成功，后两个失败，留下一个空的 `muse`记忆库和一项实时夜间任务指向它。 Muse 会告诉你哪一步失败了。充值，然后要求它重试被阻止的步骤，而不是再次粘贴连接提示。
:::

提示使用根URL，`https://api.hindsight.vectorize.io/mcp`（参见[MCP 服务器参考](/developer/mcp-server) 用于端点、其工具及其身份验证选项），它到达您帐户中的每个记忆库。这就是要点：Muse 写入自己的记忆库，并在有问题需要时读取其他记忆库。因为根URL也暴露了记忆库管理，所以提示禁止`delete_bank`，`clear_memories` 和 `invalidate_memory`。要向 Muse 提供一个记忆库，请将其连接到 `/mcp/<bank>/`：该端点采用相同的 OAuth 登录并删除 `bank_id` 每个工具的论证。

## 自托管Hindsight {#self-hosted-hindsight}

Muse 需要一个具有 OAuth 2.1 发现和动态客户端注册功能的公共 HTTPS 端点。把[`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy) 在实例前面，然后使用 中的预检工具检查端点 [集成目录](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/meta-muse)：

```bash
uvx --from ./hindsight-integrations/meta-muse hindsight-muse-preflight https://memory.example.com/mcp
```

它重演了 Muse 所做的事情：未经身份验证的 401 质询、OAuth 元数据（注册端点、PKCES256），并且，与 `HINDSIGHT_API_KEY`套装，MCP`initialize` 和 `tools/list`。

## 验证设置 {#verifying-setup}

缪斯：

- “你能看到哪个记忆库？” → `list_banks`
- “上周我在做什么？” → `recall` 贯穿你的工作记忆库
- “记住我更喜欢靠窗的座位。” → `retain` 进入`muse`
- “我通常如何计划旅行？” → `reflect`

Muse 保留的内容随后会显示在连接到同一帐户的其他工具中。
