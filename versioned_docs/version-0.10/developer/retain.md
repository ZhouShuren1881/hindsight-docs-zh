---
sidebar_position: 2
---

import Figure from '@site/src/components/Figure';
import retainFigure from '@site/figures/retain.json';

# Retain：Hindsight 如何存储记忆 {#retain-how-hindsight-stores-memories}

调用 `retain()` 时，Hindsight 会将对话和文档转换为结构化、可搜索的记忆，同时保留其含义和上下文。

## Retain 的作用 {#what-retain-does}

<Figure doc={retainFigure} />

---

## 丰富的事实提取 {#rich-fact-extraction}

Hindsight 不会只存下说过的话，还会提取其中的**原因、方式和含义**。

### 会提取哪些内容 {#what-gets-captured}

当你存入“爱丽丝去年春天加入 Google，并对研究机会感到非常兴奋”时，Hindsight 会提取：

**核心事实：**
- 爱丽丝加入了 Google。
- 这件事发生在去年春天。

**情绪和含义：**
- 她当时非常兴奋。
- 这代表一个重要的机会。

**原因：**
- 她选择加入，是因为那里有研究机会。

这种丰富的提取方式让你之后可以问“爱丽丝为什么加入 Google？”，并得到有意义的回答，而不只是“她加入了 Google”。

### 保留上下文 {#preserving-context}

传统系统会把信息拆散：
- “鲍勃提议叫 Summer Vibes。”
- “爱丽丝想要一个独特的名字。”
- “他们选了 Beach Beats。”

Hindsight 会保留完整叙述：
- “爱丽丝和鲍勃讨论给他们的夏日派对播放列表取名。鲍勃提议叫‘Summer Vibes’，因为这个名字朗朗上口；但爱丽丝想要一个独特的名字。最后，他们选了‘Beach Beats’，因为它的风格活泼。”

因此，搜索结果会包含完整上下文，而不是彼此割裂的片段。

---

## 两种事实类型 {#two-types-of-facts}

每条事实都会按**它反映谁的视角**分类：拥有该记忆库的智能体，或外部世界：

| 类型 | 记录的内容 | 示例 |
| --- | --- | --- |
| **experience** | 记忆库中的智能体采取行动、观察或进行交互的第一人称经历 | “我向爱丽丝推荐了 Python” |
| **world** | 关于其他人物、地点、事物和事件的事实 | “爱丽丝在 Google 工作” |

分类依据是**谁在说话**，而不是句子的语法形式。只有说话者就是该记忆库中的智能体时，第一人称陈述才属于 `experience`。同样的话由其他人说出时，则是关于那个人的 `world` 事实：

- 智能体自己的日志：“我修复了身份验证漏洞” → **experience**（执行者是智能体）。
- 用户对智能体说：“我买了一辆 Tesla” → **world**（这是关于**用户**的事实，而不是关于智能体的事实）。

**在每个输入项的 `context` 中说明说话者**，可以帮助系统正确分类。存入对话记录或第三方内容时，像“客户 Maria 正在讲话”这样的上下文，可以确保她的第一人称陈述被保存为关于 Maria 的 `world` 事实，而不会误认为是智能体自己的经历。存入智能体自己的日志时，像“助手正在讲话”这样的上下文会将其中的第一人称陈述归于智能体，保存为 `experience` 事实。

**注意：**`retain()` 操作完成后，后台会自动整合观测。这个整合过程会从新事实中综合提取模式，并将其纳入记忆库的知识库。

---

## 实体识别 {#entity-recognition}

Hindsight 会自动识别并追踪重要的**实体**，例如人物、组织和概念。

### 会识别哪些内容 {#what-gets-recognized}

- **人物：**“爱丽丝”、“史密斯博士”、“陈鲍勃”
- **组织：**“Google”、“MIT”、“OpenAI”
- **地点：**“巴黎”、“中央公园”、“加利福尼亚”
- **产品和概念：**“Python”、“TensorFlow”、“机器学习”

### 实体消解 {#entity-resolution}

同一实体的不同称呼会通过**模糊名称匹配**归并，并结合共同出现情况和时间接近程度来提高判断准确性：
- “Alice” + “Alice Chen” + “Alice C.” → 同一个人

由于消解过程会比较名称相似度，彼此接近的名称变体会自动合并。仅凭名称不会把毫不相似的称呼（例如昵称和毫无关联的正式姓名）视为同一实体，但共同出现的实体仍可能将它们关联起来。

