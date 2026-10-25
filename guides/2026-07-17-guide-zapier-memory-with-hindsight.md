---
title: "指南：借助 Hindsight 为 Zapier 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zapier, automation, memory]
description: "使用 Hindsight Zapier 应用为 Zapier 添加记忆，让你的 Zap 能够在 7,000 多个应用之间存入、召回和反思长期记忆。"
image: /img/guides/guide-zapier-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：借助 Hindsight 为 Zapier 添加记忆](/img/guides/guide-zapier-memory-with-hindsight.svg)

如果你想**借助 Hindsight 为 Zapier 添加记忆**，可以使用 Hindsight Zapier 应用。它提供三个操作：Retain（存入）、Recall（召回）和 Reflect（反思）；还提供即时触发器，可在记忆事件发生时启动 Zap。这样一来，Zap 就能拥有长期记忆，不再让每个自动化流程都彼此隔绝，上下文也可以在 Hindsight 与 Zapier 连接的数千个应用之间流转。

Zapier 很适合用于此场景，因为它已经连接了 Gmail、Slack、Sheets、HubSpot、Notion、表单等数千种应用。单独运行时，这些 Zap 不会记住两次运行之间发生的事情。加入 Hindsight 步骤后，你可以存入事件信息、在 AI 步骤前搜索以往记录、在 Zap 内获取有证据依据的答案，甚至在记忆操作完成时立即启动另一个 Zap。

