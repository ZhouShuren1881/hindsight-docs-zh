---
sidebar_position: 2
title: "使用 Hindsight 为 ChatGPT 添加持久记忆 | 集成"
description: "使用 Hindsight 为 ChatGPT 添加长期记忆。通过 OAuth 保护的 MCP 连接器存储对话、召回相关上下文，并跨会话积累持久知识。"
---

# ChatGPT

通过 [Hindsight](https://vectorize.io/hindsight) 为 [ChatGPT](https://chatgpt.com) 添加持久且可搜索的记忆。存储对话中的见解，并在后续会话中自动召回相关上下文；所有访问均由 OAuth 保护。

## 概述 {#overview}

ChatGPT 的内置记忆有助于记住偏好，但特定对话中的知识（研究、代码、决策）会在开始新聊天时丢失。Hindsight 通过以下方式解决这个问题：

- **跨会话记忆** — 一次对话中的知识会延续到下一次对话
- **智能召回** — 在需要时，Hindsight 会自动检索相关记忆
- **无需 API 密钥** — 使用 OAuth 安全处理身份验证
- **自定义指令** — 通过系统提示词积极自动存入和召回记忆

## 快速入门 {#quick-start}

### 1. 创建 Hindsight Cloud 账户 {#1-create-a-hindsight-cloud-account}

[免费注册](https://ui.hindsight.vectorize.io) Hindsight Cloud。

### 2. 在 ChatGPT 中添加 Hindsight 连接器 {#2-add-hindsight-as-a-connector-in-chatgpt}

1. 前往 [ChatGPT 设置](https://chatgpt.com/settings)
2. 打开 **Apps & Connectors → Connectors**
3. 点击 **Create connector**
4. 填写以下信息：
   - **Name：** `Hindsight`（或使用你偏好的名称）
   - **URL：** `https://api.hindsight.vectorize.io/mcp/default/`
5. 点击 **Create**，浏览器窗口会打开 Hindsight Cloud 登录页面
6. 登录 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
7. 返回 ChatGPT，此时连接器已启用

在聊天中使用：点击消息输入框中的 **+** → **More** → 选择 **Hindsight**。

### 3. 配置自动存入记忆的自定义指令 {#3-configure-custom-instructions-for-automatic-retention}

连接器已经启用，但你还需要告诉 ChatGPT 实际使用它。添加自定义指令，以启用自动捕获和召回记忆：

1. 前往 **Settings → Personalization → Custom instructions**
2. 复制并粘贴以下指令：

```
每次回答后，自动使用 Hindsight 工具存入对话中的关键信息：
- 我们讨论的重要事实、决策或经验
- 你提到的偏好、目标或约束
- 代码模式、架构决策或技术见解
- 任何可能对未来对话有用的信息

每次生成回答前，自动使用 Hindsight 工具召回可能适用于当前对话的相关记忆。将召回的记忆纳入推理过程。

积极存入和召回记忆，假定所有内容都有价值。Hindsight 工具会处理去重和相关性筛选。
```

3. 保存并关闭设置

从现在起，ChatGPT 会自动存储对话中的见解，并在无需你提出要求的情况下呈现相关记忆。

:::tip
可以尝试调整指令，确保其按预期发挥作用。
:::

## 功能 {#features}

- **自动存入** — 自定义指令会要求 ChatGPT 每次回答后存储见解
- **智能召回** — ChatGPT 会在生成每次回答前查询 Hindsight，并将相关记忆作为上下文
- **OAuth 保护** — 无需复制粘贴 API 密钥，只需通过浏览器登录一次
- **记忆库隔离** — 为不同项目或用途使用不同的记忆库
- **语义搜索** — Hindsight 理解上下文，而不只是匹配关键词

## 应存储哪些内容 {#what-to-store}

存储有意义且具体的知识，效果最佳：

- **项目上下文** — 目标、需求、架构决策和约束
- **个人偏好** — 编码风格、沟通偏好和学习方式
- **发现** — 研究结果、有用资源和经验教训
- **领域知识** — 你会引用的行业事实、模式和技术
- **决策历史** — 选择 A 而非 B 的原因，以及考虑过的取舍

**存储内容示例：**
```
"We're building a real-time collaboration tool. Constraints:
- <500ms latency for cursor updates
- Support 10k concurrent users
- GDPR-compliant data storage
- Team prefers WebSockets over polling"
```

之后，当你问 ChatGPT *"How should we structure our database?"* 时，Hindsight 会召回这些约束。ChatGPT 的回答会根据你的实际情况定制，而不是给出泛泛的建议。

## 最佳实践 {#best-practices}

**有选择地存储。** 并非每次对话都需要存入记忆。重点保存以后会有用的见解，例如经验教训、架构决策、研究结果和个人偏好。琐碎事实会让记忆库变得杂乱，也会降低检索效果。

**统一术语。** 如果你在一次会话中把项目称为“ProjectX”，在另一次会话中称为“Project X”，Hindsight 的语义搜索可能会错过二者之间的关联。请制定命名约定并始终遵循。

**定期审阅和整理。** Hindsight Cloud 控制台可以让你浏览记忆库。请定期检查已存储的内容，删除过时信息，并整合相似见解。经过整理的记忆库比不加筛选地收录所有内容更有价值。

**为多部分决策补充结构。** 存储复杂决策（例如架构取舍）时，附上相关背景：约束条件、考虑过的替代方案，以及选择某种方案的原因。未来的你会感谢现在留下了这些背景。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

### 单记忆库模式（推荐） {#single-bank-mode-recommended}

每个连接器访问一个记忆库，对大多数用户来说更简单。

- **URL：** `https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
- **设置：** 只需在连接器设置中输入 URL
- **适用场景：** 每个工具使用专属记忆库（例如 ChatGPT 使用 `writing` 记忆库）

### 多记忆库模式 {#multi-bank-mode}

两个工具都通过 bank_id 参数访问多个记忆库。

- **URL：** `https://api.hindsight.vectorize.io/mcp`
- **设置：** 需要在 Hindsight Cloud 中进行额外配置
- **适用场景：** ChatGPT 和 Perplexity 协作处理同一项目

## 数据隐私与安全 {#data-privacy-and-security}

- **OAuth 保护** — 无需 API 密钥，也无需复制粘贴机密信息
- **你的账户** — 记忆保存在你的 Hindsight Cloud 账户中
- **传输加密** — 所有连接都使用 HTTPS + TLS
- **无供应商锁定** — 随时可以导出记忆
- **限定访问范围** — 连接器只能读写分配给它的记忆库

在浏览器中批准 OAuth 时，你授权 ChatGPT 执行以下操作：
- **读取**你的记忆库（以召回相关事实）
- **写入**你的记忆库（以存入新发现）
- **搜索**你的记忆（以查找上下文）

你可以随时在 ChatGPT 设置中移除连接器，撤销访问权限。

## 故障排查 {#troubleshooting}

**“Connector failed to load”**
- 确认 URL 正确（记忆库 ID 没有拼写错误）
- 检查 Hindsight Cloud 账户是否处于启用状态
- 尝试重新创建连接器

**“Authorization failed” 或 “Access denied”**
- 确认登录的是你打算用来存储记忆的那个 Hindsight Cloud 账户
- 如果使用团队账户，请确认你有权访问该记忆库
- 尝试退出账户后重新登录

**“Memory tools appear but don't return results”**
- 等待几秒，让 Hindsight 为记忆建立索引（处理是异步的）
- 确认已使用 `retain` 操作存入相关记忆
- 检查记忆库名称是否与连接器 URL 中的名称一致

**记忆没有被存入**
- 使用 Hindsight Cloud 控制台确认是否正在创建记忆
- 在 ChatGPT 中明确要求 Hindsight 存入内容：*"Hindsight, remember that we use Vue.js for frontend"*
- 检查记忆库是否已满（这种情况不太可能，但记忆数量非常多时仍有可能）

## 后续步骤 {#next-steps}

1. 创建 Hindsight Cloud 账户
2. 将 Hindsight 连接器添加到 ChatGPT
3. 设置自定义指令
4. 存入第一条记忆：请 ChatGPT 记住对你重要的内容
5. 开始新聊天并提出相关问题，观察 Hindsight 如何检索已存储的记忆
6. 逐步养成存储有意义见解的习惯

经过数周和数月，随着记忆库不断增长，ChatGPT 会给出越来越个性化、信息更充分的回答，因为它可以使用你积累的上下文，而不必每次都从头开始。
