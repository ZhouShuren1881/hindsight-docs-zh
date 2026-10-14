---
title: "指南：将 Hermes 从无状态聊天转变为有状态智能体"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, agents, memory]
description: "为 Hermes 添加持久记忆，让上下文、偏好和项目历史能够跨会话延续，而不是每次都从零开始。"
image: /img/guides/guide-turn-hermes-from-stateless-chat-into-a-stateful-agent.svg
hide_table_of_contents: true
---

![指南：将 Hermes 从无状态聊天转变为有状态智能体](/img/guides/guide-turn-hermes-from-stateless-chat-into-a-stateful-agent.svg)

开箱即用的聊天智能体通常是**无状态**的。它可以在当前上下文窗口内很好地推理，但会话结束后，双方的协作关系就会重置。这对于一次性提示来说没问题，却难以胜任真实的助手工作流。

如果你希望 Hermes 更像一个**有状态智能体**，缺少的环节就是持久记忆。Hindsight 为 Hermes 提供长期记忆层，让相关事实能够跨越会话边界保存下来，并在之后需要时重新取回。

这就是从聊得不错到持续发挥作用的智能体之间的转变。

<!-- truncate -->

> **快速解答**
>
> 1. 将 Hermes 连接到 Hindsight。
> 2. 选择稳定的记忆库策略。
> 3. 让记忆在跨会话使用时保存重要内容。
> 4. 开启新会话，确认记忆仍能召回。
> 5. 从一次性聊天扩展为可复用的工作流。

## 无状态聊天适合做什么 {#what-stateless-chat-is-good-at}

无状态聊天擅长局部推理。只要为 Hermes 提供足够的当前会话上下文，它就能出色地完成任务。

问题在于连续性。

下次打开 Hermes 时，它不会自动知道：

- 你的偏好；
- 正在进行的项目；
- 你上周做出的决定；
- 当前工作流中哪些人或账户很重要。

因此，许多智能体当下显得很聪明，时间一长却容易忘事。

## 有状态行为是什么样的 {#what-stateful-behavior-looks-like}

有状态智能体不只是回答当前消息，还会延续双方的协作关系和正在进行的工作。

这意味着 Hermes 可以：

- 无需你再次告知，就召回你的偏好；
- 无需完整背景介绍，就继续处理项目；
- 在不同对话之间延续客户或账户的上下文；
- 在多次会话中逐步积累运维知识。

记忆让这一切成为可能。

## 步骤 1：添加记忆层 {#step-1-add-a-memory-layer}

最快的配置方式是：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**。连接后，Hermes 就能跨会话存入并召回上下文，而不必把每次聊天都当作全新开始。

## 步骤 2：选择记忆库策略 {#step-2-pick-a-bank-strategy}

只有记忆范围设置合理，有状态行为才能发挥作用。

合适的默认策略：

- 每个用户助手使用一个记忆库；
- 每个项目使用一个记忆库；
- 每个客户或工作流使用一个记忆库。

不合适的默认策略：

- 用一个庞大的记忆库存放彼此无关的工作。

范围越清晰，召回效果越好。

## 步骤 3：让实际工作产生记忆 {#step-3-let-real-work-create-the-memory}

你不必手动编写每一条记忆。

你自然地使用 Hermes 时，系统可以存入对话背后值得长期保留的事实：偏好、决定、项目细节、反复出现的问题，以及关系上下文。

这样，日常使用就能逐步积累价值。

## 步骤 4：通过新会话验证有状态行为 {#step-4-verify-statefulness-with-a-fresh-session}

可以做一个简单测试：

1. 告诉 Hermes 一条之后可能有用的事实。
2. 结束会话。
3. 开启一个新会话。
4. 不再重复提供背景，直接询问刚才那条事实。

如果 Hermes 能正确回答，这个工作流就从无状态转为有状态了。

## 这对哪些场景最重要 {#where-this-matters-most}

### 个人助手工作流 {#personal-assistant-workflows}

你不应该每次都重新输入自己的偏好和正在推进的计划。

### 面向客户的工作流 {#customer-facing-workflows}

账户、相关人员和先前的对话内容应当能够延续下去。

### 编码工作流 {#coding-workflows}

下次会话应当能继续使用代码库背景和之前的调试成果。

## 为什么这优于扩大上下文窗口 {#why-this-is-better-than-bigger-context-windows}

更大的上下文窗口有助于当前这次运行，但它本身无法提供持久的跨会话记忆。

有状态行为不只是增加 token 数量，而是在当前任务需要时取回过去恰当的上下文。

因此，即便模型拥有很大的上下文窗口，持久记忆仍然重要。

## 常见错误 {#common-mistakes}

- 把聊天历史和长期记忆混为一谈；
- 用一个过大的记忆库存放彼此无关的工作流；
- 不在新会话中测试召回，却期待系统具备有状态行为；
- 试图只靠在每次聊天中粘贴更多上下文来解决连续性问题。

## 常见问题 {#faq}

### 有状态的 Hermes 只是聊天历史吗？ {#is-stateful-hermes-just-chat-history}

不是。重点在于跨会话可用的记忆，而不只是延长同一份对话记录。

### 我需要更换模型吗？ {#do-i-need-to-change-the-model}

不需要。这是对记忆层的调整，不是更换模型。

### 有状态记忆可以共享吗？ {#can-stateful-memory-be-shared}

可以，只要工作流适合使用共享记忆库。

## 后续步骤 {#next-steps}

- 阅读[无状态智能体与记忆驱动的智能体](/guides/2026/04/23/guide-stateless-agents-vs-memory-powered-agents)
- 查看[Hermes 搭配 Hindsight 的记忆模式](/guides/2026/04/14/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools)
- 从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始
