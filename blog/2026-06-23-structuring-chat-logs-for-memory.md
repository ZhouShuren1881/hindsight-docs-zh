---
title: "为智能体记忆整理聊天记录"
authors: [dcbouius]
slug: "2026/06/23/structuring-chat-logs"
date: 2026-06-23T12:00
tags: [hindsight, memory, retain, conversations, chat, best-practices, tutorial]
description: "聊天记录的组织方式决定了智能体记忆的质量。将完整对话存入记忆、标明说话者、设置上下文，并以时间为锚点。"
image: /img/blog/structuring-chat-logs.webp
hide_table_of_contents: true
---

![使用 Hindsight 整理聊天记录，为智能体构建记忆](/img/blog/structuring-chat-logs.webp)

Hindsight 不会存储聊天记录原文。当你对一段对话调用 [`retain`](/developer/api/retain) 时，系统会将文本分块，把每个文本分块发送给 LLM 提取事实，然后存储这些*事实*，而不是原始对话记录。正因为如此，你发送内容的结构很重要：模型只能提取文本明确表达的信息。结构清晰的对话记录能生成清楚且归属准确的记忆；一大段没有说话者标记的文本则只会让模型猜测。

好消息是，你不必学习特定模式，也没有必需格式。纯文本、JSON、Markdown 都可以，只要能表达清楚**谁在什么时候说了什么**。这篇文章会介绍如何做到这一点，以及几个能显著提升摄取质量的关键选择。

## 要点速览 {#tldr}

<!-- truncate -->

- **将完整对话作为一项存入记忆，而不是每条消息各存一项。** 提取出的事实可以结合完整上下文进行交叉关联；稳定的 `document_id` 还能让重新摄取具备幂等性。
- **文档长度不是限制。** Hindsight 会把整个文档拆分并从中提取事实，因此长对话记录的末尾不会像那些把原始文本塞进上下文窗口的系统一样被丢弃或降低权重。应按*需要多快召回其中内容*来分段，而不是按长度。
- **每行都标明说话者。** 最简单可靠的格式是 `Name (timestamp): text`。Hindsight 会根据*谁在说话*，判断一句话是关于外部世界的事实，还是智能体自身的经历。
- **通过 `context` 告诉 Hindsight 说话者是谁。** 例如，设置上下文为 "Customer Maria is speaking"，就能让她说的 “I bought a Tesla” 被存为关于 Maria 的事实，而不会误认为是智能体做的事。
- **以时间为锚点。** 传入真实的 `timestamp`，模型就能解析 “last Monday” 这样的相对时间，后续也能进行时间召回。
- **去掉噪声。** 删除系统提示，以及 Hindsight 注入回对话中的记忆。它们是指令和回声，不是值得记住的事实。

## 唯一规则：谁在什么时候说了什么 {#the-one-rule-who-said-what-and-when}

其他一切都由此而来。事实提取依赖 LLM 阅读你提供的文本，因此对话记录必须让读者清楚看出说话者和时间。文档中推荐的格式刻意保持简单：

```
Alice (2024-03-15T09:00:00Z): Did you end up going to the doctor last week?
Bob (2024-03-15T09:01:00Z): Yes, finally. Turns out I have a mild peanut allergy.
Alice (2024-03-15T09:02:00Z): Oh no — are you okay?
Bob (2024-03-15T09:03:00Z): Yeah, nothing serious. Just carrying an antihistamine now.
```

每轮一行，格式为 `Name (timestamp): text`，仅此而已。如果你已经使用 JSON，模型也能很好地解析它。但带说话者标记的纯文本最省事，调试提取结果时也最容易检查。

## 存入完整对话，而不是逐条存入消息 {#retain-the-whole-conversation-not-each-message}

一种常见做法是在每条消息之后都调用 `retain`。别这么做。应将**完整对话作为一项发送**。

原因有两个。首先，结合上下文提取事实效果更好：“没什么严重的”单独看毫无意义，紧接在“我有轻微的花生过敏”之后就有了明确含义。把对话拆成逐条消息分别存入，会剥掉模型恰好需要的上下文。其次，对话会随着时间持续增长，而 Hindsight 正是为此设计的：

- 为每段对话分配稳定的 **`document_id`**。使用同一 ID 再次存入时会执行**插入或更新（upsert）**：旧版本及其记忆会被删除，更新后的内容会从头重新处理。记忆始终反映最新状态，不会产生重复项。
- 对于逐条增长的对话记录，请使用 **`update_mode: "append"`**。无需重新发送全部历史，只要发送新增轮次即可；Hindsight 会把它们拼接到现有文档，并跳过未更改文本分块的重新提取。

因此，做法是：每段对话使用一个 `document_id`；拿到完整对话时重新调用 `retain`（替换原内容），消息持续到来时则使用 `append`。

## 多长才算太长？按召回延迟分段，而不是按长度 {#how-long-is-too-long-segment-by-recall-latency-not-size}

一个常见的担忧，也是其他记忆系统中确实存在的问题，是**长对话记录的末尾可能被遗漏**。把数千条消息塞进上下文窗口，模型就可能在不知不觉中降低对末尾内容的重视程度。

