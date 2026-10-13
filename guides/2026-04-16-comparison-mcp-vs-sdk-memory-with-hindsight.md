---
title: "对比：通过 MCP 或 SDK 使用 Hindsight 记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [comparison, mcp, sdk, memory]
description: "比较 Hindsight 的 MCP 与 SDK 记忆集成，为 AI 客户端、自定义应用和团队工作流选择合适方式。"
image: /img/blog/comparison-mcp-vs-sdk-memory-with-hindsight.png
hide_table_of_contents: true
---

![对比：通过 MCP 或 SDK 使用 Hindsight 记忆](/img/blog/comparison-mcp-vs-sdk-memory-with-hindsight.png)

选择 **Hindsight 的 MCP 或 SDK 记忆集成**，关键在于希望将集成边界放在哪里。需要现有客户端或智能体将 Hindsight 作为工具服务器使用时，MCP 很合适；自行编写应用逻辑、希望在代码中直接集成记忆时，SDK 更适合。

两者没有普遍优劣，解决的是不同的集成问题。MCP 为兼容客户端提供标准协议接口；SDK 则让你在代码库内更精细地控制路由、提示词和应用行为。

本文说明各自适用的场景、使用上的局限，以及常见情形下的默认选择。决定时可同时参考[文档首页](/)和[快速开始](/developer/api/quickstart)，了解实现细节。

<!-- truncate -->

> **简要结论**
>
> - 希望现有客户端或智能体以最少自定义代码连接 Hindsight，使用 **MCP**。
> - 自行构建应用，需要直接控制记忆库 ID、请求流程和记忆使用，使用 **SDK 集成**。
> - 客户端已良好支持 MCP 时，从 MCP 开始；整个应用由你编写时，从 SDK 开始。

## MCP 的实际含义 {#what-mcp-means-in-practice}

通过 MCP，Hindsight 在标准协议端点上提供 retain、recall 和 reflect 等工具，兼容客户端连接端点后即可调用。

客户端已经理解 MCP，而你不想从头编写自定义记忆层时，这种方式很合适。

例如：

- Claude Desktop
- Cursor
- Windsurf
- ChatGPT 连接器
- 通过其他平台搭建的 MCP 网关

其优势很直接：客户端连接后即可使用记忆，无需深入进行应用专属集成。

## SDK 集成的实际含义 {#what-sdk-integration-means-in-practice}

使用 SDK 时，应用通过包或客户端库直接调用 Hindsight。你决定何时创建工具、使用哪些记忆库 ID，以及如何将记忆接入请求处理流程。

拥有应用代码、希望记忆成为内部架构的一部分，而非仅作为外部工具端点时，这种方式更合适。

例如：

- Vercel AI SDK 应用
- AG2 或 Paperclip 等框架集成
- 自定义 API 后端
- 需要在请求处理函数中严格按用户路由的应用

## 并列对比 {#side-by-side-comparison}

| 维度 | MCP | SDK |
|---|---|---|
| 适用场景 | 已有兼容客户端 | 自行构建的应用 |
| 集成工作量 | 较低 | 较高 |
| 应用控制程度 | 较低 | 较高 |
| 协议标准化程度 | 较高 | 较低 |
| 记忆库路由控制 | 中等 | 高 |
| 适合非程序员使用工具 | 是 | 较少 |
| 适合自定义产品逻辑 | 有时 | 是 |

## 何时优先选择 MCP {#when-mcp-is-the-better-choice}

以下情况更适合 MCP：

- 客户端已良好支持 MCP
- 需要标准工具接口
- 希望避免编写记忆衔接代码
- 希望多个工具共享一个端点

因此 MCP 对桌面 AI 工具和多客户端环境很有吸引力。配置端点并授权后，记忆工具就会出现。

若在探索本地部署，可继续阅读[快速开始](/developer/api/quickstart)和 [Hindsight 召回 API](/developer/api/recall)。

## 何时优先选择 SDK {#when-sdk-integration-is-the-better-choice}

以下情况更适合 SDK 集成：

- 已掌控请求处理函数或后端代码
- 需要明确的按用户或租户记忆库路由
- 记忆应深入集成应用逻辑
- 希望精确决定何时执行 retain 或 recall

对产品开发者而言，这通常是更好的方式。自定义逻辑越深入，直接集成的价值越大。

存储和路由行为见 [Hindsight 存储 API](/developer/api/retain)。

## 核心取舍 {#the-key-tradeoff}

主要区别在于**决策逻辑位于哪里**。

- 使用 **MCP** 时，客户端决定何时及如何调用工具。
- 使用 **SDK 集成**时，应用决定记忆如何融入工作流。

因此 MCP 通常更快上手，而 SDK 集成通常更有利于保证产品层面的正确性和隔离。

## 常见示例 {#common-examples}

### 以下情况选择 MCP {#choose-mcp-when}

- 为 Claude Desktop 连接记忆
- 希望 Cursor 或 Windsurf 快速使用 Hindsight
- 通过 ContextForge 等网关提供记忆
- 希望多个客户端共享同一协议接口

### 以下情况选择 SDK {#choose-sdk-when}

- 构建 Vercel AI SDK 产品
- AG2 或 Paperclip 工作流需要感知请求的记忆库路由
- 希望服务端逻辑控制记忆行为
- 需要更严格的隔离保证

## 迁移说明 {#migration-notes}

许多团队先使用 MCP，因为测试很快。记忆后来成为产品核心能力时，再将关键流程迁移到 SDK，由应用掌控记忆库路由和存储时机。

反向迁移也很常见。自定义应用团队之后仍可通过 MCP 将同一记忆库开放给开发工具或支持客户端。

## 常见问题 {#faq}

### MCP 的能力比 SDK 集成弱吗？ {#is-mcp-less-capable-than-sdk-integration}

不完全是，区别主要在控制程度，而非能力。

### SDK 集成总是更费工吗？ {#is-sdk-integration-always-more-work}

通常是，但额外工作往往换来更好的应用层保证。

### 可以同时使用两者吗？ {#can-i-use-both}

可以。许多团队在产品内使用 SDK，外围工具使用 MCP。

### 应从哪种方式开始？ {#which-one-should-i-start-with}

客户端已支持 MCP 时从 MCP 开始；已有应用后端时从 SDK 开始。

## 后续步骤 {#next-steps}

- 希望使用最简单的托管部署时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较团队模式。
