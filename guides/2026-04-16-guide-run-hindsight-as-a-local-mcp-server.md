---
title: "指南：将 Hindsight 作为本地 MCP 服务器运行"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, mcp, local, memory]
description: "使用嵌入式 PostgreSQL 在本地运行 Hindsight MCP 服务器，无需额外基础设施即可为 Claude、Cursor 等 MCP 客户端提供持久记忆。"
image: /img/blog/guide-run-hindsight-as-a-local-mcp-server.png
hide_table_of_contents: true
---

![指南：将 Hindsight 作为本地 MCP 服务器运行](/img/blog/guide-run-hindsight-as-a-local-mcp-server.png)

如果你想**将 Hindsight 作为本地 MCP 服务器运行**，好消息是，整个配置过程比听起来简单。Hindsight 可以在本地使用嵌入式 PostgreSQL 数据库运行，在你的机器上公开 MCP 端点，并为 Claude Code、Claude Desktop、Cursor 和 Windsurf 等工具提供持久记忆，无需另行配置外部数据库。

这种模式很适合个人使用、开发和重视隐私的部署。你无需通过公共端点公开记忆，也不必先管理完整的托管环境，只需启动一个本地进程，再将 MCP 客户端连接到 `localhost`。

本指南将带你完成本地服务器的启动流程，说明单记忆库和多记忆库模式，并介绍如何在实际使用前确认 MCP 工具正常工作。操作时请备好[文档首页](/)和[快速开始指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 使用你偏好的 LLM 服务提供方启动 `hindsight-local-mcp`。
> 2. 将 MCP 客户端连接到 `http://localhost:8888/mcp/`。
> 3. 选择多记忆库模式，或固定使用单记忆库 URL。
> 4. 重启客户端，让记忆工具显示出来。
> 5. 用一个简短的记忆检查测试 Retain（存入）、Recall（召回）和 Reflect（反思）。

## 前置条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 一台能够运行本地服务器的机器
- 一个 LLM 服务提供方的密钥；如果使用 Ollama 等本地模型，则无需此密钥
- 一个兼容 MCP 的客户端，例如 Claude Code、Claude Desktop、Cursor 或 Windsurf

如果你希望完全跳过本地基础设施，[Hindsight Cloud](https://hindsight.vectorize.io) 是更简单的托管替代方案。

## 第一步：启动本地 MCP 服务器 {#step-1-start-the-local-mcp-server}

最简单的本地启动命令是：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... uvx --from hindsight-api hindsight-local-mcp
```

如果你想使用 Ollama，而不是云服务提供方：

```bash
HINDSIGHT_API_LLM_PROVIDER=ollama \
HINDSIGHT_API_LLM_MODEL=llama3.2 \
uvx --from hindsight-api hindsight-local-mcp
```

该命令会在本地启动完整的 Hindsight API，并在以下地址公开 MCP 端点：

```text
http://localhost:8888/mcp/
```

在幕后，Hindsight 还会启动一个嵌入式 PostgreSQL 数据库，因此你无需仅为了在本地测试或使用记忆而另行配置数据库服务。

## 本地服务器实际包含什么 {#what-the-local-server-actually-includes}

本地 MCP 服务器并非一个轻量的演示封装。它会在本地运行完整的记忆 API，包括：

- Retain（存入）
- Recall（召回）
- Reflect（反思）
- 心智模型工具
- 文档工具
- 多记忆库模式下的记忆库管理工具

因此，它既适用于开发，也适合日常的单用户使用场景。

有关检索的详情，请参阅 [Hindsight 的 Recall API](/developer/api/recall)；有关存储的详情，请参阅 [Hindsight 的 Retain API](/developer/api/retain)。

## 第二步：选择多记忆库或单记忆库模式 {#step-2-choose-multi-bank-or-single-bank-mode}

Hindsight 在本地支持这两种模式。

### 多记忆库模式 {#multi-bank-mode}

使用 MCP 根路径：

```text
http://localhost:8888/mcp/
```

此模式会公开所有工具，包括记忆库管理工具。如果你想使用多个记忆库，或让智能体在每次请求中指定记忆库，就应选择此模式。

Claude Code 配置示例：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

### 单记忆库模式 {#single-bank-mode}

使用固定到某个记忆库的 URL：

```text
http://localhost:8888/mcp/my-bank/
```

这样就无需在每次工具调用中传入 `bank_id`，并会将整个客户端固定到一个记忆库。

示例：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/my-bank/
```

如果你确定某个客户端始终只使用一个记忆库，单记忆库模式会更简单。

## 第三步：连接 MCP 客户端 {#step-3-connect-your-mcp-client}

任何兼容 MCP 的客户端都可以连接到本地端点。

对于使用 JSON 配置的客户端，可添加一个指向本地 URL 的 HTTP MCP 服务器。

常见的配置入口包括：

- Claude Desktop 配置文件
- Cursor MCP 设置
- Windsurf MCP 设置
- Claude Code CLI 注册

如果你在比较不同客户端的接入方式，可以参考 [Claude Code 集成](/sdks/integrations/claude-code)和[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

## 第四步：验证工具已就绪 {#step-4-verify-that-the-tools-are-live}

一种简单的检查方法是向客户端询问：

> 你有哪些可用的记忆工具？

至少应该能看到 Retain、Recall 和 Reflect。

接着进行一次简短的记忆测试：

1. 让智能体记住一项偏好或事实
2. 开启一个新会话或新对话
3. 询问它刚才记住的内容

如果记忆功能正常，Recall 应该能找出已存储的上下文，无需你手动重复提供。

还可以做第二项测试：要求系统综合信息，而不是逐字召回。这可以验证 Reflect，而不只是检索功能。

## 常见问题 {#common-issues}

### 首次启动较慢 {#slow-first-startup}

首次运行时，系统可能需要一些时间来初始化数据库和本地模型。之后启动会更快。

### 端口 8888 已被占用 {#port-8888-is-already-in-use}

更改端口：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_PORT=9000 uvx --from hindsight-api hindsight-local-mcp
```

然后将 MCP 客户端指向 `http://localhost:9000/mcp/`。

### 已存入内容，却无法立即召回 {#i-stored-something-but-cannot-recall-it-immediately}

Retain 是异步操作。等待几秒钟后再试。

### 客户端始终没有显示工具 {#the-tools-never-appear-in-the-client}

彻底重启客户端。许多 MCP 客户端只会在启动时刷新工具列表。

### 想查看更多日志 {#i-want-more-logs}

启用调试日志：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_LOG_LEVEL=debug uvx --from hindsight-api hindsight-local-mcp
```

## 何时适合使用本地 MCP {#when-local-mcp-is-the-right-fit}

以下情况适合使用本地 MCP：

- 你希望记忆存储在自己的机器上
- 你想在更大范围部署前测试记忆行为
- 你希望尽可能减少基础设施
- 你想避免公开端点

如果之后需要跨设备访问，或希望更方便地使用基于 OAuth 的客户端配置，可以迁移到 [Hindsight Cloud](https://hindsight.vectorize.io)。

## 常见问题解答 {#faq}

### 本地 MCP 需要 Docker 吗？ {#do-i-need-docker-for-local-mcp}

不需要。本地 MCP 服务器可以直接通过 Hindsight 工具运行。

### 本地 MCP 只能用于 Claude 吗？ {#is-local-mcp-only-for-claude}

不能。任何兼容 MCP 的客户端都可以使用它。

### 应该使用单记忆库还是多记忆库模式？ {#should-i-use-single-bank-or-multi-bank-mode}

如果一个客户端始终只使用一个记忆库，就使用单记忆库模式；如果需要灵活切换，就使用多记忆库模式。

### 重启后数据还会保留吗？ {#does-the-data-survive-restarts}

会。嵌入式 PostgreSQL 中的数据会在本地跨重启保留。

## 后续步骤 {#next-steps}

- 如果你想使用托管替代方案，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 阅读[快速开始指南](/developer/api/quickstart)
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，比较不同编程工作流
