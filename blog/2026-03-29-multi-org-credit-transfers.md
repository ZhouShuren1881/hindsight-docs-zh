---
title: "Hindsight Cloud 新功能：多组织支持与额度转移"
authors: [hindsight]
date: 2026-03-29T12:00
tags: [hindsight-cloud, release, billing, organizations]
description: "Hindsight Cloud 现已支持每个账户创建多个组织，以及在组织之间直接转移额度。这两项功能现已开放使用。"
image: /img/blog/hindsight-cloud-multi-org.webp
hide_table_of_contents: true
---

![Hindsight Cloud 新功能：多组织支持与额度转移](/img/blog/hindsight-cloud-multi-org.webp)

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现已上线两项新功能：每个账户可创建多个组织，以及在你拥有的组织之间转移额度。

<!-- truncate -->

## 概览 {#tldr}

- **多个组织** — 为生产环境和开发环境，或不同项目创建独立组织，并可随时从顶部导航栏在组织之间切换
- **额度转移** — 直接在账单页面转移你所拥有组织之间的额度；无需提交支持工单
- **仅限组织所有者转移** — 只有同时拥有转出组织和转入组织的用户才能发起转移
- **现已开放使用** — 所有 Hindsight Cloud 账户均可使用

## 多个组织 {#multiple-organizations}

现在，你可以通过顶部导航栏中的组织切换菜单创建多个组织。这适用于以下场景：

- **隔离环境** — 将生产环境和开发环境的记忆库分别放在不同组织中，并使用不同的 API 密钥，这样开发智能体就绝不会影响生产数据
- **区分项目** — 为不同客户、代码库或团队运行完全独立的 Hindsight 环境，避免记忆库或账单相互混杂

要创建组织，请点击顶部导航栏中的组织名称，然后选择 **新建组织**。切换组织会立即生效：仪表板、记忆库、API 密钥和账单页面都会更新，以显示所选组织的信息。

## 在组织之间转移额度 {#credit-transfers-between-organizations}

现在，组织所有者可以直接在账单页面转移自己所拥有组织之间的额度，无需联系支持团队。

具体说明：

- **原子转移** — 额度会立即转移；两个组织的余额同时更新，中间不会出现过渡状态
- **完整的交易记录** — 转出组织会记录一条 `transfer_out` 记录，转入组织会记录一条 `transfer_in` 记录；两条记录都显示在各自组织的账单页面上
- **确认步骤** — 在额度转移前，确认对话框会显示转移金额和转入组织
- **仅限组织所有者** — 只有同时拥有转出组织和转入组织的用户才能发起转移；管理员和成员不能发起

要转移额度，请进入转出组织的 **账单** 页面，然后选择 **转移额度**。

[详细了解额度转移 →](/changelog)

## 开始使用 {#get-started}

所有 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 账户现已可使用这两项功能。你可以通过组织切换菜单创建组织，也可以前往账单页面，在现有组织之间转移额度。
