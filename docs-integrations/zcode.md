---
sidebar_position: 40
title: "使用 Hindsight 为 ZCode 提供持久记忆 | 集成指南"
description: "通过 Hindsight 为 ZCode（Z.ai 的 GLM 桌面编程智能体）添加持久的长期记忆。Python 钩子会在每次提示前自动召回相关上下文，并在每轮结束后存入对话记忆；无需 MCP，也无需更改工作流。"
---

# ZCode {#zcode}

:::warning 已停止维护，请改用 Coding Agents 插件
**ZCode 集成**已由 [Coding Agents 插件](/sdks/integrations/coding-agents) 取代。该插件通过一个软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，并为每个代码仓库提供一个记忆库，供这些智能体共享，而不是为每个智能体分别使用一个记忆库。

此集成已停止维护，已发布的软件包也不会再获得更新。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install zcode
```

记忆不会自动迁移——这些记忆库的作用范围不同，而且 ZCode 不会在磁盘上保存可供导入的对话历史。请参阅[从各智能体专用插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/zcode)
