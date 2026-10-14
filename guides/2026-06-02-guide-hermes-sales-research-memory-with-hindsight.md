---
title: "指南：用 Hermes 进行销售研究并保持持久记忆"
authors: [benfrank241]
date: 2026-06-02T15:00:00Z
tags: [how-to, hermes, sales, memory]
description: "将 Hermes 与 Hindsight 配合用于销售研究，让智能体跨会话记住客户账户、利益相关方、异议和交易背景。"
image: /img/guides/guide-hermes-sales-research-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：用 Hermes 进行销售研究并保持持久记忆](/img/guides/guide-hermes-sales-research-memory-with-hindsight.svg)

如果你想**用 Hermes 进行销售研究**，持久记忆能让它在首次会话之后继续发挥作用。没有记忆，每份客户账户简报都得从头开始。有了 Hindsight，Hermes 就能存入客户账户事实、利益相关方备注、以往异议、购买信号，以及你上次查看这笔交易时作出的决定。

这样一来，工作流程就会从“生成一次性的研究摘要”转变为“随着时间推移，持续维护对客户账户的理解”。

效果最好的配置模式是：为每个客户账户或客户团队使用一个稳定的记忆库，让 Hermes 作为前端，并由 Hindsight 在底层负责长期记忆。

<!-- truncate -->

> **快速解答**
>
> 1. 将 Hermes 连接到 Hindsight。
> 2. 选择符合你销售模式的记忆库策略。
> 3. 每个客户账户、销售区域或由销售代表负责的客户组合使用一个记忆库。
> 4. 让 Hermes 存入研究笔记、通话准备、异议和利益相关方背景。
> 5. 每次与客户账户接触前，都使用同一个记忆库。

## 为什么销售研究需要记忆 {#why-memory-matters-for-sales-research}

销售研究不是单次提示就能解决的问题，而是一个信息不断积累的过程。

你先从网站了解一点客户账户情况，再从 10-K 年报中了解更多，之后又从 LinkedIn、通话笔记和内部交接消息中获得新信息。高价值背景信息分散在数天甚至数周之中。

没有记忆，你要么丢失这些背景信息，要么不断重新粘贴。有了记忆，Hermes 就能延续以下事实：

- 买方关注哪些团队
- 客户账户已经在使用哪些工具
- 上次通话中出现了哪些异议
- 哪项计划或截止日期正在推动紧迫感
- 哪个竞争对手在这笔交易中反复出现

这正是每次与你的客户账户交流后都会变得更有价值的背景信息。

## 步骤 1：将 Hermes 连接到 Hindsight {#step-1-connect-hermes-to-hindsight}

最快的方式是使用 Hermes 插件目录中安装的原生记忆提供方：

~~~bash
hermes plugins install hindsight
hermes memory setup           # 选择 "hindsight"
~~~

选择 **Hindsight** 作为提供方，然后决定使用 Cloud、本地嵌入式模式还是本地外部模式。

对于销售工作流程，Cloud 通常最容易上手，因为同一个记忆库可以在不同设备和队友之间共用。

## 步骤 2：选择合适的记忆库策略 {#step-2-pick-the-right-bank-strategy}

这是最重要的设计决策。

对于销售场景，通常最适合作为默认方案的是**每个客户账户一个记忆库**。

这样可以让每个客户账户的背景信息保持独立。关于 Acme 的笔记不会混入 Globex 的信息。一个简单的命名模式如下：

- sales-acme
- sales-globex
- sales-initech

如果一位销售代表负责多个相关客户账户，并且希望共享背景信息，也可以使用客户组合记忆库。不过，按客户账户划分的记忆库是更稳妥的默认方案，因为这样可以避免检索结果过于杂乱。

## 步骤 3：决定哪些信息应该成为记忆 {#step-3-decide-what-should-become-memory}

最有价值的销售记忆不是未经整理的逐字稿，而是推动销售进程的持久事实。

例如：

