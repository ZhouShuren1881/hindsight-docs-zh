---
title: "Hindsight Cloud中的新增功能：多组织支持和学分转移"
authors: [hindsight]
date: 2026-03-29T12:00
tags: [hindsight-cloud, release, billing, organizations]
description: "Hindsight Cloud现在支持每个帐户多个组织以及组织之间的直接信用转账 - 两者现已可用。"
image: /img/blog/hindsight-cloud-multi-org.webp
hide_table_of_contents: true
---

![Hindsight Cloud中的新增功能：多组织支持和学分转移](/img/blog/hindsight-cloud-multi-org.webp)

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 中推出了两个新功能：每个帐户多个组织以及您拥有的组织之间的信用转账。

<!-- truncate -->

## 概览 {#tldr}

- **多个组织** — 为生产和开发或不同的项目创建单独的组织，并从顶部导航立即在它们之间切换
- **学分转移** — 直接从计费页面在您拥有的组织之间转移积分；无需支持票
- **仅限业主转让** — 只有同时拥有源组织和目标组织的用户才能发起转移
- **现已上市** — 在所有 Hindsight Cloud帐户中

## 多个组织 {#multiple-organizations}

您现在可以从顶部导航栏中的组织切换器创建多个组织。这对于：

- **分离环境** — 将生产和开发记忆库保存在具有单独API密钥的不同组织中，因此开发智能体永远不会影响生产数据
- **独特的项目** — 为不同的客户、代码库或团队运行完全独立的 Hindsight 设置，不会对记忆库或计费产生任何交叉污染

要创建新组织，请单击顶部导航栏中的组织名称，然后选择**新组织**。组织之间的切换是即时的——仪表板、记忆库、API键和计费页面都会更新以适应所选的组织。

## 组织之间的学分转移 {#credit-transfers-between-organizations}

所有者现在可以直接从计费页面在他们拥有的组织之间转移积分 - 无需联系支持人员。

关键细节：

- **原子传输** — 积分立即转移；两个组织的余额同时更新，没有中间状态
- **完整交易历史** — 源组织记录 `transfer_out` 条目，目标组织记录 `transfer_in` 条目，两者都在每个组织的账单页面上可见
- **确认步骤** — 确认对话框显示任何资金转移之前的金额和目的地组织
- **仅限业主** — 只有同时拥有源组织和目标组织的用户才能发起转账；管理员和会员不能

要转移学分，请转到源组织中的**计费**，然后选择**转学分**。

[了解有关学分转账的更多信息 →](/changelog)

## 开始 {#get-started}

这两个功能现在在所有[Hindsight Cloud](https://ui.hindsight.vectorize.io)帐户中可用。从组织切换器创建新组织，或前往“计费”页面在现有组织之间转移积分。
