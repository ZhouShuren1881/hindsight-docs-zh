# 监控 {#monitoring}

Hindsight 通过 Prometheus 指标、OpenTelemetry 分布式追踪和预制 Grafana 仪表盘提供全面可观测性。

## 本地开发 {#local-development}

本地可观测性使用 Grafana LGTM（Loki、Grafana、Tempo、Mimir）一体化技术栈：

```bash
./scripts/dev/start-monitoring.sh
```

这会启动一个 Docker 容器，提供：
- **Grafana 界面**：`http://localhost:3000`（匿名管理员访问）
- **追踪（Tempo）**：OTLP 端点位于 `http://localhost:4318`（HTTP）和 `http://localhost:4317`（gRPC）
- **指标（Prometheus/Mimir）**：自动抓取 http://localhost:8888/metrics
- **日志（Loki）**：可用于日志聚合
- **预制仪表盘**：Hindsight Operations（操作）、LLM Metrics（LLM 指标）、API Service（API 服务）

**在 API 中启用追踪：**
```bash
export HINDSIGHT_API_OTEL_TRACES_ENABLED=true
export HINDSIGHT_API_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

:::note 生产部署
本地监控栈仅供开发使用。生产环境请单独部署 Grafana LGTM，或使用商业平台（Grafana Cloud、DataDog、New Relic 等）。
:::

## Grafana 仪表盘 {#grafana-dashboards}

预制仪表盘位于 [`monitoring/grafana/dashboards/`](https://github.com/anthropics/hindsight/tree/main/monitoring/grafana/dashboards)。请将这些 JSON 文件导入 Grafana 实例：

| 仪表盘 | 说明 |
|-----------|-------------|
| **Hindsight Operations** | 操作频率、延迟百分位、逐记忆库指标 |
| **Hindsight LLM Metrics** | LLM 调用、token 用量、按范围/提供方划分的延迟 |
| **Hindsight API Service** | HTTP 请求、错误率、数据库连接池、进程指标 |

使用监控栈脚本时会自动配置这些仪表盘。

## 指标端点 {#metrics-endpoint}

Hindsight 在 `/metrics` 提供 Prometheus 指标：

```bash
curl http://localhost:8888/metrics
```

## 健康检查端点 {#health-endpoints}

API 服务器（端口 8888）和每个工作进程（端口 8889）提供相同的三个端点。它们回答两种不同问题；探针指向错误端点，会把本来可平稳度过的数据库短暂波动变成故障：

| 端点 | 是否检查数据库？ | 用途 |
|----------|----------------------|---------|
| `/health/live` | 否 | 存活探针 |
| `/health/ready` | 是 | 就绪探针 |
| `/health` | 是 | 就绪检查，`/health/ready` 的别名，保留以兼容旧版本 |

**`/health/live`** 在进程能响应请求时返回 200，不执行任何 I/O：

```json
{ "status": "alive", "version": "0.4.0", "uptime_seconds": 812.4 }
```

能否响应本身就是检查。Hindsight 在单一事件循环运行请求处理器和任务，因此被阻塞调用卡住的循环无法在探针超时内响应，这正是重启能修复的故障。工作进程载荷额外包含 `worker_id`、`is_shutdown` 和 `seconds_since_last_poll`（距上次完成领取周期的时间，首次之前为 `null`）。最后一个字段用于告警，从不改变状态码，因为轮询器被饱和数据库阻塞时，重启会让问题更严重。

**`/health` 和 `/health/ready`** 获取连接池连接并运行 `SELECT 1`，数据库可访问时返回 200，否则返回 503。载荷区分两种故障来源：`db_acquire_ms` 和 `db_pool_waiting` 指向连接池耗尽，查询缓慢则指向数据库本身：

```json
{ "status": "healthy", "database": "connected", "db_acquire_ms": 0.4, "db_pool_waiting": 0 }
```

:::warning 存活探针绝不能检查依赖项
存活检查失败意味着“重启此进程”。若存活探针检查数据库，缓慢数据库会使所有 pod 同时重启：进行中的请求丢失，已领取异步操作重新排队，`retry_count` 增长并逼近永久失败阈值；每个重启 pod 又会连接本已吃紧的数据库，重新预热连接池。正确反应是就绪检查失败：将 pod 移出 Service，数据库恢复后再加入。

随附 Helm chart 已按此配置（`livenessProbe` → `/health/live`，`readinessProbe` → `/health`）。如果基于旧版本编写了自己的清单，请更改存活检查路径。
:::

## 可用指标 {#available-metrics}

:::note 高基数标签需要显式启用
默认所有指标均不包含 `bank_id` 和 `tenant`（租户 schema），因为每个标签都会按库或租户增加一组时间序列。仅库或租户较少的部署才使用 `HINDSIGHT_API_METRICS_INCLUDE_BANK_ID=true` / `HINDSIGHT_API_METRICS_INCLUDE_TENANT=true` 启用。积压量 Gauge 始终携带 `tenant`。
:::

### 操作指标 {#operation-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.operation.duration` | Histogram | operation, bank_id, source, budget, max_tokens, success, memories_backend | 操作耗时，单位秒 |
| `hindsight.operation.total` | Counter | operation, bank_id, source, budget, max_tokens, success, memories_backend | 已执行操作总数 |

