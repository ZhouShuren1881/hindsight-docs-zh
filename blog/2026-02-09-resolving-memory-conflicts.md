---
title: "我们如何解决 Hindsight 中的记忆冲突"
description: "了解 Hindsight 如何通过追踪随时间发生的变化，并在记忆整合系统中保留历史，来处理相互矛盾的信息。"
authors: [chrislatimer]

image: /img/blog/2026-02-09/consolidation-pipeline.webp
date: 2026-02-09T12:00
hide_table_of_contents: true
tags: [deep-dive]
---

# 我们如何解决 Hindsight 中的记忆冲突 {#how-we-solved-memory-conflicts-in-hindsight}

我们在 Hindsight 中解决的难题之一，就是如何处理矛盾。为 AI 智能体构建记忆系统时，现实并非一成不变，而是不断变化的。

CRM 智能体可能在 1 月得知“Acme Corp 是重要的潜在客户”，到了 3 月又得知“Acme Corp 现在已经是付费客户”。简单的做法要么丢失历史，要么被重复事实淹没。

我们需要构建一个能妥善处理这类情况的系统。下面介绍我们的实现方式。

<!-- truncate -->

## **核心问题：事实与知识** {#the-core-problem-facts-vs-knowledge}

早期，我们区分了原始事实和整合后的知识，这一区分也影响了我们存储和接收记忆的方式。事实是即时记录，是智能体在单次交互中学到的内容；知识则是随着时间推移从这些事实中提取出的持久认知。

新记忆存入后，我们的整合流程会作为后台任务运行，将短暂的事实转化为持久知识。关键在于，我们不只存储最新信息，还会追踪知识如何演变。

![整合流程图](/img/blog/2026-02-09/consolidation-pipeline.webp)

## **查找相关信息** {#finding-related-information}

收到新事实时，我们首先要找出可能与之冲突的现有观测。这一步由 `_find_related_observations` 函数完成，它会使用完整的召回系统，具体包括：

* **语义相似度**：通过嵌入向量找出概念上相关的观测
* **token 预算**：通过 `consolidation_max_tokens` 自然限制比较范围
* **安全感知过滤**：使用严格的标签匹配，防止不同用户之间的信息泄露

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

## **由 LLM 分析冲突** {#llm-powered-conflict-analysis}

真正的处理发生在 `_consolidate_with_llm` 中：一次 LLM 调用会根据现有观测分析新事实。我们会提供丰富的上下文，包括现有观测的文本、各自的支持事实数，以及来源记忆。我们把这些记忆整理成带日期的时间序列，并按时间排序。

这样，模型就能根据充分的信息判断新内容属于冗余信息、矛盾信息，还是反映了真实的状态变化。

## **三种合并策略** {#three-merge-strategies}

我们的整合提示词定义了三项核心合并规则：

**冗余信息：** 如果同一信息只是措辞不同，我们就更新现有观测。例如，“Acme Corp 是潜在客户”加上“Acme Corp 是潜在客户”，最终会合并为一条更清晰的观测。

**直接矛盾：** 如果同一主题存在相反的信息，我们会用时间标记保留两种状态。关键规则是：更新后的文本必须同时呈现两种状态。我们不会覆盖旧信息，而是尝试构建一段时间脉络，说明事实如何随时间变化。如果没有明确的解释，我们会将最新的数据点视为当前最新状态。

**状态更新：** 如果新信息取代了旧状态，我们会用“过去曾经”“现在”或“从 X 变为 Y”等说法明确记录这一转变。我们不会只陈述新事实，还会记录变化过程。

## **保留业务关系的历史** {#preserving-business-relationship-history}

来看一个不断发展的业务关系示例。智能体在六个月内得知了以下事实：

1. 1 月：“Acme Corp 表示对我们的企业版感兴趣”
2. 2 月：“与 Acme Corp 的 CTO 会面，讨论集成需求”
3. 4 月：“Acme Corp 签署了一份年度合同，金额为 5 万美元”
4. 9 月：“Acme Corp 拓展到 3 个地区后，升级到了 15 万美元档位”

![整合流程图](/img/blog/2026-02-09/preserved-history.webp)

简单的系统可能只保留最新事实：“Acme Corp 签有一份 15 万美元的合同。”这条信息有用，但客户关系的发展历程就丢失了。

我们的系统会将这些信息整合成类似这样的内容：“Acme Corp 从潜在客户（1 月）发展为 5 万美元的客户（4 月），随后在拓展地区后于 9 月升级到 15 万美元档位。”

这样就保留了完整的发展历程。智能体可以回答“我们是如何拿下 Acme Corp 这家客户的？”，同时保留让这个问题有意义的关系历史。

## **时间元数据** {#temporal-metadata}

我们会为每条观测维护时间元数据：

```sql
occurred_start = LEAST(occurred_start, COALESCE($7, occurred_start))
occurred_end = GREATEST(occurred_end, COALESCE($8, occurred_end))
mentioned_at = GREATEST(mentioned_at, COALESCE($9, mentioned_at))
```

这样可以确保 `occurred_start` 保留某件事最早为真的时间，`occurred_end` 记录最近一次观测的时间，而 `mentioned_at` 记录最近一次提及的时间。

## **将历史作为审计轨迹** {#history-as-an-audit-trail}

每条观测都会维护完整的变更历史：

```python
history.append({
    "previous_text": model["text"],
    "changed_at": datetime.now(timezone.utc).isoformat(),
    "reason": reason,
    "source_memory_id": str(memory_id),
})
```

这条审计轨迹让系统能够解释知识如何演变、追溯导致更新的来源事实，并说明信息发生变化的原因。当智能体说“Acme Corp 是一家 15 万美元档位的客户”时，它也能解释自己如何得出这一结论，以及期间发生了哪些变化。

![整合流程图](/img/blog/2026-02-09/merge-strategies.webp)

## **边界安全** {#security-at-the-boundary}

我们特别满意的一项设计是：在整合过程中设置基于标签的安全边界。

新观测会继承其来源事实的标签。更新现有观测时，标签会合并（取并集），让所有贡献者都能看到自己参与形成的知识。整合仅在相同的安全范围内进行。严格匹配既能防止信息泄露，也允许协作构建知识。

```python
existing_tags = set(model.get("tags", []) or [])
source_tags = set(source_fact_tags or [])
merged_tags = list(existing_tags | source_tags)
```

## **持久知识，而非短暂状态** {#durable-knowledge-not-ephemeral-state}

一项显著减少错误冲突的原则，是区分持久知识和短暂状态。

有效的整合会提取持久事实。“用户到 Acme Corp 的 105 室拜访”会转化为“Acme Corp 位于 105 室”。而“用户目前在 105 室”不会被追踪，因为位置这类短暂信息会不断变化。

关注持久性后，系统就不会总把临时状态变化标记为冲突。

## **为何重要** {#why-this-matters}

处理智能体记忆中的矛盾信息，不必在相互冲突的说法中选一个胜出者。通过追踪时间变化、保留历史并进行智能整合，我们构建了一个能够细致理解知识如何变化的系统。

这对需要追踪不断变化的偏好、理解时间关系、维护审计轨迹，并通过可解释的更新建立信任的智能体很有帮助。

借助这种方法，Hindsight 提供的不只是记忆存储，还能提供随着每次交互不断改进的上下文。
