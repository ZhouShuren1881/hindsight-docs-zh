---
title: "指南：使用 Hindsight 为 Cline 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cline, coding-agents, memory]
description: "通过生命周期钩子在每项任务开始前召回上下文，并在任务结束后存入相关内容，为 Cline 添加 Hindsight 记忆，无需 MCP。"
image: /img/guides/guide-cline-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cline 添加记忆](/img/guides/guide-cline-memory-with-hindsight.svg)

如果你想为 Cline 添加 **Hindsight 记忆**，最简便的做法是使用 `hindsight-cline` 安装器，将 Hindsight 接入 Cline 的生命周期钩子。钩子会在每项任务开始前召回相关记忆，并在任务结束时存入任务中发生的内容。这样，Cline 就能跨会话使用长期记忆，而不必让每项新任务都重新发现相同的项目上下文。

这种方式很适合 Cline，因为它不依赖 MCP。Cline 提供生命周期钩子，也就是在关键时刻运行的小型脚本；此集成会在 `TaskStart`、`UserPromptSubmit`、`TaskComplete` 和 `TaskCancel` 这四个时机安装钩子。由于它通过钩子运行，记忆操作会自动发生，行为是确定的，不依赖模型是否决定调用某个工具。

本指南将介绍如何安装 CLI、对接 Hindsight 后端运行安装器、在 Cline 中启用钩子，以及通过快速验证流程确认记忆确实正在使用。操作时可以同时查看[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-cline`。
> 2. 在项目目录中运行 `hindsight-cline install --api-url … --api-token …`。
> 3. 在 Cline 中启用钩子：Settings → Features → Hooks（设置 → 功能 → 钩子）。
> 4. 召回的记忆会作为 `<hindsight_memories>` 上下文块注入；记忆默认写入 `cline` 记忆库。
> 5. 验证后续任务能否记住先前任务存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 已在 VS Code 中安装并正常使用 Cline
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 使用 macOS 或 Linux（Cline 钩子无法在 Windows 上运行），并已安装 Python 3

## 步骤 1：安装 CLI {#step-1-install-the-cli}

安装 `hindsight-cline` 包：

```bash
pip install hindsight-cline
```

安装后会提供 `hindsight-cline` 命令，用于安装和管理 Cline 钩子脚本。

## 步骤 2：运行安装器并连接 Hindsight {#step-2-run-the-installer-against-hindsight}

在项目目录中运行安装器，并提供 Hindsight URL 和密钥。

使用 Hindsight Cloud 时：

```bash
hindsight-cline install \
  --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

运行 `hindsight-cline install --global` 可为所有项目安装；之后运行 `hindsight-cline uninstall` 可移除。如果安装时使用了全局模式，卸载时也要加上 `--global`。

安装器会复制四个钩子脚本（`TaskStart`、`UserPromptSubmit`、`TaskComplete`、`TaskCancel`），以及它们所需的 `lib/` 和 `settings.json`。项目级安装会将文件放入 `.clinerules/hooks/`（可以提交到版本库与团队共享）；全局安装则放入 `~/Documents/Cline/Rules/Hooks/`。

## 步骤 3：在 Cline 中启用钩子 {#step-3-enable-hooks-in-cline}

最后，在 Cline 中打开 **Settings → Features → Hooks（设置 → 功能 → 钩子）**并启用钩子。启用前，脚本虽然已经安装，但 Cline 不会运行它们。

## 钩子如何使用记忆 {#how-the-hooks-use-memory}

Cline 提供生命周期钩子，此集成会在以下四个时机运行：

| Cline 钩子 | Hindsight 的操作 |
| --- | --- |
| `TaskStart` | 召回新任务的上下文并注入其中。 |
| `UserPromptSubmit` | 召回与用户消息相关的记忆，并记录提示内容，以便之后存入。 |
| `TaskComplete` | 存入任务记录和摘要。 |
| `TaskCancel` | 存入已取消任务的部分记录。 |

召回的记忆会作为 `<hindsight_memories>` 上下文块注入。Cline 不会向钩子提供任务记录，因此该集成会在本地累积每项任务的提示，并在任务结束时将其存入。记忆默认写入一个 `cline` 记忆库。

如需了解更底层的行为，请参阅 [Hindsight 的召回 API](/developer/api/recall)和 [Hindsight 的存入 API](/developer/api/retain)。

## 配置 {#configuration}

默认值位于安装时提供的 `settings.json` 中。个人覆盖项可以放在 `~/.hindsight/cline.json` 中（重新安装后仍会保留），也可以通过 `HINDSIGHT_*` 环境变量设置。

常用键包括 `hindsightApiUrl`、`hindsightApiToken`、`bankId`、`autoRecall`、`autoRetain`、`recallBudget`、`dynamicBankId` 和 `debug`。例如，将 `dynamicBankId` 设为 `true`，即可按项目或会话使用不同的记忆库；如果只想召回记忆，可以关闭 `autoRetain`。

完整配置选项请参阅[包的 README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/cline)。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序测试：

1. 使用你的 URL 和密钥运行 `hindsight-cline install`，并在 Cline 中启用钩子。
2. 开始一项任务，让 Cline 记录一项决定或约定。
3. 完成任务，使任务记录得以存入。
4. 在同一项目中开始新任务。
5. 询问此前记录的决定。

如果召回的 `<hindsight_memories>` 块中出现了此前的决定，说明配置正在正常工作。你也可以通过 API 或仪表盘检查 `cline` 记忆库，确认其中出现了新记忆。

## 常见错误 {#common-mistakes}

### 忘记在 Cline 中启用钩子 {#forgetting-to-enable-hooks-in-cline}

仅安装脚本还不够。必须在 Settings → Features → Hooks 中启用钩子，否则它们不会运行。

### 在 Windows 上运行 {#running-on-windows}

Cline 钩子仅能在 macOS 和 Linux 上运行，并且需要 Python 3。在 Windows 上，钩子不会执行。

### 过早检查存入结果 {#testing-retain-too-early}

任务记录会在任务完成或取消时存入。如果在任务结束前检查，会话可能尚未存储。

### 误以为默认使用项目专属记忆库 {#assuming-a-per-project-bank-by-default}

记忆默认写入一个 `cline` 记忆库。如果希望每个项目或会话使用不同的记忆库，请设置 `dynamicBankId`。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管的 Hindsight 服务器也可以使用：安装 `hindsight-all`，运行 `hindsight-api`，然后将安装器指向该服务器，并设置 `--api-url http://localhost:8888`。

### 这会使用 MCP 吗？ {#does-this-use-mcp}

不会。此集成完全通过 Cline 的生命周期钩子运行，因此记忆操作会自动发生，不依赖模型是否决定调用某个工具。

### 记忆如何划分范围？ {#how-is-memory-scoped}

默认情况下，所有内容都会写入一个 `cline` 记忆库。将 `dynamicBankId` 设为 `true`，即可为每个项目或会话使用不同的记忆库。

### 支持哪些平台？ {#which-platforms-are-supported}

仅支持 macOS 和 Linux。Cline 钩子无法在 Windows 上运行，并且需要 Python 3。

## 后续步骤 {#next-steps}

- 如果需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io)开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的召回 API](/developer/api/recall)
- 查看 [Hindsight 的存入 API](/developer/api/retain)
- 阅读 [Cline 集成文档](/sdks/integrations/cline)
