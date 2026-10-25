---
title: "Hindsight 如何学习：深入剖析心智模型"
authors: [benfrank241]
slug: "2026/06/05/mental-models-deep-dive"
date: 2026-06-05T16:00
tags: [hindsight, memory, mental-models, agents, deep-dive, tutorial]
description: "心智模型位于 Hindsight 学习层级的顶端：它们是持久、可自行刷新的认知，用于理解智能体每次会话都会询问的主题。本文从数据库模式开始逐步讲解。"
image: /img/blog/mental-models-deep-dive.webp
hide_table_of_contents: true
---

![Hindsight 如何学习——心智模型](/img/blog/mental-models-deep-dive.webp)

Hindsight 通过三个阶段学习。原始事实是人们说过的话，即从智能体对话中提取出的单条记忆。观测是 Hindsight 从大量事实中发现的内容，即自动整合出的模式和结论。心智模型则是 Hindsight 已经*理解*的内容：稳定、有名称的文档，每当记忆库获得新证据时都会随之演进。它们位于检索层级的顶端，因为学习就发生在那里。

对于智能体每次会话都会询问的问题——*“这个用户有什么偏好？”*、*“这个项目有哪些约定？”*——每轮都从原始事实重新推导答案很浪费。更糟的是，这样做很脆弱：每次 Reflect 调用都从头开始，因此综合结果会在不同会话间漂移。心智模型用持久化表征取代这种做法，而 Hindsight 一直在持续完善这份表征。

本文是关于顶层机制如何工作的技术参考，涵盖数据库模式、刷新逻辑、容易让人踩坑的标签匹配策略，以及必须在两种刷新模式（`full` 和 `delta`）之间作出的选择。

<!-- truncate -->

## 心智模型究竟是什么 {#what-a-mental-model-actually-is}

文档中的定义：

> 心智模型是你为记忆库整理保存的**Reflect 响应**。创建心智模型时，Hindsight 会使用你的源查询执行一次 Reflect 操作，并保存结果。在之后的 Reflect 调用中，系统会先检查这些预先计算的摘要，从而更快、更一致地回答问题。

这就是核心概念。从技术上说，心智模型是 `mental_models` 表中的一行，包含：

- `source_query`（要询问什么）
- `content` 字段（综合得出的答案）
- `trigger` 配置（何时刷新）
- 可选的 `tags`（哪些记忆会为它提供内容，以及谁可以看到它）

Reflect 使用三层检索层级。Reflect 智能体收到的系统提示会明确说明这一点：

```text
### 1. MENTAL MODELS (search_mental_models) - Try First
- User-curated summaries about specific topics
- HIGHEST quality - manually created and maintained
- If a relevant mental model exists and is FRESH, it may fully answer the question

### 2. OBSERVATIONS (search_observations) - Second Priority
- Auto-consolidated knowledge from memories

### 3. RAW FACTS (recall) - Ground Truth
- Individual memories (world facts and experiences)
```

心智模型位于该层级的顶端。智能体先查看心智模型，再查看观测，最后查看原始事实。检索层级越靠后，智能体需要自行综合的信息就越多，响应也越慢。

---

## 数据库模式 {#the-schema}

`mental_models` 表中有以下值得了解的列：

| 列 | 说明 |
|---|---|
| `id` + `bank_id` | 复合主键，文本 ID，按记忆库划分范围 |
| `source_query` | 刷新时通过 Reflect 执行的自然语言查询 |
| `content` | 综合生成的文本，即智能体读取心智模型时看到的内容 |
| `trigger` | JSONB 配置，包含 `mode`、`refresh_after_consolidation`、`fact_types`、`tags_match` 等字段 |
| `tags` | JSONB 数组，既限制哪些记忆可为模型提供内容，也限制谁可以读取模型 |
| `max_tokens` | 每个模型的综合输出上限（默认值为 `2048`）|
| `structured_content` | 解析后内容的 JSONB AST，是增量模式刷新的关键 |
| `last_refreshed_source_query` | 记录刷新期间查询的变化，以检测主题转移 |
| `reflect_response` | 最近一次刷新的完整 Reflect 载荷，包含 `based_on` 来源信息 |
| `last_refreshed_at` | 最近一次成功刷新的 ISO 时间戳 |
| `history` | 先前内容版本组成的 JSONB 数组 |
| `embedding` | `name + content` 的 384 维向量，用于图集成 |

