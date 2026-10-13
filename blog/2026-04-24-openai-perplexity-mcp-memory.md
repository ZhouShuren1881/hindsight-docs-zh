---
title: "将ChatGPT和Perplexity连接到Hindsight以实现长期记忆"
authors: [benfrank241]
date: 2026-04-24
tags: [hindsight-cloud, mcp, oauth, chatgpt, perplexity, memory, connectors]
description: "使用Hindsight的MCP集成为ChatGPT和Perplexity添加持久记忆。存储对话、知识和见解，然后通过 OAuth 安全连接在未来的会话中记忆和捕获它们。"
image: /img/blog/openai-perplexity-mcp-memory.webp
---

# 将ChatGPT和Perplexity连接到Hindsight以实现长期记忆 {#connect-chatgpt-and-perplexity-to-hindsight-for-long-term-memory}

![将ChatGPT和Perplexity连接到Hindsight](/img/blog/openai-perplexity-mcp-memory.webp)

[ChatGPT](https://chatgpt.com) 和 [Perplexity](https://www.perplexity.ai) 是强大的 AI 工具，但对话历史记录不会在单独的聊天中保留。 ChatGPT 具有针对个人喜好的内置记忆，但是当您开始新线程时，来自特定对话（研究、决策、代码）的知识会丢失。 [Hindsight](https://ui.hindsight.vectorize.io) 添加持久的、可搜索的记忆，通过模型上下文协议 (MCP) 传递上下文。

本指南将引导您将ChatGPT和Perplexity连接到Hindsight，以实现跨会话的持久记忆。您将学习如何设置 OAuth 安全连接、存储对话中的知识以及在未来的会话中自动记忆它，所有这些都无需代码设置。

<!-- truncate -->

## 概览 {#tldr}

- **双击记忆设置** — 将 Hindsight 添加到 ChatGPT 或 Perplexity，批准 OAuth，完成
- **跨会话持续存在** — 您在一次对话中建立的知识将在下一次对话中发挥作用
- **搜索驱动的记忆召回** — Hindsight在您需要时自动检索相关记忆
- **端到端加密** — 您的数据保留在您的 Hindsight Cloud帐户中
- **无API键** — OAuth 自动处理身份验证

## 为什么要连接ChatGPT和Perplexity到Hindsight来记忆？ {#why-connect-chatgpt-and-perplexity-to-hindsight-for-memory}

ChatGPT和Perplexity都擅长回答问题、头脑风暴和推理。但它们是孤立运作的：

- **上下文重置**，每个新聊天都会丢失之前对话的上下文
- **重复解释**，你重新解释你的目标、偏好或领域知识
- **随着时间的推移没有学习**，AI 不会提高对您或您的项目的理解
- **多余的研究**，你重新发现你已经探索过的事实、来源和背景

Hindsight通过持久记忆解决了这个问题。它是一个语义记忆系统，可以学习对您来说重要的事情：您的偏好、项目、知识和过去的发现。

当您向 ChatGPT 或 Perplexity 提出问题时，Hindsight 会检索相关记忆并将其包含在对话上下文中。 AI 使用这些记忆来提供更明智、个性化的答案。随着时间的推移，这两种工具都会变成**信息更丰富、更个性化、更有效**，因为它们都是建立在对您的了解之上的。

## 它是如何工作的 {#how-it-works}

Hindsight使用MCP（模型上下文协议），这是一个开放标准，允许AI工具访问外部服务，例如记忆库。

当您将Hindsight连接到ChatGPT或Perplexity时，会发生三件事：

1. **记忆存储**，您要求Hindsight存储对话中的知识（事实、发现、决策、背景）
2. **记忆召回**，当您提出新问题时，Hindsight搜索您的记忆库并检索相关上下文
3. **反思**、ChatGPT 或 Perplexity 使用这些记忆来给出更明智、个性化的答案

LLM根据您的提示决定是否使用Hindsight的工具。您可以通过明确提及Hindsight（“使用Hindsight，记忆召回...”）或通过鼓励记忆使用的系统提示来优化这一点。您越有意识地将记忆融入您的工作流程，它就会变得越有价值。

## 真实世界用例：何时将ChatGPT和Perplexity连接到Hindsight {#real-world-use-cases-when-to-connect-chatgpt-and-perplexity-to-hindsight}

**软件开发人员**可以存储来自ChatGPT头脑风暴会议的架构决策和代码模式。当他们几周后提出后续问题时，Hindsight 回想起最初的设计限制和权衡，使ChatGPT 能够提供更连贯的指导，而无需重新解释上下文。

**研究人员**可以将Perplexity连接到Hindsight以建立持久的研究知识。当您发现重要的发现和见解时，您会存储它们。在进行事实核查或建立在先前工作的基础上时，您要求Perplexity记忆早期的发现，避免冗余搜索并建立在您已经学到的知识的基础上。

**产品经理和策略师** 受益于在 Hindsight 中存储竞争见解、用户反馈主题和市场研究。当ChatGPT分析路线图优先级时，它可以立即访问数月积累的上下文，而不是每次对话都重新开始。

**学生和学习者** 使用组合来复习过去的课程和解释。问一次ChatGPT一个复杂的概念；存储解释。后来，在处理相关材料时，ChatGPT 建立在之前的解释之上，而不是给出一般性概述。

当记忆积累时，奇迹就会发生。一次会议的见解将成为未来工作的背景，建立不断发展的理解，使这两种工具都能根据您的需求进行个性化设置。

## 如何将ChatGPT和Perplexity连接到Hindsight {#how-to-connect-chatgpt-and-perplexity-to-hindsight}

### 使用ChatGPT设置Hindsight（桌面和网页） {#setting-up-hindsight-with-chatgpt-desktop--web}

ChatGPT Plus 和团队帐户通过 **连接器** 支持MCP，这是链接Hindsight 等外部工具的安全方式。

**要求：**
- ChatGPT Plus 或 Team 订阅
- [启用开发者模式](https://platform.openai.com/account/api-keys) 用于测试功能（可选；基本连接器使用不需要）

**步骤：**

1. 前往[ChatGPT 设置](https://chatgpt.com/settings)
2. 导航至**应用程序和连接器 → 连接器**
3. 点击**创建连接器**
4. 填写：
 - **名称：** `Hindsight`（或您喜欢的名字）
 - **网址：**`https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
 - 将`YOUR_BANK_ID`替换为您的记忆库名称（或`default`）
5. 点击**创建**，打开浏览器窗口Hindsight Cloud登录
6. 登录[Hindsight Cloud](https://ui.hindsight.vectorize.io)并批准访问
7. 返回ChatGPT；连接器现在处于活动状态

### 使用Perplexity设置Hindsight（Perplexity Pro） {#setting-up-hindsight-with-perplexity-perplexity-pro}

Perplexity的**连接器**功能（适用于Perplexity Pro）以类似的方式集成Hindsight。

**要求：**
- [Perplexity专业版](https://www.perplexity.ai/pro)订阅
- A Hindsight Cloud账号

**步骤：**

1. 前往[Perplexity 设置](https://www.perplexity.ai/settings)
2. 导航至**连接器 → + 自定义连接器**
3. 填写：
 - **名称：**`Hindsight`
 - **MCP 服务器网址：**`https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
 - 将`YOUR_BANK_ID`替换为您的记忆库名称（或`default`）
4. 点击**添加**，打开浏览器窗口Hindsight Cloud登录
5. 登录[Hindsight Cloud](https://ui.hindsight.vectorize.io)并批准访问
6. 返回Perplexity；连接器现在处于活动状态

## 配置您的AI以使用Hindsight {#configuring-your-ai-to-use-hindsight}

连接器现已启用，但您需要告诉ChatGPT和Perplexity实际使用它们。在每个平台中添加自定义指令以实现自动记忆捕获和记忆召回。

### ChatGPT 定制说明 {#chatgpt-custom-instructions}

1. 前往**设置→个性化→自定义说明**
2. 复制并粘贴此说明：

```
After every response, automatically use the Hindsight tool to retain key information from our conversation:
- Important facts, decisions, or learnings we discussed
- Your preferences, goals, or constraints mentioned
- Code patterns, architecture decisions, or technical insights
- Any information that might be useful in future conversations

Before generating each response, automatically use the Hindsight tool to recall relevant memories that might apply to the current conversation. Include recalled memories in your reasoning.

Retain and recall aggressively—assume everything is valuable. The Hindsight tool will handle deduplication and relevance filtering.
```

:::tip 请随意尝试说明以确保正确的行为。
:::

3. 保存并关闭设置

从现在开始，ChatGPT将自动存储您对话中的见解并显示相关记忆，而无需您询问。

### Perplexity 定制说明 {#perplexity-custom-instructions}

1. 前往**设置→个性化→自定义说明**
2. 复制并粘贴此说明：

```
After every search and response, automatically use the Hindsight tool to retain:
- Key research findings and sources
- Facts and data points we've discovered
- Your preferences or research patterns
- Methodologies or search strategies that worked well

Before each new search, automatically use Hindsight to recall relevant research and context from previous conversations. Use recalled memories to inform your search strategy and answer.

Retain and recall everything—Hindsight handles filtering and deduplication.
```

:::tip 请随意尝试说明以确保正确的行为。
:::

3. 保存并关闭设置

Perplexity 现在将自动记忆存储研究结果并记忆召回以供将来的搜索，从您的研究中构建持久的知识库。

## 存储（和记住）什么 {#what-to-store-and-remember}

Hindsight 最适合有意义的、具体的知识。存储：

- **项目背景**，目标、需求、架构决策
- **个人喜好**，编码风格，沟通偏好，学习风格
- **发现**，研究成果，有用资源，经验教训
- **领域知识**，你想参考的行业事实、模式、技术
- **决策历史**，为什么你选择 A 而不是 B，你工作的限制

**存储内容示例：**
```
"We're building a real-time collaboration tool. Constraints: 
- <500ms latency for cursor updates
- Support 10k concurrent users
- GDPR-compliant data storage
- Team prefers WebSockets over polling"
```

稍后，当你询问Perplexity*“我们应该如何构建我们的数据库？”*时，Hindsight会自动回忆起这些约束。 Perplexity的答案会根据您的实际情况量身定制，而不是泛泛的建议。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

默认使用**单记忆库模式**，每个连接器访问一个记忆库。

|方面|单记忆库|多功能记忆库|
|--------|------------|-----------|
|**网址**|`https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`|`https://api.hindsight.vectorize.io/mcp`|
|**范围**|每个连接器一个记忆库|通过`bank_id`参数的多个记忆库|
|**最适合**|每个工具都有专用记忆|跨工具共享记忆|
|**复杂性**|更简单；内隐记忆库|更多设置；需要记忆库规范|

**单一记忆库模式** 对于大多数用户来说更简单：每个工具一个记忆库，更少的决策，清晰的分离。

示例：ChatGPT为您的写作项目使用`writing`记忆库。 Perplexity 使用 `research` 记忆库进行研究查询。每个工具的记忆都是独立的。

**多记忆库模式** 适用于两个工具都需要共享上下文的工作流程。

示例：ChatGPT 和 Perplexity → `https://api.hindsight.vectorize.io/mcp`。两种工具都访问相同的记忆库。非常适合 ChatGPT 和 Perplexity 在同一个项目上协作。

## 比较ChatGPT和Perplexity作为记忆工具 {#comparing-chatgpt-and-perplexity-as-memory-tools}

|方面|ChatGPT|Perplexity|
|--------|---------|-----------|
|**最适合**|深度对话，记忆推理|记忆研究、事实核查|
|**记忆召回**|工具菜单中的 Hindsight 工具|来源（Sources）菜单中的 Hindsight|
|**会话连续性**|适合多轮问题解决|适合迭代研究|
|**网络集成**|有限（测试版）|集成；可以结合记忆+网络搜索|
|**记忆上下文限制**|取决于对话长度|取决于搜索结果数量|

**ChatGPT + Hindsight 最适合：**
- 构建项目（记住你的架构决策）
- 学习（基于之前的课程）
- 创意作品（回忆你的风格偏好）

**Perplexity + Hindsight 最适合：**
- 研究（将网络搜索与您过去的研究相结合）
- 事实核查（根据你所学到的内容进行验证）
- 竞争分析（回顾市场背景）

**理想设置**：同时使用这两个工具。 ChatGPT 处理上下文推理。 Perplexity 处理上下文研究。让他们共享Hindsight记忆库以协调工作流程。

## 数据隐私和安全 {#data-privacy-and-security}

- **OAuth 安全**，没有API密钥，没有复制粘贴秘密
- **您的帐户**，回忆就在您的Hindsight Cloud帐户中
- **传输过程中加密**，所有连接均使用 HTTPS + TLS
- **无供应商锁定**，随时导出你的回忆
- **范围访问**，每个连接器只能读/写其指定的记忆库

当您在浏览器中批准 OAuth 时，您将授权 ChatGPT 或 Perplexity：
- **阅读** 你的记忆库（记忆召回相关事实）
- **写**到你的记忆库（存储新发现）
- **搜索**你的记忆（寻找上下文）

您可以随时通过删除ChatGPT或Perplexity设置中的连接器来撤销访问权限。

## 故障排除 {#troubleshooting}

**“连接器加载失败”**
- 验证 URL 是否正确（您的记忆库 ID 中没有拼写错误）
- 检查您的Hindsight Cloud帐户是否处于活动状态
- 尝试重新创建连接器

**“授权失败”或“访问被拒绝”**
- 确保您使用要存储回忆的同一Hindsight Cloud帐户登录
- 如果使用团队帐户，请验证您是否有权访问记忆库
- 尝试注销并重新登录

**“记忆工具出现但不返回结果”**
- 给Hindsight几秒钟的时间来索引记忆（处理是异步的）
- 确保您已使用`retain`操作存储了相关记忆
- 检查记忆库名称是否与您的连接器 URL 匹配

**记忆没有被储存**
- 使用Hindsight Cloud仪表板验证正在创建记忆
- 在ChatGPT或Perplexity，明确询问Hindsight存储一些东西：*“Hindsight，记住我们使用Vue.js 作为前置”*
- 检查您的记忆库是否已满（不太可能，但对于非常大的记忆集是可能的）

## 记忆管理最佳实践 {#best-practices-for-memory-management}

将ChatGPT和Perplexity连接到Hindsight后，一些做法可以最大化价值：

**谨慎对待您存储的内容。** 并非所有对话都需要保留。专注于存储以后有用的见解：经验教训、架构决策、研究结果和个人偏好。存储琐碎的事实会使你的记忆库变得混乱，并使检索变得不太有用。

**使用一致的术语。** 如果您在一个会话中将项目称为“ProjectX”，而在另一个会话中将项目称为“Project X”，则 Hindsight 的语义搜索可能会错过连接。建立项目、工具和概念的命名约定并遵守它们。

**回顾和完善。** Hindsight Cloud仪表板可让您浏览记忆库。定期检查您存储的内容。删除过时的信息并巩固类似的见解。精心策划的记忆库比详尽的记忆库更有价值。

**构建多部分决策。** 存储复杂决策（例如架构权衡）时，请包含上下文：约束、考虑的替代方案以及选择一条路径的原因。未来的你会感谢现在的你的背景。

​​**工具之间的交叉引用。** 如果在相关任务上同时使用 ChatGPT 和 Perplexity，请将上下文存储在共享的 Hindsight 记忆库（多记忆库模式）中，以便两个工具访问相同的知识库。这会在整个工作流程中创建统一的上下文。

## 开始使用ChatGPT和Perplexity记忆 {#getting-started-with-chatgpt-and-perplexity-memory}

1. **创建Hindsight Cloud账号**，[免费注册](https://ui.hindsight.vectorize.io)
2. **添加连接器**，按照上述ChatGPT或Perplexity设置步骤
3. **设置你的记忆库结构**，决定单记忆库模式（每个工具单独的记忆）还是多记忆库模式（共享记忆）适合您的工作流程
4. **存储你的第一个记忆**，请ChatGPT或Perplexity记住对您来说重要的事情
5. **测试记忆力**，开始一个新会话，提出相关问题，然后观看Hindsight检索您存储的记忆
6. **养成习惯**，随着时间的推移，主动存储对话中有意义的见解

经过数周和数月，随着你的记忆库的增长，你会注意到ChatGPT和Perplexity给出了越来越个性化的、明智的答案，因为它们现在正在与你积累的上下文一起工作，而不是每次都重新开始。

