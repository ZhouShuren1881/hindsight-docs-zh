---
title: "20,000 颗星星：Hindsight 如何到达这里，逐个版本"
authors: [benfrank241]
slug: "2026/08/14/hindsight-20k-stars"
date: 2026-08-14T12:00
tags: [hindsight, agent-memory, open-source, milestone, changelog]
description: "Hindsight 在不到 10 个月的时间和 67 个版本中刚刚突破 20,000 颗 GitHub 星。这是时间表：我们逐个版本发布的每项主要功能。"
image: /img/blog/hindsight-20k-stars.webp
hide_table_of_contents: true
---

![Hindsight 20,000 星：从 2025 年 12 月第一次开源提交到 v0.9.1 的发布时间表](/img/blog/hindsight-20k-stars.webp)

我们于 2025 年 12 月开源了Hindsight。九个月后，**67 版本**，它刚刚跨越了**20,000 GitHub 星星**。在这些版本中，我们发布了**超过 900 个跟踪更改**——新功能、集成和强化。星星是副作用。版本就是故事，所以这是真正的故事：智能体记忆引擎如何从第一次公开提交到今天的版本，一个版本一个版本地发展。

<!-- truncate -->

## 时间线一览 {#the-timeline-at-a-glance}

|版本|当|发布|标题|
|---|---|---|---|
|**0.1.x**|2025 年 12 月|13|基础：嵌入式Postgres、本地MCP、`hindsight-embed`|
|**0.2.x**|2026 年 1 月|1|多记忆库 记忆库和跨记忆库 MCP 工具|
|**0.4.x**|2026 年 2 月 – 3 月|23|学习层：观察、心智模型、知识图谱|
|**0.5.x**|2026 年 4 月|7|更快的检索、星座视图、模板中心|
|**0.6 – 0.7.x**|2026 年 5 月|6|扩展搜索层、企业后端|
|**0.8.x**|2026 年 6 月 – 8 月|7|生产强化 + 编码工具集成浪潮|
|**0.9.x**|2026 年 8 月|2|每个编码智能体的知识页面和记忆|

## 2025 年 12 月 — v0.1.x：基础 {#december-2025--v01x-the-foundation}

首月十三个版本设置了自**嵌入式记忆存储、记忆召回和反思PostgreSQL**以来未更改的核心，无需运行外部矢量数据库。我们在当地的人体工程学方面进展迅速，因此任何人都可以在几分钟内尝试。

亮点：
- A **本地MCP服务器**，因此任何MCP客户端无需单独的服务即可连接，并且**`hindsight-embed`**可以在进程中运行记忆。
- 用于插入新操作的**扩展系统**，加上第一个**基于图的检索器**以使用记忆之间的关系。
- **记忆库**、**记忆 的标签**、**备份/恢复**和**多语言**内容支持。
- 模型和提供者的早期广度：**LiteLLM**、**连贯**嵌入/重排序、可配置嵌入维度和**Gemini 3 Pro / GPT-5.2**。

## 2026 年 1 月 — v0.2.x：多记忆库 记忆 {#january-2026--v02x-multi-bank-memory}

让隔离成为现实的专注版本。 **多记忆库访问** 加上MCP 跨记忆库工作的工具意味着每个用户和每个项目的记忆不再是理论。它还添加了**AnthropicClaude**和**LM工作室**、记忆存储上的自定义实体、结构化`reflect`输出以及控制平面中的第一个**图形可视化**。

## 2026 年 2 月至 3 月 — v0.4.x：学习层 {#february-to-march-2026--v04x-the-learning-layer}

这是一个大的，这篇文章的早期草稿的发行线被低估了。 **二十三个版本和大约 300 个更改。** 如果说 0.1 给了 Hindsight 一个放置记忆的地方，那么 0.4 则给了它从记忆中提取 *学习* 的能力。

学习层：
- **观察**——源自原始事实的整合、去重复的信念——具有可配置的范围、每个范围的限制、历史跟踪和批量集成。
- **心智模型** — 刷新自我的固定答案 — 具有完整的 MCP 创建/读取/更新/删除、标签感知触发器、过时信号和历史差异视图。
- 真正的**知识图谱**：实体解析、更丰富的实体标签、改进的**因果关系**检测以及时间排序。

其他一切都围绕它放大：
- **摄取任何东西**：PDF、图像和 Office 文档、Iris 解析器和通过提供商 Batch API 实现的异步批处理记忆存储。
- **大规模检索**：每个记忆库 HNSW 索引，pgvectorscale (DiskANN) 支持，以及大型记忆库上观察记忆召回的 40 倍加速。
- **多租户和授权**：承载令牌MCP、分层配置范围、Supabase 租户扩展和`consolidation.completed` / `retain.completed` **网络钩子**。
- **整合浪潮开始**：Claude Code、Codex CLI、LangGraph、VercelAISDK、聊天SDK、CrewAI、PydanticAI、AG2、 Agno、Strands 和 LlamaIndex，以及 Go 和 AI SDK 客户端和本机 Windows 支持。

## 2026 年 4 月 — v0.5.x：检索增长 {#april-2026--v05x-retrieval-grows-up}

