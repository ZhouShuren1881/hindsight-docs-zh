---
title: "通过Hindsight为Paperclip智能体添加持久记忆"
authors: [benfrank241]
date: 2026-05-26T12:00
tags: [integrations, paperclip, agents, memory, guide, tutorial]
description: "只需安装一个插件即可为每一个Paperclip智能体提供长期记忆。 运行前的智能体记忆召回上下文和运行后的记忆存储学习，无需更改代码。"
image: /img/blog/paperclip-persistent-memory.webp
hide_table_of_contents: true
---

![通过Hindsight为Paperclip智能体添加持久记忆](/img/blog/paperclip-persistent-memory.webp)

[Paperclip](https://github.com/paperclipai/paperclip)像对待员工一样对待AI智能体。您定义组织结构图、分配角色、设置预算，并让智能体在该结构中自主工作。自 2026 年 3 月起已获得 67,000+ GitHub 星。五种适配器类型。一个插件系统，可以扩展每个智能体而不触及它们的代码。

​​组织结构图没有提供智能体：在运行之间保留的记忆。

每次Paperclip运行都从零开始。昨天对客户问题进行分类的智能体并不知道​​它昨天运行过。上周发现了不稳定测试的编码智能体本周将再次发现它。你的智能体在跑步过程中积累的知识在跑步结束的那一刻就消失了。

Hindsight插件修复了这个问题。安装一次，在“设置”中配置它，Paperclip实例中的每个智能体都会获得持久的[智能体记忆](https://vectorize.io/what-is-agent-memory/)，在运行、公司和重新启动之间复合。任何智能体都无需更改代码。

<!-- truncate -->

## 为什么Paperclip智能体需要记忆 {#why-paperclip-agents-need-memory}

Paperclip的公司模式使得记忆差距比单一智能体框架更严重。

考虑四智能体设置：支持智能体、文档智能体、分类智能体和代码审查智能体。每个智能体每周处理数十次跑步。每次运行都会产生决策、发现和背景，这些都会使下一次运行更快更好。没有记忆，所有这些都会消失。

支持智能体重新诊断三天前解决的同一问题。代码审查智能体标记了它已经学会忽略的相同误报。分类智能体将票发送给了错误的团队，因为它不记得上周二发生的重组。

在一家人性化的公司里，员工会记住。他们建立机构知识。 Paperclip 模型提供了智能体角色、报告线和预算，但如果没有记忆层，这些智能体每次运行都会以实习生的身份重新启动。

## 插件如何工作 {#how-the-plugin-works}

Hindsight插件挂钩到Paperclip的事件系统。没有包装代码，没有智能体修改。三个生命周期事件驱动记忆流：

**`agent.run.started`**—在智能体开始工作之前，插件通过PaperclipSDK获取运行的问题，根据问题标题和描述构建记忆召回查询，并将最相关的记忆注入到该运行的插件状态中。智能体从之前每次运行中触及类似问题的上下文开始。

**`issue.comment.created`**—对问题的每条评论（用户创作或智能体创作）都会自动保留到Hindsight。该插件获取完整的评论正文，将其归因于智能体或回退到问题受让人，并将其存储在适当的记忆库中。

​​**`agent.run.finished`**—当前无操作。保留订阅，以便将来的 Paperclip 有效负载添加无需更新插件即可获取。

默认情况下，记忆被锁定为`companyId` + `agentId`，而不是运行 ID。这就是它生存下来的原因：它的范围仅限于智能体在公司中的角色，而不是单个执行。 `bankGranularity` 设置允许您更改此范围 - 将其缩小到每个用户隔离或将其扩大到跨所有智能体的共享记忆库。

### 中运行使用的智能体工具 {#agent-tools-for-mid-run-use}

除了自动记忆召回和记忆存储生命周期之外，智能体还获得了两个可以在运行期间显式调用的工具：

- **`hindsight_recall(query)`**—在记忆中搜索与特定问题相关的上下文。在运行期间，该工具返回启动时缓存的记忆。如果没有发生启动记忆识别（例如，运行没有相关问题），则该工具将回退到实时 Hindsight 查询。
- **`hindsight_retain(content)`**—立即存储事实、决定或结果。当智能体在运行中发现某些不应等待基于评论的保留周期的内容时，此功能非常有用。

## 安装和配置 {#install-and-configure}

### 先决条件 {#prerequisites}

您需要一个正在运行的Hindsight实例。两种选择：

**Hindsight Cloud（推荐）**—[免费注册](https://ui.hindsight.vectorize.io)，获取API密钥，并完全跳过自托管。免费套餐足以端到端测试此集成。

**自托管**—如果您喜欢在本地运行所有内容：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

### 安装插件 {#install-the-plugin}

一个命令：

```bash
pnpm paperclipai plugin install @vectorize-io/hindsight-paperclip
```

然后在**设置 > 插件 > Hindsight 记忆**进行配置。

### 配置参考 {#configuration-reference}

|田野|默认|说明|
|-------|---------|-------------|
|`hindsightApiUrl`|`https://api.hindsight.vectorize.io`|Hindsight 服务器 URL（使用 `http://localhost:8888` 进行自托管）|
|`hindsightApiKeyRef`|—|Paperclip 秘密名称持有您的 Hindsight API 钥匙|
|`dynamicBankId`|`true`|当为 true 时，记忆库 ID 源自 `bankGranularity`。设置 false 并提供 `bankId` 使用静态共享记忆库|
|`bankId`|—|当`dynamicBankId`为假时使用的静态记忆库ID。所有共享此值的智能体读/写相同的记忆库|
|`bankGranularity`|`["company", "agent"]`|当`dynamicBankId`为真时，记忆库的范围如何（见下文）|
|`recallBudget`|`mid`|`low` = 最快，`mid` = 平衡，`high` = 最彻底|
|`autoRetain`|`true`|每次评论事件后记忆存储自动发布评论|

插件通过 ping Hindsight 运行状况端点来验证保存时的连接。如果 URL 或密钥错误，您会立即知道。

### 适配器兼容性 {#adapter-compatibility}

插件通过Paperclip的事件系统工作，而不是通过适配器层。这意味着它适用于每种适配器类型：

|适配器|支持|
|---------|-----------|
|Claude|是的|
|Codex|是的|
|Cursor|是的|
|HTTP|是的|
|流程|是的|

## 记忆隔离：选择正确的记忆库粒度 {#memory-isolation-choosing-the-right-bank-granularity}

`bankGranularity` 设置控制记忆库的范围。这是设置中最重要的架构决策。

### 公司+智能体（默认） {#company--agent-default}

记忆库ID格式：`paperclip::{companyId}::{agentId}`

每个公司的每个智能体都有自己的记忆库。支持智能体的记忆与代码审查智能体的记忆是分开的。 A公司的支持智能体和B公司的支持智能体都有自己的记忆库。

**在以下情况下使用此功能：** 智能体具有不同的角色，不应该交叉污染知识。这是大多数设置的正确默认值。

### 仅限公司 {#company-only}

记忆库ID格式：`paperclip::{companyId}`

公司中的所有智能体共享一个记忆库。支持智能体的保留记忆对于分类智能体的记忆召回查询是可见的，反之亦然。

**在以下情况下使用此功能：** 您拥有一个小型智能团队，他们在同一领域工作并从共享上下文中受益。例如，负责同一产品领域的三智能体小队。

### 仅限智能体 {#agent-only}

记忆库ID格式：`paperclip::{agentId}`

智能体的记忆在各个公司中都遵循它。如果您在五个不同的公司环境中运行相同的代码审查智能体，它会记住所有五个环境中的模式。

**在以下情况下使用此功能：** 你拥有一个实用的智能体，应该积累跨公司的专业知识。风格指南执行者、合规性检查者或共享知识库管理者。

### 公司+智能体+用户 {#company--agent--user}

记忆库ID格式：`paperclip::{companyId}::{agentId}::user::{userId}`

每个用户每个公司的每个智能体都有自己的记忆库。该插件从问题的 `originId`（例如 `slack::alice@acme.com`）或 `creatorEmail` 字段中提取用户身份。如果无法识别给定事件的用户，则记忆库 ID 会回退到公司+智能体。

​​**在以下情况下使用此功能：** 您需要每用户记忆隔离 - 为了 GDPR 合规性、多租户支持平台，或者一个用户的上下文不应渗透到另一个用户的记忆召回结果的任何情况。

### 静态共享记忆库 {#static-shared-bank}

您可以设置`dynamicBankId: false`并提供固定的`bankId`，而不是动态导出记忆库ID。每个公司的每个智能体都读取和写入相同的记忆库。

**在以下情况下使用此功能：** 你有一个需要协作记忆的多智能体队列——一群在同一产品领域工作的智能体，其中共享上下文比孤立更有价值。

## 记住什么 {#what-gets-remembered}

### 自动（无需智能体操作） {#automatic-no-agent-action-required}

**运行开始时：** 该插件获取与运行相关的问题，根据问题的标题和描述构建查询，并从智能体的记忆库中调用相关记忆。这些记忆以插件状态缓存，并通过 `hindsight_recall` 工具提供给智能体。

**每条评论：** 当对某个问题创建评论时（无论是由用户还是智能体本身），插件会获取完整的评论正文并将其保留到智能体的记忆库中。这是主要的持久信号。随着时间的推移，它会建立智能体参与的每次交互的完整记录。

### 显式（智能体发起） {#explicit-agent-initiated}

**`hindsight_retain(content)`**——智能体存储运行中的学习、决策或结果。示例：智能体发现特定的 API 端点已被弃用。它会立即保留该事实，以便在下次运行时可用，即使评论线程没有清楚地捕获它。

**`hindsight_recall(query)`**——智能体在记忆中搜索特定主题。启动记忆召回使用问题标题和描述作为查询，范围很广。在运行中，智能体可以发出有针对性的查询：“Stripe webhook 超时问题的解决方案是什么？”或“这个团队使用什么约定来处理错误？”

## 复合效应 {#the-compounding-effect}

第一次运行看起来与插件之前相同，减去了几百毫秒的记忆召回延迟。到第十次运行时，智能体正在从之前的九次运行中提取上下文。到了第 50 代，智能体已经看到了足够多的问题，它的启动记忆召回功能通常会为当前问题提供准确的先前解决方案。

这是从无状态到复合的转变。智能体的值不会在运行之间重置。它不断积累。

​​安装一个插件。零代码更改。 记忆会随着你的智能体的每次跑步而增长。

---

**进一步阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，AI智能体存储记忆背景背后的基本概念
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，各大智能体记忆框架对比
- [为什么每个智能体线束都需要记忆层](/blog/2026/05/04/agent-harness-needs-memory)，智能体运行时持久记忆的更广泛论点
- [Paperclip集成文档](/sdks/integrations/paperclip)，完整配置参考和记忆库ID格式详细信息
