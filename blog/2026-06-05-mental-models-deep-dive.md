---
title: "Hindsight如何学习：深入探究心智模型"
authors: [benfrank241]
slug: "2026/06/05/mental-models-deep-dive"
date: 2026-06-05T16:00
tags: [hindsight, memory, mental-models, agents, deep-dive, tutorial]
description: "心智模型是Hindsight学习层次的顶层——对您的智能体在每次课程中提出的主题有持久的、自我刷新的理解。从架构开始的演练。"
image: /img/blog/mental-models-deep-dive.webp
hide_table_of_contents: true
---

![Hindsight如何学习 — 心智模型](/img/blog/mental-models-deep-dive.webp)

Hindsight分三个阶段学习。 **原始事实** 就是所说的——从智能体的对话中提取的个人记忆。 **观察** 是Hindsight 在许多事实中注意到的——自动整合的模式和结论。 **心智模型** 就是Hindsight 到*了解* 的成果——稳定的、命名的文档，每次记忆库获得新证据时都会演变。它们位于检索层次结构的顶部，因为那是学习的所在。

对于你的智能体在每次会话中提出的问题 - *“该用户的偏好是什么？”*、*“这个项目的惯例是什么？”* - 每次都从原始事实中重新得出答案是浪费的。更糟糕的是，它很脆弱：合成输出会在会话之间漂移，因为每个 ^ 调用都是从头开始。 心智模型用Hindsight一直在完善的持久表示来取代它。

这篇文章是顶层实际如何工作的技术参考——模式、刷新逻辑、悄悄咬人的标签匹配策略，以及你必须选择的两种刷新模式（`full`和`delta`）。

<!-- truncate -->

## 心智模型到底是什么 {#what-a-mental-model-actually-is}

来自文档：

> 心智模型是您为记忆库策划的**已保存的答复**。当您创建心智模型时，Hindsight 使用源查询运行反思操作并存储结果。在后续反思调用中，首先检查这些预先计算的摘要——提供更快、更一致的答案。

这就是概念核心。从技术上讲，心智模型是 `mental_models` 表中的一行，其中包含：

- A `source_query`（问什么）
- A `content` 字段（合成答案）
- A `trigger` 配置（何时刷新）
- 可选`tags`（哪些记忆喂养它，谁可以看到它）

^使用三层检索层次结构。智能体收到的系统提示说明了这一点：

```text
### 1. 心智模型 (search_mental_models) - 首先尝试
- 用户策划的有关特定主题的摘要
- 最高质量 - 手动创建和维护
- 如果相关的心智模型存在并且是FRESH，它可以完全回答这个问题

### 2. 观察 (search_observations) - 第二优先级
- 自动巩固记忆中的知识

### 3. RAW FACTS（记忆召回）- 基本事实
- 个人记忆（世界事实和经历）
```

心智模型位于该层次结构的顶部。智能体首先观察它们，然后进行观察，然后是原始事实。它走得越远，需要进行的合成就越多，响应也就越慢。

---

## 架构 {#the-schema}

`mental_models` 表有以下值得了解的列：

|栏目|注释|
|---|---|
|`id` + `bank_id`|复合主键 - 文本 ID，范围按记忆库|
|`source_query`|自然语言查询刷新贯穿始终|
|`content`|合成文本 - 智能体在拉动模型时读取的内容|
|`trigger`|JSONB 配置：`mode`、`refresh_after_consolidation`、`fact_types`、`tags_match` 等。|
|`tags`|JSONB 数组 — 门控哪些记忆为模型提供数据以及谁可以读取它|
|`max_tokens`|每个模型的合成输出上限（默认`2048`）|
|`structured_content`|解析内容的 JSONB AST — 增量模式刷新的秘密武器|
|`last_refreshed_source_query`|跟踪刷新之间的查询变化以检测主题转移|
|`reflect_response`|上次刷新的完整负载，包括 `based_on` 出处|
|`last_refreshed_at`|最近一次成功刷新的 ISO 时间戳|
|`history`|先前内容版本的 JSONB 数组|
|`embedding`|`name + content` 的 384 维向量，用于图积分|

