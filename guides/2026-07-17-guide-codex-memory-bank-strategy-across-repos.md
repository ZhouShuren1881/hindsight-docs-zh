---
title: "指南：Codex CLI 跨代码库、缺陷和决策的记忆库策略"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, codex, bank-strategy, memory]
description: "Codex CLI 按代码库划分 Hindsight 记忆，让约定、缺陷历史和决策可检索，无关项目不混合。"
image: /img/guides/guide-codex-memory-bank-strategy-across-repos.svg
hide_table_of_contents: true
---

![指南：Codex CLI 跨代码库、缺陷和决策的记忆库策略](/img/guides/guide-codex-memory-bank-strategy-across-repos.svg)

好的 **Codex 记忆库策略**不是所有项目共用巨库。否则调数据库时可能召回前端样式，重要信号被掩埋。按库隔离保留各自约定、重复缺陷和决策。

本指南关注*组织记忆*。钩子已在提示前召回、轮次后存储，关键是内容落在哪里。正确划分记住认证重试原因，不带入无关发布细节。

尚未安装先按 [Codex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-codex-memory-with-hindsight)，再决定划分。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 按[配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-codex-memory-with-hindsight)安装钩子。
> 2. 启用 `dynamicBankId: true`、`dynamicBankGranularity: ["agent", "project"]`。
> 3. 保存约定、脆弱区域、调试和决策。
> 4. 仅跨库团队标准用固定共享 ID。
> 5. 同代码库后续会话验证。

## 编码记忆为何容易混乱 {#why-coding-memory-gets-messy-fast}

一周触及多个构建、测试和重复缺陷不同的代码库，全存 `codex` 后每提示需筛无关内容。

真实记忆却错库竞争预算，API 查询出现最近前端 lint。按库隔离只考虑当前库，保持准确。

## 每个代码库一个记忆库 {#one-bank-per-repo}

动态 ID 自动命名：

```json
{
  "dynamicBankId": true,
  "dynamicBankGranularity": ["agent", "project"]
}
```

保存 `~/.hindsight/codex.json`。project 为工作目录，agent 为名称，API 与前端目录分别存召回。

严格库隔离，无数据跨库，明天同库利用已有知识。

## 应存储什么 {#what-to-retain}

价值最大四类：

- **约定**：实际规则，如 FastAPI 加 asyncpg 而非 SQLAlchemy、lint、测试、分支发布，最常重复解释。
- **脆弱区域**：意外出错模块、部署前迁移、超时端点。风险笔记避免重踩。
- **调试历史**：根因值得保存，如认证 401 因时钟偏差、由某方案修复，重复事故快速召回。
- **工程决策**：重试更改、库选择、重构取舍。由 diff 重建昂贵，召回便宜。

默认 `retainMode` 为 `"full-session"`，结束记录由 Hindsight 提取，多数自然捕获。这些类别说明*有用*会话应明确表达约定或决策。

## 连接 Codex 与 Hindsight {#connect-codex-to-hindsight}

钩子、Cloud/本地、启用配置完整见 [Codex 指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-codex-memory-with-hindsight)，先接入再划分。

## 团队共享记忆库 {#a-shared-bank-for-team-repos}

提交约定、共享 CI、安全要求、内部库等跨代码库标准应在同处。

关闭动态，固定共享 ID：

```json
{
  "dynamicBankId": false,
  "bankId": "team-standards"
}
```

日常按代码库，全局约定共享。各集成同 ID 共享，队友一次保存其他可召回。

## 避免通用巨库 {#avoid-one-all-purpose-bank}

默认单库起初方便，项目越多，无关竞争越大，越难信任。

出现错项目细节就拆分。动态隔离，命名共享保留真跨库标准。全共享只适合全局个人习惯，而非多个不同代码库。

## 验证记忆是否有效 {#verify-that-memory-is-working}

应保持原代码库范围：

1. 一个库记录 lint 或重试决策。
2. 结束存储。
3. **同库**新会话询问，应返回。
4. **不同库**同问题，*不应*返回原答案。

第 3 召回、第 4 隔离就有效。遗漏核对 ID，泄漏检查动态。默认 `retainEveryNTurns=10`，测试临时设 1。

## 常见错误 {#common-mistakes}

### 所有内容单库 {#leaving-everything-on-one-bank}

默认 `codex`，未动态全部共享，多项目后嘈杂。

### 团队标准在项目库 {#putting-team-standards-in-a-per-repo-bank}

全局约定仅一库就失去价值，应固定共享。

### 期待他库上下文 {#expecting-one-repo-to-recall-anothers-context}

隔离严格，API 不应召回前端决策，这是功能。

### 会话结束前测试 {#testing-retain-before-a-session-ends}

full-session 按会话保存，中途或不足轮次可能未存，测试降低间隔。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，自托管或嵌入守护进程策略一样，连接见[配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-codex-memory-with-hindsight)。

### 按库还是共享？ {#per-repo-banks-or-one-shared-bank}

日常按库，全局标准加共享。

### 名字如何生成？ {#how-are-per-repo-banks-named}

动态从粒度字段默认智能体名和目录生成。

### 什么无需保存？ {#what-should-i-not-bother-retaining}

临时草稿和一次命令很少值得预算，聚焦约定、脆弱区域、根因和决策。

## 后续步骤 {#next-steps}

- 先按 [Codex 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-codex-memory-with-hindsight)安装。
- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Codex 集成文档](/sdks/integrations/codex)。
