---
name: "Hindsight Memory"
description: "使用 Hindsight（已连接的 MCP 应用）作为唯一的长期记忆：通过 retain/sync_retain 保存，通过 recall/reflect 检索。不要使用 OpenBot 内置的 remember/search_memories 工具。"
---

# Hindsight Memory

连接 **Hindsight** 应用后，Hindsight 就是你唯一的长期记忆。它跨线程持久保存、在上下文压缩后保留，并与同一记忆库中的其他智能体共享。不要仅依靠线程来记忆。

## 使用 Hindsight 工具，而非内置记忆 {#use-hindsights-tools--not-the-built-in-memory}

OpenBot 也自带内置记忆工具（`remember`、`search_memories`、`set_memory_inclusion`、`forget_memory` 和内置的 `list_memories`）。**不要使用这些工具**：它们写入的是独立的单智能体存储，不共享，也不是用户保存记忆的位置。所有与记忆相关的操作都应使用 Hindsight MCP 工具：

| 操作 | 使用（Hindsight） | 不要使用（内置） |
| --- | --- | --- |
| 保存事实 | `sync_retain`（或 `retain`） | `remember` |
| 查找信息 | `recall` | `search_memories` |
| 基于记忆推理 | `reflect` | — |

如果工具名有歧义（例如有两个 `list_memories`），优先使用操作已连接记忆库的 Hindsight 工具。如有疑问，使用 `recall`、`sync_retain` 和 `reflect`，这些都是 Hindsight 的工具。

## 工作流程 {#workflow}

1. **先召回。** 在回答任何有关用户、项目、过去决策或先前工作的问题之前，调用 `recall`。使用返回的内容；记忆能提供答案时不要猜测。
2. **使用 `sync_retain` 保存。** 当用户陈述值得保留的偏好、决策、事实、目标或结果时，调用 Hindsight 的 **`sync_retain`**（而不是 `remember`），以便存储并立即召回。记下返回的记忆 ID，确认已保存到 Hindsight。
3. 对于综合性问题（“你对 X 了解什么”“你应该如何处理这件事”），使用 **Reflect**。
4. 不要存储敏感凭据、短暂闲聊或重复内容：先召回，并修正错误记忆，而不是添加相矛盾的记忆。

## 说明 {#notes}

- 记忆存放在连接的 MCP URL 所指定的 Hindsight **记忆库**中；同一库中的智能体共享记忆，因此需要隔离时应为智能体提供单独的记忆库 URL。
- 存入的事实在提取时会重新表述，因此应按含义而不是精确措辞召回。
