---
title: "指南：使用 Hindsight 为 Cursor 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cursor, coding-agents, memory]
description: "用 hindsight-cursor 插件在会话开始召回项目、任务后存储对话。"
image: /img/guides/guide-cursor-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cursor 添加记忆](/img/guides/guide-cursor-memory-with-hindsight.svg)

一次 init 安装钩子，开始召回、任务后存储，加 MCP 提供会话中显式工具，跨编码延续。

Cursor 同时支持钩子和 MCP。sessionStart 自动注入、stop 保存、工具按需，无需干预也可显式查询。

本指南介绍安装、连接、传入上下文和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 项目目录 pip 安装。
> 2. init 传 Cloud URL/令牌或本地 URL。
> 3. 完全退出重开，启动时加载。
> 4. 自动开始召回、任务后存储。
> 5. 验证后续会话。

## 前提条件 {#prerequisites}

开始前确认：

- 正常 Cursor。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 项目目录，init 写插件。

## 步骤 1：安装插件 {#step-1-install-the-plugin}

目标项目内安装。

```bash
cd /path/to/your-project
pip install hindsight-cursor
```

不永久安装可 `uvx hindsight-cursor init`。

## 步骤 2：连接 Hindsight {#step-2-point-the-plugin-at-hindsight}

Cloud init 传 URL 令牌：

```bash
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_HINDSIGHT_API_TOKEN
```

自托管：

```bash
hindsight-cursor init --api-url http://localhost:8888
```

无令牌可注册 [Cloud](https://ui.hindsight.vectorize.io)或 Docker 本地：

```bash
export OPENAI_API_KEY=your-key
docker run --rm -it --pull always -p 8888:8888 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

init 同时配置两机制，--no-mcp 只钩子，--force 覆盖。

## 步骤 3：完全退出重开 {#step-3-fully-quit-and-reopen-cursor}

**完全退出 Cursor 并重新打开**，仅窗口重载不够。已开工作区添加而不重启不会激活。

## init 做什么 {#what-init-does}

命令：

- 复制到 `.cursor-plugin/hindsight-memory/`。
- 个人配置不存在时创建连接设置。
- 写 MCP 端点供按需工具。

还提供 hindsight-recall 技能和常开规则，指导使用记忆与工具。

## 插件如何使用 {#how-the-plugin-uses-memory}

两互补机制：

- **自动钩子**：开始广泛项目召回、上下文注入；任务结束提取历史存储。
- **按需 MCP**：原生支持连接端点，会话中针对性调用。

自动召回静默。窗口出现 "Ran Recall in hindsight" 是 MCP，两者可并用。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 记忆库 {#memory-banks}

默认 cursor，在个人 bankId 设置。各库独立如大脑，不泄漏。

按智能体项目会话隔离设动态 true，默认粒度 agent/project。各设置可环境覆盖，后者优先。完整见 [Cursor 文档](/sdks/integrations/cursor)。

## 验证有效 {#verify-that-memory-is-working}

每调用写状态，即使无记忆或跳过，查看：

```bash
cat ~/.hindsight/cursor-state/state/last_recall.json
cat ~/.hindsight/cursor-state/state/last_retain.json
```

记录 saved_at、success/empty/skipped/error、bank_id 和结果或消息数量。时间更新表明钩子执行，状态解释行为。

端到端：

1. 记录决策约定。
2. 完成存储。
3. 同项目新会话。
4. 询问。

呈现此前即有效。

## 常见错误 {#common-mistakes}

### 未完全重启 {#not-fully-restarting-cursor}

加载在启动，需完全退出重开。

### 混淆两种召回 {#confusing-mcp-recall-with-plugin-recall}

插件静默，可见消息为 MCP，可并用。

### 过早测试 {#testing-retain-too-early}

任务完成才存，之前可能未保存。

### 空库期待记忆 {#expecting-memories-with-an-empty-bank}

新库至少一次存储才能返回。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管 URL 或 Docker。

### 必须 MCP 吗？ {#do-i-have-to-use-mcp}

可选，--no-mcp 只自动钩子。

### 如何限定？ {#how-is-memory-scoped}

默认一库，动态按智能体项目会话。

### 与其他编码集成类似？ {#is-this-similar-to-other-coding-agent-integrations}

思路相同，钩子加 MCP，而非包装命令，前召回后存。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Cursor 集成文档](/sdks/integrations/cursor)。
