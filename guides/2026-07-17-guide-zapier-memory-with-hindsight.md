---
title: "指南：用Hindsight添加Zapier记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zapier, automation, memory]
description: "使用 Hindsight Zapier 应用程序将 Zapier 记忆与 Hindsight 添加，这样您的 Zaps 就可以在 7,000 多个应用程序中进行记忆存储、记忆召回和长期记忆展望。"
image: /img/guides/guide-zapier-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Zapier 添加记忆](/img/guides/guide-zapier-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 Zapier 添加记忆**，使用 Hindsight Zapier 应用。它提供存储、召回和反思三个操作，以及记忆事件触发时启动 Zap 的即时触发器，让自动化拥有长期记忆，支持 Hindsight 与 Zapier 连接的数千应用之间传递上下文。

这非常适合 Zapier，因为 Zapier 已经将 Gmail、Slack、Sheets、HubSpot、Notion、表单以及数千种其他内容连接在一起。那些 Zap 自己会忘记跑步之间的一切。通过 Hindsight 步骤，您可以存储发生的情况，在 AI 步骤之前搜索先前的历史记录，在 Zap 内获得可靠的答案，甚至在记忆操作完成时启动新的 Zap。

本指南将引导您连接Hindsight帐号在Zapier，使用记忆存储、记忆召回和反思动作，连接记忆事件触发器，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1.报名[Hindsight Cloud](https://hindsight.vectorize.io)（或自托管）并获得API键（`hsk_...`）。
> 2.在Zapier中，添加Hindsight步骤并将您的帐户与API密钥连接。
> 3.使用**记忆存储** 将内容存储在记忆库中的操作。
> 4.使用**记忆召回**或**反思** 搜索记忆库之前的动作AI步骤。
> 5.验证较晚的 Zap 是否显示较早的 Zap 存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- A Zapier 账户
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- AHindsightAPI键（`hsk_...`) — 仅对于无需身份验证运行的自托管实例可选

## 第1步：获取HindsightAPI密钥 {#step-1-get-a-hindsight-api-key}

注册[Hindsight Cloud](https://hindsight.vectorize.io)（免费套餐）或[自托管](/) 服务器。然后抓住一个API键（`hsk_...`）来自Hindsight仪表板。

如果您自行托管并在没有身份验证的情况下运行，则可以跳过密钥 - 可以使用空白密钥进行连接。

## 第2步：将Hindsight连接到Zapier {#step-2-connect-hindsight-in-zapier}

在Zapier中，添加Hindsight步骤并连接您的帐户。该连接需要两个字段：

- **API 密钥（API Key）** — 你的Hindsight键（以开头 `hsk_`），作为不记名令牌发送。需要用于Hindsight Cloud；对于无需身份验证运行的自托管实例，请将其留空。
- **API 地址（API URL）** — 默认为Hindsight Cloud(`https://api.hindsight.vectorize.io`）。将其指向您自己的自托管实例（例如 `http://localhost:8888`）。

一旦连接，每个Hindsight步骤暴露了 **记忆库** 字段作为动态下拉列表。您可以选择现有的记忆库或输入新的记忆库 ID — 记忆库是在首次使用时创建的。

## 第3步：将记忆存储内容放入记忆库 {#step-3-retain-content-into-a-bank}

**记忆存储** 动作将内容存储在记忆库中。Hindsight在调用返回后异步提取事实。

|场|说明|
| --------- | --------------------------------------------------------------------- |
|记忆库|记忆 存储库（动态下拉列表；首次使用时自动创建）|
|内容|免费文本到记忆存储|
|上下文|内容的可选上下文|
|标签|逗号分隔的标签|
|时间戳|内容发生的时间（默认为现在）|

一个典型的用途是在某些已完成的事件上触发的触发器 - 已关闭的票证、表单提交、通话摘要 - 将其文本输入到 **记忆存储**，因此它成为记忆库的一部分。

## 第 4 步：AI 步骤之前的记忆召回或遗憾 {#step-4-recall-or-reflect-before-an-ai-step}

要拉回上下文，请使用两个搜索操作之一。

**记忆召回** 在记忆库中搜索与查询相关的记忆并返回匹配项：

|场|说明|
| ----------------- | ---------------------- |
|记忆库|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high`|
|标签/标签匹配|可选标签过滤器|

**反思** 返回单个LLM-基于记忆库记忆的综合答案：

|领域|说明|
| ------ | ---------------------- |
|记忆库|记忆库|
|查询|要回答的问题|
|预算|`low` / `mid` / `high`|

放置一个**记忆召回** 前一步AI步骤让模型看到之前的历史记录，或者使用 **反思** 当您想要在 Zap 中找到现成的接地答案时。对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 第 5 步：从记忆事件中触发 Zap {#step-5-trigger-zaps-from-memory-events}

除了操作之外，Hindsight应用程序还提供即时触发器（REST钩子），当记忆库中的记忆事件完成时触发：

|触发器|触发时|
| ---------------------------- | ------------------------------------------------------------- |
|**存储完成（Retain Completed）**|异步记忆存储完成处理|
|**整合完成（Consolidation Completed）**|记忆整合综合观察/心智模型|
|**记忆防护触发（Memory Defense Triggered）**|记忆防御过滤器会编辑或阻止传入内容|

这些让您可以在记忆工作完成时启动 Zap - 例如，格式化来自 的新观察 **整合完成（Consolidation Completed）** 触发并将它们发布到 Slack，以便团队看到智能体学到了什么。

## 你得到什么 {#what-you-get}

这些部分一起使记忆成为自动化的一流部分：

- **记忆存储** 将每张已关闭的工单、表格提交或通话摘要存入记忆库
- **记忆召回** 之前的相关上下文AI步骤让模型看到之前的历史
- **反思** 在 Zap 中获得综合的、基于记忆的答案
- **触发器（Trigger）** 记忆操作完成时按下 Zap

因为**记忆库**字段在操作和触发器之间共享，读取和写入相同记忆库的所有内容都来自相同的记忆。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 使用 构建 Zap **记忆存储** 将独特的内容存储到测试记忆库中的步骤
2. 运行 Zap 以保留内容
3. 用 构建第二个 Zap **记忆召回**（或**反思**)步骤指向同一个记忆库
4. 查询之前的内容
5. 确认调用的结果显示第一个Zap存储的内容

例如，记忆存储表明特定客户更喜欢电子邮件而不是电话，然后在稍后的 Zap 记忆召回中“该客户更喜欢如何联系？”如果调用的记忆显示了较早的音符，则该设置正在工作。

## 常见错误 {#common-mistakes}

### 使用不同的记忆库进行记忆存储和记忆召回 {#using-different-banks-for-retain-and-recall}

记忆存储和记忆召回必须指向同一个**记忆库**看到同样的回忆。如果您输入的记忆库 ID 略有不同，记忆召回 Zap 将看起来为空。

### 太早测试记忆能力 {#testing-recall-too-early}

记忆存储在调用返回后异步提取事实。如果您立即检查记忆召回，内容可能尚未完全处理 - 等待记忆存储完成，或触发**存储完成（Retain Completed）**。

### 将 API URL 留在云端以用于自托管实例 {#leaving-the-api-url-on-cloud-for-a-self-hosted-instance}

API URL 默认为Hindsight Cloud。如果您自行托管，请将 URL 指向您自己的实例，并仅当该实例在未经身份验证的情况下运行时将 API 键留空。

### 期望在完全气隙实例上触发 {#expecting-triggers-on-a-fully-air-gapped-instance}

触发器依赖于您的 Hindsight 实例向 Zapier 的 webhook URL 发出出站 POST。任何具有出站互联网的实例都可以工作；完全气隙的无法传递触发事件。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 指向连接的 **API 地址（API URL）** 根据您的情况，然后保留 如果未经授权运行， **API 密钥（API Key）** 为空白。

### 我可以将记忆连接到哪些应用程序？ {#which-apps-can-i-connect-memory-to}

任何应用程序Zapier支持。由于Hindsight步骤是普通的Zapier操作和触发器，因此它们与Zapier生态系统中的数千个应用程序组成。

### 记忆召回和回忆有什么区别？ {#what-is-the-difference-between-recall-and-reflect}

**记忆召回** 返回与您的查询匹配的记忆。 **反思** 返回单个LLM-基于记忆库记忆的综合答案。使用记忆将上下文输入到你自己的上下文中AI步骤；当你想要一个现成的、有根据的答案时，请使用“推测”。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

每个记忆库。这 **记忆库**字段都会选择您读取或写入的记忆库，并且记忆库是在首次使用时创建的。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Zapier 集成文档](/sdks/integrations/zapier)
