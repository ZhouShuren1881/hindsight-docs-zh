---
sidebar_position: 8
title: "使用 Hindsight 为 AG2（AutoGen）提供持久记忆 | 集成指南"
description: "使用 Hindsight 为 AG2（AutoGen）智能体添加跨对话的长期持久记忆，支持自动事实提取、实体跟踪和记忆召回工具。"
---

# AG2 {#ag2}

为 [AG2](https://ag2.ai) 智能体（AutoGen 的社区分支）提供持久的长期记忆，使其拥有可跨对话使用的 Retain（存入）、Recall（召回）和 Reflect（反思）工具。

[查看更新日志 →](/changelog/integrations/ag2)

## 功能 {#features}

- **即插即用工具**：一行 `register_hindsight_tools()` 即可注册 Retain、Recall 和 Reflect。
- **原生兼容 AG2**：使用 `Annotated` 类型提示，兼容 AG2 的 `@register_for_llm` / `@register_for_execution` 模式。
- **支持 GroupChat**：多个智能体可以共享同一记忆库。
- **按需选择工具**：仅包含需要的工具（`include_retain`、`include_recall`、`include_reflect`）。
- **简单配置**：全局配置一次，或为每套工具单独设置覆盖项。

## 安装 {#installation}

```bash
pip install hindsight-ag2
```

## 快速开始 {#quick-start}

```python
from autogen import AssistantAgent, UserProxyAgent, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    assistant = AssistantAgent(
        name="assistant",
        system_message="You are a helpful assistant with long-term memory.",
    )
    user_proxy = UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
    )

# 为两个智能体注册 Hindsight 记忆工具
register_hindsight_tools(
    assistant, user_proxy,
    bank_id="my-bank",
    hindsight_api_url="http://localhost:8888",
)

# 助手现在可以使用 hindsight_retain、hindsight_recall 和 hindsight_reflect
result = user_proxy.initiate_chat(
    assistant,
    message="Remember that I prefer Python over JavaScript.",
)
```

这样，助手就可以在不同对话之间存储和检索记忆。

## 工作原理 {#how-it-works}

此集成通过 Hindsight API 提供三个兼容 AG2 的工具函数：

| 工具 | Hindsight | 执行过程 |
|------|-----------|--------------|
| `hindsight_retain(content)` | `retain(bank_id, content, ...)` | 存储内容。Hindsight 从原始文本中提取事实、实体和关系。 |
| `hindsight_recall(query)` | `recall(bank_id, query, ...)` | 执行语义检索、BM25 检索、图遍历和重排序，并返回按编号排列的匹配记忆。 |
| `hindsight_reflect(query)` | `reflect(bank_id, query, ...)` | 结合所有相关记忆和记忆库的性格倾向，综合生成经过推理的答案。 |

这些工具是带有 `Annotated` 类型提示的普通 Python 函数。AG2 会根据这些提示生成 LLM 可见的工具 schema。

## 配置 {#configuration}

### 全局配置 {#global-configuration}

```python
from hindsight_ag2 import configure

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",              # low / mid / high
    max_tokens=4096,
    tags=["source:ag2"],       # Retain 操作的默认标签
)
```

### 单套工具的覆盖配置 {#per-tool-overrides}

构造函数参数会覆盖全局配置：

```python
from hindsight_ag2 import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="my-bank",
    hindsight_api_url="http://localhost:8888",
    budget="high",
    max_tokens=8192,
    tags=["team:alpha"],
)
```

## 在 GroupChat 中共享记忆 {#groupchat-with-shared-memory}

GroupChat 中的多个智能体可以共享同一记忆库：

```python
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager, LLMConfig
from hindsight_ag2 import register_hindsight_tools

llm_config = LLMConfig(api_type="openai", model="gpt-4o-mini")

with llm_config:
    researcher = AssistantAgent(name="researcher", system_message="You research topics.")
    writer = AssistantAgent(name="writer", system_message="You write content.")
    executor = UserProxyAgent(name="executor", human_input_mode="NEVER")

# 所有智能体共享同一记忆库
for agent in [researcher, writer]:
    register_hindsight_tools(agent, executor, bank_id="team-memory")

group_chat = GroupChat(agents=[researcher, writer, executor], messages=[])
manager = GroupChatManager(groupchat=group_chat)
```

## 手动注册 {#manual-registration}

如果需要完全控制工具的注册方式：

```python
from hindsight_ag2 import create_hindsight_tools

tools = create_hindsight_tools(
    bank_id="my-bank",
    hindsight_api_url="http://localhost:8888",
)
for tool_fn in tools:
    assistant.register_for_llm(description=tool_fn.__doc__)(tool_fn)
    user_proxy.register_for_execution()(tool_fn)
```

## API 参考 {#api-reference}

### 配置 {#configuration-1}

| 函数 | 说明 |
|----------|-------------|
| `configure(...)` | 设置全局连接和默认选项 |
| `get_config()` | 获取当前配置 |
| `reset_config()` | 将配置重置为 None |

### create_hindsight_tools {#create_hindsight_tools}

| 参数 | 默认值 | 说明 |
|-----------|---------|-------------|
| `bank_id` | 必填 | Hindsight 记忆库 ID |
| `client` | `None` | 预先配置的 `Hindsight` 客户端 |
| `hindsight_api_url` | 来自配置 | Hindsight API 地址 |
| `api_key` | 来自配置 | API 密钥 |
| `budget` | `"mid"` | Recall 和 Reflect 的预算（low/mid/high） |
| `max_tokens` | `4096` | Recall 结果的最大 token 数 |
| `tags` | `None` | 存储记忆时应用的标签 |
| `recall_tags` | `None` | 检索时用于筛选的标签 |
| `recall_tags_match` | `"any"` | 标签匹配模式（any/all/any_strict/all_strict） |
| `retain_metadata` | `None` | Retain 操作使用的元数据字典 |
| `retain_document_id` | `None` | Retain 操作使用的文档 ID，用于将记忆分组或更新 |
| `recall_types` | `None` | 要筛选的事实类型（world、experience、observation） |
| `recall_include_entities` | `False` | 是否在 Recall 结果中包含实体信息 |
| `reflect_context` | `None` | Reflect 操作的附加上下文 |
| `reflect_max_tokens` | `max_tokens` | Reflect 结果的最大 token 数 |
| `reflect_response_schema` | `None` | 用于约束 Reflect 输出格式的 JSON schema |
| `reflect_tags` | `recall_tags` | 筛选 Reflect 所用记忆的标签 |
| `reflect_tags_match` | `recall_tags_match` | Reflect 的标签匹配模式 |
| `include_retain` | `True` | 是否包含 Retain 工具 |
| `include_recall` | `True` | 是否包含 Recall 工具 |
| `include_reflect` | `True` | 是否包含 Reflect 工具 |

## 环境要求 {#requirements}

- Python >= 3.10
- ag2 >= 0.9.0
- 正在运行的 Hindsight API 服务器
