---
title: "指南：使用 Hindsight 为 Grok Build 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, grok-build, coding-agents, memory]
description: "使用 hindsight-memory 插件为 Grok Build 添加记忆：每次收到提示时召回相关上下文，并保留每次对话供后续会话使用。"
image: /img/guides/guide-grok-build-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Grok Build 添加记忆](/img/guides/guide-grok-build-memory-with-hindsight.svg)

如果你想让 **Grok Build 使用 Hindsight 记忆**，需要安装 `hindsight-memory` 插件。Grok Build 原生支持 Claude Code 插件格式，因此，为 Claude Code 提供支持的同一个插件无需修改，就能在 Grok Build 中安装和运行。每次用户发送提示时，插件都会召回相关记忆并将其作为上下文注入；每次回复后，插件都会提取并存储对话，以供长期使用。

这是因为 Grok Build 原生支持 Claude Code 插件，钩子、MCP 服务器、技能和市场元数据都可以直接使用。该插件接入 Grok Build 的生命周期事件：`UserPromptSubmit` 钩子负责自动召回，`Stop` 钩子负责自动存入。这样一来，Grok Build 就能跨会话保留长期记忆，无需每次开启新会话都重新发现相同的上下文。

本指南将介绍如何添加市场、安装插件、配置用于记忆提取的 LLM 服务提供方、了解记忆的范围，以及通过快速验证流程确认记忆确实在使用中。操作时可同时参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `claude plugin marketplace add vectorize-io/hindsight`。
> 2. 运行 `claude plugin install hindsight-memory`。
> 3. 设置一个用于提取的 LLM 服务提供方密钥（`OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY`）。
> 4. 运行 `grok`，插件便会自动启用。
> 5. 验证后续会话能否记住较早会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保你已具备：

