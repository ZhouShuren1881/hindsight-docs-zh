---
sidebar_position: 2
title: "使用 Hindsight 为 ChatGPT 添加持久记忆 | 集成"
description: "使用 Hindsight 为 ChatGPT 添加长期记忆。通过 OAuth 保护的 MCP 连接器存储对话、召回相关上下文，并跨会话积累持久知识。"
---

# ChatGPT

通过 [Hindsight](https://vectorize.io/hindsight) 为 [ChatGPT](https://chatgpt.com) 添加可搜索的持久记忆。存储对话中的见解，在后续会话自动召回相关上下文，并使用 OAuth 保护所有访问。

## 概述 {#overview}

ChatGPT 的内置记忆有助于记住偏好，但特定对话中的知识（研究、代码、决策）会在新建聊天时丢失。Hindsight 提供以下能力来解决这个问题：

- **跨会话记忆** — 一次对话中的知识延续到下一次
- **智能召回** — 在需要时自动检索相关记忆
- **无需 API 密钥** — 使用 OAuth 安全处理身份验证
- **自定义指令** — 通过系统提示词积极自动存储和召回记忆

## 快速入门 {#quick-start}

### 1. 创建 Hindsight Cloud 账户 {#1-create-a-hindsight-cloud-account}

[免费注册](https://ui.hindsight.vectorize.io) Hindsight Cloud。

### 2. 将 Hindsight 添加为 ChatGPT 连接器 {#2-add-hindsight-as-a-connector-in-chatgpt}

1. 前往 [ChatGPT 设置](https://chatgpt.com/settings)
2. 打开 **Apps & Connectors（应用与连接器）→ Connectors（连接器）**
3. 点击 **Create connector（创建连接器）**
4. 填写：
   - **Name（名称）：** `Hindsight`（或你喜欢的名称）
   - **URL：** `https://api.hindsight.vectorize.io/mcp/default/`
5. 点击 **Create（创建）**，浏览器窗口会打开 Hindsight Cloud 登录页面
6. 登录 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
7. 返回 ChatGPT，连接器已启用

在聊天中使用：点击消息输入框中的 **+** → **More（更多）** → 选择 **Hindsight**。

### 3. 配置自动记忆存储的自定义指令 {#3-configure-custom-instructions-for-automatic-retention}

连接器已经启用，但需要告诉 ChatGPT 实际使用它。添加自定义指令以启用自动记忆捕获和召回：

1. 前往 **Settings（设置）→ Personalization（个性化）→ Custom instructions（自定义指令）**
2. 复制并粘贴以下指令：

```
每次回答后，自动使用 Hindsight 工具存储对话中的关键信息：
- 我们讨论的重要事实、决策或经验
- 提及的偏好、目标或约束
- 代码模式、架构决策或技术见解
- 任何可能在未来对话中有用的信息

每次生成回答前，自动使用 Hindsight 工具召回可能适用于当前对话的相关记忆。将召回的记忆纳入推理过程。

积极存储和召回记忆，假定所有内容都有价值。Hindsight 工具会处理去重和相关性过滤。
```

3. 保存并关闭设置

从现在起，ChatGPT 会自动存储对话中的见解并呈现相关记忆，无需你提出要求。

:::tip
可以尝试调整指令，以确保获得预期行为。
:::

## 功能 {#features}

- **自动存储** — 自定义指令要求 ChatGPT 每次回答后存储见解
- **智能召回** — ChatGPT 每次生成回答前查询 Hindsight，将相关记忆作为上下文
- **OAuth 保护** — 无需复制粘贴 API 密钥，通过浏览器登录一次即可
- **记忆库隔离** — 不同项目或用途使用独立记忆库
- **语义搜索** — Hindsight 理解上下文，而不仅是匹配关键词

## 应存储哪些内容 {#what-to-store}

存储有意义且具体的知识可以获得最佳效果：

- **项目上下文** — 目标、需求、架构决策、约束
- **个人偏好** — 编码风格、沟通偏好、学习方式
- **发现** — 研究结果、有用资源、经验教训
- **领域知识** — 你引用的行业事实、模式和技术
- **决策历史** — 为何选择 A 而非 B，以及考虑过的取舍

**存储内容示例：**
```
“我们正在构建一个实时协作工具。约束条件：
- 光标更新延迟 <500ms
- 支持 10k 并发用户
- 数据存储符合 GDPR
- 团队偏好 WebSockets 而非轮询”
```

之后，当你问 ChatGPT *“我们应该如何设计数据库结构？”*时，Hindsight 会召回这些约束。ChatGPT 的回答将针对你的实际情况，而非泛泛建议。

## 最佳实践 {#best-practices}

**有意识地选择存储内容。** 并非每次对话都需要存储。重点保存之后有用的见解：经验教训、架构决策、研究结果和个人偏好。存储琐碎事实会让记忆库杂乱，降低检索价值。

**使用一致的术语。** 如果一次会话将项目称为“ProjectX”，另一次称为“Project X”，Hindsight 的语义搜索可能无法发现关联。请建立命名规范并坚持使用。

**定期审阅和整理。** Hindsight Cloud 仪表盘允许浏览记忆库。定期审阅已存储的内容，删除过时信息并整合相似见解。经过整理的记忆库比包罗万象的记忆库更有价值。

**结构化存储多方面决策。** 存储复杂决策（例如架构取舍）时，附上上下文：约束、考虑过的替代方案以及选择某条路径的原因。未来的你会感谢这些上下文。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

### 单记忆库模式（推荐） {#single-bank-mode-recommended}

每个连接器访问一个记忆库，对大多数用户更简单。

- **URL：** `https://api.hindsight.vectorize.io/mcp/YOUR_BANK_ID/`
- **设置：** 只需在连接器设置中输入 URL
- **适合：** 每个工具使用专属记忆（例如 ChatGPT 使用 `writing` 记忆库）

### 多记忆库模式 {#multi-bank-mode}

两个工具都通过 bank_id 参数访问多个记忆库。

- **URL：** `https://api.hindsight.vectorize.io/mcp`
- **设置：** 需要在 Hindsight Cloud 中额外配置
- **适合：** ChatGPT 和 Perplexity 协作处理同一项目

## 数据隐私与安全 {#data-privacy-and-security}

- **OAuth 保护** — 无需 API 密钥，无需复制粘贴机密信息
- **自己的账户** — 记忆保存在你的 Hindsight Cloud 账户中
- **传输加密** — 所有连接均使用 HTTPS + TLS
- **无供应商锁定** — 随时导出记忆
- **限定访问范围** — 连接器只能读写分配给它的记忆库

在浏览器批准 OAuth 时，你授权 ChatGPT：
- **读取**记忆库（召回相关事实）
- **写入**记忆库（存储新发现）
- **搜索**记忆（查找上下文）

可以随时在 ChatGPT 设置中移除连接器以撤销访问。

## 故障排查 {#troubleshooting}

**“Connector failed to load”（连接器加载失败）**
- 确认 URL 正确（记忆库 ID 无拼写错误）
- 确认 Hindsight Cloud 账户处于有效状态
- 尝试重新创建连接器

**“Authorization failed”（授权失败）或“Access denied”（访问被拒绝）**
- 确认登录的是希望用来存储记忆的同一个 Hindsight Cloud 账户
- 使用团队账户时，确认拥有访问记忆库的权限
- 尝试退出后重新登录

**“记忆工具出现了，但不返回结果”**
- 给 Hindsight 几秒钟索引记忆（处理是异步的）
- 确认已通过 `retain` 操作存储相关记忆
- 确认记忆库名称与连接器 URL 匹配

**没有存储记忆**
- 使用 Hindsight Cloud 仪表盘确认是否正在创建记忆
- 在 ChatGPT 中明确要求 Hindsight 存储内容：*“Hindsight，记住我们的前端使用 Vue.js”*
- 确认记忆库没有满（通常不会，但非常大的记忆集合可能出现）

## 后续步骤 {#next-steps}

1. 创建 Hindsight Cloud 账户
2. 将 Hindsight 连接器添加到 ChatGPT
3. 设置自定义指令
4. 存储第一条记忆：请 ChatGPT 记住对你重要的内容
5. 新建聊天并提出相关问题，观察 Hindsight 检索已存储的记忆
6. 逐步养成存储有意义见解的习惯

随着数周、数月过去，记忆库不断增长，ChatGPT 会给出更加个性化、依据更充分的回答，因为它使用的是你积累的上下文，而不是每次从头开始。
