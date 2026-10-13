---
title: "指南：通过 Hindsight 为 Paperclip 添加记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, paperclip, agents, memory]
description: "为 Paperclip 添加跨周期运行与会话的持久记忆，让智能体使用存储、召回和反思，而非每次从零开始。"
image: /img/blog/guide-paperclip-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：通过 Hindsight 为 Paperclip 添加记忆](/img/blog/guide-paperclip-memory-with-hindsight.png)

为 **Paperclip 添加 Hindsight 记忆**，关键是在周期运行（heartbeat）循环执行前调用 recall，执行后调用 retain，让智能体跨周期保留持久记忆，而非每次从零开始。

周期运行的智能体经常重复昂贵的上下文收集，重新发现用户偏好、重试失败方案，并丢失此前结果。Hindsight 提供长期记忆层，让下次运行利用上次学到的内容。

本指南涵盖快速开始、HTTP 和进程适配器模式、按公司和智能体隔离记忆库，以及确认记忆层有效的检查。操作时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)。

<!-- truncate -->

> **快速步骤**
>
> 1. 安装 `@vectorize-io/hindsight-paperclip`。
> 2. 加载配置，在周期执行前调用 recall。
> 3. 智能体输出后调用 retain。
> 4. 除非明确需要共享，否则按公司和智能体划分记忆库 ID。
> 5. 确认后续周期能读取此前存储的内容。

## 前置条件 {#prerequisites}

开始前，请准备：

- 已按周期运行模式工作的 Paperclip 智能体
- Hindsight 后端：[Hindsight Cloud](https://ui.hindsight.vectorize.io)（推荐，有免费额度，无需运行基础设施）或[自行托管](https://hindsight.vectorize.io/developer/installation)
- 稳定的 `companyId` 和 `agentId`

标识符设计很重要。Paperclip 的默认隔离模式适合多租户部署，因为两者能清晰映射。

## 第一步：安装集成 {#step-1-install-the-integration}

安装 Paperclip 包：

```bash
npm install @vectorize-io/hindsight-paperclip
```

然后从环境加载配置。

```typescript
import { recall, retain, loadConfig } from '@vectorize-io/hindsight-paperclip'

const config = loadConfig()
```

加载器读取 Hindsight 地址和令牌配置，无需手动配置每个请求。

## 第二步：每次周期运行前召回记忆 {#step-2-recall-memory-before-each-heartbeat}

运行前，查询 Hindsight 获取历史上下文。

```typescript
const memories = await recall({
  companyId,
  agentId,
  query: `${task.title}\n${task.description}`,
}, config)

if (memories) {
  systemPrompt = `历史上下文：\n${memories}\n\n${systemPrompt}`
}
```

这一步至关重要。频繁运行本身不会让智能体有状态，运行前注入相关历史才会。

## 第三步：周期运行后存储输出 {#step-3-retain-output-after-the-heartbeat}

运行结束后，存储智能体学到或生成的内容。

```typescript
await retain({
  companyId,
  agentId,
  content: agentOutput,
  documentId: runId,
}, config)
```

这构成反馈循环：一次运行为下一次提供上下文。

## 默认记忆库隔离机制 {#how-the-default-bank-isolation-works}

Paperclip 的默认记忆库名称由公司和智能体 ID 构成：

```text
paperclip::{companyId}::{agentId}
```

这是合理默认值，可避免无关租户和智能体的记忆互相混入。

常见替代方案：

- **仅按公司**：同一公司的多个智能体共享记忆
- **仅按智能体**：一个智能体跨公司上下文保留记忆
- **自定义前缀**：使用自己的记忆库命名空间

深入了解检索可阅读 [Hindsight 召回 API](/developer/api/recall)，了解存储内容和方式可阅读[存储 API](/developer/api/retain)。

## HTTP 适配器集成 {#http-adapter-integration}

Paperclip 智能体作为 HTTP webhook 服务器运行时，使用中间件方式。

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
    ? `历史上下文：\n${memories}\n\n当前任务：${context.taskDescription}`
    : `任务：${context.taskDescription}`

  const output = await runYourAgent(prompt)
  res.json({ output })
})
```

Paperclip 已作为服务运行，且希望记忆参与请求生命周期时，这是合适选择。

## 进程适配器集成 {#process-adapter-integration}

Paperclip 智能体作为脚本运行时，使用进程式召回和存储流程。

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
  console.log(`[记忆上下文]\n${memories}`)
}

await retain({
  agentId: PAPERCLIP_AGENT_ID!,
  companyId: PAPERCLIP_COMPANY_ID!,
  content: agentOutput,
  documentId: PAPERCLIP_RUN_ID!,
}, config)
```

周期任务通过进程适配器而非 HTTP 请求调用时，这种方式更合适。

## 验证记忆是否有效 {#verify-that-memory-is-working}

简单验证流程：

1. 第一次周期运行存储一条事实或经验
2. 第二次询问同一问题
3. 第二次能读取相关上下文，无需手动重述

例如：

- 第一次学到某客户总是希望先收到 Slack 通知，再收到邮件
- 第二次从记忆读取该偏好，并自动应用

这就是需要确认的实际行为。

## 常见错误 {#common-mistakes}

### 将日志当作记忆 {#treating-logs-as-memory}

原始日志不等同于有用记忆，目标是保存有意义、可复用的上下文。

### 选择错误的记忆库粒度 {#choosing-the-wrong-bank-granularity}

范围过大可能混合不同租户或智能体的内容。

### 忘记运行后的存储步骤 {#forgetting-the-post-run-retain-step}

只有召回没有存储，记忆会过时；只有存储没有召回，记忆不会被使用。

### 只测试一次运行 {#testing-only-one-run}

至少需要两次运行，才能看出记忆是否累积。

## 常见问题 {#faq}

### Paperclip 必须使用 Hindsight Cloud 吗？ {#does-paperclip-need-hindsight-cloud}

不必，自托管 Hindsight 也可以。

### 公司内所有智能体都应共享记忆吗？ {#should-i-share-memory-across-all-agents-in-a-company}

仅当这是预期行为时。公司级共享很强大，但应明确选择。

### 中间件是唯一的集成方式吗？ {#is-middleware-the-only-integration-option}

不是，包同时支持 HTTP 和进程适配器模式。

### 可以用于团队知识而非仅用户偏好吗？ {#can-i-use-this-for-team-knowledge-not-just-user-preferences}

可以，操作结果、反复失败的情况和运维知识都很适合。

## 后续步骤 {#next-steps}

- 希望使用托管后端时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较共享知识模式。
