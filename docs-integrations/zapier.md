---
sidebar_position: 36
title: "使用 Hindsight 为 Zapier 提供持久记忆 | 集成"
description: "使用 Hindsight 为你的 Zap 添加长期记忆。通过 Retain、Recall 和 Reflect 操作，以及即时记忆事件触发器，将 Hindsight 连接到 7,000 多个应用。"
---

# Zapier {#zapier}

通过 [Hindsight](/) 为 [Zapier](https://zapier.com) 提供长期智能体记忆。Hindsight Zapier 应用提供三个操作——**Retain（存入）**、**Recall（召回）**、**Reflect（反思）**——以及即时**触发器**。记忆事件触发时，触发器会启动 Zap，让记忆在 Hindsight 与 7,000 多个应用之间流动。

## 为什么这很重要 {#why-this-matters}

Zapier 可以连接各种服务：Gmail、Slack、Sheets、HubSpot、Notion、表单以及数千种其他应用。单独使用时，这些 Zap **没有状态**。接入 Hindsight 后，你可以：

- 将每张已关闭工单、表单提交或通话摘要通过 **Retain（存入）** 写入记忆库
- 在 AI 步骤之前通过 **Recall（召回）** 获取相关上下文，让模型看到此前的历史记录
- 通过 **Reflect（反思）** 在 Zap 中直接获得综合生成且以记忆为依据的答案
- 在记忆操作完成的瞬间**触发** Zap（例如，在整合完成时通知 Slack）

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取 API 密钥，无需自行托管。
:::

1. 在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 注册（提供免费套餐），或选择[自托管](/developer/installation)
2. 在 Hindsight 控制面板中获取 API 密钥（`hsk_...`）

:::note 可用性
原生 Hindsight Zapier 应用（**Retain / Recall / Reflect** 步骤和触发器）目前处于**私有测试版**，尚未列入 Zapier 的公开应用目录，因此在 Zapier 中搜索 “Hindsight” 找不到它。请使用下方的 **Webhooks by Zapier** 方式。
:::

### Webhooks by Zapier {#webhooks-by-zapier}

Hindsight 的每项操作都是普通的 REST 调用，因此你可以使用 Zapier 内置的 **Webhooks by Zapier** 操作（或 **API Request**），无需安装任何内容：

- **方法：** `POST`
- **URL**（Hindsight Cloud）：
  - Retain（存入）— `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/memories`
  - Recall（召回）— `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/memories/recall`
  - Reflect（反思）— `https://api.hindsight.vectorize.io/v1/default/banks/<bank>/reflect`
- **请求头：** `Authorization: Bearer hsk_...` 和 `Content-Type: application/json`
- **请求正文：** 此操作对应的 JSON 载荷。确切字段请参阅 [API 参考](/api-reference)。

如果使用自托管，请将主机名替换为你自己的实例 URL；如果实例未启用身份认证，则移除 `Authorization` 请求头。

## 操作 {#actions}

### Retain（存入） {#retain}

将内容存入记忆库。调用返回后，Hindsight 会异步提取事实。

| 字段 | 说明 |
| --- | --- |
| 记忆库 | 要存入内容的记忆库（动态下拉列表；首次使用时自动创建） |
| 内容 | 要存入的自由文本 |
| 上下文 | 内容的可选上下文 |
| 标签 | 以逗号分隔的标签 |
| 时间戳 | 内容发生的时间（默认为当前时间） |

### Recall（召回，搜索） {#recall-search}

在记忆库中搜索与查询相关的记忆。

| 字段 | 说明 |
| --- | --- |
| 记忆库 | 要搜索的记忆库 |
| 查询 | 自然语言查询 |
| 预算 | `low` / `mid` / `high` |
| 标签 / 标签匹配方式 | 可选的标签筛选条件 |

### Reflect（反思，搜索） {#reflect-search}

获取由 LLM 综合生成、且以记忆库中的记忆为依据的答案。

| 字段 | 说明 |
| --- | --- |
| 记忆库 | 记忆库 |
| 查询 | 要回答的问题 |
| 预算 | `low` / `mid` / `high` |

## 触发器 {#triggers}

记忆库中的记忆事件完成时触发的即时触发器（REST Hooks）：

| 触发器 | 触发时机 |
| --- | --- |
| **Retain Completed（存入完成）** | 异步存入操作完成处理时 |
| **Consolidation Completed（整合完成）** | 记忆整合生成观测 / 心智模型时 |

## Zap 示例 {#example-zaps}

**客服助手** — Zendesk 的工单关闭触发器 → 在 Hindsight 中通过 **Retain（存入）** 保存解决方案。收到新工单 → 在 Hindsight 中通过 **Recall（召回）** 查找类似的历史问题 → OpenAI 起草第一条回复。

**记忆摘要** — Hindsight 的 **Consolidation Completed（整合完成）** 触发器 → 格式化新观测 → 发布到 Slack，让团队了解智能体学到了什么。

**每日准备** — 日历触发器 → Hindsight 的 **Reflect（反思）**（“What do we know about this prospect?”）→ 将答案附加到准备文档中。

## 来源 {#source}

- GitHub：[`hindsight-integrations/zapier`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zapier)
