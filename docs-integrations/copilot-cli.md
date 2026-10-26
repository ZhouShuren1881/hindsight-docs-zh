---
sidebar_position: 7
title: "GitHub Copilot CLI 与 Hindsight 持久记忆 | 集成指南"
description: "通过 Hindsight 为 GitHub Copilot CLI 添加持久记忆。Python 钩子脚本会在会话开始时自动召回上下文，并将对话存入记忆，无需更改工作流程。"
---

# GitHub Copilot CLI {#github-copilot-cli}

:::warning 已停止维护，请改用 Coding Agents 插件
**GitHub Copilot CLI 集成** 已由 [Coding Agents 插件](/sdks/integrations/coding-agents) 取代。该插件将 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体整合在一个软件包中，并让同一存储库中的所有智能体共用一个记忆库，而不是每个智能体各用一个记忆库。

此集成已停止维护，已发布的软件包也不会再有后续更新。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install copilot-cli
```

记忆不会自动迁移：两种集成的记忆库范围不同，而且无法导入此智能体的历史会话（这些会话保存在内部数据库中）。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/copilot-cli)
