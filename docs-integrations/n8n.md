---
sidebar_position: 32
title: "n8n 持久记忆Hindsight |整合"
description: "使用Hindsight为任何n8n工作流程添加持久的长期记忆。社区节点提供记忆存储、记忆感知和亮度操作 - 将它们与 Slack、Sheets、OpenAI 和 400 多个其他集成一起放入任何工作流程中。"
---

# n8n {#n8n}

持久记忆[n8n](https://n8n.io) 工作流程通过 [Hindsight](https://hindsight.vectorize.io)。 `@vectorize-io/n8n-nodes-hindsight`社区节点包新增三个操作 — **记忆存储**，**记忆召回**，**反思** — 与任何其他产品一起工作n8n节点。

[查看更新日志 →](/changelog/integrations/n8n)

## 为什么这很重要 {#why-this-matters}

n8n是自动化的结缔组织：来自 Gmail、Slack、Sheets、Stripe、Notion 的触发器；跨 400 多个应用程序的操作。到现在为止**无状态** — 每个工作流程运行都是全新的。与Hindsight节点您可以：

- **记忆存储**：将已关闭的工单、销售通话摘要或表单提交存入记忆库。
- **记忆召回**：在 OpenAI、Anthropic 或 Cohere 步骤之前检索相关上下文，让 LLM 能看到既往历史。
- **反思**：在工作流内提出综合性问题，例如“我们对这位客户了解多少？”

## 安装 {#installation}

在你的n8n实例，转到**设置 → 社区节点 → 安装（Settings → Community Nodes → Install）** 并输入：

```
@vectorize-io/n8n-nodes-hindsight
```

或者自托管n8n：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重新启动n8n； **Hindsight** 节点出现在节点面板中。

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
:::

1. **注册** [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）或[自托管](/developer/installation)
2. **获取 API 密钥** 来自Hindsight仪表板
3. **在 n8n 中**，创建一个新**Hindsight API** 与您的凭证APIURL（默认为Hindsight Cloud）和`hsk_...`键

## 操作 {#operations}

### 记忆存储 {#retain}

将内容存储在记忆库中。 Hindsight 在调用返回后异步提取事实。

|字段|说明|
|---|---|
|记忆库ID|记忆库存储（首次使用时自动创建）|
|内容|免费文本到记忆存储|
|标签|逗号分隔的标签|

### 记忆召回 {#recall}

在记忆库中搜索与查询相关的记忆。返回一个`results`数组。

|字段|说明|
|---|---|
|记忆库ID|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high`|
|最大 token 数|返回记忆内容的 token 数上限|
|标签过滤器|按标签过滤|

### 反思 {#reflect}

获取  LLM 仪表板中的LLM-记忆库中的综合答案。退货`text`。

|字段|说明|
|---|---|
|记忆库ID|记忆库|
|查询|要回答的问题|
|预算|`low` / `mid` / `high`|

## 工作流程示例 {#example-workflows}

**客服助手** — 每张已关闭的 Zendesk 票证都会保留分辨率。每张新票都以针对记忆库的记忆召回开始，以显示过去类似的问题，然后将该上下文传递给OpenAI起草第一个回复。

**销售通话教练**——Gong webhook →Hindsight记忆存储（调用摘要）。在每次下一次准备通话之前，对潜在客户的姓名进行记忆，以提取之前的每个接触点，然后将其格式化为每日准备文档。

**个人 Slack 机器人** — Slack DM 触发器 →Hindsight关于用户问题的记忆召回 →OpenAI获取答案 → Slack 回复。机器人会记住会话中的每一次对话。

## 来源 {#source}

- npm：[`@vectorize-io/n8n-nodes-hindsight`](https://www.npmjs.com/package/@vectorize-io/n8n-nodes-hindsight)
- GitHub：[`hindsight-integrations/n8n`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/n8n)
