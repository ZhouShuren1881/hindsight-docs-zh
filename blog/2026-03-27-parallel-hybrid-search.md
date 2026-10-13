---
title: "我们如何构建实际并行运行的 4 路混合搜索系统"
description: "顺序异步查询正在消除我们的检索延迟。以下是我们如何使用 asyncio 和 RRF 融合构建真正的 4 路并行混合搜索系统，然后通过连接共享、跨编码器重排序和乘法提升评分进一步发展它。"
authors: [chrislatimer, nicoloboschi, benfrank241]
date: 2026-03-27T12:00
tags: [engineering, retrieval, search, python, asyncio, performance, deep-dive]
image: /img/blog/parallel-hybrid-search.webp
hide_table_of_contents: true
---

![我们如何构建实际并行运行的 4 路混合搜索系统](/img/blog/parallel-hybrid-search.webp)

当我们设计Hindsight的记忆检索时，我们必须面对AI数据检索最困难的挑战之一。

“并行”异步代码实际上并不是并行的。您编写了四个漂亮的异步函数，加入了一些等待，最后一个接一个地执行所有内容。对于具有多种检索策略的混合搜索堆栈来说，这是不可接受的。

以下是我们如何构建一个真正并行运行的 4 路混合搜索系统，我们如何改进它以共享连接并减少往返，以及重排序如何将它们联系在一起。剧透：事实证明，最大的瓶颈不是查询速度，而是连接池争用，这重塑了整个架构。

<!-- truncate -->

## 为什么要多重检索？ {#why-multi-retrieval}

大多数检索系统都从一种方法开始——通常是向量搜索——然后就到此为止了。它在演示中效果很好。然后真正的查询就会出现，裂缝很快就会出现。

核心问题是语义相似性与相关性不同。矢量搜索查找嵌入空间中概念上接近的事物。但是“关闭”会做很多繁重的工作，并且它会根据用户实际的要求以可预测的方式分解。

**语义搜索无法做到精确匹配。** 请求特定产品 SKU、错误代码、人员姓名或 API 端点，向量嵌入将很乐意返回主题相关的内容，而不是您要求的内容。当精度很重要时，使矢量搜索强大的语义“模糊性”就变成了一种负担。对 `HTTP 502 error` 的查询通常不需要有关 Web 服务器的文档 - 它需要显示“502”的文档。

​​**关键词搜索不能做概念。** 翻转到BM25，你会得到相反的问题。它确定了精确的术语，但当用户的措辞与文档不同时就会失败。 “如何修复”与“故障排除”。 “汽车”与“汽车”。如果查询不与文档共享标记，BM25将永远找不到它，无论它有多相关。

**两者都无法遵循关系。** 问“我们改变定价模型后发生了什么？” - 关于因果关系和顺序的问题 - 语义和关键字搜索都将返回提及定价变化的文档。他们不会做的是将定价变化与下游影响联系起来：支持票、客户流失高峰、三周后的董事会讨论。这些连接存在于记忆之间的关系中，而不是存在于任何单个文档的嵌入或标记集中。

**都不懂时间。**“上周二我在做什么？”对于人类来说这是一个简单的问题。对于检索系统，它需要解析自然语言日期，将其解析为一个范围，然后找到受该范围限制的记忆。标准矢量搜索将所有文档视为同样永恒的。如果嵌入足够接近，它会很高兴地显示六个月前的内容。

这些不是边缘情况。在智能体记忆系统中，它们是面包和黄油。智能体可能需要库的确切名称（关键字）、过去对话的概念要点（语义）、导致决策的事件链（图表）或特定时间范围内发生的事情（时间）——有时所有这些都在同一个会话中。

一刀切的检索器迫使您选择您愿意出错的查询。混合系统让您不再选择。

## 问题：四种截然不同的检索模式 {#the-problem-four-very-different-retrieval-modes}

Hindsight 的记忆系统依赖于四种不同的检索策略，因为不同的问题需要不同的工具：

- **语义搜索** — 概念匹配嵌入的向量相似度
- **BM25关键词搜索** — 精确术语和短语的经典全文搜索
- **图遍历** — 通过预先计算的链接信号进行扩展（实体共现、语义 kNN、因果链）
- **时间搜索** — 具有时间限制的记忆召回，通过事件传播激活

每个都有自己的成本概况：

