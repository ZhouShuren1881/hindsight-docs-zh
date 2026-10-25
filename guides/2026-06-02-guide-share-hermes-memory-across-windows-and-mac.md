---
title: "指南：跨 Windows 和 Mac 共享 Hermes 记忆"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, windows, mac, memory]
description: "使用 Hindsight Cloud，让 Hermes 在 Windows 和 Mac 上共享同一套工作流，无需在每台机器上重复说明相同的背景信息。"
image: /img/guides/guide-share-hermes-memory-across-windows-and-mac.svg
hide_table_of_contents: true
---

![指南：跨 Windows 和 Mac 共享 Hermes 记忆](/img/guides/guide-share-hermes-memory-across-windows-and-mac.svg)

如今，许多实际工作流都会混用不同平台。你可能白天在 Windows 工作站上使用 Hermes，之后又在 Mac 笔记本上继续同一段对话。如果没有共享的记忆后端，这两边就像是两个互不相通的助手。

Hindsight 可以把这种情况变成一个连续的工作流。方法很简单：两台机器采用相同的记忆库策略，让两边的 Hermes 安装都连接到同一个后端，再验证记忆能否跨平台召回。

<!-- truncate -->

> **快速解答**
>
> 1. 在 Windows 和 Mac 上都为 Hermes 配置 Hindsight。
> 2. 使用 Hindsight Cloud 或其他共享后端。
> 3. 在两个平台上使用相同的记忆库 ID。
> 4. 先在 Windows 存入记忆，再在 Mac 上测试召回；反过来也要测试。
> 5. 如果个人、项目或团队上下文需要彼此隔离，请使用不同的记忆库。

## 为什么这很重要 {#why-this-matters}

混合平台使用是检验智能体是否真正具备记忆能力的最快方式之一。

如果 Hermes 在 Windows 上记得某件事，却在 Mac 上忘了，问题不在模型，而在记忆边界。

共享后端可以解决这个问题：它让记忆库而不是机器成为保持连续性的基础。

## 步骤 1：让两边的安装连接到同一后端 {#step-1-put-both-installs-on-the-same-backend}

最简单的做法是使用 Hindsight Cloud。

在两台机器上运行：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**，然后选择 **Cloud**。

这样，两边的 Hermes 安装都可以连接到同一个记忆服务。

## 步骤 2：保持记忆库命名一致 {#step-2-keep-bank-naming-consistent}

这是最重要的一条规则。

如果你希望两台机器共享同一项目上下文，就在两边都使用同一个项目记忆库。

例如：

- project-docs
- acct-acme
- personal-ben

共享后端就绪后，跨平台记忆主要取决于是否遵守一致的命名规则。

## 步骤 3：测试平台间的交接 {#step-3-test-the-platform-handoff}

可以做一个简单的实际测试：

1. 在 Windows 上告诉 Hermes 一条有关项目的新事实。
2. 结束会话。
3. 在 Mac 上打开 Hermes。
4. 不要重复之前的说明，直接询问相关背景。

如果 Mac 能召回 Windows 上存入的信息，就实现了真正的跨平台连续性。

## 适用场景 {#good-use-cases}

### 工作站搭配笔记本 {#workstation-plus-laptop}

在台式机上做研究或编程，在笔记本上进行规划或审查。

### 跨不同操作系统的团队工作流 {#team-workflows-across-mixed-operating-systems}

一位工程师使用 Windows，另一位使用 Mac，但两人都需要访问同一份共享项目记忆。

### 个人助手的连续性 {#personal-assistant-continuity}

不应该仅仅因为更换了机器，你的偏好和正在进行的任务就发生变化。

## 应该保持隔离的内容 {#what-should-stay-separate}

跨平台不意味着所有内容都要互通。

以下内容应使用不同的记忆库：

- 无关的项目
- 不同的客户
- 个人与团队工作流
- 任何涉及敏感隐私、不应共享的内容

## 常见错误 {#common-mistakes}

- 在不同平台上使用略有差异的记忆库名称
- 没有测试记忆召回，就以为共享后端已经足够
- 将个人上下文混入团队共享记忆库
- 试图在不同机器之间共享仅存于本地的记忆

## 常见问题 {#faq}

### 两台机器的文件系统布局必须相同吗？ {#does-this-require-the-same-filesystem-layout-on-both-machines}

不需要。记忆库的连续性不依赖本地路径一致。

### 必须使用 Cloud 吗？ {#is-cloud-required}

你需要一个共享后端。Cloud 只是最简单的选择。

### 这也适用于团队共享代码库的记忆吗？ {#can-this-work-for-team-shared-repo-memory-too}

可以。这是混合平台工程团队的一个典型适用场景。

## 后续步骤 {#next-steps}

- 阅读[使用 Hindsight Cloud 为 Hermes 提供跨设备记忆](/guides/2026/06/02/guide-hermes-cross-device-memory-with-hindsight-cloud)
- 阅读 [Windows 上的 Hermes 智能体：使用 Hindsight 设置持久记忆](/blog/2026/06/01/hermes-hindsight-windows-setup)
- 从 [Hermes 集成文档](/sdks/integrations/hermes)开始
