---
title: "指南：Strands智能体中的单独智能体与共享记忆库"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, strands, multi-agent, memory]
description: "当多个智能体记忆库（隔离）和共享记忆库（机构记忆）之间做出决定Strands智能体协作，使用Hindsight本地人@tool 记忆存储、记忆召回和反思。"
image: /img/guides/guide-strands-per-agent-vs-shared-memory.svg
hide_table_of_contents: true
---

![指南：Strands 智能体按角色记忆库与共享记忆库](/img/guides/guide-strands-per-agent-vs-shared-memory.svg)

当你用Strands智能体SDK，最大的记忆决定是**按智能体记忆与共享记忆**记忆库：每个智能体都保留一个私有记忆库，还是多个智能体写入一个共享记忆库？Hindsight将每个记忆操作的范围限定为`bank_id`，所以这个选择就是你传递给的值 `create_hindsight_tools(bank_id=...)` 对于每个智能体 - 但它决定你的智能体是保持孤立还是一起构建机构记忆。

单个Strands智能体很简单：一个用户，一个记忆库。当计划者交给研究人员，研究人员交给作家时，有趣的问题就出现了，你必须决定他们每个人都可以记住其他人的哪些信息。每个智能体记忆库为您提供清洁隔离，无交叉污染。共享的记忆库为整个团队提供了一个记忆，因此一个智能体学到的事实在下一次运行中可供所有人使用。

本指南是 **记忆库策略** 指南，而不是另一个安装演练 — [配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-strands-memory-with-hindsight) 已经涵盖了工具接线。在这里，我们重点关注何时隔离、何时共享以及如何运行混合存储，其中智能体读取共享存储库但写入自己的存储库。

<!-- truncate -->

> **快速解答**
>
> 1.给每个Strands智能体Hindsight带有 的工具 `create_hindsight_tools(bank_id=...)`。
> 2.使用**按智能体记忆库** 当智能体不能污染彼此的环境时。
> 3.使用**共享记忆库** 当船员应该建立一种机构记忆时。
> 4.对于混合动力车，请点 `memory_instructions()`位于共享记忆库（读取），并为记忆存储工具提供私有记忆库（写入）。
> 5.通过用一个智能体存储事实并检查谁可以记忆它来验证隔离。

## 记忆库战略决策 {#the-bank-strategy-decision}

每个Hindsight工具每次调用只在一个记忆库上运行，并且记忆库隔离严格——不存在跨记忆库泄漏。在Strands术语，`bank_id` 你传给`create_hindsight_tools()`（以及`memory_instructions()`）是整个策略。共享一个 的两个智能体 `bank_id` 分享记忆；两个不同的智能体 `bank_id` 值彼此不可见。

因此，这个决定简化为你对每对协作智能体提出的一个问题：**一个智能体学到的内容应该对另一个可见吗？**

- 如果是，他们共享一个记忆库。
- 如果没有，他们每个人都有一个记忆库。
- 如果“有时”——读取共享，写入私有——您可以使用下面的混合。

因为工具是传递给的普通函数 `Agent(tools=[...])`，你可以在一个系统内自由组合策略。一名规划人员可以拥有一个私人记忆库，而三名工人则共享一个公共记忆库。没有关于SDK强制进行单一全局选择。

## 当每个智能体都应该拥有自己的记忆库时 {#when-each-agent-should-own-its-bank}

赋予每个智能体自己的`bank_id`当智能体扮演真正不同的角色时，混合他们的记忆会弊大于利。

每个智能体记忆库的好案例：

- **不同角色或倾向。** 持怀疑态度的审稿人智能体和乐观的头脑风暴者智能体不应该将他们所学到的背景模糊在一起。
- **不同智能体服务不同用户。** 如果每个智能体面向不同的最终用户，则每个用户的记忆库将为您提供平台所保证的硬分离。
- **产生大量噪声或一次性使用的 Worker。** 产生大量低价值观察的临时智能体不应该污染细心的智能体所依赖的记忆库。
- **安全或租户边界。** 当一个智能体绝不能看到另一个智能体的数据时，单独的记忆库就是边界。

接线是每个智能体一个记忆库：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

planner = Agent(tools=create_hindsight_tools(bank_id="planner"))
researcher = Agent(tools=create_hindsight_tools(bank_id="researcher"))
writer = Agent(tools=create_hindsight_tools(bank_id="writer"))
```

每个智能体都有自己的`hindsight_retain`, `hindsight_recall`，和`hindsight_reflect` 工具，全部适用于其记忆库。研究人员保留的内容作者永远不会回忆起。

## 智能体何时应该共享记忆库 {#when-agents-should-share-a-bank}

多个智能体确实属于同一团队、共同实现一个结果并应积累共享组织记忆时，使用相同 `bank_id`。

共享记忆库的好案例：

- **围绕同一主题的流水线。** 当研究人员发现的事实被作者回忆起来时，计划者、研究人员和作家都在从事同一份报告的工作。
- **项目或会话记忆。** 团队了解到的有关一个项目的所有内容都属于一个地方，以项目而不是智能体为关键。
- **必须携带上下文的交接。** 当智能体 A 交给智能体 B 时，共享记忆库意味着 B 从 A 已经建立的内容开始，而无需您手动将其序列化。

每个智能体的接线都是相同的记忆库：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools

BANK = "project-atlas"

planner = Agent(tools=create_hindsight_tools(bank_id=BANK))
researcher = Agent(tools=create_hindsight_tools(bank_id=BANK))
writer = Agent(tools=create_hindsight_tools(bank_id=BANK))
```

