---
title: "我们如何构建真正会以不同方式思考的性格倾向感知智能体"
authors: [chrislatimer]
date: 2026-03-13T12:00
tags: [disposition, personality, skepticism, empathy, reflect, agents, deep-dive]
image: /img/blog/disposition-aware-agents.webp
---

![Hindsight — 性格倾向感知智能体](/img/blog/disposition-aware-agents.webp)

当我们开始为由 [Hindsight](https://ui.hindsight.vectorize.io) 驱动的智能体赋予“个性”时，我们并不是要再造一层提示词角色扮演。给 AI 智能体设定个性的常见做法，是写上大段“保持怀疑”“富有同理心”“按字面意思解读”之类的指令；这种做法很脆弱，难以维护，也经不起真实工作负载的考验。我们想要的是更精简、更偏架构层面的方案：把少数几种特征融入系统，让它们悄然改变智能体的思考方式，而不只是改变答案的措辞。

<!-- truncate -->

最终形成的是一个由三个数字组成的性格倾向模型：怀疑倾向、字面解读倾向和共情倾向。我们用这三个维度塑造不同的智能体推理风格，而不必把它们写成额外的提示词段落。

## 问题：一种 AI 智能体推理风格无法胜任所有工作 {#the-problem-one-ai-agent-reasoning-style-for-every-job}

大多数系统只提供一种内部推理风格，却要求你把它用于所有任务：

- **事实核查员**应该积极寻找矛盾。
- **法律助理**必须按字面意思解读语言。
- **咨询型智能体**应该非常关注情绪背景。
- **创意搭档**应该多说“是的，而且……”而不是“其实……”。

常见的变通办法是不断叠加指令：

```text
"Be skeptical of all claims. Question sources. Look for contradictions..."
"Interpret everything literally. Don't make assumptions..."
"Be empathetic. Consider emotional context..."
```

这种提示词工程会带来几个问题：

- **让系统提示变得臃肿。**
- **容易被覆盖**，也容易与特定任务的指令冲突。
- **难以扩展**：当你想要数十种不同的智能体“角色”时尤其如此。

我们希望只用三个数字，就能表达“这个记忆库中的智能体持怀疑态度、倾向按字面解读、共情程度较低”，然后让系统架构完成其余工作。

## 三维性格倾向模型

最终确定了三个维度，每个维度的取值范围都是 1–5：

### 怀疑倾向（1–5）

- **1 – 信任**：照单全收，相信对方出于善意。
- **3 – 均衡**：具备通常水平的批判性思维。
- **5 – 高度怀疑**：寻找不一致之处，更倾向于参考多个来源，不轻易接受主张。（相关内容：[Hindsight 如何解决记忆冲突](/blog/2026/02/09/resolving-memory-conflicts)。）

### 字面解读倾向（1–5）

- **1 – 偏重解读**：善于理解言外之意，也愿意推断。
- **3 – 均衡**：兼顾字面理解与推断。
- **5 – 高度按字面解读**：严格依据明确陈述的内容，避免作出假设。

### 共情倾向（1–5）

- **1 – 超然**：以正确性为先，不优先考虑感受。
- **3 – 均衡**：同时考虑事实和情绪背景。
- **5 – 高度共情**：充分权衡对人的影响和情绪状态。

这三个数字保存在[记忆库配置文件](/developer/api/memory-banks#disposition_skepticism)中，不会以“做 X，不要做 Y”这样的规则形式出现。

## 为什么选择这三个维度和 1–5 的量表？

我们尝试过更丰富的个性空间（包括完整的[大五人格](https://en.wikipedia.org/wiki/Big_Five_personality_traits)向量），但发现，对于我们实际需要的推理控制，几乎所有差异都可以归结为三个维度：

- **信任与核验 → 怀疑倾向**
  智能体应该多快接受一项主张，还是应该要求更多证据？
- **按字面解读与解释性阅读 → 字面解读倾向**
  智能体可以在多大程度上超越原文内容进行推断？
- **抽象正确性与人的影响 → 共情倾向**
  智能体应该在多大程度上考虑人们的感受、经历和背景？

这几个维度：

- **足够彼此独立**，能够区分实际角色（事实核查员、咨询师、法律助理和创意搭档）。
- **足够精简**，让你在脑中就能推敲它们，无需打开电子表格。

我们采用 1–5 的整数刻度，而不是连续浮点数，因为：

- **一目了然**：“怀疑倾向=4”很容易阅读和讨论。
- **便于调整**：你能体会 2 和 4 的差别，无需纠结 0.73 和 0.76。
- **表现稳定**：自由度越少，出现奇怪行为边界情况的可能性就越低。

早期内部版本使用大五人格风格的向量；现在我们将其收敛为这三个维度，并且只公开这三个维度。这样既保留了大部分关键表达能力（控制智能体如何推理），又能用适合放进 JSON 记忆库配置的接口来呈现。

## 智能体的性格倾向如何影响推理和记忆检索 {#how-agent-disposition-shapes-reasoning-and-memory-retrieval}

关键的设计选择是：我们不把这些特征转化为更多指令，而是将它们作为元数据提供出来，让系统堆栈的其余部分作出响应。

### 1. 将性格倾向作为元数据，而不是长篇说教 {#1-disposition-as-metadata-not-a-lecture}

我们把性格倾向作为记忆库上下文的一部分加入系统提示，而不是放在行为指令段落中：

```python
def build_agent_prompt(query: str,
                       context_history: list[dict],
                       bank_profile: dict,
                       additional_context: str | None = None):
    parts = []

    name    = bank_profile.get("name", "Assistant")
    mission = bank_profile.get("mission", "")

    parts.append(f"## Memory Bank Context\nName: {name}")
    if mission:
        parts.append(f"Mission: {mission}")

    disposition = bank_profile.get("disposition", {})
    if disposition:
        traits = []
        if "skepticism" in disposition:
            traits.append(f"skepticism={disposition['skepticism']}")
        if "literalism" in disposition:
            traits.append(f"literalism={disposition['literalism']}")
        if "empathy" in disposition:
            traits.append(f"empathy={disposition['empathy']}")
        if traits:
            parts.append(f"Disposition: {', '.join(traits)}")

    # ... 添加工具说明、查询等 ...
```

现代模型很善于捕捉这类上下文线索。`Disposition: skepticism=5, literalism=4, empathy=2` 就足以让模型调整检索方式、谨慎程度和结论的措辞。

### 2. 以不同方式遍历记忆层次结构 {#2-different-navigation-of-the-memory-hierarchy}

Hindsight 提供了[三层记忆堆栈](/blog/2026/03/12/spreading-activation-memory-graphs)：

- **心智模型**——由人撰写或人工维护的摘要。
- **观测**——从原始记忆中整合得出的知识。
- **原始事实**——单条记忆或事件，是核验依据的权威来源。

提示会说明各层的用途；性格倾向则会改变智能体在层次结构中上下遍历的积极程度：

- **怀疑倾向高** → 经常深入查阅原始事实，并更频繁地交叉核对心智模型和观测。
- **字面解读倾向高** → 更看重原始事实和精确的观测，较少依赖解释性的心智模型。
- **共情倾向高** → 更偏好能够捕捉人物、关系和情绪模式的心智模型与观测。

工具相同，使用时形成的“习惯”却不同。

### 3. 习惯各异的工具驱动循环 {#3-tool-driven-loops-with-different-habits}

智能体进行反思时，不必从预先填充好的上下文开始，而是从工具入手：`search_mental_models`、`search_observations`、`recall`、扩展函数等。性格倾向通过记忆库配置文件传入：

```python
async def run_reflect_agent(
    llm_config: LLMProvider,
    bank_id: str,
    query: str,
    bank_profile: dict[str, Any],  # 包含 disposition
    search_mental_models_fn,
    search_observations_fn,
    recall_fn,
    expand_fn,
    ...
):
    # 推理循环：决定调用哪些工具、调用顺序以及调用频率。
```

实际表现如下：

- **怀疑倾向↑** → 调用更多工具，增加“核验”步骤，推理链更长。
- **字面解读倾向↑** → 查询范围更窄、更精确；较少作投机性扩展。
- **共情倾向↑** → 更多使用用户历史、关系记忆和“软性”上下文。

我们不会把这些行为硬编码进去；它们会在这些特征与一致的工具接口相结合时自然呈现。

## 智能体个性配置：相同代码，不同推理方式 {#agent-personality-profiles-same-code-different-reasoning}

这些只是 JSON 配置，却会产生明显不同的推理风格：

| 配置 | 怀疑倾向 | 字面解读倾向 | 共情倾向 | 典型行为 |
|---------|-----------|-----------|---------|-----------------|
| **事实核查员** | 5 | 4 | 2 | 频繁调用原始事实工具，标记待更新的观测，使用谨慎措辞并明确说明保留意见 |
| **咨询师** | 2 | 2 | 5 | 接受用户的表述方式，从对话历史中体会言外之意，优先提供情感上的认同 |
| **法律助理** | 3 | 5 | 2 | 引用记忆中的原文，避免推断未明确表达的意图，专注于严谨、类似文档分析的推理 |
| **创意搭档** | 1 | 1 | 4 | 对想法回应“是的，而且……”，从松散相关的记忆中汲取灵感，关注情感共鸣 |

它们都运行在同一条代码路径上，区别只有三个整数。

## 性格倾向如何发挥作用：同一个问题，两种不同的智能体 {#disposition-in-action-the-same-question-two-different-agents}

下面用一个具体例子说明：面对同一记忆库中的同一个查询，两个性格倾向不同的智能体会如何作答。

**查询**：“团队准备好迎接下周的产品发布了吗？”

**智能体 A**（怀疑倾向=2，字面解读倾向=2，共情倾向=4）：
> 根据团队最近的更新，进展看起来很顺利。Sarah 上周四说自己感到分身乏术，也许值得直接找她了解一下。营销素材已经完成，工程团队昨天也解决了最后一个阻塞问题。团队似乎谨慎乐观。

**智能体 B**（怀疑倾向=5，字面解读倾向=4，共情倾向=2）：
> 截至昨天，发布检查清单中的五项已有三项标记为完成。还有两项未完成：QA 签核（最后更新于 3 天前，此后状态没有变化）和合作伙伴通知邮件（分配给 Sarah，但没有完成记录）。我在原始事实中找不到已确认完成 QA 的记录。建议先核实，再确认是否准备就绪。

记忆相同，工具相同，模型相同。性格倾向不同，答案也不同；具体采用哪种答案，取决于提问者及其提问原因。两种答案都可能有用。

## 多智能体系统中的性格倾向感知智能体 {#disposition-aware-agents-in-multi-agent-systems}

一旦把性格倾向作为一等配置，就很容易将多个智能体组合起来：

- **偏怀疑的核查智能体**可以审查创意型或乐观型智能体的输出。
- **高共情智能体**可以负责面向用户的交互，同时由低共情、高字面解读倾向的智能体处理内部推理。
- 你可以把一个查询**分发给多种性格倾向配置**，并排展示它们各自的观点。

你无需为每种配置分别创建提示或模型；只需调整性格倾向，并复用相同的基础设施即可。（具体示例请参阅[我们如何接入 CrewAI](/blog/2026/03/02/crewai)。）

## 调整建议：选择合适的性格倾向 {#tuning-guidance-picking-the-right-disposition}

如果你正在为新的记忆库智能体做配置，可以从以下设置开始：

- **客户支持**：怀疑倾向=2，字面解读倾向=3，共情倾向=4——信任客户，以足够精确的方式提供帮助，并关心客户的体验。
- **研究助理**：怀疑倾向=4，字面解读倾向=3，共情倾向=2——核验主张，允许一定程度的推断，优先保证准确性而非照顾感受。
- **高管简报**：怀疑倾向=3，字面解读倾向=4，共情倾向=3——均衡核验，紧贴事实，并适度关注组织动态。

从中间值（3, 3, 3）开始，每次调整一个维度。只需尝试几次查询，你就能感受到差异。如果想在本地试用，可以参考[如何使用 Ollama 运行 Hindsight](/blog/2026/03/10/run-hindsight-with-ollama)。

## 为什么基于特征的 AI 智能体个性设计有效 {#why-trait-based-ai-agent-personality-works}

我们并不是靠编写更巧妙的指令来塑造出不同的智能体“个性”，而是：

1. **选择三个维度**，精准控制智能体如何处理证据、推断和人的背景。
2. **将这些维度编码为紧凑的元数据**，而不是冗长的指令。
3. **让我们的[记忆层次结构和工具驱动循环](/developer/retrieval)**为这些维度改变行为提供空间。

这样一来，智能体不只是听起来不同，处理记忆的方式也确实不同，从而帮助它们按你的期望行事。

---

*Hindsight 为你的 AI 智能体提供持久、结构化的记忆，并支持基于性格倾向的推理。[了解 Hindsight 的工作方式](/developer/retrieval)，或[免费开始使用](https://ui.hindsight.vectorize.io)。*
