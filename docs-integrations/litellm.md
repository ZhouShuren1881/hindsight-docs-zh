---
sidebar_position: 1
title: "使用 Hindsight 为 LiteLLM 添加持久记忆 | 集成指南"
description: "通过 LiteLLM 和 Hindsight 为任意 LLM 应用添加持久记忆。只需几行代码，即可集成任何模型或提供商。"
---

# LiteLLM 持久记忆集成 {#litellm}

通过 [LiteLLM](https://github.com/BerriAI/litellm) 为 LLM 集成记忆功能。只需几行代码，即可为任意 LLM 应用添加持久记忆。

[查看更新日志 →](/changelog/integrations/litellm)

## 功能特性 {#features}

- **支持多种 LLM** - 通过 LiteLLM 支持 100 多家 LLM 提供商，包括 OpenAI、Anthropic、Groq、Azure、AWS Bedrock、Google Vertex AI 等
- **集成简单** - 只需配置、设置默认值、启用集成，然后使用 `hindsight_litellm.completion()`
- **自动注入记忆** - 在调用 LLM 前，将相关记忆注入提示中
- **自动存储对话** - 将对话存入 Hindsight，供之后召回（默认采用异步方式以提升性能）
- **两种记忆模式** - 可选择 `reflect`（综合生成上下文）或 `recall`（检索原始记忆）
- **直接调用记忆 API** - 手动查询、综合生成和存入记忆
- **原生客户端包装器** - 提供 OpenAI 和 Anthropic SDK 的替代包装器
- **调试模式** - 检查具体注入了哪些记忆

## 安装 {#installation}

```bash
pip install hindsight-litellm
```

## 快速入门 {#quick-start}

```python
import hindsight_litellm

# 步骤 1：配置静态设置
hindsight_litellm.configure(
    hindsight_api_url="http://localhost:8888",
    verbose=True,
)

# 步骤 2：设置默认值（必须设置 bank_id）
hindsight_litellm.set_defaults(
    bank_id="my-agent",
    use_reflect=True,  # 使用 reflect 综合生成上下文
)

# 步骤 3：启用记忆集成
hindsight_litellm.enable()

# 步骤 4：调用带记忆的 completion
response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What did we discuss about AI?"}],
    hindsight_query="What do I know about AI discussions?",
)
```

**重要提示：** 当 `inject_memories=True`（默认值）时，可以提供 `hindsight_query` 来指定要在记忆中搜索的内容。如果省略该参数，系统会使用最后一条用户消息作为查询。

## 工作原理 {#how-it-works}

调用 `completion()` 时，系统会自动执行以下操作：

1. **检索记忆** - 根据对话内容向 Hindsight 查询相关记忆
2. **注入提示** - 将记忆注入系统消息
3. **调用 LLM** - 将补充了记忆的提示发送给 LLM
4. **存储对话** - 将对话存入 Hindsight，供之后召回
5. **返回响应** - 按常规方式返回响应

## 配置选项 {#configuration-options}

API 分为两个函数，便于分别配置：

### 1. `configure()` - 静态设置 {#1-configure---static-settings}

通常在会话期间不会变化的设置：

```python
hindsight_litellm.configure(
    # 必填
    hindsight_api_url="http://localhost:8888",  # Hindsight API 服务器 URL

    # 可选 - 身份验证
    api_key="your-api-key",        # Hindsight 身份验证 API 密钥

    # 可选 - 记忆行为
    store_conversations=True,      # 在 LLM 调用后存储对话
    inject_memories=True,          # 在提示中注入相关记忆
    sync_storage=False,            # False = 异步存储（默认，性能更好）
                                   # True = 同步存储（会阻塞，并立即抛出错误）

    # 可选 - 高级设置
    injection_mode="system_message",  # 注入方式："system_message" 或 "prepend_user"
    excluded_models=["gpt-3.5*"],     # 排除指定模型，避免拦截其调用
    verbose=True,                     # 启用详细日志和调试信息
)
```

### 2. `set_defaults()` - 单次调用的默认值 {#2-set_defaults---per-call-defaults}

为单次调用设置默认值。可以在每次调用时通过 `hindsight_*` 关键字参数覆盖这些值：

```python
hindsight_litellm.set_defaults(
    # 必填
    bank_id="my-agent",            # 记忆库 ID

    # 可选 - 记忆检索
    budget="mid",                  # 预算级别："low"、"mid"、"high"
    fact_types=["world", "observation"],  # 要检索的事实类型
    max_memories=10,               # 最多注入的记忆数（None = 不限）
    max_memory_tokens=4096,        # 记忆上下文的最大 token 数
    include_entities=True,         # 在召回结果中包含实体观测

    # 可选 - Reflect 模式
    use_reflect=True,              # 使用 reflect API（综合生成）而非 recall（原始记忆）
    reflect_include_facts=False,   # 在调试信息中包含来源事实
    reflect_context="I am a delivery agent finding recipients.",  # Reflect 推理所用的上下文
    reflect_response_schema={...}, # 用于 Reflect 结构化输出的 JSON Schema

    # 可选 - 调试
    trace=False,                   # 启用跟踪信息以便调试
    document_id="conversation-1",  # 用于对对话分组的文档 ID
)
```

### 3. 单次调用覆盖默认值 {#3-per-call-overrides}

通过 `hindsight_*` 关键字参数，在单次调用中覆盖任意默认值：

```python
response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[...],
    hindsight_query="Where is Alice located?",      # 查询记忆时使用的自定义查询
    hindsight_reflect_context="Currently on floor 3",  # 本次调用使用的 Reflect 上下文
    # hindsight_bank_id="other-bank",               # 为本次调用覆盖 bank_id
)
```

### 记忆库配置：任务说明 {#bank-configuration-mission}

使用 `set_bank_mission()` 配置记忆库应学习和记住的内容（用于心智模型）：

```python
hindsight_litellm.set_bank_mission(
    mission="""This agent routes customer support requests to the appropriate team.
    Remember which types of issues should go to which teams (billing, technical, sales).
    Track customer preferences for communication channels and past issue resolutions.""",
    name="Customer Support Router",  # 可选的显示名称
)
```

### 记忆模式：Reflect 与 Recall {#memory-modes-reflect-vs-recall}

- **Recall 模式**（`use_reflect=False`，默认）：检索原始记忆事实，并以编号列表的形式注入。适合需要获取具体、独立记忆的场景。
- **Reflect 模式**（`use_reflect=True`）：将记忆综合生成连贯的上下文段落。适合需要自然、对话式记忆上下文的场景。

```python
# Recall 模式 - 原始记忆
hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=False)
# 注入内容："1. [WORLD] User prefers Python\n2. [OBSERVATION] User dislikes Java..."

# Reflect 模式 - 综合生成的上下文
hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=True)
# 注入内容："Based on previous conversations, the user is a Python developer who..."

# 使用上下文进行 Reflect - 影响 LLM 推理（不影响检索）
hindsight_litellm.set_defaults(
    bank_id="my-agent",
    use_reflect=True,
    reflect_context="I am a delivery agent looking for package recipients.",
)
```

## 支持多个提供商 {#multi-provider-support}

适用于 LiteLLM 支持的所有提供商：

```python
import hindsight_litellm

hindsight_litellm.configure(hindsight_api_url="http://localhost:8888")
hindsight_litellm.set_defaults(bank_id="my-agent")
hindsight_litellm.enable()

messages = [{"role": "user", "content": "Hello!"}]

# OpenAI
hindsight_litellm.completion(model="gpt-4o", messages=messages, hindsight_query="greeting")

# Anthropic
hindsight_litellm.completion(model="claude-sonnet-4-20250514", messages=messages, hindsight_query="greeting")

# Groq
hindsight_litellm.completion(model="groq/llama-3.1-70b-versatile", messages=messages, hindsight_query="greeting")

# Azure OpenAI
hindsight_litellm.completion(model="azure/gpt-4", messages=messages, hindsight_query="greeting")

# AWS Bedrock
hindsight_litellm.completion(model="bedrock/anthropic.claude-3", messages=messages, hindsight_query="greeting")

# Google Vertex AI
hindsight_litellm.completion(model="vertex_ai/gemini-pro", messages=messages, hindsight_query="greeting")
```

## 直接调用记忆 API {#direct-memory-apis}

### Recall：查询原始记忆 {#recall---query-raw-memories}

```python
from hindsight_litellm import configure, set_defaults, recall

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

memories = recall("what projects am I working on?", budget="mid")
for m in memories:
    print(f"- [{m.fact_type}] {m.text}")
```

### Reflect：获取综合生成的上下文 {#reflect---get-synthesized-context}

```python
from hindsight_litellm import configure, set_defaults, reflect

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

result = reflect("what do you know about the user's preferences?")
print(result.text)

# 使用上下文影响响应（不影响检索）
result = reflect(
    query="what do I know about Alice?",
    context="I am a delivery agent looking for package recipients.",
)
```

### Retain：存入记忆 {#retain---store-memories}

```python
from hindsight_litellm import configure, set_defaults, retain, get_pending_retain_errors

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

# 异步存入（默认）- 速度快，不会阻塞
result = retain(
    content="User mentioned they're working on a machine learning project",
    context="Discussion about current projects",
)

# 同步存入 - 会阻塞直至完成，并立即抛出错误
result = retain(
    content="Critical information that must be stored",
    context="Important data",
    sync=True,
)

# 检查异步存入操作是否出错（定期调用）
errors = get_pending_retain_errors()
if errors:
    for e in errors:
        print(f"Background retain failed: {e}")
```

### 异步 API {#async-apis}

```python
from hindsight_litellm import arecall, areflect, aretain

# 所有记忆 API 的异步版本
memories = await arecall("what do you know about me?")
context = await areflect("summarize user preferences")
result = await aretain(content="New information to remember")
```

## 原生客户端包装器 {#native-client-wrappers}

用于直接集成 SDK 的替代方式，可取代 LiteLLM 回调。

### OpenAI 包装器 {#openai-wrapper}

```python
from openai import OpenAI
from hindsight_litellm import wrap_openai

client = OpenAI()
wrapped = wrap_openai(
    client,
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

response = wrapped.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "What do you know about me?"}]
)
```

### Anthropic 包装器 {#anthropic-wrapper}

```python
from anthropic import Anthropic
from hindsight_litellm import wrap_anthropic

client = Anthropic()
wrapped = wrap_anthropic(
    client,
    bank_id="my-agent",
    hindsight_api_url="http://localhost:8888",
)

response = wrapped.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## 调试模式 {#debug-mode}

当 `verbose=True` 时，可以准确检查注入了哪些记忆：

```python
from hindsight_litellm import configure, set_defaults, enable, completion, get_last_injection_debug

configure(hindsight_api_url="http://localhost:8888", verbose=True)
set_defaults(bank_id="my-agent", use_reflect=True)
enable()

response = completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What's my favorite color?"}],
    hindsight_query="What is the user's favorite color?",
)

