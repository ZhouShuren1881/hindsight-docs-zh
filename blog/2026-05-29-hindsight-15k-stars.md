---
title: "Hindsight 达到 15,000 颗星：自 10k 以来已发货的内容"
description: "达到 10k 里程碑五周后，Hindsight 已达到 15k GitHub 星星。以下是开源存储库中提供的内容：7 个版本、6 个新集成和星座图视图。"
slug: "2026/05/29/hindsight-15k-stars"
date: 2026-05-29T12:00
image: "/img/blog/hindsight-15k-stars.webp"
tags: [release, milestone]
hide_table_of_contents: true
---

![Hindsight 达到 15,000 颗星](/img/blog/hindsight-15k-stars.webp)

五周前，[Hindsight突破10,000 GitHub星星](/blog/2026/04/22/hindsight-10k-stars)。今天，该股已突破 15,000 点。

大约五周内就有+5,000 个星和+247 个分叉。加速是值得注意的部分——这意味着每天都有新人发现Hindsight，并且其中稳定的一部分人会坚持足够长的时间来分叉、贡献或提交深思熟虑的错误。

我们不想写第二篇“感谢星星”的帖子。因此，这里是开源存储库中实际发布的 10k 到 15k 之间内容的简短版本。

<!-- truncate -->

---

## 五周内发布七个版本 {#seven-releases-in-five-weeks}

[v0.5.3](/blog/2026/04/17/version-0-5-3)、[v0.5.5](/blog/2026/04/28/version-0-5-5)、[v0.6.0](/blog/2026/05/05/version-0-6-0)、[v0.6.1](/blog/2026/05/08/version-0-6-1)、[v0.6.2](/blog/2026/05/14/version-0-6-2)、[v0.7.0](/blog/2026/05/27/version-0-7-0)、[v0.7.1](/blog/2026/05/28/version-0-7-1)都落在这个窗口中。亮点：

- **0.6.0** 删除了集成插件中的所有流程环境读取。凭证现在流经 `SecretRef`（env、文件或 exec 源）——对于生产部署来说这是一个有意义的安全升级。
- **0.7.0** 发布了自 v0.5 以来最大的 API 表面变化：改进的整合、坐标改进和心智模型刷新挂钩。

## 六个新集成 {#six-new-integrations}

|整合|帖子|
|---|---|
|OpenAI 智能体|[持久记忆OpenAI智能体SDK](/blog/2026/04/17/openai-agents-persistent-memory)|
|Pipecat|[语音AI具有长期记忆](/blog/2026/04/28/pipecat-voice-ai-persistent-memory)|
|烟熏剂|[基于工具的拥抱脸的smolagents记忆](/blog/2026/04/29/smolagents-memory-tools)|
|AWS AgentCore|[基岩智能体多回合记忆](/blog/2026/05/01/agentcore-persistent-memory)|
|n8n|[每个 n8n 工作流程都缺少记忆层](/blog/2026/05/07/n8n-persistent-memory)|
|Paperclip|[为Paperclip智能体添加持久记忆](/blog/2026/05/26/paperclip-persistent-memory)|

这使得官方积分数达到 27。

## 星座图视图 {#the-constellation-graph-view}

[星座视图](/blog/2026/04/16/constellation-view)——你的记忆和连接它们的实体的交互式图表——在 10k 里程碑之前发布，但在此窗口中获得了大部分使用。现在，同一个引擎为“实体”→“关系”选项卡提供支持。附带开源控制平面，可针对任何自托管实例运行。

## 一些值得重读的帖子 {#a-few-posts-worth-re-reading}

过去五周分享最多的一些文章：

- [你的智能体不会健忘——它从未被赋予记忆](/blog/2026/04/23/your-agent-is-not-forgetful) — 基本论证
- [为什么每个智能体线束都需要记忆层](/blog/2026/05/04/agent-harness-needs-memory) — 记忆作为基础设施的更广泛案例
- [针对智能体记忆的外部向量数据库的案例](/blog/2026/05/12/case-against-external-vector-dbs-agent-memory) — 为什么我们不发货
- [智能体记忆的整合问题](/blog/2026/05/21/agent-memory-consolidation) — 保留、合并、衰变、驱逐
- [构建一个记住您的代码库的Hermes编码助手](/blog/2026/05/25/hermes-coding-assistant-codebase-memory) — 编码-智能体模板

## 下一步是什么 {#whats-next}

0.7 系列还剩下一些版本。自托管用户应该关注下一轮操作对话框的改进以及记忆召回路径中未进入 0.7.1 的一些性能提升。在集成方面，我们正在缩小与其余主要框架的差距——目标是在第三季度末“如果你可以运行智能体，你就可以插入Hindsight”。

谢谢你们帮助我们走到这里。每一位给项目加星的用户都参与了这一里程碑。

[在 GitHub 上加星Hindsight](https://github.com/vectorize-io/hindsight)或[使用单个Docker命令进行自托管](https://hindsight.vectorize.io/developer/installation)。
