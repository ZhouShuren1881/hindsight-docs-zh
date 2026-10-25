# 性能 {#performance}

Hindsight 专为大规模、高性能的语义记忆操作而设计。本页介绍其性能特征、优化策略和最佳实践。

## 概览 {#overview}

Hindsight 针对以下三项关键操作进行了性能优化：

- **Retain（摄取）**：通过批处理和异步操作，大规模存储记忆
- **Recall（检索）**：亚秒级语义检索，可配置思考预算
- **Reflect（推理）**：感知性格倾向的回答生成，计算量可控

## 设计理念：优先优化读取速度 {#design-philosophy-optimized-for-fast-reads}

Hindsight **从架构设计之初就优先保障读取性能，而非写入性能**。这一设计取舍符合记忆系统的典型使用模式：记忆写入一次，却会被读取多次。

系统有意做出了一些取舍，以确保 **Recall（召回）操作在一秒内完成**：

- **预先计算嵌入向量**：所有记忆的嵌入向量都在存入期间生成并建立索引
- **优化向量检索**：HNSW 索引支持快速的近似最近邻检索
- **写入时提取事实**：复杂的、基于 LLM 的事实提取在存入期间完成，而非检索时
- **结构化记忆图**：预先解析关系和时间信息

这意味着 **Recall（检索）操作极快**，因为所有繁重工作都已提前完成。

### 性能对比 {#performance-comparison}

| 操作 | 典型延迟 | 主要瓶颈 | 优化策略 |
|-----------|----------------|-------------------|----------------------------------|
| **Recall** | 100-600ms | 重排序器（在 CPU 上运行） | 使用 GPU 执行重排序，或降低预算 |
| **Reflect** | 800-3000ms | LLM 生成 | 使用速度更快的 LLM |
| **Retain** | 每批 500ms-2000ms | **LLM 事实提取** | 使用高吞吐量的 LLM 提供商 |

Hindsight 的设计目标是确保应用的**读取路径（召回/反思）始终快速**，即使这意味着写入前期需要花费更多时间。对于记忆系统而言，这种取舍适用于以下场景：

- 在后台进程中或低流量时段存入记忆
- 在面向用户且对延迟敏感的场景中频繁查询记忆
- 读取与写入的比例较高（通常为 10:1 或更高）

---

## Retain 性能 {#retain-performance}

**Retain（写入）操作本身较慢**，因为它涉及基于 LLM 的事实提取、实体识别、时间推理、关系映射和嵌入向量生成。**LLM 是写入延迟的主要瓶颈。**

### Hindsight 不需要能力很强的模型 {#hindsight-doesnt-need-a-smart-model}

事实提取流程结构清晰、定义明确，因此较小、速度较快的模型也能很好地完成任务。我们推荐使用 `gpt-oss-20b`（可通过 Groq 和其他提供商使用）。

若要最大限度提高存入吞吐量：

