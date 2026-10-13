---
title: "我们如何解决Hindsight中的记忆冲突"
description: "了解Hindsight如何通过跟踪时间演变并在其记忆整合系统中保存历史来处理矛盾信息。"
authors: [chrislatimer]

image: /img/blog/2026-02-09/consolidation-pipeline.webp
date: 2026-02-09T12:00
hide_table_of_contents: true
tags: [deep-dive]
---

# 我们如何解决Hindsight中的记忆冲突 {#how-we-solved-memory-conflicts-in-hindsight}

​​我们在Hindsight解决的最难的问题之一是处理矛盾。当您为 AI 智能体构建记忆系统时，现实并不是静态的。它不断发展。

CRM 智能体可能会在 1 月份得知“Acme Corp 是关键潜在客户”，然后在 3 月份遇到“Acme Corp 现在是付费客户”。幼稚的方法要么失去历史，要么淹没在重复的事实中。

我们需要一个能够优雅地处理这个问题的系统。这是我们的构建方式。

<!-- truncate -->

## **核心问题：事实与知识** {#the-core-problem-facts-vs-knowledge}

早期，我们做了一个区分，塑造了我们存储和接收记忆的方式：原始事实与巩固的知识不同。事实是直接观察的；智能体在单次交互中学到什么。知识是随着时间的推移从这些事实中提取的持久理解。

我们的整合管道在保留新记忆后作为后台作业运行，将短暂的事实转化为持久的知识。关键的见解是，我们不仅存储最新信息，还跟踪知识的演变。

![整合管道](/img/blog/2026-02-09/consolidation-pipeline.webp)

## **查找相关信息** {#finding-related-information}

当一个新事实出现时，我们首先需要找到可能与之冲突的现有观察。这发生在我们的 `_find_related_observations` 函数中，该函数使用完整的记忆召回系统：

* **语义相似度** 通过嵌入到表面概念相关的观察
* **token预算**自然地通过`consolidation_max_tokens`限制了比较范围
* **安全感知过滤** 使用严格的标签匹配，防止跨用户信息泄露

```python
recall_result = await memory_engine.recall_async(
    bank_id=bank_id,
    query=query,
    max_tokens=config.consolidation_max_tokens,
    fact_type=["observation"],
    tags=tags,
    tags_match="all_strict",
)
```

## **LLM-动力冲突分析** {#llm-powered-conflict-analysis}

真正的工作发生在`_consolidate_with_llm`，其中单个LLM调用根据现有观察分析新事实。我们提供丰富的背景：现有观察的文本、它们的证据计数（有多少支持事实）和源记忆。我们将这些记忆组织成带有日期的时间序列，并按时间顺序排列。

这让模型能够就新信息是冗余、矛盾还是代表真正的状态变化做出明智的决定。

## **三种合并策略** {#three-merge-strategies}

我们的整合提示定义了三个核心合并规则：

**冗余信息：** 当相同信息的措辞不同时，我们更新现有的观察。 “Acme Corp 是一个潜在客户”加上“Acme Corp 是一个潜在客户”就变成了一个单一的、更清晰的观察。

**直接矛盾：** 当同一主题存在相反信息时，我们用时间标记保留这两种状态。关键规则：更新的文本必须捕获这两种状态。我们不会覆盖旧信息。相反，我们尝试创建一个时间叙事来解释事实如何随时间变化。当没有明确的解释时，我们认为最新的数据点是最新的。

**状态更新：** 当新信息取代旧状态时，我们用“过去”、“现在”或“从 X 更改为 Y”等短语明确捕获转换。我们不仅仅陈述新事实，我们捕捉演变。

## **保留业务关系历史** {#preserving-business-relationship-history}

考虑这如何处理不断变化的业务关系。智能体在六个月内学习这些事实：

1. 一月：“Acme Corp 表达了对我们企业级的兴趣”
2. 二月：“与 Acme Corp 的 CTO 会面，讨论集成需求”
3. 四月：“Acme Corp 签署了一份 5 万美元的年度合同”
4. 9 月：“Acme Corp 在扩展到 3 个区域后升级至 15 万美元级别”

![整合管道](/img/blog/2026-02-09/preserved-history.webp)

幼稚的系统可能只保留最新的事实：“Acme Corp 签订了 15 万美元的合同。”有用，但你已经失去了关系弧。

我们的系统将其整合为：“Acme Corp 从潜在客户（1 月）发展为 5 万美元客户（4 月），然后在区域扩张后于 9 月升级至 15 万美元级别。”

完整旅程被保留。智能体可以回答“我们是如何创办 Acme Corp 的？”而不丢失使该问题变得有意义的关系历史。

## **时态元数据** {#temporal-metadata}

我们维护每个观察的时间元数据：

```sql
occurred_start = LEAST(occurred_start, COALESCE($7, occurred_start))
occurred_end = GREATEST(occurred_end, COALESCE($8, occurred_end))
mentioned_at = GREATEST(mentioned_at, COALESCE($9, mentioned_at))
```

这确保`occurred_start`保留某件事为真的最早时间，`occurred_end`跟踪最近的观察，`mentioned_at`记录最后一次引用的时间。

## **作为审计追踪的历史** {#history-as-an-audit-trail}

每个观察都维护着完整的变更历史：

```python
history.append({
    "previous_text": model["text"],
    "changed_at": datetime.now(timezone.utc).isoformat(),
    "reason": reason,
    "source_memory_id": str(memory_id),
})
```

此审计跟踪让系统可以解释知识如何演变，追溯到导致更新的源事实，并提供信息更改原因的推理。当智能体说“Acme Corp 是价值 15 万美元的客户”时，它还可以解释它如何知道这一点以及在此过程中发生了什么变化。

![整合管道](/img/blog/2026-02-09/merge-strategies.webp)

## **边界安全** {#security-at-the-boundary}

我们特别满意的一个设计决策：集成过程中基于标签的安全边界。

新观察继承其源事实的标签。更新现有观察时，标签会合并（联合），以便所有贡献者都可以看到他们帮助创建的知识。 集成仅发生在相同的安全范围内。严格匹配可以防止信息泄漏，同时仍然允许协作知识构建。

```python
existing_tags = set(model.get("tags", []) or [])
source_tags = set(source_fact_tags or [])
merged_tags = list(existing_tags | source_tags)
```

## **持久的知识，而非短暂的状态** {#durable-knowledge-not-ephemeral-state}

显著减少错误冲突的原则：我们区分持久知识和短暂状态。

良好的整合可以提取持久的事实。 “用户访问了 Acme Corp 的 105 室”变为“Acme Corp 位于 105 室”。但“用户当前位于 105 号房间”不会被跟踪，因为临时位置数据不断变化。

这种对持久性的关注意味着系统不会不断地将临时状态变化标记为冲突。

## **为什么这很重要** {#why-this-matters}

处理智能体记忆中的矛盾信息不需要挑选赢家和输家。通过跟踪时间演变、保存历史和智能整合，我们构建了一个系统，可以对知识如何变化保持细致入微的理解。

对于需要跟踪不断变化的偏好、理解时间关系、维护审计跟踪并通过可解释的更新建立信任的智能体。

这种方法允许Hindsight提供的不仅仅是记忆存储。它可以提供随着每次交互而改进的上下文。
