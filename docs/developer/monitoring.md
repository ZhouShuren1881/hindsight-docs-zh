# 监控 {#monitoring}

Hindsight 通过 Prometheus 指标、OpenTelemetry 分布式追踪和预置 Grafana 仪表板提供全面的可观测性。

## 本地开发 {#local-development}

在本地查看可观测性数据时，可以使用 Grafana LGTM（Loki、Grafana、Tempo、Mimir）一体化堆栈：

```bash
./scripts/dev/start-monitoring.sh
```

此命令会启动一个 Docker 容器，其中提供：
- **Grafana 界面**：[http://localhost:3000](http://localhost:3000)（匿名管理员访问）
- **追踪（Tempo）**：OTLP 端点 [http://localhost:4318](http://localhost:4318)（HTTP）和 [http://localhost:4317](http://localhost:4317)（gRPC）
- **指标（Prometheus/Mimir）**：自动抓取 [http://localhost:8888/metrics](http://localhost:8888/metrics)
- **日志（Loki）**：用于日志聚合
- **预置仪表板**：Hindsight Operations、LLM Metrics、API Service

**在 API 中启用追踪（默认关闭）：**
```bash
export HINDSIGHT_API_OTEL_TRACES_ENABLED=true
export HINDSIGHT_API_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

:::note 生产环境部署
本地监控堆栈仅用于开发。在生产环境中，请单独部署 Grafana LGTM，或使用商业平台（Grafana Cloud、DataDog、New Relic 等）。
:::

## Grafana 仪表板 {#grafana-dashboards}

预置仪表板位于 [`monitoring/grafana/dashboards/`](https://github.com/anthropics/hindsight/tree/main/monitoring/grafana/dashboards)。将这些 JSON 文件导入 Grafana 实例：

| 仪表板 | 说明 |
|-----------|-------------|
| **Hindsight Operations** | 操作速率、延迟百分位数、各记忆库指标 |
| **Hindsight LLM Metrics** | LLM 调用、令牌用量、按范围和供应商划分的延迟 |
| **Hindsight API Service** | HTTP 请求、错误率、数据库连接池、进程指标 |

使用监控堆栈脚本时，系统会自动配置这些仪表板。

## 指标端点 {#metrics-endpoint}

Hindsight 在 `/metrics` 暴露 Prometheus 指标：

```bash
curl http://localhost:8888/metrics
```

## 健康检查端点 {#health-endpoints}

API 服务（端口 8888）和每个工作进程（端口 8889）都会暴露相同的三个端点。它们回答的是两个不同的问题；探针指向错误的端点，可能让一次数据库短暂故障演变成服务中断：

| 端点 | 是否检查数据库？ | 用途 |
|----------|----------------------|---------|
| `/health/live` | 否 | 存活探针 |
| `/health/ready` | 是 | 就绪探针 |
| `/health` | 是 | 就绪检查——`/health/ready` 的别名，为兼容性保留 |

**`/health/live`** 只要进程能够处理请求就返回 200；检查过程不会执行 I/O：

```json
{ "status": "alive", "version": "0.4.0", "uptime_seconds": 812.4 }
```

能够响应本身就是检查内容。Hindsight 在单个事件循环上运行请求处理程序和任务；如果阻塞调用卡住事件循环，服务就无法在探针超时前响应，而这正是重启能够修复的故障。工作进程的响应还会包含 `worker_id`、`is_shutdown` 和 `seconds_since_last_poll`（距离上一次已完成任务认领轮询周期的秒数；首次轮询前为 `null`）。最后这个字段用于告警：它不会改变状态码，因为轮询器被已饱和的数据库拖住时，重启反而会让情况更糟。

**`/health` 和 `/health/ready`** 会从连接池获取连接并执行 `SELECT 1`；数据库可访问时返回 200，不可访问时返回 503。响应会区分两类问题：`db_acquire_ms` 和 `db_pool_waiting` 可用于判断连接池是否耗尽，查询缓慢则指向数据库本身：

```json
{ "status": "healthy", "database": "connected", "db_acquire_ms": 0.4, "db_pool_waiting": 0 }
```

:::warning 存活探针绝不能检查依赖项
存活检查失败意味着“重启此进程”。如果存活探针检查数据库，数据库变慢时所有 Pod 都会同时重启：正在处理的请求会丢失，已认领的异步操作会重新入队，并增加 `retry_count`，逐渐逼近永久失败的临界点；每个重启后的 Pod 还会重新连接，以重新预热连接池，而数据库此时已经不堪重负。正确的做法是让就绪检查失败：这样 Pod 会先退出 Service，待数据库恢复后再加入。

随附的 Helm chart 已按此方式配置（`livenessProbe` → `/health/live`，`readinessProbe` → `/health`）。如果你为较旧版本编写了自己的清单，请将存活检查路径改为 `/health/live`。
:::

## 可用指标 {#available-metrics}

:::note 高基数标签需显式启用
默认情况下，所有指标都不带 `bank_id` 和 `tenant`（租户 schema），因为每个标签都会为每个记忆库或租户增加一组时间序列。只有在记忆库或租户数量较少的部署中，才通过 `HINDSIGHT_API_METRICS_INCLUDE_BANK_ID=true` / `HINDSIGHT_API_METRICS_INCLUDE_TENANT=true` 启用它们。积压量 gauge 始终带有 `tenant`。
:::

### 操作指标 {#operation-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.operation.duration` | Histogram | operation, bank_id, source, budget, max_tokens, success, memories_backend | 操作耗时，单位为秒 |
| `hindsight.operation.total` | Counter | operation, bank_id, source, budget, max_tokens, success, memories_backend | 已执行操作的总数 |

**标签：**
- `operation`：操作类型（`retain`、`recall`、`reflect`，以及 `consolidation` 等异步工作进程任务类型）
- `bank_id`：记忆库标识符
- `source`：操作的触发来源（`api`、`reflect`、`internal`、`worker`）
- `budget`：指定时的预算级别（`low`、`mid`、`high`）
- `max_tokens`：指定时的最大令牌数
- `success`：操作是否成功（`true`、`false`）
- `memories_backend`：当 memories 扩展为记忆库指定了存储后端时，用于标识该后端（`MemoriesExtension.backend_name_for`）。此标签默认不存在，因此现有时间序列不受影响。如果不同记忆库位于不同存储中，部署方可以用它比较各库的延迟，而无需启用 `tenant`。操作内部记录的召回阶段指标也会带上此标签。

`source` 标签可用于区分：
- `api`：客户端直接发起的 API 调用
- `reflect`：反思操作期间发起的内部召回调用
- `internal`：其他内部操作
- `worker`：已认领任务到达最终结果时记录的异步工作进程完成情况

对于 `source="worker"`，`success` 标签表示任务完成吞吐量：`false` 表示任务在重试耗尽后，或因意外错误，从任务处理器抛回轮询器。若失败在执行器内部处理且执行器正常返回，这里仍会记录 `success="true"`；要获取权威的异步操作失败状态，请使用 `hindsight_async_operations{status="failed"}`。

### Retain 指标 {#retain-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.retain.documents.total` | Counter | outcome, bank_id | 按提取结果统计 Retain 处理的文档数 |

**标签：**
- `outcome`：文档经过存入处理后含有记忆单元时为 `facts`，没有记忆单元时为 `no_facts`
- `bank_id`：记忆库标识符

`outcome="no_facts"` 表示文档已存储，但没有生成任何记忆。在重新[处理](/developer/retain#when-a-mission-excludes-everything-in-a-document)之前，`recall` 和 `reflect` 都看不到这些文档；由于 Retain 本身成功，其他指标不会报告它们。该比例上升通常说明[存入任务说明](/developer/retain#steering-extraction-with-a-mission)排除的内容超出了预期：

```promql
sum(rate(hindsight_retain_documents_total{outcome="no_facts"}[15m]))
  / sum(rate(hindsight_retain_documents_total[15m]))
```

### LLM 指标 {#llm-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.llm.duration` | Histogram | provider, model, scope, success | LLM API 调用耗时，单位为秒 |
| `hindsight.llm.calls.total` | Counter | provider, model, scope, success | LLM API 调用总数 |
| `hindsight.llm.tokens.input` | Counter | provider, model, scope, success, token_bucket | LLM 调用的输入令牌数 |
| `hindsight.llm.tokens.output` | Counter | provider, model, scope, success, token_bucket | LLM 调用的输出令牌数 |

**标签：**
- `provider`：LLM 供应商（`openai`、`anthropic`、`gemini`、`groq`、`ollama`、`lmstudio`、`bedrock`、`litellm`）
- `model`：模型名称（例如 `gpt-4`、`claude-3-sonnet`）
- `scope`：LLM 调用用途（`memory`、`reflect`、`consolidation`、`answer`）
- `success`：调用是否成功（`true`、`false`）
- `token_bucket`：用于控制基数的令牌数分桶（`0-100`、`100-500`、`500-1k`、`1k-5k`、`5k-10k`、`10k-50k`、`50k+`）

### 整合指标 {#consolidation-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.consolidation.batch_failures` | Counter | failure_class, error_type | 失败的整合 LLM 批量调用数，包括其事实后来得到恢复的调用 |

**标签：**
- `failure_class`：调用的处理方式（`fail_fast`：模型返回的内容不符合响应 schema，重新发送相同负载也无济于事；`retry`：问题属于传输层，原样重发可能成功；`propagate`：不属于批量调用失败，会重新抛给任务处理程序）
- `error_type`：异常类名称（例如 `ValidationError`、`JSONDecodeError`）

此指标与记忆库统计信息中的 `failed_consolidation` 字段含义不同。该字段统计失败后仍等待整合的*事实*；批量调用失败时，整合过程会将批量大小减半并重试，因此批量大小为 8 时失败、缩小到 1 后成功的调用，会使 `failed_consolidation` 保持为 0。不过，失败响应要求执行的所有操作都会被丢弃，包括它要求删除的观测。因此，即使记忆库看起来完全正常，替代关系清理也可能毫无进展。

请针对 schema 拒绝率设置告警，因为没有其他指标会暴露这一情况：

```promql
sum(rate(hindsight_consolidation_batch_failures_total{failure_class="fail_fast"}[15m]))
```

如果该比率持续非零，通常说明整合模型无法稳定地为响应 schema 生成有效 JSON。常见的解决方法是改用结构化输出能力更强的模型；如果供应商支持由语法约束的 schema，也可以启用 `HINDSIGHT_API_LLM_STRICT_SCHEMA_CONSOLIDATION`。

每次运行的整合操作结果也会通过 `llm_batch_failures` 报告相同计数；只要计数非零，整合日志摘要就会打印一条警告。两处统计的都是*尝试次数*：一次批量调用重试三次会计为三次，因此计数不受本次运行的批次数限制。

### HTTP 请求指标 {#http-request-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.http.duration` | Histogram | method, endpoint, status_code, status_class | HTTP 请求耗时，单位为秒 |
| `hindsight.http.requests.total` | Counter | method, endpoint, status_code, status_class | HTTP 请求总数 |
| `hindsight.http.requests.in_progress` | UpDownCounter | method, endpoint | 当前正在处理的 HTTP 请求数 |

**标签：**
- `method`：HTTP 方法（`GET`、`POST`、`PUT`、`DELETE`）
- `endpoint`：请求匹配到的路由模板，其中路径参数保留参数名而不填入实际值（例如 `/v1/default/banks/{bank_id}/documents/{document_id}`、`/v1/default/banks/{bank_id}/operations/{operation_id}`）。无论请求涉及多少记忆库、文档或 ID，每条路由都只对应一个标签值。模板不包含 `base_path` / 根路径前缀。未匹配任何路由的请求（404）标记为 `unmatched`；匹配到没有路径模板的路由时标记为 `unknown_route`。
- `status_code`：HTTP 状态码（`200`、`400`、`500` 等）
- `status_class`：状态码类别（`2xx`、`4xx`、`5xx`）

### 数据库连接池指标 {#database-pool-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.db.pool.size` | Gauge | - | 当前连接池中的连接数 |
| `hindsight.db.pool.idle` | Gauge | - | 连接池中的空闲连接数 |
| `hindsight.db.pool.min` | Gauge | - | 连接池最小大小 |
| `hindsight.db.pool.max` | Gauge | - | 连接池最大大小 |

### 进程指标 {#process-metrics}

| 指标 | 类型 | 标签 | 说明 |
|--------|------|--------|-------------|
| `hindsight.process.cpu.seconds` | Gauge | type | 进程 CPU 时间，单位为秒 |
| `hindsight.process.memory.bytes` | Gauge | type | 进程内存用量，单位为字节 |
| `hindsight.process.open_fds` | Gauge | - | 打开的文件描述符数 |
| `hindsight.process.threads` | Gauge | - | 活动线程数 |

**标签：**
- `type`（CPU）：`user` 或 `system`
- `type`（内存）：`rss_max`（最大常驻集大小）

### 直方图分桶 {#histogram-buckets}

为提高百分位数的准确性，系统配置了自定义分桶边界：

**操作耗时分桶（秒）：**
```
0.1, 0.25, 0.5, 0.75, 1.0, 2.0, 3.0, 5.0, 7.5, 10.0, 15.0, 20.0, 30.0, 60.0, 120.0
```

**LLM 耗时分桶（秒）：**
```
0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0
```

**HTTP 耗时分桶（秒）：**
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

## 示例查询 {#example-queries}

### 按类型统计的平均操作延迟 {#average-operation-latency-by-type}
```promql
rate(hindsight_operation_duration_sum[5m]) / rate(hindsight_operation_duration_count[5m])
```

### 按供应商统计的每分钟 LLM 调用数 {#llm-calls-per-minute-by-provider}
```promql
rate(hindsight_llm_calls_total[1m]) * 60
```

### LLM 延迟 P95 {#p95-llm-latency}
```promql
histogram_quantile(0.95, rate(hindsight_llm_duration_bucket[5m]))
```

### 按模型统计的令牌消耗总量 {#total-tokens-consumed-by-model}
```promql
sum by (model) (hindsight_llm_tokens_input_total + hindsight_llm_tokens_output_total)
```

### 内部与 API 召回操作对比 {#internal-vs-api-recall-operations}
```promql
sum by (source) (rate(hindsight_operation_total{operation="recall"}[5m]))
```

### 按端点统计的每秒 HTTP 请求数 {#http-requests-per-second-by-endpoint}
```promql
sum by (endpoint) (rate(hindsight_http_requests_total[1m]))
```

### HTTP 错误率（5xx） {#http-error-rate-5xx}
```promql
sum(rate(hindsight_http_requests_total{status_class="5xx"}[5m])) / sum(rate(hindsight_http_requests_total[5m]))
```

### HTTP 延迟 P95 {#p95-http-latency}
```promql
histogram_quantile(0.95, sum by (le) (rate(hindsight_http_duration_seconds_bucket[5m])))
```

### 数据库连接池利用率 {#database-pool-utilization}
```promql
hindsight_db_pool_size / hindsight_db_pool_max
```

### 活动数据库连接数 {#active-database-connections}
```promql
hindsight_db_pool_size - hindsight_db_pool_idle
```

### CPU 使用率 {#cpu-usage-rate}
```promql
rate(hindsight_process_cpu_seconds{type="user"}[1m])
```

---

## 分布式追踪 {#distributed-tracing}

Hindsight 支持对记忆操作和 LLM 调用进行 OpenTelemetry 分布式追踪，并遵循 GenAI 语义约定 v1.37+。

### 配置 {#configuration}

环境变量请参阅[配置 - OpenTelemetry 追踪](./configuration#opentelemetry-tracing)。

**快速开始：**
```bash
# 启用追踪（默认关闭）
export HINDSIGHT_API_OTEL_TRACES_ENABLED=true
export HINDSIGHT_API_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# 在本地开发环境中使用 Grafana LGTM 查看追踪
./scripts/dev/start-monitoring.sh
# 打开 http://localhost:3000 → Explore → Tempo
```

支持任何兼容 OTLP 的后端（Grafana LGTM、Langfuse、OpenLIT、DataDog、New Relic、Honeycomb、[Pydantic Logfire](https://logfire.pydantic.dev) 等）。

### Span 层级 {#span-hierarchy}

**父 Span（操作）：**
- `hindsight.retain` - 记忆摄取
- `hindsight.recall` - 记忆检索
  - `hindsight.recall_embedding` - 查询嵌入
  - `hindsight.recall_retrieval` - 并行搜索（语义、BM25、图、时间）
  - `hindsight.recall_fusion` - 倒数排名融合（Reciprocal Rank Fusion）
  - `hindsight.recall_rerank` - 交叉编码器重排序
- `hindsight.reflect` - 智能体推理
  - `hindsight.reflect_tool_call` - 工具执行（召回、查找等）
- `hindsight.consolidation` - 观测综合生成
- `hindsight.mental_model_refresh` - 心智模型更新

**子 Span（LLM 调用）：**
- 按范围命名（例如 `hindsight.memory`、`hindsight.reflect`）
- 以事件形式包含完整的提示词和补全内容
- 属性遵循 GenAI 语义约定

### Span 属性 {#span-attributes}

**操作 Span：**
- `hindsight.operation` - 操作类型
- `hindsight.bank_id` - 记忆库 ID
- `hindsight.query` - 查询文本（截断至 100 个字符）
- `hindsight.fact_types` - 召回使用的事实类型
- `hindsight.thinking_budget` - 推理预算分配
- `hindsight.max_tokens` - 令牌上限

**LLM Span（GenAI 语义约定）：**
- `gen_ai.operation.name` - 始终为 `"chat"`
- `gen_ai.provider.name` - 供应商（`openai`、`anthropic`、`google` 等）
- `gen_ai.request.model` - 模型名称
- `gen_ai.usage.input_tokens` - 输入令牌数
- `gen_ai.usage.output_tokens` - 输出令牌数
- `hindsight.scope` - LLM 调用用途（`memory`、`reflect`、`consolidation` 等）

**事件：**
- `gen_ai.client.inference.operation.details` - 完整的提示词和补全内容

### 追踪上下文传播 {#trace-context-propagation}

Hindsight 会加入现有追踪，而不会另行创建并行追踪。当调用方发送 W3C 追踪上下文（标准的 `traceparent` 标头，大多数 OpenTelemetry HTTP 客户端插桩都会自动添加）时，Hindsight 会延续该追踪：API 请求会作为调用方之下的服务端 Span 出现，由此触发的每项记忆操作和 LLM 调用也会成为其下的嵌套 Span。

没有追踪上下文的请求仍会启动自己的追踪，因此未插桩的调用方不受影响。

健康检查和指标端点不会纳入追踪，以免探针流量淹没实际工作数据。可以将 `OTEL_PYTHON_FASTAPI_EXCLUDED_URLS` 设为以逗号分隔的 URL 模式列表来覆盖此设置。

### 工作进程 {#worker-processes}

独立工作进程会像 API 一样遵循 `HINDSIGHT_API_OTEL_*` 变量，并导出自己的 Span。对于运行专用工作进程的部署，这一点很重要，因为大多数长时间运行且消耗令牌的工作都在那里执行，包括整合、后台存入和心智模型刷新。

为工作进程单独设置 `HINDSIGHT_API_OTEL_SERVICE_NAME`，以便在追踪后端中将它与 API 区分开来。未设置时，工作进程会将自身报告为 `hindsight-worker`。

目前，工作进程的 Span 各自属于独立追踪：后台操作与排入该操作的请求没有关联，因为后台操作是在请求返回很久之后才运行。
