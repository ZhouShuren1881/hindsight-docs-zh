---
title: "Zapier 持久记忆：操作与触发器"
authors: [benfrank241]
slug: "2026/06/25/zapier-persistent-memory"
date: 2026-06-25T13:00
tags: [hindsight, zapier, integration, memory, agents, workflows, no-code, tutorial]
description: "Zapier 的 Hindsight 应用可为任何 Zap 添加持久记忆：Retain、Recall 和 Reflect 操作，以及由记忆事件启动 Zap 的触发器。"
image: /img/blog/zapier-persistent-memory.webp
hide_table_of_contents: true
---

![Zapier 中的 Hindsight 持久记忆](/img/blog/zapier-persistent-memory.webp)

[Zapier](https://zapier.com) 将大多数团队已在使用的数千种应用连接起来（据 Zapier 统计，数量超过 8,000 种），包括 Slack、Gmail、HubSpot、Notion、Sheets、Airtable 和 OpenAI。你可以把它们串联成 Zap：一个应用中的触发器会启动其他应用中的操作。但 Zap 不会携带记忆。每次运行都会从零开始，因此，今天早上处理过支持工单的工作流不知道自己昨天也运行过；Zap 中间的 LLM 步骤也只了解你塞进那一条提示的内容。

Zapier 的 Hindsight 应用弥补了这一缺口，而且能双向运作。Hindsight 为 Zap 提供 **三个可调用的操作**：Retain（存入）、Recall（召回）和 Reflect（反思）；还提供 **三个触发器**，可在[智能体记忆](https://vectorize.io/what-is-agent-memory)中发生事件时启动 Zap。这样一来，记忆既是自动化流程可以使用的工具，也是能够触发流程的事件来源。

<!-- truncate -->

## 概览 {#tldr}

- Hindsight 的 Zapier 应用可让任何 Zap 使用持久记忆，支持连接 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或自托管实例。
- **三个操作：** Retain（存入内容）、Recall（搜索记忆库）、Reflect（生成以记忆为依据的 LLM 综合答案）。
- **三个触发器**（通过 REST Hooks 即时触发）：Retain Completed（存入完成）、Consolidation Completed（整合完成）和 Memory Defense Triggered（记忆防护触发）。它们可让记忆事件*启动* Zap。触发器使用 Hindsight 的 Webhook API；该 API 可用于自托管实例和 Hindsight Cloud 企业计划，且在 Cloud 上默认未启用。这三个操作适用于任何计划。
- **Bank** 字段是动态下拉列表；输入新的记忆库 ID 后，会在首次使用时创建该记忆库。
- 使用 API 密钥进行身份验证（将 `hsk_...` 作为 Bearer 令牌）；如果要连接未启用身份验证的自托管实例，可以将密钥留空。

---

## 为什么 Zapier 的 Zap 需要持久记忆 {#why-zapier-zaps-need-persistent-memory}

Zap 的设计本身就是无状态的：触发器触发，数据经过几个操作步骤，运行结束后，任何内容都不会留到下一次运行。这正适合“收到新的 Stripe 付款 → 在 Sheets 中添加一行”这样的流程。但对于人们越来越多地在 Zapier 中构建的工作流来说，无状态会带来明显限制：

- **面向客户的 Zap**：应该在多次运行中始终如一地对待同一个人，而不是每次都重新自我介绍。
- **AI 步骤**：Zap 中间的 OpenAI 或 Anthropic 操作如果能获取相关的历史上下文，效果会远胜于只收到一条手写提示。
- **运营流水线**：每次运行都可以参考之前的所有运行。

没有记忆时，Zap 中的 LLM 步骤只知道你塞进那一条提示的内容。有了记忆，它就能检索与当前输入相关的信息，并在过去每次运行的基础上不断积累。这就是 Zap 只会重复执行和工作流能够逐步积累经验之间的区别。

## Hindsight 的 Zapier 应用能提供什么 {#what-the-hindsight-zapier-app-adds}

在 Zapier 中安装后，该应用会以一个 **Hindsight** 应用的形式出现。你可以像使用其他应用一样，将它的操作和触发器添加到 Zap 中。

### 操作 {#actions}

**Retain（存入）** 会将内容存入记忆库（`POST /memories`）。在 Zap 产生值得记住的内容时加入 Retain 步骤，例如已结案工单的摘要、通话记录或表单提交内容。你向它提供自由文本；Hindsight 的存入流程会异步提取结构化事实、与记忆库中的内容去重，并更新记忆库的心智模型，不会阻塞 Zap。

**Recall（召回）** 使用自然语言查询搜索记忆库（`POST /memories/recall`）。在任何能从上下文中受益的操作之前加入 Recall 步骤，通常放在 LLM 步骤之前，并向它提供触发器数据或用户当前的消息。它会返回最相关的记忆。

**Reflect（反思）** 更进一步（`POST /reflect`）：它返回以记忆为依据、由 LLM 综合生成的答案，而不是原始记忆。当你需要一个直接答案（例如“我们对这个账户了解什么？”），而不是一组要传给下游步骤的片段时，就可以使用它。

| 操作 | 端点 | 用途 |
|---|---|---|
| Retain | `POST /memories` | 存入值得记住的内容 |
| Recall | `POST /memories/recall` | 在 LLM 步骤前获取相关记忆 |
| Reflect | `POST /reflect` | 获取经过综合、以记忆为依据的答案 |

### 触发器 {#triggers}

与只能作为工具调用的集成不同，Zapier 应用还有一个特点：Hindsight 可以*启动* Zap。每个触发器都会通过 Zapier 的即时 REST Hooks 订阅 Hindsight 的 Webhook API（`POST /webhooks`）；关闭 Zap 时，会妥善删除相应订阅（`DELETE /webhooks/{id}`）。

先说明一项可用性限制：这些触发器依赖的 Webhook API 在 Hindsight Cloud 上属于 **企业功能**，默认未启用；自托管实例则开箱即用。上文的三个操作不需要特殊计划。

| 触发器 | 事件 | 触发时机 |
|---|---|---|
| Retain Completed（存入完成） | `retain.completed` | Retain 处理完毕，事实已写入记忆库 |
| Consolidation Completed（整合完成） | `consolidation.completed` | Hindsight 完成对某个记忆库中记忆的整合 |
| Memory Defense Triggered（记忆防护触发） | `memory_defense.triggered` | 记忆防护检查发现并标记了某项内容 |

这样，你也可以反向构建 Zap：Retain 完成后，将新事实发布到 Slack；整合完成后，启动下游报告；记忆防护触发后，创建一张工单。记忆不再只是数据流向的目的地，也成为事件来源。

每个操作和触发器都有一个 **Bank** 字段，以动态下拉列表呈现，其中列出已有记忆库。你也可以输入新的记忆库 ID；该记忆库会在首次使用时创建。

## 身份验证 {#authentication}

该应用使用 API 密钥进行身份验证：

- **API Key**：你的 Hindsight 密钥（以 `hsk_` 开头），会作为 `Authorization: Bearer <key>` 发送。Hindsight Cloud 必须提供密钥。如果自托管实例未启用身份验证，请将此项留空。
- **API URL**：默认指向 Hindsight Cloud（`https://api.hindsight.vectorize.io`）；自托管时可改为你自己的实例地址（例如 `http://localhost:8888`）。

自托管实例可以使用触发器，因为其 Webhook API 开箱即用。（在 Hindsight Cloud 上，Webhook 属于企业功能，默认未启用。）触发器要求你的实例向 Zapier 的 Webhook URL 发起*出站* POST 请求。任何能够访问互联网的实例都可以这样做；完全隔离、无法连接外部网络的实例除外。每个触发器注册 Webhook 时都会生成一个新的 HMAC 密钥，并在每次投递时验证 `X-Hindsight-Signature: sha256=<hmac>` 标头；如果签名不匹配，就会拒绝该载荷。

## 可以构建的几种 Zap {#a-few-zaps-to-build}

- **能够积累经验的客户支持。** Zendesk 或 Intercom 工单结案时触发 → 用 Retain 存入解决方案。该客户下次提交工单时，先用 Recall 获取记忆，再让 LLM 起草回复。
- **随时可用的销售上下文。** Gong 或 Fireflies 通话结束后，用 Retain 存入通话记录。下次会议前，用 Reflect 生成该客户账户的综合简报。
- **由记忆驱动的通知**（基于触发器，因此需要 Webhook API：自托管实例或 Cloud 企业计划）。使用 Retain Completed 触发器，将新学到的事实发布到 Slack 频道，让团队了解系统学到了什么。
- **有记忆依据的表单回复。** Typeform 收到提交后触发 Recall，LLM 步骤起草个性化回复，最后由邮件操作发送。

## 设置 {#setup}

1. 在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 注册；免费套餐足以开始使用。
2. 从控制台获取 API 密钥（`hsk_...`）。
3. 在 Zapier 中向 Zap 添加 Hindsight 操作或触发器，并使用 API 密钥连接账户（自托管时还需提供 API URL）。
4. 从下拉列表中选择一个记忆库（或输入新的 ID），然后就可以在 Zap 中存入和召回记忆了。

## 常见问题 {#frequently-asked-questions}

**Zapier 是否内置了跨运行的记忆？**
没有。每次 Zap 运行都是无状态的。要让记忆跨运行保留，需要将 Hindsight 这样的记忆层接入 Zap。

**记忆事件可以启动 Zap 吗？**
可以。应用提供的触发器（Retain Completed、Consolidation Completed、Memory Defense Triggered）会通过 REST Hooks 即时触发。这些触发器依赖 Hindsight 的 Webhook API，该 API 可用于自托管实例和 Hindsight Cloud 企业计划，在 Cloud 上默认未启用。这三个操作则适用于任何计划。

**它支持自托管的 Hindsight 吗？**
支持。将 API URL 设置为你的实例地址；如果实例未启用身份验证，就将 API 密钥留空。只要实例能够向 Zapier 发起出站请求，触发器就可以工作。

**Recall 和 Reflect 有什么区别？**
Recall 会返回与查询最相关的记忆；Reflect 会返回由 LLM 综合生成、并以这些记忆为依据的答案。要把相关记忆传给下游步骤时使用 Recall；需要直接得到答案时使用 Reflect。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解召回、存入和记忆库的基础概念。
- [最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems)：比较主要的智能体记忆框架。
- [每个 n8n 工作流都缺少的记忆层](/blog/2026/05/07/n8n-persistent-memory)：将同一思路用于 n8n 工作流引擎。
