---
title: "指南：借助 Hindsight Cloud 为 Hermes 提供跨设备记忆"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, cloud, memory]
description: "配置 Hermes 与 Hindsight Cloud，让同一份记忆在笔记本电脑、台式机和服务器会话之间延续。"
image: /img/guides/guide-hermes-cross-device-memory-with-hindsight-cloud.svg
hide_table_of_contents: true
---

![指南：借助 Hindsight Cloud 为 Hermes 提供跨设备记忆](/img/guides/guide-hermes-cross-device-memory-with-hindsight-cloud.svg)

如果你在多台设备上运行 Hermes，**跨设备记忆**决定了你使用的是同一个助手，还是三个彼此隔离的助手。没有共享的记忆后端，笔记本电脑、台式机和服务器上的 Hermes 会各自积累一部分历史记录。结果就是，你不得不在每台设备上重复说明相同的背景信息。

Hindsight Cloud 可以解决这个问题。让多处 Hermes 安装指向同一个记忆后端，采用稳定的记忆库命名策略，助手就能在不同设备之间延续上下文，而不必每次从头开始。

<!-- truncate -->

> **快速解答**
>
> 1. 为 Hermes 配置 Hindsight Cloud。
> 2. 需要共享记忆的设备使用相同的记忆库 ID。
> 3. 稳定地命名项目或用户对应的记忆库。
> 4. 在一台设备上存入事实后，从另一台设备验证能否召回。
> 5. 需要隔离时使用不同的记忆库。

## 为什么本地记忆不足以支持跨设备使用 {#why-local-memory-is-not-enough-across-devices}

只要工作流程涉及多台设备，本地记忆就不够用了。

你可能在笔记本电脑上做研究，在台式机上编写代码，再在服务器上运行自动化任务。如果每个环境都只在本地保存记忆，上下文很快就会分散。信息仍然存在，只是散落在各处。

跨设备记忆通过将记忆库放到智能体使用的后端，而不是某一台设备里，来解决这个问题。

## 步骤 1：选择 Hindsight Cloud {#step-1-choose-hindsight-cloud}

最简单的方式是使用 Hermes 记忆设置向导：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**，然后选择 **Cloud**。

这样，每处 Hermes 安装都会使用共享后端，而不是各自使用设备本地的后端。

## 步骤 2：明确记忆库划分策略 {#step-2-make-your-bank-strategy-explicit}

共享后端只完成了一半工作。另一半是确保每台设备在需要共享时都指向**同一个记忆库**。

常见做法：

- 每个用户助手使用一个记忆库
- 每个项目使用一个记忆库
- 每位客户或每个账户使用一个记忆库

例如：

- ben-personal
- project-hindsight-docs
- acct-acme

关键在于保持命名稳定。如果笔记本电脑使用 project-hindsight-docs，而台式机使用 docs-project，那么这并没有实现跨设备记忆，而是创建了两份名称相似、彼此独立的历史记录。

## 步骤 3：端到端验证流程 {#step-3-verify-the-flow-end-to-end}

可以按以下步骤快速验证：

1. 在设备 A 上告诉 Hermes 一条值得记住的事实。
2. 结束会话。
3. 在设备 B 上使用同一个记忆库启动新的 Hermes 会话。
4. 询问那条事实。

如果第二台设备能顺利召回这条事实，说明配置正常。

## 跨设备记忆的最佳使用场景 {#best-use-cases-for-cross-device-memory}

### 个人助手工作流程 {#personal-assistant-workflows}

你可以先用手机给 Hermes 发消息，再用笔记本电脑继续交流，之后还可以在台式机上追问。共享记忆会让这些交互像是与同一个助手持续交流。

### 编码工作流程 {#coding-workflows}

在一台设备上做研究，在另一台设备上实现，再通过服务器部署或监控。共享记忆库可以让代码库相关的上下文持续连贯。

### 团队运维 {#team-operations}

服务器上的 Hermes 工作进程可以积累记忆，供之后由人工操作的 Hermes 聊天会话使用；反过来也可以。

## 何时不应共享记忆库 {#when-not-to-share-a-bank}

并非所有内容都适合放在同一个记忆池中。

以下情况应使用不同的记忆库：

- 不同项目需要彼此隔离。
- 个人上下文不应与团队记忆混在一起。
- 特定客户的记忆不应泄漏到其他账户。

跨设备共享不代表所有内容都要共享。

## 常见错误 {#common-mistakes}

- 在不同设备上使用不同的记忆库 ID。
- 用一个庞大的记忆库存放彼此无关的工作内容。
- 没有明确的命名策略，却以为仅靠 Cloud 就能保证良好的检索效果。
- 忘记从第二台设备测试记忆召回。

## 常见问题 {#faq}

### 笔记本电脑和服务器可以共用一个记忆库吗？ {#can-i-share-one-bank-across-laptop-and-server}

可以。这正是使用 Cloud 的主要原因之一。

### 每台设备上的 Hermes 本地安装路径都必须相同吗？ {#do-i-need-the-same-local-hermes-install-path-on-every-machine}

不需要。关键是使用共享后端和稳定的记忆库 ID。

### 团队也应该共用一个记忆库吗？ {#should-teams-share-one-bank-too}

只有当工作流程本身需要共享记忆时才应该这样做。否则，请使用不同的记忆库。

## 后续步骤 {#next-steps}

- 阅读[将 Hermes 记忆从本地文件迁移到 Hindsight Cloud](/guides/2026/04/20/guide-move-hermes-memory-from-local-files-to-hindsight-cloud)
- 查看[使用 Hindsight 时单库与多库的比较](/guides/2026/04/16/comparison-single-bank-vs-multi-bank-hindsight)
- 从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
