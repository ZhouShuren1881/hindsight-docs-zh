---
sidebar_position: 5
title: "使用 Hindsight 为 Right Agent 提供持久记忆 | 集成指南"
description: "为 Right Agent 添加持久记忆。Right Agent 是在 OpenShell 沙箱中运行 Claude Code 的封闭式 AI 智能体。每个智能体对应一个 Telegram 机器人，通过共享且按聊天添加标签的 Hindsight 记忆库，为每个聊天维护独立的 Claude Code 会话。Hindsight 是原生记忆提供方，在初始化时选择即可。"
---

# Right Agent {#right-agent}

使用 [Hindsight](https://hindsight.vectorize.io) 为 [Right Agent](https://github.com/onsails/right-agent) 提供持久记忆。

Right Agent 在 [OpenShell](https://github.com/NVIDIA/OpenShell) 沙箱中运行 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)。每个智能体都是独立的 Telegram 机器人；私聊、群组和论坛话题各自拥有一个 Claude Code 会话，但都会使用同一个按聊天添加标签的 Hindsight 记忆库。

Hindsight 是原生且推荐使用的记忆提供方，可在运行 `right init` 时选择。无需安装插件，也无需修改沙箱网络策略。

## 快速入门 {#quick-start}

安装 Right Agent（参阅[安装指南](https://github.com/onsails/right-agent/blob/master/docs/INSTALL.md)），然后运行初始化向导：

```bash
right init
right up
```

`right init` 会引导你选择记忆提供方。出现提示时选择 `hindsight`：

```
? memory provider:
> hindsight — hindsight cloud api (recommended)
  file — local MEMORY.md (no cloud dependency)
? hindsight api key: <paste your key, or press Enter to use HINDSIGHT_API_KEY at runtime>
? hindsight bank id (default: my-agent): <press Enter to accept>
```

在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 获取 API 密钥。

智能体会在每轮对话后自动存入记忆，并在每条新消息到达时自动召回相关上下文。

## 功能 {#features}

- **自动召回** — 收到每条新用户消息时，查询 Hindsight 中带有当前 Telegram 聊天标签的记忆，并将其注入为系统上下文。
- **自动存入** — 每轮对话结束后，将对话加入队列以供存入。此过程异步且具备容错能力，不会阻塞智能体。
- **显式工具** — 提供 `memory_retain`、`memory_recall` 和 `memory_reflect` MCP 工具，以便在自动行为不够用时调用。
- **按聊天添加标签** — 私聊、群组和论坛话题共用一个记忆库，但每段对话只能看到自己的记忆以及无标签的全局记忆。
- **可靠写入** — 使用本地 SQLite 存入队列和熔断器；Hindsight 恢复可用后会自动重放待处理的写入。
- **无需插件或策略修改** — Hindsight 已集成在主机上的 Right Agent MCP 聚合器中。沙箱无需添加 Hindsight 专用的出站网络规则。
- **内置 `rightmemory` 技能** — 告诉智能体何时使用各个工具，以及哪些内容应存入记忆、哪些应放在身份文件（`IDENTITY.md`、`USER.md`、`TOOLS.md`）中。

## 工作原理 {#how-it-works}

### 记忆流转 {#memory-flow}

- **每条新用户消息到达时**，Right Agent 会召回带有当前 Telegram 聊天标签的记忆，并将其注入智能体系统提示中的 `## Memory` 部分。召回的内容会作为不可信的外部上下文封装，以防止记忆写入内容造成提示注入。
- **每轮对话结束后**，系统会将对话加入存入队列。如果 Hindsight 无法访问，该条目会留在本地 SQLite 队列中，并通过退避策略重试；智能体不会因记忆写入而阻塞。
- **智能体也可以直接调用 Retain、Recall 和 Reflect**，在自动行为不够用时通过记忆 MCP 工具存入、召回或反思。

### 按聊天限定范围 {#per-chat-scoping}

每个智能体使用一个 Hindsight 记忆库（在 `right init` 时设置，默认使用智能体名称）。在该记忆库中，每条记忆都会带上来源 Telegram 聊天的标签（`chat:<chat_id>`），召回查询则使用 `tags_match: "any"`。因此，一对一私聊、群组和论坛话题各自只能看到自己的记忆，以及任何无标签的全局记忆。群组对话不会泄漏到一对一私聊中，同时智能体仍保有适用于所有对话的共享事实基线。

### Hindsight 客户端的运行位置 {#where-the-hindsight-client-runs}

Right Agent 的 MCP 聚合器在主机上运行，位于沙箱之外，也是唯一与 Hindsight API 通信的进程。沙箱内的智能体通过聚合器为每个智能体提供的 MCP 端点调用 `memory_retain`、`memory_recall` 和 `memory_reflect`，再由聚合器在主机上向 Hindsight 发起请求。沙箱网络策略无需添加 Hindsight 专用的出站规则，Hindsight 凭据也绝不会进入沙箱。

## 记忆工具 {#memory-tools}

聚合器会向每个启用 Hindsight 模式的智能体提供以下三种记忆工具：

| 工具 | 用途 |
|---|---|
| `mcp__right__memory_retain(content, context)` | 使用简短标签（例如 `"user preference"`、`"api format"`）永久保存一条事实。 |
| `mcp__right__memory_recall(query)` | 在智能体的记忆中进行语义、关键词和图检索，并按排名返回结果。 |
| `mcp__right__memory_reflect(query)` | 对记忆进行深入分析，综合归纳模式并比较过去的决策。 |

内置的 `rightmemory` 技能会告诉智能体何时使用各个工具，以及哪些内容应放入记忆、而不是智能体的身份文件。

## 配置 {#configuration}

`right init` 会将 Hindsight 配置写入 `~/.right/agents/<name>/agent.yaml`：

```yaml
memory:
  provider: hindsight
  api_key: your-api-key   # 也可省略，以使用 HINDSIGHT_API_KEY 环境变量
  bank_id: my-agent                    # 默认值为智能体名称
  recall_budget: 8000                  # 可选；自动召回的 token 预算
```

之后若要修改这些配置，请编辑该文件并运行 `right restart <agent>`。若要切换现有智能体使用的提供方，请运行 `right agent config <agent>`，然后重新执行向导。

### 使用环境变量 {#using-an-environment-variable}

如果不想将 API 密钥保存在 `agent.yaml` 中，请将 `api_key` 留空，并在运行 `right up` 的环境中设置 `HINDSIGHT_API_KEY`：

```bash
export HINDSIGHT_API_KEY=your-api-key
right up
```

聚合器会在启动时读取 `HINDSIGHT_API_KEY`，并将其作为回退密钥，用于 `agent.yaml` 未设置 `memory.api_key` 的智能体。

## 故障排查 {#troubleshooting}

**在 `/doctor` 或 Telegram 聊天中看到 `Memory: degraded`。** 上游多次出错后，可靠客户端的熔断器已触发。待处理的 Retain 请求会加入本地队列，并在熔断器关闭后重放。请检查 Hindsight Cloud 的状态，并确认 API 密钥仍然有效。

**重启后看不到记忆。** 请确认 `~/.right/agents/<name>/agent.yaml` 中的 `memory.bank_id` 与先前写入记忆的记忆库一致。默认值是智能体名称；若手动修改过该值，重启后会采用新值，因此无法看到旧记忆库中的记忆。

**`HINDSIGHT_API_KEY` 未生效。** `agent.yaml` 中的 `memory.api_key` 优先级高于环境变量。请将 `api_key` 留空（或删除该字段），以便回退使用 `HINDSIGHT_API_KEY`。

**配额已用尽。** Hindsight 返回配额错误时，Right Agent 会在聊天中显示通知。配额耗尽期间，写入会被丢弃，但读取仍可正常进行。请前往 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 充值；之后排队中的 Retain 请求会在下一次成功写入时补处理。

**从 `file` 切换到 `hindsight`（或反向切换）。** 运行 `right agent config <agent>` 并重新执行向导，然后运行 `right restart <agent>`。现有本地 `MEMORY.md` 会保留，但在 Hindsight 模式下会被忽略；切换回 `file` 后，它会再次生效。

## 链接 {#links}

- [Right Agent 的 GitHub 页面](https://github.com/onsails/right-agent)
- [安装指南](https://github.com/onsails/right-agent/blob/master/docs/INSTALL.md)
- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)
