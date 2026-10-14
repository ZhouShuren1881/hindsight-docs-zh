---
title: "指南：使用 Hindsight 为 Cursor CLI 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cursor-cli, coding-agents, memory]
description: "使用 hindsight-cursor-cli 钩子脚本为 Cursor CLI 添加 Hindsight 记忆，让每次提示都能召回相关上下文，并在每轮结束后自动存入对话。"
image: /img/guides/guide-cursor-cli-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cursor CLI 添加记忆](/img/guides/guide-cursor-cli-memory-with-hindsight.svg)

如果你想为 **Cursor CLI 添加 Hindsight 记忆**，最简洁的方案是使用 `hindsight-cursor-cli` 包。它会安装 Python 钩子脚本，在每次提示前召回相关记忆，并在每轮结束后存入对话。这样，Cursor CLI 就能跨会话使用长期记忆，无须每次开始新对话时都重新了解你的技术栈、偏好和过往决策。

Cursor CLI 很适合这种方式，因为它提供的是钩子事件，而不是 MCP 客户端。该包会接入四个事件：`sessionStart`、`beforeSubmitPrompt`、`stop` 和 `sessionEnd`，从而自动执行召回和存入，不必改变你使用 Cursor 的流程。钩子脚本只使用 Python 标准库，因此 `pip install` 只会安装一次性安装器。

