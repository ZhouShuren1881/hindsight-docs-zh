# 性能 {#performance}

Hindsight 为大规模高性能语义记忆操作而设计。本页介绍性能特性、优化策略和最佳实践。

## 概述 {#overview}

Hindsight 围绕三种关键操作优化性能：

- **记忆存储（导入）**：结合批量处理与异步操作，支持大规模记忆存储
- **记忆召回（搜索）**：亚秒级语义搜索，支持可配置思考预算
- **反思（推理）**：生成考虑性格倾向的回答，计算量可控

## 设计理念：优化快速读取 {#design-philosophy-optimized-for-fast-reads}

Hindsight **从架构之初就优先优化读取性能，而非写入性能**。这一决策符合记忆系统的典型使用模式：记忆写入一次，却读取多次。

系统通过明确取舍确保**亚秒级记忆召回**：

- **预计算嵌入**：所有记忆嵌入均在存储时生成并建立索引
- **优化向量搜索**：HNSW 索引支持快速近似最近邻搜索
- **写入时提取事实**：复杂的 LLM 事实提取在存储时执行，而非检索时
- **结构化记忆图**：提前解析关系和时间信息

这使**记忆召回（搜索）非常快速**，因为繁重工作已提前完成。

### 性能 {#performance} Comparison

| 操作 | 典型延迟 | 主要瓶颈 | 优化策略                         |
|-----------|----------------|-------------------|----------------------------------|
| **记忆召回** | 100-600ms | 重排序器（CPU） | 使用 GPU 重排序，或降低预算 |
| **反思** | 800-3000ms | LLM 生成 | 使用更快的 LLM                   |
| **记忆存储** | 每批 500ms-2000ms | **LLM 事实提取** | 使用高吞吐量 LLM 提供方 |

Hindsight 确保**应用读取路径（记忆召回/反思）始终快速**，即使因此需要在写入时提前投入更多时间。这适合以下记忆系统场景：

- 在后台进程或低流量时段存储记忆
- 在面向用户、对延迟敏感的场景频繁查询记忆
- 读写比很高（通常为 10:1 或更高）

---

## 记忆存储性能 {#retain-performance}

**记忆存储（写入）本身更慢**，因为涉及 LLM 事实提取、实体识别、时间推理、关系映射和嵌入生成。**LLM 是写入延迟的主要瓶颈。**

### Hindsight 无需顶级智能模型 {#hindsight-doesnt-need-a-smart-model}

事实提取过程结构化且定义明确，因此更小、更快的模型也能很好地工作。推荐模型为 `gpt-oss-20b`（可通过 Groq 等提供方使用）。

要最大化记忆存储吞吐量：

