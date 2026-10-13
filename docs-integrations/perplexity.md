---
sidebar_position: 3
title: "Perplexity 持久记忆Hindsight |整合"
description: "用Hindsight将长期记忆添加到Perplexity。使用 OAuth 安全的 MCP 连接器来连接记忆存储研究结果、记忆召回相关上下文，并跨搜索构建持久知识库。"
---

# Perplexity {#perplexity}

添加持久的、可搜索的记忆到[Perplexity](https://www.perplexity.ai) 使用 [Hindsight](https://vectorize.io/hindsight)。存储研究结果并在未来搜索中自动记忆召回相关上下文——所有这些都通过 OAuth 进行保护。

## 概述 {#overview}

Perplexity 擅长研究和事实核查，但你必须在不同的会话中重新发现相同的事实。 Hindsight 通过提供以下方式解决了这个问题：

- **研究知识库** — 发现、发现和来源在搜索中持续存在
- **智能记忆召回** —Hindsight自动从您的历史记录中检索相关研究
- **无需 API 密钥** — OAuth 安全地处理身份验证
- **自定义指令（Custom instructions）** — 侵略性auto-retain/recall通过系统提示
- **网页搜索与记忆** — 组合Perplexity用您积累的知识进行网络研究

## 快速入门 {#quick-start}

### 1。创建Hindsight Cloud账号 {#1-create-a-hindsight-cloud-account}

[免费注册](https://ui.hindsight.vectorize.io) 为Hindsight Cloud。

### 2。将 Hindsight 添加为 Perplexity 中的连接器 {#2-add-hindsight-as-a-connector-in-perplexity}

需要**Perplexity Pro**订阅。远程MCP连接器是 Pro 功能。

1. 前往[Perplexity 设置](https://www.perplexity.ai/settings)
2. 导航至**连接器 → 添加自定义连接器（Connectors → + Custom Connector）**
3. 填写：
   - **名称：**`Hindsight`
   - **MCP 服务器 URL：**`https://api.hindsight.vectorize.io/mcp/default/`
4. 点击**添加（Add）** — 浏览器窗口打开Hindsight Cloud端登录
5. 登录[Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
6. 返回Perplexity；连接器现在处于活动状态

OAuth 自动发现自动处理身份验证。就是这样！

### 3。配置自动保留的自定义指令 {#3-configure-custom-instructions-for-automatic-retention}

连接器现已激活，但您需要告诉Perplexity实际使用它。添加自定义指令以启用自动记忆捕获和记忆召回：

1. 前往**设置 → 个性化 → 自定义指令（Settings → Personalization → Custom instructions）**
2. 复制并粘贴此说明：

```
每次搜索并回答后，自动使用 Hindsight 工具存储：
- 主要研究发现与来源
- 我们发现的事实与数据
- 你的偏好或研究习惯
- 有效的方法或搜索策略

每次新搜索前，自动使用 Hindsight 召回以往对话中的相关研究与上下文，并据此制定搜索策略、组织答案。

存储并召回所有内容，由 Hindsight 负责过滤和去重。
```

3. 保存并关闭设置

Perplexity现在将自动记忆存储研究结果并记忆召回它们以供将来的搜索，从您的研究中构建持久的知识库。

:::tip 请随意尝试说明以确保正确的行为。
:::

## 功能 {#features}

- **自动存储研究成果** — 定制说明告诉您Perplexity用于存储每次搜索后的结果
- **智能记忆召回** —Perplexity查询Hindsight在每次搜索之前将相关研究作为背景
- **OAuth 保护** — 否API复制粘贴键；通过浏览器登录一次
- **记忆库隔离** — 不同研究项目或领域的单独记忆库
- **语义搜索** —Hindsight理解上下文，而不仅仅是关键字匹配
- **网页与记忆** — 组合Perplexity用您积累的知识进行网络搜索

## 储存什么 {#what-to-store}

存储有意义的研究数据以获得最佳结果：

- **研究发现** — 您发现的重要发现、趋势、统计数据
- **来源集合** — 您发现的有用文章、论文、资源
- **研究模式** — 您经常研究的主题、有效的方法
- **偏好** — 您喜欢的信息来源，您喜欢的报告风格
- **领域知识** — 您学到的行业事实、术语、背景
- **决策上下文** — 为什么你选择一种方法而不是另一种方法，考虑到限制

**要存储内容的示例：**
```
"2026 年第三季度 AI 基准：
- Claude Opus 4.7：推理能力最佳，输入约 $15/100 万 token
- GPT-4o：推理速度最快，支持多模态，输入约 $5/100 万 token
- Llama 3.1：开源，适合端侧部署，价格因托管方而异
- 性能指标：[附上相关基准链接]
- 我关注的用例：[你的优先事项]"
```

稍后，当你研究时*“最适合我的 T0 示例是什么？”*，Hindsight回忆您的偏好和基准。Perplexity的答案会根据您的情况量身定制，而不是通用的。

## 最佳实践 {#best-practices}

**有意识地选择要存储的内容。** 并非所有搜索都需要保留。专注于存储以后有用的见解：研究结果、来源集合、方法和个人偏好。存储琐碎的事实会使你的记忆库变得混乱，并使检索变得不太有用。

**使用一致的术语。** 如果您在一次搜索中将主题称为“机器学习”，在另一次搜索中将主题称为“深度学习”，Hindsight的语义搜索可能会错过连接。建立命名约定并遵守它们。

**审阅与完善。** 的Hindsight Cloud仪表板可让您浏览记忆库。定期检查您存储的内容。删除过时的信息（例如去年的基准数据）并整合类似的见解。精心策划的记忆库比详尽的记忆库更有价值。

**组织包含多个部分的发现。** 存储复杂的研究（例如技术比较）时，请包括上下文：您正在评估的内容、标准、考虑的替代方案以及您的结论。未来的你会感谢现在的你的背景。

**与其他工具交叉核对。** 如果同时使用ChatGPT和Perplexity在相关任务上，将研究上下文存储在共享中Hindsight记忆库（多记忆库模式），因此两个工具访问相同的知识库。这会在整个工作流程中创建统一的上下文。

## 与ChatGPT比较 {#comparison-with-chatgpt}

|方面|ChatGPT|Perplexity|
|--------|---------|-----------|
|**最适合**|深度对话，记忆推理|记忆研究、事实核查|
|**Hindsight 集成**|记忆存储 推理、见解、偏好|记忆存储研究结果、来源|
|**会话连续性**|适合多轮问题解决|适合迭代研究|
|**网页集成**|有限（测试版）|集成；结合记忆+网络搜索|
|**记忆上下文限制**|取决于对话长度|取决于搜索结果数|

**建议用途：**
- **ChatGPT + Hindsight** — 构建项目、学习复杂主题、创造性工作
- **Perplexity + Hindsight** — 研究、事实核查、竞争分析、新闻跟踪

**理想设置：** 同时使用这两个工具。ChatGPT处理上下文推理。Perplexity处理有背景的研究。让他们分享Hindsight用于协调工作流程的记忆库。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

### 单一记忆库模式（推荐） {#single-bank-mode-recommended}

每个连接器访问一个记忆库。对于大多数用户来说更简单。

- **URL：**`https://api.hindsight.vectorize.io/mcp/default/`
- **设置：** 只需在连接器设置中输入 URL
- **最适合：** 每个工具的专用记忆（例如，Perplexity使用 `research`记忆库)

### 多记忆库模式 {#multi-bank-mode}

两个工具都通过bank_id参数访问多个记忆库。

- **URL：**`https://api.hindsight.vectorize.io/mcp`
- **设置：** 需要额外配置Hindsight Cloud
- **最适合：** 当ChatGPT和Perplexity合作同一项目

## 数据隐私和安全 {#data-privacy-and-security}

- **OAuth 保护** — 没有API密钥，无需复制粘贴秘密
- **你的账户** — 记忆就在你的心中Hindsight Cloud账号
- **传输加密** — 适用于所有连接的 HTTPS + TLS
- **不受供应商绑定** — 随时导出你的记忆
- **限定访问范围** — 连接器只能read/write到其指定的记忆库

当您在浏览器中批准 OAuth 时，您就授权 Perplexity：
- **读取**你的记忆库（记忆召回相关研究）
- **写入**到你的记忆库（存储新发现）
- **搜索** 你的记忆（寻找背景）

您可以随时通过删除Perplexity设置中的连接器来撤销访问权限。

## 故障排查 {#troubleshooting}

**“Connector failed to load”（连接器加载失败）**
- 验证您有Perplexity Pro（远程MCP连接器需要）
- 验证 URL 是否正确（您的记忆库 ID 中没有拼写错误）
- 检查您的Hindsight Cloud帐户是否处于活动状态
- 尝试重新创建连接器

**“Authorization failed”（授权失败）或“Access denied”（访问被拒绝）**
- 确保您使用要存储回忆的同一Hindsight Cloud帐户登录
- 如果使用团队帐户，请验证您是否有权访问记忆库
- 尝试注销并重新登录

**记忆工具已显示，但未返回结果**
- 给Hindsight几秒钟的时间来索引记忆（处理是异步的）
- 确保您已使用存储了相关记忆 `retain`操作
- 检查记忆库名称是否与您的连接器 URL 匹配

**记忆未被存储**
- 使用Hindsight Cloud仪表板验证正在创建记忆
- 在Perplexity，明确询问Hindsight存储一些东西：*“Hindsight，请记住T3 2026 基准测试显示Claude Opus 最适合推理”*
- 检查您的记忆库是否已满（不太可能，但对于非常大的记忆集是可能的）

## 后续步骤 {#next-steps}

1. 验证您有Perplexity Pro
2. 创建您的Hindsight Cloud帐户
3. 将Hindsight连接器添加到Perplexity
4. 设置您的自定义指令
5. 存储您的第一个研究发现
6. 开始相关主题的新搜索 — 观看 Hindsight 检索您存储的研究
7. 养成随着时间的推移存储有意义的研究见解的习惯

经过数周和数月，随着你的记忆库的增长，Perplexity将给出越来越明智的答案，因为它将当前的网络研究与你积累的知识库相结合，而不是每次都重新开始。