**标签：**
- `operation`：操作类型（`retain`、`recall`、`reflect`，以及 `consolidation` 等异步工作进程任务类型）
- `bank_id`：记忆库标识符
- `source`：操作触发来源（`api`、`reflect`、`internal`、`worker`）
- `budget`：指定的预算级别（`low`、`mid`、`high`）
- `max_tokens`：指定的最大 token 数
- `success`：操作是否成功（`true`、`false`）
- `memories_backend`：记忆扩展命名后端时，为该库服务的存储（`MemoriesExtension.backend_name_for`）。默认不包含，因此现有序列不变；各库位于不同存储的部署可使用它比较延迟，无需启用 `tenant`。操作内记录的召回阶段指标也携带它。

`source` 标签用于区分：
- `api`：客户端直接 API 调用
- `reflect`：反思操作期间发起的内部召回调用
- `internal`：其他内部操作
- `worker`：已领取任务达到终态时记录的异步工作进程完成事件

`source="worker"` 时，`success` 是完成吞吐量信号：`false` 表示重试耗尽或发生意外错误后，任务将异常抛给轮询器。执行器内部处理并正常返回的失败，在此仍记录 `success="true"`；准确异步操作失败状态请使用 `hindsight_async_operations{status="failed"}`。

### 记忆存储指标 {#retain-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.retain.documents.total` | Counter | outcome, bank_id | 按提取结果划分的记忆存储已处理文档数 |

**标签：**
- `outcome`：存储后文档有记忆单元时为 `facts`，没有时为 `no_facts`
- `bank_id`：记忆库标识符

