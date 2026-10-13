---
title: "我们如何为记忆图构建时间感知的传播激活"
authors: [chrislatimer]
date: 2026-03-12T12:00
tags: [retrieval, graph, temporal, spreading-activation, memory, deep-dive]
image: /img/blog/spreading-activation-memory-graphs.webp
---

![Hindsight — 故事，而不是行](/img/blog/spreading-activation-memory-graphs.webp)

大多数检索系统将时间视为过滤器。我们将其视为要遍历的维度。

<!-- truncate -->

当智能体收到诸如“去年三月产品发布期间发生了什么？”之类的问题时，天真的“按三月过滤”查询是远远不够的。真正的答案存在于那个窗口周围的故事中：一月和二月的准备工作，四月的多米诺骨牌效应，几乎杀死演示的错误，以及随后的客户反应。我们希望检索能够重建该故事，而不仅仅是返回行。

时间传播激活是我们在[Hindsight](https://ui.hindsight.vectorize.io)中实现的：时间锚定图遍历，从时间窗口开始，然后遍历因果和时间链接以构建连贯的事件序列。这个想法借鉴了[认知科学的传播激活理论](https://en.wikipedia.org/wiki/Spreading_activation)——最初由柯林斯和洛夫特斯于 1975 年提出，旨在通过语义网络传播激活来模拟人类记忆检索的工作方式——但此处适用于具有明确时间和因果边缘的结构化记忆图。

## 问题：时间不仅仅是一个 WHERE 子句 {#the-problem-time-is-not-just-a-where-clause}

时间搜索的最简单版本将时间视为范围过滤器：

```sql
SELECT *
FROM memories
WHERE date BETWEEN '2024-03-01' AND '2024-03-31';
```

这对于“显示我们三月份记录的内容”来说很好。它因“发射期间发生了什么？”而分崩离析。因为它错过了：

- **上游原因**——二月份提交的 bug，迫使范围缩小。
- **准备工作** — 一月份启动排练、资产审查、推出计划。
- **下游后果** — 四月份的支持量峰值和客户反馈。
- **平行上下文** — 同一时间段内的竞争对手公告或事件。

我们真正想要的是：

1. 利用时间寻找好的**入口点**。
2. 从中，**走记忆图**沿着有意义的关系。
3. 保留一切**锚定于最初的时间意图**。

## 核心算法：时间扩散激活 {#the-core-algorithm-temporal-spreading-activation}

在较高层面上，该算法结合了：

- **时间入口点** — 位于（或重叠）目标时间窗口且语义相关的记忆。
- **扩散激活**——“注意力”在图中的受控传播。
- **多信号评分**——时间邻近性、语义相似性和链接强度都有贡献。

### 第1步：找到时间语义入口点 {#step-1-find-temporal-semantic-entry-points}

我们首先找到与查询窗口重叠且与问题语义相关的记忆：

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
    银行 ID = $2
      AND 事实类型 = $3
      AND 嵌入不为空
      AND (
          --范围与查询窗口重叠的事件
          （occurred_start 不为空并且发生_end 不为空
           并且发生_开始 <= $5 并且发生_结束 >= $4)
          OR
          --窗口内提到的事件
          （提及的at不为空且提及的at在$4和$5之间）
          OR
          -- partial overlap via start/end
          （occurred_start 不为空且occurred_start 介于 $4 和 $5 之间）
          OR
          （occurred_end 不为空且occurred_end 介于 $4 和 $5 之间）
      )
      AND (1 - (embedding <=> $1::vector)) >= $6  -- semantic threshold
    ORDER BY COALESCE(occurred_start,所述_at,occurred_end) DESC
    LIMIT 10
