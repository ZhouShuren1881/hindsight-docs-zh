---
title: "我们提前体验了 NVIDIA Nemotron 3.5 Embed：它成为 Hindsight 的新一代顶尖嵌入模型"
authors: [andrewneeser]
slug: "2026/10/21/nemotron-3-5-embed-in-hindsight"
date: 2026-10-21T11:30
tags: [hindsight, agent-memory, embeddings, recall, nemotron, nvidia, benchmarks]
description: "NVIDIA 提前向我们开放了 Nemotron 3.5 Embed。我们原本期待它是一款表现扎实的嵌入模型，没想到它在记忆检索上击败了体量大四倍的模型，并登上 Hindsight 嵌入模型排行榜榜首。"
image: /img/blog/nemotron-3-5-embed-locomo.webp
hide_table_of_contents: true
---

import {StaticImage} from '@site/src/components/StaticMedia';

嵌入模型是 Hindsight 的核心模型之一。Hindsight 存入的每条记忆都会转换为向量嵌入；每次召回都会搜索这些向量，按含义查找记忆，同时还会进行关键词、图谱和时间检索。更好的嵌入模型能为下游各环节提供更好的记忆集合。

我们测试了 NVIDIA Nemotron Retriever 系列中的 Nemotron 3.5 Embed，以及另外七款嵌入模型，涵盖小型开放模型和 OpenAI API。测试基准包括用于长对话记忆的 LoCoMo 和 BEAM、覆盖八种语言的 27 项检索任务、公开的嵌入模型排行榜，以及单 GPU 上的查询延迟。Nemotron 在记忆检索和排行榜上均排名第一，查询速度也快于体量略高于它一半的模型。

<!-- truncate -->

## 简要结论 {#tldr}

- **记忆检索排名第一**：在 LoCoMo 上得分为 93.8%，在 BEAM 100K 上为 65.9%；对比对象包括 OpenAI text-embedding-3-small、BGE-M3 和 Qwen3-Embedding-0.6B 在内的另外七款嵌入模型。
- **Hindsight 嵌入模型排行榜第一**，MRR 和 recall@5 均为最高。
- **可完整读取段落。** 上下文窗口为 32,768 token，Nemotron 在 LoCoMo 中比 BGE-small-en v1.5 多找到 21.7 个百分点的已存对话段落证据。
- **适用于百万 token 级历史记录**：在 BEAM 1M 上，recall@10 为 44.2%；在 BEAM 10M 上为 38.0%。
- **八种语言表现最佳**：在 27 项公开检索任务上的平均 nDCG@10 为 55.1。
- **在单张 NVIDIA L4 上每次查询耗时 30 ms。** 它比体量略高于自身一半的 Qwen3-Embedding-0.6B 更快；相较于体量为其四倍的 Qwen3-Embedding-4B，速度约快一倍；准确率也高于这两款模型。

<StaticImage src="/img/blog/nemotron-3-5-embed-results-table.webp" alt="Nemotron 3.5 Embed 1B 与另外七款嵌入模型在记忆检索、长段落、长对话、延迟和八种语言上的结果" />

## 1. 更常找到正确的记忆 {#1-it-finds-the-right-memory-more-often}

LoCoMo 和 BEAM 是我们用来追踪 Hindsight 表现的长对话记忆基准。我们只将这些基准中的对话存入 Hindsight 一次，因此所有模型检索的都是完全相同的记忆，唯一变化的是嵌入模型。分数表示前 10 条结果中包含证据记忆的问题占比。

<StaticImage src="/img/blog/nemotron-3-5-embed-locomo.webp" alt="LoCoMo 上的记忆检索结果" />

<StaticImage src="/img/blog/nemotron-3-5-embed-beam-100k.webp" alt="BEAM 100K 上的记忆检索结果" />

Nemotron 在两个基准上都排名第一，领先于 OpenAI、BGE-M3、Qwen3 和四款实力强劲的小型模型。BEAM 100K 的测试难度更高：所有模型的成绩都有所下降，而 Nemotron 仍保持榜首。

## 2. 可完整读取对话段落 {#2-it-reads-the-whole-passage}

除了记忆本身，Hindsight 还会保留记忆所源自的对话段落，平均长度为 600 到 800 token。Recall 可以直接搜索这些段落，而模型只能匹配它实际读到的内容。Nemotron 最多可读取 32,768 个 token，因此每个段落都能完整转换为嵌入向量。

<StaticImage src="/img/blog/nemotron-3-5-embed-passages-locomo.webp" alt="LoCoMo 上 Hindsight 已存对话段落的 Recall@10" />

在 LoCoMo 上，Nemotron 在前 10 个段落中找到了 81.9% 的证据；BGE-M3 为 79.8%，BGE-small-en v1.5 为 60.3%（高出 21.7 个百分点，95% 区间为 +18.8 至 +25.0）。

## 3. 在百万 token 级历史记录中仍保持效果 {#3-it-holds-up-on-million-token-histories}

BEAM 最长的两个档位分别包含约 1 million 和 10 million token 的对话。每个模型都会为每轮对话生成嵌入向量，再针对每个问题对这些轮次排序。

<StaticImage src="/img/blog/nemotron-3-5-embed-beam-1m.webp" alt="BEAM 1M 上的 Recall@10" />

