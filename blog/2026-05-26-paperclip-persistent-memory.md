---
title: "通过 Hindsight 为 Paperclip 智能体添加持久记忆"
authors: [benfrank241]
date: 2026-05-26T12:00
tags: [integrations, paperclip, agents, memory, guide, tutorial]
description: "只需安装一个插件，就能为每个 Paperclip 智能体提供长期记忆。智能体可在运行前召回上下文、在运行后存入经验，无需修改代码。"
image: /img/blog/paperclip-persistent-memory.webp
hide_table_of_contents: true
---

![通过 Hindsight 为 Paperclip 智能体添加持久记忆](/img/blog/paperclip-persistent-memory.webp)

[Paperclip](https://github.com/paperclipai/paperclip) 把 AI 智能体当作员工来管理。你可以定义组织架构、分配角色、设置预算，并让智能体在架构中自主工作。自 2026 年 3 月以来，它已获得 67,000+ 个 GitHub 星标。它支持五种适配器类型，并提供插件系统，可以扩展每个智能体的能力而无需改动其代码。

组织架构没有赋予智能体的一项能力，是在多次运行之间保留记忆。

每次 Paperclip 运行都从零开始。昨天负责分诊某个客户问题的智能体，不知道自己昨天运行过。上周发现某项测试不稳定的编码智能体，本周还会重新发现它。智能体在一次运行中积累的知识，会在运行结束时消失。

Hindsight 插件解决了这个问题。只需安装一次并在“设置”中完成配置，Paperclip 实例中的每个智能体就都能获得持久的[智能体记忆](https://vectorize.io/what-is-agent-memory/)，并在多次运行、不同公司和重启之间不断累积。无需修改任何智能体的代码。

<!-- truncate -->

## 为什么 Paperclip 智能体需要记忆 {#why-paperclip-agents-need-memory}

与单智能体框架相比，Paperclip 的公司模式让记忆缺失的问题更加突出。

设想一个由四个智能体组成的团队：支持智能体、文档智能体、分诊智能体和代码审查智能体。每个智能体每周处理数十次运行。每次运行都会产生决策、发现和上下文，让下一次运行更快、效果更好。没有记忆，这些内容都会消失。

支持智能体会重新诊断三天前已经解决的问题。代码审查智能体会再次标记自己早已学会忽略的误报。分诊智能体会把工单分配给错误的团队，因为它不记得上周二发生的组织调整。

在有人类员工的公司里，员工会记住事情，并积累组织知识。Paperclip 模式为智能体提供了角色、汇报关系和预算，但如果没有记忆层，这些智能体每次运行都会像实习生一样重新开始。

## 插件的工作方式 {#how-the-plugin-works}

Hindsight 插件接入 Paperclip 的事件系统，无需包装代码，也无需修改智能体。三个生命周期事件驱动记忆流转：

**`agent.run.started`**——智能体开始工作之前，插件会通过 Paperclip SDK 获取本次运行关联的问题，根据问题标题和描述构建记忆召回查询，再将最相关的记忆注入本次运行的插件状态。智能体由此获得此前处理过类似问题的各次运行中的上下文。

**`issue.comment.created`**——问题上的每条评论（无论由用户还是智能体撰写）都会自动存入 Hindsight。插件会获取完整评论正文，将评论归属到相应智能体；如果无法归属，则回退到问题的受理人，并把评论存入相应的记忆库。

**`agent.run.finished`**——目前不执行任何操作。保留此订阅，是为了将来 Paperclip 增加载荷字段时，插件无需更新也能接收这些字段。

默认情况下，记忆以 `companyId` + `agentId` 为键，而不是以运行 ID 为键。这就是记忆能够留存的原因：记忆范围绑定到智能体在公司的角色，而不是某一次执行。`bankGranularity` 设置可用于调整这一范围：缩小范围以按用户隔离，或扩大范围以供所有智能体共享同一个记忆库。

### 运行期间使用的智能体工具 {#agent-tools-for-mid-run-use}

除了自动的召回和存入流程外，智能体还可以在运行期间显式调用两个工具：

- **`hindsight_recall(query)`**——搜索与特定问题相关的上下文。运行期间，该工具会返回启动时缓存的记忆。如果启动时没有执行召回（例如，本次运行没有关联问题），该工具会回退到实时 Hindsight 查询。
- **`hindsight_retain(content)`**——立即存入一条事实、决策或结果。如果智能体在运行中发现了不应等到评论触发存入流程的信息，就可以使用此工具。

## 安装和配置 {#install-and-configure}

### 先决条件 {#prerequisites}

你需要一个正在运行的 Hindsight 实例。有两种选择：

**Hindsight Cloud（推荐）**——[免费注册](https://ui.hindsight.vectorize.io)，获取 API 密钥，即可完全跳过自托管。免费套餐足以端到端测试此集成。

**自托管**——如果你希望所有内容都在本地运行：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

### 安装插件 {#install-the-plugin}

只需运行一条命令：

```bash
pnpm paperclipai plugin install @vectorize-io/hindsight-paperclip
```

然后在 **Settings > Plugins > Hindsight Memory** 中进行配置。

### 配置参考 {#configuration-reference}

| 字段 | 默认值 | 说明 |
|-------|---------|-------------|
| `hindsightApiUrl` | `https://api.hindsight.vectorize.io` | Hindsight 服务器 URL（自托管时使用 `http://localhost:8888`） |
| `hindsightApiKeyRef` | — | 存有 Hindsight API 密钥的 Paperclip 敏感凭据名称 |
| `dynamicBankId` | `true` | 为 `true` 时，记忆库 ID 根据 `bankGranularity` 推导。设为 `false` 并提供 `bankId`，即可使用静态共享记忆库 |
| `bankId` | — | 当 `dynamicBankId` 为 `false` 时使用的静态记忆库 ID。所有使用此值的智能体都会读写同一个记忆库 |
| `bankGranularity` | `["company", "agent"]` | 当 `dynamicBankId` 为 `true` 时，记忆库按什么范围隔离（见下文） |
| `recallBudget` | `mid` | `low` = 最快，`mid` = 均衡，`high` = 最全面 |
| `autoRetain` | `true` | 在每次评论事件后自动存入问题评论 |

保存时，插件会通过 ping Hindsight 健康检查端点来验证连接。如果 URL 或密钥有误，你会立即知道。

### 适配器兼容性 {#adapter-compatibility}

插件通过 Paperclip 的事件系统工作，而不是适配器层，因此适用于所有适配器类型：

| 适配器 | 支持 |
|---------|-----------|
| Claude | 是 |
| Codex | 是 |
| Cursor | 是 |
| HTTP | 是 |
| Process | 是 |

## 记忆隔离：选择合适的记忆库粒度 {#memory-isolation-choosing-the-right-bank-granularity}

`bankGranularity` 设置控制记忆库的隔离范围。这是设置过程中最重要的架构决策。

### 公司 + 智能体（默认） {#company--agent-default}

记忆库 ID 格式：`paperclip::{companyId}::{agentId}`

每个公司中的每个智能体都有自己的记忆库。支持智能体的记忆与代码审查智能体的记忆相互隔离。A 公司的支持智能体和 B 公司的支持智能体也各自使用不同的记忆库。

**适用于：** 智能体角色各不相同，不应相互污染知识的情况。这是大多数场景的合适默认设置。

### 仅按公司隔离 {#company-only}

记忆库 ID 格式：`paperclip::{companyId}`

同一公司中的所有智能体共享一个记忆库。支持智能体存入的记忆对分诊智能体的召回查询可见，反之亦然。

**适用于：** 一小组智能体在相同领域工作，并能从共享上下文中受益的情况。例如，三个智能体组成的小队共同负责同一产品领域。

### 仅按智能体隔离 {#agent-only}

记忆库 ID 格式：`paperclip::{agentId}`

智能体的记忆会随它跨公司延续。如果你在五个不同的公司环境中运行同一个代码审查智能体，它就能记住来自这五处环境的模式。

**适用于：** 需要积累跨公司专业知识的通用智能体。例如，风格指南执行者、合规检查器或共享知识库维护者。

### 按公司、智能体和用户隔离 {#company--agent--user}

记忆库 ID 格式：`paperclip::{companyId}::{agentId}::user::{userId}`

每个用户在每个公司中的每个智能体下都有自己的记忆库。插件会从问题的 `originId` 字段（例如 `slack::alice@acme.com`）或 `creatorEmail` 字段提取用户身份。如果某个事件无法识别用户，记忆库 ID 就会回退为公司 + 智能体。

**适用于：** 需要按用户隔离记忆的情况，例如满足 GDPR 合规要求、多租户支持平台，或任何需要防止一个用户的上下文泄漏到另一个用户召回结果中的场景。

### 静态共享记忆库 {#static-shared-bank}

你也可以将 `dynamicBankId` 设为 `false` 并提供固定的 `bankId`，这样就不必动态推导记忆库 ID。所有公司中的所有智能体都将读写同一个记忆库。

**适用于：** 多智能体团队需要协作共享记忆的情况，例如多个智能体共同负责同一产品领域，且共享上下文比隔离更有价值。

## 会记住哪些内容 {#what-gets-remembered}

### 自动处理（无需智能体操作） {#automatic-no-agent-action-required}

**运行开始时：** 插件会获取与本次运行关联的问题，根据问题标题和描述构建查询，并从智能体的记忆库召回相关记忆。这些记忆会缓存在插件状态中，并通过 `hindsight_recall` 工具提供给智能体。

**每次评论时：** 无论评论是用户还是智能体在问题上创建的，插件都会获取完整评论正文，并将其存入智能体的记忆库。这是主要的持久信号。随着时间推移，记忆库会逐渐建立起智能体参与过的每次交互的完整记录。

### 显式处理（由智能体发起） {#explicit-agent-initiated}

**`hindsight_retain(content)`**——智能体在运行期间存入一条经验、决策或结果。例如，智能体发现某个 API 端点已弃用，就会立即存入这一事实，以便下次运行时使用，即使评论串没有清楚记录这件事。

**`hindsight_recall(query)`**——智能体针对特定主题搜索记忆。启动时的召回以问题标题和描述作为查询，因此范围较宽。运行期间，智能体可以发起更有针对性的查询，例如："What was the resolution for the Stripe webhook timeout issue?" 或 "What conventions does this team use for error handling?"

## 记忆的复利效应 {#the-compounding-effect}

第一次运行与安装插件前基本相同，只多出几百毫秒的召回延迟。运行到第十次时，智能体就能调取前九次运行的上下文。到第五十次时，智能体已经处理过足够多的问题，启动时的召回通常能找到当前问题之前的确切解决方案。

这就是从无状态转向持续积累。智能体的价值不会在每次运行之间归零，而是不断增长。

只需安装一个插件，无需修改任何代码。智能体每完成一次运行，记忆都会增长。

---

**延伸阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)，了解 AI 智能体如何保留上下文的基础概念
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)，对各主要智能体记忆框架的比较
- [为什么每个智能体运行框架都需要记忆层](/blog/2026/05/04/agent-harness-needs-memory)，关于在智能体运行时中加入持久记忆的更广泛论述
- [Paperclip 集成文档](/sdks/integrations/paperclip)，完整的配置参考和记忆库 ID 格式说明
