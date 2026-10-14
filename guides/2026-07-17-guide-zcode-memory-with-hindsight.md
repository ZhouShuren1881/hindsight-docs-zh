---
title: "指南：用 Hindsight 为 ZCode 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, zcode, coding-agents, memory]
description: "使用 hindsight-zcode 钩子为 ZCode 接入 Hindsight，让它在每次提示前召回相关上下文，并在每轮结束后自动存入记忆。"
image: /img/guides/guide-zcode-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：用 Hindsight 为 ZCode 添加记忆](/img/guides/guide-zcode-memory-with-hindsight.svg)

如果你想**用 Hindsight 为 ZCode 添加记忆**，最简便的方式是安装 `hindsight-zcode` 钩子。ZCode 是 Z.ai 的 GLM 桌面编码智能体，它内嵌了 Claude Code 智能体运行时，因此 Python 钩子脚本可以在每次提示前召回相关记忆，并在智能体回复后存入本轮内容。这样，ZCode 就能跨会话保留长期记忆，而不必让每次新对话都重新发现同一项目的上下文。

ZCode 很适合这种方式，因为它自带原生进程钩子系统，并在自己的配置命名空间中读取标准的 Claude Code 钩子架构。钩子使用 ZCode 提供的两个事件：在模型看到本轮内容前，通过 `UserPromptSubmit` 注入召回的记忆；智能体完成后，通过 `Stop` 存入本轮内容。无需在 ZCode 旁边运行 MCP 服务器，钩子脚本会直接调用 Hindsight 的 REST API。

本指南将介绍如何安装钩子、配置 Hindsight 后端、了解记忆库范围的工作方式，以及通过快速验证流程确认记忆确实在使用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-zcode`。
> 2. 运行 `hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key`（Cloud）；若使用本地守护进程，则运行 `hindsight-zcode install`。
> 3. 重启 ZCode，使其加载新钩子。
> 4. 记忆库默认使用 `zcode`，所有 Hindsight 集成都共享该记忆库；启用 `dynamicBankId` 可按项目隔离。
> 5. 验证后续提示能否召回先前轮次存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保具备以下条件：

- 已安装支持配置钩子的 ZCode（`~/.zcode/cli/config.json`）
- Python 3.9+，供钩子脚本使用（仅依赖标准库，无运行时依赖）
- 可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器

## 第 1 步：安装 CLI {#step-1-install-the-cli}

安装 `hindsight-zcode` 软件包。`pip install` 只会安装一次性安装程序；钩子脚本本身仅使用 Python 标准库。

```bash
pip install hindsight-zcode
```

## 第 2 步：运行安装程序 {#step-2-run-the-installer}

若使用 Hindsight Cloud，请传入 API URL 和令牌：

```bash
hindsight-zcode install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

若使用本地 `hindsight-embed` 守护进程，则省略这些标志：

```bash
hindsight-zcode install
```

安装程序会将钩子脚本复制到 `~/.zcode/hooks/hindsight/`，并将 Hindsight 钩子合并到 `~/.zcode/cli/config.json` 的 `hooks.events` 下（保留已有键和其他钩子），将 `hooks.enabled` 设为 `true`，并为你的个人配置创建 `~/.hindsight/zcode.json` 初始文件。它绝不会修改 Claude Code 配置 `~/.claude/settings.json`。

重启 ZCode 以加载钩子，之后记忆功能便会生效。

卸载时会删除脚本，并且只从配置中移除 Hindsight 的条目：

```bash
hindsight-zcode uninstall
```

## 第 3 步：配置连接（可选） {#step-3-configure-the-connection-optional}