- “运营副总裁可能是内部支持者”
- “续约日期在 10 月”
- “安全审查是主要阻碍”
- “当前技术栈包括 Salesforce、Snowflake 和 Zendesk”
- “买方对合规角度反应良好，对自动化角度则反应一般”

这些信息正是你希望 Hermes 在下一次客户账户评审或准备会议前召回的内容。

## 步骤 4：在最能发挥作用的时刻使用 Hermes {#step-4-use-hermes-in-the-highest-leverage-moments}

### 通话前准备客户账户 {#account-prep-before-a-call}

先问：

~~~text
What do we already know about this account, and what should I ask on today's call?
~~~

Hermes 可以调取利益相关方关系图、先前的异议和待解决问题，省去重新整理这些信息的过程。

### 两次通话之间开展研究 {#research-between-calls}

当你从文章、财报、招聘信息和产品发布中了解到新事实时，Hermes 会存入其中的重要信息。这样下次会话就能在已有信息上继续积累，而不是重复劳动。

### 在队友之间交接 {#handoffs-between-teammates}

如果多位销售代表或销售工程师共用同一个记忆库，接手的人就能获得真实的背景信息，而不必只看简略的 CRM 摘要，再猜测哪些内容重要。

## 步骤 5：确认召回确实有帮助，而非造成干扰 {#step-5-verify-recall-is-helping-not-hurting}

只有检索结果保持精准，记忆配置才算有效。

可以快速这样测试：

1. 在两到三个会话中存入一些真实的客户账户事实。
2. 开始一个新会话。
3. 询问 Hermes 记得哪些客户账户利益相关方、时间安排和阻碍。
4. 检查回答是否具体且相关。

如果召回结果显得杂乱，通常的解决办法是缩小记忆库的范围。每个客户账户一个记忆库，几乎总是比整个销售管道共用一个大型记忆库更清晰。

## 这种工作流程适合哪些场景 {#what-this-workflow-is-good-at}

Hermes + Hindsight 尤其适合：

- 随时间不断积累的客户账户研究
- 多次触达与跟进
- 多人组成的交易团队
- 产品匹配细节需要在多次通话中持续跟进的技术销售
- 由创始人亲自完成探索、跟进和提案的销售

如果你从不再次查看某个客户账户，那么对于一次性的潜在客户信息补充，这种方式的价值就小得多。

## 常见错误 {#common-mistakes}

- **所有销售内容都放进一个大型记忆库**——检索结果很快就会变得杂乱
- **只保存原始笔记，不记录明确的决定**——持久事实比逐字稿本身更重要
- **不断更改记忆库名称**——保持连续性依赖稳定的记忆库 ID
- **指望记忆取代 CRM**——记忆能帮助智能体结合背景信息进行推理，但不能替代系统记录工具

## 常见问题 {#faq}

### 应该按销售代表还是按客户账户划分记忆库？ {#should-i-use-one-bank-per-rep-or-per-account}

按客户账户划分是更稳妥的默认方案。只有在共享客户组合背景比检索精准度更重要时，才按销售代表划分。

### 销售工程师和客户经理可以共用同一个记忆库吗？ {#can-a-sales-engineer-and-ae-share-the-same-bank}

可以。这是最有价值的使用场景之一。

### 这能取代 Salesforce 或 HubSpot 吗？ {#does-this-replace-salesforce-or-hubspot}

不能。它能在研究和准备过程中为 Hermes 提供工作记忆，作为 Salesforce 或 HubSpot 的补充。

## 后续步骤 {#next-steps}

- 从 [Hermes 集成文档](https://hindsight.vectorize.io/sdks/integrations/hermes)开始
- 阅读 [Hindsight 单库与多库对比](/guides/2026/04/16/comparison-single-bank-vs-multi-bank-hindsight)
- 如果你希望客户账户记忆能在不同设备和队友之间共用，请使用 [Hindsight Cloud](https://hindsight.vectorize.io)
