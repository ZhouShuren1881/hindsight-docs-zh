---
title: "指南：将 Hindsight 作为本地 MCP 服务器运行"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, mcp, local, memory]
description: "使用嵌入式 PostgreSQL 在本地运行 Hindsight MCP 服务器，无需额外基础设施即可为 Claude、Cursor 等客户端提供持久记忆。"
image: /img/blog/guide-run-hindsight-as-a-local-mcp-server.png
hide_table_of_contents: true
---

![指南：将 Hindsight 作为本地 MCP 服务器运行](/img/blog/guide-run-hindsight-as-a-local-mcp-server.png)

将 **Hindsight 作为本地 MCP 服务器运行**，配置比想象中简单。Hindsight 可在本地运行嵌入式 PostgreSQL，提供本机 MCP 端点，无需独立外部数据库即可为 Claude Code、Claude Desktop、Cursor 和 Windsurf 等工具提供持久记忆。

这种方式适合个人使用、开发和重视隐私的部署。无需公开记忆端点或先管理完整托管环境，只需启动本地进程，将 MCP 客户端连接到 `localhost`。

本指南介绍本地服务器启动、单记忆库与多记忆库模式，以及正式使用前如何确认 MCP 工具正常。操作时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)。

<!-- truncate -->

> **快速步骤**
>
> 1. 使用所选 LLM 提供程序启动 `hindsight-local-mcp`。
> 2. 将 MCP 客户端连接到 `http://localhost:8888/mcp/`。
> 3. 选择多记忆库模式，或固定单记忆库 URL。
> 4. 重启客户端，使记忆工具出现。
> 5. 简单测试 retain、recall 和 reflect。

## 前置条件 {#prerequisites}

开始前，请准备：

- 可运行本地服务器的机器
- LLM 提供商密钥，使用 Ollama 等本地模型时可不需要
- 兼容 MCP 的客户端，例如 Claude Code、Claude Desktop、Cursor 或 Windsurf

希望完全省去本地基础设施时，[Hindsight Cloud](https://hindsight.vectorize.io) 是更简单的托管选择。

## 第一步：启动本地 MCP 服务器 {#step-1-start-the-local-mcp-server}

最简单的启动命令：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... uvx --from hindsight-api hindsight-local-mcp
```

使用 Ollama 而非云提供商时：

```bash
HINDSIGHT_API_LLM_PROVIDER=ollama \
HINDSIGHT_API_LLM_MODEL=llama3.2 \
uvx --from hindsight-api hindsight-local-mcp
```

这会在本地启动完整 Hindsight API，并在以下地址提供 MCP：

```text
http://localhost:8888/mcp/
```

Hindsight 还会启动嵌入式 PostgreSQL，因此本地测试或使用记忆不需要另行部署数据库服务。

## 本地服务器包含什么 {#what-the-local-server-actually-includes}

本地 MCP 服务器并非轻量演示包装，而是在本地运行完整记忆 API，包括：

- retain
- recall
- reflect
- 心智模型工具
- 文档工具
- 多记忆库模式下的记忆库管理工具

因此它既适合开发，也适合日常单用户使用。

检索详情见 [Hindsight 召回 API](/developer/api/recall)，存储详情见[存储 API](/developer/api/retain)。

## 第二步：选择多记忆库或单记忆库模式 {#step-2-choose-multi-bank-or-single-bank-mode}

本地部署支持两种模式。

### 多记忆库模式 {#multi-bank-mode}

使用根 MCP 路径：

```text
http://localhost:8888/mcp/
```

该模式提供包括记忆库管理在内的全部工具，适合使用多个记忆库，或让智能体按请求指定记忆库。

Claude Code 示例：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/
```

### 单记忆库模式 {#single-bank-mode}

使用固定记忆库的 URL：

```text
http://localhost:8888/mcp/my-bank/
```

工具调用无需逐次传入 `bank_id`，整个客户端固定到同一记忆库。

例如：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/my-bank/
```

明确一个客户端始终使用同一记忆库时，这种模式更简单。

## 第三步：连接 MCP 客户端 {#step-3-connect-your-mcp-client}

任何兼容 MCP 的客户端均可指向本地端点。

使用 JSON 配置的客户端，可添加指向本地 URL 的 HTTP MCP 服务器。

常见位置包括：

- Claude Desktop 配置文件
- Cursor MCP 设置
- Windsurf MCP 设置
- Claude Code CLI 注册

比较客户端模式时，可参考 [Claude Code 集成](/sdks/integrations/claude-code)和[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

## 第四步：验证工具可用 {#step-4-verify-that-the-tools-are-live}

可简单询问客户端：

> 你有哪些可用的记忆工具？

至少应看到 retain、recall 和 reflect。

再进行简短记忆测试：

1. 让智能体记住一个偏好或事实
2. 开始新会话或新对话
3. 再次询问该事实

记忆正常时，召回应找出已存储的上下文，无需手动重复。

第二项测试可要求综合分析，而非字面召回，用于验证 reflect。

## 常见问题排查 {#common-issues}

### 首次启动较慢 {#slow-first-startup}

首次运行需要初始化数据库和本地模型，之后启动更快。

### 端口 8888 已被占用 {#port-8888-is-already-in-use}

更改端口：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_PORT=9000 uvx --from hindsight-api hindsight-local-mcp
```

然后将 MCP 客户端指向 `http://localhost:9000/mcp/`。

### 已存储内容但无法立即召回 {#i-stored-something-but-cannot-recall-it-immediately}

存储是异步的，等待几秒后重试。

### 客户端始终没有显示工具 {#the-tools-never-appear-in-the-client}

完整重启客户端，许多 MCP 客户端只在启动时刷新工具列表。

### 需要更多日志 {#i-want-more-logs}

启用调试日志：

```bash
HINDSIGHT_API_LLM_API_KEY=sk-... HINDSIGHT_API_LOG_LEVEL=debug uvx --from hindsight-api hindsight-local-mcp
```

## 本地 MCP 的适用场景 {#when-local-mcp-is-the-right-fit}

以下情况适合本地 MCP：

- 希望记忆存储在自己的机器上
- 正式推广前测试记忆行为
- 希望基础设施尽可能少
- 希望避免公开端点

之后需要多设备访问或更简单的 OAuth 客户端配置时，可迁移到 [Hindsight Cloud](https://hindsight.vectorize.io)。

## 常见问题 {#faq}

### 本地 MCP 需要 Docker 吗？ {#do-i-need-docker-for-local-mcp}

不需要，可通过 Hindsight 工具直接运行。

### 本地 MCP 只支持 Claude 吗？ {#is-local-mcp-only-for-claude}

不是，任何兼容 MCP 的客户端都可使用。

### 应选择单记忆库还是多记忆库？ {#should-i-use-single-bank-or-multi-bank-mode}

一个客户端始终使用同一记忆库时选择单记忆库，需要灵活性时选择多记忆库。

### 重启后数据还在吗？ {#does-the-data-survive-restarts}

在，嵌入式 PostgreSQL 数据会在本地跨重启保留。

## 后续步骤 {#next-steps}

- 希望使用托管后端时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[编程智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)中比较编程工作流。
