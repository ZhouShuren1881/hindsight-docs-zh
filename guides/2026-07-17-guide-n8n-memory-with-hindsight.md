---
title: "指南：使用 Hindsight 为 n8n 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, n8n, automation, memory]
description: "使用 @vectorize-io/n8n-nodes-hindsight 社区节点为 n8n 添加记忆，让任何工作流都能与其他 n8n 集成配合，存入、召回并反思长期记忆。"
image: /img/guides/guide-n8n-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 n8n 添加记忆](/img/guides/guide-n8n-memory-with-hindsight.svg)

如果你想为 n8n 接入 Hindsight 记忆，最简洁的方案是使用 `@vectorize-io/n8n-nodes-hindsight` 社区节点。它会添加一个 **Hindsight** 节点，提供 **Retain（存入）**、**Recall（召回）** 和 **Reflect（反思）** 三种操作。你可以把它放进任意工作流，与现有的 Slack、Sheets、OpenAI 等节点并用。这样，自动化流程就能拥有长期记忆，而不必在每次运行时都从无状态开始。

n8n 很适合与 Hindsight 配合，因为它是自动化流程的连接枢纽：它可以接收来自 Gmail、Slack、Sheets、Stripe 和 Notion 等服务的触发信号，并在数百个应用中执行操作。此前，每次工作流运行都是无状态的。使用 Hindsight 节点后，你可以在工作流中随时存入事实，在 LLM 步骤之前召回相关上下文，并基于记忆库积累的全部内容，通过 Reflect 获取综合生成的答案。

本指南将逐步介绍如何安装社区节点、创建 Hindsight API 凭证、使用每种操作，并通过一个快速验证流程确认记忆确实正在发挥作用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速说明**
>
> 1. 在 n8n 中，前往 **设置 → 社区节点 → 安装**（Settings → Community Nodes → Install），然后输入 `@vectorize-io/n8n-nodes-hindsight`。
> 2. 重启 n8n；**Hindsight** 节点就会出现在节点面板中。
> 3. 创建 **Hindsight API** 凭证，填写 API URL（默认为 Hindsight Cloud）和 `hsk_...` 密钥。
> 4. 添加 **Hindsight** 节点，选择 Retain、Recall 或 Reflect 操作，并填写 Bank ID。
> 5. 验证后续运行能否召回先前运行存入的内容。

## 准备工作 {#prerequisites}

开始之前，请确保你具备以下条件：

- 一个正在运行的 n8n 实例（云端或自托管）
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 如果使用云端服务，还需要 Hindsight API 密钥（`hsk_...`）

## 第一步：安装社区节点 {#step-1-install-the-community-node}

在 n8n 中，前往 **设置 → 社区节点 → 安装**（Settings → Community Nodes → Install），然后输入：

```
@vectorize-io/n8n-nodes-hindsight
```

你也可以在自托管的 n8n 实例中直接安装：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重启 n8n 后，**Hindsight** 节点就会出现在节点面板中。

## 第二步：创建 Hindsight API 凭证 {#step-2-create-a-hindsight-api-credential}

在 n8n 中创建新的 **Hindsight API** 凭证：

- **API URL**：`https://api.hindsight.vectorize.io`（默认值，即 Hindsight Cloud 的地址），或你的自托管服务 URL。
- **API Key**：你的 `hsk_...` 密钥。如果自托管实例不需要身份验证，请留空。

凭证会自动添加 `Bearer` 授权标头。它还可以通过 Hindsight `/health` 端点进行测试；云端和自托管服务都支持该端点。

