---
title: "Zapier 持久记忆：动作和触发器"
authors: [benfrank241]
slug: "2026/06/25/zapier-persistent-memory"
date: 2026-06-25T13:00
tags: [hindsight, zapier, integration, memory, agents, workflows, no-code, tutorial]
description: "Zapier的Hindsight应用程序为任何Zap添加持久记忆：记忆存储、记忆召回和梦想动作，以及从记忆事件启动Zap的触发器。"
image: /img/blog/zapier-persistent-memory.webp
hide_table_of_contents: true
---

![Zapier 持久记忆Hindsight](/img/blog/zapier-persistent-memory.webp)

[Zapier](https://zapier.com) 连接大多数团队已经运行的数千个应用程序（按 Zapier 计算超过 8,000 个）：Slack、Gmail、HubSpot、Notion、Sheets、Airtable、OpenAI。您将它们连接到 Zaps 中，一个应用程序中的触发器会引发其他应用程序中的操作。 Zap 所携带的就是记忆。每次运行都从零开始，因此今天早上对支持票证进行分类的工作流程并不知道它昨天运行过，并且 Zap 中间的 LLM 步骤只知道您在该提示中填充的内容。

Zapier 的Hindsight 应用程序缩小了这一差距，并且它是双向的。 Hindsight 显示为 **三个动作**，您的 Zaps 可以调用（记忆存储、记忆感知、反思）和 **三个触发器**，当您的 [智能体记忆](https://vectorize.io/what-is-agent-memory) 中发生某事时启动 Zap。 记忆既成为自动化使用的工具，又成为引发自动化的事件源。

<!-- truncate -->

## 概览 {#tldr}

- HindsightZapier应用程序使任何Zap可以跨[Hindsight Cloud](https://ui.hindsight.vectorize.io)或自托管实例访问持久记忆。
- **三个动作：** 记忆存储（存储内容）、记忆召回（搜索记忆库）、回忆（LLM合成的、基于记忆的答案）。
- **三个触发器**（即时，通过 REST Hooks）：记忆存储已完成，整合已完成，记忆防御已触发。这些让记忆事件*开始* Zap。他们使用 Hindsight 的 webhook API，可在自托管实例和 Hindsight Cloud 企业计划上使用；默认情况下，它在云上未启用。这三个行动适用于任何计划。
- 记忆库字段是一个动态下拉菜单；输入一个新的记忆库 ID，它会在第一次使用时创建。
- API-密钥身份验证（`hsk_...`作为承载令牌）；将密钥留空以指向打开的自托管实例。

---

## 为什么Zapier Zap 需要持久的记忆 {#why-zapier-zaps-need-persistent-memory}

Zap 在设计上是无状态的。触发器触发，数据流经几个操作步骤，运行结束，并且任何内容都不会保留到下一次运行。这正是您想要的“新 Stripe 费用 → 在表格中添加一行”。对于人们越来越多地在 Zapier 中构建的工作流程来说，这是一个真正的限制：

- **面向客户的 Zap** 应该在整个运行过程中始终如一地对待同一个人，而不是每次都重新介绍自己。
- **AI 步骤**（Zap 中间的 OpenAI 或 Anthropic 操作）与相关的先前上下文相比，使用单个手写提示要好得多。
- **运营管道**，其中每次运行都可以被之前的每次运行通知。

如果没有记忆，Zap 中的LLM 步骤只知道您在该提示中塞入的内容。通过记忆，它可以对与当前输入相关的内容进行记忆，并在之前的每次运行中建立起来。这就是重复的 Zap 和复合的工作流程之间的区别。

## HindsightZapier应用程序添加了什么 {#what-the-hindsight-zapier-app-adds}

该应用程序作为单个**Hindsight**应用程序安装在Zapier中，您可以像其他任何应用程序一样将操作和触发器放入Zap中。

### 行动 {#actions}

**记忆存储** 将内容存储到记忆库（`POST /memories`）中。在 Zap 产生值得记住的东西的任何地方放置一个记忆存储步骤：封闭的票证摘要、通话记录、表单提交。你给它自由文本； Hindsight的记忆存储管道异步提取结构化事实，对记忆库进行重复数据删除，并更新记忆库的心智模型，而不会阻塞Zap。

**记忆召回** 使用自然语言查询 (`POST /memories/recall`) 搜索记忆库。将记忆召回步骤放在任何受益于上下文的操作之前，通常就在 LLM 步骤之前，并向其提供触发数据或用户的当前消息。它返回最相关的记忆。

**反思** 更进一步 (`POST /reflect`)：它返回一个 LLM 合成的、基于记忆的答案，而不是原始记忆。当您想要直接答案（“我们对这个帐户了解多少？”）而不是要传递给下游的片段列表时，请使用它。

|行动|端点|使用它|
|---|---|---|
|记忆存储|`POST /memories`|存储值得记住的内容|
|记忆召回|`POST /memories/recall`|在LLM步骤之前获取相关记忆|
|反思|`POST /reflect`|获得综合的、有根据的答案|

### 触发器 {#triggers}

这就是Zapier应用程序与“调用它作为工具”集成的区别：Hindsight可以*开始*Zap。每个触发器都使用 Zapier 的即时 REST Hooks 订阅 Hindsight 的 webhook API (`POST /webhooks`)，并在您关闭 Zap (`DELETE /webhooks/{id}`) 时彻底拆除。

前面的一个可用性说明：触发器依赖的 webhook API 是一个 **Hindsight Cloud上的企业功能** 并且默认情况下未启用；它在自托管实例上开箱即用。上述三项行动无需特别计划。

|触发器|活动|触发时|
|---|---|---|
|记忆存储已完成|`retain.completed`|记忆存储完成处理，事实存在于记忆库中|
|整合完成|`consolidation.completed`|Hindsight 巩固记忆库的记忆|
|记忆防御触发|`memory_defense.triggered`|记忆防御检查标记了某些东西|

因此，您可以以相反的方式构建Zap：当记忆存储完成时，将新事实发布到Slack；整合完成后，启动下游报告；当记忆防御触发时，开一张票。 记忆不再只是一个目的地，而是成为事件的源头。

每个操作和触发器都有一个**记忆库**字段呈现为动态下拉列表（从您现有的记忆库填充）。您还可以输入新的记忆库 ID； 记忆库是在第一次使用时创建的。

## 身份验证 {#authentication}

应用程序使用API密钥身份验证：

- **API 钥匙**：您的Hindsight密钥（以`hsk_`开头），作为`Authorization: Bearer <key>`发送。 Hindsight Cloud所需。对于无需身份验证运行的自托管实例，请将其留空。
- **API 网址**：默认为Hindsight Cloud（`https://api.hindsight.vectorize.io`）；将其指向您自己的实例（例如 `http://localhost:8888`）以进行自托管。

触发器自托管工作，其中 Webhook API 开箱即用。 （在 Hindsight Cloud上，Webhook 是一项企业功能，默认情况下不启用。）它们依赖于您的实例向 Zapier 的 Webhook URL 发出 *出站* POST，该 URL 适用于任何具有出站互联网的盒子；只有完全气隙的实例不能。每个触发器都会使用新生成的 HMAC 密钥注册其 Webhook，并在每次交付时验证 `X-Hindsight-Signature: sha256=<hmac>` 标头，拒绝签名不匹配的任何有效负载。

## 需要构建的一些 Zap {#a-few-zaps-to-build}

- **学习支持。** 在已关闭的 Zendesk 或 Intercom 票证上触发 → 记忆存储解决方案。在该客户的下一张票上，记忆召回在 LLM 起草回复之前。
- **销售环境随时可用。** 在 Gong 或 Fireflies 通话后，记忆存储文字记录。在下次会议之前，反思获得有关该帐户的综合摘要。
- **记忆驱动的通知**（基于触发器，因此需要 webhook API：自托管或云企业）。使用记忆存储已完成触发器将新学到的事实发布到 Slack 通道中，以便团队了解系统正在学习什么。
- **扎根形式的反应。** Typeform 提交会触发记忆召回，LLM 步骤起草个性化回复，然后电子邮件操作发送它。

## 设置 {#setup}

1. [hindsight.vectorize.io](https://ui.hindsight.vectorize.io)报名；免费套餐足以开始。
2. 从仪表板上获取API钥匙(`hsk_...`)。
3. 在 Zapier 中，向 Zap 添加 Hindsight 操作或触发器，并将您的帐户与 API 密钥（以及 API URL，如果是自托管）连接。
4. 从下拉列表中选择一个记忆库（或输入新的 ID），您就可以在 Zap 中存储和调用记忆。

## 常见问题解答 {#frequently-asked-questions}

**Zapier是否有跨运行的内置记忆？**
没有。每次 Zap 运行都是无状态的。跨运行的持久记忆来自记忆层，如连接到 Zap 的Hindsight。

**记忆事件可以启动 Zap 吗？**
是的，通过应用程序的触发器（记忆存储完成、集成完成、记忆防御触发），这些触发器通过 REST Hooks 立即触发。它们依赖于 Hindsight 的 webhook API，该网络钩子可自托管并依赖于 Hindsight Cloud 的企业计划；默认情况下，它在云上未启用。这三个行动适用于任何计划。

**它可以与自托管的Hindsight一起使用吗？**
是的。将 API URL 设置为您的实例；如果它在没有身份验证的情况下运行，请将 API 键留空。只要您的实例可以向 Zapier 发出出站请求，触发器就可以工作。

**​​记忆召回和回忆有什么区别？**
记忆召回返回与查询最相关的记忆； 预计会返回一个基于这些记忆的 LLM 综合答案。当你想要直接得到答案时，用记忆来反馈下游步骤。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回、保留和记忆库背后的基本概念。
- [最佳AI智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：主要智能体记忆框架的比较。
- [每个 n8n 工作流程都缺少记忆层](/blog/2026/05/07/n8n-persistent-memory)：n8n 的工作流引擎的想法相同。
