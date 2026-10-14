---
title: "指南：用 Hindsight 为 LiteLLM 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, litellm, agents, memory]
description: "使用 hindsight-litellm 包为 LiteLLM 添加记忆：每次 completion 调用前都会召回相关记忆，并在调用后存储对话。"
image: /img/guides/guide-litellm-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：用 Hindsight 为 LiteLLM 添加记忆](/img/guides/guide-litellm-memory-with-hindsight.svg)

如果要为 LiteLLM 添加 Hindsight 记忆，最直接的做法是使用 `hindsight-litellm` 包。它会在 LiteLLM 的 completion 调用前注入相关记忆，并在调用后存储对话。这样，任何 LLM 应用都能跨会话使用长期记忆，不必让每次新调用都从空白状态开始。

LiteLLM 已经把 100 多个服务提供方统一封装在一个 `completion()` 接口之后，因此这种方式很适合 LiteLLM。`hindsight-litellm` 包在同一个接入点增加记忆层：只需几行配置，就能与 OpenAI、Anthropic、Groq、Azure、AWS Bedrock、Google Vertex AI 以及 LiteLLM 支持的其他服务提供方配合使用。记忆按记忆库隔离，因此不同智能体或用户之间不会互相影响。

本指南会介绍如何安装软件包、将其指向 Hindsight 后端、设置记忆库和记忆模式，并通过一个简单的验证流程确认记忆确实在使用。操作时可将[文档首页](/)和[快速入门指南](/developer/api/quickstart)放在手边。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-litellm`。
> 2. 调用 `hindsight_litellm.configure(hindsight_api_url="http://localhost:8888")`（用于 Cloud 身份认证时，添加 `api_key=...`）。
> 3. 调用 `hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=True)`。
> 4. 调用 `hindsight_litellm.enable()`，然后像往常一样调用 `hindsight_litellm.completion(...)`。
> 5. 验证后续调用能否召回先前调用存储的内容。

## 前提条件 {#prerequisites}

开始之前，请确保你具备以下条件：

- Python >= 3.10 和 `litellm` >= 1.83.0
- 可访问的 Hindsight 后端：可以使用 [Hindsight Cloud](https://hindsight.vectorize.io)，也可以使用自托管服务器
- 至少一个 LiteLLM 支持的 LLM 服务提供方的凭据

## 第 1 步：安装软件包 {#step-1-install-the-package}

```bash
pip install hindsight-litellm
```

这个软件包封装了 LiteLLM 的 `completion()`：每次调用前都会召回记忆，并在调用后存储对话。它不会改变你与 LLM 服务提供方交互的方式。

## 第 2 步：配置并连接到 Hindsight {#step-2-configure-and-point-at-hindsight}

使用 `configure()` 设置会话期间不会变化的静态配置，包括 Hindsight API URL 和（可选的）API 密钥：

```python
import hindsight_litellm

hindsight_litellm.configure(
    hindsight_api_url="http://localhost:8888",  # Hindsight API 服务器 URL
    api_key="your-api-key",                     # 可选 — 用于 Hindsight 身份认证
    verbose=True,                               # 可选 — 输出详细日志和调试信息
)
```

使用 [Hindsight Cloud](https://hindsight.vectorize.io) 时，请设置 Cloud API URL，并将密钥作为 `api_key` 传入。使用自托管服务器时，请将 `hindsight_api_url` 指向你的服务器实例（例如 `http://localhost:8888`）。

## 第 3 步：设置记忆库和记忆模式 {#step-3-set-your-bank-and-memory-mode}

使用 `set_defaults()` 设置每次调用的默认值。必须提供 `bank_id`，因为它用于选择记忆库，从而隔离不同智能体或用户的记忆：

```python
hindsight_litellm.set_defaults(
    bank_id="my-agent",   # 必填 — 记忆库 ID
    use_reflect=True,     # reflect = 综合生成的上下文；False = 原始记忆召回
)
```

选择一种记忆模式：

- **Recall 模式**（`use_reflect=False`，默认）：检索原始记忆事实，并以编号列表的形式注入。适合需要精确获取单条记忆的场景。
- **Reflect 模式**（`use_reflect=True`）：将记忆综合生成一段连贯的上下文。适合需要自然、对话式记忆上下文的场景。

你也可以通过 `budget`（`"low"`、`"mid"`、`"high"`）、`max_memories`、`max_memory_tokens` 和 `fact_types` 等默认值调整检索。完整列表请参阅 [LiteLLM 集成文档](/sdks/integrations/litellm)。

## 第 4 步：启用集成并调用 completion {#step-4-enable-and-call-completion}

启用集成后，像使用 LiteLLM 一样调用 `completion()`：

```python
hindsight_litellm.enable()

response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What did we discuss about AI?"}],
    hindsight_query="What do I know about AI discussions?",
)
```

当 `inject_memories=True`（默认值）时，可以传入 `hindsight_query`，指定要在记忆中搜索的内容。如果省略该参数，系统会使用最后一条用户消息作为查询。

