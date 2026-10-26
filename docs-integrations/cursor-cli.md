---
sidebar_position: 7
title: "使用 Hindsight 为 Cursor CLI 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 Cursor CLI 添加持久记忆。Python 钩子脚本会在每次提示前自动召回上下文，并将对话存入记忆，无需更改工作流程。"
---

# Cursor CLI {#cursor-cli}

:::warning 已停止维护，请改用 Coding Agents 插件
**Cursor CLI 集成** 已由 [Coding Agents 插件](/sdks/integrations/coding-agents) 取代。该插件通过一个
软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体；这些智能体共享每个代码仓库对应的记忆库，而不是每个智能体各用一个记忆库。

此集成已停止维护，已发布的软件包也不会再更新。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install cursor-cli
```

记忆不会自动迁移：这些记忆库的作用范围不同，而且无法导入此智能体的历史记录（历史记录保存在内部数据库中）。请参阅
[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/cursor-cli)
