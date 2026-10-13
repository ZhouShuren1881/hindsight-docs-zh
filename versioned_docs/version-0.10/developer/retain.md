---
sidebar_position: 2
---

import Figure from '@site/src/components/Figure';
import retainFigure from '@site/figures/retain.json';

# 记忆存储：Hindsight 如何存储记忆 {#retain-how-hindsight-stores-memories}

调用 `retain()` 时，Hindsight 会将对话和文档转换为结构化、可搜索的记忆，保留其含义和上下文。

## 记忆存储的作用 {#what-retain-does}

<Figure doc={retainFigure} />

---

## 丰富的事实提取 {#rich-fact-extraction}

Hindsight 不仅存储说过的话，还会捕捉**为什么**、**如何发生**以及**意味着什么**。

### 会提取哪些内容 {#what-gets-captured}

存储「Alice 去年春天加入了 Google，并对那里的研究机会感到非常兴奋」时，Hindsight 会提取：

**核心事实：**
- Alice 加入了 Google
- 这发生在去年春天

**情绪和含义：**
- 她非常兴奋
- 这对她而言是一个重要机会

**原因：**
- 她选择加入是因为那里的研究机会

这样的丰富提取让你以后可以询问「Alice 为什么加入 Google？」，并得到有意义的回答，而不只是「她加入了 Google」。

### 保留上下文 {#preserving-context}

传统系统会将信息拆散：
- 「Bob 建议叫 Summer Vibes」
- 「Alice 想要一个独特的名字」
- 「他们选择了 Beach Beats」

Hindsight 会保留完整叙事：
- 「Alice 和 Bob 讨论如何为夏日派对的播放列表命名。Bob 建议用 'Summer Vibes'，因为它朗朗上口，但 Alice 想要一个独特的名字。他们最终选定了 'Beach Beats'，因为这个名字充满趣味。」

这意味着搜索结果会包含完整上下文，而不是彼此断开的片段。

---

## 两种事实类型 {#two-types-of-facts}

每条事实都会根据**它记录的是谁的视角**进行分类：记忆库所属的智能体，或外部世界。

| 类型 | 记录的内容 | 示例 |
|------|------------|------|
| **experience** | 记忆库自身的智能体采取行动、观察或互动的经历，即它的第一人称历史 | 「我向 Alice 推荐了 Python」 |
| **world** | 关于其他人、地点、事物和事件的事实 | 「Alice 在 Google 工作」 |

分类依据是**谁在说话**，而不是语法。只有当说话者*就是*记忆库所属的智能体时，第一人称陈述才是 `experience`。相同的话由其他人说出时，就是关于那个人的 `world` 事实：

- 智能体自己的日志：「我修复了身份验证的缺陷」→ **experience**（行动由智能体完成）。
- 用户对智能体说：「我买了一辆 Tesla」→ **world**（这是关于*用户*的事实，而不是智能体的事实）。

**在每个条目的 `context` 中描述说话者**，以引导正确分类。存储对话记录或第三方内容时，使用*「客户 Maria 正在说话」*这样的上下文，可确保她的第一人称陈述被存储为关于 Maria 的 `world` 事实，而不会被误认为智能体自己的经历。对于智能体自身的日志，*「助手正在说话」*这样的上下文会将其第一人称陈述归为智能体的 `experience` 事实。

**注意：**`retain()` 操作完成后，观察会在后台自动整合。整合过程会从新事实中归纳规律，加入记忆库的知识库。

---

## 实体识别 {#entity-recognition}

Hindsight 会自动识别并跟踪**实体**，即重要的人物、组织和概念。

### 会识别哪些内容 {#what-gets-recognized}

- **人物：**「Alice」、「Smith 博士」、「Bob Chen」
- **组织：**「Google」、「MIT」、「OpenAI」
- **地点：**「巴黎」、「中央公园」、「加利福尼亚」
- **产品与概念：**「Python」、「TensorFlow」、「机器学习」

### 实体归一 {#entity-resolution}

同一实体的不同称呼会通过**名称模糊匹配**归一，共现关系和时间上的接近程度会强化这一判断：
- 「Alice」+「Alice Chen」+「Alice C.」→ 同一个人

归一以名称相似性为依据，因此相近的名称变体会自动合并。彼此不像的名称（例如昵称和毫不相似的正式姓名）不会仅凭名称归一，不过共同出现的其他实体仍可能将它们联系起来。