LiteLLM 会统一处理服务提供方，因此同一个调用可以用于不同服务，只需更改 `model`：

```python
messages = [{"role": "user", "content": "Hello!"}]

hindsight_litellm.completion(model="gpt-4o", messages=messages, hindsight_query="greeting")
hindsight_litellm.completion(model="claude-sonnet-4-20250514", messages=messages, hindsight_query="greeting")
hindsight_litellm.completion(model="groq/llama-3.1-70b-versatile", messages=messages, hindsight_query="greeting")
```

## 集成如何使用记忆 {#how-the-integration-uses-memory}

调用 `completion()` 时，系统会自动执行以下操作：

- **记忆检索（调用前）：**Hindsight 会根据对话（或 `hindsight_query`）查询相关记忆。
- **提示注入（调用前）：**记忆会注入提示中，默认注入系统消息。
- **LLM 调用：**增强后的提示通过 LiteLLM 发送给 LLM。
- **对话存储（调用后）：**对话会存入 Hindsight，供以后召回；默认采用异步方式，以提升性能。

你也可以绕过 `completion()`，直接调用记忆 API：使用 `recall()` 获取原始记忆，使用 `reflect()` 综合生成上下文，使用 `retain()` 存入内容。每个 API 都有对应的异步版本（`arecall()`、`areflect()`、`aretain()`）。如需了解更底层的行为，请参阅 [Hindsight Recall API](/developer/api/recall) 和 [Hindsight Retain API](/developer/api/retain)。

## 按记忆库隔离记忆 {#per-bank-memory}

记忆的范围由你在 `set_defaults()` 中设置的 `bank_id` 决定。这样，一个智能体或用户的记忆就会与其他智能体或用户的记忆隔离。你也可以通过单次调用的 `hindsight_bank_id` 关键字参数覆盖记忆库；这对每位用户各自使用一个记忆库的多用户应用很有帮助。

若要调整记忆库随时间学习和记住的内容，可使用 `set_bank_mission()` 为其设置任务说明。Hindsight 会据此为该记忆库构建心智模型。

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 调用 `hindsight_litellm.completion(...)`，并在消息中分享一条事实或偏好。
2. 等待对话存储完成。
3. 再次调用 `completion()`，询问与先前事实有关的问题。
4. 确认回答反映了先前存储的内容。

例如：

- 第一次调用中提到 “I'm working on a machine learning project in Python”。
- 后续调用询问 “What projects am I working on?”。

如果后续回答能召回机器学习项目，说明配置已经生效。设置 `verbose=True` 后，还可以调用 `get_last_injection_debug()`，准确检查注入的内容，包括所用模式、是否注入了记忆、结果数量以及记忆上下文。

## 常见错误 {#common-mistakes}

### 忘记调用 `enable()` {#forgetting-to-call-enable}

`configure()` 和 `set_defaults()` 只会准备集成。必须先调用 `enable()`，之后 `completion()` 才会注入和存储记忆。

### 未设置 `bank_id` {#not-setting-a-bank_id}

必须在 `set_defaults()` 中设置 `bank_id`。否则就没有记忆库可供召回或存储记忆。

### 在存储完成前测试召回 {#testing-recall-before-storage-finishes}

对话默认采用异步存储。如果立即检查，先前的对话可能尚未存储。若需要等待存储完成并立即显示错误，可在 `configure()` 中设置 `sync_storage=True`。

### 对记忆内容形式的预期有误 {#expecting-the-wrong-memory-shape}

Recall 模式会以列表形式注入原始事实；Reflect 模式会注入综合生成的段落。请选择符合你希望 LLM 使用记忆方式的模式。

## 常见问题 {#faq}

### 我需要使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需将 `hindsight_api_url` 指向你的服务器实例。

### 这会改变我使用 LiteLLM 的方式吗？ {#does-this-change-how-i-use-litellm}

不会。你仍然像以前一样，使用相同的 `model` 和 `messages` 调用 `hindsight_litellm.completion()`。记忆层会围绕这次调用添加。

### 支持哪些服务提供方？ {#which-providers-are-supported}

LiteLLM 支持的服务提供方都可以使用，包括 OpenAI、Anthropic、Groq、Azure、AWS Bedrock、Google Vertex AI 等。你只需更改 `model` 字符串。

### 不走 LiteLLM 回调路径也能使用吗？ {#can-i-use-it-without-the-litellm-callback-path}

可以。原生客户端包装器 `wrap_openai()` 和 `wrap_anthropic()` 可将相同的记忆行为直接添加到相应的 SDK 客户端。

## 后续步骤 {#next-steps}

- 如果想使用托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读[完整 Hindsight 文档](/)。
- 查看[快速入门指南](/developer/api/quickstart)。
- 查看 [Hindsight Recall API](/developer/api/recall)。
- 查看 [Hindsight Retain API](/developer/api/retain)。
- 阅读 [LiteLLM 集成文档](/sdks/integrations/litellm)。
