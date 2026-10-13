---
title: "指南：使用Pipecat在通话中记住呼叫者的语音智能体"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, pipecat, voice, memory]
description: "通过 Hindsight 为每个呼叫者提供 Pipecat 智能语音交叉呼叫记忆，因此回访的呼叫者永远不必重新解释他们是谁。"
image: /img/guides/guide-pipecat-voice-memory-across-calls.svg
hide_table_of_contents: true
---

![指南：使用 Pipecat 构建跨通话记住来电者的语音智能体](/img/guides/guide-pipecat-voice-memory-across-calls.svg)

如果你想要Pipecat语音智能体**跨通话记住来电者**，技巧不是一个更大的提示——它是一个针对调用者的记忆库。当同一个人下周再打电话时，智能体应该已经知道他们是谁，他们上次要求什么，以及他们喜欢什么，而不是让他们从头开始重新解释一切。

Pipecat处理实时音频和LLM编排；Hindsight处理记忆循环。单个`HindsightMemoryService` FrameProcessor 位于您的用户聚合器和LLM服务，在每个回合之前回忆相关记忆，并在之后保留已完成的回合。大多数人错过的是范围界定：记忆库 ID 必须是*呼叫者*身份，而不是电话。做到这一点，通话之间的连续性是免费的。

这是策略指南，而不是全新安装。它假设您已经接线`HindsightMemoryService` 进入工作管道（或将遵循下面链接的设置指南），并重点关注每个调用者的记忆库、记忆存储的内容、何时记忆召回，以及决定记忆召回是否有帮助或有害的特定于语音的权衡。

<!-- truncate -->

> **快速解答**
>
> 1.从 *呼叫者* 派生出稳定的记忆库 ID，而不是调用 — 例如电话号码或帐户 ID。
> 2.电线`HindsightMemoryService`之间 `user_aggregator` 和 `llm_service` 那个`bank_id`。
> 3.让记忆在通话开始时运行，以便智能体用上下文来迎接返回的呼叫者。
> 4.让记忆存储在每个完成的回合后即发即忘，以便下一次通话具有此通话的详细信息。
> 5.通过使用同一身份拨打两次并确认第二次呼叫记住第一次来进行验证。

## 为什么语音智能体会忘记回拨电话 {#why-voice-agents-forget-returning-callers}

库存语音管道在会话之间是无状态的。每次通话都会启动一个新的 LLM 上下文，因此当呼叫者挂断电话时，他们所说的一切都会消失。下一个电话从零开始：“我可以知道你的姓名和账号吗？” - 再次。

这对于一次性 IVR 来说很好，但对于一个应该感觉它认识呼叫者的智能体来说，这是完全错误的。解决方法不是将之前的成绩单塞入系统提示符中（它们会无限增长并超出您的延迟预算）。解决方案是记忆存储，它仅回忆与当前回合相关的内容，并在通话过程中保留新的事实。Hindsight是那家存储，`HindsightMemoryService` 是将其连接到的 FrameProcessorPipecat。

## 为每个调用者指定一个记忆库 {#scope-a-bank-per-caller}

记忆Hindsight是根据记忆库隔离的。如果两个呼叫者共享一个记忆库，他们就会泄漏到彼此的上下文中——这是让语音智能体感觉被破坏的最快方法。所以这里最重要的决定是：**`bank_id` 对应什么身份？**

对于交叉调用记忆，记忆库必须与人绑定，而不是与会话绑定：

- **电话号码** 是电话传输的天然密钥 - 它在通话中保持稳定，甚至在智能体应答之前就可用。
- **账户或客户 ID** 会更好，因为一个人可能会使用多个号码拨打电话。
- **避免**瞬态call/sessionID。每次调用记忆库意味着每次调用都是第一次调用 - 您正在尝试解决的确切问题。

```python
from hindsight_pipecat import HindsightMemoryService

# caller_number 来自传输层或电话服务提供商
memory = HindsightMemoryService(
    bank_id=f"caller-{caller_number}",   #稳定的每个呼叫者密钥
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # or set HINDSIGHT_API_KEY env var
)
```

因为记忆库是严格隔离的，`caller-+15551234567` 只会回忆呼叫者的历史记录。选择您信任的最稳定的身份，并将其规范化（一致的格式），以便同一个人始终解析为相同的记忆库。

## 通话开始时的记忆召回，通话结束时的记忆存储 {#recall-at-the-start-of-a-call-retain-at-the-end}

记忆召回之前/记忆存储之后循环是将每个调用者的记忆库变成连续性的。以下是它如何进入管道。

`HindsightMemoryService`作用于每个`OpenAILLMContextFrame`（以及较新的`LLMContextFrame`）。每回合它都会做两件事：

1. **记忆存储** — 任何新完成的用户+助理轮对都会发送到Hindsight异步、即发即忘，因此不会阻塞响应路径。
2. **记忆召回** — 最新的用户消息用作搜索查询，结果作为 注入 `<hindsight_memories>` 之前的系统消息LLM看到上下文。

对于交叉调用记忆，重要的时刻是**新通话的第一轮**。当回拨电话的人说话时，记忆召回会根据他们的记忆库运行，并显示重要的内容——他们的名字、他们的开放问题、他们陈述的偏好——因此智能体的第一个真实回复已经反映了他们是谁。您不必重新询问任何事情。

在记忆存储方面，考虑应该留下的*什么*呼叫。您不需要存储每个“嗯”和反向通道。 Hindsight保留的轮对携带着实质内容：呼叫者的请求、做出的决定、陈述的偏好、智能体做出的承诺。这些都是下一次调用应该记忆的事情。如果你的通话中充斥着一次性的闲聊，请收紧你向智能体提供的内容，而不是事后试图进行过滤——干净的记忆存储变成干净的记忆。

