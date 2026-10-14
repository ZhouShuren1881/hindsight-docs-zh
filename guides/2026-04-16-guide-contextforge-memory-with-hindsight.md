---
title: "指南：通过 Hindsight 为 ContextForge 配置记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, contextforge, mcp, memory]
description: "将 Hindsight 记忆接入 ContextForge，让网关后的所有客户端通过统一 MCP 端点使用存入、召回和反思功能。"
image: /img/blog/guide-contextforge-memory-with-hindsight.png
hide_table_of_contents: true
---

![指南：通过 Hindsight 为 ContextForge 配置记忆](/img/blog/guide-contextforge-memory-with-hindsight.png)

如果你想让 **ContextForge 接入 Hindsight 记忆**，核心做法很简单：在 ContextForge 中将 Hindsight 注册为 MCP 后端，然后让 AI 工具连接 ContextForge，而不是直接连接 Hindsight。这样，所有兼容客户端都能通过同一个网关、同一层身份认证和统一入口使用长期记忆。

这种组合很适合团队使用，因为 ContextForge 已经解决了身份认证、RBAC 和集中管理端点等网关问题。Hindsight 则在此基础上提供记忆层：Retain（存入）用于保存持久上下文，Recall（召回）用于检索记忆，Reflect（反思）用于综合系统随时间积累的信息。

