---
sidebar_position: 7
title: "使用 Hindsight 为 Cline 添加持久记忆 | 集成指南"
description: "通过 Hindsight 生命周期钩子为 Cline VS Code 编程智能体添加持久记忆，无需 MCP。钩子在每个任务开始前自动召回上下文，结束后存储任务经历。"
---

# Cline

:::warning 已由 Coding Agents 插件取代
**Cline 集成**已由 [编码智能体插件](/sdks/integrations/coding-agents)取代。一个软件包即可覆盖 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，并为每个仓库提供所有智能体共享的记忆库，而不是每个智能体一个记忆库。

本页面及已发布的软件包仍可使用，但不再继续开发。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install cline-cli
```

记忆不会自动迁移，因为记忆库范围不同，且无法导入此智能体的历史记录（保存在内部数据库中）。参见[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


[查看更新日志 →](/changelog/integrations/cline)

使用 [Hindsight](https://vectorize.io/hindsight) 为 [Cline](https://github.com/cline/cline) 提供持久记忆，**无需 MCP**。Cline 的[生命周期钩子](https://docs.cline.bot/customization/hooks)运行小型脚本，在每个任务前自动召回相关上下文，任务结束时存储经历。由于基于钩子执行，记忆行为具有确定性，不依赖模型决定是否调用工具。

## 快速入门 {#quick-start}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io)获取 Hindsight Cloud API 密钥，无需自托管。
:::

安装 CLI，然后在项目目录中使用 Hindsight URL 和密钥运行安装程序：

```bash
pip install hindsight-cline

hindsight-cline install \
  --api-url https://api.hindsight.vectorize.io --api-token YOUR_KEY
```

使用 `hindsight-cline install --global` 为所有项目安装，或使用 `hindsight-cline uninstall` 移除。

然后**在 Cline 中启用钩子**：Settings（设置）→ Features（功能）→ Hooks（钩子）。

:::note 平台
Cline 钩子**仅在 macOS 和 Linux 上运行**（不支持 Windows），需要 Python 3。
:::

## 工作原理 {#how-it-works}

| Cline 钩子         | Hindsight 执行的操作                                                   |
| ------------------ | --------------------------------------------------------------------- |
| `TaskStart`        | 召回新任务的上下文并注入。                        |
| `UserPromptSubmit` | 为消息召回记忆；记录提示词，以便之后存储。 |
| `TaskComplete`     | 存储任务的对话记录和摘要。                             |
| `TaskCancel`       | 存储被取消任务的部分对话记录。                    |

召回的记忆以 `<hindsight_memories>` 上下文块注入。Cline 不会将对话记录交给钩子，因此集成会在本地累积每个任务的提示词，并在任务结束时存储。记忆保存在单一记忆库中（默认 `cline`）。

## 配置 {#configuration}

默认值位于已安装的 `settings.json` 中；个人覆盖设置放在 `~/.hindsight/cline.json`（重新安装后仍保留），或使用 `HINDSIGHT_*` 环境变量。常用键：`hindsightApiUrl`、`hindsightApiToken`、`bankId`、`autoRecall`、`autoRetain`、`recallBudget`、`dynamicBankId`、`debug`。

## 自托管 {#self-hosting}

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api  # http://localhost:8888
```

将安装程序指向它：`--api-url http://localhost:8888`。

完整详情参见[集成源码](https://github.com/vectorize-io/hindsight/tree/v0.10.3/hindsight-integrations/cline)。