七个版本，约 137 个更改，专注于使记忆召回更快且记忆可移植。图故事合并到单个**LinkExpansion 检索器**上，而**3阶段记忆存储管道**极大地提高了并发下的摄取吞吐量。

亮点：
- **星座视图** — 具有热梯度着色的交互式、可缩放实体图画布。
- **Delta心智模型刷新** 仅重新读取自上次运行以来创建的记忆。
- **记忆库模板导入/导出** 通过模板中心：将记忆库的配置、心智模型和指令导出为可重用清单。
- **本地和开放推理**：内置**美洲驼.cpp**提供程序，加上OpenRouter和一流的DeepSeek支持。
- 新集成：OpenAI智能体SDK、AutoGen、Paperclip、OpenCode和Pipecat语音。

## 2026 年 5 月 — v0.6.x 和 v0.7.x：缩放搜索层 {#may-2026--v06x-and-v07x-scaling-the-search-layer}

两条小线，一个主题：在真实数据规模下实现快速、正确的检索，并到达企业后端。

亮点：
- **BM25 搜索后端**：ParadeDB `pg_search`（Citus 兼容）和 PGroonga，用于更好的多语言搜索，以及可配置的标记化。
- **企业存储**：AlloyDB ScaNN 索引、**Oracle 数据库** 后端以及用于记忆召回流量的只读副本选项。
- 更智能的调度：**记忆库-优先整合** 并通过观察范围进行有针对性的整合。
- 更多提供商和模型：z.ai、Fireworks、具有自动回退链的 litellmrouter 和 Qwen3 重排序器。
- 集成：Dify、n8n、SmolAgents、AWS Bedrock AgentCore、Google ADK、Flowise、Roo Code、Vapi 语音和 Gemini Spark。

## 2026 年 6 月至 8 月 — v0.8.x：专为在生产环境中运行而构建 {#june-to-august-2026--v08x-built-to-run-in-production}

项目历史上第二大线路：**七个版本和超过 230 个更改。** 这是Hindsight在操作上变得严肃的地方，也是集成列表爆炸的地方。

生产强化：
- **定期后台维护** 协调整合状态并自行在租户之间强制保留。
- **持久、可恢复的进度快照** 用于长期运行的集成和批量保留。
- **可逆记忆管理** — 编辑、无效和恢复记忆单元 — 以及近乎重复的观察的**语义去重**。
- A **自诊断健康探头**，报告事件循环是否被阻塞或连接池是否耗尽。
- **全记忆库和跨记忆库导出/导入**（无需重新运行LLM），加上提示前缀缓存和Anthropic批处理+提示缓存以降低成本。
- 安全性：**记忆防御** SIEM 丰富和多LLM 故障转移/循环。

整合浪潮：
- **GitHubCopilot**（CLI 和 VS Code）、**Aider**、**Zed**、**OpenHands**、**Continue.dev**、**Cursor**（插件和 CLI）、**Cline**、**风帆冲浪**、**作曲**、 **Zapier**、**Obsidian**、**Haystack**、**微软智能体框架** 等等。

## 2026 年 8 月 — v0.9.x：知识页面和每次编码的记忆智能体 {#august-2026--v09x-knowledge-pages-and-memory-for-every-coding-agent}

最新的两个版本将所有基础设施转向外部。

- **知识页面** 将记忆库变成一个自我修复的维基百科，它可以书写自己：从巩固的记忆中合成的活文档，随着记忆库的学习而刷新。
- **Hindsight 编码智能体** 为**十编码智能体** — Claude Code、Codex、Cursor CLI、opencode、Copilot CLI 等带来长期记忆 — 从一个包中，通过每个记忆库切换来调整记忆恢复期间的时间搜索、图形扩展和重排序。
- **0.9.1**：大致与**9 倍更快的时间提取**具有相同的结果，**携带知识页面树的整个记忆库传输**、**xAI OAuth
一周后，**用于在 SuperGrok 订阅上运行LLM，以及独立于数据库的活跃度探针。
一周后

## 直通线 {#the-throughline}

回顾一下时间线，模式就清晰了。这里没有什么是即时技巧。它是数据库、检索策略、学习层、集成、摄取、身份验证和操作管道：这些不起眼的基础设施使记忆足够准确以进行测量，但又足够无聊以在生产中运行。 67 个版本中有超过 900 个变化，而且它的形状也变得越来越清晰。

我们应该保持诚实：Hindsight不是该类别中星级最高的项目，无论如何，基准测试是我们宁愿竞争的地方。如果您还没有尝试过，请在 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 上免费启动，或从 [GitHub](https://github.com/vectorize-io/hindsight) 通过一个命令进行自托管。感谢所有发布版本、提出问题或在此基础上构建内容的人。下一个版本已经在进行中。

---

**了解更多：**
- [完整变更日志](https://hindsight.vectorize.io/changelog) — 每个版本的详细信息
- [Hindsight 0.9.0](https://hindsight.vectorize.io/blog/2026/08/06/hindsight-0-9-0) — 每个编码智能体的知识页面和记忆
- [最好的开源智能体记忆系统](https://hindsight.vectorize.io/blog/2026/08/11/open-source-agent-memory-systems) — 诚实地审视整个类别
