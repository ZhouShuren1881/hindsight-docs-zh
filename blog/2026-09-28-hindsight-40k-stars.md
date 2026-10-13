---
title: "四万星标，以及我们真正关注的数字"
authors: [benfrank241]
slug: "2026/09/28/hindsight-40k-stars"
date: 2026-09-28T16:00
tags: [hindsight, agent-memory, open-source, milestone, community]
description: "Hindsight 十一个月达到四万 GitHub 星标，第二个两万只用 45 天。了解背后的统计及比星标更有意义的数字。"
image: /img/blog/hindsight-40k-stars.webp
hide_table_of_contents: true
---

![Hindsight 突破四万 GitHub 星标](/img/blog/hindsight-40k-stars.webp)

Hindsight 刚突破 **40,000 个 GitHub 星标**。

[两万星标时](https://hindsight.vectorize.io/blog/2026/08/14/hindsight-20k-stars)我们按版本梳理完整时间线，最初两万用了约十个月。

第二个两万只用了 45 天。

今天没有新产品发布，这篇只分享数字、期间成果，以及感谢。

<!-- truncate -->

我们还制作了一个小视频：编程智能体和自己的记忆在公园散步，一起理解知识页面的用途。

<div style={{position: "relative", paddingBottom: "56.25%", height: 0, margin: "1rem 0 2rem", borderRadius: "8px", overflow: "hidden"}}>
  <iframe
    style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%"}}
    src="https://www.youtube.com/embed/mTpSHe41WSU"
    title="一份记忆，每个智能体——Hindsight 达到四万星标"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  ></iframe>
</div>

## 当前情况 {#where-things-stand}

| | |
|---|---|
| 星标 | **40,000** |
| 仓库分支 | 5,280 |
| 贡献者 | 263 |
| 已合并拉取请求 | 2,691 |
| 发布版本 | 70 |
| 项目时间 | 333 天 |
| 许可证 | MIT |

相当于平均每 4.8 天发布一次、每天合并约八个 PR，持续十一个月。

## 我们真正关注的数字 {#the-one-we-actually-watch}

星标像书签，没有成本，只说明某人看过一次。

我们关注的是 **5,280 个 fork，约为星标的 13%**。基础设施项目中，这个比例更有意义：fork 往往表示打算运行、认真阅读或修改。仓库可能热门而 fork 不动，我们的两者一起增长。

263 位贡献者有提交被合并，这是发布频率背后的人，也不是买关注就能获得的数字。

![263 位已有提交合入 Hindsight 的贡献者](/img/blog/hindsight-40k-contributors.jpg)

## 45 天里完成了什么 {#what-landed-in-those-45-days}

翻倍恰逢最忙的发布阶段：两万星标文章之后，**24 次发布**、678 个已合并 PR、四个核心版本。

- **[0.9.1](https://hindsight.vectorize.io/blog/2026/08/14/version-0-9-1)** 为反思提供当前日期，让迁移可跨实例。
- **[0.9.2](https://hindsight.vectorize.io/blog/2026/08/24/version-0-9-2)** 通过 MCP 提供知识库，为召回添加显式时间窗口，稳定存储内存上限。
- **[0.10.0](https://hindsight.vectorize.io/blog/2026/09/14/version-0-10-0)** 支持原生图片和文件记忆、准确提示词预览，并重建请求路径。
- **[0.10.1](https://hindsight.vectorize.io/blog/2026/09/21/version-0-10-1)** 新增 [Jev 重排序](https://hindsight.vectorize.io/blog/2026/09/24/adding-jev-reranker-what-we-learned)，让[记忆库可搬走](https://hindsight.vectorize.io/blog/2026/09/22/move-a-memory-bank)。

集成比核心进展更快，通常说明人们真的在将系统接入产品。

## 感谢 {#thank-you}

感谢提交可复现问题、发送 PR、讨论设计，或记录迁移帮助后来者的每个人。最近两版若干精细改进，正因团队外的人指出“这里不对”而出现。

希望参与下一阶段，请到[仓库](https://github.com/vectorize-io/hindsight)，适合新人的 issue 已有标签。

## 接下来 {#whats-next}

不作路线图承诺。现在最关注的是不起眼的部分：让召回更便宜，让系统的认知更容易检查，让库中不再充满你本不想保留的东西。

正在使用 Hindsight 时，告诉我们哪里让你烦恼，是最有用的反馈。

## 了解更多 {#learn-more}

- [两万星标：Hindsight 的逐版本历程](https://hindsight.vectorize.io/blog/2026/08/14/hindsight-20k-stars)：完整时间线。
- [这个夏天，Hindsight 学会了什么](https://hindsight.vectorize.io/blog/2026/09/18/what-hindsight-learned-this-summer)：能力演进，而非版本清单。
- [项目仓库](https://github.com/vectorize-io/hindsight)。
