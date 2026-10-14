---
sidebar_position: 33
title: "Dify 与 Hindsight 持久记忆 | 集成"
description: "通过 Hindsight 为任意 Dify 工作流添加持久的长期记忆。插件提供 Retain、Recall 和 Reflect 工具，可与其他 LLM、搜索和工具节点一起放入任意聊天流或工作流中。"
---

# Dify {#dify}

通过 [Hindsight](https://hindsight.vectorize.io) 为 [Dify](https://dify.ai) 工作流提供持久记忆。Hindsight Dify 插件提供三个工具——**Retain（存入）**、**Recall（召回）** 和 **Reflect（反思）**，可与工作流、聊天流和智能体应用中的其他 Dify 节点配合使用。

[查看更新日志 →](/changelog/integrations/dify)

## 为什么这很重要 {#why-this-matters}

Dify 是最受欢迎的开源 LLM 应用平台之一，提供可视化工作流构建器、提示管理功能，以及不断扩展的工具和插件生态。此前，Dify 工作流在每次运行之间都**不保留状态**。借助 Hindsight 工具，你可以：

- **Retain（存入）** 每一张已关闭的支持工单、销售通话文字稿或表单提交内容，并将其存入记忆库
- 在 LLM 步骤之前 **Recall（召回）** 相关上下文，让模型看到此前的历史记录
- 在工作流中使用 **Reflect（反思）** 提出综合性问题（“我们对这位客户了解些什么？”）

## 安装 {#installation}

在 Dify 控制台中前往 **插件 → 安装插件（Plugins → Install Plugin）**，然后选择以下一种方式：

- **Marketplace** — 搜索 `Hindsight`（发布后可用）
- **GitHub** — 从 `vectorize-io/hindsight` 安装（路径为 `hindsight-integrations/dify`）
- **本地** — 上传 `.difypkg` 压缩包

安装后，工作流编辑器中的 **工具** 下会出现 **Hindsight** 插件。

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取 API 密钥，无需自行托管。
:::

1. 在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 注册（有免费套餐），或选择[自行托管](/developer/installation)
2. 从 Hindsight 控制台获取 API 密钥
3. **在 Dify 中**打开 Hindsight 插件并添加凭据：
   - **API URL** — 默认为 `https://api.hindsight.vectorize.io`（Cloud）；自行托管时请改为对应地址
   - **API Key** — 你的 `hsk_...` 密钥（对于未启用身份认证的自托管实例，此项可选）

## 工具 {#tools}

### Retain（存入） {#retain}

将内容存入记忆库。调用返回后，Hindsight 会异步提取事实。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 要存入内容的记忆库（首次使用时自动创建） |
| 内容 | 要存入的自由文本内容 |
| 标签 | 可选的逗号分隔标签 |

### Recall（召回） {#recall}

在记忆库中搜索与查询相关的记忆，并返回一个 `results` 数组。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 要搜索的记忆库 |
| 查询 | 自然语言查询 |
| 预算 | `low` / `mid` / `high` |
| 最大 token 数 | 限制返回的 token 数量 |
| 标签 | 可选的标签筛选条件（逗号分隔） |

### Reflect（反思） {#reflect}

获取 LLM 基于记忆库综合生成的答案，返回 `text`。

| 字段 | 说明 |
|---|---|
| 记忆库 ID | 记忆库 |
| 查询 | 要回答的问题 |
| 预算 | `low` / `mid` / `high` |

## 工作流示例 {#example-workflows}

**客服助手** — 每当 Zendesk 工单关闭，就将其解决方案存入记忆库。每张新工单开始处理时，先针对记忆库执行 Recall，找出过去类似的问题，再把相关上下文传给 OpenAI/Anthropic，起草第一条回复。

**销售通话教练** — Gong webhook → Hindsight Retain（通话摘要）。每次后续准备销售通话前，根据潜在客户的姓名执行 Recall，调取此前的所有接触记录，再将其整理到每日准备文档中。

**知识库智能体** — 每份上传的文档都会被分块并存入记忆库。Dify 聊天流使用 Recall 代替仅依赖向量数据库的检索，从而获得经过事实提取、去重且考虑时间因素的结果。

## 来源 {#source}

- GitHub：[`hindsight-integrations/dify`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/dify)