- 语义搜索在 HNSW 索引上进行向量相似度
- BM25 使用 PostgreSQL 全文索引
- 图遍历从种子扩展到预先计算的链接表
- 临时搜索解析自然语言日期，然后运行范围查询和邻居遍历

简单的实现如下所示：

```python
#不要这样做——变相的顺序
semantic_results = await retrieve_semantic(...)
bm25_results = await retrieve_bm25(...)
graph_results = await retrieve_graph(...)
temporal_results = await retrieve_temporal(...)
```

这是“异步”但不是并发：一切都在开始下一步之前等待最慢的步骤。

## V1：真正独立的 asyncio.gather {#v1-asynciogather-with-real-independence}

我们的第一个设计决策很简单：将每种检索方法视为完全独立的工作。除了连接池之外，它们不共享任何内容。这意味着我们可以而且应该并行运行它们：

```python
async def _retrieve_parallel_hybrid(...) -> ParallelRetrievalResult:
    #所有方法独立并行运行
    semantic_result, bm25_result, graph_result, temporal_result = await asyncio.gather(
        run_semantic(),
        run_bm25(),
        run_graph(),
        run_temporal_with_extraction(),
    )
```

每个`run_*`功能负责：
- 获取自己的DB连接
- 执行查询
- 塑造结果
- 记录计时指标

这是一个坚实的改进——总延迟从所有分支的总和下降到最慢分支的最大值。但它有问题。每个分支从池中获取自己的连接（每个记忆召回有四个连接），即使查询没有时间组件，时间提取也会阻塞其分支，并且语义和BM25针对同一个表运行单独的查询。

我们从那里迭代。

## 演进1：连接共享和组合查询 {#evolution-1-connection-sharing-and-combined-queries}

4 路并行方法会在每个记忆召回中烧毁四个连接。语义查询和BM25查询使用相同的过滤器访问同一个表——唯一的区别是评分函数。单独运行它们意味着两次往返，而本来可能是一次往返。

我们使用每个事实类型`UNION ALL`臂将语义+BM25合并到单个查询中。每个臂都有自己的`ORDER BY ... LIMIT`，因此查询规划器可以使用每个事实类型的部分 HNSW 索引，而不是回退到顺序扫描：

```sql
-- Semantic arms: one per fact type, each hitting its partial HNSW index
(SELECT id, text, context, fact_type,
        1 - (embedding <=> $1::vector) AS similarity,
        NULL::float AS bm25_score,
        'semantic' AS source
 FROM memory_units
 WHERE bank_id = $2
   AND fact_type = 'world'
   AND embedding IS NOT NULL
   AND (1 - (embedding <=> $1::vector)) >= 0.3
 ORDER BY embedding <=> $1::vector
 LIMIT 100)

UNION ALL

-- BM25 arms: one per fact type
(SELECT id, text, context, fact_type,
        NULL::float AS similarity,
        ts_rank_cd(search_vector, to_tsquery('english', $4)) AS bm25_score,
        'bm25' AS source
 FROM memory_units
 WHERE bank_id = $2
   AND fact_type = 'world'
   AND search_vector @@ to_tsquery('english', $4)
 ORDER BY ts_rank_cd(search_vector, to_tsquery('english', $4)) DESC
 LIMIT $3)

UNION ALL
-- ... more arms for each fact type ...
```

我们以惨痛的方式了解到这一点：早期版本在 CTE 中使用`ROW_NUMBER() OVER (PARTITION BY fact_type)`，它看起来更干净，但迫使规划器进行完整的顺序扫描 - 完全击败部分索引。问题在于 PostgreSQL 的规划器将 CTE 评估为单个单元：窗口函数需要查看所有事实类型的所有行，然后才能对它们进行分区和排名，因此无法将 `fact_type` 过滤器下推到索引扫描中。 `UNION ALL` 方法不太优雅，但可以让每只手臂独立击中食指。

HNSW 是近似值，因此语义臂过度获取 5 倍（至少 100 个结果），并修剪到 Python 中请求的限制。我们还在初始化时在池连接上全局设置`ef_search=200`，以提高稀疏图的记忆能力。

然后我们更进一步：由于时间检索也查询同一个表并重用相同的连接，因此我们在单个连接上运行语义 + BM25 + 时间。首先提取时间约束（这是 CPU 工作，不需要 DB），如果检测到时间组件，则其查询将立即在同一连接上运行：