**为什么这很重要：**你可以询问「我对 Alice 有哪些了解？」，即使某些对话中称她为「Alice Chen」，也能得到所有相关信息。

归一需要判断，也可能出现另一种结果：在历史记录丰富的记忆库中，一个新出现的简短姓名，如果与已有实体的名字相似，且与该实体已经关联的其他实体共同出现，就可能被合并到已有实体，而不是成为独立实体。如果你发现关于新人物的事实被关联到不相关的实体，请参阅[实体归一如何做出判断](/developer/configuration#how-entity-resolution-decides)，了解比较的内容以及如何通过配置让匹配更严格。

### 根据上下文消除歧义 {#context-aware-disambiguation}

如果「Alice」多次与「Google」和「Stanford」一起出现，那么新出现且提及这些实体的「Alice」很可能是同一个人。Hindsight 会利用共现规律区分同名人物。

### 实体标签 {#entity-labels}

你可以定义一组受控的 `key:value` 分类标签（例如 `pedagogy:scaffolding`、`engagement:active`），在记忆存储时提取并保存为实体。由于标签会成为实体，它们会自动在知识图谱中连接相关记忆，同时改善语义检索和关键词检索。标签也可以选择写入记忆单元的标签字段，以便在记忆召回和反思时使用标准的标签过滤。

与普通实体不同，标签实体不会因名称相似而合并。不同的标签值必须保持独立，因此它们只通过精确匹配归一，完全不参与名称模糊匹配。

完整配置说明请参阅[记忆库配置中的 entity_labels](/developer/api/memory-banks#entity-labels)。

---

## 建立关联 {#building-connections}

记忆并非孤立存在。Hindsight 会创建包含四种关联的**知识图谱**。

### 实体关联 {#entity-connections}

提及同一实体的所有事实都会相互连接。

**支持：**「告诉我关于 Alice 的所有信息」→ 检索所有与 Alice 相关的事实

### 时间关联 {#time-based-connections}

时间相近的事实会相互连接，日期越接近，关联越强。

**支持：**「那段时间还发生了什么？」→ 查找上下文相关的事件

### 语义关联 {#meaning-based-connections}

语义相似的事实会相互连接，即使它们使用不同的措辞。

**支持：**「告诉我关于类似主题的信息」→ 查找主题相关的信息

### 因果关联 {#causal-connections}

系统会明确跟踪因果关系。

**支持：**「为什么会发生这件事？」→ 追溯推理链
**示例：**「Alice 感到精疲力尽」← 原因是 ←「她每周工作 80 小时」

---

## 理解时间 {#understanding-time}

Hindsight 会跟踪**两个时间维度**。

### 事件发生的时间 {#when-it-happened}

对于事件（会议、旅行、里程碑），Hindsight 会记录它们发生的时间。
- 「Alice 在 2024 年 6 月结婚」→ 发生于 2024 年 6 月

对于一般事实（偏好、特征），则没有具体的发生时间。
- 「Alice 更喜欢 Python」→ 持续存在的偏好

### 你得知事实的时间 {#when-you-learned-it}

Hindsight 也会跟踪你何时告诉它每条事实。

**为什么两个维度都需要？**

假设有人在 2025 年 1 月告诉你「Alice 在 2024 年 6 月结婚」：
- **历史查询**可以工作：「Alice 在 2024 年做了什么？」→ 找到结婚事件
- **时效性排序**可以工作：最近提及的信息在搜索中获得更高优先级
- **时间推理**可以工作：「她结婚之前发生了什么？」→ 找到更早的事件

如果不做这一区分，旧信息要么无法按日期搜索，要么会被认为不相关。

---

## 为记忆添加标签 {#tagging-memories}

标签可以限定可见范围，适用于一个记忆库服务多个用户、但每个用户只应看到相关记忆的场景。

- **条目标签：**为单条记忆标记特定范围
- **文档标签：**将标签应用于一个批次中的所有条目
- **标签过滤：**在记忆召回和反思时按标签过滤

代码示例请参阅[记忆存储 API](./api/retain)，过滤选项请参阅[记忆召回 API](./api/recall)。

---

## 内容中的图片和文件 {#images-and-files-in-your-content}

文档中的许多信息实际上存在于图片里：操作说明所指按钮的截图、包含升级处理路径的流程图，或本身就承载数据的图表。`content` 接受有序的内容块列表，让这些内容出现在应有的位置，而不必事先概括为图注：

```json
{
  "content": [
    {"type": "text",  "text": "要重置 VPN，请点击图中所示的按钮："},
    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "..."}},
    {"type": "text",  "text": "……然后重新连接。"}
  ]
}
```

纯字符串仍然像以前一样可用，纯文本记忆存储的行为没有改变。

关键是**位置**。提取过程会按顺序同时发送文字和图片，让模型在阅读介绍语句时看到旁边的截图。「点击下方所示按钮」单独存在时没有意义；放在图片旁边，它就能成为明确指出按钮的事实。

### 返回的内容 {#what-comes-back}

事实文本保持自然可读。`[image: image/png]` 标记附件原来的位置，不会显示内容哈希。每条记忆都携带**生成它时使用的附件**，并提供可获取附件的 URL：

```json
{
  "text": "同步卡住时，升级处理路径的第一步是联系三级平台支持团队。",
  "attachments": [
    {"id": "c414cd0e204d", "kind": "image", "media_type": "image/png",
     "url": "/v1/default/banks/my-bank/attachments/c414cd0e204d"}
  ]
}
```

从正文中提取的事实不会带有 `attachments`，即使同一文档包含大量图片。因此，记忆旁显示附件，意味着模型生成这条记忆时查看过它；它是证据。

观察会携带其整合来源事实的附件。因此，即使记忆召回或反思使用观察而非原始事实回答问题，截图仍会呈现给你。反思的 `based_on`（配合 `include.facts`）会返回每条被引用的记忆及其 `attachments`，以及存储时的 `document_id`、`chunk_id`、`tags` 和 `metadata`。

### 图表和表格的处理方式 {#what-to-expect-from-charts-and-tables}

包含结构化数据的附件会被转录，而非概括：每一行、每个柱形或带标签的数值都会成为独立事实，保留标签、数值和绘制方式。因此，图表产生的记忆数量远多于截图，这是有意设计的。如果将一张含二十根柱形的图表概括为摘要，可能只留下三个数值，悄然丢掉其余十七个，而后续问题却可能恰好询问被丢掉的那些数值。

非常密集的页面仍会采用采样，而非穷尽所有内容：对列有一百个条目的信息图执行一次提取，能够捕捉其中很大一部分，但不会捕捉全部。

### 要求 {#requirements}

- 模型必须能够读取图片。默认使用记忆库的记忆存储模型，但也可以另行指定：`HINDSIGHT_API_VLM_MODEL` 定义一个**视觉模型槽位**，仅用于真正包含附件的文本块，所有纯文本块仍使用记忆存储 LLM。因此，以正文为主的记忆库可以继续使用成本较低的文本模型，只在确有图片需要查看时支付视觉处理费用。
- 如果模型无法读取图片，或 Hindsight 无法判断其是否支持图片（例如提供混合模型目录的网关后端），记忆存储会以 `422` 拒绝请求，而不会静默丢弃附件。参阅 [`HINDSIGHT_API_LLM_VISION`](/developer/configuration#llm-provider)。
- 批量记忆存储（`HINDSIGHT_API_RETAIN_BATCH_ENABLED`）不支持附件，也会以 `422` 拒绝请求。

这与 [`POST /files/retain`](/developer/configuration#file-processing) 不同，后者会将整个文件转换为 Markdown，并作为**独立**文档存储。需要解析扫描报告时，它仍然适用，但会将文件与引用它的正文分开，而内联附件正是为了避免这种分离。

存储、大小限制和可接受的媒体类型请参阅[记忆存储中的内联附件](/developer/configuration#inline-attachments-in-retain)。

---

## 你会得到什么 {#what-you-get}

`retain()` 完成后，你将获得：

- **结构化事实：**保留含义、情绪和原因
- **归一后的实体：**统一不同的名称变体
- **知识图谱：**包含实体、时间、语义和因果关联
- **时间依据：**支持历史查询和基于时效性的查询
- **可选标签：**用于记忆召回时的过滤

这些内容都存储在你独立的**记忆库**中，可供 `recall()` 和 `reflect()` 使用。

---

## 通过使命引导提取 {#steering-extraction-with-a-mission}

默认情况下，`retain()` 会提取内容中的所有重要事实。你可以使用**记忆存储使命**（`retain_mission`）缩小关注范围，以自然语言描述这个记忆库应重点关注什么。

```
例如：始终包含技术决策、API 设计选择和架构权衡。
      忽略会议安排、问候和社交交流。
```

使命会与内置规则一起注入提取提示词，引导 LLM，但不会替换提取逻辑。它适用于基于 LLM 的提取模式（`concise`、`verbose`、`verbatim`、`custom`），在 `chunks` 模式下会被忽略。

如需更细致的控制，还可以更改**提取模式**：

| 模式 | 适用场景 |
|------|----------|
| `concise` *（默认）* | 通用场景，选择性提取，速度快 |
| `verbose` | 需要更丰富的事实，包含完整上下文和关系 |
| `custom` | 希望完全自行编写提取规则 |
| `verbatim` | 需要保留原始文本块，并由 LLM 提取实体、日期等元数据 |
| `chunks` | 希望原样存储文本块，不调用 LLM，也不提取元数据 |

通过[记忆库配置 API](/developer/api/memory-banks#retain-configuration)，或 [`HINDSIGHT_API_RETAIN_MISSION`](/developer/configuration#retain) 和 [`HINDSIGHT_API_RETAIN_EXTRACTION_MODE`](/developer/configuration#retain) 环境变量设置 `retain_mission` 和 `retain_extraction_mode`。

### 当使命排除文档的全部内容时 {#when-a-mission-excludes-everything-in-a-document}

使命会缩小可成为记忆的内容范围，而没有提取出事实的内容也不会生成任何记忆。文档本身仍会存储，但 `recall` 和 `reflect` 搜索的是记忆，因此两者都无法找到没有记忆的文档。收紧使命不仅减少事实生成，也会牺牲对原始来源的检索能力。

这是正常结果，并非错误：记忆存储成功，操作会报告为已完成。以下两个信号可帮助你识别这种情况：

| 位置 | 需要查看的内容 |
|------|----------------|
| [`retain.completed` webhook](/developer/api/webhooks#retaincompleted) | `data.memory_unit_count: 0` |
| [指标](/developer/monitoring#retain-metrics) | `hindsight.retain.documents.total{outcome="no_facts"}` |

也可以事后审计：`GET /documents` 会返回每个文档的 `memory_unit_count`，筛选值为 `0` 的文档即可列出当前无法检索的全部文档。

提取过程并非完全确定：处于边界的文档可能在一次运行中产生事实，而在下一次运行中没有事实。应将零值视为「这个文档需要再次处理」，而不是永久结论。

要恢复文档，扩大使命范围并重新处理即可。系统会重新提取已存储的文本，无需再次上传：

```
POST /v1/default/banks/{bank_id}/documents/{document_id}/reprocess
```

---

## 观察整合 {#observation-consolidation}

`retain()` 完成后，Hindsight 会自动在后台触发**观察整合**。该过程会：

1. 将新事实与已有观察进行对照分析
2. 在发现规律时创建新的观察
3. 根据新证据完善已有观察
4. 跟踪支持每条观察的事实

这个过程是异步的。`retain()` 调用会立即返回，整合则在后台进行。

整合机制的详细说明请参阅[观察](./observations)。

---

## 记忆防御与来源溯源 {#memory-defense-and-source-provenance}

### receipt_uri（可选） {#receipt_uri-optional}

类型：`string`。

可选的外部回执或共同签名系统指针。系统会原样存储它，并在对该条目做出的任何记忆防御决策的 `security_events.receipt_uri` 中展示。

### 422 — 违反记忆防御规则 {#422--memory-defense-violation}

当目标记忆库启用记忆防御，且批次中的**所有**条目都被策略阻止时，请求会返回 422 和违规列表：

```json
{
  "detail": {
    "violations": [
      { "index": 0, "detector": "prompt_injection", "severity": "high", "message": "..." }
    ]
  }
}
```

如果批次仅有部分条目被阻止，则返回 200，并处理未被阻止的条目；被阻止的条目会从结果中静默丢弃，相关决策记录在 `security_events` 中。

完整指南请参阅[记忆防御](./memory-defense/index.md)。

---

## 后续步骤 {#next-steps}

- [**观察**](./observations) — 记忆存储后如何整合知识
- [**记忆召回**](./retrieval) — 如何通过多种搜索策略检索相关记忆
- [**反思**](./reflect) — 智能体循环如何使用观察
- [**记忆存储 API**](./api/retain) — 代码示例和参数