复合`(id, bank_id)`主键意味着每个记忆库的心智模型都存在于自己的命名空间中。您可以在 `bank-alice` 中包含 `user-preferences`，在 `bank-bob` 中包含 `user-preferences`，它们是完全独立的记录 — 整个记忆库中不会发生 `id` 冲突。

---

## 两种刷新模式 {#the-two-refresh-modes}

这是创建心智模型时最重要的选择。这两种模式实际上是同一工作的两种姿势：将新证据融入模型已经理解的内容中。 `full`从当前证据中重新推导出一切。 `delta` 保留先前的理解并融入新的证据。选择与您的主题实际发展方式相匹配的证据。

`trigger.mode`字段是`Literal["full", "delta"]`。完整的触发器架构：

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

### `full` — 从头开始重新生成（默认） {#full--regenerate-from-scratch-default}

默认值。每次刷新都会针对记忆库运行完整的 ^ 管道，从头开始合成一个新文档，并覆盖之前的 `content`。简单、可预测，是最终形状可能随时间变化的短文档或模型的正确选择。

### `delta` — 对现有文档进行外科手术编辑 {#delta--surgical-edits-to-the-existing-document}

Delta模式更有趣。来自参考文档：

> 刷新发出**类型化操作**：`add section`、`append bullet`、`replace block`、`remove stale paragraph`。 **不是操作的目标，复制字节相同** 节 — 没有释义，没有空白漂移，没有列表式规范化。

对于长期存在的“剧本”式模型来说，这是正确的选择 - 您希望逐步发展的文档，而无需 LLM 重写不需要更改的部分。

`refresh_mental_model`决策逻辑：

1. 解析`trigger.mode`。如果`delta`，检查现有的`content`是否非空——从未刷新的页面带有空的正文。 （由旧版本创建的页面带有 `"Generating content..."` 占位符；这也被视为空。）
2. 检查`source_query`自`last_refreshed_source_query`以来是否发生了变化。
3. 如果两项检查都通过，则运行增量路径。否则，回到完全合成。

回退是自动且无声的 - 您不能意外地对还没有基线的模型进行增量编辑，也不能对源查询刚刚更改的模型进行增量编辑（因为先前的内容可能不再相关）。

### Delta刷新只关注新事实 {#delta-refresh-only-looks-at-new-facts}

当增量路径运行时，记忆召回调用的范围是暂时的：刷新将`created_after=last_refreshed_at`添加到了坐标调用中，因此代理循环仅检索到达*自上次刷新以来*的记忆。然后，LLM 通过添加/替换操作将这些新事实混合到现有的结构化内容中。模型中已经表示的任何内容都不需要重新读取，模型中已经表示的任何内容都不需要从旧事实中重写。刷新路径中的内联注释说得直白一点：*“所以代理循环只检索真正的新信息。”*

### 字节相同保证 {#the-byte-identical-guarantee}

在增量模式下，只有操作所针对的部分才会被重写。其他所有内容都是从之前的 `structured_content` AST 逐字复制的。这比听起来更重要：如果您的心智模型包含团队已经审查过的清单或代码块，增量模式保证LLM不会悄悄地重写它。

### 空内容保护 {#empty-content-protection}

独立于模式，刷新有一个“永远不会用空内容覆盖”保护：

> 如果 LLM 调用失败或返回空，则现有内容为 **保留** — 刷新永远不会用空内容覆盖填充的文档。

如果什么都没有回来——没有匹配的记忆，LLM失败，标签不匹配——现有的内容保留。刷新失败记录在审计跟踪（`reflect_response.refresh_skipped = "empty_candidate"`）中，但智能体读取的文档仍然是最后一个已知的良好版本。

---

## 整合自动刷新 {#automatic-refresh-on-consolidation}

`trigger`配置的另一半是`refresh_after_consolidation`。将其设置为 `true`，模型将作为 Hindsight 集成周期的一部分自动刷新。

钩子函数的文档字符串阐明了策略：

