---
title: "推理不再是困难的部分。连续性是。"
description: "writenode 如何使用Hindsight（每个用户的记忆库加上模式分类器）来推动一个人跨会话的思考，而不是从空白页开始。"
authors: [Xp3rtMag1c1an, benfrank241]
slug: "2026/08/10/writenode-continuity-hindsight"
date: 2026-08-10T12:00
tags: [hindsight, agent-memory, community, per-user-memory, note-taking]
image: /img/blog/writenode-continuity.webp
hide_table_of_contents: true
---

![writenode 通过每个用户Hindsight记忆库和模式分类器来承载用户的思维](/img/blog/writenode-continuity.webp)

*是[writenode](https://writenode.app)的创建者的客座帖子，[writenode](https://writenode.app)是一个基于Hindsight构建的AI笔记Chrome扩展。*

大型语言模型已经非常擅长在对话中进行推理。他们的连续性仍然令人惊讶地糟糕。关闭选项卡，下周再回来，大多数工具都会重新开始：没有线索，没有积累的上下文，没有任何感觉这是关于同一想法的第五次对话而不是第一次。

<!-- truncate -->

我在构建 writenode 时直接遇到了这个问题，writenode 是一个用于记笔记和 AI 辅助思考的 Chrome 扩展。修复的不是更大的模型或更聪明的提示。它正在治疗[记忆作为自己的架构层](https://vectorize.io/what-is-agent-memory)，这就是我走向Hindsight的原因。

## 为什么真正的目标是连续性，而不是检索 {#why-continuity-not-retrieval-is-the-actual-goal}

很容易将其视为检索问题：存储所有内容，然后在需要时获取相关块。但这种框架忽略了当有人长期使用 AI 工具时实际发生的情况。

人们不会在孤立的提示中思考。周二的笔记通常是上周开始的想法的后半部分。知识工作持续数天或数周，而不是单次会议，而且很少是线性的：你回过头来，修改之前的结论，并期望该工具保持修订的形状，而不仅仅是文字。

所以目标不是更好的检索。它正在保持势头。一个只检索相似文本的系统很乐意为您提供您自己想法的陈旧版本。为连续性而构建的系统会理解您对某些内容的理解发生了变化，并且[将当前版本向前推进](/blog/2026/02/09/resolving-memory-conflicts)，而不是您曾经编写的每个版本的平均值。

这种区别是将带有搜索索引的聊天包装器与实际上感觉像是认识您的东西区分开来。

## writenode 如何推进这一点 {#how-writenode-carries-that-forward}

具体来说，它的形状是这样的：

```
Capture
   │
   ▼
Mode Classifier
   │
   ▼
Hindsight Memory Bank
   │
   ▼
Relevant Recall
   │
   ▼
LLM
   │
   ▼
Context-Aware Response
```

每个 writenode 用户都会获得一个 [孤立Hindsight记忆库](/blog/2026/08/04/per-user-multi-tenant-agent-memory)，因此连续性的范围仅限于该人自己的历史记录而不是共享池。在任何内容到达记忆层之前，轻量级分类器会将传入输入分类为不同的模式 - 快速捕获、更深入的合成、结构化规划 - 因此 Hindsight 的记忆召回会引入模式实际需要的上下文，而不是用户曾经编写过的所有内容的平面转储。

结果描述起来很平常，但使用起来确实不同：一周后打开一个旧线程，该工具会在思考中将其重新拾起，而不是将其视为空白页。

## 产品中的样子 {#what-it-looks-like-in-the-product}

该建筑出现在一些具体的地方。

**节点重力** 将相关记忆拉到您所在的任何页面上，范围仅限于您实际保存的节点，因此相关思维会出现在您身上，而不是您去搜索它。

![节点重力表面相关保存的记忆与网页一起](/img/blog/writenode-node-gravity-related.webp)

在该面板内，**寻找相关记忆**将您面前的内容连接到您的历史记录的其余部分 - 相关节点，以及您已经访问过的页面。

![writenode 显示与当前页面和先前访问相关的记忆](/img/blog/writenode-related-to-page.webp)

因为它依赖于每个用户的Hindsight记忆库，所以连续性会跟随你通过网络而不是生活在一个应用程序中。打开 YouTube 之类的不相关内容，它就会识别出您长期以来积累的兴趣。

![writenode 在浏览 YouTube 时识别出持续的兴趣](/img/blog/writenode-cross-site-youtube.webp)

和 **源节点** — 聊天智能体，由 Gemini 和 Hindsight 提供支持 — 让您可以与您捕获的所有内容进行对话。它提取相关的记忆，然后将它们关联起来，而不是交还一个简单的列表。

![源节点通过用户保存的记忆进行聊天](/img/blog/writenode-source-node-chat.webp)

相同的记忆层支持我现在正在完成的网络应用程序，接下来是与 SOURCE NODE 的语音聊天 - 想象一位医生通过他们自己积累的笔记进行交谈。连续性跟随您跨越多个表面，而不是生活在单个选项卡中。

## 更大的想法 {#the-bigger-idea}

AI 正在迅速变得具有推理能力。下一个前沿不是推理，而是连续性。真正让人感觉个性化的应用程序不会是那些拥有最大模型的应用程序。它们将能够继承上下文，而无需要求用户在每个会话中重建它。

如果你好奇实际情况是什么样的，你可以在[writenode.app](https://writenode.app)尝试writenode。

---

**进一步阅读：**
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory) — 记忆层的想法
- [一个记忆库还是多个？构建智能体记忆](/blog/2026/07/16/bank-strategy-agent-memory) — 每个用户隔离的工作原理
- [AI 产品的每用户记忆](/blog/2026/08/04/per-user-multi-tenant-agent-memory) — 其背后的多租户模式
