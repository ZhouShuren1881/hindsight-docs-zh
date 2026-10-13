---
title: "指南：使用 Hindsight Skills 实现持久记忆"
authors: [benfrank241]
date: 2026-04-16
tags: [how-to, skills, coding-agents, memory]
description: "在 Claude Code、OpenCode 或 Codex 中使用 Hindsight Skills，使用户偏好和项目经验跨会话保留。"
image: /img/blog/guide-hindsight-skills-for-persistent-memory.png
hide_table_of_contents: true
---

![指南：使用 Hindsight Skills 实现持久记忆](/img/blog/guide-hindsight-skills-for-persistent-memory.png)

使用 **Hindsight Skills 实现持久记忆**，就是为编程助手安装可复用技能，让它存储经验、在工作前召回相关上下文，并综合长期积累的知识进行反思。助手不再只依赖庞大的静态提示词，而是拥有可重复执行、跨会话不断积累的记忆工作流。

这对编程助手尤其有用，因为它反复需要相同类型的上下文：项目约定、用户偏好、问题规避方法、架构决策，以及上次有效的命令。Hindsight Skills 将这些转化为持久记忆，而非临时聊天历史。

本指南介绍安装、本地与云模式、技能提供的能力，以及如何确认它存储了正确类型的信息。操作时可参考[文档首页](/)和[快速开始](/developer/api/quickstart)。

<!-- truncate -->

> **快速步骤**
>
> 1. 为助手安装 Hindsight Skill。
> 2. 选择本地或云模式。
> 3. 配置后端和记忆库。
> 4. 让助手自动存储和召回项目知识。
> 5. 确认后续会话能记住真实偏好或经验。

## 支持的平台 {#supported-platforms}

Hindsight Skills 支持常见编程助手，例如：

- Claude Code
- OpenCode
- Codex CLI

关键在于，同一记忆模式可复用于多种工具，而无需分别重新实现。

## 本地模式与云模式 {#local-mode-vs-cloud-mode}

### 本地模式 {#local-mode}

适合本地模式的情况：

- 一个开发者在一台机器上使用私有记忆
- 所有数据都应保存在本地
- 希望尽量减少外部依赖

### 云模式 {#cloud-mode}

适合云模式的情况：

- 团队希望共享项目知识
- 多位开发者需要使用同一记忆库
- 希望在多台机器上使用记忆

希望采用最简单的托管方式时，使用 [Hindsight Cloud](https://hindsight.vectorize.io)。

## 第一步：安装技能 {#step-1-install-the-skill}

推荐的安装方式：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash
```

也可指定平台。

```bash
# Claude Code
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude

# OpenCode
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app opencode

# Codex CLI
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app codex
```

已确定使用云模式时：

```bash
curl -fsSL https://hindsight.vectorize.io/get-skill | bash -s -- --app claude --mode cloud
```

## 第二步：选择要保存的记忆 {#step-2-choose-what-kind-of-memory-you-want}

技能可帮助存储三类尤其有价值的信息：

- **用户偏好**，例如代码风格或回答格式
- **操作结果**，例如修复问题的有效命令
- **经验知识**，例如架构决策或反复遇到的陷阱

它因此比静态的 `AGENTS.md` 式上下文文件更有用。静态文件只记录人们记得写下的内容，记忆技能则能采集实际发生的事情。

底层检索行为见 [Hindsight 召回 API](/developer/api/recall)，存储行为见 [Hindsight 存储 API](/developer/api/retain)。

## 第三步：配置本地或云模式 {#step-3-configure-local-or-cloud-mode}

### 本地模式配置 {#local-mode-setup}

技能使用本地 Hindsight 工具，将数据存储在本机。

重新配置本地模式：

```bash
uvx hindsight-embed configure
```

### 云模式配置 {#cloud-mode-setup}

云模式将技能连接到共享 Hindsight 后端，通常需要：

- API 地址
- API 密钥
- 记忆库 ID

多位开发者需要共享同一项目记忆时，这种方式更适合。

## 技能如何帮助助手 {#how-the-skill-actually-helps-the-assistant}

安装后，助手可以：

- **存储**有用的项目事实和经验
- 在复杂工作前**召回**相关上下文
- 当综合答案比原始列表更有用时，围绕记忆进行**反思**

因此，助手能记住：

- 首选测试命令
- 部署注意事项
- 架构选择
- 仓库专属约定

这并不会让模型无所不知，而是让后续会话从更好的上下文基础开始。

## 团队共享记忆库应保存什么 {#what-to-store-in-a-shared-team-bank}

使用云模式的团队记忆库时，应有意识地选择内容。

适合保存：

- 项目约定
- 领域规则
- 已知环境特殊情况
- 共享调试知识

需谨慎保存：

- 个人偏好，应明确标明归属
- 应仅对某位开发者保密的内容

团队按项目建立记忆库时，名称应明确且一致。

## 验证技能是否有效 {#verify-that-the-skill-works}

简单测试：

1. 告诉助手一项真实偏好或项目事实
2. 完成任务或结束会话
3. 开始新会话
4. 询问该偏好或事实

如果回答准确，说明技能正常工作。

更好的第二项测试是观察助手是否在工作开始前主动召回经验，而不只是明确询问时才召回。

## 常见错误 {#common-mistakes}

### 将技能当作通用提示词片段 {#treating-the-skill-like-a-generic-prompt-snippet}

将它作为记忆工作流，比当作静态指令更有用。

### 将纯个人上下文放入共享记忆库 {#using-a-shared-bank-for-personal-only-context}

不应随意混合项目知识与个人偏好。

### 期望技能替代所有文档 {#expecting-the-skill-to-replace-all-documentation}

技能补充文档，不替代文档、README 或运维手册。

### 从不在新会话中测试召回 {#never-testing-recall-in-a-fresh-session}

只有记忆跨越会话边界仍存在，才能确认它有效。

## 常见问题 {#faq}

### 只支持 Claude Code 吗？ {#does-this-only-work-with-claude-code}

不是，该技能模式也支持 OpenCode 和 Codex CLI。

### 应从本地还是云模式开始？ {#should-i-start-with-local-or-cloud-mode}

个人使用从本地开始，团队共享记忆从云模式开始。

### 这与使用插件一样吗？ {#is-this-the-same-as-using-a-plugin}

不完全一样。技能是助手可复用的能力模式，而不仅是后端钩子。

### 还能使用直接集成吗？ {#can-i-still-use-direct-integrations-too}

可以，技能和集成包可按工具情况互相补充。

## 后续步骤 {#next-steps}

- 希望团队共享记忆时，从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 按照[快速开始](/developer/api/quickstart)操作。
- 阅读 [Hindsight 召回 API](/developer/api/recall)。
- 阅读 [Hindsight 存储 API](/developer/api/retain)。
- 在[通过 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)中比较编程工作流。