Nemotron 在两个档位的 recall@10 都是最高：1M 档为 44.2%，10M 档为 38.0%。

## 4. 支持多种语言 {#4-it-works-across-languages}

Hindsight 支持西班牙语、法语、德语、葡萄牙语、日语、韩语和中文。我们使用 MIRACL、MLDR、WebFAQ、mMARCO 和 T2Ranking 中的 27 项公开检索任务，评测了所有模型在这些语言上的表现。

<StaticImage src="/img/blog/nemotron-3-5-embed-multilingual.webp" alt="八种语言的平均 nDCG@10" />

<StaticImage src="/img/blog/nemotron-3-5-embed-languages-table.webp" alt="各模型按语言划分的 nDCG@10" />

Nemotron 的平均 nDCG@10 为 55.1，在我们评测的这些任务中高于所有其他模型，并在八种语言中的七种领先。相较 text-embedding-3-small，它在日语、韩语和繁体中文上的优势最大，每种语言领先 9 到 11 个百分点。

## 5. 登上 Hindsight 嵌入模型排行榜榜首 {#5-it-ranks-first-on-the-hindsight-embedding-leaderboard}

[Hindsight 嵌入模型排行榜](https://benchmarks.hindsight.vectorize.io/leaderboard/embeddings)会在 Hindsight 中端到端运行每个模型，将其用作嵌入模型，贯穿 Retain 和 Recall 流程，再按检索质量、速度和成本进行排名。Nemotron 位居第一，MRR（0.852）和 recall@5（94.8%）均为榜上最高。

<StaticImage src="/img/blog/nemotron-3-5-embed-leaderboard.webp" alt="Hindsight 嵌入模型排行榜" />

## 6. 速度胜过体量小得多的模型 {#6-it-is-faster-than-models-a-fraction-of-its-size}

一款 1B 嵌入模型必须在召回流程中证明自己的价值。在单张 NVIDIA L4 上，Nemotron 生成一个查询的嵌入向量需 30 ms。体量略高于它一半的 Qwen3-Embedding-0.6B 需要 48 ms；体量为它四倍的 Qwen3-Embedding-4B 需要 59 ms。在我们的记忆基准上，Nemotron 的得分也高于这两款模型。

<StaticImage src="/img/blog/nemotron-3-5-embed-latency.webp" alt="单张 NVIDIA L4 上的检索质量与查询延迟" />

BGE-small-en v1.5 和 all-MiniLM-L6-v2 等小型模型速度更快，只需 6 到 11 ms；对于小型、仅使用英语的记忆库，它们仍是合理的选择。面对长对话、多种语言或大型记忆库时，Nemotron 能找到更多内容。

## 在 Hindsight 中使用 Nemotron 3.5 Embed {#using-nemotron-35-embed-with-hindsight}

通过兼容 OpenAI 的嵌入端点提供模型服务，然后将 Hindsight 指向该端点：

```bash
HINDSIGHT_API_EMBEDDINGS_PROVIDER=openai
HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL=<your endpoint>/v1
HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL=nvidia/Nemotron-3.5-Embed-1B-BF16
HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY=<key, or any value for a local server>
HINDSIGHT_API_EMBEDDINGS_OPENAI_DIMENSIONS=1536
HINDSIGHT_API_EMBEDDINGS_QUERY_PREFIX="query: "
HINDSIGHT_API_EMBEDDINGS_PASSAGE_PREFIX="passage: "
```

有两项设置需要注意：

- **维度。** Hindsight 的 pgvector 索引最多接受 2,000 维，因此应设置为 1,536。Nemotron 支持 Matryoshka 截断；我们的测试显示，使用完整的 2,048 维时，各项基准得分与 1,536 维相差不到 1 个百分点。
- **前缀。** Nemotron 要求搜索内容带有 `query:` 前缀，存储文本带有 `passage:` 前缀。两项前缀设置会自动为你添加这些内容。

## 测量方法 {#how-we-measured}

- **所有模型使用相同的记忆。** LoCoMo（10 段对话，1,536 个问题）和 BEAM 100K（20 段对话，355 个问题）都只存入 Hindsight 一次。当某条记忆是从数据集标记为证据的某轮对话中提取时，我们就将它计作证据。
- **仅测量语义检索。** 这些数字单独衡量 Hindsight 的语义检索。完整的 Recall 还会使用关键词检索、图遍历、时间筛选和重排序模型。
- **对比模型。** 通过 API 使用 OpenAI text-embedding-3-small；开放模型包括 BGE-M3、Qwen3-Embedding-0.6B、e5-small-v2、Arctic Embed S、all-MiniLM-L6-v2 和 BGE-small-en v1.5；多语言任务还包括 multilingual-e5-small 和 multilingual MiniLM；延迟对比使用 Qwen3-Embedding-4B。每个模型均使用自身的提示词、原生维度和上下文长度限制运行。
- **硬件。** Nemotron 和较大型开放模型使用单张 NVIDIA L4。延迟为预热后的 300 次单查询中位数；所有模型都在同一张 L4 上通过 SentenceTransformers 运行。

感谢 NVIDIA Nemotron 团队提供提前体验机会。
