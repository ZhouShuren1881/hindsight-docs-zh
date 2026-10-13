---
title: "构建记住您的代码库的OpenClaw编码智能体"
authors: [benfrank241]
date: 2026-05-27T12:00
tags: [openclaw, coding, memory, agents, tutorial, hindsight]
description: "OpenClaw 和 Hindsight 可以跨会话记住您的代码库 — 约定、过去的错误、架构决策。 2 分钟内完成设置。"
image: /img/blog/openclaw-coding-agent-codebase-memory.webp
hide_table_of_contents: true
---

![构建记住您的代码库的OpenClaw编码智能体](/img/blog/openclaw-coding-agent-codebase-memory.webp)

每个AI编码会话都从零开始。

你打开[OpenClaw](https://github.com/openclaw/openclaw)，粘贴到上下文中——你的堆栈、你的约定、你上周做出的架构决策、你在三月份花了两天时间处理的错误。然后你在下一次训练中再做一次。还有那之后的那一位。问题不在于 OpenClaw 不擅长编码。这是因为它不记得你的代码库。

OpenClaw 和 Hindsight 是例外。每个会话都会增加对您的项目的了解。到会话 20 时，OpenClaw 已经知道您的模块边界、命名约定、已知的脆弱区域以及重复出现的身份验证问题的根本原因。你不再解释；它开始知道了。

这篇文章介绍了OpenClaw实际从编码会话中提取的内容、如何在两分钟内设置它，以及持久代码库记忆具有最高影响力的三个工作流程。

<!-- truncate -->

---

## OpenClaw 记住您的代码库 {#what-openclaw-remembers-about-your-codebase}

OpenClaw 不存储成绩单。 Hindsight 提取和保留的是事实——从你的对话中提取的原子的、可检索的知识片段。

在典型的编码会话之后，诸如此类的事实会自动进入记忆：

- `"项目使用 ESM 而非 CommonJS，导入始终使用 .js 扩展名"`
- `"刷新令牌过期时认证中间件会静默失效，这是截至 3 月 14 日的已知问题"`
- `"2 月性能测试后，移除 SQLAlchemy，改为直接使用 asyncpg"`
- `"团队约定：所有异步处理器使用 handle_errors() 装饰器"`

这些都不需要你明确告诉OpenClaw记住它们。 Hindsight 的写入管道从您的会话的自然流程中提取它们 - 从您提出的问题、您描述的错误、您一路解释的决定。

无法记忆的内容：原始文件内容、逐行代码、详细的终端输出。提取步骤本身就是一个过滤器。对话填充物、重复的上下文设置、程序噪音——这些都没有幸存。剩下的是不断增长的代码库事实索引，OpenClaw 会将其带入未来的每个会话中。

生命周期在每一回合的两端运行：

**每回合前：** Hindsight 从历史记录中预取最相关的记忆并将其注入系统提示符中。 OpenClaw 在看到您的消息之前先看到该上下文。

**每次回复后：** 您的对话将异步保留。 Hindsight 在后台提取事实。您本回合讨论的内容从下回合开始即可搜索。

---

## 两分钟设置 {#two-minute-setup}

安装插件并运行设置向导：

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup
```

向导将引导您完成三种安装模式：

- **云** — 管理Hindsight。粘贴您的云API令牌，完成。
- **外部API** — 您自己的Hindsight 部署。提示输入 URL 和可选令牌。
- **嵌入式守护进程** — 在您的计算机上本地运行 Hindsight。提示输入 LLM 提供程序（OpenAI、Anthropic、Gemini、Groq、Ollama、Claude Code、Codex）及其 API 密钥。

确认记忆已激活：

```bash
openclaw gateway
#检查日志：
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
#应该看到：
#[Hindsight] ✓ 使用提供商：openai，型号：gpt-4o-mini
```

配置位于`~/.openclaw/openclaw.json`。默认值适用于大多数编码工作流程：

|钥匙|默认|说明|
|-----|---------|-------------|
|`autoRecall`|`true`|每回合前注入记忆|
|`autoRetain`|`true`|捕捉每个回合后的对话|
|`recallBudget`|`mid`|记忆召回彻底性：`low` / `mid` / `high`|
|`recallMaxTokens`|`1024`|每回合注入多少记忆上下文|

`autoRecall`和`autoRetain`都默认为`true`，这意味着记忆可以开箱即用，无需智能体侧更改。 OpenClaw 不需要知道记忆的存在——它只是有上下文。每次回合前都会将记忆注入系统提示中，每次响应后对话都会保留在后台。

对于部署：如果您跨机器工作或与团队共享记忆，请使用云。如果您希望一切都在本地且没有外部依赖项，则嵌入式守护进程会在后台运行本地 PostgreSQL 实例。首次启动大约需要一分钟；后续启动速度很快。启动日志落在`~/.hindsight/profiles/openclaw.log`。

> **从 0.5.x 迁移？** 0.6.0 插件删除了所有进程环境读取。以前来自 shell 环境变量（`OPENAI_API_KEY`、`HINDSIGHT_API_LLM_PROVIDER` 等）的配置现在必须通过带有 SecretRef 的 `openclaw config set` 来获取凭据。迁移后运行`openclaw config validate`。 [集成文档](/sdks/integrations/openclaw) 中的完整映射。

---

## 代码库记忆很重要的三个工作流程 {#three-workflows-where-codebase-memory-matters}

### 开始现有工作的新会议 {#starting-a-new-session-on-existing-work}

如果没有记忆，恢复现有项目的工作意味着在任何实际工作发生之前进行上下文设置：粘贴自述文件，解释技术堆栈，重新建立您上次所做的事情，提醒OpenClaw它应该已经知道的约定。在复杂的项目中，每次会话都会占用 10 到 15 分钟的时间。

有了记忆，OpenClaw开始每个会话时会将之前会话中积累的事实注入到其上下文中。它知道堆栈。它知道约定。它知道您上周正在调试什么。

会话的第一条消息成为实际的工作。

注入的内容由`recallBudget`设置控制。在 `mid`（默认值），Hindsight 获取 10-15 个最相关的记忆 — 足以涵盖项目的核心事实，而不会淹没上下文窗口。在`high`，检索运行得更深入：更多上下文，更多标记。对于大多数编码工作流程，`mid` 是正确的平衡。如果您要重新进行跨多个模块的复杂调查，`high` 值得额外花费。

### 调试重复出现的问题 {#debugging-recurring-issues}

代码库记忆的最高杠杆价值是跨会话的模式识别。有些错误不是一次性的——它们是更深层次的架构问题的症状，在几个月内以不同的形式出现。

没有记忆，您可以独立调试每个实例。您可能会分别追踪同一根本原因三次，而没有将各个点联系起来。

通过记忆，OpenClaw回忆起之前的情况。描述一种新的故障模式，并显示相关的上下文：两个月前确定的根本原因、直到下一次重构为止的解决方法、在这些故障中不断出现的组件。

在这里得到回报的事实类型：

- `"限流器对带 X-Internal: true 头的请求跳过认证，曾导致两次险些发生的权限提升"`
- `"Redis 连接重置时异步队列会静默丢任务，需要显式 ACK 处理，而非发出即返回"`
- `"每次新增模式后 GraphQL 解析器的 N+1 问题都会重现，需在代码审查中要求使用 DataLoader"`

这些不是您想在调试会话开始时粘贴的事实。它们是区分盲目调试和完整上下文调试的制度知识。

对于此工作流程，`recallBudget: high` 值得付出额外的成本。高预算检索不是默认的 10-15 个记忆，而是更深入——更多的上下文、更多的检索策略。当您追踪跨越多个子系统和先前会话的错误时，额外的记忆表面是值得的。

### 使用别人的代码 {#onboarding-to-someone-elses-code}

如果您加入一个项目，其中一位同事一直在使用共享记忆库与 OpenClaw 和 Hindsight 合作，则记忆库已经具有来自他们会话的上下文。

查询OpenClaw对特定模块的了解：

```
What do you know about the payments module?
```

```
What quirks or known issues have come up in the auth service?
```

```
What were the reasons we moved off SQLAlchemy?
```

​​OpenClaw 展示了之前会议中积累的事实：架构背景、已知的边缘情况、过去的决策及其背后的推理——无需任何人将其写在自述文件、维基页面或没人能找到的 Slack 线程中。

这不是文档。这是从未被写入文档的机构知识。

---

## 好的记忆代码库是什么样的 {#what-good-codebase-memory-looks-like}

在一个项目上进行 30 多次会话后，一个精心构建的记忆库通常涵盖：

**项目约定：** 模块结构和导入模式、错误处理要求、代码中不明显的命名约定、与默认值不同的 linting 规则。

**已知脆弱区域：** 在特定负载或输入条件下损坏的组件、导致生产事件的集成点、测试套件未涵盖的边缘情况。

**建筑历史：** 被替换的依赖项及其原因、考虑和拒绝的模式、通过测试而不是文档发现的性能特征。

**团队偏好：** 代码审查优先级、部署陷阱、与官方文档所说的工作方式不同的事情。

其中大部分是从正常会话中自动积累的。例外：主要的架构决策和团队偏好受益于明确的声明。当你做出重大决定时，请告诉OpenClaw理由：

```
We're switching to asyncpg from SQLAlchemy because connection pooling
under our load profile caused intermittent timeouts above ~200 concurrent
requests. The fix wasn't tuning, it was the ORM abstraction. Remember this.
```

背景提取可以捕获大部分重要内容，而无需您执行任何明确的操作。

**之前/之后：记忆在会话中的样子**

如果没有记忆，会话开头可能看起来像：

> “我正在开发一个使用 asyncpg 进行数据库访问的 Python 服务。由于负载下的连接池问题，我们在 2 月份删除了 SQLAlchemy。所有异步处理程序都应该包装在 `handle_errors()` 中。帮助我调试这个间歇性的 500...”

有了记忆，OpenClaw已经注入了这些事实。你打开：

> “帮我调试支付处理程序中这个间歇性的 500。”

堆栈、约定、架构环境——已经存在。

---

## 团队代码库：共享记忆库 {#team-codebases-shared-memory-banks}

默认情况下，OpenClaw为每个智能体+通道+用户创建单独的记忆库。对于在同一项目上共享编码智能体的团队，设置 `dynamicBankGranularity` 共享一个记忆库：

```json
{
  "dynamicBankGranularity": ["agent"]
}
```

当多个开发人员在具有共享记忆库的同一代码库上使用OpenClaw时，记忆会从他们的所有会话中复合。一个开发人员积累的知识——棘手模块的未记录行为、来之不易的调试见解、部署陷阱——将自动可供团队的其他成员使用。

一些注意事项：

- **什么是好的复合：** 代码库事实、架构决策、已知问题、约定。这些描述的是代码库，而不是人——可以安全地共享。
- **要分开的东西：** 个人工作流程偏好，不相关的个人上下文。为这些使用单独的记忆库。
- **记忆库命名：** 使用 `bankIdPrefix` 命名每个项目的记忆库。支付团队都使用的带有前缀`payments-service`的共享记忆库变成了机构记忆。三个人在没有协调的情况下使用的默认记忆库会变成噪音。

---

## 高级：播种结构化心智模型 {#advanced-seeding-a-structured-mental-model}

从会话中有机提取是Hindsight构建代码库知识的主要方式。但是您可以显式地预先加载上下文 - 当在现有代码库上启动时，或者在第一个会话运行之前关键约定应位于记忆库中时，这很有用。

Hindsight通过SDK和API在OpenClaw之外公开两个操作，提供相同的记忆库OpenClaw来自：

**摄取现有文档。** 上传架构说明、ADR 或约定文件。 Hindsight 对内容进行事实提取，并将结果存储在记忆库中。一旦摄入，这些事实就可以在下一次会话中提供给OpenClaw——无需等待有机提取来赶上。

**创建心智模型。** 定义根据源查询构建的精选摘要 - “这个项目的编码约定是什么？” Hindsight 运行一个 `reflect` 操作，从所有摄取和会话提取的知识中综合答案，并保存结果。将 `refresh_after_consolidation` 设置为 true，模型会在新事实到达时重新推导自身。 心智模型首先在反思调用期间进行检查，然后再进行个人观察和原始事实，因此会返回预先计算的答案，而无需动态重新推导它。

**​​回填现有历史。** 如果您已经有数月的 OpenClaw 会话，该插件会提供一个回填 CLI，将它们导入到 Hindsight 中：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-backfill \
  --openclaw-root ~/.openclaw \
  --dry-run
```

删除`--dry-run`来执行。使用 `--agent proj-run` 将导入限制为特定智能体，并使用 `--resume` 从上一个回填停止的地方继续。

摄取的项目文档、会话提取的事实和回填历史记录的结合从三个角度为OpenClaw提供了完整的图片：故意记录的内容、通过使用发现的内容以及安装插件之前发生的情况。

请参阅 [Hindsight心智模型文档](https://hindsight.vectorize.io/developer/api/mental-models) 以获取完整的 API 参考。

---

## 使用的时间越长，解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

OpenClaw 和 Hindsight 是跨会话累积上下文的少数编码工作流程之一。每个会话都会增加它对您的代码库的了解。其他工具重置。这个没有。

价值随着使用而复合。第一节，OpenClaw对你的项目一无所知。第五节，它了解堆栈和约定。第 30 节，它了解项目的历史、其脆弱区域以及塑造其当前形态的决策。那时你已经停止解释这些事情了——不是因为你跳过了上下文，而是因为你再也不需要提供它了。一旦心智模型足够丰富，你就不仅仅是在与编码助理交谈。您正在与一个像您一样了解代码库的智能体一起工作。

使用`openclaw plugins install @vectorize-io/hindsight-openclaw`进行设置，或从[Hindsight集成文档](/sdks/integrations/openclaw)开始。

---

**进一步阅读：**
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，AI智能体存储记忆背景背后的基本概念
- [构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory)，与Hermes应用于终端优先编码的模式相同
- [用Hindsight将记忆添加到OpenClaw](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)，原始整合公告
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，各大智能体记忆框架对比
