---
title: "指南：使用 Hindsight 为 Gemini Spark 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, gemini-spark, agents, memory]
description: "注册 Hindsight MCP 服务器，让 Spark 召回上下文、跨会话存储所学。"
image: /img/guides/guide-gemini-spark-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Gemini Spark 添加记忆](/img/guides/guide-gemini-spark-memory-with-hindsight.svg)

Spark 运行在 Google 云，没有插件宿主。第三方仅 MCP，内置客户端可调用召回存储，所以配置注册服务器。

提示组装和记录私有，不能自动钩子。规划器判断有用时召回、值得时存储，通过已有工具持久。

本指南介绍注册或自托管、MCP 和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 注册 [Cloud](https://hindsight.vectorize.io)建库或自托管。
> 2. 复制 API 密钥。
> 3. 端点和 Bearer 令牌注册 MCP。
> 4. 占位 URL 替换云端或 OAuth 代理。
> 5. 提示规划器调用工具验证。

## 前提条件 {#prerequisites}

开始前确认：

- Antigravity 2.0 中 Spark 访问。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- API 密钥。

## 步骤 1：准备后端 {#step-1-get-a-hindsight-backend}

推荐 Cloud：

1. [注册](https://vectorize.io/hindsight/)并建库。
2. 复制密钥。

自托管：

1. 部署 Hindsight，embed MCP 指向它，公开 HTTPS。
2. 部署 [cloudflare-oauth-proxy](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cloudflare-oauth-proxy)，Spark 只支持 OAuth 2.1。

## 步骤 2：注册 {#step-2-register-hindsight-in-spark}

根据运行位置两配置来源。

**桌面/IDE** 读取 `~/.gemini/antigravity/mcp_config.json`：

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

**托管/Spark 云端**读取 antigravity.yaml，加入：

```yaml
tools:
  mcp_servers:
    - name: hindsight
      endpoint: https://api.hindsight.vectorize.io/mcp
      auth: bearer
      description: >
        跨会话长期记忆。用户引用此前工作、
        决策或偏好时调用 recall。
        用户分享值得保存的事实、
        偏好或决策时调用 retain。
```

替换 URL 为 Cloud 或自托管代理。

## Spark 如何使用 {#how-spark-uses-memory}

不能直接钩提示，通过规划器：

- **召回**：此前决策偏好工作相关时调用。
- **存储**：学到值得保存事实偏好决策时调用。

均模型驱动，配置描述告诉规划器时机。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 验证有效 {#verify-that-memory-is-working}

提示触发：

1. “记住，新项目我喜欢 TypeScript strict 模式。”应存储。
2. “上周未决 API 决策是什么？”应召回。

调用且呈现此前即有效。

## 常见错误 {#common-mistakes}

### 保留占位 URL {#leaving-the-placeholder-url-in-place}

替换实际云端或代理。

### 期待自动钩子 {#expecting-automatic-recall-or-retain}

无插件且记录私有，规划器决定调用。

### 自托管省 OAuth 代理 {#skipping-the-oauth-proxy-when-self-hosting}

只支持 OAuth 2.1，需代理在 embed 前。

### 配置位置错误 {#registering-in-the-wrong-config-location}

桌面 JSON、托管 YAML，按位置选择。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，embed 加代理。

### 为何不自动召回？ {#why-doesnt-memory-recall-automatically}

第三方无法钩私有提示记录，由规划器。

### 如何 Cloud 认证？ {#how-do-i-authenticate-to-hindsight-cloud}

Authorization Bearer API 密钥。

### 哪里注册？ {#where-do-i-register-the-mcp-server}

桌面指定 JSON，托管 manifest。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Gemini Spark 集成文档](/sdks/integrations/gemini-spark)。
