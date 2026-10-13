---
title: "将持久记忆添加到OpenAICodex和Hindsight"
authors: [benfrank241]
date: 2026-04-08T09:00
tags: [codex, openai, memory, persistent-memory, hindsight, tutorial, coding-agents, python]
image: /img/blog/adding-memory-to-codex-with-hindsight.webp
description: "在Hindsight的会话中给予OpenAICodex持久记忆。自动记忆在每个提示之前注入上下文。自动记忆存储在会话结束时提取事实。"
hide_table_of_contents: true
---

![将持久记忆添加到OpenAICodex和Hindsight](/img/blog/adding-memory-to-codex-with-hindsight.webp)

## 概览 {#tldr}

<!-- truncate -->

- Codex 没有内置持久记忆。每个会话都是全新的 - 不记得过去的决定、偏好或代码库上下文。
- Hindsight插件通过三个Python脚本挂钩到Codex，需要零个`pip install`。一个 curl 命令即可让您运行。
- 自动记忆召回在每次提示之前都会查询您的记忆库，并将相关事实作为不可见的上下文注入。 Codex看到他们；你不必重复它们。
- 自动记忆存储在每次会话结束时触发，从记录中提取事实，并将其存储以供将来记忆召回。
- 对于团队，将每个人的配置指向具有固定`bankId`的共享Hindsight服务器。参见[AI编码智能体的共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
- Hindsight Cloud将您的记忆库存储在服务器端 — 无需本地守护进程，记忆会跨机器跟随您。 [免费注册。](https://ui.hindsight.vectorize.io)

## 问题：Codex没有持久记忆 {#the-problem-codex-has-no-persistent-memory}

[Codex](https://github.com/openai/codex)是OpenAI的开源编码智能体CLI。你给它一个任务，它读取你的文件，运行命令，并迭代直到完成。它能力强、速度快，但没有记忆。

每一次训练都是从零开始。 Codex 不知道您的项目使用了哪些库，您标准化了哪些模式，代码库的哪些区域是脆弱的，或者您昨天在做什么。您可以在每次会话开始时通过直接解释或指向您手动维护的 `AGENTS.md` 文件来重新建立此上下文。

`AGENTS.md` 有帮助——它是一个静态 Markdown 文件，可以在启动时告诉 Codex 有关项目的基线事实。但它捕捉的是你记得写下的内容，而不是你实际遇到的内容。您在周二下午 3 点注意到的 Redis TTL 差异、代码审查期间出现的 JWT 边缘情况、您停止使用 SQLAlchemy 的原因 — 这些实时会话记录在窗口关闭时消失。没有人更新`AGENTS.md`。下一次会议，这些知识就消失了。

## Hindsight如何为Codex添加持久记忆 {#how-hindsight-adds-persistent-memory-to-codex}

[Hindsight](https://github.com/vectorize-io/hindsight) 通过在两个点挂钩其生命周期，为 Codex 添加持久记忆层：每个提示之前和每个会话之后。

**自动记忆召回。** 在每个用户提示上，记忆召回挂钩都会查询 Hindsight 来查找与您要询问的内容相关的记忆。结果将作为 `additionalContext` 注入到 Codex 中——在模型看到它之前添加到对话中，但在终端输出中不可见。 Codex 有上下文；你不必重复它。

**自动记忆存储。** 当 Codex 会话结束时（`Stop` 钩子触发），记忆存储钩子获取会话记录，剥离任何注入的记忆标签以防止反馈循环，并将其发送到 Hindsight。提取模型读取它并提取离散的事实——做出的决策、观察到的模式、发现的错误。这些内容会存储在您的记忆库中，供以后的每个会话使用。

**完整会话更新插入。** 使用会话 ID 作为文档密钥来存储记录。如果会话被保留多次（在分块模式下），则内容将被更新插入而不是重复。没有积累几乎相同的条目。

**最小依赖性。** 挂钩脚本仅使用 Python stdlib — 无需安装 pip，无 virtualenv，无版本冲突。本地守护进程模式需要[`uvx`](https://docs.astral.sh/uv/)才能运行`hindsight-embed`；云模式根本没有本地先决条件。

```
┌──────────────┐     UserPromptSubmit      ┌─────────────────────────┐
│    Codex     │ ─────────────────────────▶ │  recall.py              │
│    CLI       │ ◀───────────────────────── │  queries Hindsight,     │
│              │   additionalContext inject  │  injects as context     │
│              │                            └─────────────────────────┘
│              │     Stop                  ┌─────────────────────────┐
│              │ ─────────────────────────▶ │  retain.py              │
└──────────────┘                            │  strips tags, sends     │
                                            │  transcript to Hindsight│
                                            └─────────────────────────┘
```

## 安装 {#installing}

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash
```

安装程序将引导您选择本地或云模式，并将挂钩脚本写入`~/.hindsight/codex/`。它还会自动在您的 `~/.codex/config.toml` 中启用 `codex_hooks = true`。

如果您在安装过程中选择Hindsight Cloud，则无需安装任何其他内容 - 无需本地守护程序，也无需`uvx`。

开始新的Codex会话——记忆立即生效。前几次课程会建立您的记忆库。到了第三或第四，记忆召回开始浮现有用的上下文，你不必重新解释。

卸载：

```bash
curl -fsSL https://hindsight.vectorize.io/get-codex | bash -s -- --uninstall
```

## Hindsight Cloud（推荐） {#hindsight-cloud-recommended}

对于大多数用户来说，Hindsight Cloud是更简单的选择：无需管理守护进程，记忆在机器之间同步，并且设置是JSON的两行。默认设置运行本地 `hindsight-embed` 守护进程，但切换到云意味着您不必再考虑它。编辑`~/.hindsight/codex.json`：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token"
}
```

创建一个帐户并在[hindsight.vectorize.io](https://ui.hindsight.vectorize.io)处创建API密钥。无需管理守护进程——云服务器处理提取。

## 什么被召回 {#what-gets-recalled}

记忆召回钩子在每个`UserPromptSubmit`事件上触发。它需要您的提示（以及可选的上一轮上下文），查询Hindsight，并将最相关的记忆作为对话顶部的块注入：

```
<hindsight_memories>
Relevant memories from past conversations...
Current time - 2026-03-28 09:14

- Project uses FastAPI with asyncpg — not SQLAlchemy [world] (2026-03-26)
- Preferred testing framework: pytest with pytest-asyncio [world] (2026-03-26)
- Redis TTL in production is 15 minutes — README says 30, README is wrong [world] (2026-03-27)
</hindsight_memories>
```

Codex看到这个块；它不会出现在您的终端输出中。结果：Codex 使用过去会话的相关上下文开始每个响应，而无需您提供。

您可以使用`recallBudget`（`"low"`、`"mid"`、`"high"`）和`recallMaxTokens`调整注入量。

### 之前和之后 {#before-and-after}

如果没有持久记忆，您打开一个会话并输入：“继续处理支付模块。” Codex 没有上下文。它会读取文件，做出合理的猜测，并可能会询问您之前回答过的澄清问题，或更糟糕的是，与您上周做出的决定相矛盾。

使用Hindsight，同一个会话将打开，并包含上下文中已回忆的事实：您正在使用哪个支付提供商、您决定反对 Webhook 而支持轮询，以及暂存环境存在幂等性密钥的已知问题。 Codex 从你离开的地方开始，而不是从零开始。

## 每个项目记忆 {#per-project-memory}

默认情况下，所有Codex会话共享一个记忆库。为每个项目提供自己独立的记忆：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

使用此配置，在`~/projects/api`和`~/projects/frontend`中运行Codex维护单独的记忆库。 记忆库 ID 源自工作目录路径 - 切换项目会自动切换记忆上下文。每个项目的隔离与Hindsight Cloud的工作方式与在本地的方式相同——记忆库ID只是路由到云API而不是本地守护进程。

## 团队共享记忆 {#team-shared-memory}

个人持久记忆是有用的。整个团队共享记忆具有变革性。

当团队中的每个人都将他们的Codex配置指向同一个Hindsight记忆库时，一个开发人员积累的上下文将可供所有人使用。周一发现的错误会在周二的记忆召回中浮现出来，无论是谁提出的。在一个会话中做出的架构决策可以为下一个会话提供信息，而无需任何人更新共享文档。

要配置团队共享记忆，请在每个开发人员的配置中设置固定的`bankId`，并将它们指向相同的Hindsight Cloud端点：

```json
{
  "hindsightApiUrl": "https://api.hindsight.vectorize.io",
  "hindsightApiToken": "hsk_your_token",
  "bankId": "my-team-project"
}
```

请参阅[AI编码智能体的共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)，了解完整的团队设置指南，包括记忆库播种、每个项目的隔离和入职模式。

## 关键配置选项 {#key-configuration-options}

设置位于`~/.hindsight/codex.json`。每个设置也可以通过环境变量进行设置。

|设置|默认|它的作用|
|---------|---------|--------------|
|`retainMission`|通用|引导事实提取——告诉它要关注什么|
|`retainEveryNTurns`|`10`|在分块模式下会话中期记忆存储的频率|
|`recallBudget`|`"mid"`|搜索深度：`"low"`（快速）/`"mid"` / `"high"`（彻底）|
|`autoRecall`|`true`|记忆召回总开关|
|`autoRetain`|`true`|保持总开关|
|`dynamicBankId`|`false`|启用每个项目记忆库隔离|
|`debug`|`false`|将所有 Hindsight 活动记录到 stderr|

示例 `retainMission` 重点记忆库：

```json
{
  "retainMission": "提取技术决策、已知错误及其解决方法、架构选择和编码约定。不要记忆存储一次性调试步骤或编辑器首选项。"
}
```

## 陷阱 {#pitfalls}

**钩子不发射。** 安装程序会自动将 `codex_hooks = true` 设置为 `~/.codex/config.toml`，但如果您手动安装或该文件已存在，则可能会丢失此功能。检查文件并在 `[features]` 下添加设置（如果丢失）。

**第一节课中没有回忆起任何记忆。** 记忆召回仅在保留某些内容后才会返回结果。首先完成一个会话，或者使用 [食谱示例](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/codex-memory) 手动播种您的记忆库。

**记忆力似乎被延迟了。**`retainEveryNTurns`在分块模式下默认为`10`——存储记忆每 10 回合触发一次。在完整会话模式（默认）下，保留在会话结束时触发一次。如果您正在测试，请将 `"retainEveryNTurns": 1` 添加到您的配置中。

**​​什么也没发生？** 首先检查`~/.hindsight/codex/error.log` — 钩子失败记录在那里。要完整跟踪每个钩子正在执行的操作，请启用调试日志记录：

**调试模式。** 将 `"debug": true` 添加到 `~/.hindsight/codex.json` 以将详细活动记录到 `~/.hindsight/codex/debug.log`：

```
[Hindsight] Recalling from bank 'codex', query length: 42
[Hindsight] Injecting 3 memories
[Hindsight] Retaining to bank 'codex', doc 'sess-abc123', 2 messages, 847 chars
```

## 权衡 {#tradeoffs}

在承诺之前值得了解的一些事情。

**记忆召回增加了延迟。** 每个提示都会在 Codex 看到之前触发 Hindsight 查询。实际上，使用 Hindsight Cloud快速连接时，该时间为 100–300 毫秒。对于交互式会话，它是难以察觉的；对于自动化脚本来说这可能很重要。如果需要跳过它，请使用`"recallBudget": "low"`或`"autoRecall": false`。

**保留是异步的。** `retain.py` 钩子异步触发，因此它不会阻止会话退出。事实通常在保留完成后几秒钟内可用，但时间取决于服务器负载 - 它们可能会比下一个会话早或晚出现。

**提取质量取决于对话质量。** Hindsight 从文字记录中实际提取事实。如果您完全在文件编辑中解决问题而没有说明您正在做什么，则提取模型可能无法处理。提示中的简短解释会有所帮助。

## 回顾 {#recap}

||Codex 默认|与 Hindsight|
|---|---|---|
|跨课程记忆|无|自动|
|记忆设置|说明书`AGENTS.md`|摘自成绩单|
|记忆召回机制|启动时的文件内容|语义搜索，根据提示注入|
|每个项目的隔离|否|可选通过`dynamicBankId`|
|团队共享记忆|否|通过Hindsight Cloud端共享记忆库|

## 后续步骤 {#next-steps}

- **Hindsight Cloud**：[ui.hindsight.vectorize.io](https://ui.hindsight.vectorize.io)
- **安装**：`curl -fsSL https://hindsight.vectorize.io/get-codex | bash`
- **配置参考**：[Codex集成文档](/sdks/integrations/codex)
- **团队记忆**：[AI编码智能体的共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)
- **食谱**：[应用程序/codex-记忆](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/codex-memory)
