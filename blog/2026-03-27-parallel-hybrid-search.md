---
title: "我们如何构建真正并行运行的四路混合搜索系统"
description: "顺序执行的异步查询让检索延迟居高不下。本文介绍我们如何用 asyncio 和 RRF 融合构建真正四路并行的混合搜索系统，并进一步通过共享连接、交叉编码器重排序和乘法加权提升完善架构。"
authors: [chrislatimer, nicoloboschi, benfrank241]
date: 2026-03-27T12:00
tags: [engineering, retrieval, search, python, asyncio, performance, deep-dive]
image: /img/blog/parallel-hybrid-search.webp
hide_table_of_contents: true
---

![我们如何构建真正并行运行的四路混合搜索系统](/img/blog/parallel-hybrid-search.webp)

设计 Hindsight 的记忆检索时，我们必须面对 AI 数据检索中最棘手的挑战之一。

异步代码看起来“并行”，实际却没有并行运行。写出四个漂亮的异步函数，再加上几处 await，结果所有操作还是一个接一个地执行。对于采用多种检索策略的混合搜索系统，这完全无法接受。

下面介绍我们如何构建真正并行运行的四路混合搜索系统，如何逐步改进架构以共享连接、减少往返，以及如何通过重排序串起整个流程。先说结论：最大的瓶颈原来不是查询速度，而是连接池争用；这一发现重塑了整个架构。

<!-- truncate -->

## 为什么要采用多种检索方式？ {#why-multi-retrieval}

大多数检索系统从一种方法起步，通常是向量检索，然后就此打住。它在演示中效果很好；真正的查询一出现，问题很快就暴露出来。

核心问题是，语义相似度不等于相关性。向量检索会找到嵌入空间中概念上相近的内容。但“相近”这个标准承担了太多工作，遇到用户实际提出的某些问题时，就会以可预见的方式失效。

**语义检索无法精确匹配**。如果用户询问特定产品 SKU、错误代码、人名或 API 端点，向量嵌入很可能返回主题相关的内容，而不是用户要找的那一项。语义上的“模糊性”让向量检索变得强大，但在需要精确匹配时也会成为负担。查询 `HTTP 502 error` 时，用户通常不需要一篇泛谈 Web 服务器的文档，而是需要那篇提到“502”的文档。

**关键词检索无法理解概念**。换成 BM25，就会遇到相反的问题。它擅长匹配精确术语，但用户措辞与文档不同时就难以奏效，例如“如何修复”和“故障排查”，或“car”和“automobile”。如果查询与文档没有共同词项，无论文档多相关，BM25 都找不到它。

**两者都无法沿着关系追踪**。例如，用户问“我们调整定价模式后发生了什么？”这是一个关于因果关系和事件顺序的问题。语义检索和关键词检索都会返回提到定价调整的文档，却无法把这次调整与后续影响联系起来，例如支持工单、客户流失率骤升，以及三周后的董事会讨论。这些联系存在于记忆之间的关系中，而不在某一篇文档的嵌入向量或词项集合里。

**两者都不理解时间**。“上周二我在做什么？”对人来说很简单。对检索系统而言，这需要解析自然语言日期，将其转换为时间范围，再找出该范围内的记忆。标准向量检索把所有文档都当作没有时间差别的内容；只要嵌入足够接近，它就可能返回六个月前的记忆。

这些都不是边缘情况。在智能体记忆系统中，这些需求非常常见：智能体可能需要某个库的准确名称（关键词）、过去对话的大意（语义）、促成某项决定的事件链（图），或特定时间范围内发生的事情（时间）；有时同一轮查询会同时需要这几种信息。

单一检索器会迫使你决定哪些查询可以答错。混合检索系统则让你不必做这种取舍。

## 问题：四种截然不同的检索模式 {#the-problem-four-very-different-retrieval-modes}

Hindsight 的记忆系统采用四种不同的检索策略，因为不同的问题需要不同的工具：

- **语义检索** — 在嵌入向量上计算相似度，以匹配概念相关内容
- **BM25 关键词检索** — 用经典全文检索匹配精确术语和短语
- **图遍历** — 沿预先计算的连接信号扩展检索范围，包括实体共现、语义 kNN 和因果链
- **时间检索** — 在时间范围内召回记忆，并通过事件传播激活扩展相关内容

每种策略都有不同的成本特征：

- 语义检索在 HNSW 索引上计算向量相似度
- BM25 使用 PostgreSQL 全文索引
- 图遍历从种子节点出发，沿预先计算的连接表扩展
- 时间检索解析自然语言日期，然后执行范围查询和邻居遍历

