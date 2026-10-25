---
title: "20,000 颗星：Hindsight 如何走到今天，逐个版本回顾"
authors: [benfrank241]
slug: "2026/08/14/hindsight-20k-stars"
date: 2026-08-14T12:00
tags: [hindsight, agent-memory, open-source, milestone, changelog]
description: "Hindsight 在不到 10 个月内发布 67 个版本，GitHub 星标数刚刚突破 20,000。这是项目时间线：我们逐个版本交付的主要功能。"
image: /img/blog/hindsight-20k-stars.webp
hide_table_of_contents: true
---

![Hindsight 达到 20,000 个 GitHub 星标：从 2025 年 12 月首次开源提交到 v0.9.1 的版本时间线](/img/blog/hindsight-20k-stars.webp)

我们于 2025 年 12 月将 Hindsight 开源。九个月、**67 个版本**之后，项目的 GitHub 星标数刚刚突破 **20,000**。这些版本累计交付了**超过 900 项已跟踪变更**，涵盖新功能、集成和加固工作。星标只是附带结果，真正的故事在每次发布中。下面就按版本回顾：一个智能体记忆引擎如何从首次公开提交发展到今天。

<!-- truncate -->

## 时间线一览 {#the-timeline-at-a-glance}

| 版本 | 时间 | 发布数 | 主要内容 |
|---|---|---:|---|
| **0.1.x** | 2025 年 12 月 | 13 | 基础能力：嵌入式 Postgres、本地 MCP、`hindsight-embed` |
| **0.2.x** | 2026 年 1 月 | 1 | 多记忆库记忆和跨记忆库 MCP 工具 |
| **0.4.x** | 2026 年 2 月至 3 月 | 23 | 学习层：观测、心智模型、知识图谱 |
| **0.5.x** | 2026 年 4 月 | 7 | 更快的检索、星座视图、模板中心 |
| **0.6 – 0.7.x** | 2026 年 5 月 | 6 | 搜索层扩展、企业级后端 |
| **0.8.x** | 2026 年 6 月至 8 月 | 7 | 生产环境加固，以及一波编程工具集成 |
| **0.9.x** | 2026 年 8 月 | 2 | 知识页，以及面向所有编程智能体的记忆 |

## 2025 年 12 月 — v0.1.x：奠定基础 {#december-2025--v01x-the-foundation}

首月发布的 13 个版本奠定了至今未变的核心：基于嵌入式 PostgreSQL 执行 Retain（存入）、Recall（召回）和 Reflect（反思），无需运行外部向量数据库。我们快速打磨本地使用体验，让任何人都能在几分钟内试用。

亮点：
- **本地 MCP 服务器**让任何 MCP 客户端无需单独部署服务即可连接；**`hindsight-embed`** 则可在进程内运行记忆引擎。
- **扩展系统**支持接入新操作；同时推出首个**基于图的检索器**，利用记忆之间的关系。
- 支持**记忆库**、**记忆标签**、**备份与恢复**以及**多语言**内容。
- 扩展模型和服务提供方支持：**LiteLLM**、**Cohere** 嵌入模型与重排序、可配置的嵌入维度，以及 **Gemini 3 Pro / GPT-5.2**。

## 2026 年 1 月 — v0.2.x：多记忆库记忆 {#january-2026--v02x-multi-bank-memory}

这个版本集中解决了隔离问题。**多记忆库访问**和用于跨库操作的 MCP 工具，让按用户和按项目隔离记忆不再只是设想。版本还加入了 **Anthropic Claude** 和 **LM Studio**、存入记忆时指定自定义实体、结构化 `reflect` 输出，以及控制台中的首个**图可视化**。

## 2026 年 2 月至 3 月 — v0.4.x：学习层 {#february-to-march-2026--v04x-the-learning-layer}

这是重要的一条版本线，本文早期草稿低估了它的分量。**23 个版本，约 300 项变更。**如果说 0.1 为 Hindsight 提供了存放记忆的地方，那么 0.4 则让它能够从记忆中*学习*。

学习层包括：
- **观测**：从原始事实中推导出的整合、去重认知判断；支持配置范围、各范围限额、历史跟踪和批量整合。
- **心智模型**：会自行刷新的常备答案；支持完整的 MCP 创建、读取、更新和删除操作，按标签触发、提供待更新状态信号，并可查看历史差异。
- 真正的**知识图谱**：实体消歧、更丰富的实体标签、更好的**因果连接**检测，以及时间排序。

其他方面也随之扩展：
- **摄取各种内容**：支持 PDF、图片和 Office 文档；加入 Iris 解析器，并通过模型供应商的 Batch API 异步批量存入记忆。
- **大规模检索**：每个记忆库可使用 HNSW 索引，支持 pgvectorscale（DiskANN）；在大型记忆库中，观测召回速度提升了 40 倍。
- **多租户与身份认证**：MCP 支持 Bearer token；配置范围分层；加入 Supabase 租户扩展，以及 `consolidation.completed` / `retain.completed` **Webhook**。
- **集成浪潮开启**：接入 Claude Code、Codex CLI、LangGraph、Vercel AI SDK、Chat SDK、CrewAI、PydanticAI、AG2、Agno、Strands 和 LlamaIndex；同时提供 Go 和 AI SDK 客户端，并支持原生 Windows。

## 2026 年 4 月 — v0.5.x：检索能力升级 {#april-2026--v05x-retrieval-grows-up}