本指南将介绍如何在 Zapier 中连接 Hindsight 帐户、使用 Retain（存入）、Recall（召回）和 Reflect（反思）操作、配置记忆事件触发器，以及通过快速验证流程确认记忆确实正在使用。操作时可同时查看[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 注册 [Hindsight Cloud](https://hindsight.vectorize.io)（或自行托管），并获取 API 密钥（`hsk_...`）。
> 2. 在 Zapier 中添加 Hindsight 步骤，并使用 API 密钥连接帐户。
> 3. 使用 **Retain（存入）** 操作，将内容存入记忆库。
> 4. 在 AI 步骤前，使用 **Recall（召回）** 或 **Reflect（反思）** 操作搜索该记忆库。
> 5. 验证后续运行的 Zap 能否取回较早运行时存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 一个 Zapier 帐户
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 一个从控制台获取的 Hindsight API 密钥（`hsk_...`）；只有在自托管实例无需身份认证时，才可以不提供密钥

## 第 1 步：获取 Hindsight API 密钥 {#step-1-get-a-hindsight-api-key}

注册 [Hindsight Cloud](https://hindsight.vectorize.io)（免费套餐），或[自行托管](/developer/installation)服务器。然后从 Hindsight 控制台获取 API 密钥（`hsk_...`）。

如果你自行托管且未启用身份认证，可以不使用密钥；连接时将密钥留空即可。

## 第 2 步：在 Zapier 中连接 Hindsight {#step-2-connect-hindsight-in-zapier}

在 Zapier 中添加 Hindsight 步骤并连接帐户。连接时需要填写两个字段：

- **API 密钥（API Key）**：你的 Hindsight 密钥（以 `hsk_` 开头），会作为 bearer token 发送。Hindsight Cloud 必须提供密钥；自托管实例若无需身份认证，则可留空。
- **API 地址（API URL）**：默认使用 Hindsight Cloud（`https://api.hindsight.vectorize.io`）。如果使用自托管实例，请填写你自己的地址（例如 `http://localhost:8888`）。

连接后，每个 Hindsight 步骤都会显示一个动态下拉列表形式的 **记忆库（Bank）** 字段。你可以选择已有记忆库，也可以输入新的记忆库 ID；记忆库会在首次使用时创建。

## 第 3 步：将内容存入记忆库 {#step-3-retain-content-into-a-bank}

**Retain（存入）** 操作会将内容存入记忆库。调用返回后，Hindsight 会异步提取事实。

| 字段 | 说明 |
| --- | --- |
| 记忆库（Bank） | 要存入内容的记忆库（动态下拉列表；首次使用时自动创建） |
| 内容（Content） | 要存入的自由文本 |
| 上下文（Context） | 内容的可选上下文 |
| 标签（Tags） | 以逗号分隔的标签 |
| 时间戳（Timestamp） | 内容中事件的发生时间（默认值为当前时间） |

一种常见用法是让触发器在某个事件完成时启动，例如工单关闭、表单提交或通话摘要生成，然后把事件文本交给 **Retain（存入）**，使其成为记忆库的一部分。

## 第 4 步：在 AI 步骤前使用 Recall 或 Reflect {#step-4-recall-or-reflect-before-an-ai-step}

要取回上下文，可以使用以下两个搜索操作之一。

**Recall（召回）** 会在记忆库中搜索与查询相关的记忆，并返回匹配项：

| 字段 | 说明 |
| --- | --- |
| 记忆库（Bank） | 要搜索的记忆库 |
| 查询（Query） | 自然语言查询 |
| 预算（Budget） | `low` / `mid` / `high` |
| 标签 / 标签匹配（Tags / Tags Match） | 可选的标签筛选条件 |

**Reflect（反思）** 会基于记忆库中的记忆，返回一个由 LLM 综合生成的答案：

| 字段 | 说明 |
| --- | --- |
| 记忆库（Bank） | 记忆库 |
| 查询（Query） | 要回答的问题 |
| 预算（Budget） | `low` / `mid` / `high` |

在 AI 步骤前放置 **Recall（召回）** 步骤，让模型看到以往记录；如果你希望在 Zap 内直接获得基于记忆且有依据的现成答案，则可以使用 **Reflect（反思）**。如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 第 5 步：根据记忆事件触发 Zap {#step-5-trigger-zaps-from-memory-events}

除了操作之外，Hindsight 应用还提供即时触发器（REST Hooks）。当记忆库中的记忆事件完成时，这些触发器会启动：

| 触发器 | 触发时机 |
| --- | --- |
| **Retain Completed（存入完成）** | 异步存入流程完成处理时 |
| **Consolidation Completed（整合完成）** | 记忆整合生成观测 / 心智模型时 |
| **Memory Defense Triggered（记忆防护已触发）** | 记忆防护筛选器脱敏或阻止传入内容时 |

这些触发器可以在记忆处理完成时启动 Zap。例如，你可以格式化 **Consolidation Completed（整合完成）** 触发器提供的新观测，再将其发布到 Slack，让团队了解智能体学到了什么。

## 你将获得什么 {#what-you-get}

这些功能结合起来，让记忆成为自动化流程的重要组成部分：

- 使用 **Retain（存入）**，将每张已关闭的工单、每次表单提交或每份通话摘要存入记忆库
- 在 AI 步骤前使用 **Recall（召回）** 获取相关上下文，让模型看到以往记录
- 使用 **Reflect（反思）**，直接在 Zap 内获取综合生成且以记忆为依据的答案
- 在记忆操作完成时触发 Zap

由于操作和触发器共用 **记忆库（Bank）** 字段，所有读取或写入同一记忆库的步骤都会访问同一份记忆。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 创建一个 Zap，并添加 **Retain（存入）** 步骤，将一条有明显特征的内容存入测试记忆库。
2. 运行 Zap，存入该内容。
3. 创建第二个 Zap，并添加指向同一记忆库的 **Recall（召回）**（或 **Reflect（反思）**）步骤。
4. 查询刚才存入的内容。
5. 确认返回结果能找出第一个 Zap 存入的内容。

例如，存入一条备注，说明某位客户更喜欢通过电子邮件而非电话联系；之后在另一个 Zap 中查询 "how does this customer prefer to be contacted?"。如果召回的记忆中出现了先前存入的备注，就说明设置正常。

## 常见错误 {#common-mistakes}

### 存入和召回时使用了不同的记忆库 {#using-different-banks-for-retain-and-recall}

Retain 和 Recall 必须指向同一个 **记忆库（Bank）**，才能访问相同的记忆。如果输入的记忆库 ID 稍有不同，Recall 所在的 Zap 就会查不到内容。

### 太早测试 Recall {#testing-recall-too-early}

调用返回后，Retain 会异步提取事实。如果立即检查 Recall，内容可能尚未处理完毕。请等待 Retain 完成，或通过 **Retain Completed（存入完成）** 触发器启动后续流程。

### 自托管实例仍使用 Cloud API 地址 {#leaving-the-api-url-on-cloud-for-a-self-hosted-instance}

API URL 默认指向 Hindsight Cloud。如果使用自托管实例，请将 URL 指向自己的实例；只有在该实例无需身份认证时，才将 API Key 留空。

### 期望完全隔离网络的实例能够触发事件 {#expecting-triggers-on-a-fully-air-gapped-instance}

触发器依赖 Hindsight 实例向 Zapier 的 webhook URL 发送出站 POST 请求。任何可以访问外部互联网的实例都能发送触发事件；完全隔离网络的实例则无法投递这些事件。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：将连接中的 **API 地址（API URL）** 指向你的实例；如果实例无需身份认证，就将 **API 密钥（API Key）** 留空。

### 可以将记忆连接到哪些应用？ {#which-apps-can-i-connect-memory-to}

Zapier 支持的任何应用都可以。Hindsight 步骤是普通的 Zapier 操作和触发器，可以与 Zapier 生态系统中的数千种应用组合使用。

### Recall 和 Reflect 有什么区别？ {#what-is-the-difference-between-recall-and-reflect}

**Recall（召回）** 返回与查询匹配的记忆。**Reflect（反思）** 会基于记忆库中的记忆，返回一个由 LLM 综合生成的答案。使用 Recall 可将上下文提供给你自己的 AI 步骤；如果你想直接获得基于记忆且有依据的现成答案，则使用 Reflect。

### 记忆按什么范围隔离？ {#how-is-memory-scoped}

记忆按记忆库划分。每个操作和触发器中的 **记忆库（Bank）** 字段都会选择要读取或写入的记忆库；记忆库会在首次使用时创建。

## 后续步骤 {#next-steps}

- 如果你需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](/)
- 查看[快速入门指南](/developer/api/quickstart)
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [Zapier 集成文档](/sdks/integrations/zapier)