""")
```

这里有一些经过深思熟虑的选择：

- 我们将时间视为**区间重叠**，而不是单个时间戳。 `<=>` 运算符来自 [pgvector](https://github.com/pgvector/pgvector)，我们将其用于直接存储在 Postgres 中的嵌入的余弦距离。
- 我们以**语义相似度**为门限，因此我们不只是从该月提取随机事件。
- 当有疑问时，`occurred_start`/`occurred_end`战胜`mentioned_at`——*发生事情时*比*当说话时*更重要。

### 第 2 步：对时间邻近度进行评分 {#step-2-score-temporal-proximity}

接下来，我们估计每个入口点与窗口时间中心的对齐程度：

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

这给了我们一个**时间梯度**：

- 位于窗口中间的事件得分接近**1.0**。
- 边缘上的事件落向**0.0**。
- 跨越窗口的较长时间运行的事件获得合理的中心估计。

我们为每个入口点植入语义相似性和时间分数。

### 第3步：选择性地通过记忆图传播 {#step-3-spread-through-the-memory-graph-selectively}

从这些种子中，我们通过记忆图传播激活——但仅沿着对“X周围发生了什么？”具有时间意义的链接类型：
每个数据库往返

```python
node_scores = {str(ep["id"]): (ep["similarity"], 1.0) for ep in entry_points}
frontier    = list(node_scores.keys())
visited     = set(frontier)

budget_remaining = budget - len(entry_points)
batch_size       = 20  #个节点

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
        来自记忆_链接 ml
        JOIN memory_units mu ON ml.to_unit_id = mu.id
        WHERE ml.from_unit_id = ANY($2::uuid[])
          AND ml.link_type IN ('时间', '原因', 'caused_by',
                               'enables', 'prevents')
          AND ml.weight >= 0.1
          AND mu.fact_type = $3
          AND (1 - (mu.embedding <=> $1::vector)) >= $4
        按毫升重量描述排序
        LIMIT $5
    """, query_emb_str, batch_ids, fact_type,
        semantic_threshold, batch_size * 10)
```

我们特意遵循：

- **时间检索** — 同时发生或附近的事件。
- **原因/引起_由** — 上游/下游因果链。
- **启用/阻止** — 前提条件和阻碍因素。

其他一切都不会参与这次遍历。如果我们不限制链接类型，步行很快就会变成“一切事物的六度”。

### 第 4 步：通过衰减和因果提升传播分数 {#step-4-propagate-scores-with-decay-and-causal-boosts}

当我们行走时，我们为每个邻居组合三个信号：

1. 它自己的**时间邻近度** 到窗口。
2. **激活传播
来自父级的**。
3. 边缘的**强度和类型**。

```python
for n in neighbors:
    neighbor_id = str(n["id"])
    parent_id   = str(n["from_unit_id"])

    if neighbor_id in visited:
        continue

    #父时间分数（如果缺失则默认为中间）
    _, parent_temporal_score = node_scores.get(parent_id, (0.5, 0.5))

    #计算邻居自己的时间邻近度
    neighbor_best_date = pick_best_date(n)  #和之前一样的逻辑
    neighbor_temporal_proximity = compute_proximity(
        neighbor_best_date, mid_date, total_days
    )

    #因果提升
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

直观地说：

- **因果链保持“热”的时间更长** — 如果 A 导致 B 导致 C，即使 C 距离窗口稍远一点，它仍然可以具有较高的时间分数，因为它位于因果重要路径上。
- **纯共现衰减得更快** — 没有因果权重的时间链接会随着距离而消失。
- **仍然锚定在窗户上** — 如果节点在时间上非常接近，则其自身的邻近度得分占主导地位。

我们还一路跟踪语义相似性，并可以在排名时将两者结合起来（例如，通过加权和或在融合步骤中作为单独的维度）。

### 第 5 步：保持批次和预算的理智 {#step-5-keep-it-sane-with-batching-and-budgets}

像这样的遍历如果没有护栏很容易失控，所以我们放置了两个：**批量前沿处理**和**节点预算**。

**批量前沿处理。** 我们总是以块的形式工作，而不是每个节点执行一个数据库查询：

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

这将 O(nodes) 查询变成了大约 O(nodes / batch_size) 查询，并且与 Postgres 配合得更好。

**预算有限的探索。** 我们限制了允许接触的节点数量：

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

效果：

- 我们得到每次查询成本**可预测上限**。
- 我们探索**最佳路径优先**，因为邻居按链接权重排序并按语义相似性过滤。
- 我们避免用**低值节点**淹没图表。

## 具体示例：重建产品发布 {#a-concrete-example-reconstructing-a-product-launch}

假设时间窗口是 3 月 15 日至 20 日。

**入口点。** 我们可能会发现：

- “会议中心产品发布会”（3月18日，相似度高，时间值≈0.95）
- “CEO 主题演讲宣布新功能”（3 月 18 日，时间 ≈ 0.95）
- “新闻禁运解除”（3 月 17 日，时间 ≈ 0.85）

**第一次传播。** 从“产品发布活动”中，因果和时间链接可能会引入：

- “最后排练完成”（3月16日`caused_by`）
- “向合作伙伴分发营销材料”（3月14日，`enables`）
- “收到第一批客户订单”（3月19日，`causes`）
- “服务器扩展策略已触发”（3 月 18 日，`enables`）

