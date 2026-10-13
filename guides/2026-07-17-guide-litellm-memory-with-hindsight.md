---
title: "指南：用Hindsight添加LiteLLM记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, litellm, agents, memory]
description: "使用后视-litellm包将LiteLLM记忆与Hindsight一起添加，因此每次完成都会在LLM通话之前回忆相关记忆并存储之后的对话。"
image: /img/guides/guide-litellm-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 LiteLLM 添加记忆](/img/guides/guide-litellm-memory-with-hindsight.svg)

如果希望**使用 Hindsight 为 LiteLLM 添加记忆**，最直接的方式是 `hindsight-litellm` 包。它包装 LiteLLM 补全调用，在每次调用前将相关记忆注入提示词，之后存储对话，让任意 LLM 应用跨会话拥有长期记忆，而非每次从空白开始。

这非常适合LiteLLM因为LiteLLM已经将 100 多个提供商标准化为一个 `completion()`接口。 `hindsight-litellm` 封装在同一接缝处添加了记忆层：它可以与OpenAI,Anthropic、Groq、Azure、AWS Bedrock、Google顶点AI，以及任何其他LiteLLM支持的提供商，只需几行设置。 记忆的范围是每个记忆库的，因此不同的智能体或用户保持隔离。

本指南将逐步安装该软件包，并将其指向您的Hindsight后端，设置您的记忆库和记忆模式，以及快速验证流程，以便您可以确认记忆实际上正在被使用。保留工作时， [文档首页](/) 和 [快速入门指南](/developer/api/quickstart) 就在附近。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-litellm`。
> 2. `hindsight_litellm.configure(hindsight_api_url="http://localhost:8888")`（添加`api_key=...` 用于云身份验证）。
> 3. `hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=True)`。
> 4. `hindsight_litellm.enable()`，然后拨打`hindsight_litellm.completion(...)` 和往常一样。
> 5.验证稍后的调用是否能回忆起先前调用存储的内容。

## 先决条件 {#prerequisites}

开始之前，请确保您拥有：

- Python>= 3.10 且 `litellm` >= 1.83.0
- 可达Hindsight后端，[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- LiteLLM 支持的至少一个LLM 提供商的凭证

## 第 1 步：安装软件包 {#step-1-install-the-package}

```bash
pip install hindsight-litellm
```

包装好LiteLLM的`completion()` 因此，每次通话之前都会调用记忆，之后会存储对话。它不会改变您与家人交谈的方式LLM提供商。

## 第2步：配置并指向Hindsight {#step-2-configure-and-point-at-hindsight}

使用`configure()` 用于在会话期间不更改的静态设置，包括HindsightAPIURL 和（可选）API键：

```python
import hindsight_litellm

hindsight_litellm.configure(
    hindsight_api_url="http://localhost:8888",  #Hindsight API 服务器 URL
    api_key="your-api-key",                     #可选 — 用于 Hindsight 身份验证
    verbose=True,                               #可选 — 详细日志记录和调试信息
)
```

对于[Hindsight Cloud](https://hindsight.vectorize.io)，设置云APIURL 并将您的密钥传递为 `api_key`。对于自托管服务器，点 `hindsight_api_url` 根据您的情况（例如 `http://localhost:8888`）。

## 第三步：设置记忆库和记忆模式 {#step-3-set-your-bank-and-memory-mode}

使用`set_defaults()` 用于每次调用默认值。 `bank_id` 是必需的 - 它选择记忆库，这就是记忆如何保持每个智能体或用户的隔离：

```python
hindsight_litellm.set_defaults(
    bank_id="my-agent",   #必填 — 记忆 记忆库 ID
    use_reflect=True,     #遗憾 = 综合上下文；假=原始记忆再现
)
```

选择记忆模式：