本指南将介绍注册流程，说明何时应使用单记忆库或多记忆库模式，并演示如何确认 ContextForge 确实提供了 Hindsight 工具。操作时请备好[文档首页](/)和[快速开始指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 启动 Hindsight 和 ContextForge，并确保它们可以互相访问。
> 2. 在 ContextForge 中将 Hindsight 注册为 MCP 服务器。
> 3. 选择让 ContextForge 以单记忆库还是多记忆库模式提供 Hindsight。
> 4. 将客户端连接到 ContextForge 的端点，而不是直接连接 Hindsight。
> 5. 确认 Retain、Recall 和 Reflect 均可见且可调用。

## 前置条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 正在运行的 Hindsight 部署，可以是本地部署、Kubernetes 部署或 Cloud
- 正在运行的 ContextForge 实例
- ContextForge 到 Hindsight 的网络连接
- 在 ContextForge 注册服务器所需的管理员权限

如果你还在决定如何运行 Hindsight，请先了解 [Hindsight Cloud](https://hindsight.vectorize.io) 或阅读[快速开始指南](/developer/api/quickstart)，再添加网关层。

## 为什么要将 ContextForge 与 Hindsight 配合使用 {#why-pair-contextforge-with-hindsight}

当你需要为多个系统提供统一的 MCP 入口时，ContextForge 很有用；当智能体需要持久记忆，而不是无状态的提示循环时，Hindsight 很有用。将两者结合后，你可以获得：

- 一个经过身份认证的端点，供多个 MCP 后端共用
- 与其他服务器并列提供的记忆能力
- 集中式访问控制
- 按团队或记忆库设计来限定记忆范围

与逐一将 Hindsight 直接接入每个下游客户端相比，这种方式更简洁。

## 方式一：通过 ContextForge 界面注册 Hindsight {#option-1-register-hindsight-in-the-contextforge-ui}

在 ContextForge 中：

1. 以管理员身份登录。
2. 打开 **Servers（服务器）**。
3. 点击 **Add Server（添加服务器）**。
4. 填写以下信息：
   - **Name（名称）**：`hindsight`
   - **URL**：Hindsight 的 MCP 端点，通常为 `http://<host>:8888/mcp`
   - **Transport（传输方式）**：Streamable HTTP
5. 保存服务器。

如果你正在测试或进行一次性配置，这是最快的方式。

## 方式二：通过管理员 API 注册 Hindsight {#option-2-register-hindsight-through-the-admin-api}

如果你希望自动化配置，可以通过 ContextForge API 注册服务器。

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
    "description": "Hindsight memory"
  }'
```

如果你希望环境配置可以重复执行，而不是每次手动点击管理界面，这种方式会很有用。

## 单记忆库模式与多记忆库模式 {#single-bank-vs-multi-bank-mode}

Hindsight 的 MCP 端点支持两种模式。

### 多记忆库模式 {#multi-bank-mode}

使用根 MCP 路径：

```text
http://hindsight-api:8888/mcp
```

这种模式会提供记忆库管理工具，让客户端可以动态选择或创建记忆库。

适用于以下情况：

- 多个团队或工作流需要使用不同的记忆库
- 网关需要保持灵活
- 你希望在运行时选择记忆库

### 单记忆库模式 {#single-bank-mode}

使用固定到某个记忆库的 URL：

```text
http://hindsight-api:8888/mcp/my-team-bank/
```

这样客户端就不必选择记忆库，所有记忆操作都会固定到同一个记忆库。

适用于以下情况：

- 一个 ContextForge 团队应对应一个共享记忆库
- 你希望简化客户端的行为
- 你希望通过配置加强隔离

有关更深入的召回行为，请参阅 [Hindsight 召回 API](/developer/api/recall)；有关存储语义，请参阅 [Hindsight 存入 API](/developer/api/retain)。

## 将客户端连接到 ContextForge {#connect-clients-to-contextforge}

注册 Hindsight 后，客户端应连接到 ContextForge 的 MCP 端点，而不是直接连接 Hindsight。

例如，Claude Desktop 可以使用以下配置：

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

从客户端的角度看，Hindsight 现在只是网关后端提供的一项能力。

## 验证工具是否已提供 {#verify-the-tools-are-present}

完成注册后，通过 ContextForge 列出工具，确认其中包含 Hindsight 工具。

```bash
curl -s -X POST https://your-contextforge.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

你应该能看到 Retain、Recall 和 Reflect 等 Hindsight 工具。

可以按以下步骤进行实际测试：

1. 使用 Retain 存入一条事实。
2. 通过网关召回这条事实。
3. 使用 Reflect 针对已保存的记忆生成综合答案。

如果这三个操作都能通过 ContextForge 完成，说明集成按预期工作。

## 常见错误 {#common-mistakes}

### 注册了错误的 Hindsight URL {#registering-the-wrong-hindsight-url}

确保 ContextForge 指向 Hindsight 的 MCP 路径，而不只是 API 根地址。

### 想要严格隔离却选择了多记忆库模式 {#choosing-multi-bank-when-you-really-want-strict-isolation}

如果一个团队应始终使用同一个记忆库，固定记忆库的 URL 通常更简单、更安全。

### 直接测试 Hindsight，而不是通过 ContextForge {#testing-hindsight-directly-instead-of-through-contextforge}

这样只能证明 Hindsight 可以工作，无法证明网关注册正确。

### 忘记验证权限 {#forgetting-to-verify-permissions}

如果 ContextForge 的身份认证范围配置不正确，即使 Hindsight 服务器运行正常，客户端也可能无法使用这些工具。

## 常见问题 {#faq}

### 每个客户端都应该直接连接 Hindsight 吗？ {#should-every-client-connect-to-hindsight-directly}

如果你打算使用 ContextForge，就不需要这样做。网关的作用是集中管理连接入口。

### Hindsight Cloud 兼容这种模式吗？ {#is-hindsight-cloud-compatible-with-this-pattern}

兼容。关键在于 ContextForge 能否访问你注册的 Hindsight 端点。

### 什么时候应该为每个团队设置独立的记忆库？ {#when-should-i-use-a-bank-per-team}

当记忆需要在团队内部共享，同时与其他团队隔离时。

### 这比逐一为每个工具手动添加 Hindsight 更好吗？ {#is-this-better-than-adding-hindsight-to-each-tool-manually}

对于使用许多工具的团队，通常更好。对于单个客户端，直接配置往往更简单。

## 后续步骤 {#next-steps}

- 如果你希望使用最简单的托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速开始指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 召回 API](/developer/api/recall)。
- 查阅 [Hindsight 存入 API](/developer/api/retain)。
- 阅读[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，比较跨工具的记忆模式。
