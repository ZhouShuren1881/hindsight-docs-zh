---
title: "指南：用Hindsight添加ZCode记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zcode, coding-agents, memory]
description: "使用后视 zcode 挂钩将 ZCode 记忆与 Hindsight 一起添加，因此 ZCode 在每个提示之前回忆相关上下文并自动保留每个回合。"
image: /img/guides/guide-zcode-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 ZCode 添加记忆](/img/guides/guide-zcode-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 ZCode 添加记忆**，使用 `hindsight-zcode` 钩子。ZCode 是 Z.ai 的 GLM 桌面编码智能体，内嵌 Claude Code 运行时，因此 Python 钩子可在提示前召回、回复后存储每轮内容，实现跨会话长期记忆。

这非常适合ZCode因为它提供了一个本机进程挂钩系统并读取标准Claude来自其自己的配置命名空间的代码挂钩架构。挂钩使用两个点ZCode暴露：`UserPromptSubmit` 在模型看到转弯之前注入回忆记忆，并且 `Stop` 智能体完成后存储转弯。没有MCP并行运行的服务器ZCode— 钩子脚本调用  直接Hindsight的RESTAPI。

本指南将引导您安装挂钩，将它们指向您的Hindsight后端，了解记忆库范围如何工作，以及快速验证流程，以便您可以确认记忆实际上正在使用。保留[文档首页](/) 和 工作时， [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-zcode`。
> 2.运行`hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key`（云），或`hindsight-zcode install` 用于本地守护进程。
> 3.重新启动ZCode，以便加载新的钩子。
> 4.记忆库默认为`zcode`，与您共享Hindsight集成；启用`dynamicBankId` 用于每个项目的隔离。
> 5.验证稍后的提示是否会回忆起之前的回合存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- ZCode安装了配置挂钩支持 (`~/.zcode/cli/config.json`)
- Python 3.9+ 用于钩子脚本（仅限 stdlib — 无运行时依赖项）
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 第一步：安装CLI {#step-1-install-the-cli}

安装`hindsight-zcode` 包装。 `pip install` 仅提供一次性安装程序；钩子脚本本身是纯粹的Python标准库。

```bash
pip install hindsight-zcode
```

## 第 2 步：运行安装程序 {#step-2-run-the-installer}

对于Hindsight Cloud，传递您的API URL 和令牌：

```bash
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

对于本地人`hindsight-embed` 守护进程，省略标志：

```bash
hindsight-zcode install
```

安装程序将挂钩脚本复制到`~/.zcode/hooks/hindsight/`，合并Hindsight钩入 `~/.zcode/cli/config.json`下`hooks.events`（保留任何现有的钥匙和外来挂钩），套装`hooks.enabled`至`true`，还有种子`~/.hindsight/zcode.json`适合您的个人配置。它永远不会触及你的Claude Code配置位于`~/.claude/settings.json`。

重新启动ZCode加载钩子——然后记忆就活了。

卸载，这会删除脚本并仅从配置中删除Hindsight的条目：

```bash
hindsight-zcode uninstall
```

## 步骤 3：配置连接（可选） {#step-3-configure-the-connection-optional}

安装程序种子`~/.hindsight/zcode.json` 用于更新后仍保留的个人覆盖。典型的云配置：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key",
  "bankId": "my-zcode-memory"
}
```

要连接到本地守护进程，请运行 `hindsight-embed` 单独（例如`uvx hindsight-embed`)，离开`hindsightApiUrl` 空，插件连接到 上的守护进程 `apiPort`（默认`9077`）。每个设置还有一个环境变量覆盖 - 例如 `HINDSIGHT_API_URL`, `HINDSIGHT_API_TOKEN`，和`HINDSIGHT_BANK_ID`。

## 钩子如何使用记忆 {#how-the-hooks-use-memory}

ZCode 读取标准 Claude Code钩子模式，因此插件连接三个钩子事件：

- **会话开始（`SessionStart`）：**确认Hindsight可以访问，并在需要时预热本地守护进程。
- **召回（`UserPromptSubmit`）：**查询Hindsight获取最相关的记忆并通过 注入它们 `hookSpecificOutput.additionalContext`，因此模型可以看到它们，但它们不会出现在转录本中。它还存储了下一个记忆存储的提示。
- **存储（`Stop`）：** 将隐藏的提示与智能体的回复配对，并将回合发送至Hindsight。

ZCode不提供 `SessionEnd` 活动，因此保留骑行 `Stop`。使用默认`retainEveryNTurns`，回合完成后会被存储，每个回合都有自己的记忆。

对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 记忆库范围界定和跨工具记忆 {#bank-scoping-and-cross-tool-memory}

记忆库默认为`zcode`，并且所有会话共享该记忆库，除非您启用动态记忆库 ID。因为同样Hindsight记忆库共享Claude Code，Cursor，以及其他Hindsight集成，记忆在工具之间跟随您 - 在一种工具中学到的约定在其他工具中也可用。

对于每个项目的隔离，设置 `dynamicBankId`至`true`。从配置的粒度字段中派生出唯一的记忆库 ID，生成像 这样的记忆库 自动 `zcode::my-project`。参见[包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zcode) 了解完整的配置选项。

ZCode 还提供了自己的本地、每个项目的记忆。 Hindsight 是互补的：它将记忆存储在跨工具和机器共享的云或自托管记忆库中，而不是保留在一个 ZCode 项目本地。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 启动ZCode
2. 在提示中陈述决定或惯例，并让回合完成以便保留
3. 开始新的会话或询问后续情况
4. 询问之前的决定

例如：

- 一个回合确定该项目使用带有 asyncpg 的 FastAPI，而不是 SQLAlchemy
- 稍后的提示询问项目的数据库堆栈是什么

如果回忆起的上下文显示了先前的决定，则该设置正在起作用。启用调试模式 (`"debug": true`，或`HINDSIGHT_DEBUG=true`）如果你想看看钩子在做什么。

## 常见错误 {#common-mistakes}

### 不重启ZCode {#not-restarting-zcode}

ZCode 在会话重新启动时拾取新的钩子。如果安装后记忆没有被调用或保留，请先重新启动ZCode。

### `hooks.enabled` 已关闭 {#hooksenabled-left-off}

安装套件`hooks.enabled`至`true`，但如果钩子没有触发，请确认`~/.zcode/cli/config.json`有效JSON与 `"hooks": {"enabled": true, ...}` 和Hindsight下的条目 `hooks.events`。

### `python3`不在路径上 {#python3-not-on-path}

钩子脚本通过运行 `python3`。如果不执行，请确认 `python3` 已开启 来自你的 shell 的 `$PATH`。

### 默认情况下期望每个项目记忆 {#expecting-per-project-memory-by-default}

默认情况下每个ZCode会议分享`zcode`记忆库。如果您想要项目隔离，请启用 `dynamicBankId`。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 运行 `hindsight-embed` 本地，不带标志安装，然后离开 `hindsightApiUrl` 空，因此插件连接到本地守护进程。

### 这会改变我使用ZCode的方式吗？ {#does-this-change-how-i-use-zcode}

没有。钩子在后台运行；你像以前一样使用 ZCode 。 在每次提示之前都会调用记忆，并在每次转动之后保留记忆。

### 是否需要MCP服务器？ {#is-an-mcp-server-required}

没有。集成是简单的 Python 钩子脚本，调用 Hindsight 的 REST API。没有什么可以与ZCode一起运行。

### 这会影响我的Claude Code配置吗？ {#does-this-touch-my-claude-code-config}

没有。安装程序写入ZCode的配置命名空间 (`~/.zcode/cli/config.json`)并且从不修改`~/.claude/settings.json`。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io)如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[ZCode 集成文档](/sdks/integrations/zcode)