本指南将介绍如何安装钩子、将其连接到 Hindsight 后端、了解按项目划分记忆库的策略，以及通过一个快速验证流程确认记忆确实在使用。操作时可以同时参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-cursor-cli`。
> 2. 运行 `hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key`（本地守护进程可省略这些标志）。
> 3. 重启 Cursor CLI，即可使用记忆。
> 4. 记忆库默认名为 `cursor-cli`；启用 `dynamicBankId` 可按项目隔离。
> 5. 验证后续会话能否记住此前会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认已具备以下条件：

- 已安装并能正常使用支持钩子的 Cursor CLI v0.45+
- 可使用 Python 3.9+（钩子脚本只依赖标准库）
- 能访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管的 `hindsight-embed` 守护进程

## 步骤 1：安装软件包 {#step-1-install-the-package}

使用 pip 安装一次性安装器。

```bash
pip install hindsight-cursor-cli
```

`pip install` 只会安装该安装器；钩子脚本本身仅使用 Python 标准库，没有任何运行时依赖。

## 步骤 2：安装钩子 {#step-2-install-the-hooks}

运行一次安装器，将钩子接入 Cursor CLI。

连接 Hindsight Cloud：

```bash
hindsight-cursor-cli install --api-url https://api.hindsight.vectorize.io --api-token your-api-key
```

连接自托管的本地守护进程时，省略这些标志即可；安装器默认连接本地 `hindsight-embed`：

```bash
hindsight-cursor-cli install
```

安装器会将钩子脚本复制到 `~/.cursor/hooks/cursor-cli/`，写入 `~/.cursor/hooks.json`（与已有条目合并），并为个人配置创建 `~/.hindsight/cursor-cli.json`。重启 Cursor CLI 以加载这些钩子。

卸载时会删除钩子脚本，并从 `~/.cursor/hooks.json` 中移除 Hindsight 的条目，同时保留你的个人配置：

```bash
hindsight-cursor-cli uninstall
```

## 步骤 3：将钩子连接到 Hindsight {#step-3-point-the-hooks-at-hindsight}

如果安装时没有传入 `--api-url` 和 `--api-token`，请在 `~/.hindsight/cursor-cli.json` 中设置连接信息。此用户配置会在更新时保留：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

若要连接本地守护进程，请将 `hindsightApiUrl` 留空，并单独启动 `hindsight-embed`。`session_start.py` 钩子会通过 `apiPort` 检测它，默认端口为 `9077`：

```bash
uvx hindsight-embed
```

配置按以下顺序加载，后加载的条目优先级更高：内置默认值、位于 `~/.cursor/hooks/cursor-cli/settings.json` 的插件 `settings.json`、位于 `~/.hindsight/cursor-cli.json` 的用户配置，最后是环境变量。大多数设置也可以通过环境变量覆盖，例如 `HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN` 和 `HINDSIGHT_BANK_ID`。

## 钩子如何使用记忆 {#how-the-hooks-use-memory}

Cursor CLI 没有 MCP 客户端，因此该包通过四种钩子事件工作：

- **Recall（召回，提示前）：** 在 `beforeSubmitPrompt` 事件中，`recall.py` 读取提示，向 Hindsight 查询最相关的记忆，并将它们作为附加上下文注入。Cursor 会在发送给模型前，将这个上下文块添加到对话中；模型可以看到它，但它不会显示在对话记录中。
- **Retain（存入，每轮后）：** 在 `stop` 事件中，`retain.py` 读取会话记录，移除先前注入的记忆标签以避免反馈循环，然后异步向 Hindsight 发送对话。在 `sessionEnd` 事件中，`session_end.py` 会强制执行最后一次存入，以免丢失最后几轮对话。

Retain 会将会话 ID 用作文档 ID，因此再次处理同一会话时会更新已存储的内容，而不是重复创建。默认情况下，`retainMode` 为 `"full-session"`，会为每个会话发送完整记录；`"chunked"` 则每隔 N 轮发送一次滑动窗口内容。

如需了解更底层的行为，请阅读 Hindsight 的[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 按项目划分记忆库 {#per-project-memory-banks}

默认情况下，所有会话共用名为 `cursor-cli` 的记忆库。若要让每个项目使用独立记忆，请在配置中启用动态记忆库 ID：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置时，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Cursor 会分别存入和召回记忆。记忆库 ID 根据工作目录生成。若要让同一仓库的所有工作树共享记忆，请在 `dynamicBankGranularity` 中使用 `gitProject` 代替 `project`。

所有配置选项请参阅[软件包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cursor-cli)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

建议按以下顺序测试：

1. 启动一个 Cursor CLI 会话。
2. 告诉它一项值得记住的决策或约定。
3. 结束会话，让系统存入会话记录。
4. 启动一个新的 Cursor CLI 会话。
5. 询问之前的决策。

由于 `retainEveryNTurns` 默认值为 `10`，`stop` 钩子每 10 轮才会执行一次存入。测试时，可在 `~/.hindsight/cursor-cli.json` 中添加 `"retainEveryNTurns": 1`，让它每轮都执行。关闭会话时，`sessionEnd` 钩子也会强制执行最后一次存入。

如果新会话召回了此前的决策，说明配置已生效。

## 常见错误 {#common-mistakes}

### 过早测试存入功能 {#testing-retain-too-early}

只有在内容已存入后，Recall 才会返回结果。请先完成一个 Cursor 会话，再启动新会话。

### 测试时仍使用 retainEveryNTurns 默认值 {#leaving-retaineverynturns-at-the-default-while-testing}

`retainEveryNTurns` 默认值为 `10`，因此较短的测试会话可能不会触发会话中途的存入。验证时将其设为 `1`；短会话则可以依靠 `sessionEnd` 刷新存入内容。

### 安装后钩子没有触发 {#hooks-not-firing-after-install}

确认 `~/.cursor/hooks.json` 存在，并且 `python3` 位于 shell 的 `$PATH` 中。Cursor CLI 需要重启会话才能加载新钩子；如有需要，可重新运行 `hindsight-cursor-cli install` 重写相关条目。

### 误以为记忆默认按项目隔离 {#assuming-memory-is-per-project-by-default}

默认情况下，每个会话都共用同一个 `cursor-cli` 记忆库。若要让各项目拥有独立记忆，请启用 `dynamicBankId`。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。也可以使用自托管的本地 `hindsight-embed` 守护进程：省略安装标志，并单独运行 `uvx hindsight-embed`。

### 这会改变我使用 Cursor CLI 的方式吗？ {#does-this-change-how-i-use-cursor-cli}

不会。钩子会在 Cursor 事件发生时自动运行，无须改变工作流程。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

默认情况下，所有会话共用一个记忆库（`cursor-cli`）。启用 `dynamicBankId` 后，系统会根据工作目录为每个项目生成独立记忆库。

### 为什么短会话中的记忆没有存入？ {#why-arent-my-memories-being-stored-during-a-short-session}

`stop` 钩子每经过 `retainEveryNTurns` 轮才会存入一次，默认值为 `10`。测试时将 `"retainEveryNTurns": 1`，或者依靠关闭会话时强制执行最后一次存入的 `sessionEnd` 钩子。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 Hindsight 的[召回 API](/developer/api/recall)。
- 查阅 Hindsight 的[存入 API](/developer/api/retain)。
- 阅读 [Cursor CLI 集成文档](/sdks/integrations/cursor-cli)。
