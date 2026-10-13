---
title: "30 天内下载 763,365 次：Hindsight 突破 1M"
description: "后见之明客户端软件包在 PyPI 上的下载量刚刚突破 100 万次，其中 763,365 次下载是在过去 30 天内完成的，约占历史安装量的四分之三。关于里程碑和安装曲线的简要说明。"
slug: "2026/06/11/one-million-downloads"
date: 2026-06-11T12:00
image: "/img/blog/hindsight-one-million-downloads.webp"
tags: [milestone, release]
hide_table_of_contents: true
---

![Hindsight 下载量突破 1,000,000 次](/img/blog/hindsight-one-million-downloads.webp)

在最后一天的某个时候，[`hindsight-client`](https://pypi.org/project/hindsight-client/)包裹独自穿越了**PyPI 上的下载量为 1,000,000 次**——不包括家里的其他人。

第一个版本于 2025 年 12 月 12 日上线。所以**不到六个月** 的安装量达到一百万。

<!-- truncate -->

---

## 数字 {#the-numbers}

Hindsight 是[增长最快的开源AI有史以来的记忆项目](/blog/2026/06/09/fastest-growing-oss-ai-memory)，通过恒星速度测量。下载从不同的角度讲述了同一个故事——这些人实际上安装并运行它，而不仅仅是为存储库添加书签。

|套餐|注册表|下载|
|---|---|---:|
|`hindsight-client`|PyPI|**1,016,771**|
|`hindsight-api`|PyPI|~175,000|
|`@vectorize-io/hindsight-client`|npm|~90,000|

添加API软件包和npm客户端，并且Hindsight远远超过了**120万**跨注册表的总安装量。

仔细观察该客户数量，曲线就说明了一切：在这 1,016,771 次终生下载中，**过去 30 天内发生了 763,365 起事件**。每次安装的 Hindsight 有四分之三是在上个月登陆的。客户端现在大约以 **每周 178,000 次下载** 运行 — 不是“增长”，而是加速。

## 为什么客户数量最重要 {#why-the-client-number-matters-most}

`hindsight-client` 是精简的 SDK — 这是您通过智能体与 Hindsight 服务器进行通信的 `pip install`。这是我们对“有人正在 Hindsight 上构建”最接近的代理，因为您安装它不是为了尝试；您安装它是因为下游的某些东西会导入它。

它突破 100 万的速度比我们从 10k 到 15k 星的速度还要快，这表明采用不仅仅是关注。这是整合。

## 谢谢 {#thank-you}

致所有运行`pip install hindsight-client`、将其连接到智能体、在其出现故障时提出问题或将其投入生产的人 — 谢谢。你就是曲线看起来如此的原因。

如果你还没有：

```bash
pip install hindsight-client -U
```

[Hindsight GitHub](https://github.com/vectorize-io/hindsight)或[使用单个Docker命令进行自托管](https://hindsight.vectorize.io/developer/installation)。