最简单的实现大致如下：

```python
# 不要这样做——这只是伪装成并发的顺序执行
semantic_results = await retrieve_semantic(...)
bm25_results = await retrieve_bm25(...)
graph_results = await retrieve_graph(...)
temporal_results = await retrieve_temporal(...)
```

这段代码虽是“异步”的，却没有并发执行：每一步都要等最慢的操作完成后，下一步才会开始。

## V1：用 asyncio.gather 实现真正的独立并行 {#v1-asynciogather-with-real-independence}

我们的第一个设计决策很简单：把每种检索方法视为完全独立的工作。它们除了连接池之外不共享任何资源，因此可以并且应该并行运行：

```python
async def _retrieve_parallel_hybrid(...) -> ParallelRetrievalResult:
    # 所有方法都独立并行运行
    semantic_result, bm25_result, graph_result, temporal_result = await asyncio.gather(
        run_semantic(),
        run_bm25(),
        run_graph(),
        run_temporal_with_extraction(),
    )
```

每个 `run_*` 函数各自负责：
- 获取自己的数据库连接
- 执行查询
- 整理结果
- 记录耗时指标

这是一次显著改进：总延迟从各分支耗时之和降到了最慢分支的耗时。不过，这种设计也有问题。每个分支都从连接池获取自己的连接（每次召回需要四个连接）；即使查询中没有时间条件，时间解析也会阻塞对应分支；语义检索和 BM25 还会分别查询同一张表。

我们继续迭代改进。

## 演进 1：共享连接并合并查询 {#evolution-1-connection-sharing-and-combined-queries}

四路并行方案每次召回都会占用四个连接。语义查询和 BM25 查询使用相同的过滤条件访问同一张表，唯一不同的是评分函数。分开执行就需要两次数据库往返，而原本一次就够了。

我们按事实类型使用多个 `UNION ALL` 分支，将语义检索和 BM25 合并到一个查询中。每个分支都有自己的 `ORDER BY ... LIMIT`，因此查询规划器可以使用各事实类型对应的部分 HNSW 索引，而不必退回顺序扫描：

```sql
-- 语义检索分支：每种事实类型一个，分别使用对应的部分 HNSW 索引
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

-- BM25 分支：每种事实类型一个
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
-- ... 每种事实类型都还有其他分支 ...
```

我们是吃了亏才学会这一点的：早期版本在 CTE 中使用 `ROW_NUMBER() OVER (PARTITION BY fact_type)`。这种写法看起来更简洁，却迫使规划器执行完整的顺序扫描，彻底失去了部分索引的优势。问题在于，PostgreSQL 规划器会把 CTE 作为一个整体来计算：窗口函数必须先看到所有事实类型的所有行，才能分组排名，因此无法把 `fact_type` 过滤条件下推到索引扫描中。`UNION ALL` 写法不那么优雅，却能让每个分支独立使用自己的索引。

HNSW 是近似算法，因此语义检索分支会过量获取 5 倍结果（至少 100 条），再由 Python 裁剪到请求的数量。我们还会在初始化时为连接池中的连接统一设置 `ef_search=200`，以提高稀疏图上的召回率。

我们还进一步合并了查询：时间检索也会查询同一张表，并能复用同一连接，因此语义检索、BM25 和时间检索都可以使用一个连接。先提取时间约束（这是 CPU 工作，不需要数据库）；如果检测到时间条件，就紧接着在同一连接上执行对应查询：

```python
async def retrieve_all_fact_types_parallel(...) -> MultiFactTypeRetrievalResult:
    # 步骤 1：提取时间约束（CPU 工作，无需数据库）
    temporal_constraint = extract_temporal_constraint(query_text, ...)

    # 步骤 2：在同一连接上执行语义检索、BM25 和时间检索
    async with acquire_with_retry(pool) as conn:
        semantic_bm25_results = await retrieve_semantic_bm25_combined(conn, ...)

        if temporal_constraint:
            temporal_results = await retrieve_temporal_combined(conn, ...)

    # 步骤 3：按事实类型并行执行图检索（使用独立连接）
    graph_tasks = [run_graph_for_fact_type(ft) for ft in fact_types]
    graph_results = await asyncio.gather(*graph_tasks)
```
这样一来，每次召回的连接用量就从四个降到了一个共享连接，再加上每种事实类型各自用于图检索的 N 个连接；同时，最昂贵且彼此独立的策略——图遍历——仍然可以完全并行。

## 演进 2：可靠地获取连接 {#evolution-2-reliable-connection-acquisition}

并行运行检索策略效果很好，直到连接池耗尽、所有操作都停滞为止。为此，我们在获取连接时加入了重试逻辑和指数退避：

