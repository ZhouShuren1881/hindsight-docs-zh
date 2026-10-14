---
title: "指南：使用 Hindsight 为 Dify 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, dify, agents, memory]
description: "通过 Hindsight Dify 插件，为任意 Dify 工作流、聊天流或智能体应用添加 Retain、Recall 和 Reflect 工具。"
image: /img/guides/guide-dify-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Dify 添加记忆](/img/guides/guide-dify-memory-with-hindsight.svg)

如果你想为 Dify 添加 **Hindsight 记忆**，最直接的方式是安装 Hindsight Dify 插件。它提供 Retain（存入）、Recall（召回）和 Reflect（反思）三个工具，可像其他 LLM、搜索和工具节点一样，添加到任意 Dify 工作流中。这样，Dify 就能在多次运行之间保留长期记忆，而不必让每次工作流执行都从无状态开始。

这很适合 Dify：它是一个可视化工作流构建器，工具和插件生态也在不断壮大，但默认情况下，工作流在多次运行之间不保留状态。该插件采用 Dify 一贯的节点模式：放置 Retain 节点来存储内容，在 LLM 步骤之前放置 Recall 节点来获取相关上下文，或者放置 Reflect 节点，对一个记忆库提出综合性问题。

本指南将介绍如何安装插件、添加 Hindsight 凭据、把这三个工具接入工作流，以及如何通过一个快速验证流程确认记忆确实在发挥作用。操作时可以同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 在 Dify 中进入 **Plugins → Install Plugin**，安装 **Hindsight** 插件。
> 2. 打开 Hindsight 插件，添加 **API URL** 和 **API Key** 凭据。
> 3. 在 LLM 步骤前添加 **Recall** 节点，获取相关上下文。
> 4. 添加 **Retain** 节点，将新内容存入记忆库。
> 5. 验证后续运行能否召回先前存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认你具备以下条件：

- 一个可以安装插件和构建工作流的 Dify 实例
- 一个可访问的 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 从控制台获取的 Hindsight API 密钥（对于未启用身份验证的自托管实例，此项可选）

## 步骤 1：安装插件 {#step-1-install-the-plugin}

在 Dify 控制台中进入 **Plugins → Install Plugin**，然后选择以下一种方式：

- **Marketplace** — 搜索 `Hindsight`（发布后）
- **GitHub** — 从 `vectorize-io/hindsight` 安装（路径为 `hindsight-integrations/dify`）
- **Local** — 上传 `.difypkg` 归档文件

安装后，**Hindsight** 插件会出现在工作流编辑器的 **Tools** 下。

## 步骤 2：添加 Hindsight 凭据 {#step-2-add-your-hindsight-credentials}

打开 Hindsight 插件并添加凭据：

- **API URL** — 默认值为 `https://api.hindsight.vectorize.io`（Cloud）；如果使用自托管服务器，请改为对应地址
- **API Key** — 你的 `hsk_...` 密钥（对于未启用身份验证的自托管实例，此项可选）

如果你还没有密钥，可以在免费套餐中[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)，然后从控制台获取密钥；也可以[自托管](https://hindsight.vectorize.io/developer/installation)服务器。

## 步骤 3：将工具接入工作流 {#step-3-wire-the-tools-into-a-workflow}

该插件提供三个工具，你可以像放置其他 Dify 节点一样放置它们。

- **Retain** — 将自由文本内容存入记忆库。字段包括 **Bank ID**（要写入的记忆库，首次使用时会自动创建）、**Content**（要存入的自由文本）和可选的 **Tags**（逗号分隔）。调用返回后，Hindsight 会异步提取事实。
- **Recall** — 在记忆库中搜索与查询相关的记忆。字段包括 **Bank ID**、**Query**（自然语言查询）、**Budget**（`low` / `mid` / `high`）、**Max Tokens**（返回内容的 token 数上限）和可选的 **Tags**。它会返回一个 `results` 数组。
- **Reflect** — 获取由 LLM 综合生成的记忆库答案。字段包括 **Bank ID**、**Query**（要回答的问题）和 **Budget**（`low` / `mid` / `high`）。它会返回 `text` 字段。

一种常见的工作流是：在 LLM 步骤前放置 **Recall** 节点以提供历史信息，再在运行结束后放置 **Retain** 节点，将新内容存回同一个记忆库。

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall)和 [Hindsight 的 Retain API](/developer/api/retain)。

## 你将获得什么 {#what-you-get}

这些工具是普通的 Dify 节点，因此你无需离开可视化构建器，就能在聊天流、工作流和智能体应用中使用记忆：

- **客户支持助手** — 每次工单关闭时都存入解决方案。处理新工单时，先对记忆库执行 Recall，以找出类似的历史问题，再把上下文交给 LLM 节点起草第一条回复。
- **销售通话辅导** — 每次通话结束后都存入通话摘要。下一次通话准备前，按潜在客户姓名执行 Recall，将此前所有接触记录提取到每日准备文档中。
- **知识库智能体** — 存入上传的文档；聊天流使用 Recall，而不只依赖向量数据库检索，从而获得经过事实提取、去重并考虑时间因素的结果。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下顺序进行测试：

1. 运行一个以 **Retain** 节点结束、并向记忆库写入内容的工作流
2. 存入一条容易辨认的事实，例如某项决定或客户详情
3. 再运行一个工作流，使用 **Recall** 节点读取相同的 **Bank ID**
4. 查询刚才存入的事实
5. 确认该事实出现在 `results` 数组中

如果 Recall 节点能找到先前运行存入的内容，说明设置已生效。

## 常见错误 {#common-mistakes}

### Bank ID 不一致 {#mismatched-bank-ids}

只有使用相同的 **Bank ID**，Recall 和 Retain 才会访问同一份记忆。如果后续 Recall 没有返回内容，请检查它指向的记忆库是否就是先前 Retain 写入的那个。

### Retain 后立即测试 Recall {#testing-recall-immediately-after-retain}

Retain 调用返回后，事实仍会异步提取。如果 Retain 一结束就立即执行 Recall，这些事实可能还无法搜索到。

### 凭据缺失或错误 {#missing-or-wrong-credentials}

如果工具报错，请确认 **API URL** 指向你的后端，并且已设置 **API Key**（Hindsight Cloud 要求提供密钥）。

### 把 Reflect 当成 Recall {#treating-reflect-like-recall}

Recall 返回包含记忆的 `results` 数组；Reflect 则返回综合生成的 `text` 答案。使用 Recall 为 LLM 步骤提供内容；如果你想直接获得综合后的答案，则使用 Reflect。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要，自托管的 Hindsight 服务器也可以使用。将插件的 **API URL** 指向该服务器即可；对于未启用身份验证的实例，API Key 是可选的。

### 插件会显示在 Dify 的哪里？ {#where-does-the-plugin-appear-in-dify}

安装后，**Hindsight** 插件会显示在工作流编辑器的 **Tools** 下。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

由 **Bank ID** 决定。每个记忆库都是独立的存储空间，你可以为每个工具节点选择要读取或写入的记忆库。

### 应该使用哪个工具？ {#which-tool-should-i-use}

使用 **Retain** 存储内容，使用 **Recall** 在 LLM 步骤前获取相关记忆，使用 **Reflect** 获取由 LLM 综合生成的记忆库答案。

## 后续步骤 {#next-steps}

- 如果你需要托管后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io)开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [Dify 集成文档](/sdks/integrations/dify)