复合主键 `(id, bank_id)` 意味着每个记忆库的心智模型都位于各自的命名空间中。你可以在 `bank-alice` 和 `bank-bob` 中分别创建名为 `user-preferences` 的模型；它们是完全独立的记录，不同记忆库之间不会发生 `id` 冲突。

---

## 两种刷新模式 {#the-two-refresh-modes}

创建心智模型时，最重要的选择就是刷新模式。这两种模式是完成同一任务的两种方式：将新证据融入模型已有的理解。`full` 会根据当前证据重新推导全部内容；`delta` 则保留先前的理解，再融入新证据。应根据主题的实际演进方式选择模式。

`trigger.mode` 字段的类型为 `Literal["full", "delta"]`。完整的触发器模式如下：

```python
class MentalModelTriggerOutput(BaseModel):
    mode: Literal["full", "delta"] = Field(default="full", ...)
    refresh_after_consolidation: bool = Field(default=False, ...)
    fact_types: list[Literal["world", "experience", "observation"]] | None = ...
    exclude_mental_models: bool = ...
    exclude_mental_model_ids: list[str] | None = ...
    tags_match: TagsMatch | None = ...
    tag_groups: list[TagGroup] | None = ...
    include_chunks: bool | None = ...
    recall_max_tokens: int | None = ...
    recall_chunks_max_tokens: int | None = ...
```

### `full` — 从头重新生成（默认） {#full--regenerate-from-scratch-default}

这是默认模式。每次刷新都会针对记忆库运行完整的 Reflect 流程，从头综合出一份新文档，并覆盖之前的 `content`。这种方式简单、可预测，适合篇幅较短的文档，或最终结构可能随时间变化的模型。

### `delta` — 精细修改现有文档 {#delta--surgical-edits-to-the-existing-document}

Delta 模式更有意思。参考文档这样描述：

> 刷新会输出**类型化操作：`add section`（添加章节）、`append bullet`（追加项目符号）、`replace block`（替换内容块）、`remove stale paragraph`（移除过时段落）。未被操作指定的章节会逐字节原样复制**，不会改写措辞、改变空白或规范化列表样式。

对于长期维护的“操作手册”式模型，这是合适的选择：你希望逐步更新文档，而不希望 LLM 重写那些无需改动的部分。

`refresh_mental_model` 的决策逻辑如下：

1. 解析 `trigger.mode`。如果是 `delta`，则检查现有 `content` 是否非空；从未刷新过的页面正文为空。（较早版本创建的页面可能含有 `"Generating content..."` 占位文本，这也会被视为空内容。）
2. 检查 `source_query` 自 `last_refreshed_source_query` 以来是否发生变化。
3. 如果两项检查都通过，则执行增量路径；否则回退到完整综合。

回退会自动、静默地发生：没有基线的模型不会被意外地增量编辑；如果模型的源查询刚刚变化，也不会进行增量编辑，因为先前内容可能已不再相关。

### Delta 刷新只处理新事实 {#delta-refresh-only-looks-at-new-facts}

执行增量路径时，Recall 调用会限定时间范围：刷新会在 Reflect 调用中添加 `created_after=last_refreshed_at`，因此智能体循环只会检索*上次刷新之后*新增的记忆。随后，LLM 通过添加或替换操作，将这些新事实融入现有的结构化内容。模型中已经呈现的内容无需重新读取，也不会根据旧事实重写。刷新路径中的内联注释直截了当地说明了这一点：*“这样智能体循环只会检索真正的新信息。”*

### 逐字节不变的保证 {#the-byte-identical-guarantee}

在 Delta 模式下，只有操作指定的章节会被重写。其余内容都会从先前的 `structured_content` AST 中原样复制。这个保证比听起来更重要：如果心智模型包含团队审核过的检查清单或代码块，Delta 模式可以确保 LLM 不会悄悄改写它们。

### 空内容保护 {#empty-content-protection}

无论使用哪种模式，刷新都有一项“绝不以空内容覆盖”的保护：

> 如果 LLM 调用失败或返回空内容，现有内容会被**保留**；刷新绝不会用空内容覆盖已有内容的文档。

如果 Reflect 没有返回任何内容——例如没有匹配的记忆、LLM 调用失败或标签不匹配——现有内容会保持不变。刷新失败会记录在审计轨迹中（`reflect_response.refresh_skipped = "empty_candidate"`），而智能体读取的文档仍是最后一个已知正常版本。

---

## 整合后自动刷新 {#automatic-refresh-on-consolidation}

