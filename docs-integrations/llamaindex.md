---
sidebar_position: 8
title: "LlamaIndex 持久记忆Hindsight |整合"
description: "通过Hindsight为LlamaIndex智能体添加长期记忆。支持智能体驱动工具 (HindsightToolSpec) 和通过 BaseMemory 接口自动记忆。"
---

# LlamaIndex {#llamaindex}

持久的长期记忆[LlamaIndex](https://docs.llamaindex.ai/)智能体，通过 Hindsight 提供记忆。 `hindsight-llamaindex`包提供了两种互补的模式：

- **`HindsightToolSpec`** — 智能身体驱动的记忆工具（retain/recall/reflect)
- **`HindsightMemory`** — 自动记忆LlamaIndex的`BaseMemory`接口

[查看更新日志 →](/changelog/integrations/llamaindex)

## 安装 {#installation}

```bash
pip install hindsight-llamaindex
```

---

## 自动记忆（BaseMemory） {#automatic-memory-basememory}

将Hindsight记忆添加到LlamaIndex智能体的最简单方法。每轮都会自动存储消息，并调用相关记忆并将其作为上下文注入。

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightMemory
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    memory = HindsightMemory.from_client(
        client=client,
        bank_id="user-123",
        mission="跟踪用户偏好和项目背景",
    )

    agent = ReActAgent(tools=[], llm=OpenAI(model="gpt-4o"))
    response = await agent.run("记住我更喜欢深色模式", memory=memory)
    print(response)

asyncio.run(main())
```

### 工作原理 {#how-it-works}

|活动|发生了什么|
|-------|-------------|
|智能体接收输入|`aget(input)` 回忆起相关记忆Hindsight，作为系统消息前置|
|智能体产生输出|`aput(message)` 保留消息至Hindsight未来记忆召回|
|新的会话开始|以前的记忆可以通过记忆召回获得；本地聊天缓冲区开始为空|

### `HindsightMemory.from_client()` {#hindsightmemoryfromclient}

|参数|类型|默认|说明|
|-----------|------|---------|-------------|
|`client`|`Hindsight`|*必填*|Hindsight 客户端实例|
|`bank_id`|`str`|*必填*|记忆 记忆库 ID|
|`mission`|`str`|`None`|记忆库任务 — 首次使用时自动创建记忆库|
|`context`|`str`|`"llamaindex"`|记忆存储操作的源标签|
|`budget`|`str`|`"mid"`|记忆召回预算水平|
|`max_tokens`|`int`|`4096`|最大记忆召回令牌|
|`tags`|`list[str]`|`None`|记忆存储操作标签|
|`recall_tags`|`list[str]`|`None`|要过滤的标签 记忆召回|
|`recall_tags_match`|`str`|`"any"`|标签匹配模式|
|`system_prompt`|`str`|*（内置）*|记忆系统消息模板。必须包含 `{memories}`|
|`chat_history_limit`|`int`|`100`|本地缓冲区中的最大消息数|

还有：`HindsightMemory.from_url(hindsight_api_url, bank_id, ...)` 用于在没有预先构建的客户端的情况下进行创建。

---

## 智能体驱动工具 (BaseToolSpec) {#agent-driven-tools-basetoolspec}

对于显式控制，将retain/recall/reflect公开为智能体可以选择调用的工具。

### 快速入门：工具规范 {#quick-start-tool-spec}

```python
import asyncio
from hindsight_client import Hindsight
from hindsight_llamaindex import HindsightToolSpec
from llama_index.llms.openai import OpenAI
from llama_index.core.agent import ReActAgent

async def main():
    client = Hindsight(base_url="http://localhost:8888")

    spec = HindsightToolSpec(
        client=client,
        bank_id="user-123",
        mission="跟踪用户偏好",
    )
    tools = spec.to_tool_list()

    agent = ReActAgent(tools=tools, llm=OpenAI(model="gpt-4o"))
    response = await agent.run("记住我更喜欢深色模式")
    print(response)

asyncio.run(main())
```

### 快速入门：工厂功能 {#quick-start-factory-function}

```python
from hindsight_llamaindex import create_hindsight_tools

tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    mission="跟踪用户偏好",
)
```

### 选择工具 {#selecting-tools}

```python
#通过 to_tool_list()
tools = spec.to_tool_list(spec_functions=["recall_memory", "reflect_on_memory"])

