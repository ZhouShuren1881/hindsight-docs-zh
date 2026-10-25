---
title: "打造一位记得住代码库的 Hermes 编程助手"
authors: [benfrank241]
date: 2026-05-25
tags: [hermes, coding, memory, agents, tutorial, hindsight]
description: "借助 Hindsight，Hermes 智能体可以跨会话记住代码库、约定、过往问题和架构决策。两分钟即可完成设置。"
image: /img/blog/hermes-coding-assistant-codebase-memory.webp
hide_table_of_contents: true
---

![打造一位记得住代码库的 Hermes 编程助手](/img/blog/hermes-coding-assistant-codebase-memory.webp)

:::info 本文发布后，设置方式已有变化
Hindsight 不再与 Hermes 捆绑提供。Nous Research 已将所有记忆提供方移出 Hermes 核心代码库，因此新安装需要先运行
`hermes plugins install hindsight`，再运行 `hermes memory setup`。现有安装会自动迁移。请参阅
[Hindsight 成为 Hermes 插件后有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

每次 AI 编程会话都从零开始。

你打开一个新聊天，粘贴各种背景信息：技术栈、约定、上周作出的架构决策，以及你在三月份花了两天处理的那个问题。下次会话还得再来一遍，之后的会话也一样。问题并不在于 AI 编程工具不擅长编程，而在于它们不了解你的代码库。

Hermes Agent 搭配 Hindsight 就不一样。每次会话都会让它对项目多了解一些。到第 20 次会话时，Hermes 已经了解模块边界、命名约定、已知的脆弱环节，以及那个反复出现的身份验证问题的根本原因。你不再需要解释，它开始自己了解这些情况。

本文会介绍 Hermes 实际上会从编程会话中提取哪些内容、如何在两分钟内完成设置，以及持久的代码库记忆在哪三个工作流程中最能发挥作用。

<!-- truncate -->

---

## Hermes 会记住哪些代码库信息 {#what-hermes-remembers-about-your-codebase}

Hermes 不会存储对话记录。Hindsight 会从对话中提取并保留事实，也就是原子化、可检索的知识片段。

一次典型的编程会话结束后，以下这类事实会自动进入记忆：

- `"Project uses ESM modules, not CommonJS, always use .js extensions in imports"`
- `"The auth middleware fails silently on expired refresh tokens, known issue as of March 14"`
- `"SQLAlchemy was removed in favor of raw asyncpg after performance testing in February"`
- `"Team convention: all async handlers wrapped in handle_errors() decorator"`

这些内容不需要你特意告诉 Hermes 让它记住。Hindsight 的写入流程会从会话的自然交流中提取信息，包括你提出的问题、描述的问题，以及过程中解释的决策。

不会成为记忆的内容包括原始文件内容、逐行代码和冗长的终端输出。提取步骤本身就起到了筛选作用。闲聊、重复的背景说明和过程噪声都会被过滤掉。最终留下的是一个不断扩充的代码库事实索引，Hermes 会在之后的每次会话中带上它。

记忆生命周期在每轮交互的两端运行：

**每轮开始前：** Hindsight 会从历史记录中预取最相关的记忆，并将其注入系统提示词。Hermes 在看到你的消息之前，就已经获得了这些背景信息。

**每次回复后：** 你的对话会被异步存入记忆。Hindsight 在后台提取事实。本轮讨论的内容从下一轮开始即可检索。

---

## 两分钟完成设置 {#two-minute-setup}

Hermes v0.14.0（v2026.5.16）已内置 Hindsight 集成。只需运行一条向导命令即可完成设置：

```bash
hermes memory setup # select "hindsight"
```

确认记忆功能已启用：

```bash
hermes memory status
```

配置文件位于 `$HERMES_HOME/hindsight/config.json`。默认值适用于大多数工作流程：

| 键 | 默认值 | 说明 |
|-----|---------|-------------|
| `mode` | `cloud` | `cloud` 或 `local` |
| `bank_id` | `hermes` | 记忆库标识符；每个项目可设置不同值 |
| `budget` | `mid` | Recall 检索深度：`low` / `mid` / `high` |
| `memory_mode` | `hybrid` | 自动召回 + 显式工具 |
| `prefetch_method` | `recall` | `recall`（快速）或 `reflect`（LLM 综合生成） |

`memory_mode` 控制记忆在 Hermes 中的呈现方式：

- **`hybrid`**（默认）：每轮开始前自动注入记忆，同时向模型提供 `hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect` 工具
- **`context`**：只自动召回记忆，不提供显式工具，也无需额外操作
- **`tools`**：模型必须显式调用 `hindsight_recall`；不会自动注入任何内容

对于编程工作，`hybrid` 是合适的默认选择。每轮都会自动召回记忆，你也可以要求 Hermes 显式调出它对某个组件的了解。

部署时，如果你需要在多台机器间工作，或与团队共享记忆，请使用云端模式。如果你希望所有内容都留在本地且不依赖外部服务，本地模式会在后台运行一个嵌入式 PostgreSQL 守护进程。首次启动时，数据库需要初始化，约需一分钟；之后启动会快得多。启动日志写入 `~/.hermes/logs/hindsight-embed.log`。

> **要从旧版 `hindsight-hermes` 插件迁移？** 请先卸载它（`uv pip uninstall hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python`），然后运行设置向导。原生提供方涵盖了该插件的全部功能。详情请参阅[Hindsight 现在是 Hermes Agent 的原生记忆提供方](/blog/2026/04/06/hermes-native-memory-provider)。

---

## 代码库记忆最有用的三个工作流程

### 在现有项目中开始新会话 {#starting-a-new-session-on-existing-work}

没有记忆时，接手现有项目意味着实际工作开始前要先补充背景：粘贴 README、介绍技术栈、说明上次做到哪里，并提醒 Hermes 那些它本该已经知道的约定。在复杂项目中，每次会话都要花 10–15 分钟做这些准备。

有了记忆，Hermes 每次开始会话时都会把之前累积的事实注入上下文。它了解技术栈和约定，也知道你上周在调试什么。

会话中的第一条消息就可以直接开始实际工作。

注入哪些内容由 `budget` 设置决定。使用默认值 `mid` 时，Hindsight 会取回最相关的 10–15 条记忆，足以涵盖项目的核心事实，又不会塞满上下文窗口。设为 `high` 时，检索范围会更广：上下文更多，占用的 token 也更多。对大多数编程工作流程来说，`mid` 是合适的平衡点。如果你要继续调查涉及多个模块的复杂问题，多花一些成本使用 `high` 就值得。

### 调试反复出现的问题 {#debugging-recurring-issues}

代码库记忆最有价值之处，在于它能跨会话识别模式。有些问题并非偶发，它们是更深层架构问题的症状，会在几个月内以不同形式反复出现。

没有记忆时，每次遇到类似问题都得单独调试。你可能会把同一个根本原因追查三遍，却没有把线索联系起来。

有了记忆，Hermes 就能回忆起以前遇到的情况。描述一种新的故障模式，它就会调出相关背景：两个月前找到的根本原因、一直有效到下次重构的临时解决办法，以及在这些故障中反复出现的组件。

以下这类事实在此类工作中尤其有用：

- `"The rate limiter bypasses auth checks for requests with X-Internal: true header, source of two privilege escalation near-misses"`
- `"Async task queue silently drops jobs when Redis connection resets, needs explicit ACK handling, not fire-and-forget"`
- `"GraphQL resolver N+1 pattern reappears after every new schema addition, needs DataLoader enforcement flagged in code review"`

这些事实不是你会想到要在调试会话开始时粘贴的内容。它们属于团队的经验知识，能让你从盲目排查转为结合完整背景调试。

对于这一工作流程，建议启用 `prefetch_method: reflect`。`reflect` 不会通过语义检索调取单条事实，而是让 LLM 在注入记忆前综合所有相关内容，生成连贯的摘要。这个过程会慢一些；但对于“帮我理解这一类问题”之类的查询，综合后的背景信息比逐条列出事实更有用。

### 熟悉他人的代码库 {#onboarding-to-someone-elses-code}

如果你加入的项目中有同事一直使用 Hermes 和 Hindsight，并且双方共用一个记忆库，那么该记忆库已经积累了他们各次会话中的背景信息。

可以询问 Hermes 对某个模块的了解：

```
What do you know about the payments module?
```

```
What quirks or known issues have come up in the auth service?
```

```
What were the reasons we moved off SQLAlchemy?
```

Hermes 会调出此前会话中积累的事实，包括架构背景、已知边缘情况、过去的决策及其理由。任何人都不必再把这些内容写进 README、维基页面，或没人找得到的 Slack 讨论串。

这不是文档，而是那些从未写进文档的组织经验知识。

---

## 优质的代码库记忆包含什么 {#what-good-codebase-memory-looks-like}

在一个项目上使用 30 多次会话后，精心构建的记忆库通常会涵盖：

**项目约定：** 模块结构和导入模式、错误处理要求、代码中不容易看出的命名约定，以及与默认配置不同的 lint 规则。

**已知脆弱环节：** 在特定负载或输入条件下会出问题的组件、曾引发生产事故的集成点，以及测试套件未覆盖的边缘情况。

**架构沿革：** 曾被替换的依赖及其原因、讨论过但最终否决的方案，以及通过测试而非文档发现的性能特征。

**团队偏好：** 代码审查时的优先事项、部署时容易踩的坑，以及实际表现与官方文档描述不同的地方。

大部分内容都会在日常会话中自动积累。例外是重大的架构决策和团队偏好，它们最好明确说明。作出重要决定时，要告诉 Hermes 背后的理由：

```
We're switching to asyncpg from SQLAlchemy because connection pooling
under our load profile caused intermittent timeouts above ~200 concurrent
requests. The fix wasn't tuning, it was the ORM abstraction. Remember this.
```

在 `hybrid` 模式下，模型也可以调用 `hindsight_retain`，显式标记要保留的内容。不过，即使不做这一步，后台提取也能捕捉到大部分重要信息。

**前后对比：一次会话中的记忆召回**

没有记忆时，会话开头可能是这样：

> "I'm working on a Python service that uses asyncpg for database access. We removed SQLAlchemy in February due to connection pool issues under load. All async handlers should be wrapped in `handle_errors()`. Help me debug this intermittent 500..."

有了记忆后，Hermes 已经获得了这些事实。你可以直接说：

> "Help me debug this intermittent 500 in the payment handler."

技术栈、约定和架构背景都已经具备。

---

## 团队代码库：共享记忆库 {#team-codebases-shared-memory-banks}

默认情况下，`bank_id` 的值是 `hermes`。同一项目的每位开发者只要设置相同的 `bank_id`，就可以共用一个记忆库：

```json
{
 "bank_id": "payments-service",
 "mode": "cloud"
}
```

多个开发者在同一代码库中使用 Hermes 并共用一个记忆库时，各自会话中的信息会不断累积。某位开发者积累的知识、棘手模块未记录的行为、来之不易的调试经验和部署时的注意事项，都能自动提供给团队其他成员。

有几点需要考虑：

- **适合共同积累的内容：** 代码库事实、架构决策、已知问题和约定。这些描述的是代码库，而不是个人，因此适合共享。
- **适合分开保存的内容：** 个人工作流程偏好和无关的个人背景。应为这些内容使用单独的记忆库。
- **记忆库命名：** 每个项目使用一个记忆库，而不是每位开发者一个。三个人不协调地共用名为 `hermes` 的记忆库，会让内容变得杂乱；支付团队共同使用名为 `payments-service` 的记忆库，则会逐步积累成组织经验知识。

---

## 进阶：预先构建结构化心智模型 {#advanced-seeding-a-structured-mental-model}

从会话中自然提取信息，是 Hindsight 构建代码库知识的主要方式。不过，你也可以主动预先补充背景信息；在开始处理现有代码库时，或希望关键约定在首次会话开始前就已存入记忆库时，这样做会很有用。

除了 Hermes 本身提供的功能外，Hindsight 还通过 SDK 和 API 提供两种操作，它们会写入 Hermes 使用的同一个记忆库：

**摄取现有文档。** 上传架构说明、ADR 或约定文件。Hindsight 会从内容中提取事实，并将结果作为记忆存入记忆库。摄取完成后，Hermes 下次会话就能使用这些事实，无需等待日常会话逐步积累信息。

**创建心智模型。** 根据源查询定义一份人工维护的摘要，例如“这个项目的编码约定是什么？”。Hindsight 会执行 Reflect 操作，依据所有已摄取内容和从会话中提取的知识综合生成答案，并保存结果。将 `refresh_after_consolidation` 设为 true 后，有新事实到达时系统会重新推导该模型。Reflect 调用会优先检查心智模型，然后才检查单条观测和原始事实，因此可以直接返回预先计算好的答案，无需临时重新推导。

将已摄取的项目文档与会话中提取的事实结合起来，Hermes 就能从两个角度全面了解项目：哪些内容是有意记录下来的，哪些内容是在实际使用中发现的。

这也让自主编程智能体变得切实可用。具备丰富且最新的心智模型、约定、架构信息和已知脆弱环节的智能体，拥有足够的结构化背景来作出决策并推动变更，无需每项任务开始时都由人类向它介绍情况。持久的会话记忆能让你达到这样的起点。

完整 API 参考请参阅 [Hindsight 心智模型文档](/developer/api/mental-models)。

---

## 用得越久，需要解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

Hermes 搭配 Hindsight，是唯一能够跨会话累积背景信息的编程工作流程。每次会话都会让它更了解你的代码库。其他工具会重置，而它不会。

使用越久，价值越高。第一次会话时，Hermes 对项目一无所知；第五次会话时，它了解技术栈和约定；到了第 30 次会话，它已经了解项目沿革、脆弱环节，以及塑造项目当前形态的决策。此时你不再解释这些内容，并不是因为省略了背景，而是因为再也不必重复说明。心智模型足够丰富后，你面对的不只是一个编程助手，而是一位和你一样了解代码库的智能体。

运行 `hermes memory setup` 即可开始设置，也可以先参阅 [Hindsight 集成文档](/sdks/integrations/hermes)。

---

**延伸阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，介绍 AI 智能体如何保留背景信息的基础概念
- [Hindsight 现在是 Hermes Agent 的原生记忆提供方](/blog/2026/04/06/hermes-native-memory-provider)，包含设置指南、记忆模式和配置参考
- [使用 Hindsight 为 Codex 添加持久记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，将相同模式应用于 OpenAI Codex
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，比较主要的智能体记忆框架
---
