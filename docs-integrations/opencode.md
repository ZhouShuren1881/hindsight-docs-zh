---
sidebar_position: 20
title: "使用 Hindsight 为 OpenCode 添加持久记忆 | 集成"
description: "使用 Hindsight 为 OpenCode 添加长期记忆。自动捕获对话，并在不同编码会话中召回相关上下文。"
---

# OpenCode {#opencode}

:::warning 已停止维护，请改用 Coding Agents 插件
**opencode 插件**已被 [Coding Agents 插件](/sdks/integrations/coding-agents)取代。该插件以一个软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，并让这些智能体共享每个代码仓库的同一个记忆库，而不是每个智能体各用一个记忆库。

此集成已停止维护，已发布的软件包也不会再更新。迁移方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install opencode
```

记忆不会自动迁移：新旧记忆库的作用范围不同，而且无法导入该智能体的历史记录（这些记录保存在内部数据库中）。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/opencode)