```python
async def _trigger_mental_model_refreshes(
    memory_engine: "MemoryEngine",
    bank_id: str,
    request_context: "RequestContext",
    consolidated_tags: list[str] | None = None,
    perf: ConsolidationPerfLog | None = None,
) -> int:
    """
    使用refresh_after_consolidation=true触发心智模型刷新。
    
    SECURITY：仅对与标签重叠的心智模型触发刷新
    整合记忆标签，防止跨安全边界不必要的刷新。
    """
```

因此，集成不会在每次运行后刷新每个模型 - 它只会刷新标签与集成刚刚触及的记忆标签重叠的模型。 `project:alice`心智模型仅在合并器处理标记为`project:alice`的记忆时刷新。这既是性能优化（避免无意义的工作）也是安全属性（不要跨租户边界泄漏刷新信号）。

刷新本身通过`memory_engine.submit_async_refresh_mental_model()`异步运行。集成周期从不等待刷新完成。

---

## 标签匹配脚枪 {#the-tag-matching-foot-gun}

心智模型上的标签有两件事，你必须同时考虑：

1. 它们控制生成内容时刷新路径读取哪些记忆
2. 他们控制哪些 反思/记忆召回 调用可以看到模型

#1 的默认策略是 **`all_strict`** — 这意味着在刷新期间，模型只能看到带有 **全部** 标签的记忆。解析逻辑：

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

参考文档阐明了含义：

> 心智模型 标签：`["user:alice"]`
>
> 刷新时，显示：
> - ✅ *“Alice 更喜欢异步通信”* — 有 `"user:alice"`
> - ✅ *“团队使用 Slack 发布公告”* — 有 `"user:alice"` （加上其他标签）
> - ❌ *“公司政策：周五不开会”* — 未标记，排除
> - ❌ *“鲍勃不喜欢长时间的会议”* — 无 `"user:alice"` 标签

以及以下警告：

> 为心智模型**缩小了刷新可以读取的源记忆池**添加标签。如果还没有记忆带有这些标签，则刷新将返回空内容（例如 `"找不到相关信息……"`），即使同一查询上的直接 `reflect` 有效。

最常见的咬伤方式：你用记忆库中没有的东西来标记心智模型。刷新什么也不返回。空内容防护启动，现有（可能为空）文档保持为空，您花了一个小时想知道为什么模型永远不会生成。

修复方法是：
- 在第一次刷新之前将标签回填到源记忆中，或者
- 通过 `trigger.tags_match` 覆盖默认值（例如 `"any"` 允许 OR 匹配，`"any_strict"` 允许 OR 匹配，但仍排除未标记的）。

**具体图案：** 当您使用 `project:<name>` 标签构建每个项目的记忆库时，请确保您的记忆存储管道已附加项目标签 *之前* 您种子依赖于它的心智模型。首先是种子，其次是标记保留，中间的每次刷新都会针对空源池运行 - 然后空内容防护会悄悄地保持占位符文本处于活动状态，而您想知道为什么没有生成任何内容。

---

## 综合提示 {#the-synthesis-prompt}

当刷新运行时，它会使用`context`参数调用`reflect_async`，该参数告诉LLM具体如何编写心智模型：

```python
refresh_context = (
    f'你正在撰写一份文档，名为 "{mm_name}". '
    f"只包含直接回答主题查询的内容。 "
    f"丢弃偏离主题的观察，检索可能返回 "
    f"与主题松散相关却不应属于文档的内容。\n\n"
    f"Quality guidelines:\n"
    f"- 保留观察中的具体示例、前后对照和示例语句 "
    f"它们比抽象规则更有指导价值。\n"
    f"- 如果观察有说明性示例，如 ✅/❌ 对照、 "
    f"改写或示例短语，将其纳入回答。\n"
    f"- 围绕主题组织文档，而非围绕来源。"
)
```

该提示中有两个值得标记的设计选择：

1. **“丢弃不切题的观察。”** 与范围狭窄的心智模型相比，幽智能体将呈现出更广泛的记忆。提示指示LLM进行过滤，而不仅仅是汇总。

2. **“围绕主题构建文档，而不是围绕来源。”** 如果没有这个，模型输出往往会读起来像`"记忆 A 表示 X，记忆 B 表示 Y。"`，而不是一个连贯的文档。这一行迅速的转向比其长度所暗示的更重要。

