---
title: "推出 Hindsight Academy：通过实践学习智能体记忆"
authors: [benfrank241]
slug: "2026/08/20/hindsight-academy"
date: 2026-08-20T12:00
tags: [hindsight, academy, agent-memory, learning, tutorial]
description: "Hindsight Academy 是一门免费的实践课程，通过动手操作教授智能体记忆：从智能体为何会遗忘到生产环境部署，分为四门课程，全程约一小时。"
image: /img/blog/hindsight-academy.png
hide_table_of_contents: true
---

![Hindsight Academy：一条免费的实践路径，带你从智能体为何会遗忘走向由记忆驱动的生产级智能体](/img/blog/hindsight-academy.png)

谈论智能体记忆很容易，真正把它接入系统却颇费工夫。你可以读上百篇关于 Retain（存入）、Recall（召回）和 Reflect（反思）的文章，却仍会卡在第一个实际问题上：我究竟该运行什么，又该按什么顺序运行？于是，我们打造了一门让你亲手操作、从实践中找到答案的课程。今天，我们推出 **[Hindsight Academy](https://learn.hindsight.vectorize.io)**：这是一门免费的实践课程，通过一步步可运行的操作，带你从“为什么我的智能体会忘记？”走到由记忆驱动的生产级智能体。

课程标语直接道出了方法：**亲手为智能体赋予记忆。**

<!-- truncate -->

## 概览 {#tldr}

- **Hindsight Academy** 免费且注重实践。连接免费的 Hindsight Cloud 账号，在学习过程中针对真实记忆运行实时代码。
- **四门课程、20 节课，约 1.3 小时**，按从概念到生产环境的顺序编排。
- 课程简短且可互动，包含动画讲解和真实的 `retain` / `recall` / `reflect` 调用，而不是幻灯片。
- 你可以跟踪整个 Academy 的学习进度，并在完成每门课程后获得证书。
- 现在就从 [learn.hindsight.vectorize.io](https://learn.hindsight.vectorize.io) 开始。

## 学习路径：四门课程，依次进阶 {#the-path-four-courses-in-order}

Academy 提供的是一条循序渐进的学习路径，而不是一堆文档。课程从概念讲起，接着带你构建第一个可运行的流程，最后走向生产环境；每门课程都以你已完成前一门课程为前提。

![Hindsight Academy 的学习路径：从《智能体记忆解析》到《投入生产环境》的四门课程](/img/blog/academy-path.webp)

1. **智能体记忆解析**（初级，3 节课，约 6 分钟）。从这里开始：了解智能体为何会遗忘、智能体记忆究竟是什么，以及记住信息后可以构建什么。
2. **为智能体赋予记忆**（初级，4 节课，约 16 分钟）。几分钟内就能首次成功运行。通过交互式快速入门启动 Hindsight、存入一条记忆、在新会话中召回它，再用 Reflect 得到有记忆依据的回答。
3. **构建记忆驱动的智能体**（中级，8 节课，约 32 分钟）。先学习核心任务，再结合你的技术栈实践：存入并召回恰当的信息、隔离不同用户的记忆、引导哪些内容会被记住、让记忆保持最新，然后将 Hindsight 接入 MCP、LangGraph 和 CrewAI。
4. **投入生产环境**（高级，5 节课，约 21 分钟）。学习如何真正部署和运行：选择 Cloud 或自托管，使用 Docker 或 Kubernetes 部署，挑选模型，监控并扩展服务，以及在记忆库之间迁移数据。

这就是从第一次 `retain` 调用到多租户部署的完整智能体记忆实践路径，全程约一小时。

## 亲自上手的课程，而不是观看的课程 {#lessons-you-run-not-lessons-you-watch}

每节课都很短，而且旨在让你*动手完成*。课程概念配有动画讲解，展示记忆内部实际发生的过程；实践课则让你针对真实的 Hindsight 实例编写并运行代码。你会存入一条真实记忆，开启一个全新会话，再看 Recall 如何将它检索出来。

![Hindsight Academy 的一节课“智能体为何会遗忘”，通过动画讲解展示智能体曾经知道什么](/img/blog/academy-lesson.webp)

上方动画来自第一节课：智能体收到“回答要简短”和“目标定在周五”两条要求，你可以看到哪些事实会留存到下一轮。这是一个小而真实的演示，说明了 Academy 后续课程要解决的问题。

## 跟踪进度，获取证书 {#track-your-progress-earn-certificates}

由于 Academy 是一条学习路径，它会记录你的学习进度。仪表板会显示已完成的内容、剩余内容以及你可以从哪里继续；完成每门课程后，你都会获得一张证书。

![Hindsight Academy 的进度仪表板，显示已完成的课程和获得的证书](/img/blog/academy-progress.webp)

这虽是个小功能，却能把“我该找时间学学智能体记忆”变成一份午休时间就能完成的清单。

## 适合哪些人？ {#who-its-for}

如果你还没有为智能体配备记忆，就从第一门课程开始；咖啡还没凉，你就能搭起一个可运行的存入、召回、反思循环。如果你已经在生产环境中运行智能体，可以跳到 **投入生产环境**，学习自托管、监控和迁移相关内容。无论哪种情况，这门课程都是免费的，你运行的代码会操作真实系统，而不是一个重置后就清空的沙盒。

智能体记忆不该靠东拼西凑分散的文档来学习。花一小时从头到尾亲手实践一遍。连接免费的 Hindsight Cloud 账号，**[开始学习 Hindsight Academy](https://learn.hindsight.vectorize.io)**，亲手为智能体赋予记忆。

---

**了解更多：**
- [Hindsight Academy](https://learn.hindsight.vectorize.io) — 免费的实践课程
- [Recall 与 Reflect 的区别](https://hindsight.vectorize.io/blog/2026/07/24/recall-vs-reflect) — 了解检索一条事实与基于记忆进行推理的区别
- [Hindsight on GitHub](https://github.com/vectorize-io/hindsight) — 底层使用的开源记忆引擎