- 已安装并可正常使用 Grok Build（包含 `grok` 命令）
- 可用于添加市场和安装插件的 `claude` CLI
- 用于提取记忆的 LLM 服务提供方密钥，或一个可访问的外部 Hindsight 服务器
- 可选：如果不希望插件在本地运行 Hindsight，可使用 [Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 步骤 1：添加市场并安装插件 {#step-1-add-the-marketplace-and-install-the-plugin}

Grok Build 原生支持 Claude Code 插件，因此安装时使用标准的 Claude Code 命令。Grok Build 会自动发现并启用插件。

```bash
claude plugin marketplace add vectorize-io/hindsight
claude plugin install hindsight-memory
```

`hindsight-memory` 插件也为 Claude Code 提供支持；它的所有功能、配置选项和知识工具在 Grok Build 中都可以使用。

## 步骤 2：配置用于记忆提取的服务提供方 {#step-2-configure-a-provider-for-memory-extraction}

插件需要 LLM 服务提供方来提取对话中的事实。设置一个可自动检测的服务提供方密钥：

```bash
# 方案 A：OpenAI（自动检测）
export OPENAI_API_KEY="sk-your-key"

# 方案 B：Anthropic（自动检测）
export ANTHROPIC_API_KEY="your-key"
```

也可以连接到外部 Hindsight 服务器，而不是在本地运行 Hindsight：

```bash
mkdir -p ~/.hindsight
echo '{"hindsightApiUrl": "https://your-hindsight-server.com"}' > ~/.hindsight/claude-code.json
```

## 步骤 3：启动 Grok Build {#step-3-start-grok-build}

像平常一样启动 Grok Build，插件会自动启用：

```bash
grok
```

从此以后，插件会在后台捕获并召回记忆，无需改变你的工作流程。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

该插件会接入 Grok Build 的生命周期事件：

- **自动召回（响应前）：** 每次用户发送提示时，`UserPromptSubmit` 钩子都会向 Hindsight 查询相关记忆，并将其作为 `additionalContext` 注入。聊天记录中看不到这些内容，但 Grok 可以读取。
- **自动存入（响应后）：** 每次回复后（或每隔 N 轮），`Stop` 钩子都会提取对话内容并将其存入 Hindsight，供长期使用。
- **知识工具：** Grok 可以通过 `agent_knowledge_recall`、`agent_knowledge_ingest` 等 MCP 工具直接读取、写入和搜索自己的记忆。
- **守护进程管理：** 插件可以自动启动和停止本地 `hindsight-embed` 守护进程，也可以连接到外部 Hindsight 服务器。

如需了解更底层的行为，请参阅 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 按项目和工具划分记忆 {#per-project-and-per-tool-memory}

默认情况下，Grok Build 和 Claude Code 共用 `~/.hindsight/claude-code.json`，因此也共用记忆。若要为每个项目设置独立的记忆库，可在 `~/.hindsight/claude-code.json` 中设置：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置时，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Grok Build 会分别存入和召回记忆。同一代码库的 Git worktree 默认共用一个记忆库。

如果希望 Grok Build 和 Claude Code 使用不同的记忆，可在 Grok Build 的 shell 环境中覆盖智能体名称：

```bash
export HINDSIGHT_AGENT_NAME=grok-build
export HINDSIGHT_BANK_ID=grok_build
grok
```

完整配置说明请参阅 [Claude Code 配置文档](https://hindsight.vectorize.io/sdks/integrations/claude-code#configuration)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

建议按以下顺序测试：

1. 在某个项目中运行 `grok`。
2. 告诉它一项值得记住的决定或约定。
3. 退出，让系统存入会话记录。
4. 在同一项目中再次运行 `grok`。
5. 询问它之前的决定。

至少完成一次存入周期后，记忆才可供使用。因此，请先完成一个完整会话——输入一些内容、退出，然后开启新会话。如果新会话能提起之前的决定，说明配置已生效。你也可以在配置中启用 `"debug": true`，从 stderr 中查看 `[Hindsight]` 消息，以确认召回和存入操作。

## 常见错误 {#common-mistakes}

### 在首次存入前检查召回 {#checking-recall-before-the-first-retain-cycle}

至少完成一次存入周期后，记忆才能被召回。如果在首次会话中就检查，此时还没有存入任何内容；请先完成一个完整会话，再开启新会话测试。

### 忘记配置提取服务提供方 {#forgetting-the-extraction-provider}

插件需要 LLM 服务提供方来提取事实。如果没有设置 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY`，也没有连接外部服务器，记忆提取就不会运行。

### 以为 Grok Build 和 Claude Code 使用不同的记忆 {#assuming-grok-build-and-claude-code-memory-are-separate}

默认情况下，两个工具共用 `~/.hindsight/claude-code.json` 和同一份记忆。如需隔离，请按上文所示覆盖智能体名称和记忆库 ID。

### 以为项目会自动隔离 {#expecting-projects-to-be-isolated-automatically}

如果未设置 `dynamicBankId`，所有项目都会共用一个记忆库。若要按项目划分记忆，请启用 `dynamicBankGranularity`。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。插件可以通过 `hindsight-embed` 守护进程在本地运行 Hindsight，也可以通过 `hindsightApiUrl` 连接自托管服务器。Hindsight Cloud 只是其中一种选择，并非必需。

### 这会改变我使用 Grok Build 的方式吗？ {#does-this-change-how-i-use-grok-build}

不会。插件会自动启用，并在后台捕获和召回记忆，无需改变你的工作流程。

### 记忆的范围如何划分？ {#how-is-memory-scoped}

默认情况下，不同工具共用记忆库。若要按项目隔离，可启用 `dynamicBankId` 并设置 `dynamicBankGranularity`；若要将 Grok Build 和 Claude Code 分开，可设置 `HINDSIGHT_AGENT_NAME` 和 `HINDSIGHT_BANK_ID`。

### 插件未列出或钩子没有触发时，该检查什么？ {#the-plugin-isnt-listed-or-hooks-arent-firing--what-do-i-check}

运行 `grok plugin list`，确认已安装 `hindsight-memory`；再运行 `grok inspect`，检查 Hooks 部分。在配置中启用 `"debug": true`，即可在 stderr 中查看 `[Hindsight]` 消息。

## 后续步骤 {#next-steps}

- 如需托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [Grok Build 集成文档](/sdks/integrations/coding-agents#-grok-build)
