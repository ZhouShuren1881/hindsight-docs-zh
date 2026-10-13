---
title: "指南：跨 Windows 与 Mac 共享 Hermes 记忆"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, windows, mac, memory]
description: "使用 Hindsight Cloud 跨 Windows 与 Mac 延续 Hermes 工作流，无需各机重复背景。"
image: /img/guides/guide-share-hermes-memory-across-windows-and-mac.svg
hide_table_of_contents: true
---

![指南：跨 Windows 与 Mac 共享 Hermes 记忆](/img/guides/guide-share-hermes-memory-across-windows-and-mac.svg)

真实工作常混合平台，白天 Windows 工作站，之后 Mac 笔记本继续。无共享后端，像两个助手。

保持同策略、同后端并验证跨平台召回，Hindsight 将其变为连续流程。

<!-- truncate -->

> **快速解答**
>
> 1. 两平台配置 Hermes 与 Hindsight。
> 2. 使用 Cloud 或共享后端。
> 3. ID 一致。
> 4. Windows 存储、Mac 召回，反向也测试。
> 5. 个人、项目、团队需隔离时分库。

## 为什么重要 {#why-this-matters}

混合平台最易暴露真正有无记忆。

Windows 记住、Mac 忘记，问题是记忆边界而非模型。

共享后端让库而非机器成为延续单位。

## 步骤 1：两处用同后端 {#step-1-put-both-installs-on-the-same-backend}

Cloud 最简单。

两机执行：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**，再 **Cloud**。

两处可指向同服务。

## 步骤 2：命名一致 {#step-2-keep-bank-naming-consistent}

这是最重要规则。

同项目上下文，两机就用同项目库。

例如：

- project-docs
- acct-acme
- personal-ben

共享后端已有后，跨平台主要是命名纪律。

## 步骤 3：测试平台交接 {#step-3-test-the-platform-handoff}

快速真实测试：

1. Windows 告知新项目事实。
2. 结束。
3. Mac 打开。
4. 不重复背景询问。

Mac 召回 Windows 内容，就真正延续。

## 适用场景 {#good-use-cases}

### 工作站加笔记本 {#workstation-plus-laptop}

桌面研究编码，笔记本规划审查。

### 混合系统团队 {#team-workflows-across-mixed-operating-systems}

工程师分别 Windows、Mac，需共享项目记忆。

### 个人助手延续 {#personal-assistant-continuity}

偏好任务不应因机器改变。

## 应分开的内容 {#what-should-stay-separate}

跨平台不等于跨所有边界。

以下分库：

- 无关项目。
- 不同客户。
- 个人与团队。
- 不应共享的隐私敏感内容。

## 常见错误 {#common-mistakes}

- 两平台名字略不同。
- 不测试却认为共享后端足够。
- 个人上下文混入团队库。
- 尝试跨机共享仅本地记忆。

## 常见问题 {#faq}

### 文件系统布局必须相同吗？ {#does-this-require-the-same-filesystem-layout-on-both-machines}

不用，延续不依赖本地路径一致。

### 必须 Cloud 吗？ {#is-cloud-required}

必须共享后端，Cloud 只是最简单方式。

### 团队共享代码库也适用吗？ {#can-this-work-for-team-shared-repo-memory-too}

是，混合平台工程团队很适合。

## 后续步骤 {#next-steps}

- 阅读[使用 Cloud 为 Hermes 提供跨设备记忆](/guides/2026/06/02/guide-hermes-cross-device-memory-with-hindsight-cloud)。
- 阅读 [Windows Hermes 持久记忆配置](/blog/2026/06/01/hermes-hindsight-windows-setup)。
- 从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始。
