---
title: "Hindsight GitHub 星标数突破 15,000：从 10,000 到 15,000 期间发布了什么"
description: "达到 10,000 星的里程碑五周后，Hindsight 的 GitHub 星标数突破 15,000。本文回顾这段时间开源仓库发布的内容：7 个版本、6 个新集成，以及星座图视图。"
slug: "2026/05/29/hindsight-15k-stars"
date: 2026-05-29T12:00
image: "/img/blog/hindsight-15k-stars.webp"
tags: [release, milestone]
hide_table_of_contents: true
---

![Hindsight 的 GitHub 星标数达到 15,000](/img/blog/hindsight-15k-stars.webp)

五周前，[Hindsight 的 GitHub 星标数突破了 10,000](/blog/2026/04/22/hindsight-10k-stars)。今天，计数器又越过了 15,000。

短短五周左右，星标数增加了 5,000，fork 数增加了 247。值得关注的是增长速度：这意味着每天都有新用户发现 Hindsight，而且其中相当一部分人会继续使用，久到愿意 fork、贡献代码或提交有价值的问题报告。

我们不想再写一篇“感谢大家送来星标”的文章。因此，下面简要回顾 10,000 星到 15,000 星期间，开源仓库实际发布了哪些内容。

<!-- truncate -->

---

## 五周内发布的七个版本 {#seven-releases-in-five-weeks}

[v0.5.3](/blog/2026/04/17/version-0-5-3)、[v0.5.5](/blog/2026/04/28/version-0-5-5)、[v0.6.0](/blog/2026/05/05/version-0-6-0)、[v0.6.1](/blog/2026/05/08/version-0-6-1)、[v0.6.2](/blog/2026/05/14/version-0-6-2)、[v0.7.0](/blog/2026/05/27/version-0-7-0) 和 [v0.7.1](/blog/2026/05/28/version-0-7-1) 都在这段时间内发布。主要更新包括：

- **0.6.0** 移除了集成插件读取进程环境变量的所有逻辑。现在，凭据通过 `SecretRef` 传递，来源可以是环境变量、文件或 exec。这为生产环境部署带来了重要的安全提升。
- **0.7.0** 带来了自 v0.5 以来规模最大的 API 接口调整，包括改进整合机制、改进 Reflect（反思）功能，以及心智模型刷新钩子。

## 六个新集成 {#six-new-integrations}

| 集成 | 文章 |
| --- | --- |
| OpenAI Agents | [为 OpenAI Agents SDK 添加持久记忆](/blog/2026/04/17/openai-agents-persistent-memory) |
| Pipecat | [为语音 AI 添加长期记忆](/blog/2026/04/28/pipecat-voice-ai-persistent-memory) |
| smolagents | [为 Hugging Face 的 smolagents 添加基于工具的记忆](/blog/2026/04/29/smolagents-memory-tools) |
| AWS AgentCore | [为 Bedrock Agents 添加多轮记忆](/blog/2026/05/01/agentcore-persistent-memory) |
| n8n | [每个 n8n 工作流都缺少的记忆层](/blog/2026/05/07/n8n-persistent-memory) |
| Paperclip | [为 Paperclip 智能体添加持久记忆](/blog/2026/05/26/paperclip-persistent-memory) |

至此，官方集成数量达到 27 个。

## 星座图视图 {#the-constellation-graph-view}

[星座视图](/blog/2026/04/16/constellation-view)是一个交互式图，展示记忆以及连接这些记忆的实体。它在 10,000 星里程碑前不久发布，而这段时间里，它的大部分使用量才逐渐累积起来。同一引擎现在也为“实体”→“关系”选项卡提供支持。星座视图随开源控制台一同提供，可连接到任何自托管实例。

## 几篇值得重读的文章 {#a-few-posts-worth-re-reading}

过去五周传播最广的几篇文章：

- [你的智能体并非健忘——它只是从未获得记忆](/blog/2026/04/23/your-agent-is-not-forgetful) — 关于这个问题的基础论述
- [为什么每个智能体运行框架都需要记忆层](/blog/2026/05/04/agent-harness-needs-memory) — 从更广的角度阐述记忆作为基础设施的价值
- [为什么不应为智能体记忆使用外部向量数据库](/blog/2026/05/12/case-against-external-vector-dbs-agent-memory) — 解释我们为什么不随产品提供这类数据库
- [智能体记忆中的整合难题](/blog/2026/05/21/agent-memory-consolidation) — 保留、合并、衰减、淘汰
- [构建能记住代码库的 Hermes 编程助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 编程智能体模板

## 接下来会有什么 {#whats-next}

0.7 系列还会有几个版本。自托管用户可以关注下一轮操作对话框改进，以及一些未能赶上 0.7.1、针对 Recall（召回）路径的性能优化。在集成方面，我们正逐步补齐其余主要框架；我们的目标是到第三季度末实现“只要能运行智能体，就能接入 Hindsight”。

感谢大家一路支持。一路为项目点亮星标的每个人，都是我们能走到今天的原因之一。

[在 GitHub 上为 Hindsight 点亮星标](https://github.com/vectorize-io/hindsight)，或[只用一条 Docker 命令进行自托管部署](/developer/installation)。
