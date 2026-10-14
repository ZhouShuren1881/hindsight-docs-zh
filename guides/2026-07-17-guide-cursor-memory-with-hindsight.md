---
title: "指南：使用 Hindsight 为 Cursor 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cursor, coding-agents, memory]
description: "使用 hindsight-cursor 插件为 Cursor 添加记忆：每次会话开始时召回相关项目上下文，并在每项任务结束后存入对话。"
image: /img/guides/guide-cursor-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cursor 添加记忆](/img/guides/guide-cursor-memory-with-hindsight.svg)

如果你想为 Cursor 添加 Hindsight 记忆，最简洁的方案是使用 `hindsight-cursor` 插件。只需运行一次 `hindsight-cursor init` 命令，即可安装插件钩子：它们会在会话开始时召回相关项目记忆，并在每项任务结束后存入对话；此外还会配置 MCP 集成，让智能体在会话期间可以显式调用 `recall`、`retain` 和 `reflect` 工具。这样一来，Cursor 就能在不同编码会话之间保留长期记忆，无需每次新会话都重新发现相同的项目上下文。

Cursor 同时提供钩子系统和原生 MCP 支持，因此很适合这种方案。该插件会同时使用两者：`sessionStart` 钩子会自动将召回的记忆作为上下文注入，`stop` 钩子会在任务完成时存入对话记录，而 MCP 工具则用于有针对性的按需查询。自动提供的记忆无需用户介入；智能体需要显式查询记忆时，也可以调用这些工具。

本指南将带你安装插件、将其连接到 Hindsight 后端、了解会话记忆如何传递给智能体，并通过一个快速验证流程确认记忆确实正在使用。操作时请同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)以便查阅。

<!-- truncate -->

> **快速解答**
>
> 1. 在项目目录中运行 `pip install hindsight-cursor`。
> 2. 运行 `hindsight-cursor init --api-url ... --api-token ...`（Cloud），或运行 `--api-url http://localhost:8888`（自托管）。
> 3. 完全退出并重新打开 Cursor——插件会在启动时加载。
> 4. 会话召回会自动注入项目记忆；自动存入会在每项任务结束后保存对话。
> 5. 验证后续会话能否记住此前会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保你已准备好：

- 已安装并能正常使用 Cursor
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io)或自托管服务器
- 一个项目目录，因为 `init` 会将插件文件安装到该项目中

## 步骤 1：安装插件 {#step-1-install-the-plugin}

在需要添加记忆的项目目录中安装插件。

```bash
cd /path/to/your-project
pip install hindsight-cursor
```

如果你不想永久安装这个包，可以改用 `uvx hindsight-cursor init`，而不必先运行 `pip install` 再运行 `hindsight-cursor init`。

## 步骤 2：将插件连接到 Hindsight {#step-2-point-the-plugin-at-hindsight}

如果使用 Hindsight Cloud，请将 API URL 和令牌传给 `init`：

```bash
hindsight-cursor init --api-url https://api.hindsight.vectorize.io --api-token YOUR_HINDSIGHT_API_TOKEN
```

如果使用自托管的 Hindsight 服务器：

```bash
hindsight-cursor init --api-url http://localhost:8888
```

