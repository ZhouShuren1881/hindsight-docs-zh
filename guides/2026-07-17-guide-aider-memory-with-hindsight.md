---
title: "指南：使用 Hindsight 为 Aider 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, aider, coding-agents, memory]
description: "使用 hindsight-aider 包装器为 Aider 添加记忆：每次会话开始前召回相关项目上下文，并在 Aider 退出后保存会话记录。"
image: /img/guides/guide-aider-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Aider 添加记忆](/img/guides/guide-aider-memory-with-hindsight.svg)

如果你想让 **Aider 使用 Hindsight 记忆**，最简洁的方式是使用 `hindsight-aider` 包装器。它会替代 `aider` 命令运行，在每次会话开始前召回相关项目记忆，并在 Aider 退出后保存本次会话记录。这样，Aider 就能在多次编码会话之间保留长期记忆，无需每次都重新摸索同一代码库的上下文。

Aider 很适合这种方式，因为它没有 MCP 客户端或逐提示钩子，但可以加载只读上下文文件，也可以写入聊天历史文件。包装器利用了这两项能力：启动时将召回的记忆作为只读文件注入，退出时读取聊天历史中本次会话对应的部分并存入记忆库。记忆按 Git 代码库隔离，因此一个项目的记忆不会与其他项目的工作混在一起。

本指南将介绍如何安装包装器、配置 Hindsight 后端、了解按代码库划分记忆库的策略，以及通过简短的验证流程确认记忆确实在使用。操作时可同时参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-aider aider-chat`。
> 2. 设置 `HINDSIGHT_API_TOKEN`（Cloud）或 `HINDSIGHT_API_URL`（自托管）。
> 3. 像运行 `aider` 一样运行 `hindsight-aider`，所有参数都会透传。
> 4. 记忆库默认使用 Git 代码库名称，因此记忆按项目隔离。
> 5. 验证后续会话能否记起先前会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你已具备以下条件：

- 已安装并能正常使用 Aider（`aider-chat`）
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 有一个 Git 代码库，因为 Aider 记忆按代码库隔离

## 步骤 1：安装包装器 {#step-1-install-the-wrapper}

将包装器与 Aider 一起安装。

```bash
pip install hindsight-aider aider-chat
```

`hindsight-aider` 可以直接替代 `aider` 命令。它不会改变 Aider 的工作方式，而是在启动流程外包一层：会话开始前召回记忆，会话结束后保存记忆。

## 步骤 2：将包装器连接到 Hindsight {#step-2-point-the-wrapper-at-hindsight}

使用 Hindsight Cloud 时：

```bash
export HINDSIGHT_API_TOKEN="hsk_..."
```

使用自托管 Hindsight 服务器时：

```bash
export HINDSIGHT_API_URL="http://localhost:8888"
```

然后像运行 `aider` 一样使用它，所有参数都会透传：

```bash
hindsight-aider                       # 交互式模式，已加载项目记忆
hindsight-aider -m "add retry logic"  # 单次运行；使用该消息进行召回
hindsight-aider src/app.py            # 接受任意 aider 参数
```

## 包装器如何使用记忆 {#how-the-wrapper-uses-memory}

Aider 没有 MCP 客户端或逐提示钩子，因此包装器会在 Aider 提供的两个时机介入：

- **Recall（召回，会话前）：** 包装器查询 Hindsight，将结果写入 `.aider.hindsight-memory.md`，然后运行 `aider --read .aider.hindsight-memory.md …`，使记忆进入上下文。使用 `hindsight-aider -m "fix the auth bug"` 时，该消息会用作召回查询；否则，包装器会执行通用的项目上下文查询。
- **Retain（存入，会话后）：** Aider 退出时，包装器读取本次会话写入聊天历史文件的部分，并将其存入该代码库对应的记忆库。

每次会话只会召回一次，因为无法在 Aider 的对话中途挂接。这符合 Aider 以会话为单位的工作方式：每次会话开始时都能获得项目此前积累的信息，退出时则保存本次会话学到的内容。

如需了解底层行为，请阅读 [Hindsight 的记忆召回 API](/developer/api/recall) 和 [Hindsight 的记忆存入 API](/developer/api/retain)。

## 按代码库划分记忆库 {#per-repo-memory-banks}

记忆库默认使用**Git 代码库名称**，因此每个项目的记忆彼此隔离；同一代码库中使用 Hindsight 的其他编辑器集成也可以共享这些记忆。

也就是说，如果你在同一个代码库中还使用其他编辑器或编程智能体配合 Hindsight，它们会读取同一份项目记忆。在一种工具中学到的约定，也能在其他工具中使用。

如果你希望采用其他记忆库策略，例如让多个相关代码库共用一个记忆库，请参阅[包的 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/aider)，了解完整配置选项。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 在某个代码库中运行 `hindsight-aider`
2. 做出一项更改，并让 Aider 记录一条决策或约定
3. 退出会话，让系统保存会话记录
4. 在同一代码库中再次运行 `hindsight-aider`
5. 询问此前记录的决策

例如：

- 第一次会话重构认证模块，并记录更改重试逻辑的原因
- 第二次会话询问当前的认证约定

如果召回的记忆文件中出现了先前记录的决策，就说明配置正常。

## 常见错误 {#common-mistakes}

### 在 Git 代码库之外运行 {#running-outside-a-git-repo}

Aider 记忆按代码库隔离，因此应在你希望关联记忆的代码库目录中运行包装器。

### 期待会话中途召回 {#expecting-mid-session-recall}

召回只在启动时运行一次。如果新任务需要获取新记忆，请开启新会话，或使用 `-m` 传入任务。

### 过早检查存入结果 {#testing-retain-too-early}

Aider 退出时才会保存会话记录。如果还没退出就检查，当前会话可能尚未存入。

### 误以为记忆是全局共享的 {#assuming-memory-is-global}

默认情况下，每个代码库都有自己的记忆库。这通常符合预期，但不要指望一个代码库能召回另一个代码库的上下文。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也能使用，只需设置 `HINDSIGHT_API_URL`。

### 这会改变我使用 Aider 的方式吗？ {#does-this-change-how-i-use-aider}

不会。所有参数都会透传，因此使用 `hindsight-aider` 的方式与使用 `aider` 完全相同。

### 记忆的范围如何划分？ {#how-is-memory-scoped}

按 Git 代码库划分，默认使用代码库名称作为记忆库名称。

### 这与其他编程智能体集成类似吗？ {#is-this-similar-to-other-coding-agent-integrations}

思路相似。Aider 使用只读上下文文件和聊天历史，而不是插件或 MCP；不过，会话前召回、会话后存入的模式相同。可以对照 [OpenCode 集成](/sdks/integrations/opencode)和 [Claude Code 集成](/sdks/integrations/claude-code)。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整的 Hindsight 文档](/)
- 按[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的记忆召回 API](/developer/api/recall)
- 查看 [Hindsight 的记忆存入 API](/developer/api/retain)
- 阅读 [Aider 集成文档](/sdks/integrations/aider)
