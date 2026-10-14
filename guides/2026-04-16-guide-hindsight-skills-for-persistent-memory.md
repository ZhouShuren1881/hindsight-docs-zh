---
title: "指南：使用 Hindsight Skills 实现持久记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, skills, coding-agents, memory]
description: "在 Claude Code、OpenCode 或 Codex 中使用 Hindsight Skills，让用户偏好和项目经验跨会话延续。"
image: /img/blog/guide-hindsight-skills-for-persistent-memory.png
hide_table_of_contents: true
---

![指南：使用 Hindsight Skills 实现持久记忆](/img/blog/guide-hindsight-skills-for-persistent-memory.png)

如果你希望借助 **Hindsight Skills 实现持久记忆**，目标就是为编程助手安装一项可复用的技能，让它能够存储经验、在开始工作前召回相关上下文，并结合长期积累的内容进行推理。这样，助手就不必依赖一个庞大的静态提示词，而是可以通过可重复的记忆工作流，在不同会话中逐步积累经验。

这对编程助手尤其有用，因为它们总会遇到相同类型的上下文：项目约定、用户偏好、问题的规避方法、架构决策，以及上次奏效的命令。Hindsight Skills 能将这些内容转化为持久记忆，而不是让它们只留在短暂的聊天记录中。

本指南将介绍安装流程、本地模式与云模式、技能实际提供的能力，以及如何确认它存储的信息类型正确。操作时，请同时打开[文档首页](/)和[快速开始指南](/developer/api/quickstart)以便查阅。

<!-- truncate -->

> **快速回答**
>
> 1. 为你的助手安装 Hindsight Skill。
> 2. 选择本地模式或云模式。
> 3. 配置后端和记忆库设置。
> 4. 让助手自动存储并召回项目知识。
> 5. 验证后续会话能否记住一项真实的偏好或经验。

## 支持的平台 {#supported-platforms}

Hindsight Skills 支持常见的编程助手，例如：

- Claude Code
- OpenCode
- Codex CLI

关键在于，同一套记忆模式可以在多种工具界面中复用，不必针对每种工具分别重新实现。

## 本地模式与云模式 {#local-mode-vs-cloud-mode}

### 本地模式 {#local-mode}

以下情况适合使用本地模式：

- 一位开发者希望在一台机器上使用私有记忆
- 所有数据都应保留在本地
- 希望尽可能减少外部依赖

### 云模式 {#cloud-mode}

以下情况适合使用云模式：

- 团队希望共享项目知识
- 多位开发者都应能使用同一个记忆库
- 希望在多台机器上都能访问记忆

如果你希望采用最简单的托管方案，可以使用 [Hindsight Cloud](https://hindsight.vectorize.io)。

## 第一步：安装技能 {#step-1-install-the-skill}

推荐使用以下安装命令：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash
```

你也可以指定某个平台。

```bash
# Claude Code
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude

# OpenCode
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app opencode

# Codex CLI
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app codex
```

如果你已经确定要使用云模式：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude --mode cloud
```

## 第二步：选择要保存的记忆类型 {#step-2-choose-what-kind-of-memory-you-want}

这项技能可以帮助存储三类特别有价值的信息：

- **用户偏好**，例如代码风格或回答格式
- **操作结果**，例如成功修复问题的命令
- **经验总结**，例如架构决策或反复出现的问题

因此，它比静态的 `AGENTS.md` 式上下文文件更有用。静态文件只能记录某人记得写下的内容；记忆技能则可以记录实际发生过的事情。

要了解技能背后的检索行为，请参阅 [Hindsight 的召回 API](/developer/api/recall)；要了解存储行为，请参阅 [Hindsight 的存入 API](/developer/api/retain)。

## 第三步：配置本地模式或云模式 {#step-3-configure-local-or-cloud-mode}

### 配置本地模式 {#local-mode-setup}

该技能使用本地 Hindsight 工具，并将数据存储在你的机器上。

使用以下命令重新配置本地模式：

```bash
uvx hindsight-embed configure
```

### 配置云模式 {#cloud-mode-setup}

云模式会将该技能连接到共享的 Hindsight 后端。通常需要提供：

- API URL
- API key
- bank ID

如果多位开发者需要共享同一项目的记忆，这种方式更合适。

## 这项技能如何帮助助手 {#how-the-skill-actually-helps-the-assistant}

安装后，助手可以：

- **存入**有用的项目事实和经验
- 在开始较复杂的工作之前**召回**相关上下文
- 当综合答案比原始列表更有用时，基于记忆进行**推理**

这意味着助手可以记住：

- 首选的测试命令
- 部署时容易忽略的问题
- 架构选择
- 特定代码仓库的约定

这并不意味着模型会神奇地无所不知；它的实际效果是，让后续会话能从更充分的上下文出发。

## 团队共享记忆库应存储什么 {#what-to-store-in-a-shared-team-bank}

如果团队使用云模式和共享记忆库，请谨慎选择要存储的内容。

适合存储的内容：

- 项目约定
- 领域规则
- 已知的环境问题
- 团队共享的调试经验

需要谨慎存储的内容：

- 个人偏好，应明确标明归属
- 应仅对某位开发者保密的任何内容

如果团队打算为每个项目使用一个记忆库，应让记忆库名称保持明确且一致。

## 验证技能是否有效 {#verify-that-the-skill-works}

可以进行一个简单测试：

1. 告诉助手一项真实的偏好或项目事实
2. 完成任务或结束会话
3. 开始一个全新的会话
4. 询问刚才那项偏好或事实

如果助手能准确回答，说明这项技能正在工作。

更好的第二项测试是观察助手能否在工作开始前主动召回经验，而不只是等到你明确询问时才召回。

## 常见错误 {#common-mistakes}

### 把技能当成通用提示词片段 {#treating-the-skill-like-a-generic-prompt-snippet}

将它用作记忆工作流，比把它当成静态指令块更有用。

### 在共享记忆库中存储纯个人上下文 {#using-a-shared-bank-for-personal-only-context}

不要不加区分地混合项目知识和个人偏好。

### 期望技能取代所有文档 {#expecting-the-skill-to-replace-all-documentation}

这项技能可以补充文档，但不能取代文档、README 或运维手册。

### 从不在新会话中测试召回 {#never-testing-recall-in-a-fresh-session}

只有确认记忆能跨越会话边界保留下来，你才知道它是否有效。

## 常见问题 {#faq}

### 这只支持 Claude Code 吗？ {#does-this-only-work-with-claude-code}

不是。这种技能模式也支持 OpenCode 和 Codex CLI。

### 应该从本地模式还是云模式开始？ {#should-i-start-with-local-or-cloud-mode}

个人使用可从本地模式开始；团队共享记忆则可从云模式开始。

### 这和使用插件是一回事吗？ {#is-this-the-same-as-using-a-plugin}

不完全是。技能是助手的一种可复用能力模式，而不只是一个后端钩子。

### 我还可以使用直接集成吗？ {#can-i-still-use-direct-integrations-too}

可以。根据所用工具，技能和集成包可以互相补充。

## 后续步骤 {#next-steps}

- 如果你希望团队共享记忆，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [完整的 Hindsight 文档](/)。
- 按照[快速开始指南](/developer/api/quickstart)操作。
- 查看 [Hindsight 的召回 API](/developer/api/recall)。
- 查看 [Hindsight 的存入 API](/developer/api/retain)。
- 在[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中比较编程工作流。