现在任何智能体的 `hindsight_retain`写入`project-atlas`，和`hindsight_recall`从任何智能体读取整个团队的记忆。 `hindsight_reflect` 合成船员存储的所有内容，这正是您想要的，当多个智能体各自贡献图片的片段时。

## 连接Strands至Hindsight {#connect-strands-to-hindsight}

本指南假设工具已经连接好。如果您还没有安装并连接`hindsight-strands` 然而，请按照[Strands 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-strands-memory-with-hindsight) — 它涵盖 `pip install hindsight-strands`，将工具指向Hindsight Cloud或具有 的本地服务器 `configure()`，以及原生`@tool`赋予每个智能体的模式 `hindsight_retain`, `hindsight_recall`，和`hindsight_reflect`。然后回到这里选择记忆库。

## 混合：共享读，私有写 {#a-hybrid-shared-read-private-write}

您通常希望两者兼得：每个智能体都应该 **读取** 团队共享记忆但是**写入** 仅限其自己的记忆库，因此私人工作笔记不会泄漏到共享记录中，直到您升级它们。

Hindsight使这变得很自然，因为阅读和写作是独立的工具，有自己的记忆库范围。通过注入共享记忆库 `memory_instructions()`（读），并给记忆存储工具一个私有记忆库（写）：

```python
from strands import Agent
from hindsight_strands import create_hindsight_tools, memory_instructions

SHARED = "project-atlas"          #阅读：团队机构记忆
PRIVATE = "researcher"            #写：这个智能体自己的笔记

#记忆召回共享记忆库进入系统提示（阅读面）
shared_context = memory_instructions(bank_id=SHARED)

# 存储/召回工具限定到私有记忆库（写入侧）
tools = create_hindsight_tools(bank_id=PRIVATE)

researcher = Agent(
    tools=tools,
    system_prompt=f"你是一位研究智能体。\n\n{shared_context}",
)
```

智能体每次运行时都会通过注入团队的共享上下文 `memory_instructions()`，但它决定通过 存储的任何内容 `hindsight_retain`登陆其私人记忆库。为了促进共享记忆的发现，记忆存储明确地`SHARED` — 例如，使用范围仅限于共享记忆库的单独工具集，或者通过向一个“发布者”智能体授予对共享记忆库的写入权限，而其余的则保持只读状态。

您还可以使用记忆召回标签缩小每个智能体共享记忆库返回的内容，因此多个智能体共享一个记忆库，但每个智能体都拉出自己的切片；见`recall_tags` 中[Strands 集成文档](/sdks/integrations/strands)。

## 验证记忆库策略 {#verify-the-bank-strategy}

确认隔离和共享按照您的预期方式运行：

1. 使用智能体A，存储一个独特的事实（例如“API截止日期是3月3日”）。
2. 用智能体B询问这个事实。
3. 如果A和B**共享**一个记忆库，B应该记忆它。如果他们是**隔离**，B 不应该。
4. 对于混合，确认来自 A 的私有写入是*不是*对 B 可见，直到您将其提升到共享记忆库，但共享上下文*是*注入两者。

如果结果符合您的预期策略，则记忆库连接正确。如果没有，请检查每个智能体的 `bank_id`（记忆库传递给`memory_instructions()`）正是您所期望的。

## 常见错误 {#common-mistakes}

### 需要隔离时共享记忆库 {#sharing-a-bank-when-you-needed-isolation}

如果两个智能体不小心共享一个`bank_id`，一个智能体的嘈杂或特定角色的记忆会渗透到另一个智能体中。当智能体具有不同的角色或服务于不同的用户时，给他们单独的记忆库。

### 隔离需要协作的智能体 {#isolating-agents-that-needed-to-collaborate}

相反的失败：每个智能体都拥有一个私有记忆库的管道，因此切换会失去上下文，并且作者无法记忆研究人员发现的内容。如果团队致力于一个结果，则共享记忆库。

### 混合中读写记忆库不匹配 {#mismatched-read-and-write-banks-in-the-hybrid}

在shared-read/private-write设置，`memory_instructions()`和记忆存储工具故意指向不同的记忆库。如果您不小心将它们指向同一个记忆库，您就会失去私有写入边界。保留两个`bank_id` 价值观独特且深思熟虑。

### 建筑物`bank_id` 来自不稳定的事物 {#building-bankid-from-something-unstable}

如果记忆库值在运行之间发生变化（随机 ID、时间戳），智能体将无法记忆自己较早的记忆。推导`bank_id` 来自稳定的东西——智能体角色、项目或用户。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也可以工作 — 将工具指向 `http://localhost:8888` 而不是云 URL。无论哪种方式，记忆库策略都是相同的。

### 智能体可以共享一些记忆但不是全部吗？ {#can-agents-share-some-memory-but-not-all}

是的——这就是混合模式。通过 阅读共享记忆库 `memory_instructions()`，同时通过记忆存储工具写入私人记忆库。您还可以共享一个记忆库并使用`recall_tags` 所以每个智能体都会拉出自己的一部分。

### 在共享记忆库中是否可以发挥作用？ {#does-reflect-work-across-a-shared-bank}

是的。 `hindsight_reflect` 综合了它所涉及的记忆库中所有内容的答案，因此指向一个共享记忆库，它对整个工作人员的贡献进行推理。

### 多少记忆库才算太多？ {#how-many-banks-is-too-many}

没有硬性限制——记忆库便宜且隔离严格。让协作结构决定：每个隔离边界一个记忆库，每个团队或项目共享记忆库。

## 后续步骤 {#next-steps}

- 从开始 [Strands 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-strands-memory-with-hindsight) 如果您还没有连接工具
- 尝试[Hindsight Cloud](https://hindsight.vectorize.io) 用于托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Strands 集成文档](/sdks/integrations/strands)