`trigger` 配置的另一部分是 `refresh_after_consolidation`。将其设为 `true` 后，模型会在 Hindsight 的整合周期中自动刷新。

钩子函数的文档字符串说明了这项策略：

```python
async def _trigger_mental_model_refreshes(
    memory_engine: "MemoryEngine",
    bank_id: str,
    request_context: "RequestContext",
    consolidated_tags: list[str] | None = None,
    perf: ConsolidationPerfLog | None = None,
) -> int:
    """
    Trigger refreshes for mental models with refresh_after_consolidation=true.
    
    SECURITY: Only triggers refresh for mental models whose tags overlap with the
    consolidated memory tags, preventing unnecessary refreshes across security boundaries.
    """
```

因此，整合不会在每次运行后刷新所有模型；它只会刷新标签与本次整合处理的记忆标签重叠的模型。例如，`project:alice` 心智模型只有在整合器处理了带有 `project:alice` 标签的记忆后才会刷新。这既能提高性能（避免无用工作），也是一项安全属性（防止刷新信号跨租户边界泄露）。

刷新本身通过 `memory_engine.submit_async_refresh_mental_model()` 异步运行。整合周期不会等待刷新完成。

---

## 容易踩坑的标签匹配 {#the-tag-matching-foot-gun}

心智模型上的标签有两种作用，需要同时考虑：

1. 它们控制刷新路径生成内容时会读取哪些记忆。
2. 它们控制哪些 Reflect / Recall 调用可以看到这个模型。

对于第 1 种作用，默认策略是 `all_strict`：也就是说，刷新时模型只能看到带有其全部标签的记忆。标签解析逻辑如下：

```python
def _resolve_refresh_tag_filtering(model_tags, trigger_data):
    trigger_tags_match = trigger_data.get("tags_match")
    tags_match: TagsMatch = (
        trigger_tags_match if trigger_tags_match else
        ("all_strict" if model_tags else "any")
    )
    return RefreshTagFiltering(
        tags=model_tags,
        tags_match=tags_match,
        tag_groups=None,
    )
```

参考文档解释了这意味着什么：

> 心智模型标签：`["user:alice"]`
>
> 刷新时读取：
> - ✅ *“Alice 更喜欢异步沟通”*——带有 `"user:alice"` 标签
> - ✅ *“团队使用 Slack 发布公告”*——带有 `"user:alice"` 标签（以及其他标签）
> - ❌ *“公司政策：周五不安排会议”*——没有标签，因此被排除
> - ❌ *“Bob 不喜欢长时间会议”*——没有 `"user:alice"` 标签

接下来的警告指出：

> 为心智模型添加标签会**缩小刷新可读取的来源记忆范围**。如果目前没有记忆带有这些标签，刷新就会返回空内容（例如 `"找不到任何信息……"`），即使使用相同查询直接调用 `reflect` 能够正常工作。

最常见的踩坑方式是：给心智模型加上一个记忆库中没有任何记忆使用的标签。刷新不会返回内容，空内容保护会生效，现有（很可能为空的）文档继续保持为空，于是你花了一个小时疑惑模型为什么一直没有生成内容。

有两种修复方式：

- 在首次刷新前，先为来源记忆补上该标签；或者
- 通过 `trigger.tags_match` 覆盖默认值（例如用 `"any"` 允许 OR 匹配，用 `"any_strict"` 允许 OR 匹配，同时仍排除无标签记忆）。

具体做法：如果你使用 `project:<name>` 标签构建按项目划分的记忆库，请确保在创建依赖该项目标签的心智模型之前，存入流程已经为记忆添加了项目标签。如果先创建模型、之后才为存入的记忆加标签，那么中间的每次刷新都会面对空的来源范围；空内容保护会悄悄保留占位文本，你则会疑惑为什么一直没有生成内容。

---

## 综合生成提示 {#the-synthesis-prompt}

刷新时会调用 `reflect_async`，并传入 `context` 参数，明确告诉 LLM 如何撰写心智模型：

```python
refresh_context = (
    f'You are writing a document called "{mm_name}". '
    f"ONLY include content that directly answers the topic query. "
    f"Discard observations that are tangential or off-topic — retrieval may return "
    f"loosely related content that does not belong in this document.\n\n"
    f"Quality guidelines:\n"
    f"- Preserve concrete examples, before/after pairs, and sample sentences "
    f"from the observations. These teach more than abstract rules.\n"
    f"- If observations contain illustrative examples (e.g. ✅/❌ pairs, "
    f"rewrites, sample phrases), include them in your answer.\n"
    f"- Structure the document around the topic, not around the sources."
)
```

