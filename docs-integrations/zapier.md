---
sidebar_position: 36
title: "Zapier 持久记忆Hindsight |整合"
description: "使用Hindsight为您的Zap添加长期记忆。 记忆存储、记忆召回和反思动作加上即时记忆事件触发器将 Hindsight 连接到 7,000 多个应用程序。"
---

# Zapier {#zapier}

长期智能体记忆[Zapier](https://zapier.com)来自[Hindsight](https://hindsight.vectorize.io)。的HindsightZapier应用程序添加了三个操作 — **记忆存储**，**记忆召回**，**反思** — 加上即时 **触发器** 当记忆事件触发时启动 Zap，因此记忆在Hindsight和 7,000 多个应用程序。

## 为什么这很重要 {#why-this-matters}

Zapier连接一切：Gmail、Slack、Sheets、HubSpot、Notion、表单等等。就其本身而言，这些 Zap 是 **无状态**。与Hindsight你可以：

- **记忆存储** 将每张已关闭的工单、表格提交或通话摘要存入记忆库
- **记忆召回** 之前的相关上下文AI步骤让模型看到之前的历史
- **反思** 在 Zap 中获得综合的、基于记忆的答案
- **触发** 记忆操作完成时 Zap（例如，集成完成时通知 Slack）

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
:::

1. **注册** [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）或[自托管](/developer/installation)
2. **获取 API 密钥** (`hsk_...`) 来自Hindsight仪表板

:::note 可用性
本地人HindsightZapier应用程序（**记忆存储 / 记忆召回 / 反思** 步骤和触发器）是
目前**私有测试版** — 未列出Zapier的公共应用程序目录还没有，所以
搜索“Hindsight”中Zapier找不到它。使用下面 **Webhooks by Zapier**路径。
:::

### Webhooks by Zapier {#webhooks-by-zapier}

每个Hindsight操作都是普通的REST调用，因此您可以从Zapier的内置驱动它
**Webhooks by Zapier** 行动（或 **API 请求（API Request）**) 无需安装任何内容：

- **方法：**`POST`
- **URL** (Hindsight Cloud）：
  - 记忆存储 — `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/memories`
  - 记忆召回 — `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/memories/recall`
  - 反思 — `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/reflect`
- **请求头：**`Authorization: Bearer hsk_...` 和 `Content-Type: application/json`
- **请求正文：**JSON操作的有效负载 — 请参阅 [API 参考](/api-reference) 用于确切的字段。

对于自托管，请将主机替换为您自己的实例 URL；删除`Authorization` 标头（如果它在未经身份验证的情况下运行）。

## 操作 {#actions}

### 记忆存储 {#retain}

将内容存储在记忆库中。 Hindsight 在调用返回后异步提取事实。

|领域|说明|
| --------- | --------------------------------------------------------------------- |
|记忆库|记忆库存储（动态下拉列表；首次使用时自动创建）|
|内容|免费文本到记忆存储|
|上下文|内容的可选上下文|
|标签|逗号分隔的标签|
|时间戳|内容发生的时间（默认为现在）|

### 记忆召回（搜索） {#recall-search}

在记忆库中搜索与查询相关的记忆。

|领域|说明|
| ----------------- | ---------------------- |
|记忆库|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high`|
|标签/标签匹配|可选标签过滤器|

### 反思（综合答案） {#reflect-search}

获得基于记忆库记忆的LLM综合答案。

|字段|说明|
| ------ | ---------------------- |
|记忆库|记忆库|
|查询|要回答的问题|
|预算|`low` / `mid` / `high`|

## 触发器 {#triggers}

当记忆库中的记忆事件完成时触发的即时触发器（REST Hooks）：

|触发器|触发时|
| ---------------------------- | ------------------------------------------------------------- |
|**记忆存储完成（Retain Completed）**|异步记忆存储完成处理|
|**整合完成（Consolidation Completed）**|记忆整合综合观察/心智模型|

## Zap 示例 {#example-zaps}

**客服助手** — 封闭式票据触发器 (Zendesk) →Hindsight**记忆存储**分辨率。新票 →Hindsight**记忆召回** 过去类似的问题 →OpenAI起草第一个回复。

**记忆摘要** —Hindsight**整合完成（Consolidation Completed）** 触发→格式化新的观察→发布到Slack，以便团队看到智能体学到了什么。

**每日准备** — 日历触发器 →Hindsight**反思**（“我们对这个潜在客户了解多少？”）→ 将答案附加到准备文档中。

## 来源 {#source}

- GitHub：[`hindsight-integrations/zapier`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zapier)