安装程序会创建 `~/.hindsight/zcode.json`，用于保存更新后仍有效的个人覆盖设置。典型的 Cloud 配置如下：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "your-api-key",
  "bankId": "my-zcode-memory"
}
```

若要连接本地守护进程，请单独运行 `hindsight-embed`（例如 `uvx hindsight-embed`），将 `hindsightApiUrl` 留空；插件会通过 `apiPort` 连接守护进程（默认值为 `9077`）。每项设置也都可以用环境变量覆盖，例如 `HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN` 和 `HINDSIGHT_BANK_ID`。

## 钩子如何使用记忆 {#how-the-hooks-use-memory}

ZCode 读取标准的 Claude Code 钩子架构，因此该集成会接入三个钩子事件：

- **会话开始（`SessionStart`）：**确认 Hindsight 可访问；必要时预热本地守护进程。
- **Recall（召回，`UserPromptSubmit`）：**向 Hindsight 查询最相关的记忆，并通过 `hookSpecificOutput.additionalContext` 注入，使模型可以看到这些记忆，但不会将其加入对话记录。它还会暂存提示，以便后续存入记忆。
- **Retain（存入，`Stop`）：**将暂存的提示与智能体回复配对，然后通过 POST 将本轮内容发送到 Hindsight。

ZCode 不提供 `SessionEnd` 事件，因此记忆在 `Stop` 事件中存入。使用默认值 `retainEveryNTurns` 时，每轮完成后都会存储，每轮各自成为一条记忆。

如需了解更底层的行为，请阅读 [Hindsight 召回 API](/developer/api/recall) 和 [Hindsight 存入 API](/developer/api/retain)。

## 记忆库范围与跨工具记忆 {#bank-scoping-and-cross-tool-memory}

记忆库默认使用 `zcode`，除非启用动态记忆库 ID，否则所有会话都会共享该记忆库。由于 Claude Code、Cursor 和其他 Hindsight 集成也共享同一个 Hindsight 记忆库，记忆可以随你在不同工具间流转：在一个工具中形成的约定，在其他工具中也能使用。

若要按项目隔离，请将 `dynamicBankId` 设为 `true`。系统会根据配置的粒度字段派生出唯一的记忆库 ID，并自动生成类似 `zcode::my-project` 的记忆库。完整配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/zcode)。

ZCode 还自带按项目划分的本地记忆。Hindsight 与之互补：它会将记忆存储在云端或自托管的记忆库中，并在不同工具和机器间共享，而不是只留在某个 ZCode 项目本地。

## 验证记忆是否生效 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 安装钩子后启动 ZCode。
2. 在提示中说明一项决定或约定，并等待本轮完成，使其存入记忆。
3. 开始新会话，或提出后续问题。
4. 询问先前提到的决定。

例如：

- 某一轮说明项目使用 FastAPI 和 asyncpg，而不是 SQLAlchemy。
- 后续提示询问该项目使用什么数据库技术栈。

如果召回的上下文中出现了先前的决定，说明配置已生效。如果想查看钩子的运行情况，可以启用调试模式（设置 `"debug": true` 或 `HINDSIGHT_DEBUG=true`）。

## 常见问题排查 {#common-mistakes}

### 未重启 ZCode {#not-restarting-zcode}

ZCode 会在会话重启时加载新钩子。如果安装后记忆没有立即被召回或存入，请先重启 ZCode。

### `hooks.enabled` 处于关闭状态 {#hooksenabled-left-off}

安装程序会将 `hooks.enabled` 设为 `true`。如果钩子没有触发，请确认 `~/.zcode/cli/config.json` 是有效 JSON，其中包含 `"hooks": {"enabled": true, ...}`，并且 `hooks.events` 下存在 Hindsight 条目。

### `python3` 不在 PATH 中 {#python3-not-on-path}

钩子脚本通过 `python3` 运行。如果脚本没有执行，请确认当前 shell 的 `$PATH` 中包含 `python3`。

### 误以为默认按项目隔离记忆 {#expecting-per-project-memory-by-default}

默认情况下，所有 ZCode 会话都会共享 `zcode` 记忆库。若要按项目隔离，请启用 `dynamicBankId`。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。也可以使用自托管的 Hindsight 服务器：在本地运行 `hindsight-embed`，不带标志运行安装程序，并将 `hindsightApiUrl` 留空，这样插件就会连接本地守护进程。

### 这会改变我使用 ZCode 的方式吗？ {#does-this-change-how-i-use-zcode}

不会。钩子会在后台运行，你仍可像以前一样使用 ZCode。每次提示前都会召回记忆，每轮结束后都会存入记忆。

### 是否需要运行 MCP 服务器？ {#is-an-mcp-server-required}

不需要。该集成由纯 Python 钩子脚本组成，它们会调用 Hindsight REST API。无需在 ZCode 旁边运行其他服务。

### 这会修改我的 Claude Code 配置吗？ {#does-this-touch-my-claude-code-config}

不会。安装程序会写入 ZCode 的配置命名空间（`~/.zcode/cli/config.json`），绝不会修改 `~/.claude/settings.json`。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 召回 API](/developer/api/recall)
- 查看 [Hindsight 存入 API](/developer/api/retain)
- 阅读 [ZCode 集成文档](/sdks/integrations/zcode)