```python
async def retrieve_all_fact_types_parallel(...) -> MultiFactTypeRetrievalResult:
    #步骤 1：提取时间约束（CPU 工作，无 DB）
    temporal_constraint = extract_temporal_constraint(query_text, ...)

    #第 2 步：语义 + BM25 + 单个连接上的时间
    async with acquire_with_retry(pool) as conn:
        semantic_bm25_results = await retrieve_semantic_bm25_combined(conn, ...)

        if temporal_constraint:
            temporal_results = await retrieve_temporal_combined(conn, ...)

    #步骤 3：并行检索每个事实类型的图（单独的连接）
    graph_tasks = [run_graph_for_fact_type(ft) for ft in fact_types]
    graph_results = await asyncio.gather(*graph_tasks)
```

这将每个记忆识别的连接使用量从四个减少到一个（共享）+ N（每个事实类型的图），同时保持图遍历（最昂贵且独立的策略）完全并行。

## 进化2：可靠连接获取 {#evolution-2-reliable-connection-acquisition}

并行运行检索策略非常好，直到连接池耗尽并且一切都停止。我们使用重试逻辑和指数退避来包装连接获取：

```python
@asynccontextmanager
async def acquire_with_retry(pool, max_retries: int = 3):
    """获取具有针对瞬时失败的重试逻辑的连接。"""
    start = time.time()

    async def acquire():
        return await pool.acquire()

    conn = await retry_with_backoff(acquire, max_retries=max_retries)
    acquire_time = time.time() - start

    #记录缓慢的获取 — 表示池争用
    if acquire_time > 0.05:  #50ms 阈值
        pool_size = pool.get_size()
        pool_free = pool.get_idle_size()
        logger.warning(f"[DB POOL] Slow acquire: {acquire_time:.3f}s | size={pool_size}, idle={pool_free}")

    try:
        yield conn
    finally:
        await pool.release(conn)
```

`retry_with_backoff` 以从 0.5 秒开始的指数退避处理瞬时连接错误（接口错误、连接过多、死锁）。事实证明，50 毫秒的缓慢采集日志记录是发现生产中池压力的最有用信号之一——当该指标达到峰值时，池需要调整大小。

## 进化3：链路扩展——一个查询中的三个信号 {#evolution-3-link-expansion--three-signals-in-one-query}

早期的图检索使用多跳 BFS 遍历，这意味着每个遍历模式需要 O(hops) DB 查询。我们用链接扩展（Link Expansion）取代了它——一种单往返方法，利用了所有三个图信号（实体、语义、因果）在存储记忆时预先计算和限制的事实。

在记忆存储时，每个新事实都通过三种类型的预先计算的链接与相关事实链接：
1. **实体链接** — 共现图（每个实体限制为 50 个链接）
2. **语义链接** — kNN 图（前 5 个最相似的事实，相似度 >= 0.7）
3. **因果关系** — 显式链（causes/caused_by/enables/prevents）

因为这些链接在写入时受到限制，所以查询时扩展不需要扇出上限或预算跟踪。所有三个扩展都适合单个 CTE 查询：

```python
class LinkExpansionRetriever(GraphRetriever):
    async def retrieve(self, pool, query_embedding_str, bank_id, fact_type, budget, ...):
        async with acquire_with_retry(pool) as conn:
            #查找语义种子（通过嵌入相似性排名前 20）
            all_seeds = await _find_semantic_seeds(conn, query_embedding_str, ...)

            #单个 CTE 查询同时扩展所有三个信号
            entity_rows, semantic_rows, causal_rows = await self._expand_combined(
                conn, seed_ids, fact_type, budget
            )

        #与附加评分合并：实体 + 语义 + 因果 ∈ [0, 3]
        #多个信号中出现的事实会累积更高的分数
        for fid in all_ids:
            score_map[fid] = (
                entity_scores.get(fid, 0.0)     # tanh(count * 0.5) → [0, 1]
                + semantic_scores.get(fid, 0.0)  #相似度权重 → [0.7, 1.0]
                + causal_scores.get(fid, 0.0)    #链接权重 → [0, 1]
            )
```

CTE 查询在一次往返中使用 `source` 鉴别器列发出所有三个扩展：

