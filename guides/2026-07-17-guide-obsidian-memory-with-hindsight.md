---
title: "指南：用Hindsight添加Obsidian记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, obsidian, knowledge, memory]
description: "将Obsidian记忆与Hindsight同步，将你的金库同步到记忆库中，并与基于你的笔记的智能体聊天，每个答案都引用它来自的笔记。"
image: /img/guides/guide-obsidian-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Obsidian 添加记忆](/img/guides/guide-obsidian-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Obsidian 添加记忆**，使用 Obsidian 的 Hindsight 插件。它将笔记库同步到 Hindsight 记忆库，并添加聊天面板，基于笔记回答且引用来源。智能体由此真正理解笔记库，能够跨笔记推理，并随笔记库增长持续综合知识，而非仅进行纯文本搜索。

这非常适合Obsidian，因为你的知识已经存在于其中。同步是单向的，Obsidian → Hindsight，因此您的保管库保持规范。每个答案都会引用它来自的注释，以便您可以从源头修复问题，并且默认情况下不会存储聊天对话。编辑一条注释，Hindsight 会在下一次同步时重新收敛 — Hindsight 永远不会成为第二个事实来源。

本指南逐步安装插件，将其指向您的Hindsight后端，了解保管库同步和范围界定的工作原理，以及快速验证流程，以便您可以确认聊天是否基于您的笔记。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1.通过安装插件 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 来自仓库 `vectorize-io/hindsight-obsidian`，然后在下启用它 **设置 → 社区插件（Settings → Community plugins）**。
> 2.打开**设置 → Hindsight（Settings → Hindsight）** 并设置 **API 地址（API URL）** 和 **API 密钥**（云），或指向API自托管服务器上的 URL。
> 3.运行**立即同步笔记库（Sync vault now）** 将您的笔记摄取为Hindsight文件。
> 4.打开聊天面板并提出问题 - 答案是有根据的，并带有引用。
> 5.验证答案是否引用了事实实际存在的注释。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Obsidian 与现有保管库一起安装
- [BRAT](https://github.com/TfTHacker/obsidian42-brat)可安装测试版插件
- 可达Hindsight后端，[Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管服务器

## 第一步：安装插件 {#step-1-install-the-plugin}

当插件处于测试阶段时，请通过 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)。添加存储库[`vectorize-io/hindsight-obsidian`](https://github.com/vectorize-io/hindsight-obsidian) — BRAT 安装的专用插件存储库 — 然后在 下启用它 **设置 → 社区插件（Settings → Community plugins）**。

如果您更喜欢自行托管Hindsight而不是使用云，请运行本地服务器：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

## 第2步：将插件指向Hindsight {#step-2-point-the-plugin-at-hindsight}

打开**设置 → Hindsight（Settings → Hindsight）**并配置连接：

|设置|默认|说明|
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
|API 网址|`https://api.hindsight.vectorize.io`|Hindsight服务器（使用`http://localhost:8888` 自托管）|
|API 键|—|Hindsight Cloud API 键|
|记忆库名称|`obsidian`|所有库的共享记忆库（用 分隔） `vault:`标签）|
|包含/排除文件夹|—|限制同步笔记|
|编辑时同步|开启|编辑时自动重新提取笔记|
|默认聊天深度|低|期待聊天答案的预算|
|记住对话|**off**|启用后，聊天回合存储在Hindsight中（在您的保管库之外创建记忆）|

对于Hindsight Cloud，离开API默认 URL 并粘贴您的API键。对于自托管服务器，设置API的网址 `http://localhost:8888`（或服务器运行的任何地方）。

## 第 3 步：同步您的保管库 {#step-3-sync-your-vault}

运行**立即同步笔记库（Sync vault now）** 命令进行完全协调 - 它摄取更改的注释并修剪删除的注释。另外两个命令可用：

- **立即同步笔记库（Sync vault now）** — 完全协调（摄取更改的音符，修剪删除的音符）。
- **摄取当前笔记（Ingest current note）** — 强制同步活动音符。
- **打开聊天（Open chat）** — 打开接地聊天面板。

与**编辑时同步（Sync on edit）** 保持打开状态，笔记会在您编辑时自动重新摄取，因此您很少需要手动同步。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

该插件在Obsidian暴露的两个点上工作：你的笔记和聊天面板。

- **同步（笔记库 → Hindsight）：** 每个音符都成为Hindsight文件。编辑更新插入，删除删除，内容哈希意味着跳过未更改的注释。内容哈希的笔记路径的本地索引意味着只有更改的笔记才会被重新摄取。
- **基于记忆库的聊天：** 侧面板通过反思来回答你的笔记中的问题，带有可折叠的引文，你可以点击打开源笔记，以及显示每个步骤查询的内容的推理披露。

因为同步是单向的，所以您的保管库仍然是事实的来源。每个答案都会引用其源注释，以便您从源头修复问题，默认情况下不会存储聊天对话 - 编辑注释，Hindsight 会在下一次同步时重新收敛。

对于较低级别的行为，请阅读[Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 隐式范围 {#implicit-scoping}

每个笔记都会在摄取时自动标记其 **笔记库**，**文件夹**（和子文件夹）和**创建/更新时间**。你永远不会考虑范围，直到你记忆再现——然后通过任何组合进行过滤Hindsight的`tag_groups`。多个金库共享一个记忆库并通过其 保持分离 `vault:`标签。 来自 UI 或 **金库** 调用的

记忆召回和惊奇，来自 UI 或API调用，可以按以下任意组合进行过滤：

|尺寸|标签|
| -------------------- | ------------------------------------ |
|避难所|`vault:<name>`|
|文件夹（+祖先）|`folder:Work`，`folder:Work/Clients`|
|日期|`created:2026-03`，`updated:2026-06`|

你自己的主题`tags` 和 `aliases`也进行了。由于聊天面板和外部自动化使用相同的标签访问相同的记忆库，因此它们会看到相同的范围视图。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 奔跑**立即同步笔记库（Sync vault now）**这样你的笔记就被吸收了
2. 打开聊天面板
3. 提出一个问题，其答案位于特定的注释中
4. 检查答案是否可靠并列出它使用的注释
5. 单击引文以确认它打开正确的源注释

例如：

- 询问你的笔记中记录的决定或约定
- 确认引用的注释是实际包含它的注释

如果答案表明了事实并引用了正确的注释，则该设置正在起作用。

## 常见错误 {#common-mistakes}

### 期待双向同步 {#expecting-a-two-way-sync}

同步是单向的，Obsidian → Hindsight。您的保管库是规范的，因此请通过编辑注释来修复问题，而不是在 Hindsight 中。

### 聊天前不同步 {#not-syncing-before-you-chat}

聊天面板回答所摄取的内容。运行**立即同步笔记库（Sync vault now）**（或离开**编辑时同步（Sync on edit）** on），这样记忆库就会反映您当前的笔记。

### 默认情况下期望存储的对话 {#expecting-stored-conversations-by-default}

**记住对话（Remember conversations）** 默认关闭。仅当您希望将聊天次数存储在中时才打开它Hindsight— 在你的金库之外创造记忆。

### 假设金库是隔离的 记忆库 {#assuming-vaults-are-isolated-banks}

默认情况下，多个保管库共享一个记忆库，并按其保持分离 `vault:`标签。按 筛选 `vault:<name>` 当您想要单个金库视图时。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 使用 安装 `pip install hindsight-all`，跑`hindsight-api`，然后指向插件的API其 URL（例如 `http://localhost:8888`）。

### Hindsight会成为我笔记的第二份副本吗？ {#does-hindsight-become-a-second-copy-of-my-notes}

没有。同步是单向的，您的保管库始终是事实的来源。每个答案都会引用其注释，以便您从源头修复问题，并且 Hindsight 在下一次同步时重新收敛。

### 我的保管库范围如何？ {#how-is-my-vault-scoped}

​​每个笔记都会自动标记其保管库、文件夹（和祖先）和 created/updated 日期，因此您可以通过任意组合过滤记忆召回和反思。

### 我的聊天对话是否已存储？ {#are-my-chat-conversations-stored}

默认情况下不是。 除非您将其打开，否则 **记住对话（Remember conversations）**将处于关闭状态。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Obsidian 集成文档](/sdks/integrations/obsidian)
