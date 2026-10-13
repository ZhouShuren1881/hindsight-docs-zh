---
title: "指南：将 Hermes 从无状态聊天转为有状态智能体"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, agents, memory]
description: "为 Hermes 添加持久记忆，跨会话延续上下文、偏好和项目历史，而非每次从零开始。"
image: /img/guides/guide-turn-hermes-from-stateless-chat-into-a-stateful-agent.svg
hide_table_of_contents: true
---

![指南：将 Hermes 从无状态聊天转为有状态智能体](/img/guides/guide-turn-hermes-from-stateless-chat-into-a-stateful-agent.svg)

聊天智能体默认通常**无状态**。窗口内推理出色，但会话结束关系重置，适合一次请求，却不足以支持真实助手流程。

成为**有状态智能体**缺的是持久记忆。Hindsight 长期层让事实跨边界保留、按需恢复。

这让良好聊天变成有用持续智能体。

<!-- truncate -->

> **快速解答**
>
> 1. 连接 Hindsight。
> 2. 稳定库策略。
> 3. 跨会话保留重要内容。
> 4. 新会话确认召回。
> 5. 一次聊天扩展为可重用流程。

## 无状态聊天擅长什么 {#what-stateless-chat-is-good-at}

当前会话上下文足够时，它很擅长局部推理。

问题是延续。

再次打开不会自动知道：

- 偏好。
- 持续项目。
- 上周决策。
- 当前流程的重要人或账户。

因此当下聪明，长期健忘。

## 有状态行为是什么 {#what-stateful-behavior-looks-like}

不只回答当前消息，还延续关系和工作。

Hermes 因此可：

- 无需再告知就召回偏好。
- 无需完整背景恢复项目。
- 跨对话延续客户账户。
- 重复会话积累运维知识。

记忆使这成为可能。

## 步骤 1：添加记忆层 {#step-1-add-a-memory-layer}

最短路径：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight**。连接后跨会话存储召回，而非每聊重启。

## 步骤 2：选择策略 {#step-2-pick-a-bank-strategy}

范围合理才有状态。

好的默认：

- 每用户助手一个库。
- 每项目一个库。
- 每客户或流程一个库。

不好的默认：

- 无关工作巨库。

范围越清晰，召回越好。

## 步骤 3：让真实工作产生记忆 {#step-3-let-real-work-create-the-memory}

无需手动写每条。

自然使用中，系统保存对话背后持久偏好、决策、项目细节、重复问题和关系上下文。

正常使用变成不断积累的资产。

## 步骤 4：新会话验证 {#step-4-verify-statefulness-with-a-fresh-session}

简单测试：

1. 提供之后重要的事实。
2. 结束。
3. 新会话。
4. 不重复背景询问。

正确回答就从无状态转为有状态。

## 最重要场景 {#where-this-matters-most}

### 个人助手 {#personal-assistant-workflows}

偏好计划无需每次重输。

### 客户流程 {#customer-facing-workflows}

账户、相关人和此前对话延续。

### 编码流程 {#coding-workflows}

代码库和此前调试下一会话可用。

## 为何优于更大窗口 {#why-this-is-better-than-bigger-context-windows}

更大窗口帮助当前运行，不能独自产生持久跨会话记忆。

有状态不是更多 token，而是当前需要时找回过去正确上下文。

因此大窗口模型仍需记忆。

## 常见错误 {#common-mistakes}

- 混淆聊天历史和长期记忆。
- 无关流程超大库。
- 不测新会话却期待有状态。
- 仅粘贴更多上下文解决延续。

## 常见问题 {#faq}

### 有状态只是聊天历史吗？ {#is-stateful-hermes-just-chat-history}

不是，重点是跨会话可用记忆，而非长记录。

### 需改模型吗？ {#do-i-need-to-change-the-model}

不用，是记忆层变更。

### 有状态记忆可共享吗？ {#can-stateful-memory-be-shared}

可以，流程受益时。

## 后续步骤 {#next-steps}

- 阅读[无状态与记忆驱动智能体](/guides/2026/04/23/guide-stateless-agents-vs-memory-powered-agents)。
- 查阅 [Hermes 记忆模式](/guides/2026/04/14/guide-hermes-memory-modes-with-hindsight-hybrid-context-tools)。
- 从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始。