`outcome="no_facts"` 表示文档已存储但没有产生记忆。这些文档在[重新处理](/developer/retain#when-a-mission-excludes-everything-in-a-document)之前对 `recall` 和 `reflect` 不可见；其他指标不会报告它们，因为存储本身成功。该比例上升通常意味着[记忆存储任务目标](/developer/retain#steering-extraction-with-a-mission)排除了超出预期的内容：

```promql
sum(rate(hindsight_retain_documents_total{outcome="no_facts"}[15m]))
  / sum(rate(hindsight_retain_documents_total[15m]))
```

### LLM 指标 {#llm-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.llm.duration` | Histogram | provider, model, scope, success | LLM API 调用耗时，单位秒 |
| `hindsight.llm.calls.total` | Counter | provider, model, scope, success | LLM API 调用总数 |
| `hindsight.llm.tokens.input` | Counter | provider, model, scope, success, token_bucket | LLM 调用输入 token 数 |
| `hindsight.llm.tokens.output` | Counter | provider, model, scope, success, token_bucket | LLM 调用输出 token 数 |

**标签：**
- `provider`：LLM 提供方 (`openai`, `anthropic`, `gemini`, `groq`, `ollama`, `lmstudio`, `bedrock`, `litellm`)
- `model`：模型名称（例如 `gpt-4`、`claude-3-sonnet`）
- `scope`：LLM 调用用途（`memory`、`reflect`、`consolidation`、`answer`）
- `success`：调用是否成功（`true`、`false`）
- `token_bucket`：用于控制基数的 token 数量桶 (`0-100`, `100-500`, `500-1k`, `1k-5k`, `5k-10k`, `10k-50k`, `50k+`)

### 整合指标 {#consolidation-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.consolidation.batch_failures` | Counter | failure_class, error_type | 失败的整合 LLM 批量调用数，包括事实随后恢复的调用 |

**标签：**
- `failure_class`：调用的处理方式（`fail_fast`：模型返回的内容被响应 schema 拒绝，重发相同载荷无济于事；`retry`：传输问题，原样重发可能成功；`propagate`：不是批量失败，向任务处理器重新抛出）
- `error_type`：异常类名称（例如 `ValidationError`、`JSONDecodeError`）

此信号不同于记忆库统计的 `failed_consolidation` 字段。后者统计失败后仍待整合的*事实*；批量调用失败时，整合会将批次减半并重试，因此批量大小 8 时失败、大小 1 时成功的调用会使 `failed_consolidation` 保持 0。但失败响应请求的所有操作都会丢弃，包括希望删除的观察。因此记忆库可能看似完全健康，旧观察替代清理却没有发生。

应对 schema 拒绝率告警，其他指标不提供该信号：

```promql
sum(rate(hindsight_consolidation_batch_failures_total{failure_class="fail_fast"}[15m]))
```

该比例持续非零，通常意味着整合模型不能可靠输出符合响应 schema 的有效 JSON。常见解决方法是切换到结构化输出更强的模型，或提供方支持语法强制 schema 时启用 `HINDSIGHT_API_LLM_STRICT_SCHEMA_CONSOLIDATION`。

相同计数会按运行在整合操作结果中报告为 `llm_batch_failures`，非零时整合日志摘要打印警告行。两者统计*尝试次数*，一次批量调用重试三次计为三次，因此不以本次运行的批次数为上限。

### HTTP 请求指标 {#http-request-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.http.duration` | Histogram | method, endpoint, status_code, status_class | HTTP 请求耗时，单位秒 |
| `hindsight.http.requests.total` | Counter | method, endpoint, status_code, status_class | HTTP 请求总数 |
| `hindsight.http.requests.in_progress` | UpDownCounter | method, endpoint | 当前正在处理的 HTTP 请求数 |

**标签：**
- `method`：HTTP 方法 (`GET`, `POST`, `PUT`, `DELETE`)
- `endpoint`：请求匹配的路由模板，路径参数使用名称而非实际值（例如 `/v1/default/banks/{bank_id}/documents/{document_id}`、`/v1/default/banks/{bank_id}/operations/{operation_id}`），因此不管请求多少库、文档或 ID，每条路由只有一个标签值。模板不包含 `base_path` / 根路径前缀。未匹配路由的请求（404）标为 `unmatched`；匹配路由但没有路径模板时标为 `unknown_route`。
- `status_code`：HTTP 状态码 (`200`, `400`, `500`, etc.)
- `status_class`：状态码类别 (`2xx`, `4xx`, `5xx`)

### 数据库连接池指标 {#database-pool-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.db.pool.size` | Gauge | - | 连接池当前连接数 |
| `hindsight.db.pool.idle` | Gauge | - | 连接池空闲连接数 |
| `hindsight.db.pool.min` | Gauge | - | 连接池最小大小 |
| `hindsight.db.pool.max` | Gauge | - | 连接池最大大小 |

### 进程指标 {#process-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.process.cpu.seconds` | Gauge | type | 进程 CPU 时间，单位秒 |
| `hindsight.process.memory.bytes` | Gauge | type | 进程内存用量，单位字节 |
| `hindsight.process.open_fds` | Gauge | - | 打开的文件描述符数量 |
| `hindsight.process.threads` | Gauge | - | 活跃线程数 |

**标签：**
- `type`（CPU）：`user` 或 `system`
- `type`（内存）：`rss_max`（最大常驻集大小）

### 直方图桶 {#histogram-buckets}

通过自定义桶边界提高百分位准确度：

**操作耗时桶（秒）：**
```
0.1, 0.25, 0.5, 0.75, 1.0, 2.0, 3.0, 5.0, 7.5, 10.0, 15.0, 20.0, 30.0, 60.0, 120.0
```

**LLM 耗时桶（秒）：**
```
0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0
```

**HTTP 耗时桶（秒）：**
```
0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0
```

## Prometheus 配置 {#prometheus-configuration}

```yaml
scrape_configs:
  - job_name: 'hindsight'
    static_configs:
      - targets: ['localhost:8888']
```

## 查询示例 {#example-queries}

### 按类型统计平均操作延迟 {#average-operation-latency-by-type}
```promql
rate(hindsight_operation_duration_sum[5m]) / rate(hindsight_operation_duration_count[5m])
```

### 按提供方统计每分钟 LLM 调用数 {#llm-calls-per-minute-by-provider}
```promql
rate(hindsight_llm_calls_total[1m]) * 60
```

### P95 LLM 延迟 {#p95-llm-latency}
```promql
histogram_quantile(0.95, rate(hindsight_llm_duration_bucket[5m]))
```

### 按模型统计 token 消耗总量 {#total-tokens-consumed-by-model}
```promql
sum by (model) (hindsight_llm_tokens_input_total + hindsight_llm_tokens_output_total)
```

### 内部与 API 记忆召回操作 {#internal-vs-api-recall-operations}
```promql
sum by (source) (rate(hindsight_operation_total{operation="recall"}[5m]))
```

### 按端点统计每秒 HTTP 请求数 {#http-requests-per-second-by-endpoint}
```promql
sum by (endpoint) (rate(hindsight_http_requests_total[1m]))
```

### HTTP 错误率（5xx） {#http-error-rate-5xx}
```promql
sum(rate(hindsight_http_requests_total{status_class="5xx"}[5m])) / sum(rate(hindsight_http_requests_total[5m]))
```

### P95 HTTP 延迟 {#p95-http-latency}
```promql
histogram_quantile(0.95, sum by (le) (rate(hindsight_http_duration_seconds_bucket[5m])))
```

### 数据库连接池利用率 {#database-pool-utilization}
```promql
hindsight_db_pool_size / hindsight_db_pool_max
```

### 活跃数据库连接 {#active-database-connections}
```promql
hindsight_db_pool_size - hindsight_db_pool_idle
```

### CPU 使用率 {#cpu-usage-rate}
```promql
rate(hindsight_process_cpu_seconds{type="user"}[1m])
```

---

## 分布式追踪 {#distributed-tracing}

Hindsight 支持对记忆操作和 LLM 调用进行 OpenTelemetry 分布式追踪，遵循 GenAI 语义约定 v1.37+。

### 配置 {#configuration}

环境变量参见[配置 — OpenTelemetry 追踪](./configuration#opentelemetry-tracing)。

**快速入门：**
```bash
# 启用追踪
export HINDSIGHT_API_OTEL_TRACES_ENABLED=true
export HINDSIGHT_API_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# 使用 Grafana LGTM 查看追踪（本地开发）
./scripts/dev/start-monitoring.sh
# 打开 http://localhost:3000 → Explore（探索）→ Tempo
```

支持任何兼容 OTLP 的后端（Grafana LGTM、Langfuse、OpenLIT、DataDog、New Relic、Honeycomb、[Pydantic Logfire](https://logfire.pydantic.dev) 等）。

### Span 层级 {#span-hierarchy}

**父 Span（操作）：**
- `hindsight.retain` - 记忆导入
- `hindsight.recall` - 记忆检索
  - `hindsight.recall_embedding` - 查询嵌入
  - `hindsight.recall_retrieval` - 并行搜索（语义、BM25、图、时间）
  - `hindsight.recall_fusion` - 倒数排名融合
  - `hindsight.recall_rerank` - 交叉编码器重排序
- `hindsight.reflect` - 智能体推理
  - `hindsight.reflect_tool_call` - 工具执行（召回、查找等）
- `hindsight.consolidation` - 观察综合
- `hindsight.mental_model_refresh` - 心智模型更新

**子 Span（LLM 调用）：**
- 按范围命名（例如 `hindsight.memory`、`hindsight.reflect`）
- 以事件形式包含完整提示词/生成内容
- 属性遵循 GenAI 语义约定

### Span 属性 {#span-attributes}

**操作 Span：**
- `hindsight.operation` - 操作类型
- `hindsight.bank_id` - 记忆库 ID
- `hindsight.query` - 查询文本（截断为 100 个字符）
- `hindsight.fact_types` - 召回事实类型
- `hindsight.thinking_budget` - 预算分配
- `hindsight.max_tokens` - token 限制

**LLM Span（GenAI 语义约定）：**
- `gen_ai.operation.name` - 始终为 `"chat"`
- `gen_ai.provider.name` - 提供方（`openai`、`anthropic`、`google` 等）
- `gen_ai.request.model` - 模型名称
- `gen_ai.usage.input_tokens` - 输入 token 数
- `gen_ai.usage.output_tokens` - 输出 token 数
- `hindsight.scope` - LLM 调用用途（`memory`、`reflect`、`consolidation` 等）

**事件：**
- `gen_ai.client.inference.operation.details` - 完整提示词和生成内容

### 追踪上下文传播 {#trace-context-propagation}

Hindsight 加入已有追踪，而非另起并行追踪。调用方发送 W3C 追踪上下文时（标准 `traceparent` 头，多数 OpenTelemetry HTTP 客户端插桩自动添加），Hindsight 延续该追踪：API 请求作为调用方下的服务器 Span，其触发的每个记忆操作和 LLM 调用都嵌套在该 Span 下。

未携带追踪上下文的请求仍建立自己的追踪，因此未插桩调用方的行为不变。

健康检查和指标端点不参与追踪，避免探针流量淹没实际工作。可将 `OTEL_PYTHON_FASTAPI_EXCLUDED_URLS` 设置为逗号分隔 URL 模式列表来覆盖。

### 工作进程 {#worker-processes}

独立工作进程遵循与 API 相同的 `HINDSIGHT_API_OTEL_*` 变量，并导出自己的 Span。对使用专用工作进程的部署尤为有用，因为整合、后台记忆存储和心智模型刷新等多数长时间工作及 token 消耗都发生在那里。

为工作进程设置独立 `HINDSIGHT_API_OTEL_SERVICE_NAME`，以便在追踪后端区分 API。未设置时，工作进程报告名称为 `hindsight-worker`。

目前工作进程 Span 属于独立追踪：后台操作不与将其入队的请求关联，因为它在请求返回很久之后才执行。