```python
@asynccontextmanager
async def acquire_with_retry(pool, max_retries: int = 3):
    """Acquire a connection with retry logic for transient failures."""
    start = time.time()

    async def acquire():
        return await pool.acquire()

    conn = await retry_with_backoff(acquire, max_retries=max_retries)
    acquire_time = time.time() - start

    # 记录耗时较长的连接获取，表明连接池可能存在争用
    if acquire_time > 0.05:  # 50 ms 阈值
        pool_size = pool.get_size()
        pool_free = pool.get_idle_size()
        logger.warning(f"[DB POOL] Slow acquire: {acquire_time:.3f}s | size={pool_size}, idle={pool_free}")

    try:
        yield conn
    finally:
        await pool.release(conn)
```

`retry_with_backoff` 会从 0.5 秒开始采用指数退避，以处理瞬时连接错误（接口错误、连接数过多、死锁）。我们发现，记录超过 50 毫秒的慢速连接获取耗时，是在生产环境中发现连接池压力最有用的信号之一；这项指标飙升时，通常说明需要扩大连接池。

## 演进 3：连接扩展——一次查询利用三种信号 {#evolution-3-link-expansion--three-signals-in-one-query}

早期的图检索使用多跳 BFS 遍历，因此每种遍历模式都需要执行 O(hops) 次数据库查询。后来我们用连接扩展（Link Expansion）取代了它：这种方法只需一次往返，并利用了一个事实——三种图信号（实体、语义、因果）都会在存入记忆时预先计算并限制数量。

存入记忆时，每条新事实都会通过以下三类预先计算的连接与相关事实建立联系：
1. **实体连接** — 共现图（每个实体最多连接 50 条）
2. **语义连接** — kNN 图（相似度最高的 5 条事实，相似度 >= 0.7）
3. **因果连接** — 显式因果链（causes/caused_by/enables/prevents）

由于写入时已经限制了这些连接的数量，查询时扩展就不需要扇出上限或预算跟踪。三种扩展可以放进同一个 CTE 查询：

```python
class LinkExpansionRetriever(GraphRetriever):
    async def retrieve(self, pool, query_embedding_str, bank_id, fact_type, budget, ...):
        async with acquire_with_retry(pool) as conn:
            # 找出语义种子（按嵌入相似度排名前 20）
            all_seeds = await _find_semantic_seeds(conn, query_embedding_str, ...)

            # 用一个 CTE 查询同时扩展三种信号
            entity_rows, semantic_rows, causal_rows = await self._expand_combined(
                conn, seed_ids, fact_type, budget
            )

        # 将实体、语义和因果分数相加：实体 + 语义 + 因果 ∈ [0, 3]
        # 同时出现在多种信号中的事实会累积更高分数
        for fid in all_ids:
            score_map[fid] = (
                entity_scores.get(fid, 0.0)     # tanh(count * 0.5) → [0, 1]
                + semantic_scores.get(fid, 0.0)  # 相似度权重 → [0.7, 1.0]
                + causal_scores.get(fid, 0.0)    # 连接权重 → [0, 1]
            )
```
CTE 查询通过 `source` 鉴别列，在一次数据库往返中执行全部三种扩展：

```sql
WITH entity_expanded AS (
    -- 实体共现：种子 → 预先计算的实体连接邻居
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
    -- 语义 kNN：同时遍历出向和入向
    SELECT id, text, ..., MAX(weight) AS score, 'semantic'::text AS source
    FROM (
        -- 出向：种子 → 插入时计算的 kNN
        SELECT mu.*, ml.weight FROM memory_links ml
        JOIN memory_units mu ON mu.id = ml.to_unit_id
        WHERE ml.from_unit_id = ANY($1::uuid[]) AND ml.link_type = 'semantic'
        UNION ALL
        -- 入向：种子之后插入、并将种子识别为 kNN 的事实
        SELECT mu.*, ml.weight FROM memory_links ml
        JOIN memory_units mu ON mu.id = ml.from_unit_id
        WHERE ml.to_unit_id = ANY($1::uuid[]) AND ml.link_type = 'semantic'
    ) sem_raw
    GROUP BY id, text, ... ORDER BY score DESC LIMIT $3
),
causal_expanded AS (
    -- 因果链：显式的 causes/enables/prevents 连接
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
这用每种事实类型一次查询取代了多跳遍历。关键在于：在写入时（存入记忆时）限制连接扇出，就能在读取时（召回记忆时）不设扩展上限，而无需担心查询量爆炸。

## 演进 4：让索引匹配实际查询方式 {#evolution-4-indexes-that-match-how-we-actually-query}

如果每个查询都会触发全表扫描，并行处理就毫无意义。我们调整了数据库模式，使其符合实际访问模式：

```sql
-- 按（记忆库、事实类型）建立部分 HNSW 索引，用于向量相似度检索
-- 创建记忆库时，为该记忆库建立索引
CREATE INDEX idx_mu_emb_{bank}_{fact_type}
ON memory_units USING hnsw (embedding vector_cosine_ops)
WHERE bank_id = '{bank_id}' AND fact_type = '{fact_type}';

