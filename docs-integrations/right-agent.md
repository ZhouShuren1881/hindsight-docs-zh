---
sidebar_position: 5
title: "正确的智能体持久记忆与Hindsight |集成指南"
description: "将持久记忆添加到正确的智能体中 — 在 OpenShell 沙箱内运行 Claude 代码的封闭盒 AI 智能体。每个智能体一个 Telegram 机器人，通过共享的、聊天标记的 Hindsight 记忆库进行每次聊天 Claude 代码会话。 Hindsight 是本机记忆提供者，在初始化期间选择。"
---

# 右智能体 {#right-agent}

持久记忆[Right Agent](https://github.com/onsails/right-agent) 使用 [Hindsight](https://hindsight.vectorize.io)。

正确的智能体运行[Claude Code](https://docs.anthropic.com/en/docs/claude-code)里面[OpenShell](https://github.com/NVIDIA/OpenShell) 沙箱。每个智能体都是自己的 Telegram 机器人——DM、群组和论坛主题都有自己的Claude Code会话，所有人共享一个聊天标记Hindsight记忆库。

Hindsight是本地推荐的记忆提供商 — 在 期间选择 `right init`。无需安装插件，无需编辑沙盒网络策略。

## 快速入门 {#quick-start}

安装正确的智能体（请参阅[安装指南](https://github.com/onsails/right-agent/blob/master/docs/INSTALL.md))，然后运行初始化向导：

```bash
right init
right up
```

`right init` 引导您选择记忆提供商。选择`hindsight` 出现提示时：

```
? 记忆提供程序：
> hindsight — Hindsight Cloud API（推荐）
  file — 本地 MEMORY.md（不依赖云端）
? hindsight api key: <粘贴密钥，或按 Enter 在运行时使用 HINDSIGHT_API_KEY>
? hindsight bank id (default: my-agent): <按 Enter 接受>
```

获取API 密钥位于 [Hindsight Cloud](https://ui.hindsight.vectorize.io)。

智能体会自动保留每一个回合，并自动回忆每条新消息的相关上下文。

## 功能 {#features}

- **自动记忆召回** — 每条新用户消息、查询Hindsight用于标记当前 Telegram 聊天的记忆，并将它们作为系统上下文注入。
- **自动记忆存储** — 每回合之后，将对话排队以进行保留。异步且有弹性；永远不会阻挡智能体。
- **显式工具** — `memory_retain`，`memory_recall`，和`memory_reflect`MCP当自动还不够时的工具。
- **按聊天添加标签** — DM、群组和论坛主题共享一个记忆库，但每次对话只能看到自己的记忆以及未标记的全局变量。
- **具有容错能力的写入** — 本地SQLite记忆存储队列加断路器；当挂起的写入自动重放时Hindsight再次可达。
- **无需插件或修改策略** —Hindsight内置于Right智能体中  主机上的MCP聚合器。沙箱不需要Hindsight特定的出口规则。
- **捆绑的 `rightmemory` 技能** — 告诉智能体何时使用每个工具以及哪些内容属于记忆，哪些属于其身份文件 (`IDENTITY.md`，`USER.md`，`TOOLS.md`）。

## 工作原理 {#how-it-works}

### 记忆流 {#memory-flow}

- **每条新用户消息到达时**，右智能体回忆起当前Telegram聊天标记的记忆，并将它们注入到智能体的系统提示符下下 `## Memory`部分。召回的内容被包装为不受信任的外部上下文，以防止记忆写入的提示注入。
- **每回合结束后**，对话已排队等待保留。如果Hindsight无法访问，该条目位于本地SQLite队列并通过退避重试 — 智能体永远不会阻塞记忆写入。
- **智能体也可以直接调用记忆存储、记忆召回和反思**通过记忆  当自动行为不够时，MCP工具。

### 按聊天限定作用域 {#per-chat-scoping}

一个Hindsight每个智能体的记忆库（设置为 `right init`，默认为智能体名称）。在该记忆库中，每个记忆都标有原始 Telegram 聊天 (`chat:<chat_id>`)，以及带有 的记忆召回查询 `tags_match: "any"` — 因此，1:1 DM、小组和论坛主题每个人都能看到自己的记忆以及任何未标记的全局变量。群组对话不会变成一对一的对话，但智能体会保留适用于任何地方的共享事实基线。

### Hindsight客户端运行的位置 {#where-the-hindsight-client-runs}

右智能体MCP聚合器在主机上运行——在沙箱之外——并且是唯一与主机对话的进程HindsightAPI。 沙箱调用中的智能体 `memory_retain`，`memory_recall`，和`memory_reflect` 超过聚合器的每智能体MCP端点，聚合器使Hindsight来自主持人的呼叫。沙箱网络策略不需要Hindsight特定的出口规则，以及Hindsight凭证永远不会进入沙箱。

## 记忆工具 {#memory-tools}

聚合器向每个Hindsight模式智能体公开三种记忆工具：

|工具|目的|
|---|---|
|`mcp__right__memory_retain(content, context)`|使用短标签永久保存事实 (`"user preference"`，`"api format"`等）。|
|`mcp__right__memory_recall(query)`|跨智能体记忆的排名语义+关键字+图形搜索。|
|`mcp__right__memory_reflect(query)`|跨记忆的深度分析——综合模式，比较过去的决定。|

同捆`rightmemory` 技能告诉智能体何时接触每一个，以及哪些内容属于记忆而不是智能体的身份文件。

## 配置 {#configuration}

`right init` 写下Hindsight配置到`~/.right/agents/<name>/agent.yaml`：

```yaml
memory:
  provider: hindsight
  api_key: your-api-key   # 或省略，以使用 HINDSIGHT_API_KEY 环境变量
  bank_id: my-agent                    #默认为智能体名称
  recall_budget: 8000                  #可选，用于自动记忆召回的token 预算
```

要稍后更改其中任何一个，请编辑文件并运行 `right restart <agent>` 并重新运行向导。

### 使用环境变量 {#using-an-environment-variable}

如果你想保留API退出 `agent.yaml`，离开`api_key` 清空并设置 `HINDSIGHT_API_KEY` 在的环境中 `right up` 运行：

```bash
export HINDSIGHT_API_KEY=your-api-key
right up
```

聚合器读取`HINDSIGHT_API_KEY` 在启动时使用它作为任何智能体的后备，其`agent.yaml` 未设置 `memory.api_key`。

## 故障排查 {#troubleshooting}

**`/doctor` 或 Telegram 聊天中显示 `Memory: degraded`。** 弹性客户端的断路器在重复出现上游错误后跳闸。挂起的保留在本地排队并在电路关闭时重放。检查Hindsight Cloud状态并验证API密钥仍然有效。

**重启后未显示记忆。** 验证`memory.bank_id` `~/.right/agents/<name>/agent.yaml` 与您之前写入的记忆库匹配。默认为智能体名称；如果您手动编辑它，则重新启动会拾取新值，并且不会看到旧记忆库下的记忆。

**`HINDSIGHT_API_KEY` 未生效。** `memory.api_key` 中的字段 `agent.yaml` 优先于环境变量。离开`api_key` 清空（或删除它）以回退到 `HINDSIGHT_API_KEY`。

**配额已耗尽。** 右侧智能体会在以下情况下显示聊天级别的通知：Hindsight返回配额错误。当配额耗尽时，写入会被丢弃；阅读继续工作。 充值 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 和排队保留赶上下一次成功写入。

**从 `file` 切换到 `hindsight`（或反向切换）。** 运行 `right agent config <agent>`，重新执行向导，然后运行 `right restart <agent>`。已有的本地 `MEMORY.md` 会保留，但在 Hindsight 模式中被忽略；切换回来后会再次使用它。

## 链接 {#links}

- [GitHub 上的 Right Agent](https://github.com/onsails/right-agent)
- [安装指南](https://github.com/onsails/right-agent/blob/master/docs/INSTALL.md)
- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)
