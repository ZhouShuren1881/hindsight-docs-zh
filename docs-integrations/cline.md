---
sidebar_position: 7
title: "使用 Hindsight 为 Cline 添加持久记忆 | 集成指南"
description: "通过生命周期钩子为 Cline VS Code 编程智能体添加 Hindsight 持久记忆，无需 MCP。钩子会在每项任务开始前自动召回上下文，并在任务结束后存入任务内容。"
---

# Cline {#cline}

:::warning 已停止维护，请改用 Coding Agents 插件
**Cline 集成**已由 [Coding Agents 插件](/sdks/integrations/coding-agents)取代。该插件通过一个软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，并为每个仓库提供一个由所有智能体共享的记忆库，而不是每个智能体各用一个记忆库。

此集成已停止维护，已发布的软件包也不会再有后续更新。要切换，请运行：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install cline-cli
```

记忆不会自动迁移：这些集成的记忆库范围不同，而且无法导入此智能体的历史记录（历史记录保存在内部数据库中）。请参阅[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/cline)
