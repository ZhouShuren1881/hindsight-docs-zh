---
title: "指南：用Hindsight添加n8n记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, n8n, automation, memory]
description: "添加n8n记忆与Hindsight使用 @vectorize-io/n8n-nodes-hindsight社区节点，因此任何工作流程都可以与其他工作流程一起对长期记忆进行记忆存储、记忆召回和反思n8n集成。"
image: /img/guides/guide-n8n-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 n8n 添加记忆](/img/guides/guide-n8n-memory-with-hindsight.svg)

如果你愿意**使用 Hindsight 为 n8n 添加记忆**，最干净的设置是`@vectorize-io/n8n-nodes-hindsight`社区节点。它添加了一个**Hindsight** 具有三个操作的节点 — **记忆存储**，**记忆召回**，和**反思** — 您可以将其放入现有 Slack、Sheets、OpenAI，以及其他节点。这为您的自动化提供了长期记忆，而不是在每次运行时都无状态地开始。

这非常适合n8n，因为n8n是自动化的结缔组织：来自 Gmail、Slack、Sheets、Stripe 和 Notion 的触发器，以及跨数百个应用程序的操作。到目前为止，每个工作流运行都是无状态的。通过Hindsight节点，您可以在工作流程中出现记忆存储事实，在LLM步骤之前记忆相关上下文，并期待获得记忆库学到的所有内容的综合答案。

本指南逐步介绍安装社区节点、创建HindsightAPI凭证、使用每个操作以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留[文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1.在n8n，前往**设置 → 社区节点 → 安装（Settings → Community Nodes → Install）**并输入`@vectorize-io/n8n-nodes-hindsight`。
> 2.重新启动n8n； **Hindsight** 节点出现在节点面板中。
> 3.创建一个**Hindsight API** 与您的凭证APIURL（默认为Hindsight Cloud）和`hsk_...`键。
> 4.添加一个**Hindsight** 节点并使用记忆库 ID 选择一个操作 - 记忆存储、记忆召回或反思。
> 5.验证稍后的运行是否能回忆起先前运行保留的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- 正在运行的n8n实例（云或自托管）
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- AHindsightAPI键（`hsk_...`) 如果您使用的是云

## 第一步：安装社区节点 {#step-1-install-the-community-node}

在n8n，前往**设置 → 社区节点 → 安装（Settings → Community Nodes → Install）** 并输入：

```
@vectorize-io/n8n-nodes-hindsight
```

或者直接安装在自托管n8n中：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重启n8n和 **Hindsight** 节点出现在节点面板中。

## 第 2 步：创建 Hindsight API 凭证 {#step-2-create-a-hindsight-api-credential}

在n8n，创建一个新**Hindsight API** 证书：

- **API 地址（API URL）**：`https://api.hindsight.vectorize.io`（默认值，Hindsight Cloud) 或您的自托管 URL
- **API 密钥（API Key）**：你的`hsk_...`键。对于未经身份验证的自托管实例，请将其留空。

凭证适用`Bearer` 自动授权头，并且可以针对Hindsight`/health`端点，适用于云和自托管。

