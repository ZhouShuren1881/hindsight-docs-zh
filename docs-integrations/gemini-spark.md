---
sidebar_position: 24
title: "Gemini 使用 Hindsight 激发持久记忆 |整合"
description: "通过MCP向Google的Gemini Spark助手添加持久的长期记忆 - Spark使用Hindsight Cloud或自托管实例回忆相关上下文并保留在会话中学到的内容。"
---

# Gemini Spark {#gemini-spark}

的长期记忆 [Gemini Spark](https://blog.google/products/gemini/gemini-spark/),Google永远在线的代理助手，来自 [Hindsight](https://vectorize.io/hindsight)的MCP服务器。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 得到一个API立即密钥，无需运行基础设施。以下设置适用于云和自托管Hindsight。
:::

## 工作原理 {#how-it-works}

Spark 运行Google的云基础设施。不像OpenClaw或Claude Code，有**没有插件宿主**哪里Hindsight代码与 Spark 的智能体循环一起运行。唯一的第三方扩展面是MCP：

|能力|Spark 支持|
|---|---|
|基于 Hook 的自动记忆召回（在提示前添加上下文）|不可用 — Spark 的提示程序集是私有的。智能体呼唤`recall` 当它的规划者认为它有用时。|
|基于 Hook 的自动记忆存储（在回合结束时保存成绩单）|不可用 - 第三方看不到 Spark 的成绩单。智能体呼唤`retain` 当它学到值得保留的东西时。|
|MCP工具 (`recall`，`retain`等）|是 — Spark 通过其内置的 MCP 客户端调用 Hindsight 的 MCP 工具。|

## 架构 {#architecture}

### 搭配Hindsight Cloud（推荐） {#with-hindsight-cloud-recommended}

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + MCP (Streamable HTTP)
        v
Hindsight Cloud (api.hindsight.vectorize.io)
```

### 自托管Hindsight {#with-self-hosted-hindsight}

```
Gemini Spark (Google Cloud)
        |
        | HTTPS + OAuth 2.1 (Spark 的 MCP 客户端)
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

### 选项1：Hindsight Cloud（推荐） {#option-1-hindsight-cloud-recommended}

1. 注册[vectorize.io/hindsight](https://vectorize.io/hindsight/) 并创建一个记忆库
2. 从仪表板复制API密钥
3. 在 Spark 的 MCP 配置中注册 Hindsight（见下文）

### 选项 2：自托管 {#option-2-self-hosted}

1. 部署Hindsight实例并运行`hindsight-embed`MCP服务器指向它，暴露在公共 HTTPS 端点上
2. 部署[`cloudflare-oauth-proxy`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cloudflare-oauth-proxy) — Spark 仅与 OAuth 2.1 对话MCP服务器

### 在 Spark 中注册 Hindsight {#register-hindsight-in-spark}

Spark（通过 Antigravity 2.0）从两个位置之一读取 MCP 服务器：

- **托管智能体 / Spark 云端：** `antigravity.yaml` 清单 — 参见 [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/manifest.example.yaml)
- **Antigravity 桌面应用 / IDE：**`~/.gemini/antigravity/mcp_config.json` — 参见 [`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/mcp_config.example.json)

将占位符 URL 替换为您的 Hindsight Cloud端点或 OAuth 代理 URL。

## 验证设置 {#verifying-setup}

用应触发记忆工具的内容提示 Spark：

- “我的开放是什么API上周的决定？” → `recall`
- “记住我更喜欢TypeScript新项目的严格模式。” → `retain`

## 配置示例 {#example-configs}

两人都住在[集成目录](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/gemini-spark)：

- [`manifest.example.yaml`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/manifest.example.yaml) — 反重力 2.0 智能体清单片段
- [`mcp_config.example.json`](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/gemini-spark/mcp_config.example.json) —Desktop/IDEMCP本地开发配置
