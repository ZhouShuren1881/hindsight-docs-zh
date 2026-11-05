---
title: "你的 OpenBot 智能体会在不同线程之间遗忘：为它们提供共享记忆"
authors: [benfrank241]
date: 2026-10-29
tags: [openbot, memory, integrations, mcp, tutorial]
description: "通过 MCP 将 OpenBot 智能体连接到 Hindsight 记忆库，让记忆在线程结束和上下文压缩后依然存在，并与每位队友共享。"
image: /img/blog/openbot-persistent-memory.webp
hide_table_of_contents: true
---

import {StaticImage} from '@site/src/components/StaticMedia';

<StaticImage src="/img/blog/openbot-persistent-memory.webp" alt="OpenBot 智能体会在不同线程之间遗忘，而共享记忆不会" />

[OpenBot](https://openbot.run) 在你自己的机器上运行一支 AI 队友团队：Claude、Codex、Grok、Gemini、OpenCode、Cursor 和 Cline 各有自己的工作区和任务队列，还能相互发送消息。这些智能体是持久存在的，会在会话之间等待任务。

OpenBot 的记忆却没有以相同方式持久保存。它存在于线程中，属于单个智能体。通过本集成，智能体的记忆可以在线程和智能体之外继续存在。

<!-- truncate -->

## TL;DR {#tldr}

- 添加一个 URL 类型的 MCP 服务器，即可通过 MCP 将 OpenBot 智能体连接到 Hindsight **记忆库**
- 将智能体指向记忆库后，它就能使用 `recall`、`retain`、`sync_retain` 和 `reflect`，以及心智模型和文档工具
- 记忆在线程结束、上下文压缩和重启后依然存在
- 指向**同一记忆库的每个智能体都能读取相同的记忆**，所以 Codex 学到的内容，Claude 也能知道
- 设置只需一个 URL 和一个请求头
- 支持 [Hindsight Cloud](https://ui.hindsight.vectorize.io/signup) 或自托管服务器

---

## 问题：OpenBot 的记忆随线程产生和消失 {#the-problem-openbot-memory-lives-and-dies-with-the-thread}

OpenBot 智能体在重启后仍然存在，但它所在线程中的内容无法一直保留。

每个线程在上下文逐渐填满时都会进行压缩。为了腾出空间，早期对话轮次会被总结替代，而你通常正是在这些轮次中解释架构、部署规则和那三个总会出问题的地方。开始新线程时，你就得从头再来。

另一个问题更严重，因为它看起来不像问题。智能体可以互相发送消息，但一个智能体学到的内容只留在它自己那里。你告诉 Codex 测试约定，Claude 却从未听说。最终你不得不分别向每位队友交代，而使用智能体团队本来就是为了免去这种额外工作。

OpenBot 确实自带记忆功能，即 `remember` 和 `search_memories` 工具，而且它们能正常工作。但每个智能体只有几 KB 的记忆空间，且记忆为该智能体私有。OpenBot 的问题跟踪器中有一份[报告（#2463）](https://github.com/nightly-labs/openbot/issues/2463)：17 个智能体共有 177 条记忆，其中 15 条相互矛盾，31 条内容待更新。这就是单智能体记忆在团队规模下的情况。

---

## 我们构建的方案：通过 MCP 共享记忆 {#what-we-built-shared-memory-over-mcp}

[Hindsight](https://github.com/vectorize-io/hindsight) 是一个面向智能体的开源长期记忆引擎。它从对话中提取事实，通过语义检索找到事实，还可以基于整个存储进行推理，而不只是取回最相近的几个文本分块。记忆按**记忆库**组织。

本集成通过 MCP 将 OpenBot 智能体连接到 Hindsight。智能体连接到记忆库后，就能使用：

- **`recall`**：对该记忆库见过的所有线程中的记忆进行语义检索
- **`retain`** 和 **`sync_retain`**：从任意线程写回事实
- **`reflect`**：基于整个记忆库综合生成答案，而不是只依靠少量检索到的片段

记忆库是一个共享的目标位置，而不是单个智能体的专属存储。连接到同一记忆库的两个智能体读写相同的记忆。正是这一特性改变了智能体团队的行为方式。

这里要区分两件事。MCP 连接提供一种**能力**：只需在 Local 服务器设置中添加一次，其工具就能供所有智能体使用。可选的 **[Hindsight Memory skill](https://hindsight.vectorize.io/skills/openbot/hindsight-memory/SKILL.md)** 则培养一种**习惯**：行动前召回，存入有长期价值的内容。该 skill 需为每个智能体单独启用，没有面向所有智能体的开关；不过 Claude 智能体会自动从 `~/.agents/skills/<slug>/` 加载它。

---

## 两分钟完成设置 {#set-it-up-in-two-minutes}

在 OpenBot 中，打开 **Local** 服务器的设置 → **MCP** → **Connect to a custom MCP**，选择 **Streamable HTTP**，然后输入服务器 URL 和 `Authorization` 请求头：

```
URL:    https://api.hindsight.vectorize.io/mcp/<bank>/
Header: Authorization: Bearer hsk_your_key
```

连接添加在服务器级别，因此其工具可供所有智能体使用；请为需要使用记忆 skill 的智能体启用该 skill。

上面的 URL 默认连接到 [Hindsight Cloud](https://ui.hindsight.vectorize.io/signup)。自托管的形式相同，只需更换主机：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

然后使用 `http://localhost:8888/mcp/<bank>/` 作为 URL。没有身份认证的本地服务器不需要密钥，留空该字段即可。

---

## 操作演示 {#the-walkthrough}

选择一个智能体，告诉它一条关于你项目的真实信息：

> 我们只在周五部署，并且要等预发布环境的冒烟测试通过后才能部署。请记住这一点。

它会调用 `retain`。现在关闭该线程，用**另一个智能体**启动一个**新线程**，然后提问：

> 我们什么时候可以部署？

它会调用 `recall`，根据自己从未参与过的对话回答你的规则，包括冒烟测试条件。不需要上下文文件，不需要重新交代，也不需要粘贴任何内容。

这就是整个演示，值得亲自运行一次。看到第二个智能体根据第一个智能体的对话作答，与读到这个过程的感受不同。

---

## 内部发生了什么 {#what-happens-under-the-hood}

整个生命周期很简短，了解它就能解释你看到的大多数行为：

1. **智能体连接。** OpenBot 与 URL 中的记忆库建立 MCP 连接，Hindsight 的工具会与内置工具一起出现在该智能体的工具列表中。
2. **智能体召回。** `recall` 查询会搜索整个记忆库，而不是当前线程；匹配结果会作为工具输出返回到当前上下文窗口。
3. **智能体存入。** `retain` 是异步的：它会立即返回，同时在后台执行提取和整合。`sync_retain` 会阻塞，直到记忆存储完成并可立即召回；需要写入后立即读取时就应使用它。
4. **线程压缩。** 事实存在记忆库中而非线程中，因此压缩会丢失对话轮次，但不会丢失知识。
5. **第二个智能体连接。** 使用相同 URL、相同记忆库，它的第一次 `recall` 就会返回第一个智能体写入的内容。

关键区别在于哪些内容位于上下文中，哪些位于记忆库中。上下文只是暂时使用的空间，压缩会收回它；记忆库则会一直保留，直到你将其删除。

---

## 用记忆库划定记忆范围 {#scoping-memory-with-banks}

URL 中的 `<bank>` 部分决定范围，这是这里最主要的设计决策。让两个智能体指向同一个记忆库，它们就会共享全部内容；让它们指向不同记忆库，则不会共享任何内容。

- **每个项目一个记忆库**是合理的默认选择。处理同一代码仓库的每位队友都能看到相同的约定、决策和注意事项。
- **每个团队一个记忆库**适用于跨越单个项目长期存在的上下文，例如审查标准或发布流程。
- 如果需要隔离，可以选择**每个智能体一个记忆库**，但这会放弃共享层，而共享正是运行这套方案的原因。

由于记忆库是 URL 的一部分，每个连接都只限定在一个记忆库内，智能体无需传递 `bank_id`。更改范围需要修改服务器条目，无需寻找藏在智能体内部的设置。

---

## 常见问题和边界情况 {#pitfalls-and-edge-cases}

**冷启动。** 新记忆库是空的，第一个线程没有内容可供召回。从第二个线程开始，记忆会逐渐积累，因此请在第三天而不是第一分钟评估效果。

**写入后读取。** 由于 `retain` 是异步的，在同一轮次中存入事实后立即查询，它可能还无法被搜索到。智能体需要读回刚写入的内容时，请使用 `sync_retain`。

**召回会消耗上下文。** 召回的记忆以工具输出形式返回，会消耗同一个窗口的 token，而该窗口本就面临压缩压力。召回越多并不一定越好。

**共享记忆库也会共享错误。** 如果一个智能体存入错误内容，连接到该记忆库的每个智能体都会读到。这是共享带来的代价，因此记忆库和其他共享资源一样需要悉心维护。

---

## 坦诚地说：你现在有两套记忆 {#the-honest-part-you-now-have-two-memories}

连接 Hindsight 后，智能体同时拥有 Hindsight 和 OpenBot 内置的**两套**记忆工具，而两个存储之间并不共享。智能体仍可能将内容写入内置记忆，使其他智能体永远看不到。

Hindsight Memory skill 正是为此而设计。它会引导智能体始终使用 Hindsight 的工具，而不是任由其碰运气选择；实际使用中，启用该 skill 的智能体会逐渐固定使用一个存储。

真正的修复需要在上游完成。目前有一个尚未关闭的功能请求（[#3682](https://github.com/nightly-labs/openbot/issues/3682)），希望支持可插拔的记忆提供方，让外部记忆能够真正接管，而不是与内置记忆并存。这样就只有一个权威来源，而不是两个。这仍是一项请求，尚未作为功能发布；在它实现之前，skill 是切实可行的方案。

---

## 后续步骤 {#next-steps}

- **[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io/signup)** 并生成密钥，大约需要一分钟
- 在 OpenBot 的 Local 服务器设置中添加 Hindsight MCP URL（**MCP → Connect to a custom MCP**）
- 为需要使用的智能体启用 Hindsight Memory skill
- 阅读 [OpenBot 集成参考文档](/sdks/integrations/openbot)，了解完整工具列表和自托管细节
- 将两个不同的智能体指向同一记忆库，运行上述演示
