---
sidebar_position: 32
title: "使用 Hindsight 为 n8n 添加持久记忆 | 集成"
description: "使用 Hindsight 为任何 n8n 工作流添加持久的长期记忆。社区节点提供 Retain、Recall 和 Reflect 操作，可与 Slack、Sheets、OpenAI 及其他 400 多种集成一起用于任何工作流。"
---

# n8n {#n8n}

通过 [Hindsight](/)，为 [n8n](https://n8n.io) 工作流提供持久记忆。`@vectorize-io/n8n-nodes-hindsight` 社区节点包新增了三个操作：**Retain**（存入）、**Recall**（召回）和 **Reflect**（反思），可与任何其他 n8n 节点配合使用。

[查看更新日志 →](/changelog/integrations/n8n)

## 为什么这很重要 {#why-this-matters}

n8n 是自动化流程的连接枢纽：它可以接收来自 Gmail、Slack、Sheets、Stripe 和 Notion 的触发事件，并在 400 多种应用中执行操作。此前，n8n 一直是**无状态的**，每次工作流运行都会从头开始。借助 Hindsight 节点，你可以：

- **Retain（存入）**：将每个已关闭的支持工单、销售通话摘要或表单提交存入记忆库。
- **Recall（召回）**：在 OpenAI、Anthropic 或 Cohere 步骤之前召回相关上下文，让 LLM 获取此前的历史信息。
- **Reflect（反思）**：在工作流中直接提出综合性问题，例如“我们对这位客户了解多少？”

## 安装 {#installation}

在你的 n8n 实例中，前往 **Settings → Community Nodes → Install（设置 → 社区节点 → 安装）**，然后输入：

```
@vectorize-io/n8n-nodes-hindsight
```

自托管 n8n 时，也可以运行：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重启 n8n 后，节点面板中就会出现 **Hindsight** 节点。

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)并获取 API 密钥，无需自行托管。
:::

1. 在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 注册（提供免费套餐），或选择[自托管](/developer/installation)。
2. 从 Hindsight 控制台获取 API 密钥。
3. 在 n8n 中创建新的 **Hindsight API** 凭据，并填写 API URL（默认为 Hindsight Cloud）和 `hsk_...` 密钥。

## 操作 {#operations}

### Retain（存入） {#retain}

将内容存入记忆库。调用返回后，Hindsight 会异步提取事实。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 要存入内容的记忆库（首次使用时会自动创建） |
| 内容 | 要存入的自由文本 |
| 标签 | 以逗号分隔的标签 |

### Recall（召回） {#recall}

在记忆库中搜索与查询相关的记忆，并返回一个 `results` 数组。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 要搜索的记忆库 |
| 查询 | 自然语言查询 |
| 预算 | `low` / `mid` / `high` |
| 最大 token 数 | 返回的记忆 token 数上限 |
| 标签筛选 | 按标签筛选 |

### Reflect（反思） {#reflect}

基于记忆库获取 LLM 综合生成的答案，并返回 `text`。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 记忆库 |
| 查询 | 要回答的问题 |
| 预算 | `low` / `mid` / `high` |

## 工作流示例 {#example-workflows}

**客服助手** — 每当 Zendesk 工单关闭时，将其解决方案存入记忆库。每个新工单都会先在记忆库中召回类似历史问题，再把相关上下文传给 OpenAI，起草第一条回复。

**销售通话教练** — Gong webhook → Hindsight Retain（通话摘要）。每次后续准备销售通话前，按潜在客户姓名进行召回，提取此前的所有接触记录，再将其整理到每日准备文档中。

**个人 Slack 机器人** — Slack DM 触发器 → Hindsight 根据用户问题执行 Recall → OpenAI 生成答案 → Slack 回复。机器人会跨会话记住每次对话。

## 来源 {#source}

- npm：[`@vectorize-io/n8n-nodes-hindsight`](https://www.npmjs.com/package/@vectorize-io/n8n-nodes-hindsight)
- GitHub：[`hindsight-integrations/n8n`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/n8n)