```sql
WITH entity_expanded AS (
    -- Entity co-occurrence: seeds → their precomputed entity-link neighbors
    SELECT mu.id, mu.text, ...,
           COUNT(DISTINCT ml.entity_id)::float AS score,
           'entity'::text AS source
    FROM memory_links ml
    JOIN memory_units mu ON mu.id = ml.to_unit_id
    WHERE ml.from_unit_id = ANY($1::uuid[])
      AND ml.link_type = 'entity'
      AND mu.fact_type = $2
    GROUP BY mu.id
    ORDER BY score DESC LIMIT $3
),
semantic_expanded AS (
    -- Semantic kNN: both outgoing and incoming directions
    SELECT id, text, ..., MAX(weight) AS score, 'semantic'::text AS source
    FROM (
        -- outgoing: seeds → their kNN at insert time
        SELECT mu.*, ml.weight FROM memory_links ml
        JOIN memory_units mu ON mu.id = ml.to_unit_id
        WHERE ml.from_unit_id = ANY($1::uuid[]) AND ml.link_type = 'semantic'
        UNION ALL
        -- incoming: facts inserted after seeds that found seeds as kNN
        SELECT mu.*, ml.weight FROM memory_links ml
        JOIN memory_units mu ON mu.id = ml.from_unit_id
        WHERE ml.to_unit_id = ANY($1::uuid[]) AND ml.link_type = 'semantic'
    ) sem_raw
    GROUP BY id, text, ... ORDER BY score DESC LIMIT $3
),
causal_expanded AS (
    -- Causal chains: explicit causes/enables/prevents links
    SELECT DISTINCT ON (mu.id) mu.*, ml.weight AS score, 'causal'::text AS source
    FROM memory_links ml
    JOIN memory_units mu ON ml.to_unit_id = mu.id
    WHERE ml.from_unit_id = ANY($1::uuid[])
      AND ml.link_type IN ('causes', 'caused_by', 'enables', 'prevents')
      AND ml.weight >= $4
    ORDER BY mu.id, ml.weight DESC LIMIT $3
)
SELECT * FROM entity_expanded
UNION ALL SELECT * FROM semantic_expanded
UNION ALL SELECT * FROM causal_expanded
```

这用每个事实类型的单个查询取代了多跳遍历。关键见解：通过在写入时限制链接扇出（记忆存储），我们可以在读取时进行无限制扩展（记忆召回），而不必担心查询爆炸。

## 进化 4：与我们实际查询方式相匹配的索引 {#evolution-4-indexes-that-match-how-we-actually-query}

如果每个查询都猛烈地进行全表扫描，那么并行工作就没有意义。我们调整了模式以匹配我们的访问模式：

```sql
-- Per-(bank, fact_type) partial HNSW indexes for vector similarity
-- Created per-bank at bank creation time
CREATE INDEX idx_mu_emb_{bank}_{fact_type}
ON memory_units USING hnsw (embedding vector_cosine_ops)
WHERE bank_id = '{bank_id}' AND fact_type = '{fact_type}';

-- Full-text search
CREATE INDEX idx_memory_units_search_vector
ON memory_units USING gin(search_vector);

-- Temporal range queries
CREATE INDEX idx_memory_units_temporal_brin
ON memory_units USING brin (occurred_start, occurred_end);

-- Graph traversal fan-out
CREATE INDEX idx_memory_links_from_type_weight
ON memory_links (from_unit_id, link_type, weight DESC);
```

每个（记忆库，事实类型）的部分 HNSW 索引是一个关键的演变。当您有许多具有不同事实类型分布的记忆库时，单个全局 HNSW 索引无法扩展 - 规划器无法通过我们需要的 `WHERE` 过滤器有效地使用它。每个记忆库部分让 `UNION ALL` 查询中的每个分支准确命中正确的索引。

## 可观察性：使并行检索行为可见 {#observability-making-parallel-retrieval-behavior-visible}

为了调试和调整它，我们构建了一个结构化结果对象，其中包含检索到的项目和计时：

```python
@dataclass
class ParallelRetrievalResult:
    semantic:  list[RetrievalResult]
    bm25:      list[RetrievalResult]
    graph:     list[RetrievalResult]
    temporal:  list[RetrievalResult] | None

    timings: dict[str, float]              #每个分支总计
    temporal_constraint: tuple | None      #提取的时间范围（如果有）
    mpfp_timings: list[MPFPTimings]        #详细的图检索指标（种子、边、查询时间）
    max_conn_wait: float                   #跨分支机构的最差连接等待
```

这让我们可以回答以下问题：
- 是否有一个分支始终主导延迟？
- 我们是否达到了连接池限制（`max_conn_wait`峰值）？
- 时间提取是否比检索步骤做更多的工作？

