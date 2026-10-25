---
title: "打造能记住代码库的 OpenClaw 编码智能体"
authors: [benfrank241]
date: 2026-05-27T12:00
tags: [openclaw, coding, memory, agents, tutorial, hindsight]
description: "OpenClaw 搭配 Hindsight，可跨会话记住代码库中的约定、以往的 bug 和架构决策。只需 2 分钟即可完成设置。"
image: /img/blog/openclaw-coding-agent-codebase-memory.webp
hide_table_of_contents: true
---

![打造能记住代码库的 OpenClaw 编码智能体](/img/blog/openclaw-coding-agent-codebase-memory.webp)

每次 AI 编码会话都从零开始。

你打开 [OpenClaw](https://github.com/openclaw/openclaw)，把上下文粘贴进去——技术栈、项目约定、上周做出的架构决策，还有三月份花了两天处理的 bug。下次会话还得再来一遍，之后的每次也一样。问题不在于 OpenClaw 不擅长编码，而在于它不了解你的代码库。

OpenClaw 搭配 Hindsight，就能打破这种局面。每次会话都会让它对项目多了解一些。到了第 20 次会话，OpenClaw 已经了解模块边界、命名约定、已知的脆弱部分，以及那个反复出现的认证问题的根本原因。你不再需要反复解释，它也开始逐渐了解项目。

本文将介绍 OpenClaw 实际会从编码会话中提取哪些内容、如何在两分钟内完成设置，以及持久的代码库记忆在哪三种工作流程中最能发挥作用。

<!-- truncate -->

---

## OpenClaw 会记住代码库中的哪些内容 {#what-openclaw-remembers-about-your-codebase}

OpenClaw 不会存储对话记录。Hindsight 提取并保留的是事实——从对话中提取的、原子化且可检索的知识片段。

一次典型的编码会话结束后，以下这类事实会自动进入记忆：

- `"Project uses ESM modules, not CommonJS — always use .js extensions in imports"`
- `"The auth middleware fails silently on expired refresh tokens, known issue as of March 14"`
- `"SQLAlchemy was removed in favor of raw asyncpg after performance testing in February"`
- `"Team convention: all async handlers wrapped in handle_errors() decorator"`

你不需要明确告诉 OpenClaw 记住这些内容。Hindsight 的写入流程会从会话的自然交流中提取它们——包括你提出的问题、描述的 bug，以及过程中解释的决策。

不会成为记忆的内容包括：原始文件内容、逐行代码和冗长的终端输出。提取步骤本身就是一道过滤器。对话中的填充内容、重复的上下文铺垫和程序性噪声都不会保留下来。最终留下的是不断增长的代码库事实索引，OpenClaw 会在之后的每次会话中调用它。

每个回合开始和结束时都会运行相应的流程：

**每个回合开始前：** Hindsight 会从历史记录中预取最相关的记忆，并将其注入系统提示。OpenClaw 在看到你的消息之前就能看到这些上下文。

**每次回复之后：** 对话会异步存入记忆。Hindsight 在后台提取事实。本回合讨论的内容从下一回合开始即可检索。

---

## 两分钟完成设置 {#two-minute-setup}

安装插件并运行设置向导：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导会引导你选择三种安装模式：

- **云端**——使用托管版 Hindsight。粘贴云 API 令牌即可完成。
- **外部 API**——连接你自己的 Hindsight 部署。按提示输入 URL 和可选的令牌。
- **嵌入式守护进程**——在本机运行 Hindsight。按提示输入 LLM 服务提供方（OpenAI、Anthropic、Gemini、Groq、Ollama、Claude Code、Codex）及其 API 密钥。

确认记忆功能已启用：

```bash
openclaw gateway
# 查看日志：
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
# 应该能看到：
# [Hindsight] ✓ Using provider: openai, model: gpt-4o-mini
```

配置文件位于 `~/.openclaw/openclaw.json`。这些默认值适用于大多数编码工作流程：

| 键 | 默认值 | 说明 |
|-----|---------|------|
| `autoRecall` | `true` | 每个回合开始前注入记忆 |
| `autoRetain` | `true` | 每个回合结束后捕捉对话 |
| `recallBudget` | `mid` | 记忆召回深度：`low` / `mid` / `high` |
| `recallMaxTokens` | `1024` | 每个回合注入的记忆上下文量 |

`autoRecall` 和 `autoRetain` 的默认值都是 `true`，因此无需修改智能体侧的设置，记忆功能开箱即用。OpenClaw 不需要知道记忆功能的存在，只需获得相关上下文即可。每个回合开始前，记忆会注入系统提示；每次回复后，对话会在后台存入记忆。

部署时，如果你需要在多台机器上工作，或与团队共享记忆，请使用云端服务。如果你希望所有内容都保留在本地且不依赖外部服务，嵌入式守护进程会在后台运行本地 PostgreSQL 实例。首次启动大约需要一分钟，之后启动会很快。启动日志保存在 `~/.hindsight/profiles/openclaw.log`。

> **从 0.5.x 迁移？** 0.6.0 版插件移除了所有读取进程环境变量的功能。此前从 shell 环境变量（`OPENAI_API_KEY`、`HINDSIGHT_API_LLM_PROVIDER` 等）读取的配置，现在必须通过 `openclaw config set` 设置；凭据应使用 SecretRef。迁移后请运行 `openclaw config validate`。完整映射见[集成文档](/sdks/integrations/openclaw)。

---

## 代码库记忆最能发挥作用的三种工作流程 {#three-workflows-where-codebase-memory-matters}

### 在现有项目上开始新会话 {#starting-a-new-session-on-existing-work}

没有记忆时，要接着处理现有项目，真正开始工作前得先补充上下文：粘贴 README，解释技术栈，重新说明上次做到哪里，还要提醒 OpenClaw 它本该已经知道的约定。对于复杂项目，这些额外准备会占用每次会话 10 到 15 分钟。

有了记忆，OpenClaw 开始每个会话时，之前会话积累的事实就已注入上下文。它了解技术栈、项目约定，也知道你上周在调试什么。

会话的第一条消息就可以直接进入实际工作。

注入哪些内容由 `recallBudget` 设置控制。在默认值 `mid` 下，Hindsight 会检索最相关的 10 到 15 条记忆，足以涵盖项目的核心事实，又不会塞满上下文窗口。设为 `high` 时，检索会更深入，提供更多上下文，也会使用更多 token。对大多数编码工作流程而言，`mid` 是合适的平衡点。如果你要继续调查涉及多个模块的复杂问题，额外付出的成本值得换取 `high` 带来的帮助。

### 调试反复出现的问题 {#debugging-recurring-issues}

代码库记忆最有价值的地方，是能跨会话识别模式。有些 bug 并非孤立事件，而是更深层架构问题的症状，几个月间以不同形式反复出现。

没有记忆时，你只能分别调试每次出现的问题。你可能会追查同一个根本原因三次，却没有把这些线索联系起来。

有了记忆，OpenClaw 就能回想起之前发生过的情况。你描述一种新的故障模式时，它会找出相关上下文：两个月前识别出的根本原因、一直沿用到下一次重构的解决方法，以及在这些故障中反复出现的组件。

以下这些事实在这种情况下很有帮助：

- `"The rate limiter bypasses auth checks for requests with X-Internal: true header, source of two privilege escalation near-misses"`
- `"Async task queue silently drops jobs when Redis connection resets, needs explicit ACK handling, not fire-and-forget"`
- `"GraphQL resolver N+1 pattern reappears after every new schema addition, needs DataLoader enforcement flagged in code review"`

这些事实通常不会是你在调试会话开始时主动粘贴的内容，却是区分盲目调试与掌握完整上下文后再调试的团队知识。

对这一工作流程而言，额外成本值得换取 `recallBudget: high` 带来的帮助。高预算检索比默认的 10 到 15 条记忆更深入，能提供更多上下文并采用更多检索策略。如果你要追查的问题横跨多个子系统和以往的会话，额外扩大召回范围就很有价值。

### 熟悉他人的代码 {#onboarding-to-someone-elses-code}

如果你加入的项目中有同事一直在使用 OpenClaw 和 Hindsight，并且大家共用一个记忆库，那么这个记忆库中已经保存了他们会话里的上下文。

可以询问 OpenClaw 对特定模块的了解：

```
What do you know about the payments module?
```

```
What quirks or known issues have come up in the auth service?
```

```
What were the reasons we moved off SQLAlchemy?
```

OpenClaw 会提供以往会话中积累的事实，包括架构背景、已知的边界情况、过去的决策及其背后的推理。任何人都不必把这些内容写进 README、维基页面，或没人找得到的 Slack 讨论串。

这不是文档，而是从未写进文档的团队知识。

---

## 优质的代码库记忆包含什么 {#what-good-codebase-memory-looks-like}

在一个项目上积累了 30 多次会话后，构建良好的记忆库通常会涵盖：

**项目约定：** 模块结构和导入模式、错误处理要求、代码本身无法明显体现的命名约定，以及不同于默认规则的 lint 规则。

**已知的脆弱部分：** 在特定负载或输入条件下会出问题的组件、曾导致生产事故的集成点，以及测试套件未覆盖的边界情况。

**架构沿革：** 被替换的依赖项及替换原因、曾考虑但最终否决的模式，以及通过测试而非文档发现的性能特征。

**团队偏好：** 代码审查时的关注重点、部署时容易踩的坑，以及实际行为与官方文档描述不同的地方。

其中大部分内容会从日常会话中自动积累。主要的架构决策和团队偏好则适合明确说明。作出重要决定时，可以告诉 OpenClaw 背后的理由：

```
We're switching to asyncpg from SQLAlchemy because connection pooling
under our load profile caused intermittent timeouts above ~200 concurrent
requests. The fix wasn't tuning, it was the ORM abstraction. Remember this.
```

后台提取无需你采取明确操作，就能捕捉大部分重要内容。

**前后对比：会话中记忆召回的效果**

没有记忆时，会话开头可能是这样：

> “我正在开发一个使用 asyncpg 访问数据库的 Python 服务。由于高负载下连接池会出问题，我们在 2 月移除了 SQLAlchemy。所有异步处理器都应该用 `handle_errors()` 包装。帮我调试这个间歇性出现的 500 错误……”

有了记忆，OpenClaw 已经获得这些事实。你可以这样开始：

> “帮我调试支付处理器中这个间歇性出现的 500 错误。”

技术栈、约定和架构背景都已具备。

---

## 团队代码库：共享记忆库 {#team-codebases-shared-memory-banks}

默认情况下，OpenClaw 会按智能体、通道和用户分别创建记忆库。如果团队要在同一项目上共用一个编码智能体，可以将 `dynamicBankGranularity` 设为仅按智能体划分，让大家共享一个记忆库：

```json
{
  "dynamicBankGranularity": ["agent"]
}
```

多名开发者在同一代码库上使用 OpenClaw 并共享记忆库时，记忆会汇集各自所有会话的内容。一名开发者积累的知识——棘手模块中未记录的行为、来之不易的调试经验、部署时容易踩的坑——都会自动提供给团队其他成员。

有几点需要考虑：

- **适合共同积累的内容：** 代码库事实、架构决策、已知问题和约定。这些描述的是代码库，而非个人，因此适合共享。
- **适合分开保存的内容：** 个人工作流程偏好和无关的个人上下文。这些内容应使用单独的记忆库。
- **记忆库命名：** 使用 `bankIdPrefix` 为各项目的记忆库添加命名空间。支付团队成员共同使用、前缀为 `payments-service` 的共享记忆库，会逐渐成为团队知识库。三个人未经协调就共用默认记忆库，则会变成噪声来源。

---

## 进阶：预置结构化心智模型 {#advanced-seeding-a-structured-mental-model}

从会话中自动提取，是 Hindsight 构建代码库知识的主要方式。不过，你也可以预先显式提供上下文。这在开始处理现有代码库，或希望在首次会话前就把关键约定存入记忆库时很有用。

通过 OpenClaw 之外的 SDK 和 API，Hindsight 提供两种操作，数据会进入 OpenClaw 所使用的同一个记忆库：

**摄取现有文档。** 上传架构说明、ADR 或约定文件。Hindsight 会从内容中提取事实，并将结果作为记忆存入记忆库。摄取完成后，OpenClaw 在下一次会话中就能使用这些事实，无需等待日常会话中的自动提取逐渐积累到足够内容。

**创建心智模型。** 根据源查询定义一个人工维护的摘要，例如“这个项目的编码约定是什么？”。Hindsight 会执行 Reflect 操作，根据所有已摄取和从会话中提取的知识综合生成答案，并保存结果。将 `refresh_after_consolidation` 设为 `true` 后，新事实到来时系统会重新推导这个模型。在 Reflect 调用期间，系统会先检查心智模型，再检查单条观测和原始事实，因此会直接返回预先计算的答案，无需即时重新推导。

**回填已有历史记录。** 如果你已经积累了数月的 OpenClaw 会话，该插件附带一个回填 CLI，可将这些会话导入 Hindsight：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-backfill \
  --openclaw-root ~/.openclaw \
  --dry-run
```

移除 `--dry-run` 即可执行。使用 `--agent proj-run` 将导入范围限定为指定智能体；使用 `--resume` 可从上次回填停止的位置继续。

摄取的项目文档、从会话中提取的事实和回填的历史记录结合起来，就能从三个角度为 OpenClaw 提供完整图景：有意记录的内容、使用过程中发现的内容，以及安装插件之前发生的事情。

完整 API 参考见 [Hindsight 心智模型文档](/developer/api/mental-models)。

---

## 用得越久，需要解释的越少 {#the-longer-you-use-it-the-less-you-explain}

OpenClaw 搭配 Hindsight，是少数能在不同会话间累积上下文的编码工作流程之一。每次会话都会让它多了解一些你的代码库。其他工具会重置，它不会。

这些价值会随着使用不断积累。第一次会话时，OpenClaw 对项目一无所知。第五次会话时，它了解技术栈和约定。到了第 30 次会话，它已经了解项目历史、脆弱部分，以及塑造项目现状的决策。这时你不再需要解释这些内容，不是因为略过了上下文，而是因为再也不必重新提供。等心智模型足够丰富后，你面对的不再只是一个编码助手，而是一个和你一样了解代码库的智能体。

运行 `openclaw plugins install @vectorize-io/hindsight-openclaw` 即可开始设置，也可以从 [Hindsight 集成文档](/sdks/integrations/openclaw)开始。

---

**延伸阅读：**
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，了解 AI 智能体如何保留上下文的基础概念
- [打造能记住代码库的 Hermes 编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)，将同一模式应用于以终端为主的 Hermes 编码工作流
- [用 Hindsight 为 OpenClaw 添加记忆](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)，最初的集成公告
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，对比各大智能体记忆框架

---
