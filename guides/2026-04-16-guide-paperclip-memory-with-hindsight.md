---
title: "指南：使用 Hindsight 为 Paperclip 添加记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, paperclip, agents, memory]
description: "为 Paperclip 添加 Hindsight 记忆，让智能体在每个心跳周期和会话之间存入、召回并反思记忆，而不是每次运行都从零开始。"
image: /img/blog/guide-paperclip-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Paperclip 添加记忆](/img/blog/guide-paperclip-memory-with-hindsight.png)

如果要**为 Paperclip 添加 Hindsight 记忆**，关键是在 Paperclip 心跳循环执行前调用 Hindsight 的 Recall（召回），并在执行后调用 Retain（存入）。这样，Paperclip 智能体就能在多个心跳周期之间保留持久记忆，而不必每次运行都从零开始。

这很有用，因为基于心跳运行的智能体常常反复进行成本高昂的上下文收集。它们会重新发现相同的用户偏好、重试同样失败的方法，也会丢失先前运行的结果。Hindsight 为 Paperclip 提供长期记忆层，让下一个心跳周期能够承接上一次的学习成果。

本指南介绍快速入门路径、HTTP 和进程适配器模式、按公司和智能体隔离记忆库，以及确认记忆层确实正常工作的检查方法。操作时请打开[文档首页](/)和[快速开始指南](/developer/api/quickstart)作为参考。

<!-- truncate -->

> **简要回答**
>
> 1. 安装 `@vectorize-io/hindsight-paperclip`。
> 2. 加载配置，并在心跳执行前调用 recall。
> 3. 智能体生成输出后调用 retain。
> 4. 除非有意共享记忆，否则按公司和智能体限定 bank ID 的范围。
> 5. 验证后续心跳能看到先前心跳存储的内容。

## 前置条件 {#prerequisites}

开始前，请确保具备以下条件：