如果没有这种故障，你就会盲目飞行。

## Fusion：让检索策略投票 {#fusion-letting-the-retrieval-strategies-vote}

一旦所有四种检索策略完成，我们就会融合它们的结果，以便智能体看到单个排名列表，而不是四个不相交的列表。我们使用倒数排名融合（RRF）作为合并机制：

```python
def reciprocal_rank_fusion(result_lists: list[list[RetrievalResult]], k: int = 60) -> list[MergedCandidate]:
    """使用RRF合并多个排名结果列表。

    RRF formula: score(d) = sum_over_lists(1 / (k + rank(d)))
    """
    rrf_scores = {}
    source_ranks = {}
    all_retrievals = {}

    source_names = ["semantic", "bm25", "graph", "temporal"]

    for source_idx, results in enumerate(result_lists):
        source_name = source_names[source_idx]
        for rank, retrieval in enumerate(results, start=1):
            doc_id = retrieval.id
            if doc_id not in all_retrievals:
                all_retrievals[doc_id] = retrieval
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = 0.0
                source_ranks[doc_id] = {}

            rrf_scores[doc_id] += 1.0 / (k + rank)
            source_ranks[doc_id][f"{source_name}_rank"] = rank

    return [
        MergedCandidate(retrieval=all_retrievals[doc_id], rrf_score=score,
                        rrf_rank=rrf_rank, source_ranks=source_ranks[doc_id])
        for rrf_rank, (doc_id, score) in enumerate(
            sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True), start=1
        )
    ]
```

我们选择RRF而不是替代方案有一个特定的原因：我们的四种检索策略产生了无与伦比的分数（余弦相似度，BM25tf-idf，图跳跃权重，时间衰减）。 RRF 是基于排名的，因此它完全回避了标准化。

|融合法|它是如何工作的|何时使用|
|---|---|---|
|**RRF**（我们的选择）|基于排名，无分数标准化|混合评分方案|
|梳状求和|归一化分数总和|当分数具有可比性时|
|加权平均|调整每个源的权重|当一种来源占主导地位时|
|级联|顺序过滤|延迟优先架构|

但是RRF只是第一阶段。它为我们提供了一个有序列表 - 它没有告诉我们哪些结果实际上与查询相关。

## 重排序：具有乘法提升的交叉编码器评分 {#reranking-cross-encoder-scoring-with-multiplicative-boosts}

RRF 生成合并的候选列表，但基于排名的融合只能组合相对顺序 - 它无法评估结果是否实际上是一个好的答案。为此，我们对顶级候选者运行跨编码器神经重排序器。

RRF之后的管道：

1. **预过滤器**：按RRF分数选取前300名候选者（重排序的成本很高；我们不需要对所有内容进行评分）
2. **跨编码器评分**：通过交叉编码器模型运行每个（查询、文档）对，生成相关性分数
3. **乘法提升得分**：使用最近度和时间接近度信号调整交叉编码器分数

交叉编码器重排序器将日期信息添加到每个文档中，以便模型可以推断时间相关性：

```python
async def rerank(self, query: str, candidates: list[MergedCandidate]) -> list[ScoredResult]:
    pairs = []
    for candidate in candidates:
        doc_text = candidate.retrieval.text
        if candidate.retrieval.context:
            doc_text = f"{candidate.retrieval.context}: {doc_text}"
        if candidate.retrieval.occurred_start:
            date_iso = candidate.retrieval.occurred_start.strftime("%Y-%m-%d")
            date_readable = candidate.retrieval.occurred_start.strftime("%B %d, %Y")
            doc_text = f"[Date: {date_readable} ({date_iso})] {doc_text}"
        pairs.append([query, doc_text])

    scores = await self.cross_encoder.predict(pairs)
    normalized_scores = [sigmoid(score) for score in scores]  # logits → [0, 1]
    #...构建 ScoredResult 对象...
```

跨编码器评分后，我们对新近度和时间接近度应用乘法提升：