7 个版本、约 137 项变更，重点是加快 Recall 并让记忆更易移植。图检索统一到单一的 **LinkExpansion 检索器**；**三阶段 Retain 流程**则大幅提升了并发情况下的摄取吞吐量。

亮点：
- **星座视图**：可交互、可缩放的实体图画布，使用热度渐变着色。
- **心智模型增量刷新**：只重新读取上次运行后创建的记忆。
- **记忆库模板导入与导出**：通过模板中心将记忆库配置、心智模型和强制指令导出为可复用清单。
- **本地和开放式推理**：内置 **llama.cpp** 服务提供方，并加入 OpenRouter 和一等的 DeepSeek 支持。
- 新增集成：OpenAI Agents SDK、AutoGen、Paperclip、OpenCode 和 Pipecat 语音。

## 2026 年 5 月 — v0.6.x 和 v0.7.x：扩展搜索层 {#may-2026--v06x-and-v07x-scaling-the-search-layer}

两个次要版本围绕同一主题：在真实规模的数据上实现快速、准确的检索，并支持企业级后端。

亮点：
- **BM25 搜索后端**：ParadeDB `pg_search`（兼容 Citus）和 PGroonga 改善了多语言搜索；同时支持配置分词方式。
- **企业级存储**：支持 AlloyDB ScaNN 索引、**Oracle Database** 后端，以及为 Recall 流量配置只读副本。
- 调度更智能：支持**按记忆库优先级进行整合**，并可针对观测范围执行整合。
- 新增更多服务提供方和模型：z.ai、Fireworks、可自动切换回退链的 litellmrouter，以及 Qwen3 重排序模型。
- 新增集成：Dify、n8n、SmolAgents、AWS Bedrock AgentCore、Google ADK、Flowise、Roo Code、Vapi 语音和 Gemini Spark。

## 2026 年 6 月至 8 月 — v0.8.x：为生产环境打造 {#june-to-august-2026--v08x-built-to-run-in-production}

这是项目历史上第二大版本线：**7 个版本，超过 230 项变更。**从这条版本线开始，Hindsight 在运维能力上更加成熟，集成列表也迅速扩大。

生产环境加固：
- **定期后台维护**会自动协调整合状态，并在各租户间执行保留期限策略。
- 为长时间运行的整合和批量 Retain 提供**持久、可恢复的进度快照**。
- 支持**可逆的记忆维护**：编辑、标记失效和恢复记忆单元；还可对近似重复的观测执行**语义去重**。
- **自诊断健康探针**可报告事件循环是否受阻或连接池是否已耗尽。
- 支持**整个记忆库及跨记忆库的导出与导入**（无需重新运行 LLM），并加入提示前缀缓存和 Anthropic 批处理及提示缓存以降低成本。
- 安全能力：Memory Defense 的 SIEM 信息增强，以及多 LLM 故障切换与轮询调度。

集成浪潮：
- 新增 **GitHub Copilot**（CLI 和 VS Code）、**Aider**、**Zed**、**OpenHands**、**Continue.dev**、**Cursor**（插件和 CLI）、**Cline**、**Windsurf**、**Composio**、**Zapier**、**Obsidian**、**Haystack**、**Microsoft Agent Framework** 等集成。

## 2026 年 8 月 — v0.9.x：知识页，以及面向所有编程智能体的记忆 {#august-2026--v09x-knowledge-pages-and-memory-for-every-coding-agent}

最近发布的两个版本让所有这些基础设施开始服务更广泛的场景。

- **知识页**将记忆库变成一套可以自我维护的 Wiki：它根据整合后的记忆综合生成持续更新的文档，并随记忆库不断学习而刷新。
- **Hindsight Coding Agents** 通过一个软件包，为**十种编程智能体**带来长期记忆，包括 Claude Code、Codex、Cursor CLI、opencode、Copilot CLI 等；还可按记忆库切换 Recall 时的时间检索、图扩展和重排序。
- 一周后发布的 **0.9.1** 带来约 **9 倍更快的时间信息提取**，结果保持不变；还支持**连同知识页目录树一起传输整个记忆库**、使用 **xAI OAuth** 通过 SuperGrok 订阅运行 LLM，以及独立于数据库的存活探针。

## 贯穿始终的主线 {#the-throughline}

回看这条时间线，脉络很清楚。这里没有什么提示词技巧，核心是数据库、检索策略、学习层、整合、摄取、身份认证和运维基础设施：这些不起眼的底层工作，让记忆足够准确、可以衡量，也让系统在生产环境中足够稳定、易于运行。67 个版本累计变更超过 900 项，项目的轮廓也愈发清晰。

我们也应实事求是：Hindsight 并不是这个类别中星标最多的项目；相比之下，我们更愿意在基准测试上竞争。如果你还没试过，可以免费开始使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，也可以通过一条命令从 [GitHub](https://github.com/vectorize-io/hindsight) 自托管。感谢每一位发布版本、提交问题或基于 Hindsight 构建产品的人。下一个版本已经在开发中。

---

**了解更多：**
- [完整变更日志](/changelog) — 查看每个版本的详细信息
- [Hindsight 0.9.0](/blog/2026/08/06/hindsight-0-9-0) — 知识页，以及面向所有编程智能体的记忆
- [最佳开源智能体记忆系统](/blog/2026/08/11/open-source-agent-memory-systems) — 客观审视整个类别
