---
title: "每个 n8n 工作流程都缺少记忆层"
description: "Hindsight 的新社区节点为任何 n8n 工作流程添加了持久记忆 - 记忆存储、记忆召回、回忆。工作流程在运行之间复合而不是重置。"
authors: [benfrank241]
date: 2026-05-07
tags: [hindsight, n8n, integration, memory, agents, workflows, no-code, tutorial]
image: /img/blog/n8n-persistent-memory.webp
---

![每个 n8n 工作流程都缺少记忆层](/img/blog/n8n-persistent-memory.webp)

[n8n](https://n8n.io)是现代自动化的结缔组织。 [松弛](https://api.slack.com)、Gmail、Stripe、Notion、Sheets、[Zendesk](https://developer.zendesk.com)、[锣](https://gong.io)、[OpenAI](https://platform.openai.com)、Anthropic — 由开源工作流引擎串连在一起的 500 多个集成，您可以自行托管或在 n8n Cloud 上运行。如果某个事物具有 API，平台可能可以将其连接到工作流程中。

始终存在一个差距。每个工作流程运行都从零开始。刚刚关闭 Zendesk 票证的工作流程不知道工作流程昨天运行过。销售电话总结员不知道上周与同一潜在客户的电话会议上说了些什么。回答问题的 Slack 机器人不记得它五分钟前刚刚回答的问题。

我们刚刚发布了修复程序。 **Hindsight社区节点通过三个操作将持久记忆添加到任何 n8n 工作流程中：存储记忆、记忆召回和反思。** 将其与平台的其他 500 多个集成一起放入，您的工作流程将不再是无状态的，而是开始复合。

<!-- truncate -->

## 概览 {#tldr}

- 新的`@vectorize-io/n8n-nodes-hindsight`社区节点允许任何n8n工作流程访问Hindsight的持久记忆层
- 一个节点，三个操作：**记忆存储
子代理完成并返回后，**（存储）、**记忆召回**（搜索）、**反思**（LLM-合成答案）
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)或[自托管Hindsight](https://hindsight.vectorize.io/developer/installation)配合使用
- 立即通过自托管 n8n 上的设置 → 社区节点安装； **n8n 云安装正在等待验证节点审核**
- 下面的实际使用示例：从每张已关闭的工单中学习的支持工作流程、记住每个先前接触点的销售电话教练、与用户建立持续关系的 Slack 机器人

---

## 为什么这对 n8n 特别重要 {#why-this-matters-for-n8n-specifically}

所有其他自动化平台都存在与 n8n 相同的问题——工作流程启动、完成，然后忘记。 n8n 比大多数人更难使用，因为人们实际使用它的目的。

​​看一个典型的 n8n 图。触发触发器（webhook、cron、表单提交）。数据流经丰富节点（在表格中查找，从 CRM 获取）。它命中LLM节点（OpenAI、Anthropic、Cohere）。它会在某个地方写回（Slack 消息、电子邮件、票证更新）。工作流程结束。刚刚发生的一切都已经过去了。

这对于一次性自动化来说很好。人们越来越多地在 n8n 中构建工作流程，这确实令人痛苦：

- **面向客户的自动化** 应该在运行中一致地对待同一个人
- **AI-增强的工作流程**，其中 LLM 步骤在先有上下文的情况下会更好
- **长期运行的运营管道**，每次运行都可以由之前的每次运行通知

如果没有记忆，工作流程中的LLM只知道您在单次执行的提示中塞入的内容。借助记忆，LLM 可以获得与当前输入相关的内容的记忆——在之前的每次运行中建立起来。

这就是工作流程和随使用而改进的系统之间的区别。

---

## Hindsight节点的作用 {#what-the-hindsight-node-does}

社区节点向您的 n8n 节点面板添加单个 **Hindsight** 条目。在其中您可以选择三种操作之一。

### 记忆存储 — 将内容存储到记忆库中 {#retain--store-content-into-a-memory-bank}

在生成值得记住的东西的任何地方放置一个记忆存储节点。 Zendesk 票证关闭？ 记忆存储票证摘要。锣通话结束？ 记忆存储成绩单。表单提交落地？ 记忆存储相关领域。

你给它自由文本。 Hindsight 的记忆存储管道异步提取结构化事实，对记忆库中已有的内容进行重复数据删除，并更新记忆库的心智模型，而不会阻塞您的工作流程。

|田野|说明|
|---|---|
|记忆库ID|存储在哪个记忆库中（首次使用时自动创建）|
|内容|记忆存储的文本|
|标签|逗号分隔的标签，供以后过滤|

### 记忆召回 — 搜索记忆 记忆库 {#recall--search-a-memory-bank}

在受益于先前上下文的任何步骤之前删除记忆召回节点 - 最常见的是在OpenAI / Anthropic / Cohere 节点之前。您给它一个自然语言查询（通常是用户的当前消息，或根据触发器数据构建的查询）。它从记忆库中返回最相关的记忆。

|田野|说明|
|---|---|
|记忆库ID|记忆库搜索|
|查询|自然语言查询|
|预算|`low` / `mid` / `high` — 控制检索深度|
|最大token数|返回记忆token上限|
|标签过滤器|可选标签过滤器|

输出是一个`results`数组——每个项目都是带有文本、分数和元数据的记忆。将其作为上下文直接传递到您的 LLM 提示符中。

### 反思 — 得到一个 LLM 综合答案 {#reflect--get-an-llm-synthesized-answer}

反思是大多数其他记忆集成所不提供的操作。不是返回原始记忆，而是通过 Hindsight 的反思层运行查询，并返回带有引用的综合答案。

|田野|说明|
|---|---|
|记忆库ID|记忆库|
|查询|你想回答的问题|
|预算|`low` / `mid` / `high`|

当您询问“我们对该客户了解多少？”时，这是正确的操作。或者“总结我们最近 50 个支持请求中的模式”，而不是“找到最接近匹配的记忆”。

在实践中，您最常使用记忆召回，记忆存储在工作流程的写入路径中是自动的，而反思是一个令人惊喜的工具——直到第三次您想要工作流程为您提供整个记忆库的总结答案时，您才意识到自己需要这个工具。

---

## 设置 {#setup}

节点在npm上发布为`@vectorize-io/n8n-nodes-hindsight`包。

### 在自托管 n8n 上安装 {#install-on-self-hosted-n8n}

在 n8n UI ([社区节点安装文档](https://docs.n8n.io/integrations/community-nodes/installation/)) 中：

1. 前往**设置→社区节点→安装**
2. 输入`@vectorize-io/n8n-nodes-hindsight`
3. 点击**安装**
4. 重新启动n8n

或通过 CLI：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重启后，节点面板中出现**Hindsight**节点。

### 安装在n8n云上 {#install-on-n8n-cloud}

**这是我们仍在等待的一件作品。** n8n Cloud 只允许安装通过[验证节点审查](https://docs.n8n.io/integrations/community-nodes/) 的社区节点。我们已将 Hindsight 节点提交给 [n8n 创作者门户](https://creators.n8n.io)，包括来自 GitHub 操作的出处签名的 npm 发布（5 月份添加的硬性要求 n8n）。审核通常需要几周时间。一旦获得批准，该节点将出现在 n8n Cloud 的产品内节点查找器中，并带有验证徽章并一键安装。 **我们将在发布后更新这篇文章。**

### 配置凭证 {#configure-the-credential}

无论您是在自托管还是云上，您都需要一个 Hindsight API 凭证：

1. **注册** [Hindsight Cloud](https://ui.hindsight.vectorize.io)（免费套餐）或 [自托管Hindsight](https://hindsight.vectorize.io/developer/installation)
2. **获取API钥匙
Hindsight 仪表板中的**
3. **在n8n**，创建一个新的**HindsightAPI**凭证：
   - **API 网址**: `https://api.hindsight.vectorize.io`（或您的自托管 URL）
   - **API 钥匙**：您的 `hsk_...` 密钥（如果您要访问未经身份验证的自托管实例，请留空）

这就是整个设置。 Hindsight 节点现在可在任何工作流程中使用。

---

## 这解锁了三个工作流程 {#three-workflows-this-unlocks}

三个具体图案使这更容易想象。每一个都是您今天就可以构建的工作流程。

### 1。从每张票证中学习的客户支持助理 {#1-the-customer-support-assistant-that-learns-from-every-ticket}

图案：

- **触发器：** Zendesk Webhook“票已关闭”
- **Hindsight 记忆存储：**内容=工单对话+解决；标签 = `support`, `<product-area>`
- **触发器：** 用于“创建票证”的 Zendesk Webhook
- **Hindsight 记忆召回：**查询=新工单的主题+正文；标签过滤器 = `support`
- **OpenAI：**提示=“这里有类似的过去的票证及其解决方案。起草第一个回复。”注入回忆的记忆
- **Zendesk：** 将草稿作为内部注释发布

关闭的票证流入记忆库几周后，新票证工作流程将停止起草通用响应，并开始显示自您上个月看到相同问题时起的实际修复。机器人不只是回答——它还在复合。

### 2。记住每个接触点的销售教练 {#2-the-sales-call-coach-that-remembers-every-touchpoint}

图案：

- **触发器：** “通话结束”的Gong webhook
- **OpenAI：** 生成通话的结构化摘要（关键主题、决策、阻碍因素、后续步骤）
- **Hindsight 记忆存储：** content = 结构化摘要；标签 = `<account>`、`sales`、`<call-type>`
- **触发器：** cron，每天早上 7 点
- **对于每个即将召开的会议：** Hindsight 记忆召回 with query = `<prospect-name>`;标签过滤器 = `<account>`
- **OpenAI：**“根据这些先前的接触点构建会前简报”
- **Slack /电子邮件：** 传达简报

下次，当销售代表与他们之前已经交谈过三次的潜在客户进行通话时，他们会收到一份实际上反映了所有三次对话的摘要，而不是他们必须记住写的手动缝合的摘要。

### 3。建立持续关系的 Slack 机器人 {#3-the-slack-bot-that-builds-a-continuous-relationship}

图案：

- **触发器：** Slack DM 提及
- **Hindsight 记忆召回：**查询=用户的消息；标签过滤器 = `slack:<user-id>`
- **OpenAI：** 使用注入的回忆上下文回答问题
- **松弛：**发表回复
- **Hindsight 记忆存储：**内容=对话轮次（问题+答案）；标签 = `slack`, `<user-id>`

两周后，机器人不再重新询问用户的堆栈、偏好以及已经尝试过的内容。它记得，因为每个回合都被保留，而每个新回合都以记忆召回开始。

这是在 n8n 内演示复合记忆的最小、最快的方法 — 几个节点、免费的 Hindsight Cloud帐户和 Slack 工作区。

---

## 记忆层所在的位置 {#where-the-memory-layer-sits}

制作此点击的心智模型：**n8n 拥有工作流程图； Hindsight拥有记忆层；他们通过社区节点通过 HTTP 进行连接。**

这意味着一些有用的东西：

- 相同的Hindsight记忆库可以在多个n8n工作流程之间共享。如果您将支持工作流的写入指向同一个 `bankId`，则销售工作流的读取可以看到它们。
- 相同的记忆库可以在 n8n 和其他 Hindsight 集成之间共享。您的 [Claude Code插件](https://hindsight.vectorize.io/integrations) 写入的记忆库可以由 n8n 工作流程读取，反之亦然。
- 标签是范围的方式。 `tags: ["user:42", "shared"]` 与 `tagsMatch: "any_strict"` 为您提供每个用户的隔离以及单个记忆库中的共享知识。

对于多租户工作流程（每个客户的自动化都应隔离的 SaaS），[记忆库参考](https://hindsight.vectorize.io/developer/api/memory-banks) 涵盖了每个租户的范围模式。最常见的模式是每个租户一个记忆库； n8n 的表达式语言可以轻松地根据触发负载动态设置 `bankId` 字段。

---

## 下一步是什么 {#whats-next}

n8n 方面的直接路线图有两部分。

**n8n 云安装。** 我们已将 Hindsight 节点提交到 n8n Creator Portal，目前正在接受验证节点审核（该过程通常需要几周时间）。一旦获得批准，n8n 云用户可以直接从产品内的节点查找器安装它，并带有验证徽章。相同的节点代码、相同的操作、相同的文档——只需少一步。审核完成后，我们将更新这篇文章和我们的文档。

**更多内置模式。** 上面的三个示例工作流程是明显的起点。我们期望接下来添加的模式是：标签感知记忆存储模板（因此记忆存储可以采用结构化有效负载并自动应用标签）、批处理记忆存储（用于从现有数据回填记忆库）以及子工作流/模板入门包，该包为最常见的形状提供可立即导入的工作流JSON。

---

## 回顾 {#recap}

- n8n 是自动化的结缔组织，但工作流程默认是无状态的
- 新的Hindsight社区节点通过三个操作缩小了这一差距：记忆存储、记忆召回、回忆
- 将其与 n8n 连接的 500 多个应用程序一起放入任何工作流程中，工作流程开始复合而不是重置
- 自托管 n8n：立即通过设置 → 社区节点安装
- n8n 云：等待验证节点批准；当它落地时我们会更新

如果您一直在 n8n 中构建涉及任何 LLM 步骤、任何面向客户的表面或任何应该通过使用变得更智能的东西的自动化，那么记忆层就是缺失的部分。一个节点、三个操作、整个工作流程图以及 500 多个集成。

---

## 延伸阅读 {#further-reading}

- [每个智能体运行框架中缺失的一层](https://hindsight.vectorize.io/blog/2026/05/04/agent-harness-needs-memory)——更广泛的案例解释了为什么记忆是任何智能体运行时中缺失的一层
- [你的智能体不会健忘。它从未被赋予记忆。](https://hindsight.vectorize.io/blog/2026/04/23/your-agent-is-not-forgetful) — 基本论证
- [Hindsight 集成](https://hindsight.vectorize.io/integrations) — 支持的客户端、工具和框架的完整列表（n8n 是最新的）
- [记忆库参考](https://hindsight.vectorize.io/developer/api/memory-banks) — 项目、团队和每租户隔离的范围模式

---

## 后续步骤 {#next-steps}

- [注册Hindsight Cloud](https://ui.hindsight.vectorize.io) 在几分钟内获得API钥匙
- 在您的自托管 n8n 上安装 [Hindsight n8n 节点](https://www.npmjs.com/package/@vectorize-io/n8n-nodes-hindsight)
- 阅读[n8n 集成文档](https://hindsight.vectorize.io/integrations)以获取完整操作参考
- 浏览 [记忆库参考](https://hindsight.vectorize.io/developer/api/memory-banks) 了解多租户范围模式
- 观看此帖子，了解验证节点审核完成后的 n8n 云安装更新