这些节点获得很高的分数，因为它们在时间上都很接近并且位于重要的边缘上。

**第二次传播。** 从“最终排练完成”中我们可能会看到：

- “演示崩溃的错误修复”（3 月 10 日，`caused_by`）
- “排练日程确定”（3月1日`enables`）

尽管 3 月 1 日已经很远了，但因果关系的推动让它继续作为叙事的一部分发挥作用。当我们完成时，我们已经重建了一个故事：**准备 → 启动 → 立即后果**，其中连接了关键的上游和下游事件。

<!-- TODO：添加图遍历示意图，展示入口、第一次扩散和第二次扩散。标出时间窗口边界，用不同颜色区分因果边和时间边。 -->

## 处理记忆图中不完整的时间数据 {#handling-incomplete-temporal-data-in-memory-graphs}

真实数据并不干净；很多记忆只有部分时间戳。我们在不影响评分的情况下处理这个问题：

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

如果我们根本没有时间数据，我们可以：

- 分配一个**默认时间分数低**（因此它可以出现，但很少排名靠前），或者
- **排除它** 来自时间扩散，但使其可用于其他检索路径。

无论哪种方式，算法**优雅降解**都不会炸毁。

## 混合检索堆栈中的时间扩散激活 {#temporal-spreading-activation-in-a-hybrid-retrieval-stack}

时间扩散激活只是Hindsight的[混合检索系统](/developer/retrieval)的一方面。在实践中，我们将它与语义搜索、[BM25](https://en.wikipedia.org/wiki/Okapi_BM25)和仅图遍历一起运行：

```python
semantic_result, bm25_result, graph_result, temporal_result = await asyncio.gather(
    run_semantic(),
    run_bm25(),
    run_graph(),
    run_temporal_with_extraction(),
)
```

时间分支做了两件事：

1. **提取时间窗口** 来自自然语言（“去年三月”，“停电前两周”）。
2. **运行时间扩散激活** 在该窗口内。

因为它是并行运行的，所以慢速日期解析或更深的时间行走不会阻止其他检索策略。在融合时，我们可以将时间分数视为：

- 一个单独的“时间相关性”通道与其他信号组合，或
- A **优先级提升** 当用户的查询有明确的时间范围时。

## 性能和限制 {#performance-and-limitations}

在生产中，时间扩散激活通常会触及每个查询的 **30–80 个节点**，默认预算为 100。延迟在基本语义搜索的基础上大致增加 **15–40ms**，具体取决于图密度和因果链需要多少跳。

与朴素时间过滤相比：

- **记忆力显著提高** 用于“故事”查询——答案跨越数周或数月的多个事件。
- **保持高精度**，因为语义相似性门可以防止不相关的节点进入步行，即使因果链延伸到时间窗口之外。
- **成本是有限的** — 预算上限意味着无论图大小如何，最坏情况下的延迟都是可以预测的。

有限制。当出现以下情况时，该方法会遇到困难：

- **图非常稀疏** — 如果几乎不存在因果或时间链接，则遍历没有任何可遵循的内容，并且会回落到与时间过滤器相同的结果。
- **时间参考不明确** —“我们发布前后”需要上游准确的日期提取；如果窗口错误，则入口点错误。
- **因果联系很嘈杂** — 如果图有许多弱或不正确的因果边，则提升可能会引入不相关的节点。我们通过 `weight >= 0.1` 阈值和语义门控来缓解这一问题，但这并不完美。

## 为什么时间感知图遍历适用于AI智能体 {#why-time-aware-graph-traversal-works-for-ai-agents}

我们的目标不是为了算法本身而发明一种奇特的算法；而是为了它。这是为了让有时限的问题按照你直觉期望的方式表现：

- 你不仅仅得到了“三月的事情”——你得到了让那段时期变得有意义的**引导和后果**。
- **因果链保持相连** 即使他们走出了确切的窗口。
- **性能有限** 并且由于批处理和预算而可预测。

最重要的是，智能体不再把时间当作一个愚蠢的过滤器。它将其视为记忆图的结构轴——它决定了它如何在图上行走以及如何重建所发生的故事。

---

*Hindsight是一个AI智能体记忆系统，通过混合搜索为智能体提供持久、成型的记忆。[了解架构](/developer/retrieval)，或[注册 Hindsight Cloud](https://ui.hindsight.vectorize.io)。*