Hindsight 的工作方式不同，这正是它能为你解决的问题。它不会保留原始对话记录，等到召回时再寄希望于正确片段仍在上下文中。系统会把整个文档拆成文本分块，从*每一个*文本分块中提取事实，再对事实进行分类、关联和去重，整合成记忆。对话中的任何部分都不会仅仅因为位置而享有优先级或被丢弃。**单看文档长度，不是需要优化的因素。**

所以，真正的问题不是“文档应该多大”，而是**你需要多快召回其中的内容？** 分段应以此为准：

- 如果智能体需要对*今天早些时候*说过的内容采取行动，就不要等到晚上才把一天（或一周）的日志攒成一个大文档后再存入；否则要到晚上处理后，才能召回今天早上的细节。应拆成更小、更新鲜的单元及时存入记忆。
- 如果内容属于参考资料，你要很久之后才会查询，那么更积极地批量处理也可以。

按**召回时效性**分段，而不要只为低于某个长度上限而拆分。真正耗费资源且有价值的工作，是把对话拆解为事实并将它们整合起来，这样召回时返回的是最佳答案，而不是一堆原始对话。Hindsight 正是为此而设计，文档无论多长都会进行这些处理。

### 实时对话流 {#streaming-a-live-conversation}

如果你正在接近实时地摄取对话，有两点实用建议：

- **把几条消息缓冲在一起，而不是每行都触发一次 `retain`。** 一批对话轮次能为提取器提供生成高质量事实所需的上下文；单独一条 `"lol"` 或 `"um"` 没什么值得记住的。小型滚动缓冲区（几轮对话或一个较短时间窗口）通常最合适。
- **Hindsight Cloud 对单个用户的摄取速率有限制，但幅度不大。** 使用缓冲自然能让你保持在限制之内。如果需要更高的持续吞吐量，可以把相关输入项批量放进一次 `retain` 调用。

## 标记说话者，并告诉 Hindsight 说话者是谁 {#label-the-speaker-and-tell-hindsight-who-that-is}

这是最能产生效果的环节，也是简单摄取方案容易出错的地方。

Hindsight 会根据*每条提取事实所体现的是谁的视角*来分类。如果记忆库中的智能体是行动者或观察者（“我修复了身份验证错误”），这条事实就是**经历事实**。如果事实涉及其他人或事物（“Maria 开着一辆 Tesla”），它就是**世界事实**。区分依据是**谁在说话**，而不是语法。只有说话者是智能体时，第一人称的“我买了一辆 Tesla”才属于*经历事实*。如果说话者是客户，这就是关于客户的*世界事实*。

对话记录中的说话者标记完成一半工作。**`context`** 参数完成另一半：它会直接注入事实提取提示词，从而主动引导事实归属：

```python
client.retain(
    bank_id="support-agent",
    content=(
        "Maria (2024-03-15T09:00:00Z): I switched to the Pro plan last month "
        "but I'm still being billed for Basic.\n"
        "Agent (2024-03-15T09:01:00Z): Thanks Maria — I'll fix the billing today."
    ),
    context="Customer Maria is speaking with the support agent",
    document_id="ticket-4471",
)
```

这个 `context` 能确保 Maria 的第一人称陈述成为关于 Maria 的 `world` 事实，而智能体所说的 “I'll fix the billing” 会被记录为智能体自身的经历。文档对此说得很清楚：始终提供上下文，是提升记忆质量最有效的方法之一。同一句话在 `"performance review"` 和 `"product roadmap"` 中含义不同；上下文可以消除歧义。

## 以时间为锚点 {#anchor-it-in-time}

对话中充满了相对时间，例如 “last Monday”、“the meeting yesterday” 和 “since the launch”。模型只能相对于某个时间锚点解析这些表达，因此应传入对话发生时的真实 **`timestamp`**（ISO 8601）。该时间戳会作为参照点注入事实提取提示词，从而让后续的时间召回真正发挥作用，例如回答 “what did the customer report last spring?”。

`timestamp` 接受三种形式：

| `timestamp` 的值 | 行为 |
| --- | --- |
| 省略 / `null` | 默认为摄取时的当前时间。 |
| ISO 8601（例如 `"2024-03-15T09:00:00Z"`） | 用作时间锚点；用于解析相对时间表达。 |
| `"unset"` | 不存储时间。适用于没有真实事件时间的永恒参考资料，例如文档、书籍或小说。 |

如果对话记录已经为每行附上时间戳（如上例），请保留这些时间戳，因为它们有助于模型排列对话中的事件顺序。顶层的 `timestamp` 则为整段对话提供时间锚点。

## 去掉噪声 {#drop-the-noise}

聊天会话中的内容并非都值得记住。官方集成通常会在存入前去掉两类内容，值得照做：

- **系统提示。** 这些是给模型的指令，不是关于用户或外部世界的事实。将它们存入记忆库会导致产生诸如 “the assistant should be concise” 这样的记忆。
- **Hindsight 注入的记忆。** 如果你召回记忆后把它们拼接进对话作为上下文，就不要再把相同文本存入记忆，否则每轮对话都会重复记忆库自己的回声，使这种影响不断叠加。