- 一个已通过心跳模型运行的 Paperclip 智能体
- 一个 Hindsight 后端：[Hindsight Cloud](https://ui.hindsight.vectorize.io)（推荐：提供免费套餐，无需运行基础设施）或[自行托管](/developer/installation)
- 稳定的 `companyId` 和 `agentId` 标识符

标识符设计很重要。Paperclip 的默认隔离模式很合适，因为它能清晰映射到多租户设置。

## 第一步：安装集成 {#step-1-install-the-integration}

安装 Paperclip 包：

```bash
npm install @vectorize-io/hindsight-paperclip
```

然后从环境中加载配置。

```typescript
import { recall, retain, loadConfig } from '@vectorize-io/hindsight-paperclip'

const config = loadConfig()
```

加载器会读取 Hindsight URL 和令牌配置，因此你无需手动配置每个请求。

## 第二步：在每次心跳前召回记忆 {#step-2-recall-memory-before-each-heartbeat}

心跳运行前，向 Hindsight 查询先前的上下文。

```typescript
const memories = await recall({
  companyId,
  agentId,
  query: `${task.title}\n${task.description}`,
}, config)

if (memories) {
  systemPrompt = `Past context:\n${memories}\n\n${systemPrompt}`
}
```

这是关键步骤。智能体不会因为频繁运行就自动拥有状态；只有在新一轮运行开始前注入相关历史，它才能利用已有状态。

## 第三步：心跳结束后存入输出 {#step-3-retain-output-after-the-heartbeat}

心跳完成后，存储智能体学到或生成的内容。

```typescript
await retain({
  companyId,
  agentId,
  content: agentOutput,
  documentId: runId,
}, config)
```

这就形成了反馈循环：一次心跳为下一次心跳提供上下文。

## 默认的记忆库隔离方式 {#how-the-default-bank-isolation-works}

Paperclip 的默认 bank 格式由公司 ID 和智能体 ID 组成：

```text
paperclip::{companyId}::{agentId}
```

这是一个不错的默认设置，因为它能防止无关租户和智能体的内容彼此混入。

常见的替代方式：

- **仅按公司隔离**：同一公司内的多个智能体需要共享同一份记忆时使用
- **仅按智能体隔离**：同一个智能体需要在多个公司上下文之间延续记忆时使用
- **自定义前缀**：需要使用自己的 bank 命名空间方案时使用

如果之后想更深入地了解检索行为，请查看 [Hindsight 的 recall API](/developer/api/recall)。如果想了解存储哪些内容以及如何存储，请查看 [Hindsight 的 retain API](/developer/api/retain)。

## HTTP 适配器集成 {#http-adapter-integration}

如果 Paperclip 智能体作为 HTTP webhook 服务器运行，请使用中间件路径。

```typescript
import express from 'express'
import { createMemoryMiddleware, loadConfig } from '@vectorize-io/hindsight-paperclip'
import type { HindsightRequest } from '@vectorize-io/hindsight-paperclip'

const app = express()
app.use(express.json())
app.use(createMemoryMiddleware(loadConfig()))

app.post('/heartbeat', async (req, res) => {
  const { memories } = (req as HindsightRequest).hindsight
  const { context } = req.body

  const prompt = memories
    ? `Past context:\n${memories}\n\nCurrent task: ${context.taskDescription}`
    : `Task: ${context.taskDescription}`

  const output = await runYourAgent(prompt)
  res.json({ output })
})
```

如果 Paperclip 已作为服务运行，并且你希望记忆成为请求生命周期的一部分，这种方式很合适。

## 进程适配器集成 {#process-adapter-integration}

如果 Paperclip 智能体作为脚本运行，请使用进程式的 recall 和 retain 流程。

```typescript
import { recall, retain, loadConfig } from '@vectorize-io/hindsight-paperclip'

const config = loadConfig()
const { PAPERCLIP_AGENT_ID, PAPERCLIP_COMPANY_ID, PAPERCLIP_RUN_ID } = process.env

const memories = await recall({
  agentId: PAPERCLIP_AGENT_ID!,
  companyId: PAPERCLIP_COMPANY_ID!,
  query: process.env.TASK_DESCRIPTION ?? '',
}, config)

if (memories) {
  console.log(`[Memory Context]\n${memories}`)
}

await retain({
  agentId: PAPERCLIP_AGENT_ID!,
  companyId: PAPERCLIP_COMPANY_ID!,
  content: agentOutput,
  documentId: PAPERCLIP_RUN_ID!,
}, config)
```

如果心跳是通过进程适配器而不是 HTTP 请求路径调用的，这种方式更合适。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

一种简单的验证流程是：

1. 第一次心跳存入一条事实或经验
2. 第二次心跳询问同一问题
3. 第二次运行无需你手动重新编码，就能获得相关上下文

例如：

- 第一次运行得知某位客户总是希望先收到 Slack 通知，再收到邮件
- 第二次运行从记忆中读到该偏好，并自动采用这种做法

这就是你需要确认的实际效果。

## 常见错误 {#common-mistakes}

### 把日志当作记忆 {#treating-logs-as-memory}

原始日志并不等同于有用的记忆。重点是存储有意义且可复用的上下文。

### 记忆库粒度选择不当 {#choosing-the-wrong-bank-granularity}

如果意外地把记忆范围设得太广，不同租户或智能体的内容就可能相互混杂。

### 忘记在运行后调用 retain {#forgetting-the-post-run-retain-step}

只调用 recall 而不调用 retain，会让记忆停留在过时状态；只调用 retain 而不调用 recall，则记忆不会被使用。

### 只测试一次运行 {#testing-only-one-run}

至少需要运行两次，才能看出记忆是否真正累积起来。

## 常见问题 {#faq}

### Paperclip 必须使用 Hindsight Cloud 吗？ {#does-paperclip-need-hindsight-cloud}

不必。自托管的 Hindsight 也可以使用。

### 公司内所有智能体都应该共享记忆吗？ {#should-i-share-memory-across-all-agents-in-a-company}

只有在这是预期行为时才应该这样做。公司级共享功能很强大，但应由你明确选择。

### 中间件是唯一的集成方式吗？ {#is-middleware-the-only-integration-option}

不是。该包同时支持 HTTP 和进程适配器模式。

### 这能用于团队知识，而不只是用户偏好吗？ {#can-i-use-this-for-team-knowledge-not-just-user-preferences}

可以。流程执行结果、反复出现的失败情况和运维知识都很适合存入记忆。

## 后续步骤 {#next-steps}

- 如果想使用托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [完整的 Hindsight 文档](/)
- 按照[快速开始指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 recall API](/developer/api/recall)
- 查看 [Hindsight 的 retain API](/developer/api/retain)
- 在[面向 AI 编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较团队共享知识模式
