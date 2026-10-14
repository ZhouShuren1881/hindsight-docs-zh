---
title: "我们如何为记忆图实现时间感知的扩散激活"
authors: [chrislatimer]
date: 2026-03-12T12:00
tags: [retrieval, graph, temporal, spreading-activation, memory, deep-dive]
image: /img/blog/spreading-activation-memory-graphs.webp
---

![Hindsight——故事，而非一行行记录](/img/blog/spreading-activation-memory-graphs.webp)

大多数检索系统把时间当作过滤器。我们把它视为一个可以遍历的维度。

<!-- truncate -->

当智能体收到“去年三月产品发布期间发生了什么？”这样的问题时，简单地“按三月过滤”远远不够。真正的答案藏在那个时间窗口周围的故事里：一月和二月的准备工作、四月产生的连锁效应、险些让演示失败的错误，以及之后客户的反应。我们希望检索能够重建这个故事，而不只是返回一行行记录。

我们在 [Hindsight](https://ui.hindsight.vectorize.io) 中使用时间扩散激活来实现这一点：从时间窗口出发，沿因果和时间链接遍历图，以构建连贯的事件序列。这一思路源自[认知科学中的扩散激活理论](https://en.wikipedia.org/wiki/Spreading_activation)——Collins 和 Loftus 最初于 1975 年提出该理论，用来模拟人类记忆检索如何通过语义网络传播激活；我们则将其用于具有明确时间边和因果边的结构化记忆图。

## 问题：时间不只是 WHERE 子句 {#the-problem-time-is-not-just-a-where-clause}

时间检索最简单的实现，是把时间当作范围过滤条件：

```sql
SELECT *
FROM memories
WHERE date BETWEEN '2024-03-01' AND '2024-03-31';
```

这适用于“显示我们三月份记录的内容”。但要回答“发布前后发生了什么？”，这种做法就不够了，因为它会遗漏：

- **上游原因**——二月提交的错误报告，迫使团队缩小了发布范围。
- **准备工作**——一月进行的发布彩排、素材审查和推出计划。
- **下游后果**——四月的支持请求量激增和客户反馈。
- **并行背景**——同一时间段内竞争对手发布的公告或发生的事件。

我们真正需要的是：

1. 利用时间找到合适的**入口点**。
2. 从这些入口点出发，沿有意义的关系**遍历记忆图**。
3. 让所有结果都**锚定于最初的时间意图**。

## 核心算法：时间扩散激活 {#the-core-algorithm-temporal-spreading-activation}

从整体上看，这个算法结合了：

- **时间入口点**——位于目标时间窗口内（或与其重叠）、且在语义上相关的记忆。
- **扩散激活**——在图中受控地传播“注意力”。
- **多信号评分**——时间接近度、语义相似度和链接强度共同参与评分。

### 第 1 步：查找时间和语义相关的入口点 {#step-1-find-temporal-semantic-entry-points}

我们先查找与查询时间窗口重叠、且在语义上与问题相关的记忆：

```python
entry_points = await conn.fetch("""
    SELECT
        id,
        text,
        occurred_start,
        occurred_end,
        mentioned_at,
        1 - (embedding <=> $1::vector) AS similarity
    FROM memory_units
    WHERE bank_id   = $2
      AND fact_type = $3
      AND embedding IS NOT NULL
      AND (
          -- events whose range overlaps the query window
          (occurred_start IS NOT NULL AND occurred_end IS NOT NULL
           AND occurred_start <= $5 AND occurred_end >= $4)
          OR
          -- events mentioned inside the window
          (mentioned_at IS NOT NULL AND mentioned_at BETWEEN $4 AND $5)
          OR
          -- partial overlap via start/end
          (occurred_start IS NOT NULL AND occurred_start BETWEEN $4 AND $5)
          OR
          (occurred_end   IS NOT NULL AND occurred_end   BETWEEN $4 AND $5)
      )
      AND (1 - (embedding <=> $1::vector)) >= $6  -- semantic threshold
    ORDER BY COALESCE(occurred_start, mentioned_at, occurred_end) DESC
    LIMIT 10
""")
```

这里有几项经过慎重考虑的设计：

- 我们把时间视为**区间重叠**，而不是单个时间戳。`<=>` 运算符来自 [pgvector](https://github.com/pgvector/pgvector)，我们用它计算直接存储在 Postgres 中的嵌入向量之间的余弦距离。
- 我们用**语义相似度**设定门槛，避免随机取出当月发生的事件。
- 不确定时，优先采用 `occurred_start`/`occurred_end`，而不是 `mentioned_at`——*事情发生的时间*比*谈到这件事的时间*更重要。

### 第 2 步：计算时间接近度 {#step-2-score-temporal-proximity}

接下来，我们估算每个入口点与时间窗口中心的吻合程度：

```python
total_days = (end_date - start_date).total_seconds() / 86400
mid_date   = start_date + (end_date - start_date) / 2

for ep in entry_points:
    if ep["occurred_start"] and ep["occurred_end"]:
        best_date = ep["occurred_start"] + (ep["occurred_end"] - ep["occurred_start"]) / 2
    elif ep["occurred_start"]:
        best_date = ep["occurred_start"]
    elif ep["occurred_end"]:
        best_date = ep["occurred_end"]
    else:
        best_date = ep["mentioned_at"]

    days_from_mid = abs((best_date - mid_date).total_seconds() / 86400)
    temporal_proximity = 1.0 - min(days_from_mid / (total_days / 2), 1.0)
```

这会得到一个**时间梯度**：

- 时间窗口正中间的事件得分接近 **1.0**。
- 位于窗口边缘的事件得分趋近 **0.0**。
- 跨越整个窗口、持续时间较长的事件会得到合理的中心估计。

我们用语义相似度和时间得分为每个入口点赋初值。

### 第 3 步：有选择地沿记忆图扩散 {#step-3-spread-through-the-memory-graph-selectively}

从这些种子节点出发，我们在记忆图中传播激活，但只沿着适合回答“X 前后发生了什么？”这类时间问题的链接类型遍历：

```python
node_scores = {str(ep["id"]): (ep["similarity"], 1.0) for ep in entry_points}
frontier    = list(node_scores.keys())
visited     = set(frontier)

budget_remaining = budget - len(entry_points)
batch_size       = 20  # 每次数据库往返处理的节点数

while frontier and budget_remaining > 0:
    batch_ids = frontier[:batch_size]
    frontier  = frontier[batch_size:]

    neighbors = await conn.fetch("""
        SELECT
            mu.*,
            ml.weight,
            ml.link_type,
            ml.from_unit_id,
            1 - (mu.embedding <=> $1::vector) AS similarity
        FROM memory_links ml
        JOIN memory_units mu ON ml.to_unit_id = mu.id
        WHERE ml.from_unit_id = ANY($2::uuid[])
          AND ml.link_type IN ('temporal', 'causes', 'caused_by',
                               'enables', 'prevents')
          AND ml.weight >= 0.1
          AND mu.fact_type = $3
          AND (1 - (mu.embedding <=> $1::vector)) >= $4
        ORDER BY ml.weight DESC
        LIMIT $5
    """, query_emb_str, batch_ids, fact_type,
        semantic_threshold, batch_size * 10)
```

我们有意只遍历以下链接：

- **temporal**——同时发生或时间相近的事件。
- **causes / caused_by**——上游或下游的因果链。
- **enables / prevents**——前置条件和阻碍因素。

其他关系都不会进入这次遍历。如果不限制链接类型，遍历很快就会变成“万物皆有六度关系”。

### 第 4 步：通过衰减和因果加权传播得分 {#step-4-propagate-scores-with-decay-and-causal-boosts}

遍历时，我们为每个邻居综合三个信号：

1. 它自身与时间窗口的**时间接近度**。
2. 从父节点**传播而来的激活值**。
3. 边的**强度和类型**。

```python
for n in neighbors:
    neighbor_id = str(n["id"])
    parent_id   = str(n["from_unit_id"])

    if neighbor_id in visited:
        continue

    # 父节点的时间得分（缺失时默认取中间值）
    _, parent_temporal_score = node_scores.get(parent_id, (0.5, 0.5))

    # 计算邻居自身的时间接近度
    neighbor_best_date = pick_best_date(n)  # 与前面相同的逻辑
    neighbor_temporal_proximity = compute_proximity(
        neighbor_best_date, mid_date, total_days
    )

    # 因果加权
    link_type = n["link_type"]
    if link_type in ("causes", "caused_by"):
        causal_boost = 2.0
    elif link_type in ("enables", "prevents"):
        causal_boost = 1.5
    else:
        causal_boost = 1.0

    propagated_temporal = parent_temporal_score * n["weight"] * causal_boost * 0.7

    combined_temporal = max(neighbor_temporal_proximity, propagated_temporal)
```

直观来说：

- **因果链能更长时间保持“热度”**——如果 A 导致 B、B 又导致 C，即使 C 离时间窗口稍远，仍可能有较高的时间得分，因为它处于一条因果上重要的路径中。
- **纯共现关系衰减得更快**——没有因果加权的时间链接会随距离增加而减弱。
- **结果仍锚定于时间窗口**——如果某个节点在时间上非常接近窗口，它自身的接近度得分就会占主导。

我们也会一路跟踪语义相似度，并在排序时将它与时间得分结合（例如使用加权和，或在融合步骤中将它们作为不同维度）。

### 第 5 步：通过批处理和预算控制规模 {#step-5-keep-it-sane-with-batching-and-budgets}

如果没有保护措施，这样的遍历很容易失控，因此我们设置了两项限制：**分批处理前沿节点**和**节点预算**。

**分批处理前沿节点。** 我们始终按批次处理，而不是每个节点都单独查询数据库：

```python
batch_size = 20

while frontier and budget_remaining > 0:
    batch_ids = frontier[:batch_size]
    frontier  = frontier[batch_size:]

    neighbors = await conn.fetch(
        "... WHERE ml.from_unit_id = ANY($2::uuid[]) ...",
        query_emb_str, batch_ids, ...
    )
```

这会把 O(nodes) 次查询减少到大约 O(nodes / batch_size) 次，也更适合 Postgres。

**受预算限制的探索。** 我们限制遍历能够触及的节点数量：

```python
for n in neighbors:
    neighbor_id = str(n["id"])
    if neighbor_id in visited:
        continue

    visited.add(neighbor_id)
    budget_remaining -= 1

    if combined_temporal > 0.2:
        node_scores[neighbor_id] = (n["similarity"], combined_temporal)
        if budget_remaining > 0:
            frontier.append(neighbor_id)

    if budget_remaining <= 0:
        break
```

这样做的效果是：

- 每次查询的开销都有**可预测的上限**。
- 邻居按链接权重排序，并按语义相似度过滤，因此我们会优先探索**最优路径**。
- 我们可以避免让**低价值节点**淹没整张图。

## 具体示例：重建一次产品发布 {#a-concrete-example-reconstructing-a-product-launch}

假设时间窗口为 3 月 15 日至 20 日。

**入口点。** 我们可能会找到：

- “会议中心的产品发布活动”（3 月 18 日，语义相似度高，时间得分约为 0.95）
- “CEO 主题演讲宣布新功能”（3 月 18 日，时间得分约为 0.95）
- “新闻禁令解除”（3 月 17 日，时间得分约为 0.85）

**第一次扩散。** 从“产品发布活动”出发，因果链接和时间链接可能会引入：

- “最终彩排完成”（3 月 16 日，`caused_by`）
- “向合作伙伴分发营销材料”（3 月 14 日，`enables`）
- “收到首批客户订单”（3 月 19 日，`causes`）
- “触发服务器扩容策略”（3 月 18 日，`enables`）

这些节点得分较高，因为它们既接近时间窗口，也位于重要的链接上。

**第二次扩散。** 从“最终彩排完成”出发，我们可能会发现：

- “修复导致演示崩溃的错误”（3 月 10 日，`caused_by`）
- “确定彩排日程”（3 月 1 日，`enables`）

尽管 3 月 1 日离窗口较远，因果加权仍会让它作为叙事的一部分保留下来。遍历结束时，我们就重建出了一个故事：**准备 → 发布 → 紧随其后的影响**，关键的上游和下游事件也彼此连接起来。

<!-- TODO: 添加一张图，展示包含入口点、第一次扩散和第二次扩散的图遍历过程。标出时间窗口边界，并用不同颜色区分因果边和时间边。 -->

## 处理记忆图中不完整的时间数据 {#handling-incomplete-temporal-data-in-memory-graphs}

真实数据并不整齐；许多记忆只有部分时间戳。我们会处理这种情况，不让它扰乱评分：

```python
def pick_best_date(row):
    if row["occurred_start"] and row["occurred_end"]:
        return row["occurred_start"] + (row["occurred_end"] - row["occurred_start"]) / 2
    if row["occurred_start"]:
        return row["occurred_start"]
    if row["occurred_end"]:
        return row["occurred_end"]
    if row["mentioned_at"]:
        return row["mentioned_at"]
    return None
```

如果完全没有时间数据，我们可以采用以下任一方式：

- 赋予**较低的默认时间得分**（因此它仍可能出现，但很少排在前面）；或者
- 将它**排除在时间扩散之外**，同时保留它参与其他检索路径的机会。

无论采用哪种方式，算法都能**平稳退化**，而不会崩溃。

## 混合检索流程中的时间扩散激活 {#temporal-spreading-activation-in-a-hybrid-retrieval-stack}

时间扩散激活只是 Hindsight [混合检索系统](https://docs.hindsight.vectorize.io/recall)中的一个组成部分。实际使用时，我们会将它与语义检索、[BM25](https://en.wikipedia.org/wiki/Okapi_BM25) 和纯图遍历并行运行：

```python
semantic_result, bm25_result, graph_result, temporal_result = await asyncio.gather(
    run_semantic(),
    run_bm25(),
    run_graph(),
    run_temporal_with_extraction(),
)
```

时间分支会做两件事：

1. 从自然语言中**提取时间窗口**（例如 “last March” 或 “two weeks before the outage”）。
2. 在该窗口内**运行时间扩散激活**。

由于它与其他策略并行运行，缓慢的日期解析或更深入的时间遍历不会阻塞其他检索策略。在融合阶段，我们可以将时间得分视为：

- 与其他信号结合的独立“时间相关性”通道；或者
- 当用户的查询明确包含时间范围时，给予结果**优先级加权**。

## 性能和限制 {#performance-and-limitations}

在生产环境中，时间扩散激活通常会在每次查询中触及 **30–80 个节点**，默认预算为 100。根据图的密度以及因果链需要遍历的跳数，基础语义检索之外大约会增加 **15–40 ms** 的延迟。

与简单的时间过滤相比：

- 对“故事型”查询——答案横跨数周或数月内的多个事件——**召回率显著提高**。
- **精确率仍然很高**，因为语义相似度门槛会阻止不相关节点进入遍历，即使因果链延伸到了时间窗口之外。
- **开销有上限**——预算上限使最坏情况下的延迟可预测，无论图有多大。

这种方法也有局限。以下情况会让它难以发挥作用：

- **图非常稀疏**——如果因果链接或时间链接很少，遍历就没有可循的关系，最终会退化为与时间过滤相同的结果。
- **时间指代含糊**——“我们发布前后”需要上游准确提取日期；如果时间窗口有误，入口点也会错。
- **因果链接噪声较多**——如果图中有许多较弱或错误的因果边，加权就可能引入不相关节点。我们用 `weight >= 0.1` 阈值和语义门槛来缓解这个问题，但仍无法完全避免。

## 为什么时间感知的图遍历适用于 AI 智能体 {#why-time-aware-graph-traversal-works-for-ai-agents}

我们的目标不是为了算法而发明一种花哨算法，而是让带有时间范围的问题能够按直觉预期的方式得到回答：

- 你得到的不只是“三月份发生的事情”，还包括让那段时期变得有意义的**前因和后果**。
- 即使超出准确的时间窗口，**因果链仍能保持连贯**。
- 由于采用批处理和预算限制，**性能始终有界且可预测**。

最重要的是，智能体不再把时间当作一个简单粗暴的过滤器，而是将它视为记忆图的一个结构维度——时间会影响智能体如何遍历这张图，以及如何重建事情发生的经过。

---

*Hindsight 是一个 AI 智能体记忆系统，通过混合检索为智能体提供持久、结构化的记忆。[了解架构](https://docs.hindsight.vectorize.io/recall)，或[注册使用 Hindsight Cloud](https://ui.hindsight.vectorize.io)。*
