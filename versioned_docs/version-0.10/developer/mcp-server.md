---
sidebar_position: 5
---

# MCP 服务器 {#mcp-server}

Hindsight 内置[模型上下文协议（MCP）](https://modelcontextprotocol.io/)服务器，让 AI 助手直接存储和检索记忆。

## 访问 {#access}

MCP 服务器**默认启用**，挂载于 API 服务器 `/mcp`。每个记忆库拥有独立 MCP 端点：

```
http://localhost:8888/mcp/{bank_id}/
```

例如，连接 `alice` 记忆库：
```
http://localhost:8888/mcp/alice/
```

禁用 MCP 服务器可设置环境变量：

```bash
export HINDSIGHT_API_MCP_ENABLED=false
```

## 身份验证 {#authentication}

默认 MCP 端点**开放**，无需认证。

启用认证请配置 API 密钥租户扩展：

```bash
export HINDSIGHT_API_TENANT_EXTENSION=hindsight_api.extensions.builtin.tenant:ApiKeyTenantExtension
export HINDSIGHT_API_TENANT_API_KEY=your-secret-key
```

启用后，请在 `Authorization` 头中包含密钥：

### Claude Code

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp \
  --header "Authorization: Bearer your-secret-key" \
  --header "X-Bank-Id: my-bank"
```

### Claude Desktop

添加到 `~/.claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "hindsight": {
      "url": "http://localhost:8888/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-key",
        "X-Bank-Id": "my-bank"
      }
    }
  }
}
```

### 直接 HTTP 请求 {#direct-http-request}

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Authorization: Bearer your-secret-key" \
  -H "X-Bank-Id: my-bank" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

密钥缺失或无效时收到 `401 Unauthorized`。

## 记忆库选择 {#bank-selection}

按以下优先级解析：

1. **URL 路径**（最高优先级）：`http://localhost:8888/mcp/my-bank/`
2. **X-Bank-Id 请求头**：`--header "X-Bank-Id: my-bank"`
3. **默认**：使用 `HINDSIGHT_MCP_BANK_ID` 环境变量（默认 `"default"`）

## 逐记忆库端点 {#per-bank-endpoints}

传统 MCP 工具需要显式标识符，Hindsight 使用**逐库端点**。`bank_id` 位于 URL 中，连接本身确定库，因此工具无需指定。

此设计：
- **简化工具使用**：无需每次传入 `bank_id`
- **强制隔离**：每个连接限定一个库
- **支持多租户**：不同用户连接不同端点

## 两种模式 {#two-modes}

MCP 根据 URL 使用两种模式：

| 模式 | URL | 工具 | bank_id |
|------|-----|-------|---------|
| **单记忆库** | `/mcp/{bank_id}/` | 27 个工具（记忆、心智模型、指令、文档、操作、标签、库管理） | URL 隐式确定 |
| **多记忆库** | `/mcp/` | 全部 30 个工具，包括 `list_banks`、`create_bank`、`get_bank_stats` | 每个工具显式参数 |

**单记忆库模式**（推荐）限定操作到 URL 中的库，工具不公开 `bank_id` 参数。

**多记忆库模式**提供全部工具、可选 `bank_id`，以及库管理工具（`list_banks`、`create_bank`、`get_bank_stats`）。

## 工具元数据与指令 {#tool-metadata-and-instructions}

可向 `retain` 和 `recall` 说明追加部署特定指导。希望客户端看到本地规则（如标签选择或哪些记忆应存储）时，在服务器设置 `HINDSIGHT_API_MCP_INSTRUCTIONS`。

```bash
export HINDSIGHT_API_MCP_INSTRUCTIONS="项目专属记忆使用 project:<name> 标签。"
```

读取工具注解的客户端也收到内置安全提示：

- 只读 `recall`、`reflect`、`list_*`、`get_*` 标记 `readOnlyHint: true`。
- 删除、清除和失效标记 `destructiveHint: true`。
- `openWorldHint` 为 `false`，操作配置的记忆存储，而非开放互联网。
- `retain`、`create_*`、`update_*`、`refresh_mental_model`、`cancel_operation` 等写入不标记为破坏性。

---

## 可用工具 {#available-tools}

### retain

