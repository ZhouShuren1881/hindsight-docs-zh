---
title: "指南：使用 Hindsight 为 Cline 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, cline, coding-agents, memory]
description: "通过生命周期钩子在任务前召回、之后存储，为 Cline 添加记忆，无需 MCP。"
image: /img/guides/guide-cline-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Cline 添加记忆](/img/guides/guide-cline-memory-with-hindsight.svg)

安装器接入 Cline 生命周期，任务前召回、结束时存储，跨会话保留项目上下文。

无需 MCP，安装 `TaskStart`、`UserPromptSubmit`、`TaskComplete`、`TaskCancel` 脚本，自动确定执行，不依赖模型决定。

本指南介绍 CLI、安装、启用钩子和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-cline`.
> 2. 项目目录运行 `hindsight-cline install --api-url … --api-token …`。
> 3. Cline Settings → Features → Hooks 中启用。
> 4. 注入 `<hindsight_memories>`，默认存入 `cline`。
> 5. 验证后续任务。

## 前提条件 {#prerequisites}

开始前确认：

- VS Code 中正常 Cline。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- macOS 或 Linux 和 Python 3，Windows 不运行钩子。

## 步骤 1：安装 CLI {#step-1-install-the-cli}

安装包。

```bash
pip install hindsight-cline
```

提供命令管理钩子脚本。

## 步骤 2：运行安装器 {#step-2-run-the-installer-against-hindsight}

项目目录用 URL 和密钥。

Cloud：

```bash
hindsight-cline install \
  --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

`--global` 安装所有项目，`uninstall` 移除，全局安装则加 `--global`。

复制四脚本及 `lib/`、`settings.json` 到项目 `.clinerules/hooks/`（可提交共享），或全局 `~/Documents/Cline/Rules/Hooks/`。

## 步骤 3：启用钩子 {#step-3-enable-hooks-in-cline}

在 **Settings → Features → Hooks（设置 → 功能 → 钩子）**启用，否则已安装也不执行。

## 钩子如何使用记忆 {#how-the-hooks-use-memory}

四个生命周期点：

| Cline 钩子 | Hindsight 的操作 |
| ------------------ | --------------------------------------------------------------------- |
| `TaskStart` | 召回并注入新任务上下文。 |
| `UserPromptSubmit` | 召回消息相关记忆，记录提示供存储。 |
| `TaskComplete` | 存储任务记录和摘要。 |
| `TaskCancel` | 存储取消任务的部分记录。 |

注入 `<hindsight_memories>`。Cline 不传记录，因此本地积累提示，结束存储，默认单库 `cline`。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 配置 {#configuration}

默认在安装的 `settings.json`，个人覆盖在重装保留的 `~/.hindsight/cline.json` 或环境变量。

常见键 `hindsightApiUrl`、`hindsightApiToken`、`bankId`、`autoRecall`、`autoRetain`、`recallBudget`、`dynamicBankId`、`debug`。动态 true 按项目或会话分库，仅召回可关存储。

完整选项见[包 README](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cline)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. URL 密钥安装，启用。
2. 任务记录决策或约定。
3. 完成存储。
4. 同项目新任务。
5. 问此前。

注入块呈现即有效，也可 API 或仪表盘查看库。

## 常见错误 {#common-mistakes}

### 忘记启用 {#forgetting-to-enable-hooks-in-cline}

安装不够，必须设置中启用。

### Windows 运行 {#running-on-windows}

只支持 macOS、Linux，需 Python 3。

### 测存储太早 {#testing-retain-too-early}

完成或取消才存，结束前可能未保存。

### 假定默认按项目 {#assuming-a-per-project-bank-by-default}

默认一个 `cline`，需动态则设置。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，安装 `hindsight-all`、运行 API，安装器指向本地。

### 用 MCP 吗？ {#does-this-use-mcp}

不用，全部生命周期钩子，自动确定执行。

### 如何限定？ {#how-is-memory-scoped}

默认一库，动态 true 按项目会话。

### 哪些平台？ {#which-platforms-are-supported}

macOS 和 Linux，Python 3。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Cline 集成文档](/sdks/integrations/cline)。
