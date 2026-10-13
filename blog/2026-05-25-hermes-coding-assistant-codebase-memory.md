---
title: "构建一个记住您的代码库的Hermes编码助手"
authors: [benfrank241]
date: 2026-05-25
tags: [hermes, coding, memory, agents, tutorial, hindsight]
description: "Hermes 智能体与 Hindsight 可以跨会话、约定、过去的错误、架构决策记住您的代码库。 2 分钟内完成设置。"
image: /img/blog/hermes-coding-assistant-codebase-memory.webp
hide_table_of_contents: true
---

![构建一个记住您的代码库的Hermes编码助手](/img/blog/hermes-coding-assistant-codebase-memory.webp)

:::info 自这篇文章以来设置已更改
Hindsight 不再与 Hermes 捆绑在一起。 Nous Research 将所有记忆提供者从
Hermes 核心树，因此新安装现在运行之前的 `hermes plugins install hindsight`
`hermes memory setup`。现有设置会自行迁移。参见
[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

每个AI编码会话都从零开始。

你打开一个新的聊天，粘贴上下文、你的堆栈、你的约定、你上周做出的架构决策、你在三月份花了两天时间处理的错误。然后你在下一次训练中再做一次。还有那之后的那一位。问题不在于AI编码工具不擅长编码。他们不记得你的代码库。

Hermes 具有 Hindsight 的智能体是例外。每个会话都会增加对您的项目的了解。到会话 20 时，Hermes 已经知道您的模块边界、命名约定、已知的脆弱区域以及重复出现的身份验证问题的根本原因。你不再解释；它开始知道了。

这篇文章介绍了Hermes实际从编码会话中提取的内容、如何在两分钟内设置它，以及持久代码库记忆具有最高影响力的三个工作流程。

<!-- truncate -->

---

## Hermes 记住您的代码库 {#what-hermes-remembers-about-your-codebase}

Hermes 不存储成绩单。 Hindsight 提取和保留的是从您的对话中提取的事实、原子、可检索的知识片段。

在典型的编码会话之后，诸如此类的事实会自动进入记忆：

- `"项目使用 ESM 而非 CommonJS，导入始终使用 .js 扩展名"`
- `"刷新令牌过期时认证中间件会静默失效，这是截至 3 月 14 日的已知问题"`
- `"2 月性能测试后，移除 SQLAlchemy，改为直接使用 asyncpg"`
- `"团队约定：所有异步处理器使用 handle_errors() 装饰器"`

这些都不需要你明确告诉Hermes记住它们。 Hindsight 的写入管道从您会话的自然流程、您提出的问题、您描述的错误、您一路解释的决策中提取它们。

无法记忆的内容：原始文件内容、逐行代码、详细的终端输出。提取步骤本身就是一个过滤器。对话填充物、重复的上下文设置、程序噪音，这些都没有幸存。剩下的是不断增长的代码库事实索引，Hermes 会将其带入未来的每个会话中。

生命周期在每一回合的两端运行：

**每回合前：** Hindsight 从历史记录中预取最相关的记忆并将其注入系统提示符中。 Hermes 在看到您的消息之前先看到该上下文。

**每次回复后：** 您的对话将异步保留。 Hindsight 在后台提取事实。您本回合讨论的内容从下回合开始即可搜索。

---

## 两分钟设置 {#two-minute-setup}

Hermes v0.14.0 (v2026.5.16) 附带原生 Hindsight 集成。安装程序是一个向导命令：

```bash
hermes memory setup # select "hindsight"
```

确认记忆已激活：

```bash
hermes memory status
```

Config 位于`$HERMES_HOME/hindsight/config.json`。默认值适用于大多数工作流程：

|钥匙|默认|说明|
|-----|---------|-------------|
|`mode`|`cloud`|`cloud` 或 `local`|
|`bank_id`|`hermes`|记忆 记忆库标识符，每个项目更改|
|`budget`|`mid`|记忆召回彻底性：`low` / `mid` / `high`|
|`memory_mode`|`hybrid`|自动记忆+显式工具|
|`prefetch_method`|`recall`|`recall`（快速）或`reflect`（LLM合成）|

`memory_mode`控制记忆在Hermes中的表现方式：

- **`hybrid`**（默认）：每回合前自动注入记忆，加上模型可用的`hindsight_recall`、`hindsight_retain`和`hindsight_reflect`工具
- **`context`**：仅自动记忆，没有明确的内容，没有什么可思考的
- **`tools`**：模型必须显式调用`hindsight_recall`；没有自动注入任何东西

对于编码工作，`hybrid` 是正确的默认值。您可以在每个回合中获得自动记忆，并且能够要求 Hermes 明确地显示它对特定组件的了解。

对于部署：如果您跨机器工作或与团队共享记忆，请使用云。如果您希望一切都在本地且没有外部依赖项，则本地模式会在后台运行嵌入式 PostgreSQL 守护进程。首次启动大约需要一分钟，数据库正在初始化；后续启动速度很快。启动日志落在`~/.hermes/logs/hindsight-embed.log`。

> **从旧版`hindsight-hermes`插件迁移？** 先卸载它（`uv pip uninstall hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python`），然后运行安装向导。本机提供程序取代了插件所做的一切。完整详情请参阅[Hindsight现在是Hermes智能体的原生记忆提供者](/blog/2026/04/06/hermes-native-memory-provider)。

---

## 代码库记忆很重要的三个工作流程 {#three-workflows-where-codebase-memory-matters}

### 开始现有工作的新会议 {#starting-a-new-session-on-existing-work}

如果没有记忆，恢复现有项目的工作意味着在任何实际工作发生之前进行上下文设置：粘贴自述文件，解释技术堆栈，重新建立您上次所做的事情，提醒Hermes它应该已经知道的约定。在复杂的项目中，每次会话都会占用 10 到 15 分钟的时间。

有了记忆，Hermes开始每个会话时会将之前会话中积累的事实注入到其上下文中。它知道堆栈。它知道约定。它知道您上周正在调试什么。

会话的第一条消息成为实际的工作。

​​注入的内容由`budget`设置控制。在 `mid`（默认值），Hindsight 获取 10-15 个最相关的记忆，足以涵盖项目的核心事实，而不会淹没上下文窗口。在`high`，检索运行得更深入：更多上下文，更多标记。对于大多数编码工作流程，`mid` 是正确的平衡。如果您要重新进行跨多个模块的复杂调查，`high` 值得额外花费。

### 调试重复出现的问题 {#debugging-recurring-issues}

代码库记忆的最高杠杆价值是跨会话的模式识别。有些错误不是一次性的，它们是更深层次的架构问题的症状，在几个月内以不同的形式出现。

没有记忆，您可以独立调试每个实例。您可能会分别追踪同一根本原因三次，而没有将各个点联系起来。

通过记忆，Hermes回忆起之前的情况。描述一种新的故障模式，并显示相关的上下文：两个月前确定的根本原因、直到下一次重构为止的解决方法、在这些故障中不断出现的组件。

在这里得到回报的事实类型：

- `"限流器对带 X-Internal: true 头的请求跳过认证，曾导致两次险些发生的权限提升"`
- `"Redis 连接重置时异步队列会静默丢任务，需要显式 ACK 处理，而非发出即返回"`
- `"每次新增模式后 GraphQL 解析器的 N+1 问题都会重现，需在代码审查中要求使用 DataLoader"`

这些不是您想在调试会话开始时粘贴的事实。它们是区分盲目调试和完整上下文调试的制度知识。

`prefetch_method: reflect` 值得为此工作流程启用。 `reflect` 没有通过语义搜索检索单个事实，而是要求 LLM 在注入之前综合所有相关记忆的连贯摘要。它速度较慢，但​​对于“帮助我理解此类错误”查询，综合上下文比单个事实列表更有用。

### 使用别人的代码 {#onboarding-to-someone-elses-code}

如果您加入一个项目，其中一位同事一直在使用共享记忆库与 Hermes 和 Hindsight 合作，则记忆库已经具有来自他们会话的上下文。

查询Hermes对特定模块的了解：

```
What do you know about the payments module?
```

```
What quirks or known issues have come up in the auth service?
```

```
What were the reasons we moved off SQLAlchemy?
```

Hermes 展示了之前会议中积累的事实：架构背景、已知的边缘情况、过去的决策及其背后的推理，而无需任何人将其写在自述文件、维基页面或没人能找到的 Slack 线程中。

这不是文档。这是从未被写入文档的机构知识。

---

## 好的记忆代码库是什么样的 {#what-good-codebase-memory-looks-like}

在一个项目上进行 30 多次会话后，一个精心构建的记忆库通常涵盖：

**项目约定：** 模块结构和导入模式、错误处理要求、代码中不明显的命名约定、与默认值不同的 linting 规则。

**已知脆弱区域：** 在特定负载或输入条件下损坏的组件、导致生产事件的集成点、测试套件未涵盖的边缘情况。

**建筑历史：** 被替换的依赖项及其原因、考虑和拒绝的模式、通过测试而不是文档发现的性能特征。

**团队偏好：** 代码审查优先级、部署陷阱、与官方文档所说的工作方式不同的事情。

其中大部分是从正常会话中自动积累的。例外：主要的架构决策和团队偏好受益于明确的声明。当你做出重大决定时，请告诉Hermes理由：

```
We're switching to asyncpg from SQLAlchemy because connection pooling
under our load profile caused intermittent timeouts above ~200 concurrent
requests. The fix wasn't tuning, it was the ORM abstraction. Remember this.
```

在`hybrid`模式下，模型还可以调用`hindsight_retain`来显式标记要保留的内容。但背景提取无需该步骤即可捕获大部分重要内容。

**之前/之后：记忆在会话中的样子**

如果没有记忆，会话开头可能看起来像：

> “我正在开发一个使用 asyncpg 进行数据库访问的 Python 服务。由于负载下的连接池问题，我们在 2 月份删除了 SQLAlchemy。所有异步处理程序都应该包装在 `handle_errors()` 中。帮助我调试这个间歇性的 500...”

有了记忆，Hermes已经注入了这些事实。你打开：

> “帮我调试支付处理程序中这个间歇性的 500。”

堆栈、约定、架构上下文已经存在。

---

## 团队代码库：共享记忆库 {#team-codebases-shared-memory-banks}

默认情况下，`bank_id` 为`hermes`。同一个项目的每个开发者都可以通过设置相同的`bank_id`来共享一个记忆库：

```json
{
 "bank_id": "payments-service",
 "mode": "cloud"
}
```

当多个开发人员在具有共享记忆库的同一代码库上使用Hermes时，记忆会从他们的所有会话中复合。一个开发人员积累的知识、棘手模块的未记录行为、来之不易的调试见解、部署陷阱，都可以自动提供给团队的其他成员。

一些注意事项：

- **什么是好的复合：** 代码库事实、架构决策、已知问题、约定。这些描述的是代码库，而不是人，可以安全地共享。
- **要分开的东西：** 个人工作流程偏好，不相关的个人上下文。为这些使用单独的记忆库。
- **记忆库命名：** 每个项目一个记忆库，而不是每个开发人员一个记忆库。一个名为`hermes`的共享记忆库，三个人在不协调的情况下使用，却变成了噪音；支付团队所有使用的名为`payments-service`的共享记忆库变成了机构记忆。

---

## 高级：播种结构化心智模型 {#advanced-seeding-a-structured-mental-model}

从会话中有机提取是Hindsight构建代码库知识的主要方式。但是，您可以显式地预先加载上下文，这在从现有代码库开始时或在第一个会话运行之前关键约定应位于记忆库中时非常有用。

Hindsight通过SDK和API在Hermes之外公开两个操作，提供相同的记忆库Hermes来自：

**摄取现有文档。** 上传架构说明、ADR 或约定文件。 Hindsight 对内容进行事实提取，并将结果存储在记忆库中。一旦摄入，这些事实就可以在下一个会话中提供给Hermes，无需等待有机提取来赶上。

**创建心智模型。** 定义根据源查询构建的精选摘要，“该项目的编码约定是什么？” Hindsight 运行一个 `reflect` 操作，从所有摄取和会话提取的知识中综合答案，并保存结果。将 `refresh_after_consolidation` 设置为 true，模型会在新事实到达时重新推导自身。 心智模型首先在反思调用期间进行检查，然后再进行个人观察和原始事实，因此会返回预先计算的答案，而无需动态重新推导它。

摄取的项目文档和会话提取的事实的结合从两个角度为Hermes提供了完整的图片：故意记录的内容和通过使用发现的内容。

​​这也是使自主编码智能体变得易于处理的原因。一个拥有丰富的、当前的心智模型、惯例、架构、已知脆弱区域的智能体，拥有足够的结构化背景来做出决策和推动变革，而无需人类在每项任务开始时向其通报情况。持久会话记忆是您达到该基线的方法。

请参阅 [Hindsight心智模型文档](https://hindsight.vectorize.io/developer/api/mental-models) 以获取完整的 API 参考。

---

## 使用的时间越长，解释的就越少 {#the-longer-you-use-it-the-less-you-explain}

Hermes 和 Hindsight 是跨会话累积上下文的唯一编码工作流程。每个会话都会增加它对您的代码库的了解。其他工具重置。这个没有。

价值随着使用而复合。第一节，Hermes对你的项目一无所知。第五节，它了解堆栈和约定。第 30 节，它了解项目的历史、其脆弱区域以及塑造其当前形态的决策。那时你已经停止解释这些事情，不是因为你跳过了上下文，而是因为你再也不需要提供它了。一旦心智模型足够丰富，你就不仅仅是在与编码助理交谈。您正在与一个像您一样了解代码库的智能体一起工作。

使用`hermes memory setup`进行设置，或从[Hindsight集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始。

---

**进一步阅读：**
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，AI智能体存储记忆背景背后的基本概念
- [Hindsight 现在是 Hermes 智能体的原生记忆提供者](/blog/2026/04/06/hermes-native-memory-provider)、设置指南、记忆模式和配置参考
- [使用Hindsight将持久记忆添加到Codex](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，同样的模式应用于OpenAICodex
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，各大智能体记忆框架对比