如果你还没有 Cloud 令牌，可以注册 [Hindsight Cloud](https://ui.hindsight.vectorize.io)并创建 API 密钥，也可以通过 Docker 在本地启动 Hindsight：

```bash
export OPENAI_API_KEY=your-key
docker run --rm -it --pull always -p 8888:8888 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

`init` 会一次性配置这两种机制。如果你只想使用钩子，可以添加 `--no-mcp` 跳过 MCP 配置；添加 `--force` 则会覆盖已有安装。

## 步骤 3：完全退出并重新打开 Cursor {#step-3-fully-quit-and-reopen-cursor}

插件会在启动时加载，因此安装后必须**完全退出 Cursor 并重新打开**。仅重新加载窗口是不够的。如果你在 Cursor 已打开时将插件添加到工作区，却跳过这一步，插件就不会激活。

## `init` 会做什么 {#what-init-does}

`init` 命令会：

- 将插件文件复制到 `.cursor-plugin/hindsight-memory/`
- 如果 `~/.hindsight/cursor.json` 尚不存在，则创建该文件并写入连接设置
- 将 Hindsight MCP 端点写入 `.cursor/mcp.json`，以便按需调用 `recall`、`retain` 和 `reflect` 工具

该插件还提供用于手动查询的 `hindsight-recall` 技能，以及始终生效的规则 `hindsight-memory.mdc`，指导智能体使用已召回的记忆和 MCP 工具。

## 插件如何使用记忆 {#how-the-plugin-uses-memory}

插件通过 `init` 配置的两种互补机制运行：

- **插件钩子（自动）：** 新会话开始时会触发 `sessionStart` 钩子。它会进行范围较广的项目级召回，并将这些记忆作为上下文提供给智能体。任务完成时会触发 `stop` 钩子，提取对话记录并将其存入 Hindsight，供以后召回。
- **MCP 工具（按需）：** `.cursor/mcp.json` 会将 Cursor 原生 MCP 支持连接到 Hindsight 的 MCP 端点，让智能体能在会话期间显式调用 `recall`、`retain` 和 `reflect` 工具，进行有针对性的操作。

会话召回是静默进行的——它会将记忆注入智能体的上下文，而不会显示可见的工具调用。如果你在智能体窗口中看到明确的 “Ran Recall in hindsight” 消息，那走的是 MCP 路径，而不是插件钩子。两种方式可以同时使用。

如需了解较底层的行为，请阅读 [Hindsight 的召回 API](/developer/api/recall)和 [Hindsight 的存入 API](/developer/api/retain)。

## 记忆库 {#memory-banks}

默认使用的记忆库是 `cursor`，由 `~/.hindsight/cursor.json` 中的 `bankId` 设置指定。记忆库是彼此隔离的存储空间，可以理解为单独的“大脑”；一个记忆库中的记忆不会泄漏到另一个记忆库中。

如果你希望按智能体、项目或会话隔离记忆，请将 `dynamicBankId` 设为 `true`。系统会根据 `dynamicBankGranularity` 中列出的字段派生记忆库 ID，该设置默认值为 `["agent", "project"]`。`~/.hindsight/cursor.json` 中的每项设置也都可以通过环境变量覆盖；按加载顺序靠后的值优先。完整配置说明请参阅 [Cursor 集成文档](/sdks/integrations/cursor)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

每次钩子调用时，插件都会写入状态文件——即使没有找到记忆，或跳过了存入操作也一样。检查这些文件，确认钩子是否正在触发：

```bash
cat ~/.hindsight/cursor-state/state/last_recall.json
cat ~/.hindsight/cursor-state/state/last_retain.json
```

每个文件都会记录 `saved_at` 时间戳、值为 `success`、`empty`、`skipped` 或 `error` 的 `status`、所用的 `bank_id`，以及 `result_count`（召回）或 `message_count`（存入）。如果你使用 Cursor 时 `saved_at` 会更新，就说明钩子正在触发；查看 `status` 可以了解具体发生了什么。

一个完整的端到端测试流程如下：

1. 在某个项目中使用 Cursor，让智能体记录一项决定或约定
2. 完成任务，让对话记录存入记忆
3. 在同一项目中启动新会话
4. 询问先前记录的决定

如果新会话能说出此前的决定，就说明设置正常工作。

## 常见错误 {#common-mistakes}

### 没有完全重启 Cursor {#not-fully-restarting-cursor}

插件会在启动时加载。仅重新加载窗口是不够的——安装后请完全退出并重新打开 Cursor。

### 混淆 MCP 召回和插件召回 {#confusing-mcp-recall-with-plugin-recall}

插件执行的召回是静默的。看到 “Ran Recall in hindsight” 这样的可见消息，说明正在通过 MCP 执行，而不是通过钩子。两种方式可以同时运行。

### 过早测试存入功能 {#testing-retain-too-early}

自动存入会在任务完成时运行。如果任务还没结束就检查，对话可能尚未存入。

### 期待从空记忆库召回记忆 {#expecting-memories-with-an-empty-bank}

召回只能提供已经存入的内容。全新的记忆库至少需要完成一次存入流程，召回才会有结果。

## 常见问题 {#faq}

### 我必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用——通过 `--api-url http://localhost:8888` 传入服务器 URL，或者通过 Docker 在本地运行 Hindsight。

### 我必须使用 MCP 吗？ {#do-i-have-to-use-mcp}

不需要。MCP 工具是可选的。如果你只想使用自动插件钩子，可以在运行 `init` 时传入 `--no-mcp`。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

默认情况下，所有会话共用 `cursor` 记忆库。将 `dynamicBankId` 设为 `true`，即可按智能体、项目或会话隔离。

### 这和其他编程智能体集成类似吗？ {#is-this-similar-to-other-coding-agent-integrations}

思路类似。Cursor 使用插件钩子加 MCP，而不是包装命令，但都采用先召回、后存入的模式，与 Hindsight 的其他编辑器集成相同。

## 后续步骤 {#next-steps}

- 如果你想使用托管后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io)开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)开始操作
- 查阅 [Hindsight 的召回 API](/developer/api/recall)
- 查阅 [Hindsight 的存入 API](/developer/api/retain)
- 阅读 [Cursor 集成文档](/sdks/integrations/cursor)
