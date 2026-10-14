---
title: "AI 智能体的短期记忆与长期记忆"
authors: [benfrank241]
date: 2026-04-23T14:00:00Z
tags: [agents, memory, architecture, guide]
description: "了解 AI 智能体短期记忆与长期记忆的作用，以及实用系统为何需要让两者协同工作。"
image: /img/guides/guide-short-term-vs-long-term-memory-for-ai-agents.png
hide_table_of_contents: true
---

![AI 智能体的短期记忆与长期记忆](/img/guides/guide-short-term-vs-long-term-memory-for-ai-agents.png)

如果你想了解 **AI 智能体的短期记忆与长期记忆**，不妨先看工作流，而不是纠结于流行说法。短期上下文与长期记忆相辅相成，不能相互替代：前者让当前任务保持连贯，后者让有用的知识在任务结束后仍然留存。若把这两层混为一谈，系统就更难分析。清晰划分能让信息留存、检索和提示词设计都可靠得多。如果你想了解这些思路背后的实现细节，阅读时可以一并参考[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Retain（存入）API](/developer/api/retain)和 [Hindsight 的 Recall（召回）API](/developer/api/recall)。

<!-- truncate -->

## 简要回答 {#the-quick-answer}

- 短期记忆是当前任务的活动工作集。
- 长期记忆为后续工作保留事实、偏好和先前的决策。
- 优秀的智能体系统会有意识地在这两层之间传递信息。


## 为什么这在实践中很重要 {#why-this-matters-in-practice}

许多团队还没找到描述问题的词，就已经感受到问题的存在：智能体在一次会话中表现得很能干，到了下一次却意外地脆弱。这通常说明系统依赖的是提示词状态，而不是持久记忆。因此，当你从演示转向生产工作流时，区分临时上下文与持久记忆就格外重要。

实用的记忆设计能让智能体重用先前的工作，而不必在每次提示中塞入全部历史。这也是开发者在需要存储持久信号时会使用 [Hindsight 的 Retain API](/developer/api/retain)，并在需要系统稍后找回合适上下文时使用 [Hindsight 的 Recall API](/developer/api/recall) 的原因。同样的模式也体现在一些动手示例中，例如 [Claude Code 集成](/sdks/integrations/claude-code)、[OpenClaw 集成](/sdks/integrations/openclaw)以及[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)。

## 常见问题 {#what-usually-goes-wrong}

- 所有内容都留在提示词里，直到被挤出上下文窗口。
- 没有在合适的时机将任何内容转为持久记忆。
- 系统无法区分活动上下文和已存储上下文，因此检索出过多内容。


这些问题单独看似乎都不大，却会逐步累积。少量遗忘会导致反复补充背景；反复补充背景又会造成返工；返工最终会削弱信任，因为用户不再相信智能体能延续重要的上下文。

## 更好的记忆层会如何处理 {#what-a-better-memory-layer-does-instead}

更好的设计会有所取舍，不会试图永久保留每个 token，而是关注那些能改善未来工作的信号，并确保在需要时能够找回。

优秀的系统通常会：

- 维持精简且相关的工作上下文；
- 将持久信号存入长期存储；
- 仅在有助于当前任务时检索长期记忆；
- 让这两层都便于观察和调试。


因此，架构比名称更重要。产品即使宣称具有记忆功能，实际表现也可能只是一个附带搜索功能的长提示词。实用的系统必须能妥善存入记忆、有效检索，并把结果顺畅地放回活动上下文。

## 这些工作流中的实际影响 {#example-workflows-where-this-matters}

在以下工作流中，这种影响最为明显：

- 跨多个拉取请求持续工作的编程智能体；
- 重访长期研究主题的研究助手；
- 在新会话中延续账户历史的支持系统。


如果你想看不同工具间共享记忆的具体示例，可以接着阅读 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。如果你想看更偏代码实践的示例，[Claude Code 持久记忆](/guides/2026/05/04/guide-claude-code-memory-with-hindsight)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)展示了记忆如何改变日常开发工作流，而不只是停留在理论层面。

## 如何评估自己的技术栈 {#how-to-evaluate-this-in-your-own-stack}

可以采用一个简单的评估框架：

1. 找出智能体今天学到、明天应该记住的一件事。
2. 判断这条信息应归入个人、项目还是共享记忆。
3. 验证系统能否有意识地存入这条信息。
4. 测试这条信息之后能否在合适的工作流中被找回。
5. 检查检索到的上下文是否足够简洁，能够提供帮助而不会造成干扰。

这也是[文档首页](/)和[快速入门指南](/developer/api/quickstart)值得参考的原因。存储与召回机制清晰可查时，记忆系统就更容易赢得信任。

## 常见问题解答 {#faq}

### 聊天历史属于短期记忆还是长期记忆？ {#is-chat-history-short-term-or-long-term-memory}

通常属于短期上下文，除非系统有选择地将其中一部分持久存储。

### 长期记忆能取代提示词上下文吗？ {#can-long-term-memory-replace-prompt-context}

不能。模型仍需要一组当前任务所需的活动工作信息。

### 哪些内容应该转入长期记忆？ {#what-should-move-into-long-term-memory}

偏好、持久事实、结果和决策都是合适的候选内容。

## 后续步骤 {#next-steps}

- 如果你希望最快接入托管记忆后端，可以从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[文档首页](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 的 Retain API](/developer/api/retain)。
- 查阅 [Hindsight 的 Recall API](/developer/api/recall)。
- 了解 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