如果您还没有钥匙，[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）并从仪表板上获取一个，或 [自托管](https://hindsight.vectorize.io/developer/installation) 代替。

## 第3步：添加Hindsight节点并选择操作 {#step-3-add-a-hindsight-node-and-pick-an-operation}

添加一个**Hindsight** 节点到您的工作流程，选择您创建的凭证，然后选择三个操作之一。每个操作都需要一个**记忆库 ID（Bank ID）** — 如果记忆库不存在，则会在首次使用时创建它，因此您可以以用户、客户或工作流程命名它。

### 记忆存储 {#retain}

将内容存储在记忆库中。 Hindsight 在调用返回后异步提取结构化事实。

|领域|说明|
|---|---|
|记忆库ID|存储的记忆库（首次使用时自动创建）|
|内容|免费文本到记忆存储|
|标签|应用于存储记忆的逗号分隔标签（例如`user:alex,scope:profile`)|

### 记忆召回 {#recall}

在记忆库中搜索与查询相关的记忆。返回一个`results`数组。

|领域|说明|
|---|---|
|记忆库ID|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high` — 控制检索的详尽程度（默认为 `mid`)|
|最大token数量|返回的记忆最大token数（默认为`4096`)|
|标签筛选|以逗号分隔的标签来过滤记忆召回（留空表示不过滤）|

### 反思 {#reflect}

获取LLM-记忆库积累的知识的综合答案。退货`text`。

|领域|说明|
|---|---|
|记忆库ID|记忆库回顾|
|查询|使用记忆库的记忆回答问题|
|预算|`low` / `mid` / `high`（默认为`mid`)|

## 你得到什么 {#what-you-get}

该节点具有零运行时依赖性，并使用n8n的内置身份验证HTTP帮助程序，因此它可以在自托管的n8n和n8n云上运行。由于这三个操作是普通的 n8n 节点，因此您可以将它们连接到工作流程中的任何位置：

- **记忆存储**：将已关闭的工单、销售通话摘要或表单提交存入记忆库。
- **记忆召回** 之前的相关上下文OpenAI,Anthropic，或 Cohere 步骤，以便LLM查看之前的历史
- **反思** 在工作流程中提出综合性问题（“我们对该客户了解多少？”）

对于较低级别的行为，请阅读[Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 添加一个**Hindsight** 节点设置为 **记忆存储**，记忆库ID如`demo-bank`和一些内容
2. 运行工作流程以保留内容
3. 添加第二个**Hindsight** 节点设置为 **记忆召回**，指向同一个记忆库ID
4. 给它一个与你保留的内容相关的查询
5. 运行它并检查`results`数组

例如，记忆存储是关于客户计划的注释，然后在以后的运行中记忆召回客户的名字。如果记忆再现显示较早的音符，则该设置正在工作。

## 常见错误 {#common-mistakes}

### 安装后忘记重启n8n {#forgetting-to-restart-n8n-after-install}

**Hindsight**节点仅在重启后出现在节点面板中  社区节点安装后的n8n。

### 记忆库ID不匹配 {#mismatched-bank-ids}

记忆存储和记忆召回必须使用相同的记忆库ID才能看到相同的记忆。拼写错误会在第一次使用时创建一个新的、空的记忆库，而不是出错。

### 太早测试记忆能力 {#testing-recall-too-early}

Hindsight 在记忆存储调用返回后异步提取事实。如果你立即记忆，刚刚保留的内容可能还没有被完全处理。

### 错误 API 自托管 URL {#wrong-api-url-for-self-hosted}

凭证默认为Hindsight Cloud。如果您自行托管，请将 API URL 设置为您的部署；对于未经身份验证的自托管实例，请将 API 键留空。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管 Hindsight 服务器也可以工作 — 将凭证的 API URL 设置为您的部署，如果未经身份验证，则将 API 密钥留空。

### 节点安装在哪里？ {#where-do-i-install-the-node}

在n8n下**设置 → 社区节点 → 安装（Settings → Community Nodes → Install）**，或通过`npm install @vectorize-io/n8n-nodes-hindsight` 自托管 `~/.n8n/custom`目录。

### 记忆的范围是怎样的？ {#how-is-memory-scoped}

由记忆库ID。每个操作都需要一个记忆库 ID，并且在首次使用时创建记忆库，因此您可以隔离每个用户、客户或工作流程的记忆。

### 我可以用它构建什么？ {#what-can-i-build-with-it}

任何受益于持久上下文的东西——可以回忆起过去类似票证的客户支持助理、提取先前接触点的销售电话教练，或者可以记住跨会话对话的 Slack 机器人。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[n8n 集成文档](/sdks/integrations/n8n)