剩下的内容——用户与助手的实际对话轮次、工具调用和工具结果——才是有用信号。例如，LiteLLM 集成会把这些内容准确地整理成 `USER: ...`、`ASSISTANT: ...`、`TOOL_RESULT: ...` 等行，以空行连接，不包含其他内容。

## 其他内容用元数据和标签表达 {#use-metadata-and-tags-for-everything-else}

另外两个参数用于承载不适合写在正文里的结构化上下文：

- **`metadata`**：任意字符串键值对，例如 `{"source": "slack", "channel": "engineering", "thread_id": "T123"}`。这些信息既会输入事实提取提示词，也会存储在每条生成的记忆上，因此之后无需再次查询，就可以筛选记忆或将其关联回来源。
- **`tags`**：用于限定可见范围。只有记忆标签与 Recall 过滤条件相交时，该记忆才会在召回时返回。这让同一个记忆库能够安全地服务多个用户或会话。请使用一致的格式：`user:<id>`、`session:<id>`、`room:<id>`、`topic:<name>`。

## 链接和附件 {#links-and-attachments}

对话不只有文本，还可能包含 URL、文件和图像。需要明确几点：

- **链接以文本形式加入。** 将 URL 放入内容中，它就会作为对话的一部分被存入，因此周围的事实（例如 “Maria shared the new pricing page”）会被记住，召回时也会一并返回这个链接。Hindsight **不会**获取或解析链接页面。记忆记录的是上下文中的链接，而不是链接页面的内容。
- **附件不会被直接摄取。** 目前没有文件上传接口。常见做法是将文件存放在某处（例如 S3 存储桶），再把链接作为参考文本放在消息旁边，并附上你已有的说明或描述。这样即使附件的实际文件数据存放在其他位置，也能从记忆中找到附件。

如果你需要将文件和网页的*内容*转化为记忆，那属于文档检索范畴；它与对话记忆采用不同的处理流程。

## 综合示例 {#putting-it-together}

下面是一段针对客服对话、格式良好的 `retain` 调用：

```python
client.retain(
    bank_id="support-agent",
    content=(
        "Maria (2024-03-15T09:00:00Z): I switched to Pro last month but I'm "
        "still billed for Basic.\n"
        "Agent (2024-03-15T09:01:00Z): Sorry about that, Maria. I've corrected "
        "the billing and credited the difference.\n"
        "Maria (2024-03-15T09:03:00Z): Thank you! Also, can you make my account "
        "email maria@example.com going forward?"
    ),
    context="Customer Maria is speaking with the support agent",
    timestamp="2024-03-15T09:00:00Z",
    document_id="ticket-4471",
    metadata={"source": "zendesk", "ticket_id": "4471"},
    tags=["user:maria", "topic:billing"],
)
```

通过这一次调用，Hindsight 会提取关于 Maria 的世界事实（她曾使用 Basic，后来切换到 Pro，并希望更新邮箱），记录智能体的经历（更正了账单并退还差额），关联相关实体，并将这些记忆限定在 Maria 的范围内，以便她下次联系时进行召回。

## 回顾 {#recap}

| 决策 | 做法 | 原因 |
| --- | --- | --- |
| 粒度 | 每段**对话**一项，而不是每条消息一项 | 提取需要周边上下文 |
| 长度 | 不必按长度优化；按**召回延迟**分段 | 整个文档都会被拆解；末尾内容不会被遗漏 |
| 实时流 | 每次 `retain` 前缓冲几轮；留意单用户速率限制 | 上下文比单独的噪声消息更有用 |
| 重新摄取 | 使用稳定的 `document_id`；重写用 `replace`，流式追加用 `append` | 幂等且不会产生重复项 |
| 说话者 | 每行标明：`Name (timestamp): text` | 决定事实归为世界事实还是经历事实 |
| 归属 | 设置 `context` 来说明说话者身份 | 确保用户的“我……”被记录为关于用户的事实 |
| 时间 | 传入真实的 `timestamp` | 解析相对日期；支持时间召回 |
| 噪声 | 删除系统提示和注入的记忆 | 它们是指令和回声，不是事实 |
| 结构化上下文 | 用 `metadata` 记录来源，用 `tags` 限定范围 | 无需重新提取即可筛选并关联 |

你不需要预先总结、预先分块，也不需要手动提取事实。Hindsight 会完成这些工作，然后在后台整合其中的模式。你只需提供一份如实呈现说话者、发言时间和对话情境的记录。把这几点做到位，记忆质量自然会提升。

## 后续步骤 {#next-steps}

- **Retain API：**[摄取对话及完整参数列表](/developer/api/retain)
- **Retain 的工作方式：**[事实提取、实体消解，以及世界事实与经历事实的区别](/developer/retain)
- **Recall：**[检索记忆，包括按标签过滤](/developer/api/recall)
- **试用：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，或[使用一条 Docker 命令进行自托管](/developer/installation)