在增量模式下，附加系统提示符 (`STRUCTURED_DELTA_SYSTEM_PROMPT`) 驱动类型化操作LLM 调用，决定添加、编辑或删除内容。该模型返回一个 `DeltaOperationList`，然后将其应用于现有的 AST — 这为您提供了未更改部分的字节相同保证。

---

## 详细级别：按需付费 {#detail-levels-pay-for-what-you-need}

列表和获取端点支持三个级别的`detail`参数：

|等级|包括|用例|
|---|---|---|
|`metadata`|`id`、`bank_id`、`name`、`tags`、`last_refreshed_at`、`created_at`|“这个记忆库里有哪些模型？”|
|`content`|`metadata` + `source_query`、`content`、`max_tokens`、`trigger`|智能体启动 — 将实际文本加载到提示中|
|`full`|`content` + `reflect_response` 出处|深度检查或审核|

文档强调了在以下情况下使用哪个：

> 使用`detail=content`进行智能体定向流程。它包含智能体所需的一切，无需重量级的`reflect_response`来源链，对于许多模型的记忆库来说，它可以超过200KB。

如果您在启动路径中调用 `list_mental_models` 来渲染缓存块，请请求 `content` 并跳过每个模型 200KB 的出处负载。如果您正在调试模型生成奇怪输出的原因，请询问 `full` 并检查实际返回的内容。

---

## 清除与刷新 {#clear-vs-refresh}

两个看起来相似的操作：

- **`refresh_mental_model`** — 使用当前记忆重新生成`content`。尊重 `mode`（增量或完整）。
- **`clear_mental_model`** — 将 `content` 设置为空，以便下次刷新没有可进行增量编辑的基线，这迫使它回退到完全合成。

该文档解释了为什么这很重要：

> 对于长期存在的增量模式心智模型，请考虑安排定期清除+刷新（例如每 48 小时）以保持内容准确，同时仍受益于其间的增量增量更新。

该模式是：依靠增量模式刷新来实现集成触发的廉价、频繁、低流失的更新；定期 `clear` + `refresh` 从头开始​​重建文档并重置在许多小编辑中积累的任何偏差。

---

## 一个工作示例 {#a-worked-example}

这是使用Python客户端的完整循环。构建一个“用户首选项”模型，每当合并器处理新记忆时该模型都会刷新：

```python
from hindsight_client import Hindsight

client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")

#创建模型
mm = client.create_mental_model(
    bank_id="my-app",
    name="用户偏好",
    source_query=(
        "用户在编码风格、工具、沟通方面更喜欢什么？"
        "然后评论？仅捕获跨领域表达的持久偏好"
        "会话，而不是一次性请求。"
    ),
    max_tokens=600,
    trigger={
        "mode": "delta",
        "refresh_after_consolidation": True,
    },
)
print(f"created {mm['id']}")

#手动触发第一次刷新（创建是异步的，但是第一次刷新
否则
#将等待整合）。
client.refresh_mental_model(bank_id="my-app", mental_model_id=mm["id"])

#​​ 稍后 — 在智能体启动时，将模型加载到系统提示符中。
model = client.get_mental_model(bank_id="my-app", mental_model_id=mm["id"])
prompt_block = f"<user_preferences>\n{model['content']}\n</user_preferences>"
```

经过几次会话后，下次针对 `my-app` 运行集成时，模型将通过 `refresh_after_consolidation` 挂钩自动刷新。因为`mode: "delta"`，只重写文档中需要改变的部分；其余部分逐字节保存。

每周一次左右，运行`clear_mental_model`从头开始重建：

```python
client.clear_mental_model(bank_id="my-app", mental_model_id=mm["id"])
client.refresh_mental_model(bank_id="my-app", mental_model_id=mm["id"])
```

这种模式——大部分时间是增量，偶尔清除和重建——是文档明确推荐的长期模型的模式。

---

## REST 和客户端界面 {#the-rest-and-client-surface}

