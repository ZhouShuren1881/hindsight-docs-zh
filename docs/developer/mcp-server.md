---
sidebar_position: 5
---

# MCP 服务器 {#mcp-server}

Hindsight 内置了 [模型上下文协议（MCP）](https://modelcontextprotocol.io/) 服务器，让 AI 助手可以直接存入和检索记忆。

## 访问方式 {#access}

MCP 服务器**默认启用**，并挂载在 API 服务器的 `/mcp` 路径下。每个记忆库都有自己的 MCP 端点：

```
http://localhost:8888/mcp/{bank_id}/
```

例如，要连接到名为 `alice` 的记忆库：
```
http://localhost:8888/mcp/alice/
```

要禁用 MCP 服务器，请设置以下环境变量：

```bash
export HINDSIGHT_API_MCP_ENABLED=false
```

## 身份验证 {#authentication}

默认情况下，MCP 端点是**开放的**（无需身份验证）。

要启用身份验证，请配置 API 密钥租户扩展：

```bash
export HINDSIGHT_API_TENANT_EXTENSION=hindsight_api.extensions.builtin.tenant:ApiKeyTenantExtension
export HINDSIGHT_API_TENANT_API_KEY=your-secret-key
```

启用身份验证后，请在 `Authorization` 请求头中包含 API 密钥：

### Claude Code {#claude-code}

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp \
  --header "Authorization: Bearer your-secret-key" \
  --header "X-Bank-Id: my-bank"
```

### Claude Desktop {#claude-desktop}

将以下配置添加到 `~/.claude_desktop_config.json`：

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

### 直接发送 HTTP 请求 {#direct-http-request}

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Authorization: Bearer your-secret-key" \
  -H "X-Bank-Id: my-bank" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

如果密钥缺失或无效，请求会收到 `401 Unauthorized` 响应。

## 记忆库选择 {#bank-selection}

记忆库按以下优先级确定：

1. **URL 路径**（优先级最高）：`http://localhost:8888/mcp/my-bank/`
2. **X-Bank-Id 请求头**：`--header "X-Bank-Id: my-bank"`
3. **默认值**：使用 `HINDSIGHT_MCP_BANK_ID` 环境变量（默认值："default"）

## 按记忆库划分的端点 {#per-bank-endpoints}

传统 MCP 服务器要求工具调用时显式指定标识符，而 Hindsight 使用**按记忆库划分的端点**。`bank_id` 位于 URL 路径中，因此工具无需指定要使用哪个记忆库；连接本身已经隐式确定了记忆库。

这种设计：
- **简化工具调用**：每次调用都无需传入 `bank_id`
- **强制隔离**：每个 MCP 连接仅限于一个记忆库
- **支持多租户部署**：可将不同用户连接到不同端点

## 两种模式 {#two-modes}

MCP 服务器根据 URL 采用两种模式：

| 模式 | URL | 工具 | bank_id |
|------|-----|-------|---------|
| **单记忆库** | `/mcp/{bank_id}/` | 27 个工具（记忆、心智模型、强制指令、文档、操作、标签、记忆库管理） | 由 URL 隐式确定 |
| **多记忆库** | `/mcp/` | 全部 30 个工具，包括 `list_banks`、`create_bank`、`get_bank_stats` | 每个工具都要显式传入 `bank_id` 参数 |

**单记忆库模式**（建议使用）将所有操作限定在 URL 中指定的记忆库。工具不会公开 `bank_id` 参数。

**多记忆库模式**公开所有工具，并提供可选的 `bank_id` 参数；此外还提供记忆库管理工具（`list_banks`、`create_bank`、`get_bank_stats`）。

## 工具元数据与说明 {#tool-metadata-and-instructions}

Hindsight 可以在 `retain` 和 `recall` MCP 工具的说明中附加部署专用指引。如果客户端需要了解本地规则（例如应使用哪些标签，或哪些记忆应当存入），请在 API 服务器上设置 `HINDSIGHT_API_MCP_INSTRUCTIONS`。

```bash
export HINDSIGHT_API_MCP_INSTRUCTIONS="Use project:<name> tags for project-specific memories."
```

读取工具注解的 MCP 客户端还会收到内置工具提供的安全提示：

- `recall`、`reflect`、`list_*` 和 `get_*` 等只读操作标记为 `readOnlyHint: true`。
- 删除、清空和失效操作标记为 `destructiveHint: true`。
- 内置工具的 `openWorldHint` 为 `false`，因为 Hindsight 使用已配置的记忆存储，而非开放互联网。
- `retain`、`create_*`、`update_*`、`refresh_mental_model` 和 `cancel_operation` 等写入操作不会标记为具有破坏性。

---

## 可用工具 {#available-tools}

### retain {#retain}

将信息存入长期记忆。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `content` | string | 是 | 要存入的事实或记忆 |
| `context` | string | 否 | 记忆类别（默认值：`general`） |
| `timestamp` | string | 否 | 事件发生时间，采用 ISO 8601 时间戳 |
| `tags` | list[string] | 否 | 用于整理和筛选此记忆的标签 |
| `metadata` | object | 否 | 附加的键值元数据（例如`{"source": "slack"}`） |
| `document_id` | string | 否 | 将此记忆关联到已有文档 |

**示例：**
```json
{
  "name": "retain",
  "arguments": {
    "content": "User prefers Python over JavaScript for backend development",
    "context": "programming_preferences",
    "tags": ["user:alice", "preferences"]
  }
}
```

**适用场景：**
- 用户分享个人事实、偏好或兴趣时
- 提及重要事件或人生里程碑时
- 用户表达决定、观点或目标时
- 用户谈及工作背景或项目细节时

---

### sync_retain {#sync_retain}

将信息存入长期记忆并等待完成。与异步执行的 [`retain`](#retain) 不同，`sync_retain` 会一直阻塞，直到记忆完全存储并可立即召回。它适用于写入后立即读取的流程，即存入后马上查询。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `content` | string | 是 | 要存入的事实或记忆 |
| `context` | string | 否 | 记忆类别（默认值：`general`） |
| `timestamp` | string | 否 | 事件发生时间，采用 ISO 8601 时间戳 |
| `tags` | list[string] | 否 | 用于整理和筛选此记忆的标签 |
| `metadata` | object | 否 | 附加的键值元数据（例如`{"source": "slack"}`） |
| `document_id` | string | 否 | 将此记忆关联到已有文档 |

**示例：**
```json
{
  "name": "sync_retain",
  "arguments": {
    "content": "User prefers Python over JavaScript for backend development",
    "context": "programming_preferences",
    "tags": ["user:alice", "preferences"]
  }
}
```

**适用场景：**
- 需要在存入后立即查询记忆（写后读）时
- 工作流的后续步骤必须等到记忆可用后才能继续时
- 其他情况下，优先使用异步的 `retain`，避免存储过程阻塞

---

### recall {#recall}

检索记忆，为回答提供个性化信息。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 自然语言检索查询 |
| `max_tokens` | integer | 否 | 事实文本的 token 预算（默认值：4096）。每条结果的元数据（id、标签、分数、日期）不计入预算，因此响应可能是此值的数倍 |
| `budget` | string | 否 | 检索详尽程度：`low`、`mid` 或 `high`（默认值：`high`） |
| `types` | list[string] | 否 | 按事实类型筛选：`world`、`experience`、`observation`。默认包含全部类型 |
| `tags` | list[string] | 否 | 按标签筛选记忆。省略表示不筛选 |
| `tags_match` | string | 否 | `any`（默认值）、`all`、`any_strict`、`all_strict` 或 `exact`。使用 `exact` 时，传入 `tags: []` 可选择无标签/全局范围 |
| `tag_groups` | list[object] | 否 | 复合布尔标签筛选；不能与 `tags` 同时使用。每个叶节点都有自己的 `match` 值 |
| `query_timestamp` | string | 否 | ISO 8601 时间戳；将召回视为在该时间点提出的问题，用于确定相对时间表达和近期性评分的参照点 |
| `min_scores` | object | 否 | 可选的分阶段分数下限，例如`{"reranker": 0.5}`。键包括 `semantic`/`keyword`（检索阶段的阈值）和 `reranker`/`final`（排序后阈值）。所有下限均包含边界并以 AND 组合；省略表示不过滤。Reranker 分数无法跨查询校准，使用前应先校准 |
| `temporal_window` | object | 否 | 显式指定`{"start": ISO, "end": ISO}` 时间段，代替从查询文本中读取日期。它会提高窗口内记忆的排名，但不会移除窗口外的记忆，因此不能用来将结果限制在某个时间段内 |
| `include_chunks` | boolean | 否 | 同时返回事实所依据的来源文本分块。需要提取过程可能改写过的精确字符串（路径、ID、命令）时使用。默认值：`false` |
| `max_chunk_tokens` | integer | 否 | 设置 `include_chunks` 时，来源文本分块的最大 token 数（默认值：8192） |
| `include_entities` | boolean | 否 | 同时返回结果中实体的观测。默认值：`false` |
| `max_entity_tokens` | integer | 否 | 设置 `include_entities` 时，实体观测的最大 token 数（默认值：500） |
| `include_source_facts` | boolean | 否 | 对观测结果，同时返回构成这些观测的事实。默认值：`false` |
| `max_source_facts_tokens` | integer | 否 | 设置 `include_source_facts` 时，来源事实的最大 token 数（默认值：4096） |

**示例：**
```json
{
  "name": "recall",
  "arguments": {
    "query": "What are the user's programming language preferences?",
    "tags": ["preferences"],
    "budget": "high"
  }
}
```

**适用场景：**
- 在对话开始时召回相关背景
- 提供建议之前
- 用户询问自己以前可能提过的事情时
- 为不同对话提供连续性时

---

### reflect {#reflect}

结合记忆库的性格倾向，对已存入的记忆进行综合分析并生成审慎的回答。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 要进行反思的问题或主题 |
| `context` | string | 否 | 关于为何需要此次反思的可选背景 |
| `budget` | string | 否 | 检索预算：`low`、`mid` 或 `high`（默认值：`low`） |
| `max_tokens` | integer | 否 | 响应的最大 token 数（默认值：4096） |
| `response_schema` | object | 否 | 用于结构化输出的 JSON Schema。提供后，响应会包含 `structured_output` 字段 |
| `tags` | list[string] | 否 | 限定记忆、观测、心智模型和带标签强制指令的范围。省略时，记忆检索不作筛选，但只会加载无标签强制指令 |
| `tags_match` | string | 否 | `any`（默认值）、`all`、`any_strict`、`all_strict` 或 `exact`。无标签强制指令在所有模式下都属于全局范围 |
| `include_trace` | boolean | 否 | 是否包含调试输出 `tool_trace` 和 `llm_trace`。默认值为 `false`，以缩小响应 |

MCP 工具仅在提供 `tags` 时才会转发 `tags_match`。对于原始事实、观测和心智模型，传入 `tags: []` 与 `tags_match: "exact"` 可选择空/全局范围；加载强制指令时也只会选择无标签的强制指令。

**示例：**
```json
{
  "name": "reflect",
  "arguments": {
    "query": "Based on my past decisions, what architectural style do I prefer?",
    "budget": "mid",
    "tags": ["architecture"]
  }
}
```

**适用场景：**
- 需要推理分析，而不只是检索事实时
- 问题是“我该怎么做？”，而不是“我说过什么？”时
- 需要综合多个记忆中的模式时

---

### create_mental_model {#create_mental_model}

创建一个心智模型——一份会随记忆保持最新的动态文档。心智模型是预先生成的反思结果，会在存入新记忆时自动刷新。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 便于人阅读的心智模型名称 |
| `source_query` | string | 是 | 用于生成和刷新模型的查询 |
| `mental_model_id` | string | 否 | 自定义 ID（小写字母、数字和连字符）。未提供时自动生成 |
| `tags` | list[string] | 否 | 用于整理和筛选模型的标签 |
| `tags_match` | string | 否 | 刷新时如何将模型标签与记忆匹配：`any`、`all`、`any_strict`、`all_strict` 或 `exact`。默认值见下方说明 |
| `trigger` | object | 否 | 刷新策略，见[触发设置](#trigger-settings) |
| `max_tokens` | integer | 否 | 模型内容的最大 token 数（默认值：2048） |
| `trigger_refresh_after_consolidation` | boolean | 否 | `trigger.refresh_after_consolidation` 的旧式简写 |

刷新设置建议使用 `trigger`；`tags_match` 和 `trigger_refresh_after_consolidation` 仍作为现有集成的简写形式保留。同一字段不能通过两种方式同时设置，否则会报错，不会静默选择其中一个。

:::warning 带标签的模型默认使用 `all_strict`
心智模型带有 `tags` 但未显式指定 `tags_match` 时，刷新会按 **`all_strict`** 匹配：记忆必须带有模型的**每一个**标签才会被纳入。如果记忆使用较窄的单一主题标签（例如 `["project:status"]`），而模型使用较宽泛的标签（例如 `["projects", "mental-model"]`），刷新会筛掉所有内容，最终内容将为空。
:::

传入 `tags_match: "any"`（与 `recall` 和 `reflect` 使用的默认值相同），即可匹配带有模型任意一个标签的记忆：

```json
{
  "name": "create_mental_model",
  "arguments": {
    "name": "Current projects",
    "source_query": "Which projects is the user currently working on?",
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
    "name": "Team Directory",
    "source_query": "Who works here and what do they do?",
    "tags": ["team", "people"],
    "tags_match": "any"
  }
}
```

内容生成会异步运行。响应中包含用于跟踪进度的 `operation_id`。

---

### list_mental_models {#list_mental_models}

列出记忆库中的所有心智模型，也可按标签筛选。

此工具只返回元数据：`id`、`name`、`tags`、`is_stale` 和时间戳。要读取模型综合生成的内容，请使用此列表中的 ID 调用 `get_mental_model`。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `tags` | list[string] | 否 | 按标签筛选模型 |

---

### get_mental_model {#get_mental_model}

按 ID 获取指定心智模型，包括其完整内容。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要获取的心智模型 ID |

---

### update_mental_model {#update_mental_model}

更新心智模型的元数据或设置。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要更新的心智模型 ID |
| `name` | string | 否 | 新名称 |
| `source_query` | string | 否 | 新的来源查询 |
| `tags` | list[string] | 否 | 新标签 |
| `max_tokens` | integer | 否 | 新的最大 token 数 |
| `trigger` | object | 否 | 要更改的刷新策略字段，见[触发设置](#trigger-settings)。此项为补丁：省略的字段保持当前值 |
| `tags_match` | string | 否 | `trigger.tags_match` 的旧式简写 |
| `trigger_refresh_after_consolidation` | boolean | 否 | 整合后自动刷新。仅在需要更改此设置时传入 |

---

### 触发设置 {#trigger-settings}

`trigger` 指定心智模型（或知识页）的刷新策略：**何时**重建，以及**基于什么内容**重建。它接受 HTTP API 支持的所有字段，因此，通过 `PATCH /mental_models/{id}` 能配置的内容，也都可以由智能体通过 MCP 配置。

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `mode` | string | `full` 会在每次刷新时从头生成内容；`delta` 会进行精细编辑，并逐字节保留未变更的章节。如果没有现有内容或来源查询已变更，delta 会回退为 full |
| `refresh_after_consolidation` | boolean | 每次记忆整合后重建 |
| `refresh_cron` | string | UTC 时区的五字段 cron 表达式，例如 `0 3 * * *` 表示每天 UTC 03:00 执行。仅当模型内容待更新时才运行，因此范围未变化时不会调用 LLM |
| `full_refresh_cron` | string | 用于按计划对 delta 模型执行**完整刷新**的 UTC 五字段 cron 表达式，例如 `0 3 * * 0`。它独立于上述两个触发器；自上次完整刷新以来若没有运行过刷新，则会跳过 |
| `min_refresh_interval_seconds` | integer | 两次*自动*刷新之间的最短间隔。更早到达的触发会合并到一个排队的刷新中，因此一波 retain 调用只会触发一次重建。显式刷新不受此间隔限制 |
| `fact_types` | list[string] | 刷新时检索 `world`、`experience`、`observation` 中的哪些类型。省略表示全部三种 |
| `exclude_mental_models` | boolean | 排除**所有**心智模型，避免模型反思其同级模型 |
| `exclude_mental_model_ids` | list[string] | 按 ID 排除指定心智模型 |
| `tags_match` | string | 模型标签如何筛选记忆：`any`、`all`、`any_strict`、`all_strict`、`exact` |
| `tag_groups` | list[object] | 复合布尔标签表达式，用于替代模型的扁平标签 |
| `include_chunks` | boolean | 刷新过程中的内部召回是否返回原始文本分块 |
| `recall_max_tokens` | integer | 刷新过程中的内部召回所返回事实的 token 预算 |
| `recall_chunks_max_tokens` | integer | 刷新过程中的内部召回所返回原始文本分块的 token 预算 |
| `budget` | string | 刷新可花费的智能体步骤数，以服务器反思迭代上限的倍数表示：`low` 减半，`mid` 保持不变，`high` 加倍。省略时使用 `mid` |
| `response_schema` | object | 用于结构化输出的 JSON Schema，与 Markdown 一起存储在 `reflect_response.structured_output` 中 |
| `keep_trace` | boolean | 在 `reflect_response.trace` 中记录每次刷新得出结果的过程。这是事后诊断 cron 或整合触发的刷新的唯一方式 |

`refresh_after_consolidation` 和 `refresh_cron` **互斥**：模型只能在整合后刷新，或按计划刷新，不能同时启用。设置其中一个会清除另一个。

**创建时**，省略的字段采用引擎默认值（`mode: full`、不设置计划、包含所有事实类型）；知识页则采用页面默认值（`mode: delta`、仅观测、自动刷新、排除同级页面）。

**更新时，`trigger` 是补丁**：仅更改传入的字段，因此为模型设置 cron 计划会保留其 `fact_types` 和 `mode`。传入显式的 `null` 可清除可空设置。如果要先检查当前策略再修改，请调用 `get_mental_model`，并将详情设为 `content` 或 `full`。

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

### delete_mental_model {#delete_mental_model}

永久删除心智模型。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要删除的心智模型 ID |

---

### refresh_mental_model {#refresh_mental_model}

根据最新记忆重新生成心智模型的内容。此操作异步运行。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要刷新的心智模型 ID |

---

### clear_mental_model {#clear_mental_model}

清空心智模型的内容，同时保留其定义。清空后，调用 `refresh_mental_model`，即可根据最新记忆重新构建内容。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `mental_model_id` | string | 是 | 要清空的心智模型 ID |

---

### list_banks（仅多记忆库模式） {#list_banks-multi-bank-mode-only}

按最近写入时间从新到旧列出可用记忆库。响应会在当前页之外一并返回匹配记忆库的总数，因此可以通过 `offset` 遍历大型部署中的记忆库。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 否 | 与记忆库 ID 和名称进行不区分大小写的子串匹配 |
| `limit` | integer | 否 | 最多返回的记忆库数量（默认值：100） |
| `offset` | integer | 否 | 跳过的记忆库数量（默认值：0） |

---

### create_bank（仅多记忆库模式） {#create_bank-multi-bank-mode-only}

创建新的记忆库，或获取已有记忆库。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `bank_id` | string | 是 | 新记忆库的 ID |
| `name` | string | 否 | 便于用户识别的记忆库名称 |
| `mission` | string | 否 | 说明智能体身份及其目标的任务说明 |

---

### list_directives {#list_directives}

列出记忆库中的强制指令。此管理工具不会采用 `reflect` 的强制指令隔离行为：省略 `tags` 时，会列出所有强制指令，包括带标签的强制指令。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `tags` | list[string] | 否 | 使用 `any` 匹配筛选。传入后，会返回无标签/全局强制指令，以及至少共享一个标签的强制指令。省略或传入空值时，会返回所有强制指令 |
| `active_only` | boolean | 否 | 仅返回有效的强制指令（默认值：`true`） |

---

### create_directive {#create_directive}

在记忆库中创建新的强制指令。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 便于人阅读的强制指令名称 |
| `content` | string | 是 | 强制指令的内容/指示 |
| `priority` | integer | 否 | 优先级别（数值越高越重要） |
| `is_active` | boolean | 否 | 指令是否有效（默认值：`true`） |
| `tags` | list[string] | 否 | 指令的适用范围。为空或省略（默认情况）表示全局适用；非空时，reflect 必须使用匹配的标签范围 |

---

### delete_directive {#delete_directive}

按 ID 删除一条强制指令。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `directive_id` | string | 是 | 要删除的强制指令 ID |

---

### list_memories {#list_memories}

浏览已存入的记忆，可选择筛选并分页。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `type` | string | 否 | 按事实类型筛选：`world`、`experience` 或 `observation` |
| `q` | string | 否 | 用于筛选记忆的搜索查询 |
| `limit` | integer | 否 | 最多返回的结果数（默认值：100） |
| `offset` | integer | 否 | 分页时跳过的结果数（默认值：0） |

---

### get_memory {#get_memory}

按 ID 获取指定记忆。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `memory_id` | string | 是 | 要获取的记忆 ID |

---

### list_documents {#list_documents}

列出已摄入记忆库的文档。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `q` | string | 否 | 用于筛选文档的搜索查询 |
| `limit` | integer | 否 | 最多返回的结果数（默认值：100） |
| `offset` | integer | 否 | 分页时跳过的结果数（默认值：0） |

---

### get_document {#get_document}

按 ID 获取指定文档，包括其元数据。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `document_id` | string | 是 | 要获取的文档 ID |

---

### delete_document {#delete_document}

删除文档及与其关联的所有记忆。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `document_id` | string | 是 | 要删除的文档 ID |

---

### list_operations {#list_operations}

列出异步操作（例如 retain 处理和心智模型刷新），可选择按状态和类型筛选。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `status` | string | 否 | 按状态筛选：`pending`、`running`、`completed`、`failed`、`cancelled` |
| `type` | string | 否 | 按类型筛选：`retain`、`consolidation`、`refresh_mental_model`、`file_convert_retain`、`webhook_delivery` |
| `limit` | integer | 否 | 最多返回的结果数，范围为 1–100（默认值：20） |
| `offset` | integer | 否 | 分页时跳过的结果数（默认值：0） |
| `exclude_parents` | boolean | 否 | 是否排除父批次操作（默认值：`false`） |

---

### get_operation {#get_operation}

获取异步操作的状态和详细信息。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `operation_id` | string | 是 | 要查询的操作 ID |

---

### cancel_operation {#cancel_operation}

取消待处理或正在运行的异步操作。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `operation_id` | string | 是 | 要取消的操作 ID |

---

### list_tags {#list_tags}

列出记忆库中使用的所有唯一标签，也可按模式筛选。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `q` | string | 否 | 用于筛选标签的 glob 模式（例如 `project:*`） |
| `limit` | integer | 否 | 最多返回的结果数（默认值：100） |
| `offset` | integer | 否 | 分页时跳过的结果数（默认值：0） |

---

### get_bank {#get_bank}

获取记忆库信息，包括其名称、任务说明和性格倾向。

---

### get_bank_stats（仅多记忆库模式） {#get_bank_stats-multi-bank-mode-only}

获取记忆库统计数据（节点/链接数量）。

---

### update_bank {#update_bank}

更新记忆库配置。可更新记忆库名称和/或记忆库级配置字段；仅更新传入的字段，省略的字段保持不变。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 否 | 便于用户识别的记忆库显示名称 |
| `mission` | string | 否 | **已弃用**——`config_updates.reflect_mission` 的别名 |
| `config_updates` | object | 否 | 要更新的配置字段字典。支持所有可在记忆库层级配置的字段（见下文）。不支持配置的字段或凭据字段会被拒绝 |

`config_updates` 对象接受可在记忆库层级配置的任意字段，字段名使用其 Python 名称，包括：

- `reflect_mission` — Reflect 操作的任务说明/背景
- `retain_mission` — 指定 `retain()` 过程中要提取的内容
- `retain_extraction_mode` — `concise`（默认值）、`verbose`、`custom`、`verbatim` 或 `chunks`
- `retain_custom_instructions` — 自定义提取提示（仅在模式为 `custom` 时生效）
- `retain_chunk_size` — 每个内容分块的目标最大字符数
- `retain_structured_chunk_size` — 保持完整的单行 JSONL 内容或单轮对话的最大字符数
- `retain_chunk_batch_size` — 并行处理的分块数量
- `enable_observations` — 开关：在 `retain()` 后整合观测
- `observations_mission` — 控制观测综合规则
- `disposition_skepticism` — 批判性评估程度（1–5）
- `disposition_literalism` — 按字面或抽象方式解读（1–5）
- `disposition_empathy` — 对情绪背景的考虑程度（1–5）
- `entity_labels` — 用于实体分类的受控词汇表
- `entities_allow_free_form` — 是否允许使用 `entity_labels` 以外的标签
- `recall_include_chunks` — 在召回结果中包含原始文本分块
- `recall_prefer_observations` — 对未提供 `prefer_observations` 的 recall 调用设置其默认值
- `recall_max_tokens` — 召回结果的最大 token 数
- `mcp_enabled_tools` — 此记忆库允许使用的工具列表

---

### delete_bank {#delete_bank}

永久删除记忆库及其全部数据（记忆、文档、实体、心智模型）。

---

### clear_memories {#clear_memories}

清空记忆库中的所有记忆，但不删除记忆库本身。也可按事实类型筛选，只清空特定类型的记忆。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `type` | string | 否 | 要清空的事实类型：`world`、`experience` 或 `observation`。未指定时，清空所有类型 |

---

### get_knowledge_base_tree {#get_knowledge_base_tree}

以嵌套树的形式浏览知识库中的文件夹和页面。每个页面都会报告 `is_stale`：`false` 表示页面已确定为最新；`true` 表示自页面上次刷新以来，记忆库已有写入。

---

### search_knowledge_base {#search_knowledge_base}

按相关性查找知识页（对页面名称和内容进行 BM25 与向量混合搜索）。结果会按排名返回，每页附带一段摘要。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `query` | string | 是 | 要搜索的内容 |
| `limit` | integer | 否 | 最多返回的页面数，范围为 1–50（默认值：10） |

---

### get_knowledge_page {#get_knowledge_page}

以 Markdown 文档形式读取知识页（YAML frontmatter 和综合生成的正文）。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `page_id` | string | 是 | 要读取的页面 ID（`kp-...` 节点 ID） |

---

### create_knowledge_folder {#create_knowledge_folder}

在知识库中创建文件夹。文件夹用于归类页面，本身不包含内容。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 文件夹名称 |
| `parent_id` | string | 否 | 父文件夹 ID（`kf-...` 节点 ID）。省略表示在顶层创建 |

---

### create_knowledge_page {#create_knowledge_page}

创建知识页——通过运行 `source_query`，从记忆库中的记忆综合生成页面内容，形成一份动态文档。内容会异步生成；请使用返回的 `operation_id` 跟踪完成状态。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `name` | string | 是 | 页面名称，在其所在文件夹中唯一 |
| `source_query` | string | 是 | 页面回答并据此重建的问题 |
| `parent_id` | string | 否 | 父文件夹 ID（`kf-...` 节点 ID）。省略表示在顶层创建 |
| `tags` | array | 否 | 限定用于生成页面的记忆范围的标签 |
| `max_tokens` | integer | 否 | 生成内容的最大 token 数（默认值：4096） |
| `trigger` | object | 否 | 刷新策略，见[触发设置](#trigger-settings)。省略的字段采用知识页默认值：`delta` 模式会在每次整合后根据已整合的观测重建，并忽略同级页面 |
| `refresh_after_consolidation` | boolean | 否 | `trigger.refresh_after_consolidation` 的旧式简写 |

设置 `trigger.refresh_cron`，可让页面停止由整合触发重建，改为按固定的 UTC 计划运行。二者互斥，因此设置 cron 会清除自动刷新，同时保留页面的 `mode` 和 `fact_types`。

---

### update_knowledge_node {#update_knowledge_node}

重命名或移动文件夹/页面，和/或更新页面选项。仅更改传入的参数。更改 `source_query` 会安排一次异步刷新，以便页面根据新问题重建。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `node_id` | string | 是 | 要更新的文件夹（`kf-...`）或页面（`kp-...`） |
| `name` | string | 否 | 节点的新名称 |
| `parent_id` | string | 否 | 要将节点移入的文件夹 ID，或使用 `"root"` 将节点移到顶层 |
| `source_query` | string | 否 | 仅适用于页面——页面要回答的新问题 |
| `tags` | array | 否 | 仅适用于页面——替换标签列表（传入 `[]` 可清空） |
| `max_tokens` | integer | 否 | 仅适用于页面——生成内容的新最大 token 数 |
| `trigger` | object | 否 | 仅适用于页面——要更改的刷新策略字段，见[触发设置](#trigger-settings)。此项为补丁：省略的字段保持当前值 |
| `refresh_after_consolidation` | boolean | 否 | 仅适用于页面——`trigger.refresh_after_consolidation` 的旧式简写 |

---

### delete_knowledge_node {#delete_knowledge_node}

删除文件夹或页面及其整个子树。每个被删除的页面都会同时删除其底层心智模型。

| 参数 | 类型 | 必填 | 说明 |
|-----------|------|----------|-------------|
| `node_id` | string | 是 | 要删除的文件夹（`kf-...`）或页面（`kp-...`） |

:::note
有意不将知识库导出设为 MCP 工具——该操作会将整个记忆库作为一个 Markdown 包返回。请改用 HTTP 端点 `GET /v1/default/banks/{bank_id}/knowledge-base/export`。
:::

---

## 与 AI 助手集成 {#integration-with-ai-assistants}

MCP 服务器可与任何兼容 MCP 的 AI 助手配合使用。Claude Code 和 Claude Desktop 的配置示例见上文[身份验证](#authentication)一节。

每个用户都可以通过以下任一方式配置自己的个人记忆库：
- 使用特定记忆库的 URL 路径，例如 `/mcp/alice/`（建议）
- 使用 `X-Bank-Id` 请求头