-- 全文检索
CREATE INDEX idx_memory_units_search_vector
ON memory_units USING gin(search_vector);

-- 时间范围查询
CREATE INDEX idx_memory_units_temporal_brin
ON memory_units USING brin (occurred_start, occurred_end);

-- 图遍历扇出查询
CREATE INDEX idx_memory_links_from_type_weight
ON memory_links (from_unit_id, link_type, weight DESC);
```

按（记忆库、事实类型）建立部分 HNSW 索引，是这次演进的关键之一。记忆库很多且事实类型分布各不相同时，单个全局 HNSW 索引难以扩展，规划器也无法有效地结合所需的 `WHERE` 过滤条件使用它。按记忆库建立部分索引后，`UNION ALL` 查询中的每个分支都能命中对应的索引。

## 可观测性：让并行检索的行为清晰可见 {#observability-making-parallel-retrieval-behavior-visible}

为了调试和调优，我们构建了一个结构化结果对象，同时记录检索到的项目和耗时：

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
    max_conn_wait: float                   #各分支中的最长连接等待时间
```

借助这些信息，我们可以回答以下问题：
- 是否有某个分支总是主导整体延迟？
- 是否触及连接池上限（例如 `max_conn_wait` 飙升）？
- 时间解析是否比实际检索步骤耗费更多工作？

没有这种细分数据，就只能盲目排查。

## 融合：让不同检索策略共同投票 {#fusion-letting-the-retrieval-strategies-vote}

四种检索策略都完成后，我们会融合结果，让智能体看到一个统一的排序列表，而不是四个互不相干的列表。我们用倒数排名融合（Reciprocal Rank Fusion，RRF）合并结果：

```python
def reciprocal_rank_fusion(result_lists: list[list[RetrievalResult]], k: int = 60) -> list[MergedCandidate]:
    """Merge multiple ranked result lists using RRF.

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

我们选择 RRF 而不是其他方法，原因很明确：四种检索策略产生的分数无法直接比较（余弦相似度、BM25 TF-IDF、图跳数权重、时间衰减）。RRF 只依据排名，因此完全不需要做分数归一化。

| 融合方法 | 工作方式 | 适用场景 |
| --- | --- | --- |
| **RRF**（本文采用） | 根据排名，不需要归一化分数 | 分数尺度混杂时 |
| CombSUM | 对归一化后的分数求和 | 各路分数可以比较时 |
| 加权平均 | 调整不同来源的权重 | 某个来源占主导时 |
| 级联 | 按顺序筛选 | 延迟优先的架构 |

但 RRF 只是第一阶段。它会给出一份有序列表，却无法判断哪些结果真正与查询相关。

## 重排序：用交叉编码器评分并乘法加权提升 {#reranking-cross-encoder-scoring-with-multiplicative-boosts}

RRF 会生成合并后的候选列表，但基于排名的融合只能整合相对顺序，无法判断某条结果是否真能回答查询。为此，我们会用交叉编码器神经重排序模型处理排名靠前的候选项。

RRF 之后的处理流程：

1. **预筛选**：按 RRF 分数选出前 300 个候选项（重排序成本高，不必给所有候选项评分）。
2. **交叉编码器评分**：将每个（查询、文档）对输入交叉编码器模型，得到相关性分数。
3. **乘法加权提升**：使用近期性和时间接近度信号调整交叉编码器分数。

交叉编码器重排序器会在每篇文档前加入日期信息，以便模型判断时间相关性：

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

完成交叉编码器评分后，我们会对近期性和时间接近度应用乘法加权提升：

```python
_RECENCY_ALPHA: float = 0.2
_TEMPORAL_ALPHA: float = 0.2