|方法|端点|Python 客户端|
|---|---|---|
|`POST`|`/v1/default/banks/{bank_id}/mental-models`|`create_mental_model()`|
|`GET`|`/v1/default/banks/{bank_id}/mental-models`|`list_mental_models()`|
|`GET`|`/v1/default/banks/{bank_id}/mental-models/{id}`|`get_mental_model()`|
|`PATCH`|`/v1/default/banks/{bank_id}/mental-models/{id}`|`update_mental_model()`|
|`DELETE`|`/v1/default/banks/{bank_id}/mental-models/{id}`|`delete_mental_model()`|
|`POST`|`/v1/default/banks/{bank_id}/mental-models/{id}/refresh`|`refresh_mental_model()`|
|`POST`|`/v1/default/banks/{bank_id}/mental-models/{id}/clear`|`clear_mental_model()`|
|`GET`|`/v1/default/banks/{bank_id}/mental-models/{id}/history`|`get_mental_model_history()`|

所有客户端方法都有异步（`a*`-前缀）变体。 MCP服务器公开与工具相同的操作（`create_mental_model`、`refresh_mental_model`等），因此Claude / Cursor / Codex智能体通过MCP与Hindsight对话可以直接创建和刷新模型。

---

## 发货时间 {#what-shipped-when}

心智模型在各个版本中不断发展。主要里程碑：

- **v0.4.0** (2026-01-28) — 心智模型发货。 [发布帖子](/blog/learning-capabilities)。
- **v0.5.0** (2026-04-07) — 记忆库模板中心。 心智模型可以在可移植模板清单中定义，并在导入时通过`id`进行匹配。
- **v0.5.2** (2026-04-15) — 触发器上的记忆召回控制API：按模型调整`fact_types`、`tags_match`、`include_chunks`、`recall_max_tokens`。
- **v0.5.3** (2026-04-17) — **Delta模式** 已发货。刷新会发出结构化操作，而不是从头开始重新生成。
- **v0.7.0** (2026-05-27) — `clear_mental_model` 端点，加上历史记录上限以防止 JSONB 溢出和完全刷新，正确重新设置挂起的增量基线。

---

## 注意事项 {#what-to-watch-for}

实践中出现的五个问题：

1. **`all_strict`标签默认。** 如果您的模型有标签，刷新路径只会看到带有 *全部* 的记忆。如果还没有任何内容带有这些标签，则刷新将返回空。
2. **话题转移回到满点。** 更改`source_query` 会使增量基线无效；下一次刷新将从头开始重新合成。
3. **Delta 随时间漂移。** 许多小的增量刷新可能会积累小的不准确性。定期 `clear` + `refresh` 重建干净的基线。
4. **​​在热路径中使用`detail=content`。** `full` 细节级别可以为每个模型返回 200KB 以上——对于检查来说很好，如果你在每次智能体启动时调用它，那就是毁灭性的。
5. **记忆库范围的ID。** 一个心智模型是`(id, bank_id)`——两个记忆库中相同的`id`是两个不同的记录。在设计 ID 约定时要为此做好计划。

---

## 整个想法 {#the-whole-idea}

心智模型是你的智能体如何反复询问Hindsight*学习*的事情。原始事实反映了所说的内容。 观察捕捉Hindsight在他们身上注意到的事情。 心智模型捕捉了Hindsight已经理解的内容——与前两层不同，它们是稳定的、命名的，并且随着新证据的出现而逐步完善。

性能优势——即时检索，无需每回合综合——是副作用。真正的胜利是，你的智能体不再在每次会话中重新推导出对稳定主题的理解，而是开始从一直在完善的表征Hindsight开始工作。

---

**进一步阅读：**

- [心智模型API参考](https://hindsight.vectorize.io/developer/api/mental-models) — 官方文档，包含完整的架构和端点参考
- [使用实体标签自动标记记忆](/blog/2026/06/02/entity-labels-automatic-memory-tagging) — 受控词汇标记，通常决定您的心智模型可以看到什么
- [Hindsight 0.5.3 的新增功能](/blog/2026/04/17/version-0-5-3) — 增量模式刷新启动
- [Hindsight 0.7.0 的新增功能](/blog/2026/05/27/version-0-7-0) — 明确终点，历史硬化
- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