# 检查注入的内容
debug = get_last_injection_debug()
if debug:
    print(f"Mode: {debug.mode}")           # "reflect" or "recall"
    print(f"Injected: {debug.injected}")   # True/False
    print(f"Results: {debug.results_count}")
    print(f"Memory context:\n{debug.memory_context}")
    if debug.error:
        print(f"Error: {debug.error}")
```

## 上下文管理器 {#context-manager}

```python
from hindsight_litellm import hindsight_memory
import litellm

with hindsight_memory(bank_id="user-123"):
    response = litellm.completion(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}],
        hindsight_query="greeting context",
    )
# 离开上下文后自动禁用记忆集成
```

## 禁用与清理 {#disabling-and-cleanup}

```python
from hindsight_litellm import disable, cleanup

# 暂时禁用记忆集成
disable()

# 清理所有资源（在关闭程序时调用）
cleanup()
```

## API 参考 {#api-reference}

### 主要函数 {#main-functions}

| 函数 | 说明 |
|----------|-------------|
| `configure(...)` | 配置 Hindsight 静态设置（API URL、身份验证、存储选项） |
| `set_defaults(...)` | 设置单次调用的默认值（bank_id、budget、Reflect 选项） |
| `enable()` | 启用与 LiteLLM 的记忆集成 |
| `disable()` | 禁用记忆集成 |
| `is_enabled()` | 检查记忆集成是否已启用 |
| `cleanup()` | 清理所有资源 |

### 配置函数 {#configuration-functions}

| 函数 | 说明 |
|----------|-------------|
| `get_config()` | 获取当前静态配置 |
| `get_defaults()` | 获取当前单次调用的默认值 |
| `is_configured()` | 检查是否已为 Hindsight 配置 `bank_id` |
| `reset_config()` | 将所有配置重置为默认值 |
| `set_document_id(id)` | 便捷地更新 `document_id` |
| `set_bank_mission(...)` | 为记忆库设置任务说明/指令（用于心智模型） |

### 记忆函数 {#memory-functions}

| 函数 | 说明 |
|----------|-------------|
| `recall(query, ...)` | 查询原始记忆（同步） |
| `arecall(query, ...)` | 查询原始记忆（异步） |
| `reflect(query, ...)` | 获取综合生成的记忆上下文（同步） |
| `areflect(query, ...)` | 获取综合生成的记忆上下文（异步） |
| `retain(content, sync=False, ...)` | 存入记忆（默认异步；使用 `sync=True` 时会阻塞） |
| `aretain(content, ...)` | 存入记忆（异步） |

### 错误跟踪函数 {#error-tracking-functions}

| 函数 | 说明 |
|----------|-------------|
| `get_pending_retain_errors()` | 获取并清除后台 Retain 操作产生的错误 |
| `get_pending_storage_errors()` | 获取并清除后台对话存储产生的错误 |

### 调试函数 {#debug-functions}

| 函数 | 说明 |
|----------|-------------|
| `get_last_injection_debug()` | 获取上次注入记忆的调试信息 |
| `clear_injection_debug()` | 清除已存储的调试信息 |

### 客户端包装器 {#client-wrappers}

| 函数 | 说明 |
|----------|-------------|
| `wrap_openai(client, ...)` | 为 OpenAI 客户端添加记忆功能 |
| `wrap_anthropic(client, ...)` | 为 Anthropic 客户端添加记忆功能 |

## 流式输出 {#streaming}

完全支持流式响应（`stream=True`）。检测到流式响应时，系统会自动包装响应，并在消费数据块时收集它们。流被完全消费后（或上下文管理器退出时），完整对话会存入 Hindsight。

以下集成模式都支持这种行为：

- **运行时猴子补丁包装器**（`enable()` / `completion()` / `acompletion()`）- 流式响应会透明地经过包装
- **原生客户端包装器**（`wrap_openai()`、`wrap_anthropic()`）- 同样会收集数据块
- **回调处理器** - 由于回调无法控制返回值，因此会跳过流式响应；如需在流式调用中存储对话，请使用运行时猴子补丁或原生包装器模式

## 环境要求 {#requirements}

- Python >= 3.10
- litellm >= 1.83.0
- 正在运行的 Hindsight API 服务器