1. **使用高吞吐量 LLM 提供方**：选择每分钟请求数（RPM）上限高、延迟低的提供方
   - **快**：使用 `gpt-oss-20b` 或其他 openai-oss 模型的 [Groq](https://groq.com)，以及 GPU 集群上自托管模型（vLLM、TGI）
   - **慢**：存在限流的普通云 LLM 提供方

2. **批量操作**：将相关内容组合为批量请求。单次请求可发送任意数量的数据，唯一限制是 HTTP 载荷大小。

3. **大型数据集使用异步模式**：在后台将操作入队

4. **并行处理**：超大数据集可使用不同 `document_id` 的多个并发存储请求

### 自动批量优化 {#automatic-batch-optimization}

**使用异步记忆存储时，Hindsight 自动处理批次大小。** 无需手动调节批量大小或考虑最佳分块方式。

工作方式：
- **发送大批次**：单次异步记忆存储请求提交数百或数千条内容
- **自动拆分**：Hindsight 将大批次（>10,000 tokens）自动拆成优化后的子批次
- **并行处理**：子批次在后台并发处理
- **状态跟踪**：父操作汇总所有子批次状态
- **基于 token**：批量划分统计真实 token，而非字符

收益：
- 一次 API 调用发送完整文档或数据集
- 由 Hindsight 优化处理策略
- 通过父操作状态跟踪整体进度
- 无需手动将数据拆成小批次

### 吞吐量 {#throughput}

影响吞吐量的因素：
- 文档大小和复杂度
- LLM 提供方限流（用于事实提取）
- 数据库写入性能
- 可用 CPU/内存资源

---

## 本地及小规模环境调优 {#tuning-for-local--small-environments}

Hindsight 默认设置针对云 LLM 提供方和多核服务器优化。在笔记本、单 GPU 机器或并发槽位较少且固定的**本地 LLM 服务器**（llama.cpp、vLLM、LM Studio、Ollama）上运行时，默认值可能导致后端饱和、超时或 CPU 过度争用。本节汇总资源受限环境的重要设置。

### LLM 并发 {#llm-concurrency}

默认 `HINDSIGHT_API_LLM_MAX_CONCURRENT=32` 假定云提供方能承受数十个并行请求。只有少量槽位的本地服务器无法做到，Hindsight 会占满所有槽位，使**共享该端点的其他客户端得不到资源**（主智能体、其他应用或另一项 Hindsight 操作）。

```bash
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2
```

值为 `2` 时，记忆存储和整合可并行运行而不互相阻塞。如果端点与其他客户端**共享**（其他应用、智能体或工作流调用同一 llama-server / vLLM / LM Studio 实例），请进一步降低，为每个共享客户端至少预留一个空槽位。

也可按操作分配预算，避免后台工作挤占实时读取。逐操作上限在全局上限*基础上*共同生效：

```bash
# 全局为 4，降低记忆存储/整合上限，确保反思始终有余量
export HINDSIGHT_API_LLM_MAX_CONCURRENT=4
export HINDSIGHT_API_RETAIN_LLM_MAX_CONCURRENT=1
export HINDSIGHT_API_CONSOLIDATION_LLM_MAX_CONCURRENT=1
```

### 超时与重试 {#timeouts-and-retries}

普通硬件上的小模型生成 token 较慢，启动后首个请求还承担模型加载成本。CPU 上运行大型本地模型时，默认 `HINDSIGHT_API_LLM_TIMEOUT=120`（秒）可能太短；提高它可避免不必要的超时和无效重试：

```bash
export HINDSIGHT_API_LLM_TIMEOUT=300        # 允许较慢的本地生成
export HINDSIGHT_API_LLM_MAX_RETRIES=2      # 本地尽快失败，重试通常无法改善慢机器
```

本地端点没有限流，积极重试/退避往往只会增加真正故障时的延迟。减少重试，让实际错误快速暴露。

### 更小更快的模型与推理强度 {#smaller-faster-models--and-reasoning-effort}

记忆存储（事实提取）是结构化工作，无需前沿模型；反思还可使用更轻量模型。资源受限机器上，为每种操作选择能胜任的最小模型：

```bash
# 反思使用小而快的模型，记忆存储使用结构化输出稍强的模型
export HINDSIGHT_API_REFLECT_LLM_MODEL=<small-fast-model>
export HINDSIGHT_API_RETAIN_LLM_MODEL=<structured-output-model>
```

模型提供推理/思考预算时，请设为较低值：额外推理 token 对提取和整合路径只会增加延迟。只有显式设置时才会发送该参数，未配置部署使用模型默认强度（后端支持时，`none` 完全关闭思考）：

```bash
export HINDSIGHT_API_LLM_REASONING_EFFORT=low
```

整合单次向 LLM 发送多个事实（默认 8）。上下文窗口有限的小模型处理大批次时，提示词过长，响应也长且易错。缩小批次，让每次整合调用保持精简可靠：

```bash
export HINDSIGHT_API_CONSOLIDATION_LLM_BATCH_SIZE=2   # 默认 8；降低值意味着提示词更小、调用更多
```

### 内置 llama.cpp 调优 {#built-in-llamacpp-tuning}

随附 `llamacpp` 提供方以受管理子进程运行 llama.cpp 服务器，无需外部服务器。小型机器的重要设置：

```bash
export HINDSIGHT_API_LLM_PROVIDER=llamacpp
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2        # 记忆存储与整合并行，不互相阻塞
export HINDSIGHT_API_LLAMACPP_GPU_LAYERS=-1      # -1 = 所有层卸载到 GPU；0 = 仅 CPU
export HINDSIGHT_API_LLAMACPP_CONTEXT_SIZE=8192  # 降低以节省 RAM/显存，大批次时提高
export HINDSIGHT_API_LLAMACPP_EXTRA_ARGS="--n_threads 8"  # 仅 CPU 机器上匹配物理核心数
# export HINDSIGHT_API_LLAMACPP_NO_GRAMMAR=true  # 更快，但 JSON 输出可靠性较低
```

完整选项列表参见[内置 llama.cpp](./configuration#built-in-llamacpp)。

### CPU 上的重排序器 {#reranker-on-cpu}

没有 GPU 的机器上，召回瓶颈是交叉编码器重排序器。本地重排序器有若干 CPU/Apple Silicon 设置，可保持质量不变并显著加速：

```bash
# Apple Silicon（MPS）：半精度快 27–36%，质量相同
export HINDSIGHT_API_RERANKER_LOCAL_FP16=true

# 分批前按长度排序配对，快 36–54%，设计上保证质量相同
export HINDSIGHT_API_RERANKER_LOCAL_BUCKET_BATCHING=true

# 限制重排序并行度，避免高负载下小型 CPU 过度争用（默认 4）
export HINDSIGHT_API_RERANKER_LOCAL_MAX_CONCURRENT=2

# macOS 上若 MPS/XPC 不稳定，可强制使用 CPU
# export HINDSIGHT_API_RERANKER_LOCAL_FORCE_CPU=true
```

CPU 上最大的单项收益是减少重排序候选数。默认每次召回最多重排 300 个候选，缩小候选池可按比例减少交叉编码器工作：

```bash
export HINDSIGHT_API_RERANKER_MAX_CANDIDATES=100   # 默认 300；RRF 提前过滤其他候选
```

纯 CPU 机器难以承担交叉编码器时，可使用基于 ONNX 的更轻量重排序器 `flashrank`：

```bash
export HINDSIGHT_API_RERANKER_PROVIDER=flashrank
```

也可直接减少召回工作：日常查询使用较低 `budget`（`low`/`mid`），全面推理才使用 `high`。参见下方[记忆召回性能](#recall-performance)。

---

## 记忆召回性能 {#recall-performance}

### 预算 {#budget}

`budget` 参数控制搜索深度和质量。根据查询复杂度选择，需要深入分析的综合问题适合更高预算：

| 预算 | 使用场景 |
|--------|----------|
| `low` | 快速查找、实时聊天 |
| `mid` | 标准查询、均衡性能 |
| `high` | 综合问题、深入分析 |

### 优化 {#optimization}

1. **合适预算**：简单查询使用较低预算，全面推理使用较高预算
2. **限制结果 token 数**：设置 `max_tokens` 控制响应大小（默认 4096）
3. **包含文本块**：需要额外上下文时，使用 `include_chunks` 检索生成记忆的原始文本

### 数据库性能 {#database-performance}

Hindsight 使用 PostgreSQL 和 pgvector 实现高效向量搜索：

- **索引类型**：HNSW，用于近似最近邻搜索
- **典型查询时间**：100K+ 事实上的向量搜索为 10-50ms
- **可扩展性**：已测试每库数百万事实

## 反思性能 {#reflect-performance}

### 性能 {#performance} Characteristics

| 组件 | 延迟            | 说明 |
|-----------|----------------|-------------|
| 记忆搜索 | 100-600ms      | 取决于预算（low/mid/high） |
| LLM 生成 | 500-2000ms     | 取决于提供方和响应长度 |
| **总计** | **600-2600ms** | 典型端到端延迟 |

### 优化 {#optimization} Strategies

1. **预算选择**：上下文充足时使用较低预算
2. **提供上下文**：提供相关 `context`，减少召回需求，并引导生成更聚焦的回答

## 最佳实践 {#best-practices}

### 操作 {#operations}
- **使用合适预算**：简单查询不要过度配置；全面推理使用较高预算
- **批量存储记忆**：将相关内容组合，提高效率
- **缓存常用查询**：在应用层缓存重复查询
- **使用 trace 分析**：通过 `trace` 参数识别慢操作

### 扩展 {#scaling}
- **水平扩展**：在负载均衡器后部署多个 API 实例，共享 PostgreSQL
- **并发**：支持 100+ 同时请求，记忆搜索随 CPU 核心数扩展
- **LLM 限流**：在多个 API 密钥/提供方之间分配负载（通常每个密钥 60-500 RPM）

### 成本优化 {#cost-optimization}
- **使用高效模型**：通过 Groq 使用 `gpt-oss-20b` 存储记忆；Hindsight 无需前沿模型
- **启用提供方 Batch API**：异步存储时设置 `HINDSIGHT_API_RETAIN_BATCH_ENABLED=true`，可降低 50% 的 LLM 事实提取成本（OpenAI 和 Groq 支持，24 小时内返回结果）
- **控制 token 预算**：限制召回 `max_tokens`，尽可能使用较低预算
- **优化分块**：较大块（1000-2000 tokens）比许多小块更高效

### 监控 {#monitoring}
- **Prometheus 指标**：在 `/metrics` 提供，跟踪延迟百分位、吞吐量和错误率
- **关键指标**： `hindsight_recall_duration_seconds`, `hindsight_reflect_duration_seconds`, `hindsight_retain_items_total`
