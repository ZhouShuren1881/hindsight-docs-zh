---
sidebar_position: 24
title: "Gemini Spark 借助 Hindsight 实现持久记忆 | 集成"
description: "通过 MCP 为 Google 的 Gemini Spark 助手添加持久的长期记忆。Spark 使用 Hindsight Cloud 或自托管实例召回相关上下文，并保留跨会话学到的内容。"
---

# Gemini Spark {#gemini-spark}

通过 [Hindsight](https://vectorize.io/hindsight) 的 MCP 服务器，为 [Gemini Spark](https://blog.google/products/gemini/gemini-spark/)（Google 的常驻型智能体助手）提供长期记忆。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)，立即获取 API 密钥，无需自行运行基础设施。以下设置同时适用于 Hindsight Cloud 和自托管 Hindsight。
:::

## 工作原理 {#how-it-works}

Spark 在 Google 的云基础设施上运行。与 OpenClaw 或 Claude Code 不同，Spark 没有可供 Hindsight 代码与智能体循环并行运行的插件宿主。第三方唯一可用的扩展接口是 MCP：

| 能力 | Spark 支持情况 |
|---|---|
| 基于 Hook 的自动召回（将上下文添加到提示中） | 不支持：Spark 的提示组装过程是私有的。智能体会在规划器认为有用时调用 `recall`。 |
| 基于 Hook 的自动存入（在轮次结束时保存对话记录） | 不支持：第三方无法访问 Spark 的对话记录。智能体会在学到值得保留的内容时调用 `retain`。 |
| MCP 工具（`recall`、`retain` 等） | 支持：Spark 通过内置的 MCP 客户端调用 Hindsight 的 MCP 工具。 |

## 架构 {#architecture}

### 使用 Hindsight Cloud（推荐） {#with-hindsight-cloud-recommended}

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + MCP (Streamable HTTP)
        v
Hindsight Cloud (api.hindsight.vectorize.io)
```

### 使用自托管 Hindsight {#with-self-hosted-hindsight}

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + OAuth 2.1（Spark 的 MCP 客户端）
        v
Cloudflare Worker — cloudflare-oauth-proxy
   - OAuth 授权服务器
   - 将身份验证桥接到 Hindsight API 令牌
        |
        | HTTPS + Cloudflare Tunnel
        v
自托管 Hindsight + hindsight-embed（MCP 服务器）
```

## 设置 {#setup}

### 选项 1：Hindsight Cloud（推荐） {#option-1-hindsight-cloud-recommended}

1. 在 [vectorize.io/hindsight](https://vectorize.io/hindsight/) 注册并创建记忆库。
2. 从控制面板复制 API 密钥。
3. 在 Spark 的 MCP 配置中注册 Hindsight（见下文）。

### 选项 2：自托管 {#option-2-self-hosted}

1. 部署 Hindsight 实例，并运行连接到该实例且通过公共 HTTPS 端点公开的 `hindsight-embed` MCP 服务器。
2. 部署 [`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy)。Spark 与 MCP 服务器通信时只支持 OAuth 2.1。

### 在 Spark 中注册 Hindsight {#register-hindsight-in-spark}

Spark（通过 Antigravity 2.0）从以下两个位置之一读取 MCP 服务器配置：

- **托管智能体 / Spark 云端：** `antigravity.yaml` 清单，参见 [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/manifest.example.yaml)。
- **Antigravity 桌面应用 / IDE：** `~/.gemini/antigravity/mcp_config.json`，参见 [`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/mcp_config.example.json)。

将占位符 URL 替换为 Hindsight Cloud 端点或 OAuth 代理 URL。

## 验证设置 {#verifying-setup}

向 Spark 输入可能会触发记忆工具的提示：

- "What were my open API decisions from last week?" → `recall`
- "Remember that I prefer TypeScript strict mode for new projects." → `retain`

## 配置示例 {#example-configs}

两个示例文件都位于[集成目录](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/gemini-spark)：

- [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/manifest.example.yaml)：Antigravity 2.0 智能体清单片段。
- [`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/mcp_config.example.json)：用于本地开发的桌面应用 / IDE MCP 配置。
