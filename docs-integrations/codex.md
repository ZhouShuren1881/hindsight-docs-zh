---
sidebar_position: 6
title: "使用 Hindsight 为 Codex CLI 添加持久记忆 | 集成指南"
description: "使用 Hindsight 为 OpenAI Codex CLI 添加持久记忆。三个 Python 钩子脚本会在每次提示词之前自动召回上下文，并存入对话，无需改变工作流程。"
---

# Codex

:::warning 已停止维护，请改用 Coding Agents 插件
**Codex CLI 集成**已由[编程智能体插件](/sdks/integrations/coding-agents)取代。一个软件包覆盖 Claude Code、Codex、opencode、Kilo、Cursor、Copilot、Grok、Antigravity、Devin、Cline 等 CLI 智能体，每个仓库的所有智能体共享一个记忆库，而不是每个智能体一个记忆库。

此集成已停止维护，已发布的软件包也不会再更新。切换方法：

```bash
cd /path/to/your/repo
npx @vectorize-io/hindsight-coding-agents install codex --import-conversations
```

迁移两项内容，其他内容均不会迁移。

**服务器配置会自动迁移。** `install` 会读取 `~/.hindsight/codex.json`，沿用原有的 `apiUrl` 和令牌。URL 为空仍表示使用本地守护进程，因此不会在未告知的情况下切换到 Hindsight Cloud。要更改服务器，请传入 `--server`。

**对话会通过 `--import-conversations` 从本地会话记录重新导入**为新文档，而不是从旧记忆库复制。旧记忆库默认是供所有项目共享的单个静态记忆库，文档中只记录会话 ID，因此要判断哪些会话属于当前仓库，仍需读取本地会话记录。

**其他内容均不会迁移。** 旧的 `recall*` 和 `retain*` 设置、任务说明及记忆库命名选项描述的是已被此软件包替换的处理流程。记忆库命名方式也会改变：每个仓库使用一个由所有智能体共享的记忆库。请参阅[从独立智能体插件迁移](/sdks/integrations/coding-agents#migrating-from-the-per-agent-plugins)。
:::


[查看更新日志 →](/changelog/integrations/codex)
