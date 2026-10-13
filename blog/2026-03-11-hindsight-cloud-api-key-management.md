---
title: "Hindsight Cloud中的新增功能：程序化API密钥管理"
authors: [benfrank241]
date: 2026-03-11T12:00
tags: [hindsight-cloud, release, api]
hide_table_of_contents: true
---

[Hindsight Cloud](https://ui.hindsight.vectorize.io) 现在支持编程式API 密钥管理。具有 **密钥创建者** 功能的 API 密钥可以通过 API 创建、列出和撤销记忆库范围的子密钥 — 无需管理员或 UI 访问权限。

<!-- truncate -->

## 你能做什么 {#what-you-can-do}

- **创建子密钥** — 提供适用于特定记忆库的短期、最小权限密钥
- **记忆库范围执行** — 子密钥只能访问父密钥范围内的记忆库
- **到期限制** — 子键不能比其父键寿命更长
- **级联撤销** — 撤销父密钥会自动撤销其所有子密钥
- **一成不变的孩子** — 以编程方式创建的密钥无法编辑其记忆库范围；撤销并重新创建
- **审计追踪** — 所有密钥创建、撤销和范围更改均使用参与者身份进行记录

## 为什么这很重要 {#why-this-matters}

如果您正在运行多租户设置（每个客户、每个智能体或每个环境一个记忆库），您不再需要通过仪表板管理密钥。您的应用程序可以动态配置作用域密钥，按计划轮换它们，并在访问结束时立即撤销它们。

与[记忆库范围API键](/blog/2026/03/09/hindsight-document-upload#what-else-is-new)（3 月 9 日发布）相结合，这为您提供了完整的最低权限密钥层次结构：具有密钥创建器功能的父密钥管理每个锁定到特定记忆库的子密钥。

## 开始 {#get-started}

编程式 API 密钥管理现已在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 中提供。使用密钥创建器功能创建密钥，以开始通过 API 配置子密钥。
