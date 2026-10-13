---
title: "Hindsight Cloud 新功能：能读截图的记忆"
authors: [benfrank241]
slug: "2026/09/21/hindsight-cloud-0-10-0"
date: 2026-09-21T15:00
tags: [hindsight-cloud, release, multimodal, retain, prompts, recall]
description: "Hindsight Cloud 已运行 0.10.0，图片和文件成为原生记忆，支持准确提示词预览，标签召回更不易遗漏。"
image: /img/blog/hindsight-cloud-0-10-0.webp
hide_table_of_contents: true
---

![Hindsight Cloud 新功能：图片与文件记忆、提示词预览和容错标签](/img/blog/hindsight-cloud-0-10-0.webp)

支持对话进入记忆库：两段文字、CLI 截图、另一句话。此前 Cloud 只读文字，忽略截图，而错误码只在图片中时就有问题。

Cloud 现运行 0.10.0，情况改变了。以下介绍新能力，以及我们直接在 Cloud 验证的结果。

<!-- truncate -->

## 要点 {#tldr}

- **图片和文件成为原生记忆。** 与文字交错存储，事实可返回其准确来源图片。
- **消耗 token 前预览提示词。** 准确查看存储、整合或反思消息，不调用模型、不写入。
- **召回容忍标签拼写错误**，实体标签无需固定词汇。
- **知识库可迁移。** 整库导出携带知识页面和心智模型。
- **两项行为变化**：突发同步存储可被 503 拒绝，心智模型列表默认返回元数据。

## 能读截图的记忆 {#memory-that-reads-screenshots}

retain 的 `content` 现在接受有序文本、图片和文件块。附件按实际位置读取，例如两段间的图表按其原位解读，而非当作附录。

我们用一个刻意刁钻的例子在 Cloud 测试：正文完全不提错误码，终端 PNG 却包含错误码。返回事实包含：

> CLI 命令 `hindsight retain --file report.pdf` 触发错误 `VISIONCHECK_7781`，request_id 为 `req_c4f09ab2e7d15`。

两个标识都不在发送的文字里，提取器从图片读出。

**来源按事实而非文档关联。** 该事实带有来源附件，其他来自文字的事实则不附图。只有不查看图片就无法陈述的事实才引用它。

召回携带引用而非字节，包括 ID、媒体类型、大小、原始文件名和 URL。以相同凭据获取 URL，可按原 Content-Type 得到图片。ID 来自内容哈希，可永久缓存，足以展示答案引用缩略图，或在下一轮交给视觉模型。

为何丢弃无法解析的引用而不匹配最近图片等设计，见[把截图存入智能体记忆，需要做什么](https://hindsight.vectorize.io/blog/2026/09/16/screenshot-agent-memory)。

## 发送前查看提示词 {#see-the-prompt-before-you-send-it}

只有看到最终提示词，使命、性格倾向和策略才有意义。现在一次调用准确返回存储、整合或反思消息，按对应设置拆块。

它不调用模型也不写入，没有模型费用，我们也在 Cloud 上验证了这一点。

两点常令人意外：存储和整合使命在**用户**消息，只看系统提示词会以为未配置；已关闭设置也会以非活动块返回，位于启用时本应出现的位置。

[完整详情](https://hindsight.vectorize.io/blog/2026/09/17/prompt-preview)也解释哪些设置会静默无效。

## 容忍拼写错误的召回 {#recall-that-forgives-typos}

过去标签是精确数组包含，`typsecript` 在排序前就排除了 `typescript`，更好排名无法修复匹配层的拼写错误。

标签分组现有可选 `resolve`。默认不变，设为 `fuzzy` 时按三元组相似度匹配，可将 `typescropt` 解析为 `typescript`，`user:alcie` 解析为 `user:alice`，有意不将 `mango` 解析为 `mongo`。

相似度受长度影响：短标签三元组少，一次拼写错误可能破坏大部分，`kakfa` 不匹配 `kafka`。模糊匹配对描述标签有效，对极短标签几乎无效，也因此避免无关短词混淆。

实体标签也无需预定义词汇，`multi-text` 按内容提取所需数量的值，每个成为实体，记忆库可从内容推导分类并在召回时筛选。

## 知识库可迁移 {#your-knowledge-base-travels}

过去只迁移文档和观察这些原始层内容，耗费真实预算构建的知识页面和心智模型留在原处，另一端需重建。

整库导出传入 `include_knowledge_base` 即可携带它们。默认关闭，主动启用，只支持整库而非文档列表，因为全库页面不能代表任意子集。清单报告包含内容，导入前可确认是否有知识库。

## 需要了解的两项行为变化 {#two-behaviour-changes-to-know-about}

0.10.0 大多数功能为新增，两项变化可能影响已有代码。

**突发同步存储可能被拒绝。** 三种操作都经过准入控制，满载时等待槽位至截止时间，再返回 `503` 和 `Retry-After`，不再无限排队。Python、TypeScript 自动遵循该头重试召回和反思，有意不重试存储，以免同步写入重复。突发同步存储应处理 503，或改用异步。

**心智模型列表默认返回元数据。** `GET .../mental-models` 原来返回全部完整内容，造成上下文膨胀；现在默认元数据，需文本时传 `detail=content` 或 `detail=full`。

## 对自托管意味着什么 {#what-this-means-if-you-self-host}

这些都不专属于 Cloud。v0.10.0 自九月中旬可用于自托管，Cloud 现已跟进。区别是 Cloud 无需你升级，并预先配置图片存储所需视觉模型。

自托管需特别注意：Docker 不再有 `curl`，exec 健康探针应改成 HTTP；记忆库 profile 和 background 端点返回 `410 Gone`。[0.10.0 发布说明](https://hindsight.vectorize.io/blog/2026/09/14/version-0-10-0)有完整列表。

## 了解更多 {#learn-more}

- [把截图存入智能体记忆，需要做什么](https://hindsight.vectorize.io/blog/2026/09/16/screenshot-agent-memory)：按事实关联来源。
- [消耗 token 前，先看准确提示词](https://hindsight.vectorize.io/blog/2026/09/17/prompt-preview)：预览端点。
- [这个夏天，Hindsight 学会了什么](https://hindsight.vectorize.io/blog/2026/09/18/what-hindsight-learned-this-summer)：近期版本全貌。
- [Hindsight Cloud 6—8 月更新](https://hindsight.vectorize.io/blog/2026/09/01/hindsight-cloud-june-august-updates)：此前知识库和企业控制汇总。
