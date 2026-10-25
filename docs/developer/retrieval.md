---
sidebar_position: 3
---

import Figure from '@site/src/components/Figure';
import tempr from '@site/figures/tempr.json';

# Recall：Hindsight 如何检索记忆 {#recall-how-hindsight-retrieves-memories}

调用 `recall()` 后，Hindsight 会同时采用多种搜索策略，寻找与查询最相关的记忆；查询的具体措辞不会限制检索方式。

<Figure doc={tempr} />

---

## 记忆召回的挑战 {#the-challenge-of-memory-recall}

不同查询需要不同的搜索方式：

- **「Alice 在 Google 工作」** → 需要精确匹配名称
- **「Alice 在哪里工作？」** → 需要理解语义
- **「Alice 去年春天做了什么？」** → 需要时间推理
- **「Alice 为什么离开？」** → 需要追踪因果关系

单一搜索方法无法兼顾这些情况。Hindsight 因此会**并行运行四种互补策略**，再将各自的结果融合起来。

---

## 四种搜索策略 {#four-search-strategies}

### 语义搜索 {#semantic-search}

**工作原理**：关注词语表达的*含义*，不要求查询与记忆使用相同的词。

**最适合：**
- 概念匹配：「Alice 的职业」→「Alice 是软件工程师」
- 不同表述：「Bob 的专长」→「Bob 擅长机器学习」
- 同义词：「会议」匹配「研讨会」、「讨论」、「聚会」

**适用价值**：你可以用自然语言提问，不必照搬记忆中的关键词。

---

### 关键词搜索 {#keyword-search}

**工作原理**：匹配确切的词语和名称，包括拼写特殊的词项。

**最适合：**
- 专有名词：「Google」、「Alice Chen」、「MIT」
- 技术术语：「PostgreSQL」、「HNSW」、「TensorFlow」
- 唯一标识：URL、产品名称、特定短语

**适用价值**：即便某条记忆与查询的语义相似度较低，只要其中提到了指定名称或术语，也能被找到。

**后端**：Hindsight 提供五种可插拔的 BM25 后端，通过 `HINDSIGHT_API_TEXT_SEARCH_EXTENSION` 选择：

| 后端 | 使用的技术 | 是否兼容 Citus？ |
|---|---|---|
| `native` | PostgreSQL `tsvector` + `ts_rank_cd`（TF-IDF，并非真正的 BM25） | 是 |
| `vchord` | `vchord_bm25` 扩展 | 否 |
| `pg_textsearch` | Timescale `pg_textsearch` 扩展 | 否 |
| `pgroonga` | PGroonga（Groonga）全文扩展，`TokenBigram` 多语言分词器 | 否 |
| `pg_search` | ParadeDB `pg_search` 扩展，可通过 `HINDSIGHT_API_TEXT_SEARCH_EXTENSION_PG_SEARCH_TOKENIZER` 配置分词器（如 `jieba`、`chinese_compatible`、`ngram`） | 是 |