def apply_combined_scoring(scored_results, now, recency_alpha=0.2, temporal_alpha=0.2):
    for sr in scored_results:
        # 近期性：在 365 天内线性衰减 → [0.1, 1.0]；没有日期时取中性值 0.5
        sr.recency = 0.5
        if sr.retrieval.occurred_start:
            days_ago = (now - sr.retrieval.occurred_start).total_seconds() / 86400
            sr.recency = max(0.1, min(1.0, 1.0 - (days_ago / 365)))

        # 时间接近度：仅对时间查询有意义；其他查询取中性值
        sr.temporal = sr.retrieval.temporal_proximity if sr.retrieval.temporal_proximity is not None else 0.5

        recency_boost = 1.0 + recency_alpha * (sr.recency - 0.5)    # ∈ [0.9, 1.1]
        temporal_boost = 1.0 + temporal_alpha * (sr.temporal - 0.5)  # ∈ [0.9, 1.1]
        sr.combined_score = sr.cross_encoder_score_normalized * recency_boost * temporal_boost
```

两个 alpha 都设为 0.2，意味着相对于中性值最多上下浮动 10%：最差情况下为 `1 + 0.2 * (0 - 0.5) = 0.9`，最好情况下为 `1 + 0.2 * (0.5) = 1.1`。两项提升叠加后，结果的最终分数最多增加 21%，或降低 19%。

关键设计选择是采用**乘法加权**，而非加法提升。这样，近期性和时间信号始终按基本相关性成比例缩放：高度相关的旧记忆仍会胜过相关性一般的近期记忆；而两条相关性相同的结果中，较新的记忆会排在前面。

为什么选 0.2，而不是更大的值？我们用基准测试套件进行了校准。设为 0.1 时，加权提升几乎看不出来，即使查询明确指定了时间范围（例如“我上周做了什么”），近期性也几乎不起作用。设为 0.5 时，近期性又占比过高：昨天的一条普通事实会排在一个月前的高度相关事实之前。0.2 是合适的平衡点：既能让有明确时间范围的查询获得所需的近期性加权，又不会扭曲不依赖时间范围的查询结果。

完整的记忆召回流程如下：

1. **检索**：在共享连接上执行语义检索、BM25 和时间检索；按事实类型并行执行图检索。
2. **融合（RRF）**：按排名合并四个结果列表，`k=60`。
3. **预筛选**：按 RRF 分数选取前 300 个候选项。
4. **重排序**：用交叉编码器进行神经网络评分，并通过 sigmoid 归一化到 `[0, 1]`。
5. **加权提升**：`combined_score = ce_normalized * recency_boost * temporal_boost`。
6. **返回**：按综合分数对最终结果排序。

## 出乎意料的发现 {#the-surprising-part}

最让我们意外的不是某一项优化，而是最终架构在很大程度上受**连接池压力**而非查询速度的影响。

最初采用四路 `asyncio.gather` 的设计从原理上说没有问题：四种检索策略彼此独立。但实际运行时，每个分支各自获取连接，意味着每次召回都会同时占用四个连接。负载上来后，瓶颈就变成了连接池；延迟上升并不是查询变慢，而是各分支都在等待获取连接。为排查问题而添加的 `max_conn_wait` 指标显示，获取连接要等 200 毫秒以上，有时比某些查询本身还久。

这促使我们改为共享连接：语义检索、BM25 和时间检索共用一个连接，只有图检索独立运行。由于共享连接内的查询改为顺序执行，总查询时间略有增加；但因为不再争抢连接池，端到端延迟反而降低了。由此得到的经验具有普遍意义：在异步系统中，优先优化限制并发的共享资源，往往比优化具体工作本身更重要。

## Hindsight 的记忆召回由此驱动 {#this-is-what-powers-hindsights-memory-recall}

Hindsight 中每次调用 `recall_memory` 都会运行这套流程：并行混合检索、RRF 融合、交叉编码器重排序和乘法加权评分。即使记忆库增长到数万条事实，这种架构仍然适用。

如果你想使用这套检索架构，又不想自己构建，[Hindsight Cloud](https://ui.hindsight.vectorize.io) 可以代为运行。[记忆召回文档](/developer/retrieval)介绍了完整的技术细节，包括 `budget` 如何决定运行哪些策略，以及如何应用重排序。

## 构建能在生产环境稳定运行的并行混合搜索 {#building-parallel-hybrid-search-that-holds-up-in-production}

一个优秀的并行混合搜索系统，不只是“我们有四种检索模式”，还需要做到：

- 在真正需要并行的环节同时运行各检索策略，并在适合的地方共享连接
- 优化每种策略，尽量减少数据库往返
- 让索引与实际查询模式相匹配
- 通过 RRF 融合、交叉编码器重排序和评分公式整合结果，并结合相关性、近期性和时间信号

在 Hindsight 中，这些设计让原本只在纸面上漂亮的方案成为现实：它可以放进智能体记忆系统的高频调用路径，同时不会突破延迟预算。
