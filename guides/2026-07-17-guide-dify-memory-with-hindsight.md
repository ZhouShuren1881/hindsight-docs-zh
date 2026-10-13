---
title: "指南：使用 Hindsight 为 Dify 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, dify, agents, memory]
description: "通过插件为 Dify 工作流、聊天流和智能体应用添加存储、召回和反思工具。"
image: /img/guides/guide-dify-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Dify 添加记忆](/img/guides/guide-dify-memory-with-hindsight.svg)

插件添加存储、召回和反思三个工具，与 LLM、搜索和其他节点一起使用，让运行间有长期记忆。

Dify 可视化构建默认跨运行无状态，插件采用原生节点模式：存储内容、LLM 前召回、或在库上综合反思。

本指南介绍安装、凭据、节点和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. Plugins → Install Plugin 安装 Hindsight。
> 2. 添加 API URL 和 API Key。
> 3. LLM 前添加召回节点。
> 4. 存储节点写入新内容。
> 5. 验证后续召回。

## 前提条件 {#prerequisites}

开始前确认：

- 可安装插件和构建流程的 Dify。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 仪表盘 API 密钥，无认证自托管可选。

## 步骤 1：安装插件 {#step-1-install-the-plugin}

Plugins → Install Plugin 中选择：

- **Marketplace（市场）**：发布后搜索 Hindsight。
- **GitHub**：vectorize-io/hindsight 的 hindsight-integrations/dify。
- **Local（本地）**：上传 .difypkg。

安装后出现在工作流编辑器 Tools。

## 步骤 2：添加凭据 {#step-2-add-your-hindsight-credentials}

打开插件：

- **API 地址（API URL）**：默认云端，自托管修改。
- **API 密钥（API Key）**：hsk_...，无认证自托管可选。

无密钥可[免费注册 Cloud](https://ui.hindsight.vectorize.io)或[自托管](https://hindsight.vectorize.io/developer/installation)。

## 步骤 3：接入工作流 {#step-3-wire-the-tools-into-a-workflow}

像其他节点放置三个工具。

- **Retain（记忆存储）**：Bank ID 首次自动建库、Content 原文、可选逗号 Tags。返回后异步提取。
- **Recall（记忆召回）**：Bank ID、自然 Query、Budget（low/mid/high）、Max Tokens、可选 Tags，返回 results 数组。
- **Reflect（反思）**：Bank ID、问题 Query、Budget，返回 text。

典型是 LLM 前召回历史、运行后同库存新。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 获得什么 {#what-you-get}

普通节点可用于聊天流、工作流、应用，无需离开可视化：

- **支持助手**：工单结束存解决，新工单召回相似问题供 LLM 首次回复。
- **销售教练**：每通话存摘要，下次按潜在客户名召回接触历史到准备文档。
- **知识库智能体**：文档存储、聊天召回，事实提取、去重和时间感知，而非仅向量。

## 验证有效 {#verify-that-memory-is-working}

推荐顺序：

1. 存储节点结束流程。
2. 存独特决策或客户事实。
3. 第二流程同 ID 召回。
4. 查询此前。
5. results 确认。

返回此前即有效。

## 常见错误 {#common-mistakes}

### ID 不同 {#mismatched-bank-ids}

同 ID 才共享，空结果先核对写入库。

### 立即召回 {#testing-recall-immediately-after-retain}

异步提取，立即可能不可搜。

### 凭据错误 {#missing-or-wrong-credentials}

核对后端 URL 和 Cloud 必需密钥。

### 混淆反思与召回 {#treating-reflect-like-recall}

召回数组供 LLM，反思直接综合 text。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，插件 URL 指自托管，无认证密钥可选。

### 插件在哪里？ {#where-does-the-plugin-appear-in-dify}

编辑器 Tools。

### 如何限定？ {#how-is-memory-scoped}

按 Bank ID，各库独立，节点决定。

### 用哪个工具？ {#which-tool-should-i-use}

存内容 Retain，LLM 前 Recall，直接综合 Reflect。

## 后续步骤 {#next-steps}

- 如需托管，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Dify 集成文档](/sdks/integrations/dify)。
