---
title: "Hindsight Cloud 新功能：程序化 API 密钥管理"
authors: [benfrank241]
date: 2026-03-11T12:00
tags: [hindsight-cloud, release, api]
hide_table_of_contents: true
description: "Hindsight Cloud 密钥现在可以直接通过 API 创建、列出和撤销仅限特定记忆库使用的子密钥。"
---

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现已支持通过 API 管理密钥。具备 **Key Creator** 权限的 API 密钥可以创建、列出和撤销限定到特定记忆库的子密钥，无需管理员权限或访问 UI。

<!-- truncate -->

## 可执行的操作 {#what-you-can-do}

- **创建子密钥** — 为特定记忆库签发有效期较短、遵循最小权限原则的密钥
- **强制执行记忆库范围** — 子密钥只能访问父密钥范围内的记忆库
- **有效期限制** — 子密钥的有效期不能超过父密钥
- **级联撤销** — 撤销父密钥时，会自动撤销其所有子密钥
- **子密钥不可变** — 通过程序创建的密钥无法修改其记忆库范围；如需更改，请先撤销，再重新创建
- **审计跟踪** — 所有密钥的创建、撤销和范围变更都会记录操作者身份

## 这项功能的意义 {#why-this-matters}

如果你在运行多租户部署（每位客户、每个智能体或每种环境各有一个记忆库），现在无需再通过控制台管理密钥。你的应用可以按需签发限定范围的密钥，按计划轮换密钥，并在需要结束访问时立即撤销密钥。

结合 3 月 9 日发布的[限定记忆库范围的 API 密钥](/blog/2026/03/09/hindsight-document-upload#what-else-is-new)，你现在可以构建完整的最小权限密钥层级：具备 Key Creator 权限的父密钥管理各自限定到特定记忆库的子密钥。

## 开始使用 {#get-started}

现在即可在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 中使用程序化 API 密钥管理。创建一个具备 Key Creator 权限的密钥，即可开始通过 API 签发子密钥。

---
