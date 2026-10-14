---
title: "将 ChatGPT 和 Perplexity 连接到 Hindsight，获得长期记忆"
authors: [benfrank241]
date: 2026-04-24
tags: [hindsight-cloud, mcp, oauth, chatgpt, perplexity, memory, connectors]
description: "通过 Hindsight 的 MCP 集成为 ChatGPT 和 Perplexity 添加持久记忆。存储对话、知识和见解，并通过 OAuth 安全连接在未来的会话中召回这些内容。"
image: /img/blog/openai-perplexity-mcp-memory.webp
---

# 将 ChatGPT 和 Perplexity 连接到 Hindsight，获得长期记忆 {#connect-chatgpt-and-perplexity-to-hindsight-for-long-term-memory}

![将 ChatGPT 和 Perplexity 连接到 Hindsight](/img/blog/openai-perplexity-mcp-memory.webp)

[ChatGPT](https://chatgpt.com) 和 [Perplexity](https://www.perplexity.ai) 都是强大的 AI 工具，但对话历史不会跨独立聊天保留。ChatGPT 内置了用于记录个人偏好的记忆功能，但开始新对话后，特定对话中的知识（例如研究、决策和代码）就会丢失。[Hindsight](https://ui.hindsight.vectorize.io) 通过模型上下文协议（MCP）传递上下文，提供持久且可搜索的记忆。

本指南将带你完成 ChatGPT 和 Perplexity 与 Hindsight 的连接，让记忆在不同会话间持续保留。你将了解如何设置受 OAuth 保护的连接、存储对话中的知识，并在未来的会话中自动召回这些内容，整个过程无需编写代码。

<!-- truncate -->

## 概要 {#tldr}

- **两次点击即可完成记忆设置** — 将 Hindsight 添加到 ChatGPT 或 Perplexity，批准 OAuth 即可
- **跨会话持续保留** — 在一次对话中积累的知识，会在下一次对话中继续发挥作用
- **由搜索驱动的召回** — 需要时，Hindsight 会自动检索相关记忆
- **端到端加密** — 数据保存在你的 Hindsight Cloud 账户中
- **无需 API 密钥** — OAuth 会自动处理身份认证

## 为什么要将 ChatGPT 和 Perplexity 连接到 Hindsight 来管理记忆？ {#why-connect-chatgpt-and-perplexity-to-hindsight-for-memory}

ChatGPT 和 Perplexity 都擅长回答问题、头脑风暴和推理，但它们各自独立运行：

- **上下文重置**：每次开始新聊天，之前对话中的上下文都会丢失
- **反复解释**：你需要重新说明目标、偏好或领域知识
- **无法随时间积累了解**：AI 不会逐渐加深对你或你项目的了解
- **重复研究**：你会重新发现已经查过的事实、来源和背景

Hindsight 通过持久记忆解决这个问题。它是一种语义记忆系统，会逐渐了解对你重要的内容：你的偏好、项目、知识和过去的发现。

当你向 ChatGPT 或 Perplexity 提问时，Hindsight 会检索相关记忆，并将其纳入对话上下文。AI 会利用这些记忆，给出信息更充分、更贴合个人情况的回答。随着时间推移，这两种工具都会变得**信息更充分、更个性化，也更有效**，因为它们能够基于已积累的对你的了解继续工作。

## 工作原理 {#how-it-works}

Hindsight 使用 MCP（模型上下文协议）。这是一项开放标准，可让 AI 工具访问记忆库等外部服务。

将 Hindsight 连接到 ChatGPT 或 Perplexity 后，会发生三件事：

1. **Retain（存入）**：你让 Hindsight 存储对话中的知识（事实、发现、决策和背景）
2. **Recall（召回）**：你提出新问题时，Hindsight 会搜索记忆库并检索相关上下文
3. **Reflect（反思）**：ChatGPT 或 Perplexity 会利用这些记忆，给出信息更充分、更个性化的回答

LLM 会根据你的提示决定是否使用 Hindsight 的工具。你可以在提示中明确提到 Hindsight（例如“使用 Hindsight 召回……”），也可以通过系统提示鼓励使用记忆。你越有意识地将记忆融入工作流程，它就越能发挥价值。

## 实际应用场景：何时将 ChatGPT 和 Perplexity 连接到 Hindsight {#real-world-use-cases-when-to-connect-chatgpt-and-perplexity-to-hindsight}

**软件开发者**可以存储 ChatGPT 头脑风暴对话中的架构决策和代码模式。几周后提出后续问题时，Hindsight 会召回最初的设计约束和权衡，让 ChatGPT 无需你重新解释背景，也能给出更连贯的建议。

**研究人员**可以将 Perplexity 连接到 Hindsight，积累持久的研究知识。发现重要结果和见解时，可以将它们存储起来。之后进行事实核查或延续先前工作时，可以让 Perplexity 召回早期发现，避免重复搜索，并基于已有认识继续研究。

**产品经理和策略师**可以在 Hindsight 中存储竞争情报、用户反馈主题和市场研究。ChatGPT 分析路线图优先级时，可以直接使用数月间积累的上下文，而不必每次对话都从头开始。

**学生和学习者**可以利用两者的组合复习过去的课程和解释。先让 ChatGPT 讲解一个复杂概念，并存储这份解释；之后学习相关内容时，ChatGPT 就能在先前的解释基础上继续讲解，而不是给出泛泛的概述。

记忆积累起来后，价值才会显现：一次会话中的见解会成为之后工作的背景，两种工具也会逐渐形成不断发展的理解，并据此贴合你的需求。

## 如何将 ChatGPT 和 Perplexity 连接到 Hindsight {#how-to-connect-chatgpt-and-perplexity-to-hindsight}

### 在 ChatGPT（桌面版和网页端）中设置 Hindsight {#setting-up-hindsight-with-chatgpt-desktop--web}

ChatGPT Plus 和 Team 账户支持通过 **连接器** 使用 MCP。连接器是一种安全方式，可用于接入 Hindsight 等外部工具。

**要求：**
- ChatGPT Plus 或 Team 订阅
- [启用开发者模式](https://platform.openai.com/account/api-keys)以使用 Beta 功能（可选；基本连接器功能无需启用）

**步骤：**

1. 前往 [ChatGPT 设置](https://chatgpt.com/settings)
2. 打开 **应用和连接器 → 连接器**
3. 点击 **创建连接器**
4. 填写以下信息：
 - **名称：** `Hindsight`（也可以使用你喜欢的名称）
 - **URL：** `https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
 - 将 `YOUR_BANK_ID` 替换为你的记忆库名称（或 `default`）
5. 点击 **创建**；浏览器会打开 Hindsight Cloud 登录页面
6. 登录 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
7. 返回 ChatGPT；此时连接器已启用

### 在 Perplexity（Perplexity Pro）中设置 Hindsight {#setting-up-hindsight-with-perplexity-perplexity-pro}

Perplexity 的 **连接器** 功能（Perplexity Pro 用户可用）也能以类似方式集成 Hindsight。

**要求：**
- [Perplexity Pro](https://www.perplexity.ai/pro) 订阅
- Hindsight Cloud 账户

**步骤：**

1. 前往 [Perplexity 设置](https://www.perplexity.ai/settings)
2. 打开 **连接器 → + 自定义连接器**
3. 填写以下信息：
 - **名称：** `Hindsight`
 - **MCP 服务器 URL：** `https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
 - 将 `YOUR_BANK_ID` 替换为你的记忆库名称（或 `default`）
4. 点击 **添加**；浏览器会打开 Hindsight Cloud 登录页面
5. 登录 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
6. 返回 Perplexity；此时连接器已启用

## 配置 AI 使用 Hindsight {#configuring-your-ai-to-use-hindsight}

连接器已经启用，但你还需要告诉 ChatGPT 和 Perplexity 实际使用它们。在各个平台中添加自定义指令，即可启用自动捕获记忆和召回记忆。

### ChatGPT 自定义指令 {#chatgpt-custom-instructions}

1. 前往 **设置 → 个性化 → 自定义指令**
2. 复制并粘贴以下指令：

```
After every response, automatically use the Hindsight tool to retain key information from our conversation:
- Important facts, decisions, or learnings we discussed
- Your preferences, goals, or constraints mentioned
- Code patterns, architecture decisions, or technical insights
- Any information that might be useful in future conversations

Before generating each response, automatically use the Hindsight tool to recall relevant memories that might apply to the current conversation. Include recalled memories in your reasoning.

Retain and recall aggressively—assume everything is valuable. The Hindsight tool will handle deduplication and relevance filtering.
```

:::tip
你可以尝试调整这些指令，确保其行为符合预期。
:::

3. 保存并关闭设置

从现在起，ChatGPT 会自动存储对话中的见解，并主动呈现相关记忆，无需你每次提醒。

### Perplexity 自定义指令 {#perplexity-custom-instructions}

1. 前往 **设置 → 个性化 → 自定义指令**
2. 复制并粘贴以下指令：

```
After every search and response, automatically use the Hindsight tool to retain:
- Key research findings and sources
- Facts and data points we've discovered
- Your preferences or research patterns
- Methodologies or search strategies that worked well

Before each new search, automatically use Hindsight to recall relevant research and context from previous conversations. Use recalled memories to inform your search strategy and answer.

Retain and recall everything—Hindsight handles filtering and deduplication.
```

:::tip
你可以尝试调整这些指令，确保其行为符合预期。
:::

3. 保存并关闭设置

此后，Perplexity 会自动存入研究发现，并在未来搜索时召回这些内容，基于你的研究逐步构建持久知识库。

## 应该存储（并记住）什么 {#what-to-store-and-remember}

Hindsight 最适合存储有意义且具体的知识。可以存储：

- **项目背景**：目标、要求和架构决策
- **个人偏好**：编码风格、沟通偏好和学习风格
- **发现**：研究结果、有用资源和经验教训
- **领域知识**：你想要参考的行业事实、模式和技术
- **决策历史**：为什么选择 A 而不是 B，以及你正在处理的限制条件

**存储内容示例：**
```
"We're building a real-time collaboration tool. Constraints: 
- <500ms latency for cursor updates
- Support 10k concurrent users
- GDPR-compliant data storage
- Team prefers WebSockets over polling"
```

之后，当你问 Perplexity *“我们的数据库应该如何设计？”* 时，Hindsight 会自动召回这些限制条件。Perplexity 的回答会贴合你的实际情况，而非泛泛而谈。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

默认采用**单记忆库模式**，每个连接器访问一个记忆库。

| 方面 | 单记忆库 | 多记忆库 |
|--------|------------|-----------|
| **URL** | `https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/` | `https://api.hindsight.vectorize.io/mcp` |
| **范围** | 每个连接器使用一个记忆库 | 通过 `bank_id` 参数访问多个记忆库 |
| **适用场景** | 每种工具使用独立记忆 | 在多种工具间共享记忆 |
| **复杂度** | 更简单；记忆库由 URL 隐式指定 | 设置较多；需要指定记忆库 |

对大多数用户来说，**单记忆库模式**更简单：每种工具使用一个记忆库，需要做的选择更少，也能清楚地区分数据。

例如：ChatGPT 使用名为 `writing` 的记忆库存储写作项目内容。Perplexity 使用名为 `research` 的记忆库处理研究查询。两种工具的记忆彼此隔离。

**多记忆库模式**适用于两种工具都需要共享上下文的工作流程。

例如：ChatGPT 和 Perplexity 都连接到 `https://api.hindsight.vectorize.io/mcp`。两种工具都可以访问相同的记忆库。这种模式很适合 ChatGPT 与 Perplexity 协同处理同一个项目。

## 比较 ChatGPT 和 Perplexity 作为记忆工具 {#comparing-chatgpt-and-perplexity-as-memory-tools}

| 方面 | ChatGPT | Perplexity |
|--------|---------|-----------|
| **适用场景** | 深入对话、基于记忆进行推理 | 基于记忆开展研究、进行事实核查 |
| **记忆召回** | 工具菜单中的 Hindsight 工具 | 来源菜单中的 Hindsight |
| **会话连续性** | 适合多轮问题求解 | 适合迭代研究 |
| **网络集成** | 有限（Beta 版） | 已集成；可结合记忆和网络搜索 |
| **记忆上下文限制** | 取决于对话长度 | 取决于搜索结果数量 |

**ChatGPT + Hindsight 最适合：**
- 构建项目（记住架构决策）
- 学习（在先前课程的基础上继续学习）
- 创意工作（召回你的风格偏好）

**Perplexity + Hindsight 最适合：**
- 研究（将网络搜索与过去的研究结合起来）
- 事实核查（根据已学到的内容进行验证）
- 竞争分析（召回市场背景）

**理想的设置**：同时使用这两种工具。ChatGPT 负责结合上下文进行推理，Perplexity 负责结合上下文开展研究。让它们共享 Hindsight 记忆库，以便协同工作。

## 数据隐私与安全 {#data-privacy-and-security}

- **OAuth 安全连接**：无需 API 密钥，也无需复制粘贴机密信息
- **数据属于你的账户**：记忆保存在你的 Hindsight Cloud 账户中
- **传输加密**：所有连接均使用 HTTPS + TLS
- **无供应商锁定**：你可以随时导出记忆
- **访问范围受限**：每个连接器只能读写分配给它的记忆库

在浏览器中批准 OAuth 后，你授权 ChatGPT 或 Perplexity：
- **读取**你的记忆库（召回相关事实）
- **写入**你的记忆库（存储新发现）
- **搜索**你的记忆（查找上下文）

你可以随时在 ChatGPT 或 Perplexity 的设置中删除连接器，撤销访问权限。

## 故障排查 {#troubleshooting}

**“连接器加载失败”**
- 确认 URL 正确（记忆库 ID 中没有拼写错误）
- 检查 Hindsight Cloud 账户是否已启用
- 尝试重新创建连接器

**“身份认证失败”或“拒绝访问”**
- 确认你登录的是要用于存储记忆的同一个 Hindsight Cloud 账户
- 如果使用团队账户，请确认你有权访问该记忆库
- 尝试退出登录后重新登录

**“记忆工具已显示，但没有返回结果”**
- 等待几秒，让 Hindsight 为记忆建立索引（处理过程是异步的）
- 确认你已使用 `retain` 操作存储相关记忆
- 检查记忆库名称是否与连接器 URL 中的名称一致

**记忆没有被存储**
- 在 Hindsight Cloud 控制面板中确认记忆是否正在创建
- 在 ChatGPT 或 Perplexity 中明确要求 Hindsight 存储内容，例如：*"Hindsight, remember that we use Vue. js for frontend"*
- 检查记忆库是否已满（这种情况不太可能，但记忆量非常大时仍有可能）

## 记忆管理最佳实践 {#best-practices-for-memory-management}

连接 ChatGPT 和 Perplexity 与 Hindsight 后，可以采用以下做法来充分发挥作用：

**有选择地存储。** 并非每次对话都需要存入记忆。重点存储以后会有用的见解，例如经验教训、架构决策、研究发现和个人偏好。存储琐碎事实会让记忆库变得杂乱，也会降低检索效果。

**使用一致的术语。** 如果你在一次会话中把项目称为“ProjectX”，另一次又称为“Project X”，Hindsight 的语义检索可能会漏掉两者之间的联系。为项目、工具和概念制定命名约定，并始终遵循。

**定期检查和完善。** Hindsight Cloud 控制面板可让你浏览记忆库。定期检查已存储的内容，删除过时信息，并整合相似见解。经过人工维护的记忆库比只追求内容全面的记忆库更有价值。

**记录多部分决策的结构。** 存储复杂决策（例如架构权衡）时，要提供背景信息：限制条件、考虑过的替代方案，以及最终选择某个方案的原因。未来的你会感谢现在的你记录了这些背景。

**在工具之间交叉引用。** 如果你在相关任务中同时使用 ChatGPT 和 Perplexity，请将上下文存储在共享的 Hindsight 记忆库中（多记忆库模式），让两种工具都能访问相同的知识库。这样可以在整个工作流程中统一上下文。

## 开始使用 ChatGPT 和 Perplexity 记忆功能 {#getting-started-with-chatgpt-and-perplexity-memory}

1. **创建 Hindsight Cloud 账户**，[免费注册](https://ui.hindsight.vectorize.io)
2. **添加连接器**，按照上文对应的 ChatGPT 或 Perplexity 设置步骤操作
3. **设置记忆库结构**，根据工作流程决定使用单记忆库模式（每种工具单独存储记忆）还是多记忆库模式（共享记忆）
4. **存储第一条记忆**，请 ChatGPT 或 Perplexity 记住对你重要的内容
5. **测试召回**，开始新会话，提出相关问题，观察 Hindsight 如何检索已存储的记忆
6. **养成习惯**，随着时间推移，主动存储对话中有意义的见解

几周、几个月后，随着记忆库不断增长，你会发现 ChatGPT 和 Perplexity 给出的回答越来越个性化、信息越来越充分，因为它们可以使用你积累的上下文，而不必每次都从头开始。