**为什么重要**：你可以问“我知道哪些关于 Alice 的信息？”，并找出所有相关内容，即使她在某些对话中被称为“Alice Chen”。

实体消解需要作出判断，因此也可能出现另一种结果：如果某个记忆库中已有大量历史记录，那么一个新出现的简短名称若与现有实体相似，并且和该实体已关联的实体同时出现，就可能被吸收到现有实体中，而不会成为独立实体。如果发现关于新人物的事实被关联到无关实体，请参阅[实体消解如何作出判断](/developer/configuration#how-entity-resolution-decides)，了解比较的内容以及如何通过设置收紧匹配条件。

### 根据上下文消除歧义 {#context-aware-disambiguation}

如果“Alice”多次与“Google”和“Stanford”一同出现，那么新出现的“Alice”若也提到这些实体，很可能指同一个人。Hindsight 会利用共同出现模式来区分常见姓名。

### 实体标签 {#entity-labels}

你可以定义受控词汇形式的 `key:value` 分类标签（例如 `pedagogy:scaffolding`、`engagement:active`）。系统会在存入时提取这些标签，并将其保存为实体。由于标签会成为实体，它们会自动在知识图谱中关联相关记忆，并提升语义检索和关键词检索的效果。你也可以选择将标签同时写入记忆单元的 tags，以便在 Recall 和 Reflect 期间使用标准标签筛选。

实体标签与普通实体不同：它们绝不会按名称相似度合并。不同的标签值必须保持独立，因此只进行精确匹配，并完全排除在模糊名称匹配之外。

完整配置说明请参阅[记忆库配置中的 entity_labels](/developer/api/memory-banks#entity-labels)。

---

## 建立关联 {#building-connections}

记忆并非彼此孤立：Hindsight 会构建包含四种关联的**知识图谱**。

### 实体关联 {#entity-connections}

提及同一实体的所有事实都会彼此关联。

**用途：**“告诉我关于 Alice 的所有信息” → 检索所有与 Alice 有关的事实。

### 时间关联 {#time-based-connections}

时间接近的事实会建立关联，日期越接近，关联越强。

**用途：**“那段时间还发生了什么？” → 找出时间上相关的事件。

### 语义关联 {#meaning-based-connections}

即使措辞不同，语义相似的事实也会建立关联。

**用途：**“告诉我类似主题的信息” → 找出主题相关的内容。

### 因果关联 {#causal-connections}

系统会明确追踪因果关系。

**用途：**“为什么会发生这件事？” → 沿因果链追溯原因。
**示例：**“爱丽丝感到精疲力竭” ← 由 ← “她每周工作 80 小时”导致。

---

## 理解时间 {#understanding-time}

Hindsight 会追踪**两个时间维度**：

### 事件发生的时间 {#when-it-happened}

对于会议、旅行、里程碑等事件，Hindsight 会记录事件发生的时间。
- “爱丽丝于 2024 年 6 月结婚” → 事件发生于 2024 年 6 月。

对于偏好、特征等一般事实，没有特定的发生时间。
- “爱丽丝喜欢 Python” → 持续存在的偏好。

### 你得知事实的时间 {#when-you-learned-it}

Hindsight 还会追踪你告诉它每条事实的时间。

**为什么要记录这两个时间？**

假设在 2025 年 1 月，有人告诉你：“爱丽丝于 2024 年 6 月结婚”：
- **历史查询**可以正常工作：“爱丽丝 2024 年做了什么？” → 找到她结婚这件事。
- **近期内容排序**可以正常工作：搜索会优先显示最近被提及的内容。
- **时间推理**可以正常工作：“她结婚前发生了什么？” → 找到更早的事件。

如果不区分这两个时间，旧信息要么无法按日期搜索，要么会被视为无关内容。

---

## 为记忆添加标签 {#tagging-memories}

标签可以限定哪些人能看到记忆。当一个记忆库供多个用户使用、但每个人只能查看相关记忆时，这项功能很有用。

- **输入项标签**：为单条记忆添加特定范围的标签。
- **文档标签**：为一个批次中的所有输入项添加标签。
- **按标签筛选**：在 Recall 或 Reflect 期间按标签筛选。

代码示例请参阅 [Retain API](./api/retain)，筛选选项请参阅 [Recall API](./api/recall)。

---

## 内容中的图片和文件 {#images-and-files-in-your-content}

文档表达的许多信息其实存在于图片中：指令所说的按钮截图、包含升级处理流程的图示，或作为数据本身的图表。`content` 接受按顺序排列的内容块，因此图片可以放在它们所属的位置，而不必事先将其概括成说明文字：

```json
{
  "content": [
    {"type": "text",  "text": "To reset the VPN, click the button shown:"},
    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "..."}},
    {"type": "text",  "text": "...then reconnect."}
  ]
}
```

普通字符串仍然可以像以前一样使用，纯文本存入的行为没有改变。

关键在于**位置**。提取时，文本和图片会按顺序一起发送，因此模型看到介绍句时，也会同时看到旁边的截图。单独看“点击下方所示的按钮”并没有实际含义；与图片放在一起时，它就能成为一条指出该按钮的事实。

### 返回的内容 {#what-comes-back}

事实会以自然语言呈现；`[image: image/png]` 标记附件所在的位置，它不是内容哈希。每条记忆还会带上**用于生成该记忆的附件**，并附有可供获取的 URL：

```json
{
  "text": "The escalation path for a stuck sync begins by contacting Tier 3 Platform.",
  "attachments": [
    {"id": "c414cd0e204d", "kind": "image", "media_type": "image/png",
     "url": "/v1/default/banks/my-bank/attachments/c414cd0e204d"}
  ]
}
```

由正文内容生成的事实不会带有 `attachments`，即使同一份文档中有许多图片也是如此。因此，如果某条记忆旁边显示了附件，就意味着模型查看过该附件并据此生成记忆；附件是证据，不是装饰。

观测会携带其整合来源事实中的附件，因此即使 Recall 或 Reflect 根据观测作答，你仍能看到原始截图。Reflect 的 `based_on`（搭配 `include.facts`）会返回每条引用记忆及其 `attachments`，以及存储时关联的 `document_id`、`chunk_id`、`tags` 和 `metadata`。

### 图表和表格的处理方式 {#what-to-expect-from-charts-and-tables}

包含结构化数据的附件会被逐项转录，而不是概括：每一行、每根柱形或每个标注值都会成为一条独立事实，并保留其标签、数值和绘制方式。因此，一个图表会生成远多于一张截图的记忆。这是有意如此：对包含 20 根柱形的图表作摘要只保留 3 个数值，就会悄悄丢掉另外 17 个；而后续问题可能恰好询问被丢掉的数值。

系统仍会对内容非常密集的页面进行抽样，而不是穷尽所有内容：对列出 100 个条目的信息图进行一次提取，能够捕获其中很大一部分，但不会全部提取。

### 要求 {#requirements}

- 使用能够读取图片的模型。默认情况下，这是记忆库的 retain 模型，但也可以使用其他模型：`HINDSIGHT_API_VLM_MODEL` 指定一个**视觉模型槽位**，仅用于实际包含附件的文本分块；纯文本分块仍由 retain LLM 处理。因此，如果某个记忆库中的文档大多是文字，就可以继续使用低成本文本模型，只在需要看图时支付视觉模型费用。
- 如果该模型无法读取图片，或者 Hindsight 无法确认这一点（网关后端提供混合模型目录时就会如此），存入操作会返回 `422` 并拒绝请求，而不会悄悄丢弃附件。请参阅 [`HINDSIGHT_API_LLM_VISION`](/developer/configuration#llm-provider)。
- 批量存入（`HINDSIGHT_API_RETAIN_BATCH_ENABLED`）不能携带附件，也会返回 `422` 并拒绝请求。

这与 [`POST /files/retain`](/developer/configuration#file-processing) 不同。该接口会将整个文件转换为 Markdown，并将其作为**独立文档**处理。如果要解析扫描报告，它仍然是合适的工具；但它会把文件与引用它的正文分开，而内嵌附件正是为了避免这种分离。

有关存储方式、大小限制和接受的媒体类型，请参阅[在 retain 中使用内嵌附件](/developer/configuration#inline-attachments-in-retain)。

---

## 你会得到什么 {#what-you-get}

`retain()` 完成后：

- **结构化事实**，保留含义、情绪和原因。
- **归一后的实体**，将不同名称变体解析为同一实体。
- 包含实体、时间、语义和因果关联的**知识图谱**。
- 同时支持历史查询和近期内容查询的**时间依据**。
- 可选的**标签**，用于筛选 Recall 结果。

所有内容都会存储在相互隔离的**记忆库**中，供 `recall()` 和 `reflect()` 使用。

---

## 通过任务说明引导提取 {#steering-extraction-with-a-mission}

默认情况下，`retain()` 会从内容中提取所有重要事实。你可以通过**存入任务说明**（`retain_mission`）缩小关注范围，用自然语言描述这个记忆库应该关注哪些内容。

```
例如：始终记录技术决策、API 设计选择和架构权衡。
     忽略会议安排、问候和社交交流。
```

任务说明会与内置规则一起加入提取提示词，用来引导 LLM，但不会替代提取逻辑。它适用于基于 LLM 的提取模式（`concise`、`verbose`、`verbatim`、`custom`），在 `chunks` 模式下则会被忽略。

如果需要更精细的控制，还可以更改**提取模式**：

| 模式 | 适用场景 |
| --- | --- |
| `concise`（*默认*） | 通用场景：选择性提取，速度快。 |
| `verbose` | 需要包含完整上下文和关系的丰富事实时。 |
| `custom` | 需要完全自行编写提取规则时。 |
| `verbatim` | 需要保留原始文本分块，同时由 LLM 提取实体、日期等元数据时。 |
| `chunks` | 需要原样存储文本分块，且不调用 LLM 或提取元数据时。 |

---

通过[记忆库配置 API](/developer/api/memory-banks#retain-configuration)设置 `retain_mission` 和 `retain_extraction_mode`，也可以使用 [`HINDSIGHT_API_RETAIN_MISSION`](/developer/configuration#retain) 和 [`HINDSIGHT_API_RETAIN_EXTRACTION_MODE`](/developer/configuration#retain) 环境变量。

### 当任务说明排除了文档的全部内容 {#when-a-mission-excludes-everything-in-a-document}

任务说明会缩小能够转化为记忆的内容范围；如果内容没有产生事实，就不会生成任何记忆。文档本身仍会存储，但 Recall 和 Reflect 搜索的是记忆，因此不包含任何记忆的文档无法通过这两种方式找到。收紧任务说明会牺牲对原始来源的检索能力，而不只是减少事实创建。

这是正常结果，不是错误：存入操作会成功，操作状态也会报告为已完成。以下两个信号可以说明出现了这种情况：

| 位置 | 检查内容 |
| --- | --- |
| [`retain.completed` webhook](/developer/api/webhooks#retaincompleted) | `data.memory_unit_count: 0` |
| [指标](/developer/monitoring#retain-metrics) | `hindsight.retain.documents.total{outcome="no_facts"}` |

你也可以事后审查：`GET /documents` 会为每份文档返回 `memory_unit_count`，筛选值为 `0` 的文档即可列出当前无法检索到的所有文档。

提取并非完全确定：边界情况的文档某次运行可能会产生事实，另一次却不会。因此，应把结果为零视为“这份文档需要再次处理”，而不是永久结论。

要恢复文档的可检索性，可以放宽任务说明并重新处理文档。系统会从已存储的文本重新提取，无需重新上传：

```
POST /v1/default/banks/{bank_id}/documents/{document_id}/reprocess
```

---

## 观测整合 {#observation-consolidation}

`retain()` 完成后，Hindsight 会在后台自动触发**观测整合**。这个过程会：

1. 根据新事实分析现有观测。
2. 在出现规律时创建新观测。
3. 根据新证据完善已有观测。
4. 追踪支持每条观测的事实。

这个过程异步运行：`retain()` 调用会立即返回，观测整合则在后台继续进行。

有关整合过程的详情，请参阅[观测](./observations)。

---

## 记忆防御与来源溯源信息 {#memory-defense-and-source-provenance}

### receipt_uri（可选） {#receipt_uri-optional}

类型：`string`。

指向外部回执或共同签名系统的可选指针。系统会原样存储，并在针对该输入项作出的任何记忆防御决策所对应的 `security_events.receipt_uri` 中提供此值。

### 422 — 违反记忆防御规则 {#422--memory-defense-violation}

如果目标记忆库启用了记忆防御，并且批次中的**每个**输入项都被策略拦截，请求会返回 `422`，并附上违规列表：

```json
{
  "detail": {
    "violations": [
      { "index": 0, "detector": "prompt_injection", "severity": "high", "message": "..." }
    ]
  }
}
```

如果批次中只有部分输入项被拦截，请求会返回 `200` 并处理未拦截的输入项；被拦截的输入项会从结果中静默移除，其处理决定会记录在 `security_events` 中。

完整说明请参阅[记忆防御](./memory-defense/index.md)。

---

## 后续步骤 {#next-steps}

- [**观测**](./observations) — 说明 Retain 之后如何整合知识。
- [**Recall**](./retrieval) — 说明如何通过多种策略检索相关记忆。
- [**Reflect**](./reflect) — 说明智能体推理循环如何使用观测。
- [**Retain API**](./api/retain) — 提供代码示例和参数说明。
