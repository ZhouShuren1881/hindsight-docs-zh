---
title: "指南：使用 Hindsight 为 Aider 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, aider, coding-agents, memory]
description: "用 hindsight-aider 包装器在会话前召回项目上下文，退出后保存记录。"
image: /img/guides/guide-aider-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Aider 添加记忆](/img/guides/guide-aider-memory-with-hindsight.svg)

如需 **Aider 与 Hindsight 记忆**，用 `hindsight-aider` 替代命令，启动前召回、退出后存储，跨编码会话延续。

Aider 无 MCP 或每提示钩子，但能读取只读文件和写历史。包装器启动时注入文件、退出时存储当次历史。按 git 库隔离。

本指南介绍安装、后端、分库和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-aider aider-chat`.
> 2. Cloud 设置 `HINDSIGHT_API_TOKEN`，自托管设置 URL。
> 3. 像 `aider` 一样运行，参数透传。
> 4. 默认 git 库名，按项目分库。
> 5. 验证后续记忆。

## 前提条件 {#prerequisites}

开始前确认：

- 正常 Aider（`aider-chat`）。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- git 代码库。

## 步骤 1：安装包装器 {#step-1-install-the-wrapper}

与 Aider 一起安装。

```bash
pip install hindsight-aider aider-chat
```

直接替代命令，不改变工作方式，包装前后记忆。

## 步骤 2：连接 Hindsight {#step-2-point-the-wrapper-at-hindsight}

Cloud：

```bash
export HINDSIGHT_API_TOKEN="hsk_..."
```

自托管：

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
```

像 `aider` 一样使用，参数透传：

```bash
hindsight-aider                       # 交互式，已加载项目记忆
hindsight-aider -m "添加重试逻辑"      # 一次性；使用消息召回
hindsight-aider src/app.py            # 任意 aider 参数
```

## 包装器如何使用记忆 {#how-the-wrapper-uses-memory}

无 MCP 和逐提示钩子，在两个可用点工作：

- **召回（之前）**：查询、写入 `.aider.hindsight-memory.md`，以 `aider --read .aider.hindsight-memory.md …` 启动。`-m "修复认证缺陷"` 用作查询，否则通用项目查询。
- **存储（之后）**：退出后读取当次历史片段，存入项目库。

每会话一次召回，开始了解项目所学、退出保存新增内容。

底层见[记忆召回 API](/developer/api/recall)和[记忆存储 API](/developer/api/retain)。

## 按代码库记忆库 {#per-repo-memory-banks}

默认 **git 库名**，隔离项目，与同库其他编辑器集成共享。

其他编辑器或智能体同库时利用相同项目记忆，一工具约定其他可用。

需其他策略如相关多库共享，见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/aider)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 库内运行包装器。
2. 改动并记录决策或约定。
3. 退出存储。
4. 同库再次运行。
5. 问此前决策。

例如：

- 首次重构认证，记录重试更改原因。
- 第二次问当前认证约定。

文件呈现此前决策就有效。

## 常见错误 {#common-mistakes}

### 库外运行 {#running-outside-a-git-repo}

应在需要记忆的库内运行。

### 期待会话中重新召回 {#expecting-mid-session-recall}

仅启动一次，新任务需要新会话或 `-m`。

### 过早测试存储 {#testing-retain-too-early}

退出才存，退出前可能尚未保存。

### 假定全局记忆 {#assuming-memory-is-global}

默认各库独立，不会召回他库。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，设自托管 URL。

### 改变 Aider 用法吗？ {#does-this-change-how-i-use-aider}

不变，所有参数透传。

### 如何限定？ {#how-is-memory-scoped}

按 git 库，默认库名。

### 与其他编码集成类似吗？ {#is-this-similar-to-other-coding-agent-integrations}

思路相同，以只读文件和历史替代插件或 MCP，前召回后存储一致。对照 [OpenCode](/sdks/integrations/opencode)和 [Claude Code 集成](/sdks/integrations/claude-code)。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [Aider 集成文档](/sdks/integrations/aider)。
