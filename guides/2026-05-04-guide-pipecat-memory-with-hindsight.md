---
title: "指南：使用 Hindsight 为 Pipecat 语音智能体添加记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, pipecat, voice-ai, memory]
description: "使用 HindsightMemoryService 在回复前召回上下文、在通话后存储已完成的轮次，为 Pipecat 语音智能体添加跨通话记忆。"
image: /img/guides/guide-pipecat-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Pipecat 语音智能体添加记忆](/img/guides/guide-pipecat-memory-with-hindsight.webp)

如果你想为 **Pipecat 语音智能体添加 Hindsight 记忆**，最简洁的配置是在流水线的用户聚合器和 LLM 服务之间插入 `HindsightMemoryService`。这样 Pipecat 就能在每轮对话前召回相关上下文，并在回复后存储已完成的轮次，这正是语音智能体跨通话保持连贯所需的能力。

这种做法比寄希望于助手能准确总结自己的历史记录可靠得多。Hindsight 负责记忆循环，Pipecat 则继续负责它擅长的实时音频和 LLM 编排。

操作时可将[Pipecat 集成文档](/sdks/integrations/pipecat)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 的 Recall（召回）API](/developer/api/recall)和 [Hindsight 的 Retain（存入）API](/developer/api/retain)放在手边，随时查阅。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Pipecat 集成或插件。
> 2. 将其指向 Hindsight Cloud 或本地 Hindsight API。
> 3. 使用稳定的 bank ID 将记忆接入 Pipecat 运行时。
> 4. 存储一项偏好或项目信息，然后启动一次全新运行。
> 5. 确认系统会自动召回此前的上下文。

## 为什么这种配置有效 {#why-this-setup-works}

语音智能体需要在流水线层面接入记忆，而不能只依赖提示文本。`HindsightMemoryService` 会拦截对话帧，针对当前用户查询召回记忆，将其注入上下文，并异步存储完整的轮次对，从而让延迟保持可预测。

## 前提条件 {#prerequisites}

- 已正常运行、包含用户和助手聚合器的 Pipecat 流水线
- 已安装 Python 和 `hindsight-pipecat`
- 为每位来电者、用户或账户分配稳定的 bank ID

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-pipecat
```

## 步骤 2：连接 Pipecat 与 Hindsight {#step-2-connect-pipecat-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自行托管。

```python
from hindsight_pipecat import HindsightMemoryService

memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 也可设置 HINDSIGHT_API_KEY 环境变量
)
```

如果你改为在本地自行托管 Hindsight，请将 `hindsight_api_url` 设为 `http://localhost:8888`，并移除 `api_key`。

## 步骤 3：将记忆接入运行时 {#step-3-wire-memory-into-your-runtime}

```python
from pipecat.pipeline.pipeline import Pipeline
from hindsight_pipecat import HindsightMemoryService

memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    recall_budget="mid",
    recall_max_tokens=4096,
)

pipeline = Pipeline([
    transport.input(),
    stt_service,
    user_aggregator,
    memory,
    llm_service,
    assistant_aggregator,
    tts_service,
    transport.output(),
])
```

## 步骤 4：选择合适的记忆库策略 {#step-4-choose-the-right-bank-strategy}

如果助手需要跨通话记住同一个人，就为每位来电者或每个账户使用一个记忆库。只有在多位用户确实需要相同的记忆上下文时才使用共享记忆库，例如团队队列。记忆库范围过宽很快就会让语音系统体验变差，因此隔离很重要。

## 步骤 5：验证记忆是否正常工作 {#step-5-verify-that-memory-is-working}

1. 进行一段简短对话，并说出之后可能用得上的偏好或账户细节。
2. 使用同一个 bank ID 开始第二次对话。
3. 提出一个依赖此前细节的后续问题，并确认助手能召回相关信息。
4. 如果没有召回，检查记忆处理器在流水线中的位置，并确认它位于 LLM 服务之前。

如果第二次运行能根据第一次运行中的细节作答，说明配置正常。如果不能，请启用调试日志、检查所配置的 bank ID，并确认存入调用确实已完成。

## 常见错误 {#common-mistakes}

- 将记忆处理器放在 LLM 之后，导致召回的上下文无法影响回复
- 使用临时通话 ID 作为记忆库 ID，而不是稳定的用户标识符
- 在实时语音场景中把 Recall 配置得过于激进，却仍期待低延迟

## 常见问题 {#faq}

### 记忆处理器应放在流水线的什么位置？ {#where-should-the-memory-processor-go-in-the-pipeline}

将它放在用户聚合器和 LLM 之间，这样它就能在生成回复前注入召回的上下文。

### Retain（存入）会阻塞用户轮次吗？ {#does-retain-block-the-user-turn}

不会。系统会异步存入已完成的轮次，因此回复路径能够保持响应迅速。

### 应该按电话号码分别使用记忆库吗？ {#should-i-use-one-bank-per-phone-number}

如果电话号码能明确对应一位用户，通常可以这样做。否则，请选择你最信任的稳定账户标识符。

## 后续步骤 {#next-steps}

- 如果需要托管记忆后端，请从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 对照[面向 AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)了解相关工作流