如果你要在水平扩展的 Postgres（Citus）集群中使用真正的 BM25 排序，只有 `pg_search` 可用。参见 [`pg_search` docker-compose 示例](https://github.com/vectorize-io/hindsight/tree/main/docker/docker-compose/pg_search)。

---

### 图遍历 {#graph-traversal}

**工作原理**：沿实体之间的连接继续遍历，从而找到间接相关的信息。

**最适合：**
- 间接关系：「Alice 做什么工作？」→ Alice → Google → Google 的产品
- 实体探索：「Bob 的同事」→ Bob → 同事 → 共同项目
- 多跳推理：「Alice 所在团队的成果」

**适用价值：**知识图谱能找出语义或用词并不相似、却在**结构上相连**的事实。

**示例**：即使记忆从未在同一处提到 Alice 和她的经理，图遍历仍可能沿共同项目或团队关系找到经理。

---

### 时间搜索 {#temporal-search}

**工作原理**：解析时间表达，并依据事件发生的时间筛选记忆。

**最适合：**
- 历史查询：「Alice 在 2023 年做了什么？」
- 时间范围：「去年春天发生了什么？」
- 相对时间：「Bob 去年从事了什么工作？」
- 前后关系：「Alice 加入 Google 之前发生了什么？」

**工作方式：**如果查询带有时间参照，Hindsight 会先将它解析为日期窗口，再检索时间与窗口相交的记忆。窗口内的候选按**查询语义相关性**选择，而不是按新近程度选择；因此，即使有其他更新的记忆，相关性最高的窗口内记忆也不会因此被剔除。随后，系统会**把候选分散到整个窗口**：将窗口划分为时间桶，先从每个非空桶中取出匹配度最高的记忆。这样，查询「2023 年发生了什么？」就能覆盖全年，而不是只集中在记忆最密集的时段。时间同时也是*评分*信号：越靠近所查窗口中心的记忆会获得小幅加权（见[时间接近程度信号](#temporal-proximity-signal)）。

**适用价值**：历史查询既能保持相关性，也能覆盖所问的整个时期。即使记忆库中的时间戳十分密集（例如大批内容都以同一天摄取），检索仍然快速且有意义：由于候选先按相关性筛选，即便窗口覆盖了记忆库中的大多数记忆，结果仍是最相关的内容，而非任意切出的一段。

---

## 结果融合 {#result-fusion}

四条检索路径运行完毕后，Hindsight 会**融合结果**：

- 在**多种策略**中出现的记忆排名更高（形成共识）
- **排名比原始分数更重要**（能适应不同评分体系）
- 使用考虑查询与记忆交互的神经模型对最终结果**重排序**

**融合的作用**：同时在语义上相符、又包含正确实体的事实，会排在仅语义相似的事实前面。

---

## 为什么需要多种策略？ {#why-multiple-strategies}

考虑查询：**「Alice 去年春天谈到 Python 时说了什么？」**

- **语义搜索**查找 Alice 对编程的看法
- **关键词搜索**确保内容确实提及「Python」
- **图搜索**连接 Alice → 编程语言 → 相关实体
- **时间搜索**将结果限定在「去年春天」

将四种策略的结果**融合起来**，即使没有一种策略能独自满足查询，也能找到你要的信息。

---

## Token 预算管理 {#token-budget-management}

Hindsight 面向 AI 智能体设计。传统搜索系统会返回「top-k」条结果，而智能体需要考虑的是 token 数量。智能体的上下文窗口按 token 计量，Hindsight 也据此控制返回内容。

**选择过程：**
- 先纳入排名靠前的记忆
- 达到 token 上限后停止
- 你给出上下文预算，Hindsight 会用相关性最高的记忆填满预算

**可以设置的参数：**
- `max_tokens`：要返回的记忆内容上限（默认 4096 tokens）
- `budget`：搜索深度（low、mid、high）
- `types`：选择 world、experience、observation 类型，或选择全部类型
- `tags`：按可见性标签筛选记忆
- `tags_match`：指定标签如何匹配；完整选项见[Recall API](./api/recall)

### 扩展上下文：文本块 {#expanding-context-chunks}

记忆是从原始材料提炼出的简洁事实，有时会省去细节。智能体需要更多上下文时，可以选择取回来源材料。

**文本分块**会返回产生相应记忆的原始文本；当提炼后的事实不含某些重要细节时，这些内容就很有帮助：

```
Memory: "Alice prefers Python over JavaScript"
Chunk:  "Alice mentioned she prefers Python over JavaScript, mainly because
         of its data science ecosystem, though she admits JS is better for
         frontend work and she's been learning TypeScript lately."
```

设置 `include_chunks=True` 可纳入来源分块；`max_chunk_tokens` 用来限制这些分块的 token 数量。需要逐字引用或依赖具体语境的回答适合这样做，例如「Alice 关于这个项目的原话是什么？」

---

## 调整记忆召回：质量与延迟 {#tuning-recall-quality-vs-latency}

不同场景对**召回质量**和**响应速度**的取舍不同。下面介绍控制这两方面的两个参数。

### Budget：搜索深度 {#budget-search-depth}

该参数决定 Hindsight 搜索记忆库时探索多深，并影响图遍历的深度、候选数量以及交叉编码器重排序：

| Budget | 适用场景 | 权衡 |
|--------|----------|------|
| **low** | 快速查找、简单查询 | 速度快，可能遗漏间接关联 |
| **mid** | 大多数查询，平衡选择 | 覆盖良好，速度合理 |
| **high** | 需要深入探索的复杂查询 | 全面，但较慢 |

**示例**：查询「Alice 的经理所在团队做过哪些工作？」可使用 high 预算，让搜索经过多个关系跳转（Alice → 经理 → 团队 → 项目），并评估更多候选。

### Max Tokens：上下文窗口大小 {#max-tokens-context-window-size}

该参数限制返回的记忆内容量：

| Max Tokens | 约合文本页数 | 适用场景 | 权衡 |
|------------|--------------|----------|------|
| **2048** | 约 2 页 | 聚焦的回答、快速 LLM | 记忆较少，速度更快 |
| **4096**（默认） | 约 4 页 | 平衡的上下文 | 覆盖良好，标准选择 |
| **8192** | 约 8 页 | 全面的上下文 | 记忆更多，LLM 更慢 |

**示例**：若要「总结关于 Alice 的所有信息」，提高 max_tokens 就能纳入更多事实。

### 两个独立维度 {#two-independent-dimensions}

Budget 与 max_tokens 分别控制 Recall 的不同部分：

| 参数 | 控制的内容 | 对延迟的影响 | 示例 |
|------|------------|--------------|------|
| **Budget** | 探索记忆的深入程度 | 搜索时间 | 高预算找到 Alice → 经理 → 团队 → 项目 |
| **Max Tokens** | 返回的上下文数量 | LLM 处理时间 | 高 token 数向智能体返回更多记忆 |

**这两个参数互不依赖**。例如可以这样搭配：

| Budget | Max Tokens | 场景 |
|--------|------------|------|
| high | low | 深入搜索，只返回最佳结果 |
| low | high | 快速搜索，返回找到的全部内容 |
| high | high | 全面的研究查询 |
| low | low | 快速聊天机器人响应 |

### 推荐配置 {#recommended-configurations}

| 场景 | Budget | Max Tokens | 原因 |
|------|--------|------------|------|
| **聊天机器人回复** | low | 2048 | 响应快，上下文聚焦 |
| **文档问答** | mid | 4096 | 平衡覆盖范围与速度 |
| **研究查询** | high | 8192 | 全面，支持多跳推理 |
| **实时搜索** | low | 2048 | 尽量降低延迟 |

---

## 深入理解评分与排序 {#scoring--ranking-deep-dive}

本节逐步说明 Hindsight 怎样把检索得到的候选整理成最终排名。处理过程包括三个主要阶段：**RRF 融合**、**交叉编码器重排序**以及**组合评分**。

### 阶段 1：倒数排名融合（RRF） {#stage-1-reciprocal-rank-fusion-rrf}

各检索策略并行完成后，Hindsight 使用[倒数排名融合](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)合并排名列表。某个条目若在多个策略中都排得靠前，RRF 就会提高它的综合排名；计算不依赖原始分数，因为不同检索方法的分数不可直接比较。

**公式：**

```
score(d) = Σ  1 / (k + rank_i(d))
           i
```

各符号含义如下：
- **k = 60**，即平滑常数，用于避免最高排名项取得过大优势
- **rank_i(d)** 表示文档 *d* 在策略 *i* 的名次，从 1 开始计数
- 求和只包含检索到 *d* 的策略

**RRF 对四种策略一视同仁**。它根据名次融合，不会因为候选来自某个特定策略而暗中乘上权重。若要刻意偏向某一来源，可设置 [`HINDSIGHT_API_RECALL_STRATEGY_BOOSTS`](./configuration)。这项加权在别的阶段生效：一处在重排序预筛选的候选截断之前，另一处在交叉编码器重排之后；它不属于上面的 RRF 融合。截断前的加权仅在合并候选超过上限时执行，也不会改写 RRF 分数。若重排序器只是透传结果（`rrf` 模式、`rrf` 提供方，或已降级为 `rrf` 的故障转移链），系统会略过重排后的加权：候选未超上限时，设置不起作用；超出上限时，它只影响哪些候选能留下。

**为什么不用原始分数直接合并**？不同检索策略的分值采用不同尺度，例如余弦相似度、BM25 tf-idf 和图激活值。BM25 的 12.5 与余弦相似度的 0.85 没有可比含义。RRF 只看名次，因此避开了尺度问题，无需校准就能组合不同评分体系。

**示例**：一条记忆在语义搜索中排名第 1，在 BM25 中排名第 5：
```
RRF 分数 = 1/(60+1) + 1/(60+5) = 0.0164 + 0.0154 = 0.0318
```

一条仅在语义搜索中排名第 1 的记忆：
```
RRF 分数 = 1/(60+1) = 0.0164
```

第一条记忆排名更高，因为它在多种策略之间形成了**共识**。

---

### 阶段 2：交叉编码器重排序 {#stage-2-cross-encoder-reranking}

RRF 能建立一个有效的初始排序，但它只使用名次，并不理解查询与文档的具体内容。交叉编码器会逐一把候选与查询配对评估，并为每一对计算相关性分数。

**预筛选**：为控制计算开销，重排序前只保留 RRF 分数最高的 **300** 个候选。可用 `HINDSIGHT_API_RERANKER_MAX_CANDIDATES` 调整上限。若启用了 [`HINDSIGHT_API_RECALL_STRATEGY_BOOSTS`](./configuration)，截断之前就会应用加权，让偏好的来源更容易进入候选集。它调整的是*名次*：计算 RRF 贡献前，先用该级别的除数除以偏好分支的名次，而不是直接放大分数。这样，即使候选总量远超上限，也能让偏好分支中较靠后的命中进入重排，同时保留其他分支的头部结果。请求 `trace: true` 后，`rerank_prefilter` 阶段会列出保留与丢弃的候选数、当前上限、启用的加权项，以及保留候选的分支分布。

**为何在 RRF 后再重排**？RRF 能看出某条记忆在多个策略中名次都不错，却不会把查询和记忆放在一起理解。交叉编码器会同时处理查询及每个候选，根据两者的完整交互打出相关性分数。它能识别名次融合遗漏的细节，例如某条记忆虽然因命中常见词而在关键词搜索中排第 1，实际却偏离了查询意图。

**分数归一化**：交叉编码器输出的原始 logit 可能是负数。若分数本来就在 [0, 1] 内（例如 Cohere、SiliconFlow、ZeroEntropy、Alibaba、Jina 等校准过的外部 API 重排序器所返回的分数），系统会直接沿用，以保留其绝对置信度。原始 logit 超出 [0, 1] 时，则使用 sigmoid 函数将它映射到该区间：

```
CE_normalized = 1 / (1 + e^(-raw_logit))
```

**批量评分**：本地重排序器每批处理 **32 对**候选，TEI 每批处理 **128 对**。

:::tip 没有交叉编码器？
若运行环境没有交叉编码器（例如精简镜像中没有外部重排序器），系统会用 RRF 排名生成替代分数，范围分布在 [0.1, 1.0]，供下文的组合加权继续使用。此路径不应用 `HINDSIGHT_API_RECALL_STRATEGY_BOOSTS` 的重排后调整。合并候选未超过重排序上限时，这个设置不会产生影响；若超过上限，它只会改变入选候选。最终顺序仍取决于 RRF 替代分数、时效性、时间因素和支持事实。
:::

---

### 阶段 3：组合评分（加权） {#stage-3-combined-scoring-boosts}

系统会用三个**乘法加权项**调整归一化后的交叉编码器分数，纳入模型无法直接看到的信号：记忆的新近程度、时间接近程度和证据强度。

**为什么用乘法而不是加法**？加法项（例如 `CE + 0.1 × recency`）会给每个候选相同的绝对加分，无论它原本有多相关。这样，一条相关性很弱的近期记忆可能反超一条高度相关的记忆。乘法项则按基础相关性成比例调整：高相关候选的 +10% 绝对增量更大，低相关候选的增量更小。因此，次要信号不会盖过首要的相关性判断。

**公式：**

```
final_score = CE_normalized × recency_boost × temporal_boost × proof_count_boost
```

每项加权以 1.0 为中性值，alpha 决定其可产生的最大变化：

```
boost = 1 + α × (signal - 0.5)
```

| 加权 | α | 最大调整幅度 | 奖励的内容 |
|------|---|--------------|------------|
| **时效性** | 0.2 | ±10% | 较新的记忆 |
| **时间接近程度** | 0.2 | ±10% | 接近查询时间窗口的记忆 |
| **支持事实数** | 0.1 | ±5% | 有更多事实作为依据的观测 |

#### 时效性信号 {#recency-signal}

以记忆的发生日期为基准，按 365 天的跨度线性衰减：

```
recency = clamp(1.0 - days_ago / 365, 0.1, 1.0)
```

发生时间等于查询时间戳的记忆，时效信号为 1.0（加权 +10%）；早于查询时间戳约 6 个月的记忆，信号约为 0.5（中性）；早于查询时间戳一年以上的记忆，信号为 0.1（惩罚 -8%）。如果没有提供 `query_timestamp`，服务器会使用当前时间。日期缺失的记忆取 0.5，不加权也不惩罚。

#### 时间接近程度信号 {#temporal-proximity-signal}

只有查询带有时间参照时才启用（例如「去年春天」或「2023 年」）。该信号衡量记忆日期与查询窗口中心相距多远：

```
temporal_proximity = 1.0 - min(days_from_center / (window_days / 2), 1.0)
```

日期在窗口中心的记忆取 1.0（加权 +10%）；在边界上的记忆取 0.0（惩罚 -10%）。查询不含时间条件时，所有记忆都取中性的 0.5。

#### 支持事实数信号 {#proof-count-signal}

对于 observation 类型的记忆，该信号通过对数曲线提高证据较多的观测的分数：

```
proof_norm = clamp(0.5 + ln(proof_count) / 10, 0.0, 1.0)
```

| 支持事实数 | proof_norm | 加权 |
|----------|------------|------|
| 1 | 0.5 | 中性 |
| 3 | 0.61 | +1.1% |
| 10 | 0.73 | +2.3% |
| 150+ | 1.0 | +5%（最大值） |

#### 最大组合范围 {#maximum-combined-range}

所有加权都取极值时：
- **最佳情况：**×1.10 × 1.10 × 1.05 ≈ **+27%**
- **最差情况：**×0.90 × 0.90 × 0.95 ≈ **-23%**

这些加权的幅度有意设得较小，用于微调排名，不会取代交叉编码器的相关性判断。

---

### 阶段 4：Token 截断 {#stage-4-token-truncation}

评分完成后，系统按 `final_score` 从高到低排列结果，并依次选取，直至用完 `max_tokens`。预算只包含记忆正文，不包含元数据。若某条结果超过剩余空间，系统会跳过它并尝试后续结果，因此一条长事实不会挤掉后面的短事实。若没有任何结果能装入预算，仍会完整返回排名第一的结果，避免已有匹配时却给出空列表。

---

### Budget 如何映射到流水线参数 {#how-budget-maps-to-pipeline-parameters}

`budget` 参数（low/mid/high）控制**搜索深度**，也就是每种策略会检查多少候选。每个级别对应一个**召回预算**值，并传递到流水线的各个环节：

| Budget | 召回预算（固定模式） | 覆盖值的环境变量 |
|--------|----------------------|------------------|
| **low** | 100 | `HINDSIGHT_API_RECALL_BUDGET_FIXED_LOW` |
| **mid** | 300（默认） | `HINDSIGHT_API_RECALL_BUDGET_FIXED_MID` |
| **high** | 1000 | `HINDSIGHT_API_RECALL_BUDGET_FIXED_HIGH` |

各阶段会按以下方式使用召回预算：

| 流水线阶段 | 召回预算的使用方式 |
|------------|--------------------|
| **语义搜索** | SQL 使用 `LIMIT recall_budget`；查询对应的 ANN 候选列表也会设为相同规模（pgvector 使用 `hnsw.ef_search`，上限为该配置可设的 1000） |
| **BM25 搜索** | SQL 中使用 `LIMIT recall_budget` |
| **图遍历** | 最多探索 recall_budget 个节点 |
| **时间扩展** | 通过链接最多激活 recall_budget 个节点 |
| **纳入结果检查** | 取排名最高的 recall_budget × 2 条结果进行 token 筛选 |

重排序的预筛选上限（300 个候选）**不受 budget 影响**，它由独立参数 `HINDSIGHT_API_RERANKER_MAX_CANDIDATES` 控制。

:::info 自适应预算
也可以采用自适应预算：按 `max_tokens` 调整召回预算，而不是使用固定数字：

```
recall_budget = clamp(max_tokens × ratio, min, max)
```

| Budget | 比例 | 覆盖值的环境变量 |
|--------|------|------------------|
| low | max_tokens 的 2.5% | `HINDSIGHT_API_RECALL_BUDGET_ADAPTIVE_LOW` |
| mid | max_tokens 的 7.5% | `HINDSIGHT_API_RECALL_BUDGET_ADAPTIVE_MID` |
| high | max_tokens 的 25% | `HINDSIGHT_API_RECALL_BUDGET_ADAPTIVE_HIGH` |

最终值会限制在 **20** 的下限（`HINDSIGHT_API_RECALL_BUDGET_MIN`）与 **2000** 的上限（`HINDSIGHT_API_RECALL_BUDGET_MAX`）之间。

通过 `HINDSIGHT_API_RECALL_BUDGET_FUNCTION=adaptive` 启用。
:::

---

### 图评分细节 {#graph-scoring-detail}

图遍历（沿链接扩展候选）会为每个候选加总三个彼此独立的信号：

| 信号 | 评分公式 | 范围 |
|------|----------|------|
| **实体重叠** | tanh(shared_entity_count × 0.5) | [0, ~1.0] |
| **语义关联** | 预先计算的 kNN 关联权重 | [0.7, 1.0] |
| **因果关联** | 因果关联权重 | [0, 1.0] |

```
graph_score = entity_score + semantic_score + causal_score   ∈ [0, 3]
```

加总这些信号可以体现**多方证据汇合**：若一条记忆通过多种信号与查询相连，其排名会高于只靠一种强信号关联的记忆。

**实体信号为何使用 tanh**？共享实体的原始数量没有上限。「user」这类连接很多的实体可能带来 50 以上的计数，压过另外两个信号。`tanh(count × 0.5)` 会逐渐饱和：最初几个共享实体影响显著（1→0.46、2→0.76、3→0.91），之后每个实体带来的增量越来越小，因此实体信号限制在 [0, 1]，与语义和因果信号保持相近尺度。

**此处为何相加而非相乘**？与组合评分中的加权项不同，图信号各自代表一类独立证据，并非对某个基础分数进行修正。一条记忆可能只通过因果链接连到查询，没有共享实体或语义相似性；若把信号相乘，分数就会变成零。相加能让每类信号各自贡献，跨策略的排序再交由外层 RRF 融合。

**实体信号示例**：与查询共享 1 个实体时，分数为 tanh(0.5) ≈ 0.46；共享 2 个时为 tanh(1.0) ≈ 0.76；共享 3 个或更多时，分数会逐渐趋近 0.91 以上的饱和值。

---

## 后续步骤 {#next-steps}

- [**Retain**](./retain) — 如何连同丰富上下文一起存入记忆
- [**Reflect**](./reflect) — 性格倾向如何影响推理过程
- [**Recall API**](./api/recall) — 代码示例、参数及标签筛选
