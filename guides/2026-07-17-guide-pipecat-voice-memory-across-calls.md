---
title: "指南：使用 Pipecat 构建能跨通话记住来电者的语音智能体"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, pipecat, voice, memory]
description: "借助 Hindsight，为 Pipecat 语音智能体提供按来电者隔离的跨通话记忆，让回访的来电者不必再解释自己是谁。"
image: /img/guides/guide-pipecat-voice-memory-across-calls.svg
hide_table_of_contents: true
---

![指南：使用 Pipecat 构建能跨通话记住来电者的语音智能体](/img/guides/guide-pipecat-voice-memory-across-calls.svg)

如果你希望 Pipecat 语音智能体能够**跨通话记住来电者**，诀窍不是写更长的提示，而是为每位来电者单独设置记忆库。同一个人下周再次来电时，智能体就应该知道对方是谁、上次提出了什么请求以及有什么偏好，而不必让对方从头解释一遍。

Pipecat 负责实时音频和 LLM 编排，Hindsight 负责记忆循环。一个 `HindsightMemoryService` FrameProcessor 位于用户聚合器与 LLM 服务之间：它会在每轮对话前召回相关记忆，并在之后存入已完成的轮次。大多数人容易忽略的是范围设置：记忆库 ID 必须对应*来电者*的身份，而不是一次通话。设置正确后，跨通话的连续性就会自然形成。

这是一份策略指南，不是全新安装教程。本文假设你已将 `HindsightMemoryService` 接入可运行的管道（或者会按下方链接的设置指南完成接入），重点介绍如何按来电者划分记忆库、存入什么内容、何时召回，以及哪些语音场景特有的取舍会影响召回的效果。

<!-- truncate -->

> **快速解答**
>
> 1. 从*来电者*而不是一次通话中生成稳定的记忆库 ID，例如电话号码或账户 ID。
> 2. 将 `HindsightMemoryService` 接在 `user_aggregator` 和 `llm_service` 之间，并使用该 `bank_id`。
> 3. 让记忆在通话开始时进行召回，这样智能体就能带着上下文问候回访的来电者。
> 4. 每轮对话结束后，以即发即忘的方式存入记忆，让下一次通话能用到本次通话的细节。
> 5. 用同一身份拨打两次，确认第二次通话能记起第一次通话，以此验证配置。

## 为什么语音智能体会忘记回访的来电者 {#why-voice-agents-forget-returning-callers}

默认的语音管道在不同会话之间不保留状态。每次通话都会创建新的 LLM 上下文，因此来电者一挂断电话，他们说过的内容就全部消失了。下一次来电又得从头开始：“请问您的姓名和账号是多少？”——还是同样的问题。

这对一次性 IVR 来说没问题，但如果智能体应该让来电者觉得“它认识我”，这种体验就完全不对。解决办法不是把以前的对话记录塞进系统提示里（记录会不断变长，超出延迟预算），而是使用记忆存储：它只召回与当前轮次相关的内容，并在通话过程中存入新事实。Hindsight 就是这样的存储，而 `HindsightMemoryService` 是将它接入 Pipecat 的 FrameProcessor。

## 为每位来电者划分一个记忆库 {#scope-a-bank-per-caller}

Hindsight 中的记忆按记忆库隔离。如果两位来电者共用一个记忆库，他们的上下文就会互相泄漏——这会让语音智能体很快显得出了问题。因此，最重要的决定是：**`bank_id` 对应什么身份？**

要实现跨通话记忆，记忆库必须绑定到一个人，而不是一次会话：

- **电话号码**是电话传输场景下自然的标识，因为它在不同通话间保持稳定，而且智能体接听前就能获取。
- **账户 ID 或客户 ID**更合适，前提是你已经验证了用户身份，因为一个人可能会用多个号码来电。
- **避免**使用临时的通话 ID 或会话 ID。每次通话各用一个记忆库，就意味着每次通话都像第一次——这正是你想解决的问题。

