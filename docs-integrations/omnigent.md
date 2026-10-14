---
sidebar_position: 41
title: "使用 Hindsight 为 Omnigent 添加持久记忆 | 集成"
description: "为 Omnigent 中运行的每个智能体运行框架提供持久记忆。一次 Hindsight 配置即可让 Claude Code、Codex、Cursor、Hermes、Pi 和自定义智能体使用 hindsight_recall、hindsight_retain 与 hindsight_reflect。"
---

# Omnigent {#omnigent}

为 [Omnigent](https://github.com/omnigent-ai/omnigent) 中的每个智能体运行框架提供持久的长期记忆。Omnigent 是一个元运行框架，可包装并协调多个 AI 智能体（Claude Code、Codex、Cursor、OpenCode、Hermes、Pi 等）。

Omnigent 内置三个记忆工具：`hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect`。Omnigent 会拦截这些工具调用，并通过 `hindsight-client` 在本地执行。由于这些工具位于 Omnigent 执行器中，而不是各个运行框架内，因此每个被包装的智能体都能使用记忆，无论其运行框架是否原生支持 Hindsight。

## 安装 {#installation}

```bash
pip install "omnigent[memory]"
export HINDSIGHT_API_KEY=hsk_...
```

从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 获取 API 密钥，或通过 `HINDSIGHT_API_URL` 指向自托管服务器。

## 设置 {#setup}

在智能体的 YAML 规范中，将这三个工具添加到 `tools.builtins` 下：

```yaml
name: my-agent

tools:
  builtins:
    - name: hindsight_recall
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory      # 可选；默认使用 agent_id
      budget: mid                   # low / mid / high
      max_tokens: 4096

    - name: hindsight_retain
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory

    - name: hindsight_reflect
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory
```

重新启动智能体后，这三个工具就会出现在它的工具列表中。

## 工作原理 {#how-it-works}

Omnigent 在执行器层面拦截 `hindsight_*` 调用，在调用到达被包装的运行框架之前，通过 `hindsight-client` 在本地执行并返回结果。这意味着：

- **被包装的运行框架**（Claude Code、Codex、Cursor、Pi 等）无需处理这些调用；执行器会负责处理。
- **原生运行框架**（以原生模式运行智能体时）也会收到转发给它们的工具。
- **一次配置即可供所有运行框架使用。** 其中许多运行框架各自都有原生 Hindsight 集成，但通过 Omnigent 只需配置一次记忆，就能应用于你编排的所有运行框架，包括没有原生选项的自定义运行框架。

智能体会**显式**调用这些工具；这里没有自动生命周期钩子。在智能体的系统提示词中加入以下说明：

```
- At the start of each task, call hindsight_recall with the user's request
  to load relevant decisions, preferences, and project context.
- When the user gives you a durable fact (a convention, a decision, a
  preference), call hindsight_retain to store it.
- Call hindsight_reflect to synthesize what you know about a topic across sessions.
```

## 记忆库范围 {#bank-scoping}

Omnigent 按以下顺序解析所用的记忆库：

1. YAML 配置中显式指定的 `bank_id`——最容易预测，建议使用。
2. 智能体的 `agent_id`——每个智能体使用一个记忆库，并在各个对话间共享。
3. `conversation_id`——每个对话使用一个记忆库；对话结束后，该库就无法继续使用。

要在两个智能体之间共享记忆，请让它们使用同一个 `bank_id`。

## 配置参考 {#configuration-reference}

| 字段 | 说明 | 默认值 |
|---|---|---|
| `api_key` | Hindsight API 密钥 | _（Cloud 需要）_ |
| `api_url` | Hindsight API 基础 URL | `https://api.hindsight.vectorize.io` |
| `bank_id` | 记忆库名称 | `agent_id` 或 `conversation_id` |
| `budget` | Recall 的 token 预算（`low` / `mid` / `high`） | `mid` |
| `max_tokens` | Recall 返回内容的最大 token 数 | `4096` |
| `tags` | 应用于存入记忆的 CSV 标签 | _（无）_ |
| `recall_tags` | 用于筛选召回记忆的 CSV 标签 | _（无）_ |
| `recall_tags_match` | 标签匹配模式（`any` / `all` / `any_strict` / `all_strict`） | `any` |

## 自托管 {#self-hosted}

将 `api_url` 指向你自己的服务器；开放服务器无需令牌：

```yaml
- name: hindsight_recall
  api_url: http://localhost:8888
  bank_id: local-memory
```

## 示例 {#working-example}

Omnigent 提供了完整示例 [`examples/remy/config.yaml`](https://github.com/omnigent-ai/omnigent/blob/main/examples/remy/config.yaml)：一个已接入全部三个工具的对话助手，其中还说明了何时调用各个工具：

```bash
HINDSIGHT_API_KEY=hsk_... omnigent run examples/remy
```

进行几次对话后，可以询问它在之前某次会话中学到了什么。

## 哪些运行框架适用 {#which-harnesses-benefit}

| 智能体运行框架 | 原生 Hindsight 集成 | 通过 Omnigent |
|---|---|---|
| Claude Code | 有（官方） | 有 |
| Cursor | 有（官方） | 有 |
| Codex | 有（官方） | 有 |
| OpenCode | 有（官方） | 有 |
| Pi | 有（社区提供，通过 epimetheus） | 有 |
| 自定义运行框架 | 通常没有 | 有 |

其中大多数运行框架已经有原生 Hindsight 集成，适合单独运行相应工具时使用。Omnigent 的优势在于，只需一处配置即可让你编排的所有运行框架共用记忆，也能覆盖没有原生选项的自定义运行框架。

## 延伸阅读 {#further-reading}

- [让所有 AI 工具共用一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让多个运行框架使用同一个记忆库。
- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：智能体调用 `hindsight_retain` 时会发生什么。
- [Omnigent 的 GitHub 仓库](https://github.com/omnigent-ai/omnigent)：元运行框架的源码和示例。
