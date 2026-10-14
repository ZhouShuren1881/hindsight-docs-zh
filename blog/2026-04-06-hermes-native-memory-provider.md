---
title: "Hindsight 现已成为 Hermes Agent 的原生记忆提供方"
authors: [benfrank241]
date: 2026-04-06
tags: [hermes, memory, hindsight, integration, release]
description: "Hermes Agent 现已支持可插拔的记忆提供方。本文介绍为什么选择 Hindsight 作为后端，以及如何在两分钟内完成设置。"
image: /img/blog/hermes-native-memory-provider.webp
hide_table_of_contents: true
---

![Hindsight 现已成为 Hermes Agent 的原生记忆提供方](/img/blog/hermes-native-memory-provider.webp)

:::info 本文发布后，设置方式已有变化
Hindsight 不再与 Hermes 捆绑。Nous Research 已将所有记忆提供方移出 Hermes 核心代码库，因此新安装时需先运行 `hermes plugins install hindsight`，再运行 `hermes memory setup`。现有设置会自动迁移。请参阅[将 Hindsight 作为 Hermes 插件后有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

Hermes Agent 现已内置可插拔的记忆提供方系统。Hindsight 是受支持的后端之一，也是[真正测试大规模记忆能力的基准测试](/blog/2026/04/02/beam-sota)中排名第一的后端。

<!-- truncate -->

---

## 工作原理 {#how-it-works}

Hindsight 在 Hermes 的生命周期中接入两个环节：

**每轮开始前**，Hindsight 会将异步预取任务排入队列。在 LLM 看到你的消息之前，系统会检索你过往会话中的相关记忆，并将它们注入系统提示。这样，模型就能获取先前对话的上下文，你无需重复说明。

**每次回复后**，系统会异步存入你的对话。Hindsight 在后台提取事实、实体和关系。本轮所说的内容从下一次调用开始即可检索。

这是有意为之：采用预取模式意味着**本轮产生的记忆要到下一轮才会出现**。这样可以让每次调用都保持快速。

---

## 为什么在 Hermes 中使用 Hindsight {#why-hindsight-on-hermes}

Hermes 内置了记忆工具，可以把笔记保存到本地 Markdown 文件中。它能发挥作用，但记录的是模型明确决定写下来的内容，而不是它从对话中隐式学到的内容。上下文不会自动累积。如果你周一请 Hermes 帮忙规划冲刺，周五再开启一个新会话，除非你亲自重新提供上下文，否则它不会记得项目、团队或截止日期。

Hindsight 通过跨会话的持久记忆解决了这个问题。你只需提过一次产品发布的截止日期。一周后，在讨论其他主题的新会话中，Hermes 已经知道这个日期。你无需重复，也不必粘贴上下文，系统会自动召回这段记忆。

在所有受支持的记忆提供方中，只有 Hindsight 公布了 [BEAM](/blog/2026/04/02/beam-sota) 的测试结果。该基准测试在 1000 万个 token 的规模上测试记忆能力，此时在上下文中塞入全部内容在物理上已不可行。Hindsight 在这一档的得分为 64.1%。已公布结果中排名第二的是 40.6%。

---

## 设置方法 {#setting-it-up}

设置只需运行一个向导命令：

```bash
hermes memory setup    # 选择 "hindsight"
```

然后确认记忆功能已启用：

```bash
hermes memory status
```

配置文件位于 `$HERMES_HOME/hindsight/config.json`：

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` 或 `local` |
| `bank_id` | `hermes` | 记忆库标识符 |
| `budget` | `mid` | Recall 的检索充分程度：`low` / `mid` / `high` |
| `memory_mode` | `hybrid` | `hybrid`、`context` 或 `tools`，详见下文 |
| `prefetch_method` | `recall` | `recall`（快速）或 `reflect`（由 LLM 综合生成） |

---

## 记忆模式 {#memory-modes}

自动召回是核心行为：每轮开始前，Hindsight 都会自动从历史记录中检索相关记忆，并将其注入系统提示。Hermes 因此能获得所需上下文，无需模型调用工具，也无需你重复说明。每次调用都会透明地执行这一过程。

`memory_mode` 设置用于控制是否启用自动召回，以及是否同时向模型开放显式工具：

| 模式 | 行为 |
|------|----------|
| `hybrid`（默认） | 每轮开始前自动注入记忆，并向模型开放 `hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect` 工具 |
| `context` | 仅自动召回：自动注入记忆，不向模型开放任何工具 |
| `tools` | 仅使用显式工具：模型必须调用 `hindsight_recall` 来检索记忆；系统不会自动注入任何内容 |

`prefetch_method` 控制自动召回期间如何检索记忆：

- **`recall`**（默认）：语义检索、关键词匹配、实体图遍历和重排序。速度快。
- **`reflect`**：由 LLM 综合所有相关记忆，生成连贯的摘要。速度较慢，但更适合复杂上下文。

---

## 从旧插件迁移 {#migrating-from-the-old-plugin}

如果你之前通过 pip 安装了 `hindsight-hermes` 插件（即[早期指南](/blog/2026/03/17/hermes-agent-memory)中的做法），请先卸载：

```bash
uv pip uninstall hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python
```

然后运行设置向导来配置原生提供方：

```bash
hermes memory setup
```

原生提供方涵盖了旧插件的全部功能，并提供更完善的生命周期管理，以及完整的 `memory_mode` 和 `prefetch_method` 控制项。

---

## 本地模式或云端模式 {#local-or-cloud}

在本地模式下，Hindsight 会运行一个内置 PostgreSQL 的嵌入式服务器。首次使用时，守护进程会在后台自动启动，无需手动设置。提取记忆需要 LLM API 密钥：

```json
{
  "mode": "local",
  "llm_provider": "groq",
  "llm_api_key": "your-groq-key"
}
```

Hermes 会在你发送第一条消息、界面显示“starting agent”时启动守护进程，而不是在启动程序时启动。在新系统上，嵌入式 PostgreSQL 服务器初始化可能需要一分钟以上。之后启动会很快。如需调试，可查看启动日志：`~/.hermes/logs/hindsight-embed.log`。

如果要在不同机器间持久使用记忆，或在多个 Hermes 实例间共享记忆，请改用云端模式。两种模式使用相同的 API。切换只需修改一行配置，无需迁移。

---

## 开始使用 {#get-started}

- **Hermes 集成文档**：[/sdks/integrations/hermes](/sdks/integrations/hermes)
- **BEAM 基准测试结果**：[Hindsight 在 BEAM 上排名第一](/blog/2026/04/02/beam-sota)
- **快速入门**：[/developer/api/quickstart](/developer/api/quickstart)
- **GitHub**：[github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)
- **云端服务**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)

---