```python
from hindsight_pipecat import HindsightMemoryService

# caller_number 来自传输层或电话服务提供商
memory = HindsightMemoryService(
    bank_id=f"caller-{caller_number}",   # 每位来电者对应的稳定密钥
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)
```

由于记忆库严格隔离，`caller-+15551234567` 只会召回该来电者的历史记录。选择你信任且最稳定的身份，并将其规范化为一致的格式，确保同一个人始终对应同一个记忆库。

## 在通话开始时召回，在通话结束时存入 {#recall-at-the-start-of-a-call-retain-at-the-end}

先召回、后存入的循环能让按来电者划分的记忆库实现连续记忆。下面说明它如何接入管道。

`HindsightMemoryService` 会处理每个 `OpenAILLMContextFrame`（以及较新的 `LLMContextFrame`）。每轮对话都会执行两项操作：

1. **存入（Retain）**——任何新完成的用户与助手轮次对都会异步发送到 Hindsight，采用即发即忘的方式，不会阻塞响应路径。
2. **召回（Recall）**——将最新的用户消息用作搜索查询，并在 LLM 读取上下文前，把结果作为 `<hindsight_memories>` 系统消息注入。

对于跨通话记忆，关键时刻是**新通话的第一轮**。回访的来电者开口后，系统会从对应记忆库中召回信息，呈现重要内容——例如来电者姓名、尚未解决的问题和明确表达的偏好。这样，智能体给出的第一个实质性回复就能体现它知道对方是谁，无须再问一遍。

至于存入什么，不必记录每个“嗯”或附和声。Hindsight 存入的轮次对包含实质信息：来电者的请求、作出的决定、表达的偏好以及智能体作出的承诺。这些才是下一次通话应该召回的内容。如果通话里有大量无关闲聊，与其事后过滤，不如收紧提供给智能体的内容——干净的轮次才能形成干净的记忆。

```python
from pipecat.pipeline.pipeline import Pipeline

pipeline = Pipeline([
    transport.input(),
    stt_service,
    user_aggregator,
    memory,            # ← 在 LLM 之前召回，在轮次结束后存入
    llm_service,
    assistant_aggregator,
    tts_service,
    transport.output(),
])
```

组件位置至关重要：`memory` 必须位于 `user_aggregator` **之后**（这样才能看到用于查询的完整用户上下文），并位于 `llm_service` **之前**（这样模型生成回复前才能收到召回的上下文）。如果把它放在 LLM 之后，召回的内容就无法影响回复。

## 将 Pipecat 接入 Hindsight {#connect-pipecat-to-hindsight}

本指南假设集成已经安装并接入管道。如果还没有完成，请先阅读设置指南：[使用 Hindsight 为 Pipecat 语音智能体添加记忆](/guides/2026/05/04/guide-pipecat-memory-with-hindsight)。该指南介绍如何运行 `pip install hindsight-pipecat`、连接 Hindsight Cloud 或本地服务器，以及如何配置基础管道。完成后再回到本文了解按来电者划分记忆的策略。

## 语音场景特有的考量：延迟和召回预算 {#voice-specific-concerns-latency-and-recall-budget}

与文本聊天相比，语音场景对延迟的容忍度很低——来电者会注意到长时间的沉默。这会影响记忆的配置方式。

- **存入操作本身不会阻塞。** 已完成的轮次会异步存入，因此存储记忆不会增加响应路径的耗时。你无需为了延迟调节这项操作，但要确保它已启用。
- **召回位于关键路径上。** 召回发生在 LLM 运行之前，因此它的耗时会计入首个 token 的生成时间。这时召回预算就很重要。`HindsightMemoryService` 提供 `recall_budget`（`"low"`、`"mid"`、`"high"`）和 `recall_max_tokens`。

```python
memory = HindsightMemoryService(
    bank_id=f"caller-{caller_number}",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    recall_budget="low",       # 实时语音优先考虑延迟
    recall_max_tokens=2048,    # 限制注入的上下文，让 TTS 快速启动
)
```

