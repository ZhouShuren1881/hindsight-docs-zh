---
sidebar_position: 1
title: "LiteLLM 持久记忆Hindsight |集成指南"
description: "通过LiteLLM和Hindsight将持久记忆添加到任何LLM应用程序。通用集成——只需几行代码即可与任何模型或提供商配合使用。"
---

# LiteLLM {#litellm}

通用LLM通过进行记忆整合 [LiteLLM](https://github.com/BerriAI/litellm)。为任何内容添加持久记忆  只需几行代码即可实现LLM应用程序。

[查看更新日志 →](/changelog/integrations/litellm)

## 功能 {#features}

- **支持多种 LLM** - 适用于 100+LLM提供商通过LiteLLM（OpenAI,Anthropic、Groq、Azure、AWS Bedrock、Google顶点AI，等等）
- **简单集成** - 只需配置、设置默认值、启用和使用 `hindsight_litellm.completion()`
- **自动注入记忆** - 之前将相关记忆注入到提示中LLM来电
- **自动存储对话** - 对话存储到Hindsight用于未来的记忆召回（默认情况下为异步性能）
- **两种记忆模式** - 选择`reflect`（综合上下文）或`recall`（原始记忆检索）
- **直接调用记忆 API** - 手动查询、合成和存储记忆
- **原生客户端包装器** - 替代包装OpenAI和AnthropicSDK
- **调试模式** - 准确检查正在注入的记忆

## 安装 {#installation}

```bash
pip install hindsight-litellm
```

## 快速入门 {#quick-start}

```python
import hindsight_litellm

#步骤 1：配置静态设置
hindsight_litellm.configure(
    hindsight_api_url="http://localhost:8888",
    verbose=True,
)

#步骤 2：设置默认值（需要bank_id）
hindsight_litellm.set_defaults(
    bank_id="my-agent",
    use_reflect=True,  #使用“反思”来合成上下文
)

#步骤 3：启用记忆集成
hindsight_litellm.enable()

#步骤 4：使用记忆补全
response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "我们讨论了AI什么？"}],
    hindsight_query="我对 AI 讨论了解多少？",
)
```

**重要提示：** 当`inject_memories=True`（默认），您可以提供`hindsight_query` 指定要在记忆中搜索的内容。如果省略，则使用最后一条用户消息作为查询。

## 工作原理 {#how-it-works}

当你打电话时`completion()`，以下情况会自动发生：

1. **记忆检索** -  根据对话查询Hindsight相关记忆
2. **提示注入** - 记忆被注入系统消息
3. **LLM 调用** - 丰富的提示发送到LLM
4. **对话存储** - 对话存储到Hindsight未来记忆召回
5. **返回响应** - 您正常收到回复

## 配置选项 {#configuration-options}

API 分为两个函数：
为了清楚起见，

### 1。 `configure()` - 静态设置 {#1-configure---static-settings}

在会话期间通常不会更改的设置：

```python
hindsight_litellm.configure(
    # Required
    hindsight_api_url="http://localhost:8888",  #Hindsight API 服务器 URL

    # Optional - Authentication
    api_key="your-api-key",        #API Hindsight 身份验证钥匙

    #可选 - 记忆行为
    store_conversations=True,      #存储LLM 通话后的对话
    inject_memories=True,          #在提示中注入相关记忆
    sync_storage=False,            #False = 异步存储（默认，性能更好）
                                   #True = 同步存储（阻塞，立即引发错误）

    # Optional - Advanced
    injection_mode="system_message",  #如何注入：“system_message”或“prepend_user”
    excluded_models=["gpt-3.5*"],     #从拦截中排除某些模型
    verbose=True,                     #启用详细日志记录和调试信息
)
```

### 2。 `set_defaults()` - 每次调用默认值 {#2-setdefaults---per-call-defaults}

每次调用设置的默认值。可以使用 在各个调用中覆盖这些 `hindsight_*` kwargs：

```python
hindsight_litellm.set_defaults(
    # Required
    bank_id="my-agent",            #记忆 记忆库 ID

    #可选 - 记忆检索
    budget="mid",                  #预算水平：“低”、“中”、“高”
    fact_types=["world", "observation"],  #过滤要检索的事实类型
    max_memories=10,               #注入的最大记忆（无 = 无限）
    max_memory_tokens=4096,        #记忆上下文的最大 token 数
    include_entities=True,         #将实体观察纳入记忆召回中

    #可选 - 亮度模式
    use_reflect=True,              #使用 API（合成）与记忆召回（原始记忆）
    reflect_include_facts=False,   #在调试信息中包含源事实
    reflect_context="我是寻找收件人的投递智能体。",  #推理推理的上下文
    reflect_response_schema={...}, #JSON 结构化光束输出模式

    # Optional - Debugging
    trace=False,                   #启用跟踪信息以进行调试
    document_id="conversation-1",  #用于对对话进行分组的文档 ID
)
```

### 3。每次调用覆盖 {#3-per-call-overrides}

使用覆盖单个调用的任何默认值 `hindsight_*` kwargs：

```python
response = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[...],
    hindsight_query="爱丽丝在哪里？",      #用于记忆查找的自定义查询
    hindsight_reflect_context="目前在3楼",  #每次调用上下文覆盖
    #hindsight_bank_id="other-记忆库", # 覆盖此调用的bank_id
)
```

### 记忆库配置：任务 {#bank-configuration-mission}

使用`set_bank_mission()` 配置记忆库应该学习和记住的内容（用于心智模型）：

```python
hindsight_litellm.set_bank_mission(
    mission="""此智能体将客户支持请求路由到适当的团队。
    记住哪些类型的问题应该交给哪些团队（计费、技术、销售）。
    跟踪客户对沟通渠道的偏好和过去的问题解决方案。""",
    name="客户支持路由器",  #可选显示名称
)
```

### 记忆模式：回忆与记忆召回 {#memory-modes-reflect-vs-recall}

- **记忆召回模式** (`use_reflect=False`，默认）：检索原始记忆事实并将其作为编号列表注入。当您需要精确的个人记忆时，这是最好的选择。
- **反思模式** (`use_reflect=True`)：将记忆合成一个连贯的上下文段落。最适合自然的、会话式的记忆环境。

```python
#记忆召回模式 - 原始记忆
hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=False)
# 注入："1. [WORLD] 用户偏好 Python\n2. [OBSERVATION] 用户不喜欢 Java……"

#反思模式 - 综合上下文
hindsight_litellm.set_defaults(bank_id="my-agent", use_reflect=True)
# Injects: "根据之前的对话，该用户是一名Python开发者，他..."

#联想上下文 - 形状 LLM 推理（不是检索）
hindsight_litellm.set_defaults(
    bank_id="my-agent",
    use_reflect=True,
    reflect_context="我是一名正在寻找包裹收件人的投递智能体。",
)
```

## 多提供商支持 {#multi-provider-support}

可与任何LiteLLM支持的提供商合作：

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

#天蓝色OpenAI
hindsight_litellm.completion(model="azure/gpt-4", messages=messages, hindsight_query="greeting")

#AWS 基岩
hindsight_litellm.completion(model="bedrock/anthropic.claude-3", messages=messages, hindsight_query="greeting")

#Google 顶点AI
hindsight_litellm.completion(model="vertex_ai/gemini-pro", messages=messages, hindsight_query="greeting")
```

## 直接记忆 API {#direct-memory-apis}

### 记忆召回 - 查询原始记忆 {#recall---query-raw-memories}

```python
from hindsight_litellm import configure, set_defaults, recall

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

memories = recall("我正在从事哪些项目？", budget="mid")
for m in memories:
    print(f"- [{m.fact_type}] {m.text}")
```

### 反思 - 获取综合上下文 {#reflect---get-synthesized-context}

```python
from hindsight_litellm import configure, set_defaults, reflect

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

result = reflect("你对用户的偏好了解多少？")
print(result.text)

#通过上下文来形成响应（不影响检索）
result = reflect(
    query="我对爱丽丝了解多少？",
    context="我是一名正在寻找包裹收件人的投递智能体。",
)
```

### 记忆存储 - 存储记忆 {#retain---store-memories}

```python
from hindsight_litellm import configure, set_defaults, retain, get_pending_retain_errors

configure(hindsight_api_url="http://localhost:8888")
set_defaults(bank_id="my-agent")

#异步记忆存储（默认）-快速、非阻塞
result = retain(
    content="用户提到他们正在开发一个机器学习项目",
    context="关于当前项目的讨论",
)

#同步记忆存储 - 阻塞直到完成，立即引发错误
result = retain(
    content="必须存储的关键信息",
    context="重要数据",
    sync=True,
)

#检查异步记忆存储错误（定期调用）
errors = get_pending_retain_errors()
if errors:
    for e in errors:
        print(f"Background retain failed: {e}")
```

### 异步 API {#async-apis}

```python
from hindsight_litellm import arecall, areflect, aretain

#所有记忆 API 的异步版本
memories = await arecall("你对我了解多少？")
context = await areflect("总结用户偏好")
result = await aretain(content="要记住的新信息")
```

## 本机客户端包装器 {#native-client-wrappers}

直接SDK集成的LiteLLM回调的替代方案。

### OpenAI 包装纸 {#openai-wrapper}

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
    messages=[{"role": "user", "content": "你对我了解多少？"}]
)
```

### Anthropic 包装纸 {#anthropic-wrapper}

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

当`verbose=True`，您可以准确检查正在注入哪些记忆：

```python
from hindsight_litellm import configure, set_defaults, enable, completion, get_last_injection_debug

configure(hindsight_api_url="http://localhost:8888", verbose=True)
set_defaults(bank_id="my-agent", use_reflect=True)
enable()

response = completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "我最喜欢什么颜色？"}],
    hindsight_query="用户最喜欢什么颜色？",
)

#检查注入的内容
debug = get_last_injection_debug()
if debug:
    print(f"Mode: {debug.mode}")           # "reflect" or "recall"
    print(f"Injected: {debug.injected}")   # True/False
    print(f"Results: {debug.results_count}")
    print(f"记忆上下文：\n{debug.memory_context}")
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
        hindsight_query="问候语上下文",
    )
#记忆集成在上下文后自动禁用
```

## 禁用和清理 {#disabling-and-cleanup}

```python
from hindsight_litellm import disable, cleanup

#暂时禁用记忆集成
disable()

#清理所有资源（关机时调用）
cleanup()
```

## API参考 {#api-reference}

### 主要功能 {#main-functions}

|功能|说明|
|----------|-------------|
|`configure(...)`|配置静态Hindsight 设置（API URL、身份验证、存储选项）|
|`set_defaults(...)`|设置每次通话设置的默认值（bank_id、预算、亮度选项）|
|`enable()`|启用与LiteLLM的记忆集成|
|`disable()`|禁用记忆集成|
|`is_enabled()`|检查记忆集成是否启用|
|`cleanup()`|清理所有资源|

### 配置功能 {#configuration-functions}

|功能|说明|
|----------|-------------|
|`get_config()`|获取当前静态配置|
|`get_defaults()`|获取当前每次调用的默认值|
|`is_configured()`|检查Hindsight是否配置了bank_id|
|`reset_config()`|将所有配置重置为默认值|
|`set_document_id(id)`|便捷更新功能document_id|
|`set_bank_mission(...)`|设置mission/instructions 记忆库（心智模型）|

### 记忆功能 {#memory-functions}

|功能|说明|
|----------|-------------|
|`recall(query, ...)`|查询原始记忆（同步）|
|`arecall(query, ...)`|查询原始记忆（异步）|
|`reflect(query, ...)`|获取综合记忆上下文（同步）|
|`areflect(query, ...)`|获取综合记忆上下文（异步）|
|`retain(content, sync=False, ...)`|存储记忆（默认异步，使用 `sync=True`阻止）|
|`aretain(content, ...)`|存储记忆（异步）|

### 错误跟踪功能 {#error-tracking-functions}

|功能|说明|
|----------|-------------|
|`get_pending_retain_errors()`|获取并清除后台记忆存储操作中的错误|
|`get_pending_storage_errors()`|从后台对话存储中获取并清除错误|

### 调试功能 {#debug-functions}

|功能|说明|
|----------|-------------|
|`get_last_injection_debug()`|从上次记忆注入中获取调试信息|
|`clear_injection_debug()`|清除存储的调试信息|

### 客户端包装器 {#client-wrappers}

|功能|说明|
|----------|-------------|
|`wrap_openai(client, ...)`|用记忆包裹OpenAI客户|
|`wrap_anthropic(client, ...)`|用记忆包裹Anthropic客户|

## 流式输出 {#streaming}

流式响应 (`stream=True`）完全支持。当检测到流时，响应会自动包装以收集消耗的块。一旦流被完全消耗（或上下文管理器退出），完整的对话将存储到Hindsight。

这适用于所有集成模式：
- **运行时补丁包装器** (`enable()` / `completion()` / `acompletion()`) — 流响应被透明包装
- **原生客户端包装器** (`wrap_openai()`，`wrap_anthropic()`) — 相同的块集合行为
- **回调处理器** — 在回调中跳过流响应，因为回调不控制返回值；使用monkeypatch或本机包装器模式进行存储流式传输

## 环境要求 {#requirements}

- Python >= 3.10
- litellm >= 1.83.0
- 正在运行 Hindsight API 服务器
