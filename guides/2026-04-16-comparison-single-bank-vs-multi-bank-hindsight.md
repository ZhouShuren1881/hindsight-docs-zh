---
title: "对比：Hindsight 单记忆库与多记忆库"
authors: [benfrank241]
date: 2026-04-16
tags: [comparison, banks, mcp, memory]
description: "比较 Hindsight 单记忆库和多记忆库部署，为单个智能体、团队或多个客户端选择合适的记忆隔离模型。"
image: /img/blog/comparison-single-bank-vs-multi-bank-hindsight.png
hide_table_of_contents: true
---

![对比：Hindsight 单记忆库与多记忆库](/img/blog/comparison-single-bank-vs-multi-bank-hindsight.png)

选择 **Hindsight 单记忆库或多记忆库**时，关键不在于哪个更先进，而在于哪个符合记忆边界：是将一个客户端或工作流固定到同一记忆库，还是需要动态使用多个记忆库？

两种模式都合理，也都内置于 Hindsight。选择取决于所需灵活性、隔离模型的严格程度，以及是否应允许客户端在运行时选择记忆库。

本文介绍取舍、适用场景，以及选择更安全默认模式的实用规则。阅读时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)，了解实现细节。

<!-- truncate -->

> **简要结论**
>
> - 一个客户端、智能体或团队应始终在同一记忆库中工作时，使用**单记忆库模式**。
> - 调用方需要动态创建、选择或切换记忆库时，使用**多记忆库模式**。
> - 不确定时，从单记忆库模式开始，更简单也更安全。

## 两种模式的含义 {#what-each-mode-means}

### 单记忆库模式 {#single-bank-mode}

单记忆库模式将记忆库固定在 MCP URL 或客户端配置中。

例如：

```text
http://localhost:8888/mcp/my-bank/
```

所有记忆操作都固定到 `my-bank`，客户端不必每次传入 `bank_id`。

### 多记忆库模式 {#multi-bank-mode}

多记忆库模式连接根 MCP 端点：

```text
http://localhost:8888/mcp/
```

工具层可以动态选择、创建或切换记忆库。除核心记忆操作外，此模式还提供记忆库管理工具。

## 并列对比 {#side-by-side-comparison}

| 维度 | 单记忆库 | 多记忆库 |
|---|---|---|
| 配置复杂度 | 较低 | 较高 |
| 默认隔离 | 更强 | 若未谨慎管理则较弱 |
| 记忆库选择 | 由配置固定 | 运行时选择 |
| 适用场景 | 单个用户、应用或团队 | 多租户工具、动态工作流 |
| 客户端简洁程度 | 较高 | 较低 |
| 运维灵活性 | 较低 | 较高 |
| 跨记忆库误操作风险 | 较低 | 较高 |

## 何时优先选择单记忆库 {#when-single-bank-mode-is-the-better-choice}

以下情况更适合单记忆库：

- 一个客户端始终使用同一记忆库
- 团队共享一个项目记忆库
- 希望 MCP 配置尽可能简单
- 不希望客户端决定记忆存到哪里

这通常是编程工具、个人助手和按项目划分的智能体最安全的默认选择。

优势包括：

- 组成部分更少
- 路由逻辑更少
- 意外泄露记忆的机会更少
- 召回异常时更容易调试

已明确记忆边界时，在配置中固定记忆库通常是正确选择。

## 何时优先选择多记忆库 {#when-multi-bank-mode-is-the-better-choice}

以下情况适合多记忆库：

- 一个服务处理多个用户或租户
- 工具跨多个项目工作
- 智能体需要在工作流中创建和切换记忆库
- 构建通用记忆平台，而非单用途客户端

这种方式更灵活，但应用逻辑承担更多责任。

选择多记忆库时，路由规则至关重要。系统必须可靠地判断每个记忆库属于哪个用户、项目或团队。

## 最重要的实际取舍 {#the-biggest-practical-tradeoff}

主要区别在于**谁掌控路由**。

- **单记忆库模式**由配置掌控路由。
- **多记忆库模式**由应用或客户端工作流掌控路由。

这个区别看似不大，却改变了故障形式。

单记忆库的错误通常是“我将客户端配置到了错误的记忆库”。

多记忆库的错误可能是“客户端在运行时将记忆存入了错误的记忆库”，通常更加危险。

召回本身的底层搜索系统相同。深入了解检索和存储，可阅读 [Hindsight 召回 API](/developer/api/recall) 和[存储 API](/developer/api/retain)。

## 常见示例 {#common-examples}

### 单记忆库示例 {#single-bank-examples}

- 一个代码仓库对应一套 Claude Code 配置
- 后端服务的团队共享记忆库
- 一个 Paperclip 公司与智能体记忆库
- 将 OpenCode 固定到项目记忆库

### 多记忆库示例 {#multi-bank-examples}

- 服务多个客户的托管支持智能体
- 提供多个团队记忆库的 MCP 网关
- 为每位用户提供记忆的 SaaS 产品
- 按租户动态创建记忆库的内部工具

## 迁移说明 {#migration-notes}

最简单的迁移路线通常是：

1. 从单记忆库模式开始
2. 确认记忆行为确实有用
3. 只有真正出现路由需求时，才转向多记忆库

也可以反向迁移。若多记忆库部署对当前问题过于灵活，将重要客户端重新固定为单记忆库，往往能快速减少混乱。

## 实用决策规则 {#decision-rule-of-thumb}

只需问自己：

> 这个客户端是否需要在运行时选择其他记忆库？

- 如果**不需要**，使用单记忆库。
- 如果**需要**，使用多记忆库。

这条简单规则适用于大多数部署。

## 常见问题 {#faq}

### 多记忆库更强大吗？ {#is-multi-bank-mode-more-powerful}

是，但更强大不一定更好。只有真正需要时，额外灵活性才有价值。

### 单记忆库会限制召回质量吗？ {#does-single-bank-mode-limit-recall-quality}

不会。召回引擎相同，变化的是路由模型。

### 团队使用哪种模式更安全？ {#which-mode-is-safer-for-teams}

通常是单记忆库，除非团队明确在构建多租户或多工作区工具。

### MCP 网关更适合哪种模式？ {#which-mode-is-better-for-mcp-gateways}

通常是多记忆库，因为网关经常承接多个工作流或团队。

## 后续步骤 {#next-steps}

- 希望使用最简单的托管部署时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较共享工作流。