对于实时电话，建议从 `recall_budget="low"` 和适中的 `recall_max_tokens` 开始。语音智能体很少需要大量回忆上下文，只需要两三个事实，就足以让来电者感觉自己被记住了。只有在测量后确认延迟预算有余量，或者用于非实时渠道时，才考虑使用 `"mid"` 或 `"high"`。如果召回感觉迟缓，几乎总是因为预算对语音场景设得过高，而不是存储速度太慢。

你也可以分别通过 `enable_recall` 和 `enable_retain` 开关召回与存入功能。例如，在逐步推出期间，可以先静默存入记忆，之后再开启召回。

## 验证跨通话记忆 {#verify-cross-call-memory}

核心目标是让*第二次*通话记起*第一次*通话。直接测试即可：

1. 使用已知身份来电（或者运行文本模拟器并传入 `--bank caller-demo`），说出一条智能体应该记住的信息，例如账户详情、偏好或尚未解决的请求。
2. 结束通话，让最后几轮内容完成存入。
3. 使用同一身份再次来电，确保解析出的 `bank_id` 相同。
4. 根据之前的信息提出后续问题，不要重复说明那条信息。
5. 确认智能体的回答使用了第一次通话中的细节。

如果第二次通话成功召回了第一次通话的信息，按来电者划分记忆的配置就正常工作了。如果没有，请确认两次通话解析出的 `bank_id` 完全相同，确认 `memory` 位于 `llm_service` 之前，并确认第一次通话时已完成存入（可开启调试日志）。软件包中的 `examples/interactive_chat.py` 模拟器可以让你在不配置电话服务的情况下运行这个流程：

```bash
python examples/interactive_chat.py --bank caller-demo
```

## 常见错误 {#common-mistakes}

- **将通话 ID 或会话 ID 用作记忆库标识。** 每次通话都会变成第一次通话。范围应按来电者（电话号码或账户）划分，而不是按会话划分。
- **把 `memory` 放在 LLM 之后。** 召回的上下文将无法再影响回复。它必须位于 `user_aggregator` 和 `llm_service` 之间。
- **语音场景的召回预算过高。** 过于激进的召回会增加首个 token 的生成时间，造成明显的通话空白。实时通话建议从 `"low"` 开始。
- **没有规范化身份。** 如果同一个电话号码有时被解析成不同字符串，就会落入不同的记忆库，来电者看起来也会像新用户一样。

## 常见问题解答 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也能以相同方式工作：将 `hindsight_api_url` 指向 `http://localhost:8888`，并移除 `api_key`。使用 Cloud 可以省去自行运行后端的工作。

### 是否应该为每个电话号码创建一个记忆库？ {#should-the-bank-be-one-per-phone-number}

通常应该这样做，前提是这个号码能明确对应一个人。如果你已经验证了用户身份，账户 ID 或客户 ID 会更可靠，因为一个人可能会用多个号码来电。

### 存入通话内容会拖慢来电者的体验吗？ {#does-retaining-a-call-slow-down-the-callers-experience}

不会。存入操作采用即发即忘的方式异步运行，因此不会阻塞响应路径。只有召回位于关键路径上，你可以通过 `recall_budget` 调整它。

### 通话之间具体会记住哪些内容？ {#what-actually-gets-remembered-between-calls}

已完成轮次对中的实质内容——请求、决定、明确表达的偏好和承诺。召回时只会呈现与当前轮次相关的部分，而不是重放之前的整段对话记录。

## 后续步骤 {#next-steps}

- 如果尚未安装集成，请参阅 [Pipecat 设置指南](/guides/2026/05/04/guide-pipecat-memory-with-hindsight)
- 使用 [Hindsight Cloud](https://hindsight.vectorize.io) 快速接入托管记忆后端
- 阅读[完整的 Hindsight 文档](/)
- 阅读[快速入门指南](/developer/api/quickstart)
- 查看 [Hindsight Recall API](/developer/api/recall)
- 查看 [Hindsight Retain API](/developer/api/retain)
- 阅读 [Pipecat 集成文档](/sdks/integrations/pipecat)