- **召回模式** (`use_reflect=False`，默认值）：检索原始记忆事实并将其作为编号列表注入。当您需要精确的个人记忆时，这是最好的选择。
- **反思模式** (`use_reflect=True`)：将记忆合成一个连贯的上下文段落。最适合自然的、会话式的记忆环境。

您还可以使用默认值调整检索，例如`budget` (`"low"`，`"mid"`，`"high"`), `max_memories`，`max_memory_tokens`，和`fact_types`。参见[LiteLLM 集成文档](/sdks/integrations/litellm)查看完整列表。

## 第4步：启用并调用完成 {#step-4-enable-and-call-completion}

启用集成，然后调用`completion()` 与您完全相同LiteLLM：

```python
hindsight_litellm.enable()

response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "我们讨论了AI什么？"}],
    hindsight_query="我对AI讨论了解多少？",
)
```

当`inject_memories=True`（默认），可以通过`hindsight_query` 指定要在记忆中搜索的内容。如果省略它，则使用最后一条用户消息作为查询。

因为LiteLLM标准化提供者，相同的调用在任何地方都有效 - 只需更改 `model`：

```python
messages = [{"role": "user", "content": "Hello!"}]

hindsight_litellm.completion(model="gpt-4o", messages=messages, hindsight_query="greeting")
hindsight_litellm.completion(model="claude-sonnet-4-20250514", messages=messages, hindsight_query="greeting")
hindsight_litellm.completion(model="groq/llama-3.1-70b-versatile", messages=messages, hindsight_query="greeting")
```

## 整合如何使用记忆 {#how-the-integration-uses-memory}

当你打电话时`completion()`，以下情况会自动发生：

- **记忆检索（之前）：**Hindsight根据对话（或您的 `hindsight_query`）。
- **提示词注入（之前）：** 记忆被注入到提示中——默认情况下注入到系统消息中。
- **LLM 调用：** 丰富的提示发送至LLM通过LiteLLM。
- **对话存储（之后）：** 对话存储至Hindsight用于未来的记忆召回 — 默认情况下异步以提高性能。

您也可以直接调用记忆API，无需经过`completion()`：`recall()` 原始记忆，`reflect()` 用于合成上下文，以及 `retain()` 存储内容。每个都有一个异步变体（`arecall()`，`areflect()`，`aretain()`）。对于较低级别的行为，请阅读 [Hindsight 记忆召回 API](/developer/api/recall) 和 [Hindsight 记忆存储 API](/developer/api/retain)。

## 每记忆库 记忆 {#per-bank-memory}

记忆的范围是`bank_id` 你设置在`set_defaults()`。这使得一个智能体或用户的记忆与另一个智能体或用户的记忆隔离。您可以使用 在一次调用中覆盖记忆库 `hindsight_bank_id` kwarg，这对于每个用户都有自己的记忆库的多用户应用程序来说很方便。

要塑造记忆库随着时间的推移学习和记住的内容，请使用 `set_bank_mission()`赋予它使命——Hindsight用它来构建记忆库的心智模型。

## 验证记忆是否有效 {#verify-that-memory-is-working}

一个好的测试序列是：

1. 呼叫`hindsight_litellm.completion(...)` 并在消息中分享事实或偏好
2. 让对话存储完成
3. 呼叫`completion()` 再次对之前的事实提出疑问
4. 确认答案反映了您存储的内容

例如：

- 第一次通话提到“我正在 Python 从事机器学习项目”
- 稍后的电话询问“我正在从事什么项目？”

如果稍后的响应回想起机器学习项目，则设置正在运行。与 `verbose=True`，也可以拨打`get_last_injection_debug()` 准确检查注入的内容 - 模式、是否注入记忆、结果的数量以及记忆上下文本身。

## 常见错误 {#common-mistakes}

### 忘记打电话`enable()` {#forgetting-to-call-enable}

`configure()` 和 `set_defaults()` 仅准备集成。你必须打电话给`enable()`之前`completion()`将注入并存储记忆。

### 未设置 `bank_id` {#not-setting-a-bankid}

`set_defaults()` 必须设置 `bank_id`。否则无法确定从哪个记忆库召回或存储记忆。

### 存储完成前测试记忆召回 {#testing-recall-before-storage-finishes}

默认情况下，对话存储是异步的。如果您立即检查，之前的对话可能尚未存储。设置`sync_storage=True` `configure()` 当您需要存储来立即阻止和显示错误时。

### 预期错误的记忆形状 {#expecting-the-wrong-memory-shape}

记忆召回模式将原始事实作为列表注入； 跳跃模式注入一个合成的段落。选择与您希望 LLM 使用记忆的方式相匹配的模式。

## 常见问题解答 {#faq}

### 我需要Hindsight Cloud吗？ {#do-i-need-hindsight-cloud}

没有。自托管Hindsight服务器也能工作 — 点 `hindsight_api_url` 以您为例。

### 这会改变我使用LiteLLM的方式吗？ {#does-this-change-how-i-use-litellm}

没有。你打电话给`hindsight_litellm.completion()` 与相同 `model` 和 `messages`您已经使用过。记忆层是在调用周围添加的。

### 支持哪些提供商？ {#which-providers-are-supported}

任何提供商LiteLLM支持 —OpenAI,Anthropic、Groq、Azure、AWS Bedrock、Google顶点AI，等等。您只需更改 `model` 字符串。

### 我可以在没有LiteLLM回调路径的情况下使用它吗？ {#can-i-use-it-without-the-litellm-callback-path}

是的。有原生客户端包装器，`wrap_openai()` 和 `wrap_anthropic()`，将相同的记忆行为直接添加到那些SDK客户。

## 后续步骤 {#next-steps}

- 从开始 [Hindsight Cloud](https://hindsight.vectorize.io) 如果您想要托管后端
- 阅读[完整 Hindsight 文档](/)
- 跟随[快速入门指南](/developer/api/quickstart)
- 回顾[Hindsight 记忆召回 API](/developer/api/recall)
- 回顾[Hindsight 记忆存储 API](/developer/api/retain)
- 阅读[LiteLLM 集成文档](/sdks/integrations/litellm)