#通过工厂标志
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,
)
```

### 配置 {#configuration}

通过设置默认值 `configure()`，覆盖每次调用：

```python
from hindsight_llamaindex import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",  # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",
    tags=["source:llamaindex"],
    context="my-app",
    mission="跟踪用户偏好",
)

# 现在创建工具时无需传入 client/url
tools = create_hindsight_tools(bank_id="user-123")
```

### `HindsightToolSpec()` {#hindsighttoolspec}

|参数|类型|默认|说明|
|-----------|------|---------|-------------|
|`bank_id`|`str`|*必填*|Hindsight 记忆库进行操作|
|`client`|`Hindsight`|`None`|预配置Hindsight客户端|
|`hindsight_api_url`|`str`|`None`|API URL（如果没有提供客户端则使用）|
|`api_key`|`str`|`None`|API 密钥（如果没有提供客户端则使用）|
|`budget`|`str`|`None` → `"mid"`|Recall/reflect预算：`low`，`mid`，`high`|
|`max_tokens`|`int`|`None` → `4096`|记忆结果的最大 token 数数|
|`tags`|`list[str]`|`None`|存储记忆时应用的标签|
|`recall_tags`|`list[str]`|`None`|过滤记忆结果的标签|
|`recall_tags_match`|`str`|`None` → `"any"`|标签匹配：`any`，`all`，`any_strict`，`all_strict`|
|`retain_metadata`|`dict[str, str]`|`None`|记忆存储操作的默认元数据|
|`retain_document_id`|`str`|`None`|记忆存储的文档 ID。自动生成`{session}-{timestamp}` 如果未设置|
|`retain_context`|`str`|`"llamaindex"`|记忆存储操作的源标签|
|`recall_types`|`list[str]`|`None`|事实类型：`world`，`experience`，`observation`|
|`recall_include_entities`|`bool`|`False`|在记忆结果中包含实体信息|
|`reflect_context`|`str`|`None`|反思的附加背景|
|`reflect_max_tokens`|`int`|`None`|回忆的最大 token 数（默认为 `max_tokens`)|
|`reflect_response_schema`|`dict`|`None`|JSON 约束输出的模式|
|`reflect_tags`|`list[str]`|`None`|标签（默认为 `recall_tags`)|
|`reflect_tags_match`|`str`|`None`|标签匹配 ⟪ （默认为 `recall_tags_match`)|
|`mission`|`str`|`None`|记忆库任务 — 首次使用时自动创建记忆库|

---

## 生产环境模式 {#production-patterns}

### 记忆库使命 {#bank-mission}

设定一个任务，为记忆引擎提供事实提取的上下文：

```python
# Tools
spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    mission="跟踪用户编码偏好、项目背景和技术决策",
)

# Memory
memory = HindsightMemory.from_client(
    client=client,
    bank_id="user-123",
    mission="跟踪用户编码偏好、项目背景和技术决策",
)
```

记忆库在首次使用时自动创建。如果它已经存在，则会默默地跳过创建。

### 记忆用标签界定范围 {#memory-scoping-with-tags}

```python
spec = HindsightToolSpec(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],        #适用于所有保留
    recall_tags=["source:chat"],                 #过滤回忆聊天记录
    recall_tags_match="any",
)
```

### 错误处理 {#error-handling}

两种模式都可以优雅地处理错误——记录操作并返回友好的消息，而不是引发异常。 即使记忆不可用，智能体仍能继续运作。

### 结合工具+记忆 {#combining-tools--memory}

同时使用两种模式以获得最大的灵活性：

```python
from hindsight_llamaindex import create_hindsight_tools, HindsightMemory

#自动记忆以丰富上下文
memory = HindsightMemory.from_client(client=client, bank_id="user-123")

#智能体驱动的显式工具 反思
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=False,   #记忆自动处理记忆存储
    include_recall=False,   #记忆自动处理记忆召回
    include_reflect=True,   #智能体还可以明确反思
)

agent = ReActAgent(tools=tools, llm=llm)

#将记忆传递给run()
response = await agent.run("我应该优先考虑什么？", memory=memory)
```

## 环境要求 {#requirements}

- Python 3.10+
- `llama-index-core >= 0.11.0`
- `hindsight-client >= 0.4.0`
