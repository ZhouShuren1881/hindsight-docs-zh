---
title: "指南：使用 Hindsight 为 Pipecat 语音智能体添加记忆"
authors: [benfrank241]
date: 2026-05-04T15:00:00Z
tags: [how-to, pipecat, voice-ai, memory]
description: "使用 HindsightMemoryService 在回复前召回上下文、回复后存储完整轮次，为 Pipecat 语音智能体添加跨通话记忆。"
image: /img/guides/guide-pipecat-memory-with-hindsight.webp
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Pipecat 语音智能体添加记忆](/img/guides/guide-pipecat-memory-with-hindsight.webp)

如需 **Pipecat 语音智能体与 Hindsight 记忆**，在流水线用户聚合器与 LLM 服务之间插入 `HindsightMemoryService`，每轮前召回上下文，回复后存储完整轮次，支持跨通话延续。

这比期待助手自行准确总结历史更可靠。Hindsight 处理记忆循环，Pipecat 继续负责实时音频和 LLM 编排。

操作时可参考 [Pipecat 集成文档](/sdks/integrations/pipecat)、[文档首页](/)、[快速入门指南](/developer/api/quickstart)、[Hindsight 记忆召回 API](/developer/api/recall)和 [Hindsight 记忆存储 API](/developer/api/retain)。

<!-- truncate -->

> **快速解答**
>
> 1. 安装 Pipecat 集成或插件。
> 2. 指向 Hindsight Cloud 或本地 API。
> 3. 用稳定记忆库 ID 接入 Pipecat。
> 4. 存储偏好或项目事实，再开始全新运行。
> 5. 确认召回自动恢复上下文。

## 为什么这种配置有效 {#why-this-setup-works}

语音记忆需接入流水线，而非仅提示文本。服务拦截对话帧、为当前查询召回、注入上下文，并异步存储完整轮次对，让延迟可预测。

## 前提条件 {#prerequisites}

- 用户和助手聚合器已正常工作的 Pipecat 流水线。
- 已安装 Python 和 `hindsight-pipecat`。
- 每个来电者、用户或账户稳定记忆库 ID。

## 步骤 1：安装集成 {#step-1-install-the-integration}

```bash
pip install hindsight-pipecat
```

## 步骤 2：连接 Pipecat 与 Hindsight {#step-2-connect-pipecat-to-hindsight}

> ✨ **推荐：**[Hindsight Cloud](https://ui.hindsight.vectorize.io)，提供免费档位，无需自托管。

```python
from hindsight_pipecat import HindsightMemoryService

memory = HindsightMemoryService(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)
```

本地自托管时，设 `hindsight_api_url` 为 `http://localhost:8888`，移除 `api_key`。

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

应跨通话记住同一人时，每个来电者或账户独立库。只有多个用户确需相同上下文，如团队队列时才共享。范围过广会迅速影响语音体验，隔离很重要。

## 步骤 5：验证记忆是否有效 {#step-5-verify-that-memory-is-working}

1. 短对话中提供之后重要的偏好或账户细节。
2. 用同一 ID 开始第二次对话。
3. 提出依赖此前细节的追问，确认召回。
4. 缺失时检查处理器位置，确认位于 LLM 前。

第二次能用第一次细节回答，就说明有效。否则启用调试日志、检查记忆库 ID，确认存储完成。

## 常见错误 {#common-mistakes}

- 处理器放在 LLM 后，召回无法影响回复。
- 使用临时通话 ID，而非稳定用户 ID。
- 实时语音配置过于激进召回，却期待低延迟。

## 常见问题 {#faq}

### 记忆处理器应放在哪里？ {#where-should-the-memory-processor-go-in-the-pipeline}

用户聚合器与 LLM 之间，以便生成前注入上下文。

### 存储会阻塞用户轮次吗？ {#does-retain-block-the-user-turn}

不会，完整轮次异步存储，回复路径保持快速。

### 应按电话号码分库吗？ {#should-i-use-one-bank-per-phone-number}

号码明确对应用户时通常应该，否则选择最可信的稳定账户 ID。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整 Hindsight 文档](/)。
- 按[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 记忆召回 API](/developer/api/recall)。
- 查阅 [Hindsight 记忆存储 API](/developer/api/retain)。
- 对照 [AI 编码智能体的团队共享记忆](/blog/2026/07/10/shared-memory-across-ai-tools)。
