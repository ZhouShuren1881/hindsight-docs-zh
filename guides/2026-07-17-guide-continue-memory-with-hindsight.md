---
title: "指南：使用 Hindsight 为 Continue 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, continue, coding-agents, memory]
description: "使用 hindsight-continue 通过 @hindsight 召回项目记忆，可选智能体模式自动召回存储。"
image: /img/guides/guide-continue-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Continue 添加记忆](/img/guides/guide-continue-memory-with-hindsight.svg)

适配器运行小型本地服务器，实现 HTTP 上下文提供商。在聊天输入 `@hindsight`，查询时召回项目记忆并注入。

Continue 无消息前钩子，但提供 HTTP 和可选 MCP 两扩展点。HTTP 精确按需，MCP 加规则让智能体模式自动，取决于遵循规则。

本指南介绍安装、后端、配置和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-continue`.
> 2. Cloud 密钥或自托管 URL，加 `HINDSIGHT_CONTINUE_BANK_ID`。
> 3. 运行适配器，监听 `127.0.0.1:8123`。
> 4. config.yaml 注册 http 提供商。
> 5. 输入 @hindsight 确认上下文。

## 前提条件 {#prerequisites}

开始前确认：

- VS Code 或 JetBrains 的 Continue。
- Python 3.10+。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：安装适配器 {#step-1-install-the-adapter}

用 pip 安装。

```bash
pip install hindsight-continue
```

本地服务器接收请求、召回、按 Continue 预期格式返回。

## 步骤 2：连接 Hindsight {#step-2-point-the-adapter-at-hindsight}

设环境后运行。

Cloud：

```bash
export HINDSIGHT_API_KEY=hsk_...
export HINDSIGHT_CONTINUE_BANK_ID=my-project

hindsight-continue            # 监听 127.0.0.1:8123
```

自托管设置 URL、省略密钥：

```bash
export HINDSIGHT_API_URL=http://localhost:8888
export HINDSIGHT_CONTINUE_BANK_ID=my-project

hindsight-continue            # 监听 127.0.0.1:8123
```

环境变量决定库，每项目一个，防止泄漏。

## 步骤 3：注册到 Continue {#step-3-register-it-in-continue}

在 `~/.continue/config.yaml` 或工作区 `.continue` 配置为 http：

```yaml
context:
  - provider: http
    params:
      url: "http://127.0.0.1:8123/"
      title: hindsight
      displayTitle: Hindsight
      description: 从 Hindsight 召回长期记忆
```

输入 `@hindsight`，可附查询，匹配记忆加入上下文。

## 适配器如何使用记忆 {#how-the-adapter-uses-memory}

通过可用扩展点工作：

- **HTTP 召回**：`@hindsight <query>` 或裸提及接收 `{query, fullInput, options, workspacePath}`，返回 `{name, description, content}`，查询时按需。
- **可选 MCP 加规则召回存储**：智能体模式连接工具，规则要求任务开始召回并存持久事实。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 智能体模式自动召回 {#automatic-recall-in-agent-mode}

按需提供商精确，自动则接 MCP 加“先召回”规则，示例见[`examples/.continue/`](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/continue/examples/.continue)：

- 注册工具的 MCP 块。
- 要求自动召回的规则文件。

自动取决于遵循规则，不如按需确定。

## 按项目记忆库 {#per-project-memory-banks}

环境变量决定默认库。

请求可用 `options.bankId` 覆盖，各项目隔离、同项目其他集成共享。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 运行并注册。
2. 项目库存决策约定。
3. 聊天 @hindsight 相关查询。
4. 确认上下文。

例如：

- 保存认证约定。
- `@hindsight 认证约定` 查询。

呈现此前决策就有效。

## 常见错误 {#common-mistakes}

### 忘记库 {#forgetting-to-set-the-bank}

未设置环境就无默认，应每项目设置。

### 期待每消息被动召回 {#expecting-passive-recall-on-every-message}

无前钩子，仅提及时执行，自动用 MCP 加规则。

### URL 不匹配 {#mismatched-url-between-adapter-and-config}

改主机端口后同步配置。

### 假定全局 {#assuming-memory-is-global}

按库隔离，不能期待其他项目。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管环境 URL，省密钥。

### @hindsight 自动吗？ {#does-hindsight-recall-automatically}

按需，自动需可选 MCP 和规则。

### 如何限定？ {#how-is-memory-scoped}

环境 ID 按项目，必要时请求覆盖。

### 可改地址端口吗？ {#can-i-change-the-adapters-host-or-port}

设 `HINDSIGHT_CONTINUE_HOST`、`HINDSIGHT_CONTINUE_PORT` 并同步 URL。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Continue 集成文档](/sdks/integrations/continue)。
