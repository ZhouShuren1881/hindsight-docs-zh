---
title: "指南：通过 Hindsight 为 ContextForge 配置记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, contextforge, mcp, memory]
description: "将 Hindsight 记忆接入 ContextForge，让网关后的所有客户端通过统一 MCP 端点使用存储、召回和反思。"
image: /img/blog/guide-contextforge-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：通过 Hindsight 为 ContextForge 配置记忆](/img/blog/guide-contextforge-memory-with-hindsight.png)

为 **ContextForge 接入 Hindsight 记忆**的核心很简单：在 ContextForge 内将 Hindsight 注册为 MCP 后端，让 AI 工具连接 ContextForge，而不是直接连接 Hindsight。这样可以通过一个网关、一个认证层和统一入口，为所有兼容客户端提供长期记忆。

这种模式适合团队，因为 ContextForge 已解决认证、RBAC 和集中端点管理等网关问题。Hindsight 在此基础上添加记忆层：retain 存储持久上下文，recall 搜索内容，reflect 综合系统随时间学到的知识。

本指南介绍注册流程、单记忆库与多记忆库模式的选择，以及如何确认 ContextForge 确实提供了 Hindsight 工具。操作时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)。

<!-- truncate -->

> **快速步骤**
>
> 1. 启动 Hindsight 和 ContextForge，确保两者可以互相访问。
> 2. 在 ContextForge 中将 Hindsight 注册为 MCP 服务器。
> 3. 选择单记忆库或多记忆库模式。
> 4. 将客户端连接到 ContextForge 端点。
> 5. 确认 retain、recall 和 reflect 可见且可调用。

## 前置条件 {#prerequisites}

开始前，请准备：

- 正在运行的 Hindsight 部署，可以是本地、Kubernetes 或 Cloud
- 正在运行的 ContextForge 实例
- ContextForge 到 Hindsight 的网络连接
- 可注册服务器的 ContextForge 管理员权限

尚未确定 Hindsight 的运行方式时，请先阅读 [Hindsight Cloud](https://hindsight.vectorize.io) 或[快速开始](/developer/api/quickstart)，再添加网关层。

## 为什么结合使用 ContextForge 与 Hindsight {#why-pair-contextforge-with-hindsight}

需要为多个系统提供统一 MCP 入口时，ContextForge 很有用；智能体需要持久记忆而非无状态提示循环时，Hindsight 很有用。组合后可获得：

- 多个 MCP 后端共用一个认证端点
- 与其他服务器并列提供的记忆能力
- 集中访问控制
- 按团队或记忆库设计划分记忆范围

比起逐一将 Hindsight 直接连接到每个下游客户端，这种方式更清晰。

## 方式一：通过 ContextForge 界面注册 {#option-1-register-hindsight-in-the-contextforge-ui}

在 ContextForge 内：

1. 以管理员身份登录。
2. 打开 **Servers（服务器）**。
3. 点击 **Add Server（添加服务器）**。
4. 填写：
   - **Name（名称）**：`hindsight`
   - **URL**：Hindsight MCP 端点，通常为 `http://<host>:8888/mcp`
   - **Transport（传输方式）**：Streamable HTTP
5. 保存服务器。

测试或一次性配置时，这是最快的方式。

## 方式二：通过管理员 API 注册 {#option-2-register-hindsight-through-the-admin-api}

需要自动化时，可通过 ContextForge API 注册服务器。

```bash
TOKEN=$(curl -s -X POST https://your-contextforge.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}' \
  | jq -r '.access_token')

curl -X POST https://your-contextforge.com/admin/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hindsight",
    "url": "http://hindsight-api:8888/mcp",
    "transport": "streamable_http",
    "description": "Hindsight 记忆"
  }'
```

这种方式适合可重复的环境配置，无需手动点击管理界面。

## 单记忆库与多记忆库模式 {#single-bank-vs-multi-bank-mode}

Hindsight MCP 端点支持两种模式。

### 多记忆库模式 {#multi-bank-mode}

使用根 MCP 路径：

```text
http://hindsight-api:8888/mcp
```

该模式提供记忆库管理工具，允许客户端动态选择或创建记忆库。

适用于：

- 多个团队或工作流需要不同记忆库
- 网关需要灵活性
- 需要运行时选择记忆库

### 单记忆库模式 {#single-bank-mode}

使用固定记忆库的 URL：

```text
http://hindsight-api:8888/mcp/my-team-bank/
```

客户端无需选择记忆库，所有记忆操作固定到同一记忆库。

适用于：

- 一个 ContextForge 团队对应一个共享记忆库
- 希望客户端行为更简单
- 希望通过配置加强隔离

检索行为见 [Hindsight 召回 API](/developer/api/recall)，存储语义见 [Hindsight 存储 API](/developer/api/retain)。

## 将客户端连接到 ContextForge {#connect-clients-to-contextforge}

注册 Hindsight 后，客户端应连接 ContextForge MCP 端点，而不是直接连接 Hindsight。

例如，Claude Desktop 可使用：

```json
{
  "mcpServers": {
    "context-forge": {
      "url": "https://your-contextforge.com/mcp",
      "headers": {
        "Authorization": "Bearer <your-contextforge-token>"
      }
    }
  }
}
```

从客户端视角看，Hindsight 现在只是网关后的其中一项能力。

## 确认工具已提供 {#verify-the-tools-are-present}

注册后，通过 ContextForge 列出工具，确认包含 Hindsight。

```bash
curl -s -X POST https://your-contextforge.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

应能看到 retain、recall 和 reflect 等 Hindsight 工具。

可进行以下实际测试：

1. 用 retain 存储一条事实
2. 通过网关召回该事实
3. 用 reflect 根据已保存记忆生成综合答案

三个操作均能通过 ContextForge 完成，说明集成符合预期。

## 常见错误 {#common-mistakes}

### 注册了错误的 Hindsight URL {#registering-the-wrong-hindsight-url}

确保 ContextForge 指向 Hindsight 的 MCP 路径，而不只是 API 根地址。

### 需要严格隔离却选择多记忆库 {#choosing-multi-bank-when-you-really-want-strict-isolation}

团队始终应在同一记忆库中操作时，固定记忆库的 URL 通常更简单、更安全。

### 直接测试 Hindsight，而非通过 ContextForge {#testing-hindsight-directly-instead-of-through-contextforge}

这只能证明 Hindsight 正常，不能证明网关注册正确。

### 忘记验证权限 {#forgetting-to-verify-permissions}

ContextForge 认证范围配置错误时，即使 Hindsight 服务器正常，客户端也可能无法调用工具。

## 常见问题 {#faq}

### 每个客户端都应直接连接 Hindsight 吗？ {#should-every-client-connect-to-hindsight-directly}

采用 ContextForge 时不需要。网关的目的就是集中连接入口。

### Hindsight Cloud 支持这种模式吗？ {#is-hindsight-cloud-compatible-with-this-pattern}

支持，关键是 ContextForge 能否访问注册的 Hindsight 端点。

### 何时应为每个团队设置独立记忆库？ {#when-should-i-use-a-bank-per-team}

需要团队内部共享记忆、团队之间隔离时。

### 比逐工具手动添加 Hindsight 更好吗？ {#is-this-better-than-adding-hindsight-to-each-tool-manually}

对于有很多工具的团队，通常是。只有一个客户端时，直接配置往往更简单。

## 后续步骤 {#next-steps}

- 希望使用最简单的托管部署时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较跨工具记忆模式。
