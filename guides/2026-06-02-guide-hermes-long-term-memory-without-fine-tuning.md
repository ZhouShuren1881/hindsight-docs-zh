---
title: "指南：无需微调，为 Hermes 提供长期记忆"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, memory, fine-tuning]
description: "使用 Hindsight 为 Hermes 提供事实、偏好和项目上下文的长期记忆，无需重新训练或微调模型。"
image: /img/guides/guide-hermes-long-term-memory-without-fine-tuning.svg
hide_table_of_contents: true
---

![指南：无需微调，为 Hermes 提供长期记忆](/img/guides/guide-hermes-long-term-memory-without-fine-tuning.svg)

很多人会选择微调，但他们真正需要的其实是**记忆**。

如果你的目标是让 Hermes 在不同会话之间记住用户偏好、项目历史、客户背景或之前做出的决定，那么微调通常不是合适的工具。微调会改变模型的行为；记忆则让模型能够访问不断变化的事实。

更直接的做法是使用 Hindsight。保留基础模型，增加一个持久记忆层，并在相关时让 Hermes 召回所需的上下文。

<!-- truncate -->

> **快速解答**
>
> - 需要改变模型的一般行为时，使用**微调**。
> - 需要让 Hermes 记住随时间变化的事实时，使用**记忆**。
> - 对大多数助手和智能体工作流来说，Hindsight 能更快解决实际问题，运维成本也更低。

## 微调为何通常不合适 {#why-fine-tuning-is-usually-the-wrong-fit}

微调是解决记忆问题的一种粗放手段。

如果你微调 Hermes 的底层模型，让它记住你的工作流程，就会遇到一些显而易见的问题：

- 偏好会变化。
- 项目状态会变化。
- 客户信息会变化。
- 仅仅因为重新训练过一次，模型并不会因此获得针对特定会话的召回能力。

信息越是动态，微调能提供的帮助就越少。

## 记忆更擅长解决的问题 {#what-memory-solves-better}

当上下文具有以下特点时，记忆更合适：

- 与个人相关；
- 针对特定项目；
- 针对特定客户；
- 随时间不断积累；
- 因用户、团队或记忆库而异。

这正是 Hindsight 擅长存入并召回的上下文。

Hermes 无需重新训练，就能记住用户偏好简洁的写作风格、某个项目已弃用一种数据库客户端，或某个客户账户的主要阻碍是安全审查。它只需要在下次相关交互时能够访问这些信息。

## 实用模式 {#the-practical-pattern}

让 Hermes 充当智能体层，让 Hindsight 充当长期记忆层。

典型配置如下：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**，然后选择与工作流相匹配的记忆库策略。

例如：

- 每位用户使用一个记忆库；
- 每个项目使用一个记忆库；
- 每位客户使用一个记忆库。

这样，Hermes 就能获得稳定且范围明确的长期记忆，同时无需改动模型权重。

## 何时记忆胜过微调 {#when-memory-beats-fine-tuning}

### 用户偏好 {#user-preferences}

写作风格、格式偏好、反复表达的不喜欢之处、日程习惯——这些都是会变化的事实，而不是模型的一般能力。

### 项目上下文 {#project-context}

代码库约定、已做出的决定、已知缺陷和迁移历史都具有动态性，因此更适合交由记忆处理。

### 业务工作流 {#business-workflows}

客户账户、利益相关方、异议、内部政策和交接背景也都是如此：它们都是动态事实。

在这三种情况下，微调同时显得过度投入，又无法充分解决问题。

## 微调仍然适用的场景 {#when-fine-tuning-still-makes-sense}

如果你想改变模型的广泛行为，微调仍然可能有用：

- 特定细分领域的输出风格；
- 专门的分类行为；
- 大规模应用的领域专用响应模式。

即便如此，微调后的模型通常仍能从记忆中受益。两者并不互斥。

关键是不要把它们混为一谈。

## 这对实际运维的意义 {#why-this-matters-operationally}

记忆通常更容易推出、更新和限定范围。

如果要改变 Hermes 记住的内容，只需调整记忆库策略或记忆层，无需重新训练模型。

如果不同团队需要记住不同内容，就使用不同的记忆库，无需为每个上下文边界分别创建微调模型。

因此，在生产环境中，记忆往往是更实用的解决方案。

## 常见错误 {#common-mistakes}

- 试图用静态微调解决不断变化的事实；
- 把互不相关的工作都放进一个庞大的记忆库；
- 期待记忆改变模型的一般推理行为；
- 期待微调提供最新的会话召回能力。

## 常见问题 {#faq}

### 记忆能完全取代微调吗？ {#can-memory-replace-fine-tuning-completely}

不一定。它们解决的是不同的问题。

### Hermes 用户默认应该怎么做？ {#what-is-the-right-default-for-hermes-users}

优先使用记忆。只有在你明确遇到记忆无法解决的行为问题时，才进行微调。

### 记忆能跨会话和设备使用吗？ {#does-memory-work-across-sessions-and-devices}

可以，只要将其连接到共享的 Hindsight 部署即可。

## 后续步骤 {#next-steps}

- 阅读[智能体记忆真正意味着什么](/guides/2026/04/23/guide-what-agent-memory-really-means)。
- 查阅 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)。
- 如果你希望以最短路径获得长期记忆，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
