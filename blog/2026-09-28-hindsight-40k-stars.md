---
title: "四万星标，以及我们真正关注的数字"
authors: [benfrank241]
slug: "2026/09/28/hindsight-40k-stars"
date: 2026-09-28T16:00
tags: [hindsight, agent-memory, open-source, milestone, community]
description: "Hindsight 用十一个月突破 40,000 个 GitHub 星标。看看背后的数据、星标翻倍所用的 45 天，以及一个比星标更能说明问题的数字。"
image: /img/blog/hindsight-40k-stars.webp
hide_table_of_contents: true
---

![Hindsight 的 GitHub 星标数突破 40,000](/img/blog/hindsight-40k-stars.webp)

Hindsight 的 GitHub 星标数刚刚突破 **40,000**。

在[达到两万星标时](https://hindsight.vectorize.io/blog/2026/08/14/hindsight-20k-stars)，我们按版本梳理了完整时间线。最初的两万用了约十个月。

第二个两万只用了 45 天。

今天没有新产品发布，所以这篇只聊聊数字、星标增长期间推出的内容，以及一声感谢。

<!-- truncate -->

为此我们还制作了一段有点傻气的小视频：一名编程智能体和它的记忆在公园散步，一起琢磨知识页有什么用。

<div style={{position: "relative", paddingBottom: "56.25%", height: 0, margin: "1rem 0 2rem", borderRadius: "8px", overflow: "hidden"}}>
  <iframe
    style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%"}}
    src="https://www.youtube.com/embed/mTpSHe41WSU"
    title="一份记忆，每个智能体——Hindsight 星标突破四万"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  ></iframe>
</div>

## 当前情况 {#where-things-stand}

| | |
|---|---|
| 星标 | **40,000** |
| Fork 数 | 5,280 |
| 贡献者 | 263 |
| 已合并的拉取请求 | 2,691 |
| 发布版本 | 70 |
| 项目运行天数 | 333 天 |
| 许可证 | MIT |

这相当于平均每 4.8 天发布一个版本，每天合并约 8 个拉取请求，而且这种节奏持续了十一个月。

## 我们真正关注的数字 {#the-one-we-actually-watch}

星标就像书签，不花钱，只说明有人曾经看过这个项目。

我们关注的是 **Fork 数：5,280，约为星标数的 13%**。对基础设施项目来说，这个比例更有意思，因为人们 fork 仓库，通常是打算运行项目、认真阅读代码或进行修改。某个仓库可以走红，而 Fork 数却不动；我们的 Fork 数也随星标一起增长。

有 263 人的提交曾被合入项目。这就是发布节奏背后的人数，也是花钱买关注换不来的数字。

![曾有提交合入 Hindsight 的 263 位贡献者](/img/blog/hindsight-40k-contributors.jpg)

## 这 45 天里发布了什么 {#what-landed-in-those-45-days}

星标翻倍恰好赶上我们迄今发布最密集的一段时间。从两万星标那篇文章发布以来：**发布了 24 个版本**，合并了 678 个拉取请求，并推出了四个核心版本。

- **[0.9.1](https://hindsight.vectorize.io/blog/2026/08/14/version-0-9-1)** 让 Reflect 能够使用当前日期，并使迁移内容可以跨实例携带。
- **[0.9.2](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2)** 让 MCP 客户端可以访问知识库，为 Recall 添加显式时间窗口，并使 Retain 操作的内存占用上限不再随文档大小增长。
- **[0.10.0](https://hindsight.vectorize.io/blog/2026/09/14/version-0-10-0)** 将图片和文件纳入一等记忆内容，加入提示词预览，让你能准确查看一次操作将发送什么内容，并重建了请求路径。
- **[0.10.1](https://hindsight.vectorize.io/blog/2026/09/21/version-0-10-1)** 新增了 [Jev 重排序模型](https://hindsight.vectorize.io/blog/2026/09/24/adding-jev-reranker-what-we-learned)，并让[记忆库可以打包迁移](https://hindsight.vectorize.io/blog/2026/09/22/move-a-memory-bank)。

集成进展比核心功能更快，这通常说明人们确实在把 Hindsight 接入实际系统。

## 感谢 {#thank-you}

感谢所有提交了可复现问题、发起拉取请求、在讨论串中质疑设计决策，或记录自己的迁移过程、为后来者留下参考的人。最近两个版本中的一些精细改进，正是团队之外的人指出“这里不对”后才有的。

如果你想参与接下来的工作，可以从[项目仓库](https://github.com/vectorize-io/hindsight)开始；标记为适合新手的 issue 就是不错的起点。

## 接下来 {#whats-next}

我们不承诺路线图。坦率地说，我们目前最感兴趣的是那些不太光鲜的部分：降低 Recall 的成本，让系统的认知更容易检查，也让记忆库不再塞满你原本不打算保留的内容。

如果你正在运行 Hindsight，而它有些地方让你烦恼，这就是你能告诉我们的最有用的信息。

## 了解更多 {#learn-more}

- [两万星标：Hindsight 如何逐版本走到今天](https://hindsight.vectorize.io/blog/2026/08/14/hindsight-20k-stars)：查看完整时间线。
- [这个夏天，Hindsight 学会了什么](https://hindsight.vectorize.io/blog/2026/09/18/what-hindsight-learned-this-summer)：了解能力演进，而非版本列表。
- [项目仓库](https://github.com/vectorize-io/hindsight)
