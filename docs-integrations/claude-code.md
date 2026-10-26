---
sidebar_position: 5
title: "使用 Hindsight 为 Claude Code 添加持久记忆 | 集成"
description: "使用 Hindsight 为 Claude Code 添加长期记忆。通过 Claude Code 基于钩子的架构自动捕获对话，并跨会话召回相关上下文。"
---

# Claude Code

:::warning 已停止维护，请改用 Coding Agents 插件
**Claude Code 插件**已被 [Coding Agents 插件](/sdks/integrations/coding-agents)取代。该插件用一个软件包支持 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体；这些智能体共享每个仓库对应的记忆库，而不是每个智能体各用一个记忆库。

此集成已停止维护，已发布的软件包也不会再获得更新。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install claude-code --import-conversations
```

只有两项内容会迁移，其余内容均不会迁移。

**服务器配置会自动迁移。** `install` 会读取 `~/.hindsight/claude-code.json`，并保留原有的 `apiUrl` 和令牌。URL 为空仍表示使用本地守护进程，因此不会在未告知的情况下切换到 Hindsight Cloud。要更改服务器，请传入 `--server`。

**对话会通过 `--import-conversations` 从本地会话记录重新导入**为新文档，不会从旧记忆库复制。旧记忆库默认是由所有项目共享的单个静态记忆库，其中的文档只记录会话 ID；因此，要确定哪些对话属于当前仓库，本来就需要读取本地会话记录。

**其他内容均不会迁移。** 旧的 `recall*` 和 `retain*` 设置、任务说明和记忆库命名选项描述的是已被此软件包取代的流水线。记忆库命名也会改变：每个仓库使用一个由所有智能体共享的记忆库。参见[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::

[查看更新日志 →](/changelog/integrations/claude-code)
