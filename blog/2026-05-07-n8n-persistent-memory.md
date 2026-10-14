---
title: "每个 n8n 工作流都缺少的记忆层"
description: "Hindsight 的全新社区节点为任何 n8n 工作流加入持久记忆：Retain、Recall、Reflect。工作流会在多次运行中不断积累，而不是每次重置。"
authors: [benfrank241]
date: 2026-05-07
tags: [hindsight, n8n, integration, memory, agents, workflows, no-code, tutorial]
image: /img/blog/n8n-persistent-memory.webp
---

![每个 n8n 工作流都缺少的记忆层](/img/blog/n8n-persistent-memory.webp)

[n8n](https://n8n.io) 是现代自动化的连接枢纽。[Slack](https://api.slack.com)、Gmail、Stripe、Notion、Sheets、[Zendesk](https://developer.zendesk.com)、[Gong](https://gong.io)、[OpenAI](https://platform.openai.com)、Anthropic 等 500 多种集成，由一个开源工作流引擎连接起来；你可以自行托管，也可以使用 n8n Cloud。只要某项服务提供 API，平台大概就能把它接入工作流。

一直以来，这类工作流都存在一个问题：每次运行都从零开始。刚刚关闭 Zendesk 工单的工作流，并不知道昨天也运行过。销售通话摘要器不知道上周与同一位潜在客户通话时聊了什么。回答问题的 Slack 机器人，也不记得五分钟前刚回答过的问题。

我们刚刚推出了一个解决方案。**Hindsight 社区节点通过三个操作——Retain、Recall 和 Reflect——为任何 n8n 工作流加入持久记忆。** 把它和平台上其他 500 多种集成一起接入，工作流就不再是无状态的，而能随着每次运行不断积累信息。

<!-- truncate -->

## 概要 {#tldr}

- 全新的 `@vectorize-io/n8n-nodes-hindsight` 社区节点，让任何 n8n 工作流都能使用 Hindsight 的持久记忆层。
- 一个节点，三个操作：**Retain**（存入）、**Recall**（召回）、**Reflect**（由 LLM 综合生成答案）。
- 可配合 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 或[自托管的 Hindsight](https://hindsight.vectorize.io/developer/installation) 使用。
- 自托管 n8n 用户现在即可前往“Settings → Community Nodes”安装；**n8n Cloud 的安装仍在等待 Verified Node 审核**。
- 下文提供实际用例：从每张已关闭工单中学习的客户支持工作流、记住每次过往接触的销售通话教练，以及与用户持续互动并积累信息的 Slack 机器人。

---

## 为什么这对 n8n 尤其重要 {#why-this-matters-for-n8n-specifically}

其他自动化平台和 n8n 一样，都有工作流触发、执行、然后遗忘的问题。由于人们使用 n8n 构建的工作流类型，这个问题在 n8n 上尤其突出。

看一个典型的 n8n 工作流图：触发器启动流程（例如 webhook、cron 或表单提交），数据经过增强节点（例如查询 Sheets、从 CRM 获取信息），接着进入 LLM 节点（例如 OpenAI、Anthropic、Cohere），然后写回某处（例如发送 Slack 消息、电子邮件或更新工单）。工作流结束后，刚刚发生的一切就都消失了。

对于一次性自动化，这没有问题。但人们越来越多地用 n8n 构建以下工作流，这种遗忘就会带来切实的不便：

- **面向客户的自动化**：多次运行时，应始终如一地对待同一个人。
- **融入 AI 的工作流**：LLM 步骤若能利用先前的上下文，效果会好得多。
- **长期运行的运营流程**：每次运行都可以利用此前所有运行中积累的信息。

没有记忆时，工作流中的 LLM 只知道你在本次执行的提示中提供的内容。有了记忆，LLM 就能获取与当前输入相关的信息；这些信息是在此前每次运行中逐步积累的。

这就是普通工作流与会随着使用而改进的系统之间的区别。

---

## Hindsight 节点的作用 {#what-the-hindsight-node-does}

这个社区节点会在 n8n 的节点面板中添加一个 **Hindsight** 节点。使用时，你可以在其中选择三种操作之一。

### Retain：将内容存入记忆库 {#retain--store-content-into-a-memory-bank}

在任何会产生值得记住的信息的环节放入 Retain 节点。Zendesk 工单关闭了？存入工单摘要。Gong 通话结束了？存入通话记录。收到表单提交？存入相关字段。

你只需提供文本。Hindsight 的存入流程会在后台异步提取结构化事实、与记忆库中已有内容去重，并更新记忆库的心智模型，不会阻塞工作流。

| 字段 | 说明 |
|---|---|
| Bank ID | 要存入内容的记忆库（首次使用时自动创建） |
| Content | 要存入的文本 |
| Tags | 供后续筛选使用的逗号分隔标签 |

### Recall：检索记忆库 {#recall--search-a-memory-bank}

在任何能从先前上下文中受益的步骤之前放入 Recall 节点；最常见的是放在 OpenAI、Anthropic 或 Cohere 节点之前。提供一个自然语言查询（通常是用户当前的消息，或根据触发器数据构造的查询），节点便会从记忆库中返回相关性最高的记忆。

| 字段 | 说明 |
|---|---|
| Bank ID | 要检索的记忆库 |
| Query | 自然语言查询 |
| Budget | `low` / `mid` / `high`，控制检索深度 |
| Max Tokens | 返回记忆文本的 token 上限 |
| Tags Filter | 可选的标签筛选条件 |

输出是一个 `results` 数组，其中每项都是一条记忆，包含文本、分数和元数据。你可以直接把它作为上下文传入 LLM 提示。

### Reflect：获取由 LLM 综合生成的答案 {#reflect--get-an-llm-synthesized-answer}

大多数其他记忆集成并不提供 Reflect。它不会直接返回原始记忆，而是通过 Hindsight 的反思层处理查询，并返回附有引用的综合答案。

| 字段 | 说明 |
|---|---|
| Bank ID | 记忆库 |
| Query | 你希望得到答案的问题 |
| Budget | `low` / `mid` / `high` |

当你想问“我们对这位客户了解多少？”或“总结最近 50 张支持工单中的规律”时，Reflect 就很合适；如果你只是想“找出与查询最接近的记忆”，则应使用 Recall。

实际上，Recall 是最常用的操作；工作流的写入路径会自动执行 Retain；Reflect 则是那个让人惊喜的工具——通常要到第三次想让工作流总结整个记忆库时，你才会意识到自己需要它。

---

## 设置 {#setup}

这个节点以 `@vectorize-io/n8n-nodes-hindsight` 包的形式发布在 npm 上。

### 在自托管 n8n 上安装 {#install-on-self-hosted-n8n}

在 n8n 界面中（参阅[社区节点安装文档](https://docs.n8n.io/integrations/community-nodes/installation/)）：

1. 前往 **Settings → Community Nodes → Install**。
2. 输入 `@vectorize-io/n8n-nodes-hindsight`。
3. 点击 **Install**。
4. 重启 n8n。

也可以通过 CLI 安装：

```bash
cd ~/.n8n/custom
npm install @vectorize-io/n8n-nodes-hindsight
```

重启后，节点面板中就会出现 **Hindsight** 节点。

### 在 n8n Cloud 上安装 {#install-on-n8n-cloud}

**目前还差这一步。** n8n Cloud 只允许安装通过 [Verified Node 审核](https://docs.n8n.io/integrations/community-nodes/)的社区节点。我们已将 Hindsight 节点提交至 [n8n Creator Portal](https://creators.n8n.io)，其中包含由 GitHub Actions 发布、带有来源证明签名的 npm 包（这是 n8n 在 5 月新增的一项硬性要求）。审核通常需要数周。获批后，该节点会带有验证徽章，显示在 n8n Cloud 的内置节点查找器中，用户只需点击一次即可安装。**审核通过后，我们会更新这篇文章。**

### 配置凭据 {#configure-the-credential}

无论使用自托管版本还是 Cloud，都需要配置 Hindsight API 凭据：

1. 在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 注册（提供免费套餐），或[自托管 Hindsight](https://hindsight.vectorize.io/developer/installation)。
2. 从 Hindsight 控制台获取 API key。
3. **在 n8n 中**新建 **Hindsight API** 凭据：
   - **API URL**：`https://api.hindsight.vectorize.io`（或你的自托管实例 URL）。
   - **API Key**：填写你的 `hsk_...` 密钥（如果连接的是无需身份验证的自托管实例，则留空）。

设置到此完成。现在，你可以在任何工作流中使用 Hindsight 节点了。

---

## 由此可以构建的三种工作流 {#three-workflows-this-unlocks}

下面用三个具体模式来说明。每一种都是你现在就可以搭建的工作流。

### 1. 从每张工单中学习的客户支持助手 {#1-the-customer-support-assistant-that-learns-from-every-ticket}

工作流模式：

- **触发器：** 收到 Zendesk 的“ticket closed” webhook。
- **Hindsight Retain：** 内容 = 工单对话与解决方案；标签 = `support`、`<product-area>`。
- **触发器：** 收到 Zendesk 的“ticket created” webhook。
- **Hindsight Recall：** 查询 = 新工单的主题和正文；标签筛选 = `support`。
- **OpenAI：** 提示内容为“以下是类似的历史工单及其解决方案。起草第一条回复。”并注入召回的记忆。
- **Zendesk：** 将草稿作为内部备注发布。

几周后，记忆库里已经积累了大量已关闭工单。处理新工单的工作流不再起草泛泛的回复，而是能找出上个月遇到同一问题时真正有效的解决办法。机器人不只是回答问题，记忆还会不断积累。

### 2. 记住每次接触的销售通话教练 {#2-the-sales-call-coach-that-remembers-every-touchpoint}

工作流模式：

- **触发器：** 收到 Gong 的“call ended” webhook。
- **OpenAI：** 生成通话的结构化摘要（关键话题、决定、障碍和后续步骤）。
- **Hindsight Retain：** 内容 = 结构化摘要；标签 = `<account>`、`sales`、`<call-type>`。
- **触发器：** 每天早上 7 点运行的 cron。
- **针对每场即将举行的会议：** 调用 Hindsight Recall，查询 = `<prospect-name>`；标签筛选 = `<account>`。
- **OpenAI：**“根据这些过往接触记录，撰写会前简报。”
- **Slack / 电子邮件：** 发送简报。

销售代表下次与之前已经交谈过三次的潜在客户通话时，会收到一份确实涵盖那三次对话的简报，而不是一份需要他们记得手动整理的摘要。

### 3. 建立持续关系的 Slack 机器人 {#3-the-slack-bot-that-builds-a-continuous-relationship}

工作流模式：

- **触发器：** Slack 私信中提及机器人。
- **Hindsight Recall：** 查询 = 用户的消息；标签筛选 = `slack:<user-id>`。
- **OpenAI：** 结合召回的上下文回答问题。
- **Slack：** 发送回复。
- **Hindsight Retain：** 内容 = 本轮对话（问题和答案）；标签 = `slack`、`<user-id>`。

运行两周后，机器人就不会再反复询问用户使用什么技术栈、有哪些偏好、已经尝试过什么。它能记住这些信息，是因为每轮对话都会被存入记忆，而且每轮新对话开始前都会先召回相关记忆。

这是在 n8n 中展示记忆如何不断积累的最快、最简单方式：几个节点、一个免费的 Hindsight Cloud 账户，以及一个 Slack 工作区。

---

## 记忆层位于何处 {#where-the-memory-layer-sits}

理解这一架构的关键心智模型是：**n8n 管理工作流图；Hindsight 管理记忆层；二者通过社区节点使用 HTTP 连接。**

这带来几个实用优势：

- 同一个 Hindsight 记忆库可以供多个 n8n 工作流共享。如果支持工作流的写入和销售工作流的读取都指向相同的 `bankId`，销售工作流就能看到支持工作流写入的内容。
- n8n 也可以和其他 Hindsight 集成共用同一个记忆库。写入该库的 [Claude Code 插件](https://hindsight.vectorize.io/integrations)可以让 n8n 工作流读取其中内容，反过来也一样。
- 使用标签限定范围。例如，`tags: ["user:42", "shared"]` 配合 `tagsMatch: "any_strict"`，可在一个记忆库中同时实现按用户隔离和共享知识。

对于多租户工作流（例如需要隔离每位客户自动化流程的 SaaS），[记忆库参考文档](https://hindsight.vectorize.io/developer/api/memory-banks)介绍了按租户限定范围的模式。最常见的做法是每个租户使用一个记忆库；n8n 的表达式语言可以根据触发器载荷动态设置 `bankId` 字段。

---

## 接下来的计划 {#whats-next}

n8n 方面近期有两项计划。

**在 n8n Cloud 上安装。** 我们已将 Hindsight 节点提交给 n8n Creator Portal，目前正在等待 Verified Node 审核（通常需要数周）。获批后，n8n Cloud 用户即可从内置节点查找器直接安装，并看到验证徽章。节点代码、操作和文档都相同，只是少一个安装步骤。审核完成后，我们会更新这篇文章和文档。

**增加更多内置模式。** 上文的三个示例工作流是最直接的起点。我们预计接下来会增加：可自动应用标签的标签感知型 Retain 模板（Retain 可接收结构化载荷并自动添加标签）、用于根据现有数据回填记忆库的批量 Retain，以及一套子工作流和模板入门包，提供可直接导入的工作流 JSON，覆盖最常见的模式。

---

## 回顾 {#recap}

- n8n 是自动化的连接枢纽，但工作流默认是无状态的。
- 全新的 Hindsight 社区节点通过 Retain、Recall、Reflect 三种操作弥补这一缺口。
- 将节点接入任何工作流，并与 n8n 所连接的 500 多种应用配合使用，工作流就能不断积累信息，而不是每次重置。
- 自托管 n8n：现在即可前往 Settings → Community Nodes 安装。
- n8n Cloud：仍在等待 Verified Node 审核通过；获批后我们会更新。

如果你一直在 n8n 中构建包含 LLM 步骤、面向客户的界面，或任何应该随着使用而变得更智能的自动化流程，那么缺少的正是记忆层。一个节点、三种操作，以及你的整个工作流图和 500 多种集成。

---

## 延伸阅读 {#further-reading}

- [每个智能体运行框架都缺少的那一层](https://hindsight.vectorize.io/blog/2026/05/04/agent-harness-needs-memory)——进一步说明了为什么记忆是任何智能体运行时都缺少的那一层。
- [你的智能体并非健忘，它只是从未获得记忆。](https://hindsight.vectorize.io/blog/2026/04/23/your-agent-is-not-forgetful)——关于这一问题的基础论述。
- [Hindsight 集成](https://hindsight.vectorize.io/integrations)——支持的客户端、运行框架和框架完整列表（n8n 是最新加入的集成）。
- [记忆库参考文档](https://hindsight.vectorize.io/developer/api/memory-banks)——项目、团队和按租户隔离的范围设置模式。

---

## 后续步骤 {#next-steps}

- [注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)，几分钟内即可获取 API key。
- 在自托管 n8n 上安装 [Hindsight n8n 节点](https://www.npmjs.com/package/@vectorize-io/n8n-nodes-hindsight)。
- 阅读 [n8n 集成文档](https://hindsight.vectorize.io/integrations)，了解完整的操作说明。
- 浏览[记忆库参考文档](https://hindsight.vectorize.io/developer/api/memory-banks)，了解多租户范围设置模式。
- 关注本文，等待 Verified Node 审核完成后的 n8n Cloud 安装更新。

---