这段提示中有两个值得关注的设计选择：

1. **“舍弃偏题的观测。”** Reflect 智能体呈现的记忆范围可能比心智模型的主题更广。提示要求 LLM 进行筛选，而不只是总结。
2. **“围绕主题组织文档，而不是围绕来源。”** 否则，模型输出可能读起来像“记忆 A 说 X，记忆 B 说 Y”，而不是一份连贯的文档。这一句提示的作用远超它的长度。

在 Delta 模式下，还会使用额外的系统提示 `STRUCTURED_DELTA_SYSTEM_PROMPT`，驱动 LLM 调用并决定要添加、编辑或移除哪些内容。模型会返回一个 `DeltaOperationList`，随后该列表会应用到现有 AST 上；这就是未更改章节能保持逐字节不变的原因。

---

## 详细程度：按需获取 {#detail-levels-pay-for-what-you-need}

列表和获取端点支持 `detail` 参数的三个级别：

| 级别 | 包含内容 | 使用场景 |
|---|---|---|
| `metadata` | `id`、`bank_id`、`name`、`tags`、`last_refreshed_at`、`created_at` | “这个记忆库里有哪些模型？” |
| `content` | `metadata` 加上 `source_query`、`content`、`max_tokens`、`trigger` | 智能体启动时，将实际文本载入提示词 |
| `full` | `content` 加上 `reflect_response` 来源信息 | 深入检查或审计 |

文档明确建议根据场景选择级别：

> 在智能体初始化流程中使用 `detail=content`。它包含智能体所需的一切，同时省去庞大的 `reflect_response` 来源链；对于包含许多模型的记忆库，这些来源链可能超过 200KB。

如果你在启动流程中调用 `list_mental_models` 来生成缓存块，请请求 `content`，跳过每个模型可能有 200KB 的来源信息载荷。如果你要调试模型为何生成奇怪的输出，请请求 `full`，检查 Reflect 实际返回了什么。

---

## 清空与刷新 {#clear-vs-refresh}

有两种看起来相似的操作：

- **`refresh_mental_model`**——使用当前记忆重新生成 `content`，并遵循 `mode`（Delta 或 full）。
- **`clear_mental_model`**——将 `content` 设为空，使下次刷新没有可供增量编辑的基线，从而强制回退到完整综合。

文档说明了这一区别为何重要：

> 对于长期使用的 Delta 模式心智模型，可以考虑定期安排“清空 + 刷新”（例如每 48 小时一次），以保持内容准确，同时继续从两次完整重建之间的增量更新中受益。

做法是：依靠 Delta 模式刷新来处理整合触发的、成本较低且频繁的低变化量更新；然后定期执行 `clear` + `refresh`，从头重建文档，消除许多小幅编辑逐渐积累的偏差。

---

## 完整示例 {#a-worked-example}

下面使用 Python 客户端展示一个完整流程：创建名为“用户偏好”的模型，并在整合器处理新记忆时刷新该模型：

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")

# Create the model
mm = client.create_mental_model(
    bank_id="my-app",
    name="User Preferences",
    source_query=(
        "What does the user prefer in coding style, tooling, communication, "
        "and review? Capture only durable preferences expressed across "
        "sessions, not one-off requests."
    ),
    max_tokens=600,
    trigger={
        "mode": "delta",
        "refresh_after_consolidation": True,
    },
)
print(f"created {mm['id']}")

# Trigger the first refresh manually (creation is async, but the first refresh
# would otherwise wait for consolidation).
client.refresh_mental_model(bank_id="my-app", mental_model_id=mm["id"])

