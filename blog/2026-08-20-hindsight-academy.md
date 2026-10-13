---
title: "介绍Hindsight学院：通过实践学习智能体记忆"
authors: [benfrank241]
slug: "2026/08/20/hindsight-academy"
date: 2026-08-20T12:00
tags: [hindsight, academy, agent-memory, learning, tutorial]
description: "Hindsight 学院是一门免费的实践课程，通过四门课程和大约一个小时的时间教授智能体记忆：从为什么智能体忘记到生产部署。"
image: /img/blog/hindsight-academy.png
hide_table_of_contents: true
---

![Hindsight 学院：从为什么智能体忘记到生产记忆驱动的智能体的免费实践路径](/img/blog/hindsight-academy.png)

智能体记忆很容易谈论，但真正连接起来却很繁琐。你可以阅读一百篇关于记忆存储、记忆召回和反思的文章，但仍然会在第一个真正的问题上停滞不前：我实际上运行什么，以什么顺序运行？所以我们构建了通过实践来回答这个问题的东西。今天我们推出**[Hindsight Academy](https://learn.hindsight.vectorize.io)**：一门免费的实践课程，带您从“为什么我的智能体忘记”到生产记忆驱动的智能体，一次一个可运行的步骤。

标语大声说出方法：**用手给你的智能体记忆。**

<!-- truncate -->

## 概览 {#tldr}

- **Hindsight学院** 是免费且可实践的。连接免费的Hindsight Cloud帐户，并在学习时针对真实记忆运行实时代码。
- **四门课程，20节课，约1.3小时**，从概念到生产的订单。
- 课程是互动式的，简短，有动画讲解和真实的`retain` / `recall` / `reflect` 通话，而不是幻灯片。
- 您可以跟踪整个学院的进度并获得每门课程的证书。
- 现在[learn.hindsight.vectorize.io](https://learn.hindsight.vectorize.io)开始。

## 路径：四门课程，按顺序 {#the-path-four-courses-in-order}

学院是一条道路，而不是一堆文档。它从概念到您的第一个工作循环，再到生产智能体，每门课程都假设之前的课程。

![Hindsight 学院路径：从智能体记忆到生产的四门课程](/img/blog/academy-path.webp)

1. **智能体记忆，解释**（初学者，3 节课，约 6 分钟）。从这里开始。为什么你的智能体会忘记，智能体记忆实际上意味着什么，以及一旦它记住你可以构建什么。
2. **给予你的智能体记忆**（初学者，4 节课，约 16 分钟）。您的第一次成功只需几分钟。交互式快速入门：运行 Hindsight，存储记忆，在新会话中记忆并回忆它，然后用“反思”得到一个有根据的答案。
3. **构建记忆驱动的智能体**（中级，8 节课，约 32 分钟）。核心任务，然后是你的堆栈。存储和记忆正确的事物，将每个用户分开，引导记住的内容，保持记忆新鲜，然后将Hindsight连接到MCP、LangGraph和CrewAI。
4. **投入生产**（高级，5 节课，约 21 分钟）。真正运行它。选择云或自托管，使用Docker或Kubernetes进行部署，选择模型，监控和扩展，以及在记忆库之间移动数据。

这就是运输智能体记忆的整个过程，从第一次`retain`调用到多租户部署，大约需要一个小时。

## 您运行的课程，而不是您观看的课程 {#lessons-you-run-not-lessons-you-watch}

每节课都很短，并且旨在*完成*。这些概念配有动画解释器，显示记忆中实际发生的情况，而实践课程则让您针对真实的Hindsight实例进行实时代码。你存储一个真实的记忆，打开一个新的会话，然后观察记忆召回将其拉回来。

![A Hindsight 学院课程，“为什么你的智能体会忘记”，用动画解释智能体知道什么](/img/blog/academy-lesson.webp)

上面的动画来自第一课：一个智能体被告知要保持简短的答案并瞄准周五，然后你会看到哪些事实能够延续到下一个回合。这是学院其他部门解决的问题的一个小而诚实的演示。

## 跟踪您的进度，获得证书 {#track-your-progress-earn-certificates}

因为它是一条路，所以学院会保留你的位置。仪表板显示您已完成的内容、剩余的内容以及在哪里可以继续学习，您完成的每门课程都会获得证书。

![Hindsight 学院进度仪表板显示已完成的课程和获得的证书](/img/blog/academy-progress.webp)

这是一件小事，但它把“我应该找个时间学习智能体记忆”变成了一个你可以在午休时间完成的清单。

## 这是给谁的 {#who-its-for}

如果您从未进行过智能体记忆，请从第一门课程开始，在咖啡冷之前您将有一个有效的记忆存储-记忆召回-回忆循环。如果您已经在生产环境中运行智能体，请跳至 **投入生产** 了解自托管、监控和迁移材料。无论哪种方式，它都是免费的，并且您运行的所有内容都是真实的，而不是重置的沙箱。

智能体记忆不应该是由分散的文档拼凑而成的东西。花一个小时从头到尾地做一遍。**[开始学习 Hindsight Academy](https://learn.hindsight.vectorize.io)**免费Hindsight Cloud账号，让你的智能体亲手记忆。

---

**了解更多：**
- [Hindsight学院](https://learn.hindsight.vectorize.io) — 免费的实践课程
- [记忆召回 vs. 回忆](https://hindsight.vectorize.io/blog/2026/07/24/recall-vs-reflect) — 获取事实和通过记忆进行推理之间的区别
- [Hindsight GitHub](https://github.com/vectorize-io/hindsight) — 底层的开源记忆引擎