如果你还没有密钥，可以[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐），然后从控制面板获取密钥；也可以改为[自行托管](https://hindsight.vectorize.io/developer/installation)。

## 第三步：添加 Hindsight 节点并选择操作 {#step-3-add-a-hindsight-node-and-pick-an-operation}

将 **Hindsight** 节点添加到工作流中，选择刚创建的凭证，然后从三种操作中选择一种。每种操作都需要 **Bank ID（记忆库 ID）**。如果记忆库尚不存在，系统会在首次使用时创建它，因此可以用用户、客户或工作流来命名。

### Retain（存入） {#retain}

将内容存入记忆库。调用返回后，Hindsight 会异步提取结构化事实。

| 字段 | 说明 |
|---|---|
| Bank ID（记忆库 ID） | 要存入内容的记忆库（首次使用时自动创建） |
| Content（内容） | 要存入的自由文本 |
| Tags（标签） | 应用于所存记忆的逗号分隔标签（例如 `user:alex,scope:profile`） |

### Recall（召回） {#recall}

在记忆库中搜索与查询相关的记忆，并返回一个 `results` 数组。

| 字段 | 说明 |
|---|---|
| Bank ID（记忆库 ID） | 要搜索的记忆库 |
| Query（查询） | 自然语言查询 |
| Budget（预算） | `low` / `mid` / `high`，用于控制检索的全面程度（默认值为 `mid`） |
| Max Tokens（最大 token 数） | 最多返回多少 token 的记忆（默认值为 `4096`） |
| Tags Filter（标签筛选） | 用逗号分隔的标签筛选召回结果（留空表示不筛选） |

### Reflect（反思） {#reflect}

基于记忆库积累的知识，通过 LLM 综合生成答案，并返回 `text`。

| 字段 | 说明 |
|---|---|
| Bank ID（记忆库 ID） | 要进行反思的记忆库 |
| Query（查询） | 要依据记忆库中的记忆回答的问题 |
| Budget（预算） | `low` / `mid` / `high`（默认值为 `mid`） |

## 可以用它做什么 {#what-you-get}

该节点无需任何运行时依赖，并使用 n8n 内置的身份验证 HTTP 辅助工具，因此可用于自托管的 n8n 和 n8n Cloud。三种操作都是普通的 n8n 节点，可以连接到工作流中的任意位置：

- 使用 **Retain** 将已结案的支持工单、销售通话摘要或表单提交内容存入记忆库。
- 在 OpenAI、Anthropic 或 Cohere 步骤之前使用 **Recall** 召回相关上下文，让 LLM 获取此前的交互历史。
- 在工作流中使用 **Reflect** 提出综合性问题（“我们对这位客户了解多少？”）。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤测试：

1. 添加一个设置为 **Retain** 的 **Hindsight** 节点，填写类似 `demo-bank` 的 Bank ID 和要存入的 Content。
2. 运行工作流，存入内容。
3. 再添加一个设置为 **Recall** 的 **Hindsight** 节点，并指定相同的 Bank ID。
4. 为它填写一个与先前存入内容相关的 Query。
5. 运行节点并检查 `results` 数组。

例如，先存入一条有关客户方案的备注，再在后续运行中按客户姓名进行召回。如果召回结果中出现了先前的备注，就说明配置正常。

## 常见错误 {#common-mistakes}

### 安装后忘记重启 n8n {#forgetting-to-restart-n8n-after-install}

安装社区节点后，只有重启 n8n，**Hindsight** 节点才会出现在节点面板中。

### Bank ID 不匹配 {#mismatched-bank-ids}

Retain 和 Recall 必须使用相同的 Bank ID，才能访问同一份记忆。若 ID 拼写错误，首次使用时会创建一个新的空记忆库，而不会报错。

### 过早测试 Recall {#testing-recall-too-early}

Retain 调用返回后，Hindsight 仍会异步提取事实。如果立即执行 Recall，刚存入的内容可能还没有处理完毕。

### 自托管时 API URL 填写错误 {#wrong-api-url-for-self-hosted}

凭证默认使用 Hindsight Cloud。如果你选择自托管，请将 API URL 设为自己的部署地址；如果自托管实例不需要身份验证，请将 API Key 留空。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器同样可用：将凭证中的 API URL 设为你的部署地址；如果该实例不需要身份验证，就将 API Key 留空。

### 在哪里安装这个节点？ {#where-do-i-install-the-node}

可以在 n8n 中前往 **设置 → 社区节点 → 安装**（Settings → Community Nodes → Install）安装，也可以在自托管实例的 `~/.n8n/custom` 目录中运行 `npm install @vectorize-io/n8n-nodes-hindsight`。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

范围由 Bank ID 决定。每种操作都需要一个 Bank ID，系统会在首次使用时创建记忆库，因此你可以按用户、客户或工作流隔离记忆。

### 可以用它构建什么？ {#what-can-i-build-with-it}

凡是需要持久上下文的场景都可以使用它，例如：能够召回类似历史工单的客户支持助理、能调取以往客户接触记录的销售通话助手，或能跨会话记住对话内容的 Slack 机器人。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)开始使用。
- 查看 [Hindsight 的 Recall API](/developer/api/recall)。
- 查看 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [n8n 集成文档](/sdks/integrations/n8n)。
