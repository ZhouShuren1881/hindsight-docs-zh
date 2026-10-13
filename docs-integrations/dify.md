---
sidebar_position: 33
title: "Dify 持久记忆Hindsight |整合"
description: "使用Hindsight为任何Dify工作流程添加持久的长期记忆。插件提供记忆存储、记忆召回和反思工具 - 将它们与其他LLM、搜索和工具节点一起放入任何聊天流或工作流程中。"
---

# Dify {#dify}

的持久记忆 [Dify](https://dify.ai) 工作流程通过 [Hindsight](https://hindsight.vectorize.io)。的HindsightDify插件添加了三个工具 - **记忆存储**，**记忆召回**，**反思** — 与任何其他产品一起工作  工作流、聊天流和智能体应用程序中的Dify节点。

[查看更新日志 →](/changelog/integrations/dify)

## 为什么这很重要 {#why-this-matters}

Dify是最流行的开源软件之一LLM应用程序平台 — 可视化工作流程构建器、提示管理和不断增长的tool/plugin生态系统。直到现在，Dify工作流程已**各次运行之间无状态**。与Hindsight工具您可以：

- **记忆存储** 将每一份已关闭的支持票、销售电话记录或表格提交到记忆库中
- **记忆召回** 之前的相关上下文LLM步骤让模型看到之前的历史
- **反思** 在工作流程中提出综合性问题（“我们对该客户了解多少？”）

## 安装 {#installation}

在你的Dify仪表板转到 **插件 → 安装插件（Plugins → Install Plugin）**，然后选择以下一项：

- **市场（Marketplace）** — 搜索 `Hindsight`（已发布）
- **GitHub** — 从 安装 `vectorize-io/hindsight`（路径`hindsight-integrations/dify`)
- **本地** — 上传 `.difypkg`存档

安装后，**Hindsight**插件出现在下 工作流程编辑器中的 **工具**。

## 设置 {#setup}

:::tip 推荐：Hindsight Cloud
[免费注册](https://ui.hindsight.vectorize.io) 并获取一个 API 密钥 — 无需自托管。
:::

1. **注册** [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）或 [自托管](/developer/installation)
2. **获取 API 密钥** 来自Hindsight仪表板
3. **在 Dify 中**，打开Hindsight插件并添加凭据：
   - **API URL** — 默认为 `https://api.hindsight.vectorize.io`（云）；更改为自托管
   - **API 密钥** — 你的 `hsk_...` 密钥（自托管未经身份验证的实例可选）

## 工具 {#tools}

### 记忆存储 {#retain}

将内容存储在记忆库中。 Hindsight 在调用返回后异步提取事实。

|田野|说明|
|---|---|
|记忆库ID|记忆库存储（首次使用时自动创建）|
|内容|自由文本内容到记忆存储|
|标签|可选的逗号分隔标签|

### 记忆召回 {#recall}

在记忆库中搜索与查询相关的记忆。返回一个`results`数组。

|田野|说明|
|---|---|
|记忆库ID|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high`|
|最大 token 数|返回内容的 token 数上限|
|标签|可选标签过滤器（逗号分隔）|

### 反思 {#reflect}

获取LLM-记忆库中的综合答案。退货`text`。

|田野|说明|
|---|---|
|记忆库ID|记忆库|
|查询|要回答的问题|
|预算|`low` / `mid` / `high`|

## 工作流程示例 {#example-workflows}

**客服助手** — 每张已关闭的 Zendesk 票证都会保留分辨率。每张新票都以针对记忆库的记忆召回开始，以显示过去类似的问题，然后将该上下文传递给OpenAI/Anthropic起草第一个回复。

**销售通话教练** — Kong webhook →Hindsight记忆存储（调用摘要）。在每次下一次准备通话之前，对潜在客户的姓名进行记忆，以提取之前的每个接触点，然后将其格式化为每日准备文档。

**知识库智能体** — 每个上传的文档都会被分块并保留。这Dify聊天流使用记忆召回而不是仅向量数据库检索，获得事实提取、重复数据删除、时间感知的结果。

## 来源 {#source}

- GitHub：[`hindsight-integrations/dify`](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/dify)
