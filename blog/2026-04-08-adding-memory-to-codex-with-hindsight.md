---
title: "使用 Hindsight 为 OpenAI Codex 添加持久记忆"
authors: [benfrank241]
date: 2026-04-08T09:00
tags: [codex, openai, memory, persistent-memory, hindsight, tutorial, coding-agents, python]
image: /img/blog/adding-memory-to-codex-with-hindsight.webp
description: "借助 Hindsight，让 OpenAI Codex 在不同会话间保留记忆。自动召回会在每次提示前注入上下文；自动存入会在会话结束时提取事实。"
hide_table_of_contents: true
---

![使用 Hindsight 为 OpenAI Codex 添加持久记忆](/img/blog/adding-memory-to-codex-with-hindsight.webp)

## 概要 {#tldr}

<!-- truncate -->

- Codex 没有内置持久记忆。每次会话都会从头开始，不记得过去的决策、偏好或代码库上下文。
- Hindsight 插件通过三个 Python 脚本接入 Codex，无需执行 `pip install`。运行一条 `curl` 命令即可完成设置。
- 自动召回会在每次提示前查询记忆库，并将相关事实作为不可见上下文注入。Codex 能看到这些内容，你无需重复说明。
- 自动存入会在每次会话结束时触发，从会话记录中提取事实并保存，以供日后召回。
- 团队可以将每个人的配置指向同一个 Hindsight 服务器，并使用固定的 `bankId`。请参阅[面向 AI 编程智能体的共享记忆【无效博客链接】](https://hindsight.vectorize.io/blog/2026/03/31/team-shared-memory-ai-coding-agents)。
- Hindsight Cloud 会在服务器端存储记忆库，无需本地守护进程，记忆也会随你在不同机器间使用。[免费注册。](https://ui.hindsight.vectorize.io)

## 问题：Codex 没有持久记忆 {#the-problem-codex-has-no-persistent-memory}

[Codex](https://github.com/openai/codex) 是 OpenAI 的开源编程智能体 CLI。你交给它一项任务，它会读取文件、运行命令并反复迭代，直到完成。它能力强、速度快，但没有记忆。

每次会话都从零开始。Codex 不知道项目使用了哪些库、采用了哪些约定模式、代码库的哪些部分比较脆弱，也不知道你昨天在做什么。每次会话开始时，你都得重新交代这些背景：要么直接说明，要么让它查看你手动维护的 `AGENTS.md` 文件。

`AGENTS.md` 确实有帮助——它是一个静态 Markdown 文件，会在启动时告诉 Codex 项目的基本情况。但它记录的是你记得写下的内容，而不是你实际遇到的情况。比如你周二下午 3 点发现的 Redis TTL 差异、代码审查中暴露的 JWT 边缘情况，以及你不再使用 SQLAlchemy 的原因——这些都留在会话记录里，窗口关闭后便消失了。没人更新 `AGENTS.md`，下次会话时这些知识就不复存在。

## Hindsight 如何为 Codex 添加持久记忆 {#how-hindsight-adds-persistent-memory-to-codex}

[Hindsight](https://github.com/vectorize-io/hindsight) 会在 Codex 生命周期中的两个时点接入，为它添加持久记忆层：每次提示之前，以及每次会话之后。

**自动召回。** 每当用户提交提示，召回钩子都会查询 Hindsight，寻找与接下来要问的问题相关的记忆。结果会作为 `additionalContext` 注入 Codex：在模型看到对话之前添加到对话开头，但不会显示在终端输出中。Codex 因此获得了上下文，无需你重复说明。

**自动存入。** Codex 会话结束时（触发 `Stop` 钩子），存入钩子会获取会话记录，移除其中注入的记忆标签以避免反馈循环，然后将记录发送给 Hindsight。提取模型会读取记录并提取离散事实，例如做出的决策、观察到的模式和发现的错误。这些内容会存入记忆库，供之后的每次会话使用。

**完整会话更新插入。** 系统使用会话 ID 作为文档键来存储会话记录。如果同一会话被存入多次（分块模式下会发生这种情况），内容会通过更新插入来覆盖或补充，而不会重复创建，因此不会积累近似重复的条目。

**依赖精简。** 钩子脚本只使用 Python 标准库，无需安装 pip 包、无需 virtualenv，也不会遇到版本冲突。本地守护进程模式需要 [`uvx`](https://docs.astral.sh/uv/) 来运行 `hindsight-embed`；Cloud 模式则完全不需要本地依赖。

```
┌──────────────┐     UserPromptSubmit      ┌─────────────────────────┐
│    Codex     │ ─────────────────────────▶ │  recall.py              │
│    CLI       │ ◀───────────────────────── │  查询 Hindsight，       │
│              │   注入 additionalContext   │  注入上下文             │
│              │                            └─────────────────────────┘
│              │     Stop                  ┌─────────────────────────┐
│              │ ─────────────────────────▶ │  retain.py              │
└──────────────┘                            │  移除标签，将           │
                                            │  会话记录发送给 Hindsight│
                                            └─────────────────────────┘
```

## 安装 {#installing}

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash
```

安装程序会引导你选择本地模式或云模式，并将钩子脚本写入 `~/.hindsight/codex/`。它还会自动在 `~/.codex/config.toml` 中启用 `codex_hooks = true`。

如果在设置过程中选择 Hindsight Cloud，就无需安装其他内容：不需要本地守护进程，也不需要 `uvx`。

启动新的 Codex 会话后，记忆会立即生效。前几次会话会逐步积累记忆库。到第三或第四次会话时，召回就会开始提供有用的上下文，你不必再重新解释。

卸载：

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash -s -- --uninstall
```

## Hindsight Cloud（推荐） {#hindsight-cloud-recommended}

对大多数用户来说，Hindsight Cloud 更简单：无需管理守护进程，记忆会在不同机器间同步，设置只需两行 JSON。默认设置会运行本地 `hindsight-embed` 守护进程；切换到 Cloud 后，你就无需再操心它。编辑 `~/.hindsight/codex.json`：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

在 [hindsight.vectorize.io](https://ui.hindsight.vectorize.io) 创建账户和 API 密钥。无需管理守护进程，云服务器会负责提取。

## 召回的内容 {#what-gets-recalled}

召回钩子会在每个 `UserPromptSubmit` 事件上触发。它会获取你的提示（也可以一并获取上一轮内容作为上下文），查询 Hindsight，然后将最相关的记忆作为一个内容块注入对话开头：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-28 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [world] (2026-03-26)
- Redis TTL in production is 15 minutes — README says 30, README is wrong [world] (2026-03-27)
</hindsight_memories>
```

Codex 能看到这个内容块，但它不会出现在终端输出中。因此，Codex 每次生成回复时都会获得过去会话中的相关上下文，无需你提供这些信息。

你可以通过 `recallBudget`（`"low"`、`"mid"`、`"high"`）和 `recallMaxTokens` 调整注入内容的多少。

### 使用前后对比 {#before-and-after}

没有持久记忆时，你打开会话并输入：“继续处理支付模块。”Codex 没有上下文。它会读取文件、做出合理猜测，还可能问你之前已经回答过的澄清问题；更糟时，它可能会推翻你上周做出的决定。

使用 Hindsight 后，同一个会话一开始就有已召回的事实：你使用的是哪家支付服务商、你决定不用 Webhook 而改用轮询，以及暂存环境中幂等键存在一个已知问题。Codex 会从你上次停下的地方继续，而不是从零开始。

## 按项目隔离记忆 {#per-project-memory}

默认情况下，所有 Codex 会话共用一个记忆库。要为每个项目分别使用独立记忆：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置后，在 `~/projects/api` 和 `~/projects/frontend` 中运行 Codex 会分别维护独立的记忆库。记忆库 ID 根据工作目录路径生成；切换项目时，记忆上下文也会自动切换。Hindsight Cloud 同样支持按项目隔离；无论本地还是云端，差别只在于记忆库 ID 会被路由到 Cloud API，而不是本地守护进程。

## 团队共享记忆 {#team-shared-memory}

个人持久记忆很有用。团队共享记忆则能带来显著改变。

当团队中的每个人都将 Codex 配置指向同一个 Hindsight 记忆库时，一位开发者积累的上下文就能供所有人使用。周一发现的错误会在周二的召回中出现，无论是谁提出查询。一个会话中做出的架构决策，也能为下一次会话提供依据，无需任何人更新共享文档。

要配置团队共享记忆，请在每位开发者的配置中设置固定的 `bankId`，并将配置指向同一个 Hindsight Cloud 端点：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token",
  "bankId": "my-team-project"
}
```

请参阅[面向 AI 编程智能体的共享记忆【无效博客链接】](https://hindsight.vectorize.io/blog/2026/03/31/team-shared-memory-ai-coding-agents)，了解完整的团队设置指南，其中包括记忆库播种、按项目隔离和成员入门流程。

## 关键配置选项 {#key-configuration-options}

设置保存在 `~/.hindsight/codex.json` 中。每项设置也可以通过环境变量指定。

| 设置 | 默认值 | 作用 |
|---------|---------|--------------|
| `retainMission` | generic | 引导事实提取，指定需要关注的内容 |
| `retainEveryNTurns` | `10` | 分块模式下，每隔多少轮在会话中途存入一次 |
| `recallBudget` | `"mid"` | 检索深度：`"low"`（快速）/ `"mid"` / `"high"`（全面） |
| `autoRecall` | `true` | 召回总开关 |
| `autoRetain` | `true` | 存入总开关 |
| `dynamicBankId` | `false` | 启用按项目隔离记忆库 |
| `debug` | `false` | 将所有 Hindsight 活动记录到 stderr |

面向特定关注重点的记忆库，其 `retainMission` 示例：

```json
{
  "retainMission": "Extract technical decisions, known bugs and their workarounds, architecture choices, and coding conventions. Do not retain one-off debugging steps or editor preferences."
}
```

## 常见问题 {#pitfalls}

**钩子没有触发。** 安装程序会自动在 `~/.codex/config.toml` 中设置 `codex_hooks = true`；但如果你手动安装，或该文件原本已存在，这项设置可能会遗漏。检查文件，并在缺少该设置时将其添加到 `[features]` 下。

**第一次会话没有召回任何记忆。** 只有在已有内容存入后，召回才会返回结果。先完成一次会话，或者使用[食谱示例](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/codex-memory)手动为记忆库播种。

**存入似乎有延迟。** 分块模式下，`retainEveryNTurns` 的默认值为 `10`，也就是每 10 轮触发一次存入。完整会话模式（默认模式）则在会话结束时存入一次。如果正在测试，可在配置中添加 `"retainEveryNTurns": 1`。

**什么都没有发生？** 先检查 `~/.hindsight/codex/error.log`，钩子失败记录会写在那里。若要完整追踪每个钩子的操作，请启用调试日志：

**调试模式。** 在 `~/.hindsight/codex.json` 中添加 `"debug": true`，即可将详细活动记录到 `~/.hindsight/codex/debug.log`：

```
[Hindsight] Recalling from bank 'codex', query length: 42
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'codex', doc 'sess-abc123', 2 messages, 847 chars
```

## 权衡 {#tradeoffs}

在决定使用前，有几点值得了解。

**召回会增加延迟。** 每次提示都会在 Codex 看到提示前触发一次 Hindsight 查询。在网络连接良好的情况下，使用 Hindsight Cloud 通常需要 100–300 ms。交互式会话中这几乎察觉不到，但自动化脚本可能会受到影响。如果需要跳过查询，可以设置 `"recallBudget": "low"` 或 `"autoRecall": false`。

**存入是异步的。** `retain.py` 钩子会异步触发，因此不会阻止会话退出。存入完成后，事实通常会在几秒内可用；但具体时间取决于服务器负载，可能早于或晚于下一次会话才出现。

**提取质量取决于对话质量。** Hindsight 会从实际会话记录中提取事实。如果你只通过编辑文件解决问题，却没有说明自己在做什么，提取模型可能几乎没有信息可用。在提示中简要说明情况会有所帮助。

## 回顾 {#recap}

| | Codex 默认行为 | 使用 Hindsight 后 |
|---|---|---|
| 跨会话记忆 | 无 | 自动提供 |
| 记忆设置 | 手动维护 `AGENTS.md` | 从会话记录中提取 |
| 召回机制 | 启动时读取文件内容 | 语义检索，并在每次提示时注入 |
| 按项目隔离 | 不支持 | 可通过 `dynamicBankId` 启用 |
| 团队共享记忆 | 不支持 | 通过 Hindsight Cloud 共用记忆库 |

## 后续步骤 {#next-steps}

- **Hindsight Cloud**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **安装**：`curl -fsSL https://hindsight.vectorize.io/get-codex | bash`
- **配置参考**：[Codex 集成文档](/sdks/integrations/codex)
- **团队记忆**：[面向 AI 编程智能体的共享记忆【无效博客链接】](https://hindsight.vectorize.io/blog/2026/03/31/team-shared-memory-ai-coding-agents)
- **食谱**：[applications/codex-memory](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/codex-memory)
