---
title: "GitHub 星标突破 50,000"
authors: [benfrank241]
slug: "2026/10/15/hindsight-50k-stars"
date: 2026-10-15T12:00
tags: [hindsight, agent-memory, open-source, milestone, community]
description: "Hindsight 用 350 天突破 50,000 个 GitHub 星标，并在同一周发布了 1.0 和 Hindsight Memlake。"
image: /img/blog/hindsight-50k-stars.png
hide_table_of_contents: true
---

import {StaticImage} from '@site/src/components/StaticMedia';

<StaticImage src="/img/blog/hindsight-50k-stars.png" alt="Hindsight 的 GitHub 星标数突破 50,000" />

我们的 GitHub 星标数达到 **50,000** 了。这个仓库才上线 350 天。

同一周还有两件大事。

**[Hindsight 1.0](https://github.com/vectorize-io/hindsight/releases/tag/v1.0.0)。** 产品已在生产环境运行一年，Hindsight Cloud 的用户超过 30,000 人，并在 Agent Memory Benchmark 的每个数据集上都排名第一。架构和 API 已经稳定，从现在起，API 就是一项承诺。它会继续保持开源、免费，并继续运行在 Postgres 上。

**[Hindsight Memlake](/blog/2026/10/13/memlake)。** 这是一种存储引擎，可将智能体记忆保存在对象存储中，放进由你掌控的存储桶里；毫秒级即可搜索，专为十亿条及更多记忆而构建。存储 1 亿条记忆时，p99 延迟低于 100ms。它是 Hindsight Enterprise 的一部分，而 Hindsight Cloud 已有大部分服务运行在其上。如果每个记忆库的记忆少于约 50,000 条，Postgres 仍然是合适的选择，我们也会继续这么建议。

<!-- truncate -->

今天的项目数据：

| | |
|---|---|
| 星标 | **50,000** |
| Fork 数 | 6,077 |
| 贡献者 | 288 |
| 已合并的拉取请求 | 3,042 |
| 发布版本 | 73 |
| 项目运行天数 | 350 天 |
| 许可证 | MIT |

这意味着我们平均每 4.8 天发布一个版本，并且这种节奏持续了十一个半月。

没有其他人的工作，就不会有这一切。[pgvector](https://github.com/pgvector/pgvector) 提供了 Recall 所依赖的相似性搜索。开放权重模型让你能够在自己的硬件上运行这一整套系统。

感谢所有提交了带复现步骤而非截图的问题、为我们从未听说过的集成发起拉取请求，或质疑某项设计决策后证明自己判断正确的人。1.0 中有几项精细改进，正是因为团队之外的人指出“这里不对”才得以实现。

感谢大家送来的星标。如果你还没试过，只需运行一条命令，就能将你机器上的所有编程智能体接入同一个共享记忆库：

```bash
npx @vectorize-io/hindsight-coding-agents install all
```
