---
title: "指南：使用 Hindsight 为 Gemini Spark 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, gemini-spark, agents, memory]
description: "在 Spark 配置中注册 Hindsight 的 MCP 服务器，为 Gemini Spark 添加记忆，让它能召回相关上下文，并在不同会话间存入学到的信息。"
image: /img/guides/guide-gemini-spark-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Gemini Spark 添加记忆](/img/guides/guide-gemini-spark-memory-with-hindsight.svg)

如果要为 **Gemini Spark 添加 Hindsight 记忆**，只需在 Spark 的配置中注册 Hindsight 的 MCP 服务器。Spark 运行在 Google 的云基础设施上，因此没有可让 Hindsight 代码与 Spark 智能体循环一同运行的插件宿主。MCP 是唯一可用的第三方扩展接口，而 Spark 内置了 MCP 客户端，可以调用 Hindsight 的 `recall`（召回）和 `retain`（存入）工具。

这很适合 Spark，因为它的提示词组装过程和对话记录都是私有的，第三方无法查看，因此无法使用基于钩子的自动召回和自动存入。Spark 会让规划器在判断过去的上下文有用时调用 `recall`，并在学到值得保留的信息时调用 `retain`。这样一来，Spark 就能通过自己已经会调用的工具，在不同会话间使用长期记忆。

本指南将介绍如何注册账号（或自行托管）、在 Spark 的 MCP 配置中注册 Hindsight，以及如何快速验证记忆工具确实已被调用。操作时可同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 注册 [Hindsight Cloud](https://hindsight.vectorize.io)，并创建一个记忆库（也可以自行托管）。
> 2. 从控制台复制 API 密钥。
> 3. 在 Spark 配置中添加 Hindsight MCP 服务器，并填写端点和 Bearer 令牌。
> 4. 将占位 URL 替换为 Hindsight Cloud 端点（自托管时则使用 OAuth 代理 URL）。
> 5. 提示 Spark，让它的规划器调用 `recall` 或 `retain`，以验证配置。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 可以通过 Antigravity 2.0 使用 Gemini Spark
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器
- Hindsight API 密钥

## 步骤 1：准备 Hindsight 后端 {#step-1-get-a-hindsight-backend}

使用 Hindsight Cloud（推荐）：

1. 在 [vectorize.io/hindsight](https://vectorize.io/hindsight/) 注册并创建一个记忆库。
2. 从控制台复制 API 密钥。

自行托管 Hindsight：

1. 部署一个 Hindsight 实例，并运行指向该实例的 `hindsight-embed` MCP 服务器，再通过公共 HTTPS 端点将其公开。
2. 部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)，因为 Spark 与 MCP 服务器通信时只支持 OAuth 2.1。

## 步骤 2：在 Spark 中注册 Hindsight {#step-2-register-hindsight-in-spark}

Spark（通过 Antigravity 2.0）会根据运行位置，从以下两个位置之一读取 MCP 服务器配置。

**Antigravity 桌面应用 / IDE** 会读取 `~/.gemini/antigravity/mcp_config.json`。在该文件中添加 Hindsight MCP 服务器：

```json
{
  "mcpServers": {
    "hindsight": {
      "serverUrl": "https://api.hindsight.vectorize.io/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_HINDSIGHT_API_KEY"
      }
    }
  }
}
```

**托管智能体 / Spark 云端** 会读取 `antigravity.yaml` 清单。将 `tools.mcp_servers` 配置块加入现有清单：

```yaml
tools:
  mcp_servers:
    - name: hindsight
      endpoint: https://api.hindsight.vectorize.io/mcp
      auth: bearer
      description: >
        Long-term memory across sessions. Call recall whenever the user
        references past work, decisions, or preferences from earlier
        conversations. Call retain whenever the user shares a fact,
        preference, or decision worth remembering.
```

将占位 URL 替换为 Hindsight Cloud 端点；如果是自行托管，则替换为 `cloudflare-oauth-proxy` 的 URL。

## Spark 如何使用记忆 {#how-spark-uses-memory}

编辑器集成可以直接钩入提示词，而 Spark 的提示词组装过程和对话记录都是私有的，所以 Spark 通过规划器调用 `recall` 和 `retain`，而不是通过钩子调用：

- **Recall（召回）：** 当规划器判断过去的上下文（例如先前的决策、偏好或工作）有助于处理当前轮次时，Spark 会调用 Hindsight 的 `recall` 工具。
- **Retain（存入）：** 当 Spark 学到值得保留的信息（例如事实、偏好或决策）时，会调用 Hindsight 的 `retain` 工具。

由于这两种调用都是由模型决定的工具调用，而非自动触发的钩子，MCP 配置中的说明文字很重要：它会告诉 Spark 的规划器何时调用每个工具。

要了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

向 Spark 提出一个应该触发记忆工具调用的问题：

1. 让 Spark 记住一件事，例如：“Remember that I prefer TypeScript strict mode for new projects.” 这应该会触发 `retain`。
2. 在之后的一轮对话中询问这件事，例如：“What were my open API decisions from last week?” 这应该会触发 `recall`。

如果 Spark 调用了这些工具并给出了先前的信息，说明配置正常。

## 常见错误 {#common-mistakes}

### 忘记替换占位 URL {#leaving-the-placeholder-url-in-place}

示例配置使用的是占位端点。请将其替换为 Hindsight Cloud 端点；如果是自行托管，则替换为 OAuth 代理 URL。

### 以为 Recall 或 Retain 会自动触发 {#expecting-automatic-recall-or-retain}

Spark 没有插件宿主，而且它的对话记录是私有的，因此不提供自动召回或自动存入钩子。两者都是由模型决定的工具调用，是否调用由 Spark 的规划器判断。

### 自托管时漏掉 OAuth 代理 {#skipping-the-oauth-proxy-when-self-hosting}

Spark 与 MCP 服务器通信时只支持 OAuth 2.1。如果自行托管，请在 `hindsight-embed` MCP 服务器前部署 `cloudflare-oauth-proxy`，不要让 Spark 直接连接该 MCP 服务器。

### 在错误的配置位置注册 {#registering-in-the-wrong-config-location}

桌面应用 / IDE 从 `~/.gemini/antigravity/mcp_config.json` 读取配置，托管智能体则读取 `antigravity.yaml` 清单。请根据 Spark 的运行位置，在对应位置添加 Hindsight。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以自行托管 Hindsight 服务器：让 `hindsight-embed` MCP 服务器运行在 `cloudflare-oauth-proxy` 后面，然后让 Spark 连接代理 URL。

### 为什么记忆不会自动召回？ {#why-doesnt-memory-recall-automatically}

Spark 的提示词组装过程和对话记录都是私有的，第三方无法钩入其中。只有当 Spark 的规划器判断工具调用有用时，才会调用 Recall 和 Retain。

### 如何向 Hindsight Cloud 进行身份认证？ {#how-do-i-authenticate-to-hindsight-cloud}

使用 Bearer 令牌：将 Hindsight API 密钥填入 MCP 配置中的 `Authorization` 请求头。

### 应该在哪里注册 MCP 服务器？ {#where-do-i-register-the-mcp-server}

桌面应用 / IDE 使用 `~/.gemini/antigravity/mcp_config.json`；托管智能体使用 `antigravity.yaml` 清单。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整的 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查看 [Hindsight 的 Recall API](/developer/api/recall)。
- 查看 [Hindsight 的 Retain API](/developer/api/retain)。
- 阅读 [Gemini Spark 集成文档](/sdks/integrations/gemini-spark)。