1. **使用高吞吐量的 LLM 提供商**：选择每分钟请求数（RPM）上限高且延迟低的提供商
   - **快**：[Groq](https://groq.com) 搭配 `gpt-oss-20b` 或其他 openai-oss 模型；也可使用 GPU 集群上自托管的模型（vLLM、TGI）
   - **慢**：有速率限制的标准云端 LLM 提供商

2. **批量提交操作**：将相关内容合并到批量请求中。一次请求可以发送任意数量的数据，唯一限制是 HTTP 负载大小。

3. **大型数据集使用异步模式**：将操作加入队列，在后台处理。

4. **并行处理**：对于非常大的数据集，可使用多个并发的存入请求，并为每个请求指定不同的 `document_id` 值。

### 自动优化批次 {#automatic-batch-optimization}

**使用异步 Retain 时，Hindsight 会自动为你处理批次大小**。你无需手动调整批次大小，也不必担心如何进行最佳分块。

工作方式：
- **发送大批次**：在一次异步 Retain 请求中提交数百或数千个输入项
- **自动拆分**：Hindsight 会将大型批次（>10,000 tokens）自动拆分为经过优化的子批次
- **并行处理**：在后台并发处理各个子批次
- **状态跟踪**：父操作汇总所有子批次的状态
- **按 token 计数**：批次按实际 token 数量计数，而不是字符数

优势：
- 通过一次 API 调用发送整份文档或整个数据集
- 由 Hindsight 优化处理策略
- 通过父操作状态跟踪整体进度
- 无需手动将数据拆分成小批次

### 吞吐量 {#throughput}

影响吞吐量的因素：
- 文档大小和复杂度
- LLM 提供商的速率限制（用于事实提取）
- 数据库写入性能
- 可用的 CPU/内存资源

---

## 本地和小型环境的调优 {#tuning-for-local--small-environments}

Hindsight 的默认设置针对云端 LLM 提供商和多核服务器进行了调优。如果在笔记本电脑、单 GPU 机器，或具有少量固定并发槽位的**本地 LLM 服务器**（llama.cpp、vLLM、LM Studio、Ollama）上运行，这些默认设置可能会耗尽后端容量、导致超时或使 CPU 不堪重负。本节汇总了低资源环境中值得调整的配置项。

### LLM 并发数 {#llm-concurrency}

默认值 `HINDSIGHT_API_LLM_MAX_CONCURRENT=32` 假设云端提供商能够承载数十个并行请求。本地服务器只有少量并发槽位，无法做到这一点；Hindsight 会占满所有槽位，**使共享该端点的其他客户端无法获得资源**（例如你的主智能体、其他应用，或另一个 Hindsight 操作）。

```bash
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2
```

设置为 `2` 后，Retain 和整合操作可以并发运行而不互相阻塞。如果该端点还由其他客户端**共享**（其他应用、智能体或工作流访问同一个 llama-server / vLLM / LM Studio 实例），请进一步降低此值，为它们留出并发槽位——每个共享客户端至少空出一个槽位。

你也可以按操作拆分并发预算，避免后台工作挤占实时读取所需的资源。各操作的并发上限是在全局上限之上叠加生效的：

```bash
# global=4, with retain/consolidation capped low so reflect always has headroom
export HINDSIGHT_API_LLM_MAX_CONCURRENT=4
export HINDSIGHT_API_RETAIN_LLM_MAX_CONCURRENT=1
export HINDSIGHT_API_CONSOLIDATION_LLM_MAX_CONCURRENT=1
```

### 超时与重试 {#timeouts-and-retries}

资源有限的硬件运行小型模型时，生成 token 的速度较慢；启动后的第一个请求还需要承担模型加载开销。默认值 `HINDSIGHT_API_LLM_TIMEOUT=120`（seconds）对于在 CPU 上运行的大型本地模型可能过短；提高超时时间可以避免意外超时和无效重试：

```bash
export HINDSIGHT_API_LLM_TIMEOUT=300        # allow slow local generation
export HINDSIGHT_API_LLM_MAX_RETRIES=2      # fail faster locally — retries rarely help a slow box
```

本地端点不受速率限制，因此遇到真实故障时，激进的重试和退避主要只会增加延迟。减少重试次数，让真正的错误尽快显现。

### 使用更小、更快的模型，并降低推理力度 {#smaller-faster-models--and-reasoning-effort}

Retain（事实提取）是结构化任务，不需要前沿模型；Reflect 还可以使用更轻量的模型。在资源受限的机器上，应为每项操作选择能够胜任任务的最小模型：

```bash
# Reflect on a small/fast model; retain on a slightly stronger structured-output model
export HINDSIGHT_API_REFLECT_LLM_MODEL=<small-fast-model>
export HINDSIGHT_API_RETAIN_LLM_MODEL=<structured-output-model>
```

如果模型提供推理/思考预算，请将其设低一些——额外的推理 token 只会增加提取和整合路径的延迟。只有显式设置后才会发送该值，因此未配置的部署会使用模型自身的默认推理力度（在后端支持的情况下，`none` 可完全关闭思考）：

```bash
export HINDSIGHT_API_LLM_REASONING_EFFORT=low
```

整合时会在一次调用中向 LLM 发送多条事实（默认值为 8）。在上下文窗口有限的小型模型上，大批次会产生过长的提示词和冗长、容易出错的回答。缩小批次，让每次整合调用都保持简短可靠：

```bash
export HINDSIGHT_API_CONSOLIDATION_LLM_BATCH_SIZE=2   # default 8; lower = smaller prompts, more calls
```

### 内置 llama.cpp 调优 {#built-in-llamacpp-tuning}

内置的 `llamacpp` 提供商会将 llama.cpp 服务器作为受管理的子进程运行，无需外部服务器。小型机器上的关键配置项包括：

```bash
export HINDSIGHT_API_LLM_PROVIDER=llamacpp
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2        # retain + consolidation without blocking
export HINDSIGHT_API_LLAMACPP_GPU_LAYERS=-1      # -1 = offload all layers to GPU; 0 = CPU only
export HINDSIGHT_API_LLAMACPP_CONTEXT_SIZE=8192  # lower to save RAM/VRAM; raise for big batches
export HINDSIGHT_API_LLAMACPP_EXTRA_ARGS="--n_threads 8"  # match physical cores on CPU-only boxes
# export HINDSIGHT_API_LLAMACPP_NO_GRAMMAR=true  # faster, but less reliable JSON output
```

完整选项列表请参阅[内置 llama.cpp](./configuration#built-in-llamacpp)。

### 在 CPU 上运行重排序器 {#reranker-on-cpu}

在没有 GPU 的机器上，Recall 的瓶颈是交叉编码器重排序器。本地重排序器提供了多项 CPU/Apple Silicon 配置选项，在不影响质量的前提下可显著提速：

```bash
# Apple Silicon (MPS): half precision is 27–36% faster, quality-identical
export HINDSIGHT_API_RERANKER_LOCAL_FP16=true

# Sort pairs by length before batching — 36–54% faster, quality-identical by construction
export HINDSIGHT_API_RERANKER_LOCAL_BUCKET_BATCHING=true

# Cap reranker parallelism so it doesn't thrash a small CPU under load (default 4)
export HINDSIGHT_API_RERANKER_LOCAL_MAX_CONCURRENT=2

# On macOS, force CPU if MPS/XPC causes instability
# export HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU=true
```

在 CPU 上，减少重排序的候选项数量是最有效的单项优化。Hindsight 默认会在每次召回时对最多 300 个候选项进行重排序；缩小候选池即可按比例减少交叉编码器的工作量：

```bash
export HINDSIGHT_API_RERANKER_MAX_CANDIDATES=100   # default 300; RRF pre-filters the rest
```

对于难以运行交叉编码器的纯 CPU 机器，`flashrank` 是更轻量的基于 ONNX 的重排序器：

```bash
export HINDSIGHT_API_RERANKER_PROVIDER=flashrank
```

你还可以直接减少 Recall 的工作量：日常查询使用较低的 `budget`（`low`/`mid`），将 `high` 留给需要全面推理的问题。请参阅下文的 [Recall 性能](#recall-performance)。

---

## Recall 性能 {#recall-performance}

### 预算 {#budget}

`budget` 参数用于控制检索深度和质量。应根据查询复杂度进行选择；需要深入分析的综合性问题适合使用较高预算：

| 预算 | 适用场景 |
|--------|----------|
| `low` | 快速查找、实时聊天 |
| `mid` | 常规查询、平衡性能 |
| `high` | 综合性问题、深入分析 |

### 优化 {#optimization}

1. **选择合适的预算**：简单查询使用较低预算，需要全面推理时使用较高预算
2. **限制结果 token 数量**：设置 `max_tokens` 控制响应大小（默认值：4096）
3. **包含文本分块**：需要更多上下文时，使用 `include_chunks` 获取生成记忆的原始文本

### 数据库性能 {#database-performance}

Hindsight 使用 PostgreSQL 和 pgvector 执行高效的向量检索：

- **索引类型**：用于近似最近邻检索的 HNSW
- **典型查询时间**：在 100K+ 条事实上进行向量检索需 10-50ms
- **可扩展性**：已在每个记忆库包含数百万条事实的场景中完成测试

## Reflect 性能 {#reflect-performance}

### 性能特征 {#performance-characteristics}

| 组件 | 延迟 | 说明 |
|-----------|----------------|-------------|
| 记忆检索 | 100-600ms | 取决于预算（low/mid/high） |
| LLM 生成 | 500-2000ms | 取决于提供商和响应长度 |
| **总计** | **600-2600ms** | 典型端到端延迟 |

### 优化策略 {#optimization-strategies}

1. **选择预算**：上下文足够时使用较低预算
2. **提供上下文**：提供相关的 `context`，以减少 Recall 的需求并引导生成更聚焦的回答

## 最佳实践 {#best-practices}

### 操作 {#operations}
- **选择合适的预算**：简单查询不要使用过高预算；需要全面推理时再使用较高预算
- **批量执行 Retain 操作**：将相关内容合并处理，以提高效率
- **缓存常见查询**：在应用层缓存重复查询的结果
- **使用 trace 进行性能分析**：利用 `trace` 参数找出运行缓慢的操作

### 扩展 {#scaling}
- **水平扩展**：在负载均衡器后部署多个 API 实例，并共用 PostgreSQL
- **并发**：支持 100+ 个并发请求；记忆检索性能随 CPU 核心数扩展
- **LLM 速率限制**：通过多个 API 密钥/提供商分散负载（每个密钥通常为 60-500 RPM）

### 成本优化 {#cost-optimization}
- **使用高效模型**：Retain 使用 Groq 提供的 `gpt-oss-20b`；Hindsight 不需要前沿模型
- **启用提供商的 Batch API**：异步 Retain 时设置 `HINDSIGHT_API_RETAIN_BATCH_ENABLED=true`，可将 LLM 事实提取成本降低 50%（OpenAI 和 Groq 支持；结果会在 24 hours 内交付）
- **控制 token 预算**：限制 Recall 的 `max_tokens`，并尽可能使用较低预算
- **优化文本分块**：与许多小分块相比，较大的分块（1000-2000 tokens）效率更高

### 监控 {#monitoring}
- **Prometheus 指标**：可在 `/metrics` 获取；跟踪延迟百分位数、吞吐量和错误率
- **关键指标**：`hindsight_recall_duration_seconds`、`hindsight_reflect_duration_seconds`、`hindsight_retain_items_total`