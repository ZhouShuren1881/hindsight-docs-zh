---
title: "30 天内下载 763,365 次：Hindsight 下载量突破 100 万"
description: "hindsight-client 软件包在 PyPI 上的下载量刚刚突破 100 万次，其中 763,365 次发生在最近 30 天，约占其历史安装量的四分之三。简述这一里程碑，以及安装曲线所反映的情况。"
slug: "2026/06/11/one-million-downloads"
date: 2026-06-11T12:00
image: "/img/blog/hindsight-one-million-downloads.webp"
tags: [milestone, release]
hide_table_of_contents: true
---

![Hindsight 下载量突破 1,000,000 次](/img/blog/hindsight-one-million-downloads.webp)

就在过去一天中的某个时刻，[`hindsight-client`](https://pypi.org/project/hindsight-client/) 软件包在 PyPI 上的下载量突破了 **1,000,000 次**。这是它自己的下载量，不包括 Hindsight 产品系列中的其他软件包。

第一个版本于 2025 年 12 月 12 日发布。也就是说，不到六个月就达成了百万次安装。

<!-- truncate -->

---

## 下载数据 {#the-numbers}

按 Star 增长速度衡量，Hindsight 是[迄今增长最快的开源 AI 记忆项目](/blog/2026/06/09/fastest-growing-oss-ai-memory)。下载量从另一个角度讲述了同一个故事：这些人确实在安装并运行它，而不只是把代码仓库加入收藏。

| 软件包 | 软件包仓库 | 下载量 |
| --- | --- | ---: |
| `hindsight-client` | PyPI | **1,016,771** |
| `hindsight-api` | PyPI | ~175,000 |
| `@vectorize-io/hindsight-client` | npm | ~90,000 |

再加上 API 软件包和 npm 客户端，Hindsight 在各软件包仓库的总安装量已远超 **120 万次**。

仔细看看客户端的下载数据，增长曲线就说明了一切：累计下载的 1,016,771 次中，**763,365 次发生在最近 30 天**。Hindsight 有史以来的安装量中，四分之三都集中在上个月。如今，客户端每周的下载量约为 **178,000 次**，这不只是“在增长”，而是在加速增长。

## 为什么客户端的下载量最重要 {#why-the-client-number-matters-most}

`hindsight-client` 是一个精简的 SDK；要让智能体连接 Hindsight 服务器，你需要用 `pip install` 安装的就是它。它是我们判断“是否有人基于 Hindsight 构建应用”最接近实际情况的指标，因为人们安装它，不是为了随便试用一下，而是因为下游的某个项目会导入它。

它突破百万次下载所用的时间，比我们从 10k 星增长到 15k 星所用的时间还短。这说明采用 Hindsight 的人不只是关注它，也在把它集成进自己的项目。

## 谢谢 {#thank-you}

感谢所有运行过 `pip install hindsight-client`、将它接入智能体、在它出问题时提交 issue，或将它部署到生产环境的人。正是因为你们，下载曲线才有了现在的走势。

如果你还没有安装：

```bash
pip install hindsight-client -U
```

[在 GitHub 上给 Hindsight 点 Star](https://github.com/vectorize-io/hindsight)，或[只用一条 Docker 命令自托管](/developer/installation)。