```python
from pipecat.pipeline.pipeline import Pipeline

pipeline = Pipeline([
    transport.input(),
    stt_service,
    user_aggregator,
    memory,            #← LLM 之前的记忆召回，转弯之后的记忆存储
    llm_service,
    assistant_aggregator,
    tts_service,
    transport.output(),
])
```

放置承重：`memory`必须坐**之后**`user_aggregator`（因此它可以看到要查询的组装用户上下文）和**之前**`llm_service`（因此回忆上下文在生成之前到达模型）。把它放在LLM和记忆召回不再影响回复。

## 连接Pipecat至Hindsight {#connect-pipecat-to-hindsight}

本指南假设集成已安装并接线。如果您还没有这样做，请先按照设置指南进行操作：[使用 Hindsight 为 Pipecat 语音智能体添加记忆](https://hindsight.vectorize.io/guides/2026/05/04/guide-pipecat-memory-with-hindsight)。涵盖`pip install hindsight-pipecat`，指着Hindsight Cloud或本地服务器，以及基础管道布线。返回此处了解每个呼叫者的策略。

## 特定于语音的问题：延迟和记忆召回预算 {#voice-specific-concerns-latency-and-recall-budget}

语音对延迟的容忍程度与文本聊天不同——呼叫者会注意到死气沉沉。这决定了你如何配置记忆。

- **存储已经是非阻塞的。** 已完成的回合会异步保留，因此存储记忆永远不会添加到响应路径中。您无需针对延迟进行调整；您需要确保它已启用。
- **召回位于关键路径。** 记忆召回在LLM，所以它的成本是首次令牌时间的一部分。这就是记忆召回预算的重要性。 `HindsightMemoryService`暴露`recall_budget` (`"low"`, `"mid"`, `"high"`) 和 `recall_max_tokens`。

```python
memory = HindsightMemoryService(
    bank_id=f"caller-{caller_number}",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    recall_budget="low",       #支持实时语音的延迟
    recall_max_tokens=2048,    #注入上下文上限，以便 TTS 快速启动
)
```

如需实时通话，请从 开始 `recall_budget="low"` 和谦虚的`recall_max_tokens`。语音智能体很少需要回忆上下文的墙 - 它需要让呼叫者感觉自己被了解的两三个事实。预约`"mid"`或`"high"` 适用于您在延迟预算中测量了余量的情况，或者对于非实时通道。如果记忆感觉迟缓，那几乎总是因为语音预算设置得太激进，而不是存储速度太慢。

您还可以使用 独立切换两半 `enable_recall` 和 `enable_retain`，例如，如果您想在打开记忆召回之前在推出过程中静默记忆存储。

## 验证交叉调用记忆 {#verify-cross-call-memory}

重点是*第二*调用会记住*第一*。直接测试一下：

1. 从已知身份呼入（或使用 运行文本模拟器 `--bank caller-demo`）并陈述智能体应该保留的事实——帐户详细信息、偏好、开放请求。
2. 结束通话，最后变成记忆存储。
3. 以相同的身份再次呼入，所以相同`bank_id`下定决心。
4. 根据先前的事实询问后续情况——不要重述。
5. 使用第一次通话的详细信息确认智能体答案。

如果第二个呼叫回忆起第一个呼叫，则每个呼叫者的记忆正在发挥作用。如果不是：确认两个调用都解析为相同的 `bank_id`，确认`memory` 坐在之前 `llm_service`，并确认记忆存储在第一次调用时完成（打开调试日志记录）。 包中的 `examples/interactive_chat.py`模拟器可以让您在不配置电话的情况下运行此循环：

```bash
python examples/interactive_chat.py --bank caller-demo
```

## 常见错误 {#common-mistakes}

- **使用通话/会话 ID 作为记忆库。** 每个呼叫都成为第一个呼叫。范围为呼叫者（电话号码或帐户），而不是会话。
- **将 `memory` 放在 LLM 之后。** 回忆起的上下文不再影响回复。它必须位于 之间 `user_aggregator` 和 `llm_service`。
- **召回预算对语音场景过高。** 积极的记忆召回会增加首次标记的时间并产生可听见的死气沉沉的感觉。从 开始 `"low"` 用于实时通话。
- **未统一身份格式。** 如果同一个电话号码有时解析为不同的字符串，它会进入不同的记忆库，并且呼叫者看起来又是新的。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器的工作方式相同 — 点 `hindsight_api_url` `http://localhost:8888` 并放下 `api_key`。云只是让您免于运行后端。

### 记忆库应该是每个电话号码一个吗？ {#should-the-bank-be-one-per-phone-number}

通常是的，当数字清楚地映射到一个人时。如果您拥有经过身份验证的身份，则帐户或客户 ID 会更加可靠，因为一个人可能会使用多个号码拨打电话。

### 保留呼叫是否会降低呼叫者的体验？ {#does-retaining-a-call-slow-down-the-callers-experience}

没有。 记忆存储是即发即忘的并且异步运行，因此它永远不会阻塞响应路径。只有记忆在关键路径上，你可以用 来调整它 `recall_budget`。

### 在通话之间实际上会记住什么？ {#what-actually-gets-remembered-between-calls}

已完成轮对的实质内容——请求、决定、陈述的偏好、承诺。 然后，记忆仅显示与当前回合相关的部分，而不是重播整个先前的记录。

## 后续步骤 {#next-steps}

- 跟随[Pipecat 配置指南](https://hindsight.vectorize.io/guides/2026/05/04/guide-pipecat-memory-with-hindsight) 如果您尚未安装集成
- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 用于托管记忆后端
- 阅读[完整 Hindsight 文档](/)
- 关注[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[Pipecat 集成文档](/sdks/integrations/pipecat)