# Later — on agent boot, load the model into the system prompt.
model = client.get_mental_model(bank_id="my-app", mental_model_id=mm["id"])
prompt_block = f"<user_preferences>\n{model['content']}\n</user_preferences>"
```

经过几次会话后，下一次针对 `my-app` 运行整合时，模型会通过 `refresh_after_consolidation` 钩子自动刷新。由于 `mode: "delta"`，只有需要更改的文档部分会被重写；其余内容逐字节保留。

大约每周执行一次 `clear_mental_model`，从头重建：

```python
client.clear_mental_model(bank_id="my-app", mental_model_id=mm["id"])
client.refresh_mental_model(bank_id="my-app", mental_model_id=mm["id"])
```

文档明确建议长期使用的模型采用这种模式：大多数时候进行增量更新，偶尔清空并重建。

---

## REST 与客户端接口 {#the-rest-and-client-surface}

| 方法 | 端点 | Python 客户端 |
|---|---|---|
| `POST` | `/v1/default/banks/{bank_id}/mental-models` | `create_mental_model()` |
| `GET` | `/v1/default/banks/{bank_id}/mental-models` | `list_mental_models()` |
| `GET` | `/v1/default/banks/{bank_id}/mental-models/{id}` | `get_mental_model()` |
| `PATCH` | `/v1/default/banks/{bank_id}/mental-models/{id}` | `update_mental_model()` |
| `DELETE` | `/v1/default/banks/{bank_id}/mental-models/{id}` | `delete_mental_model()` |
| `POST` | `/v1/default/banks/{bank_id}/mental-models/{id}/refresh` | `refresh_mental_model()` |
| `POST` | `/v1/default/banks/{bank_id}/mental-models/{id}/clear` | `clear_mental_model()` |
| `GET` | `/v1/default/banks/{bank_id}/mental-models/{id}/history` | `get_mental_model_history()` |

所有客户端方法都有异步变体，名称以 `a*` 为前缀。MCP 服务器也通过工具暴露相同操作（`create_mental_model`、`refresh_mental_model` 等），因此使用 MCP 与 Hindsight 对话的 Claude、Cursor 或 Codex 智能体可以直接创建和刷新模型。

---

## 各版本的发布内容 {#what-shipped-when}

心智模型在多个版本中不断演进。主要里程碑包括：

- **v0.4.0**（2026-01-28）——发布心智模型。[发布公告](/blog/learning-capabilities)。
- **v0.5.0**（2026-04-07）——推出 Bank Template Hub。心智模型可以定义在可移植的模板清单中，导入时按 `id` 匹配。
- **v0.5.2**（2026-04-15）——触发器 API 增加 Recall 控制项：可以为每个模型调整 `fact_types`、`tags_match`、`include_chunks`、`recall_max_tokens`。
- **v0.5.3**（2026-04-17）——推出 **Delta 模式**。刷新会输出结构化操作，而不是从头重新生成。
- **v0.7.0**（2026-05-27）——新增 `clear_mental_model` 端点；同时限制历史记录上限以避免 JSONB 溢出，并确保完整刷新会正确重设待处理的增量基线。

---

## 需要留意的问题 {#what-to-watch-for}

实践中常见的五个陷阱：

1. **`all_strict` 标签默认值。** 如果模型有标签，刷新路径只会读取带有*全部*这些标签的记忆。如果目前没有记忆带有这些标签，刷新就会返回空内容。
2. **主题变化会回退到完整刷新。** 修改 `source_query` 会使增量基线失效；下次刷新会从头重新综合内容。
3. **Delta 随时间产生偏差。** 多次小幅增量刷新可能累积细微的不准确之处。定期执行 `clear` + `refresh` 可以重建干净的基线。
4. **高频路径使用 `detail=content`。** `full` 级别每个模型可能返回 200KB 以上的数据，适合检查；如果每次智能体启动都调用，则会造成严重负担。
5. **ID 按记忆库划分范围。** 心智模型的主键是 `(id, bank_id)`；两个记忆库中相同的 `id` 对应两条不同记录。设计 ID 约定时应考虑这一点。

---

## 核心理念 {#the-whole-idea}

心智模型让 Hindsight 能够*学习*智能体反复询问的内容。原始事实记录说过的话；观测捕捉 Hindsight 从这些事实中发现的内容；心智模型则捕捉 Hindsight 已经理解的内容。与前两个层级不同，心智模型是稳定的、有名称的，并会随着新证据到来而逐步完善。

性能提升——即时检索，无需每轮重新综合——只是附带收益。真正的价值在于：智能体不必每次会话都重新推导对稳定主题的理解，而是可以直接使用 Hindsight 一直在完善的表征。

---

**延伸阅读：**

- [心智模型 API 参考](/developer/api/mental-models)——官方文档，包含完整的模式和端点参考
- [使用实体标签自动为记忆添加标签](/blog/2026/06/02/entity-labels-automatic-memory-tagging)——受控词汇标注通常决定心智模型可以看到哪些内容
- [Hindsight 0.5.3 新增内容](/blog/2026/04/17/version-0-5-3)——Delta 模式刷新发布
- [Hindsight 0.7.0 新增内容](/blog/2026/05/27/version-0-7-0)——清空端点与历史记录加固
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)——基础概念