```python
_RECENCY_ALPHA: float = 0.2
_TEMPORAL_ALPHA: float = 0.2

def apply_combined_scoring(scored_results, now, recency_alpha=0.2, temporal_alpha=0.2):
    for sr in scored_results:
        #新近度：365 天线性衰减 → [0.1, 1.0]；如果没有日期则为中性 0.5
        sr.recency = 0.5
        if sr.retrieval.occurred_start:
            days_ago = (now - sr.retrieval.occurred_start).total_seconds() / 86400
            sr.recency = max(0.1, min(1.0, 1.0 - (days_ago / 365)))

        #时间邻近度：仅对时间查询有意义；否则中性
        sr.temporal = sr.retrieval.temporal_proximity if sr.retrieval.temporal_proximity is not None else 0.5

        recency_boost = 1.0 + recency_alpha * (sr.recency - 0.5)    # ∈ [0.9, 1.1]
        temporal_boost = 1.0 + temporal_alpha * (sr.temporal - 0.5)  # ∈ [0.9, 1.1]
        sr.combined_score = sr.cross_encoder_score_normalized * recency_boost * temporal_boost
```

每个 0.2 的 alpha 都转化为围绕中性点 ±10% 的摆动：最坏的是`1 + 0.2 * (0 - 0.5) = 0.9`，最好的是`1 + 0.2 * (0.5) = 1.1`。结合起来，这两种提升最多可以将结果的最终分数改变 +21% 或 -19%。

关键的设计选择是**乘法**而不是附加增强。这确保了新近度和时间信号始终与基本相关性成比例地缩放——高度相关的旧记忆仍然击败平庸的最近记忆，但在两个同等相关的结果之间，较新的记忆获胜。

为什么是 0.2 而不是更大的值？我们根据我们的基准套件进行了校准。在 0.1 时，提升是不可见的——即使对于明确的时间范围查询（例如“我上周做了什么”），新近度也没有什么区别。 0.5 时，新近度占据主导地位：昨天的平庸事实会超过一个月前高度相关的事实。 0.2 是最佳点，时间范围的查询获得了所需的新近度提升，而不会扭曲与时间无关的查询的结果。

完整的记忆召回管道，端到端：

1. **检索**：共享连接上的语义 + BM25 + 时间；每个事实类型并行图
2. **保险丝 (RRF)**：按排名合并四个结果列表，`k=60`
3. **预过滤器**：RRF分数排名前300的候选人
4. **重新排名**：跨编码器神经评分，S形归一化为`[0, 1]`
5. **提升**：`combined_score = ce_normalized * recency_boost * temporal_boost`
6. **返回**：最终结果按综合得分排序

## 令人惊讶的部分 {#the-surprising-part}

最让我们惊讶的不是任何单一的优化——而是最终架构中有多少是由**连接池压力**塑造的，而不是查询速度。

我们最初的4路`asyncio.gather`设计原则上是正确的：四种检索策略是独立的。但在实践中，每个分支抓住自己的连接意味着每个记忆召回同时保持四个连接。在负载下，这将连接池变成了瓶颈，延迟激增并不是因为查询速度慢，而是因为分支正在等待获取连接。我们添加的用于调试的 `max_conn_wait` 指标显示了 200 毫秒以上的采集时间 — 比某些查询本身还要长。

这就是推动我们走向连接共享的原因：语义+BM25+单个连接上的时间，只有图检索独立运行。总查询时间略有增加（在共享连接内连续），但端到端延迟下降，因为我们停止与池竞争。该课程概括如下：在异步系统中，优化控制并发的共享资源比优化工作本身更重要。

## 这就是力量Hindsight的记忆力 记忆力 {#this-is-what-powers-hindsights-memory-recall}

Hindsight中的每个`recall_memory`调用都会运行此堆栈：并行混合检索、RRF融合、跨编码器重排序和乘法提升评分。即使记忆库成长为数以万计的事实，该架构仍然成立。

如果您想使用此检索架构而不自己构建它，[Hindsight Cloud](https://ui.hindsight.vectorize.io) 会为您运行它。 [记忆召回文档](https://hindsight.vectorize.io/developer/retrieval)涵盖了完整的技术参考，包括预算如何控制哪些策略运行以及如何应用重排序。

## 构建在生产中经受住考验的并行混合搜索 {#building-parallel-hybrid-search-that-holds-up-in-production}

一个好的并行混合搜索系统不仅仅是“我们有四种检索模式”。它是：

- 检索策略在重要的地方同时运行，在高效的地方共享连接
- 每个策略都经过内部优化，以实现最少的往返次数
- 由索引支持，相信真实的查询模式
- 通过RRF融合、跨编码器重排序以及将相关性与新近度和时间信号相结合的评分公式结合在一起

在Hindsight中，这种组合将纸上精美的设计变成了可以位于智能体记忆系统的热路径上而不会超出延迟预算的东西。