将信息存储到长期记忆。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `content` | string | 是 | 要存储的事实或记忆 |
| `context` | string | 否 | 记忆分类（默认 `general`） |
| `timestamp` | string | 否 | 事件发生时间的 ISO 8601 时间戳 |
| `tags` | list[string] | 否 | 组织和过滤记忆的标签 |
| `metadata` | object | 否 | 附加的键值元数据（例如 `{"source": "slack"}`） |
| `document_id` | string | 否 | 将记忆关联到现有文档 |

**示例：**
```json
{
  "name": "retain",
  "arguments": {
    "content": "用户在后端开发中偏好 Python 而非 JavaScript",
    "context": "programming_preferences",
    "tags": ["user:alice", "preferences"]
  }
}
```

**适用场景：**
- 用户分享个人事实、偏好或兴趣
- 提及重要事件或里程碑
- 陈述决策、意见或目标
- 讨论工作上下文或项目详情

---

### sync_retain

将信息存入长期记忆并等待完成。与异步 [`retain`](#retain) 不同，`sync_retain` 阻塞直到完全存储并立即可召回，适合写入后马上查询。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `content` | string | 是 | 要存储的事实或记忆 |
| `context` | string | 否 | 记忆分类（默认 `general`） |
| `timestamp` | string | 否 | 事件发生时间的 ISO 8601 时间戳 |
| `tags` | list[string] | 否 | 组织和过滤记忆的标签 |
| `metadata` | object | 否 | 附加的键值元数据（例如 `{"source": "slack"}`） |
| `document_id` | string | 否 | 将记忆关联到现有文档 |

**示例：**
```json
{
  "name": "sync_retain",
  "arguments": {
    "content": "用户在后端开发中偏好 Python 而非 JavaScript",
    "context": "programming_preferences",
    "tags": ["user:alice", "preferences"]
  }
}
```

**适用场景：**
- 需要写入后立即可查询
- 工作流必须等待记忆可用才能继续
- 其他场景优先异步 `retain`，避免阻塞等待存储

---

### recall

搜索记忆，提供个性化回答。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 自然语言搜索查询 |
| `max_tokens` | integer | 否 | 事实文本 token 预算（默认 4096）。结果元数据（ID、标签、分数、日期）不计入，因此响应大数倍 |
| `budget` | string | 否 | 搜索深度：`low`、`mid`、`high`（默认 `high`） |
| `types` | list[string] | 否 | 按类型过滤：`world`、`experience`、`observation`，默认全部 |
| `tags` | list[string] | 否 | 按标签过滤记忆，省略则不过滤 |
| `tags_match` | string | 否 | `any`（默认）、`all`、`any_strict`、`all_strict`、`exact`。`exact` 配合 `tags: []` 选择无标签/全局范围 |
| `tag_groups` | list[object] | 否 | 复合布尔标签过滤，与 `tags` 互斥，各叶节点独立 `match` |
| `query_timestamp` | string | 否 | ISO 8601 时间戳，模拟在该时刻查询，作为相对时间表达及近期评分基准 |
| `min_scores` | object | 否 | 可选逐阶段分数下限，例如 `{"reranker": 0.5}`。`semantic`/`keyword` 为检索阶段，`reranker`/`final` 为排序后。包含边界且 AND 组合，省略不筛选。重排分数未跨查询校准，使用前需校准 |
| `temporal_window` | object | 否 | 显式搜索时间段 `{"start": ISO, "end": ISO}`，替代查询文本日期。窗口内记忆排名更高，但不丢弃窗口外项，无法将结果完全限定到该时段 |

**示例：**
```json
{
  "name": "recall",
  "arguments": {
    "query": "用户偏好哪些编程语言？",
    "tags": ["preferences"],
    "budget": "high"
  }
}
```

**适用场景：**
- 对话开始时召回相关上下文
- 提供建议之前
- 用户询问可能曾提及的内容时
- 保持跨对话连续性

---

### reflect

结合已存储记忆和记忆库性格，综合生成经过思考的分析。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 要反思的问题或主题 |
| `context` | string | 否 | 说明为何需要反思的可选上下文 |
| `budget` | string | 否 | 搜索预算：`low`、`mid`、`high`（默认 `low`） |
| `max_tokens` | integer | 否 | 回答最大 token 数（默认 4096） |
| `response_schema` | object | 否 | 结构化输出 JSON Schema，提供时响应含 `structured_output` |
| `tags` | list[string] | 否 | 限定记忆、观察、心智模型和带标签指令范围。省略标签时记忆不过滤，仅加载无标签指令 |
| `tags_match` | string | 否 | `any`（默认）、`all`、`any_strict`、`all_strict`、`exact`。无标签指令在各模式均为全局 |
| `include_trace` | boolean | 否 | 包含 `tool_trace` 和 `llm_trace` 调试输出，默认 `false` 以缩小响应 |

MCP 仅 `tags` 存在时转发 `tags_match`。传 `tags: []` 和 `tags_match: "exact"`，为事实、观察、心智模型选择空/全局范围；也仅加载无标签指令。

**示例：**
```json
{
  "name": "reflect",
  "arguments": {
    "query": "根据以往决策，我偏好哪种架构风格？",
    "budget": "mid",
    "tags": ["architecture"]
  }
}
```

**适用场景：**
- 需要推理分析，而非仅检索事实
- 回答“我该做什么？”，而非“我说过什么？”
- 综合多条记忆中的模式

---

### create_mental_model

创建心智模型，即随记忆保持最新的动态文档。它是预计算反思，新记忆存储后自动刷新。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 心智模型易读名称 |
| `source_query` | string | 是 | 生成和刷新模型的查询 |
| `mental_model_id` | string | 否 | 自定义 ID（小写字母数字及连字符），未提供自动生成 |
| `tags` | list[string] | 否 | 组织和过滤模型的标签 |
| `tags_match` | string | 否 | 刷新时标签匹配方式：`any`、`all`、`any_strict`、`all_strict`、`exact`，默认见下文 |
| `trigger` | object | 否 | 刷新策略，见[触发设置](#trigger-settings) |
| `max_tokens` | integer | 否 | 模型内容最大 token 数（默认 2048） |
| `trigger_refresh_after_consolidation` | boolean | 否 | `trigger.refresh_after_consolidation` 的旧版简写 |

刷新设置优先使用 `trigger`，`tags_match` 和 `trigger_refresh_after_consolidation` 仍兼容现有集成的简写。同时用两种方式设置同字段会报错，而非静默选择一个。

:::warning 带标签模型默认 `all_strict`
模型有 `tags` 但未显式设置 `tags_match` 时，刷新采用 **`all_strict`**，记忆必须包含模型的**每个**标签。记忆采用狭窄单主题（`["project:status"]`），模型标签宽泛（`["projects", "mental-model"]`）时，全部被过滤，内容为空。

传入 `tags_match: "any"`（与召回/反思默认相同），匹配具有模型*任意*标签的记忆：

```json
{
  "name": "create_mental_model",
  "arguments": {
    "name": "当前项目",
    "source_query": "用户目前在做哪些项目？",
    "tags": ["projects", "mental-model"],
    "tags_match": "any"
  }
}
```
:::

**示例：**
```json
{
  "name": "create_mental_model",
  "arguments": {
    "name": "团队名录",
    "source_query": "团队有哪些人，各负责什么？",
    "tags": ["team", "people"],
    "tags_match": "any"
  }
}
```

内容生成异步执行，响应含跟踪进度的 `operation_id`。

---

### list_mental_models

列出库中全部心智模型，可按标签过滤。

仅返回元数据：`id`、`name`、`tags`、`is_stale`、时间戳。读取综合内容时，用列表中 ID 调用 `get_mental_model`。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `tags` | list[string] | 否 | 按标签过滤模型 |

---

### get_mental_model

按 ID 获取心智模型，含完整内容。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要读取的心智模型 ID |

---

### update_mental_model

更新心智模型元数据或设置。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要更新的心智模型 ID |
| `name` | string | 否 | 新名称 |
| `source_query` | string | 否 | 新来源查询 |
| `tags` | list[string] | 否 | 新标签 |
| `max_tokens` | integer | 否 | 新的最大 token 数 |
| `trigger` | object | 否 | 要更改的刷新策略字段，见[触发设置](#trigger-settings)。补丁更新，省略字段保留当前值 |
| `tags_match` | string | 否 | `trigger.tags_match` 的旧版简写 |
| `trigger_refresh_after_consolidation` | boolean | 否 | 整合后自动刷新，仅要更改时设置 |

---

### 触发设置 {#trigger-settings}

`trigger` 携带模型或知识页面的刷新策略：**何时**重建、**基于什么**重建。接受 HTTP API 全部字段，因此 `PATCH /mental_models/{id}` 能配置的内容，也可通过 MCP 从智能体配置。

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `mode` | string | `full` 每次从头生成；`delta` 精确编辑，未改部分逐字节保留。无已有内容或来源查询变更时回退完整重建 |
| `refresh_after_consolidation` | boolean | 每次记忆整合后重建 |
| `refresh_cron` | string | UTC 五字段 cron，例如 `0 3 * * *` 每天 UTC 03:00。仅模型过时时执行，范围未变化不调用 LLM |
| `min_refresh_interval_seconds` | integer | 两次*自动*刷新间隔下限。提前触发合并为一次排队刷新，突发存储只重建一次。显式刷新忽略 |
| `fact_types` | list[string] | 刷新检索的类型：`world`、`experience`、`observation`，省略全部 |
| `exclude_mental_models` | boolean | 刷新排除**所有**心智模型，避免模型对同级模型反思 |
| `exclude_mental_model_ids` | list[string] | 按 ID 排除指定心智模型 |
| `tags_match` | string | 标签选择记忆方式：`any`、`all`、`any_strict`、`all_strict`、`exact` |
| `tag_groups` | list[object] | 复合布尔标签表达式，*替代*模型平面标签 |
| `include_chunks` | boolean | 刷新内部召回是否返回原始块文本 |
| `recall_max_tokens` | integer | 刷新内部召回事实 token 预算 |
| `recall_chunks_max_tokens` | integer | 刷新内部召回原始块 token 预算 |
| `budget` | string | 刷新智能体步骤数，以服务器反思迭代上限为基准：`low` 减半，`mid` 保持，`high` 翻倍。省略 `mid` |
| `response_schema` | object | 结构化输出 JSON Schema，随 Markdown 存于 `reflect_response.structured_output` |
| `keep_trace` | boolean | 将刷新过程记录于 `reflect_response.trace`，是事后诊断 cron/整合驱动刷新的唯一方式 |

`refresh_after_consolidation` 与 `refresh_cron` **互斥**，整合后或按计划刷新，不能同时。设置一项清除另一项。

**创建时**，省略字段采用引擎默认（`mode: full`、无计划、全部类型）；知识页面采用页面默认（`mode: delta`、仅观察、自动刷新、排除同级）。

**更新时 `trigger` 是补丁**，仅改变发送字段。因此设置 cron 保留 `fact_types` 和 `mode`。显式 `null` 清除可空设置。需先查看时，用 `get_mental_model`（detail 为 `content` 或 `full`）读取当前策略。

```json
{
  "name": "update_mental_model",
  "arguments": {
    "mental_model_id": "team-conventions",
    "trigger": { "refresh_cron": "0 3 * * *", "fact_types": ["observation"] }
  }
}
```

---

### delete_mental_model

永久删除心智模型。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要删除的心智模型 ID |

---

### refresh_mental_model

从最新记忆重新生成心智模型，异步运行。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要刷新的心智模型 ID |

---

### clear_mental_model

清除心智模型内容，保留定义。之后调用 `refresh_mental_model` 从最新记忆重建。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要清除的心智模型 ID |

---

### list_banks（仅多记忆库模式） {#list_banks-multi-bank-mode-only}

列出可用记忆库，最近写入优先。分页响应也返回匹配总数，大型部署可通过 `offset` 遍历。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 否 | 不区分大小写的子串，匹配库 ID 和名称 |
| `limit` | integer | 否 | 最多返回记忆库数（默认 100） |
| `offset` | integer | 否 | 跳过记忆库数（默认 0） |

---

### create_bank（仅多记忆库模式） {#create_bank-multi-bank-mode-only}

创建新记忆库或获取现有库。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `bank_id` | string | 是 | 新记忆库 ID |
| `name` | string | 否 | 记忆库易读名称 |
| `mission` | string | 否 | 描述智能体身份及目标的任务说明 |

---

### list_directives

列出库中指令。此管理工具不使用反思的指令隔离行为，省略 `tags` 列出全部，包括有标签指令。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `tags` | list[string] | 否 | 使用 `any` 匹配。提供时返回无标签/全局指令，以及至少共享一个标签的指令。省略或为空时返回全部 |
| `active_only` | boolean | 否 | 仅返回有效指令（默认 `true`） |

---

### create_directive

在库中创建新指令。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 指令易读名称 |
| `content` | string | 是 | 指令内容 |
| `priority` | integer | 否 | 优先级，越高越重要 |
| `is_active` | boolean | 否 | 指令是否有效（默认 `true`） |
| `tags` | list[string] | 否 | 指令执行范围。空/省略（默认）表示全局，非空要求反思使用匹配标签范围 |

---

### delete_directive

按 ID 删除指令。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `directive_id` | string | 是 | 要删除的指令 ID |

---

### list_memories

浏览已存储记忆，支持过滤和分页。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `type` | string | 否 | 按事实类型过滤：`world`、`experience`、`observation` |
| `q` | string | 否 | 过滤记忆的搜索查询 |
| `limit` | integer | 否 | 最多结果数（默认 100） |
| `offset` | integer | 否 | 分页跳过结果数（默认 0） |

---

### get_memory

按 ID 获取指定记忆。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `memory_id` | string | 是 | 要读取的记忆 ID |

---

### list_documents

列出已导入记忆库的文档。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `q` | string | 否 | 过滤文档的搜索查询 |
| `limit` | integer | 否 | 最多结果数（默认 100） |
| `offset` | integer | 否 | 分页跳过结果数（默认 0） |

---

### get_document

按 ID 获取文档，包括元数据。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `document_id` | string | 是 | 要读取的文档 ID |

---

### delete_document

删除文档及全部关联记忆。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `document_id` | string | 是 | 要删除的文档 ID |

---

### list_operations

列出异步操作（存储处理、心智模型刷新等），支持按状态和类型过滤。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `status` | string | 否 | 按状态过滤：`pending`、`running`、`completed`、`failed`、`cancelled` |
| `type` | string | 否 | 按类型过滤：`retain`、`consolidation`、`refresh_mental_model`、`file_convert_retain`、`webhook_delivery` |
| `limit` | integer | 否 | 最多结果数，1–100（默认 20） |
| `offset` | integer | 否 | 分页跳过结果数（默认 0） |
| `exclude_parents` | boolean | 否 | 排除父批量操作（默认 false） |

---

### get_operation

获取异步操作状态和详情。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `operation_id` | string | 是 | 要查看的操作 ID |

---

### cancel_operation

取消待处理或运行中的异步操作。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `operation_id` | string | 是 | 要取消的操作 ID |

---

### list_tags

列出库中唯一标签，可按模式过滤。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `q` | string | 否 | 过滤标签的 Glob 模式，例如 `project:*` |
| `limit` | integer | 否 | 最多结果数（默认 100） |
| `offset` | integer | 否 | 分页跳过结果数（默认 0） |

---

### get_bank

获取记忆库信息，包括名称、任务目标及性格倾向。

---

### get_bank_stats（仅多记忆库模式） {#get_bank_stats-multi-bank-mode-only}

获取记忆库统计（节点/链接数量）。

---

### update_bank

更新记忆库名称及任意库级配置字段，只更新提供的字段，省略项保持不变。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 否 | 记忆库易读显示名称 |
| `mission` | string | 否 | **已弃用**，`config_updates.reflect_mission` 的别名 |
| `config_updates` | object | 否 | 要更新的配置字段字典，支持全部库级可配置字段（见下文），拒绝不可配置及凭据字段 |

`config_updates` 按 Python 字段名接受任意库级可配置字段，包括：

- `reflect_mission`：反思任务目标/上下文
- `retain_mission`：引导 `retain()` 提取哪些内容
- `retain_extraction_mode`：`concise`（默认）、`verbose`、`custom`、`verbatim`、`chunks`
- `retain_custom_instructions`：自定义提取提示词，仅 `custom` 生效
- `retain_chunk_size`：每块目标最大字符数
- `retain_structured_chunk_size`：单条 JSONL 行或对话轮次保持完整的最大字符数
- `retain_chunk_batch_size`：并行处理块数
- `enable_observations`：切换 `retain()` 后的观察整合
- `observations_mission`：控制观察综合规则
- `disposition_skepticism`：批判性评估程度（1–5）
- `disposition_literalism`：字面与抽象理解程度（1–5）
- `disposition_empathy`：考虑情感上下文程度（1–5）
- `entity_labels`：实体分类受控词汇
- `entities_allow_free_form`：允许 `entity_labels` 之外的标签
- `recall_include_chunks`：召回结果包含原始文本块
- `recall_max_tokens`：召回结果最大 token 数
- `mcp_enabled_tools`：此记忆库的工具允许列表

---

### delete_bank

永久删除记忆库及全部数据（记忆、文档、实体、心智模型）。

---

### clear_memories

清除全部记忆，保留库本身。可按事实类型过滤，只清除特定记忆。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `type` | string | 否 | 要清除的事实类型：`world`、`experience`、`observation`，未指定清除全部 |

---

### get_knowledge_base_tree

以文件夹和页面嵌套树浏览知识库。每页报告 `is_stale`：`false` 表示可证明已最新，`true` 表示上次刷新后库发生写入。

---

### search_knowledge_base

按相关性查找知识页面（对名称和内容执行混合 BM25 + 向量搜索），返回排序页面及各自片段。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 要搜索的内容 |
| `limit` | integer | 否 | 最多返回页面数，1–50（默认 10） |

---

### get_knowledge_page

以 Markdown 文档读取知识页面（YAML frontmatter + 综合正文）。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `page_id` | string | 是 | 要读取的页面 ID（`kp-...` 节点） |

---

### create_knowledge_folder

在知识库创建文件夹。文件夹组织页面，自身不含内容。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 文件夹名称 |
| `parent_id` | string | 否 | 父文件夹 ID（`kf-...` 节点），省略在顶层创建 |

---

### create_knowledge_page

创建动态页面，通过 `source_query` 从库中记忆综合内容。异步生成，使用返回的 `operation_id` 跟踪完成。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 页面名称，在所在文件夹中唯一 |
| `source_query` | string | 是 | 页面回答及据此重建的问题 |
| `parent_id` | string | 否 | 父文件夹 ID（`kf-...` 节点），省略在顶层创建 |
| `tags` | array | 否 | 限定页面使用哪些记忆的标签 |
| `max_tokens` | integer | 否 | 生成内容最大 token 数（默认 4096） |
| `trigger` | object | 否 | 刷新策略，见[触发设置](#trigger-settings)。省略字段保留页面默认：`delta` 在每次整合后基于观察重建，忽略同级页面 |
| `refresh_after_consolidation` | boolean | 否 | `trigger.refresh_after_consolidation` 旧版简写 |

设置 `trigger.refresh_cron` 将页面从整合驱动切换为固定 UTC 计划。两者互斥，因此 cron 清除自动刷新，保留 `mode` 和 `fact_types`。

---

### update_knowledge_node

重命名或移动文件夹/页面，也可更新页面选项。只改传入参数。更改 `source_query` 会调度异步刷新，按新问题重建。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `node_id` | string | 是 | 要更新的文件夹（`kf-...`）或页面（`kp-...`） |
| `name` | string | 否 | 节点新名称 |
| `parent_id` | string | 否 | 移入的文件夹 ID，或 `"root"` 移到顶层 |
| `source_query` | string | 否 | 仅页面，新的回答问题 |
| `tags` | array | 否 | 仅页面，替换标签列表（`[]` 清除） |
| `max_tokens` | integer | 否 | 仅页面，生成内容的新最大 token 数 |
| `trigger` | object | 否 | 仅页面，要更改的刷新字段，见[触发设置](#trigger-settings)。补丁更新，省略保留当前值 |
| `refresh_after_consolidation` | boolean | 否 | 仅页面，`trigger.refresh_after_consolidation` 的旧版简写 |

---

### delete_knowledge_node

删除文件夹或页面及整个子树。每个删除页面也删除其支撑心智模型。

| 参数 | 类型 | 是否必需 | 说明 |
|-----------|------|----------|-------------|
| `node_id` | string | 是 | 要删除的文件夹（`kf-...`）或页面（`kp-...`） |

:::note
有意不提供知识库导出的 MCP 工具，因为返回整个库的单一 Markdown 包。请用 HTTP 端点 `GET /v1/default/banks/{bank_id}/knowledge-base/export`。
:::

---

## 与 AI 助手集成 {#integration-with-ai-assistants}

MCP 可用于任何兼容 AI 助手。Claude Code 和 Claude Desktop 配置示例见上方[身份验证](#authentication)。

每个用户可以用自己的配置指向个人记忆库：
- 指定库的 URL，如 `/mcp/alice/`（推荐）
- `X-Bank-Id` 请求头
