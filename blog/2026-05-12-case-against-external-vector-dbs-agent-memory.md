---
title: "针对智能体记忆的外部向量数据库的案例"
description: "大多数“为智能体添加记忆”教程都是从安装矢量数据库开始的。他们不应该。为什么矢量数据库是智能体记忆的错误默认值。"
authors: [benfrank241]
date: 2026-05-12T12:00
tags: [memory, agents, hindsight, architecture, postgres, pgvector, vector-database, deep-dive]
image: /img/blog/case-against-external-vector-dbs.png
hide_table_of_contents: true
---

![针对智能体记忆的外部向量数据库的案例](/img/blog/case-against-external-vector-dbs.png)

打开几乎所有智能体记忆框架的文档，快速入门以相同的方式开始：安装矢量数据库。 [Mem0](https://mem0.ai) 想要 Qdrant 或 Pinecone。自托管 Zep，或者更确切地说，它的幸存者，需要 [Neo4j](https://neo4j.com)、FalkorDB 或 Kuzu。 LangChain的记忆示例默认达到Chroma。这种模式足够一致，“智能体记忆意味着矢量数据库”已经成为一种民间智慧。

大多数时候，这些都是不必要的。

<!-- truncate -->

这并不是反对矢量数据库的论点。 [松果](https://www.pinecone.io)、[Weaviate](https://weaviate.io) 和 [Qdrant](https://qdrant.tech) 都针对其设计的工作负载进行了精心设计：在大型且大部分静态的语料库上进行大量读取的相似性搜索。该工作负载通常称为 RAG。 智能体记忆是另一回事，将两者视为同一问题是首先产生不良默认的原因。

这个论点比较狭隘：对于大多数智能体记忆工作负载来说，运行第二个有状态服务的操作复杂性并不能收回成本。而税收购买的东西——快速相似性搜索——是错误的优化层。将对话流转化为有用的[智能体记忆](https://vectorize.io/what-is-agent-memory)的大部分工作都发生在写入端：事实提取、实体解析、矛盾处理、失效和综合。矢量数据库看不到这些。它看到嵌入的进入和嵌入的退出。实际的记忆位于它之上。

---

## 智能体记忆不是RAG {#agent-memory-is-not-rag}

从工作量开始，因为其他一切都随之而来。

|轴|RAG|智能体记忆|
|---|---|---|
|读/写比|大量阅读；语料库构建一次|写重；每一次谈话都会产生事实|
|每租户足迹|数百万到数十亿个向量|几十万到几百万|
|检索组合|主要是语义相似|语义+实体+时间+图|
|延迟预算|数百毫秒（搜索 UI）|低于 200 毫秒（智能体循环）|

RAG 是重读的。语料库构建一次，嵌入批量计算，索引构建，系统在其余下的生命周期中针对大多数静态索引提供相似性查询。更新发生了，但它们不是热路径。热路径是“用户输入问题，返回语义最相似的块”。近似最近邻搜索的吞吐量是标题数字。

智能体记忆反转了其中的大部分，而不仅仅是因为写入“更频繁地”发生。每次写入都经过一个学习管道。原始对话被分解为原子事实。这些事实中提到的实体是针对现有实体进行解析的：“身份验证服务”、“我们的登录系统”和“OAuth 微服务”应该落在一个规范节点上。与现有事实相矛盾的新事实会引发矛盾的解决。已被取代的事实将失效。综合步骤会定期读取累积的事实并写回高阶观察结果。这些都不存在于 RAG 摄取中，也不是矢量数据库的构建目的。

检索模式也不同。 RAG 查询大多是一次性语义查找。 智能体记忆查询是混合的。 “上周二用户对定价有何决定？”是时间性的和实体锚定的。 “显示与数据库迁移线程相关的所有内容”是图形形状的。 “用户是否提到过对新仪表板的任何担忧？”需要语义搜索，还需要实体解析来捕获同义词。这些都不是纯粹的人工神经网络问题。

​​每个租户的足迹是第三个差异。典型的智能体记忆语料库是每个租户有几十万到几百万个事实。这比在生产环境中运行 Pinecone 的 RAG 工作负载小两到三个数量级。通常不存在使专用矢量数据库值得其运营成本（十亿矢量规模）的东西。

为了更详细地了解这两个系统的差异，[关键架构差异](https://vectorize.io/articles/agent-memory-vs-rag)值得一读。

---

## 外部向量数据库的隐性税收 {#the-hidden-tax-of-external-vector-databases}

如果智能体记忆具有与RAG相同的形状，则单独的矢量数据库的运营税将是正常的业务成本。事实并非如此，所以税收基本上什么也买不到。

### 操作表面积 {#operational-surface-area}

运行外部矢量数据库意味着配置、扩展、保护、备份、监控和版本升级第二个有状态服务。对于因其他原因已经大规模运营 Pinecone 或 Weaviate 的团队，这是摊销的。对于不这样做的团队来说，智能体记忆项目只是将数据库数量增加了一倍。

该模式在主要智能体记忆框架如何处理自托管方面是可见的。自托管 Mem0 需要单独站立 Qdrant 或 Pinecone。 Zep 的社区版已被弃用，自托管 Graphiti 现在意味着在 Graphiti 自己的服务之上建立 Neo4j、FalkorDB 或 Kuzu。框架本身并不是重担。数据库依赖项是。

### 网络跃点和延迟 {#network-hop-and-latency}

智能体循环比RAG管道具有更严格的延迟预算。需要 400 毫秒的记忆检索调用在搜索 UI 中感觉很好；每回合调用四次工具的智能体感觉很糟糕。路径中的每个外部服务都会添加一个往返和一个序列化步骤。对于小容量智能体记忆工作负载，到托管矢量数据库的网络跃点通常比实际查询占延迟预算的更大部分。

### 小规模成本 {#cost-at-small-scale}

托管矢量数据库有最低限度。 Pinecone 的无服务器层和 Pod 层都有定价下限，但这些定价下限并不与智能体记忆中典型的小型数据集线性扩展。 Weaviate Cloud、Zilliz 和 Qdrant Cloud 具有类似的结构。 （验证当前定价；供应商经常修改它。）对于适合几 GB Postgres 的工作负载，支付托管矢量数据库底价是对操作简单性的征税，买不到工作负载实际需要的任何东西。

---

## 矢量数据库没有的学习层 {#the-learning-layer-a-vector-database-doesnt-have}

如果你剥离检索论证，更根本的问题完全是检索的上游。

有用的智能体记忆不是一堆对话块。它是一种随着对话的积累而构建和重建的结构化表示。使该工作有效的架构基元不是向量：

- **事实提取。** 模型将每个对话分解为原子的、可检索的声明，其来源可追溯到原始消息。
- **实体解析。** 新提及会链接到现有实体。同一客户、项目或服务都会解析为一个规范节点，无论其命名方式如何。
- **矛盾处理。** 当新事实与现有事实发生冲突时，系统必须决定哪些内容获胜、哪些内容无效以及哪些内容保留为历史。
- ​​**无效。** 事实有寿命。一旦仪表板发布，“仪表板处于测试阶段”就应该停止检索。
- **反思。** 系统会定期读取累积的事实并写回综合的观察结果 - 模式、摘要、反复出现的主题，这些主题在任何单个对话中并不明确，但会从许多对话中出现。

矢量数据库对此没有任何意见。它接受 `id` 和 `vector`。结构、关系、时间有效性、重复数据删除逻辑——所有这些都必须存在于其他地方。在实践中，“其他地方”通常意味着第二个数据库（或大量的应用程序逻辑和缓存），矢量存储减少为您已经维护的较大模式的一列。

此时，您还没有从堆栈中删除数据库。您已经添加了一个。

将学习层和检索基底放在同一个事务数据库中会破坏架构。事实提取管道写入与 pgvector 索引相同的Postgres。实体解析是一个连接。矛盾的解决是一个交易。 反思输出是像任何其他事实一样的事实，与输入一起索引。智能体实际需要的检索组合不属于数据模型，而不是跨服务组装。

---

## 单一策略检索才是真正的天花板 {#single-strategy-retrieval-is-the-real-ceiling}

向量数据库擅长做一件事：对嵌入进行近似最近邻搜索。即使上面的操作论点不适用，纯矢量系统仍然是智能体记忆的错误基础，因为大多数智能体记忆查询不会分解为纯粹的语义相似性。

考虑Hindsight针对每个查询并行运行的四种检索策略：语义搜索、基于实体的检索、时间过滤和图遍历。这四个中的三个不是 ANN。基于实体的检索是针对实体表的结构化查找。时间过滤是对时间戳的范围查询。图遍历是对边的递归遍历。矢量数据库可以做到第一点。它必须委托或复制其他人。

这不是Hindsight特定的观察。任何足够完整的智能体记忆系统最终都至少具有这四种检索模式中的三种，因为这就是查询所需要的。 Zep 的时态知识图是认真对待图和时间的最有力的例子，而代价是 Zep 的图数据库也不再是“向量数据库问题”。建筑学的争论涉及多个方向。

实证结果遵循架构。在长期会话记忆的标准评估[LongMemEval基准](https://arxiv.org/abs/2410.10813)上，向量主系统得分较低。 Mem0 发布 49.0%。多策略系统得分更高。 Hindsight 在同一基准上发布了 91.4%。 SuperMemory也运行多种检索模式，发布了81.6%。精度差距是建筑方面的明显缺陷。为了进行更深入的架构比较，[Hindsight 与 Mem0 相比如何](https://vectorize.io/articles/hindsight-vs-mem0) 详细介绍了相同的权衡。

---

## 矢量数据库针对错误的工作负载进行了优化 {#vector-databases-are-optimized-for-the-wrong-workload}

向量索引结构（HNSW、IVF、ScaNN）经过读取优化。它们的构建成本很高，增量更新成本也很高。一些实现支持删除和重建模式；其他的则需要对非平凡的突变进行完全重新索引。他们都不喜欢像智能体记忆那样频繁地写入、更新和失效的工作负载。

更糟糕的是，向量索引看到的写入甚至不是实质性的。有意义的工作——提取、解析、矛盾、反思——发生在上游，并产生许多小的派生记录，矢量存储只能以最终的嵌入形式看到这些记录。大多数学习逻辑根本不涉及向量索引，这就是要点：向量存储是重心在其他地方的系统中的一个基础。

PostgreSQL 花了三十年的时间来擅长事务性工作负载。 MVCC、WAL、时间点恢复、在线模式更改、成熟的复制。这些都不是为矢量构建的，而是为智能体记忆实际具有的访问模式（写入、更新、删除、并发读取）构建的。通过 pgvector 添加向量搜索继承了所有内容。

​​在十亿向量规模上，情况正好相反。专门的矢量数据库在原始吞吐量和索引构建时间上获胜，并且操作开销本身就可以收回。大多数智能体记忆工作负载都不是十亿向量规模。

---

## pgvector 对于智能体记忆来说已经足够好了 {#pgvector-is-already-good-enough-for-agent-memory}

“只使用Postgres”的历史反对意见是性能：pgvector 的早期 IVFFlat 索引在规模上没有竞争力。这不再是约束条件。 [pgvector](https://github.com/pgvector/pgvector) 支持 HNSW 索引，这些索引在对于智能体记忆工作负载至关重要的记忆召回和延迟曲线方面具有竞争力。 Postgres 16 的并行索引构建和查询并行性弥补了大部分剩余差距。

更重要的是，将向量放入Postgres意味着实体表、时间事实、图边和应用程序数据位于一个事务数据库中。多策略检索成为联接，而不是分布式查询。所有四个检索基底上的原子写入都是免费的。备份只需 `pg_dump` 即可完成。

实际上，这看起来像一个查询：

```sql
-- Three retrieval strategies merged in one query against one database
WITH semantic AS (
  SELECT fact_id, 1 - (embedding <=> $query_embedding) AS score
  FROM facts
  ORDER BY embedding <=> $query_embedding
  LIMIT 50
),
temporal AS (
  SELECT fact_id, 1.0 AS score
  FROM facts
  WHERE created_at BETWEEN $window_start AND $window_end
),
entity AS (
  SELECT f.fact_id, 1.0 AS score
  FROM facts f
  JOIN fact_entities fe USING (fact_id)
  WHERE fe.entity_id = ANY($resolved_entity_ids)
)
SELECT f.*,
       COALESCE(s.score, 0) AS semantic_score,
       COALESCE(t.score, 0) AS temporal_score,
       COALESCE(e.score, 0) AS entity_score
FROM facts f
LEFT JOIN semantic s USING (fact_id)
LEFT JOIN temporal t USING (fact_id)
LEFT JOIN entity   e USING (fact_id)
WHERE s.fact_id IS NOT NULL OR t.fact_id IS NOT NULL OR e.fact_id IS NOT NULL;
```

图遍历在边表上添加了递归 CTE。交叉编码器重排序在应用程序中针对合并的候选集运行。同一个数据库保存所有这些，并且所有这些都是一个事务。

选择不是“Postgres代替矢量数据库”。选择是“Postgres，因为检索模式需要连接”。

---

## 您需要AI智能体的矢量数据库吗？ {#do-you-need-a-vector-database-for-an-ai-agent}

默认情况下不是。大多数智能体记忆工作负载足够小，可以与Postgres和pgvector中的应用程序数据一起放置。外部向量数据库是为RAG规模的语料库和大量阅读的相似性搜索而构建的； 智能体记忆是写入密集型、更新密集型，并且从组合的向量、图形和时间检索中获益比从原始 ANN 吞吐量中获益更多。确实存在一些例外情况，接下来将对此进行介绍。

---

## 当外部向量数据库仍然有意义时 {#when-an-external-vector-database-still-makes-sense}

微积分真正逆转的情况有3种。

**向量数量非常大的多租户 SaaS。** 如果您在数百个租户中为每个租户存储数千万个向量，则 pgvector 索引构建时间和共享资源争用将成为真正的问题。 Pinecone 的无服务器索引和 Weaviate 的租户隔离值得运营成本。

**智能体记忆和真实RAG语料库之间的共享基础设施。** 如果您的团队已经在数百万个文档上运行产品RAG的矢量数据库，那么将智能体记忆分层到相同的基础设施上可能比建立并行Postgres更有效。矢量数据库的边际成本已经支付。

**读取吞吐量主导的工作负载。** 一些智能体记忆部署（企业知识库上的长尾记忆召回、多区域只读副本）看起来更像RAG，而不是智能体记忆。专门的矢量数据库是专为该形状设计的。

这些都不是默认值。在这些情况下，工作负载已重新回到矢量数据库形状的领域。

---

## 智能体记忆的更好默认值 {#a-better-default-for-agent-memory}

适合大多数智能体记忆工作负载的默认值：

- 一种学习管道，将事实、实体、边和综合观察写入一个 Postgres — 其中 pgvector 用于嵌入、图表用于边以及时间索引用于事实生命周期
- 多策略检索实现为针对同一数据库的并行查询，并合并在应用程序层中
- 对合并结果进行跨编码器重排序，在应用程序中运行
- 作为一个容器部署，像任何其他容器一样进行备份Postgres

这是Hindsight 所采用的架构，这并非巧合。选择该架构是因为工作负载需要它，而工作负载需要它是因为智能体记忆不是RAG。自托管是一个 Docker 命令。存储是嵌入式的PostgreSQL。无需提供外部矢量数据库，也无需与之一起运行的图形数据库。如果 [Hindsight 与 Zep 相比如何](https://vectorize.io/articles/hindsight-vs-zep) 是正确的下一个问题（图优先与Postgres 上的多策略），那就是要阅读的比较。

---

## 结论 {#conclusion}

正确的问题不是“我应该运行哪个矢量数据库来实现智能体记忆？”这是两个问题。检索上游的学习管道实际上是做什么的？我的检索组合实际上是什么样子？对于大多数团队来说，答案是：事实提取、实体解析、矛盾处理、反思；这种混合大多不具有语义相似性，大多不是十亿级规模，大多是写入量很大，而且大多足够小以适应应用程序数据。单个Postgres比单独的矢量数据库更好地处理这两个层，并且运营成本更低。

外部向量数据库在其构建目的方面仍然表现出色。 智能体记忆通常不是这样的——最不像RAG的部分是学习层，而不是搜索。

**进一步阅读：**
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory) 基本概念
- [智能体记忆 vs RAG](https://vectorize.io/articles/agent-memory-vs-rag) 关键架构差异
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems) 完整风景
- [Hindsight 与 Mem0](https://vectorize.io/articles/hindsight-vs-mem0) 关于准确性和架构
