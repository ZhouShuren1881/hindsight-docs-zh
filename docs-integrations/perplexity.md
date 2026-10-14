---
sidebar_position: 3
title: "借助 Hindsight 为 Perplexity 添加持久记忆 | 集成"
description: "借助 Hindsight 为 Perplexity 添加长期记忆。使用受 OAuth 保护的 MCP 连接器存入研究发现、召回相关上下文，并在多次搜索中构建持久知识库。"
---

# Perplexity {#perplexity}

借助 [Hindsight](https://vectorize.io/hindsight) 为 [Perplexity](https://www.perplexity.ai) 添加持久、可搜索的记忆。存入研究发现，并在未来的搜索中自动召回相关上下文；整个过程均由 OAuth 保护。

## 概述 {#overview}

Perplexity 擅长研究和事实核查，但你需要在不同会话中反复发现相同的事实。Hindsight 通过以下方式解决这个问题：

- **研究知识库** — 发现、研究结果和来源会在多次搜索中持续保存
- **智能召回** — Hindsight 会自动从历史记录中检索相关研究
- **无需 API 密钥** — OAuth 可安全处理身份验证
- **自定义指令** — 通过系统提示积极地自动存入和召回
- **网络搜索 + 记忆** — 将 Perplexity 的网络研究与积累的知识结合起来

## 快速入门 {#quick-start}

### 1. 创建 Hindsight Cloud 账户 {#1-create-a-hindsight-cloud-account}

[免费注册](https://ui.hindsight.vectorize.io) Hindsight Cloud。

### 2. 在 Perplexity 中添加 Hindsight 连接器 {#2-add-hindsight-as-a-connector-in-perplexity}

需要订阅 **Perplexity Pro**。远程 MCP 连接器是 Pro 功能。

1. 前往 [Perplexity 设置](https://www.perplexity.ai/settings)
2. 进入 **连接器 → + 自定义连接器（Connectors → + Custom Connector）**
3. 填写：
   - **名称：** `Hindsight`
   - **MCP 服务器 URL：** `https://api.hindsight.vectorize.io/mcp/default/`
4. 点击 **添加（Add）** — 浏览器窗口会打开，供你登录 Hindsight Cloud
5. 登录 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 并批准访问
6. 返回 Perplexity；此时连接器已启用

OAuth 自动发现机制会自动处理身份验证。就这样！

### 3. 配置自动存入的自定义指令 {#3-configure-custom-instructions-for-automatic-retention}

连接器现已启用，但你还需要告诉 Perplexity 实际使用它。添加自定义指令，以启用自动捕获和召回记忆：

1. 前往 **设置 → 个性化 → 自定义指令（Settings → Personalization → Custom instructions）**
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

3. 保存并关闭设置

此后，Perplexity 会自动存入研究发现，并在未来的搜索中召回这些内容，从你的研究中构建持久知识库。

:::tip
可以试着调整这些指令，确保行为符合预期。
:::

## 功能 {#features}

- **自动存入研究内容** — 自定义指令会让 Perplexity 在每次搜索后存储研究发现
- **智能召回** — Perplexity 会在每次搜索前查询 Hindsight，将相关研究作为上下文
- **OAuth 保护** — 无需复制粘贴 API 密钥；通过浏览器登录一次即可
- **记忆库隔离** — 为不同研究项目或领域使用独立的记忆库
- **语义搜索** — Hindsight 能理解上下文，而不只是匹配关键词
- **网络搜索 + 记忆** — 将 Perplexity 的网络搜索与积累的知识结合起来

## 存储哪些内容 {#what-to-store}

存入有意义的研究数据，才能获得更好的结果：

- **研究发现** — 你发现的关键结论、趋势和统计数据
- **来源集合** — 你发现的实用文章、论文和资源
- **研究模式** — 你经常研究的主题以及行之有效的方法
- **偏好** — 你偏好的信息来源和报告风格
- **领域知识** — 你了解的行业事实、术语和背景信息
- **决策背景** — 你选择某种方案而非其他方案的原因，以及考虑过的限制条件

**存储内容示例：**
```
"Q3 2026 AI benchmarks:
- Claude Opus 4.7: Best reasoning, ~$15/1M input tokens
- GPT-4o: Fastest inference, multimodal, ~$5/1M input
- Llama 3.1: Open source, good for on-device, varies by host
- Performance metrics: [include relevant benchmark links]
- Use cases I care about: [your priorities]"
```

之后，当你研究 *"What's the best LLM for my use case?"* 时，Hindsight 会召回你的偏好和基准数据。这样，Perplexity 给出的答案就会贴合你的情况，而不是泛泛而谈。

## 最佳实践 {#best-practices}

**有选择地存入内容。** 并非每次搜索都需要存入记忆。重点存储日后会有用的见解：研究发现、来源集合、方法和个人偏好。存入琐碎事实会让记忆库变得杂乱，也会降低检索效果。

**统一术语用法。** 如果你在一次搜索中称某个主题为 "machine learning"，在另一次搜索中又称它为 "deep learning"，Hindsight 的语义搜索可能无法发现二者之间的联系。请建立命名约定并始终遵守。

**定期检查并完善。** Hindsight Cloud 控制面板可供你浏览记忆库。定期检查已存储的内容。删除过时信息（例如去年的基准数据），并整合相似见解。经过人工维护的记忆库比一味追求面面俱到的记忆库更有价值。

**整理多部分研究发现。** 存储复杂研究（例如技术比较）时，请提供背景信息：评估的对象、评估标准、考虑过的替代方案以及结论。未来的你会感谢现在的自己提供了这些背景。

**结合其他工具使用。** 如果你在相关任务中同时使用 ChatGPT 和 Perplexity，可以将研究背景存入共享的 Hindsight 记忆库（多记忆库模式），让两个工具访问同一知识库。这样，你的整个工作流程便能共享统一的上下文。

## 与 ChatGPT 比较 {#comparison-with-chatgpt}

| 方面 | ChatGPT | Perplexity |
|--------|---------|-----------|
| **最适合** | 深度对话、结合记忆进行推理 | 结合记忆开展研究、事实核查 |
| **Hindsight 集成** | 存入推理过程、见解和偏好 | 存入研究发现和来源 |
| **会话连续性** | 适合多轮问题求解 | 适合迭代研究 |
| **网络集成** | 有限（测试版） | 已集成；结合记忆与网络搜索 |
| **记忆上下文限制** | 取决于对话长度 | 取决于搜索结果数量 |

**建议用途：**
- **ChatGPT + Hindsight** — 构建项目、学习复杂主题、开展创意工作
- **Perplexity + Hindsight** — 研究、事实核查、竞争分析、新闻追踪

**理想配置：** 同时使用这两个工具。ChatGPT 负责结合上下文进行推理，Perplexity 负责结合上下文开展研究。让它们共享 Hindsight 记忆库，以便协同工作。

## 架构：单记忆库与多记忆库 {#architecture-single-bank-vs-multi-bank}

### 单记忆库模式（推荐） {#single-bank-mode-recommended}

每个连接器访问一个记忆库。对大多数用户来说，这种方式更简单。

- **URL：** `https://api.hindsight.vectorize.io/mcp/default/`
- **设置：** 只需在连接器设置中输入 URL
- **最适合：** 为每个工具配置专用记忆库（例如，Perplexity 使用名为 `research` 的记忆库）

### 多记忆库模式 {#multi-bank-mode}

两个工具都通过 `bank_id` 参数访问多个记忆库。

- **URL：** `https://api.hindsight.vectorize.io/mcp`
- **设置：** 需要在 Hindsight Cloud 中进行额外配置
- **最适合：** ChatGPT 和 Perplexity 协作处理同一个项目

## 数据隐私与安全 {#data-privacy-and-security}

- **OAuth 保护** — 无需 API 密钥，也无需复制粘贴机密信息
- **你的账户** — 记忆存储在你的 Hindsight Cloud 账户中
- **传输加密** — 所有连接均使用 HTTPS + TLS
- **无供应商锁定** — 你可以随时导出记忆
- **访问范围受限** — 连接器只能对分配给它的记忆库执行读写操作

在浏览器中批准 OAuth 后，即表示你授权 Perplexity 执行以下操作：
- **读取**你的记忆库（召回相关研究）
- **写入**你的记忆库（存储新发现）
- **搜索**你的记忆（查找上下文）

你可以随时在 Perplexity 设置中移除连接器，以撤销访问权限。

## 故障排查 {#troubleshooting}

**"Connector failed to load"（连接器加载失败）**
- 确认你订阅了 Perplexity Pro（远程 MCP 连接器必需）
- 确认 URL 正确（记忆库 ID 中没有拼写错误）
- 检查 Hindsight Cloud 账户是否处于启用状态
- 尝试重新创建连接器

**"Authorization failed"（授权失败）或 "Access denied"（访问被拒绝）**
- 确认你使用的是要存储记忆的同一个 Hindsight Cloud 账户
- 如果使用团队账户，请确认你有权访问该记忆库
- 尝试退出后重新登录

**"Memory tools appear but don't return results"（显示了记忆工具，但没有返回结果）**
- 等待几秒，让 Hindsight 为记忆建立索引（处理过程是异步的）
- 确认你已使用 `retain` 操作存入相关记忆
- 检查记忆库名称是否与连接器 URL 匹配

**记忆没有被存储**
- 使用 Hindsight Cloud 控制面板确认是否正在创建记忆
- 在 Perplexity 中明确要求 Hindsight 存储内容：*"Hindsight, remember that Q3 2026 benchmarks show Claude Opus is best for reasoning"*
- 检查记忆库是否已满（这种情况不常见，但记忆数量非常大时也有可能）

## 后续步骤 {#next-steps}

1. 确认你订阅了 Perplexity Pro
2. 创建 Hindsight Cloud 账户
3. 将 Hindsight 连接器添加到 Perplexity
4. 设置自定义指令
5. 存入第一条研究发现
6. 针对相关主题开始新的搜索，观察 Hindsight 如何检索已存入的研究
7. 逐渐养成存储有意义研究见解的习惯

数周或数月后，随着记忆库不断增长，Perplexity 会给出信息更充分的答案，因为它会结合当前的网络研究和你积累的知识库，而不是每次都从头开始。
