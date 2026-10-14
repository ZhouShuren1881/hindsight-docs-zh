---
title: "指南：使用 Hindsight 为 Agno 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agno, agents, memory]
description: "使用 hindsight-agno 工具包为 Agno 添加 Hindsight 记忆，让智能体能够召回相关事实，并跨会话存入所学内容。"
image: /img/guides/guide-agno-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Agno 添加记忆](/img/guides/guide-agno-memory-with-hindsight.svg)

如果要为 Agno 接入 **Hindsight 记忆**，最简洁的方式是使用 `hindsight-agno` 工具包。它扩展了 Agno 原生的 `Toolkit` 基类，并为智能体提供三个记忆工具——Retain（存入）、Recall（召回）和 Reflect（反思）——让智能体能够存储所学内容、搜索相关事实，并跨会话基于自身记忆进行推理。

这很适合 Agno，因为 Agno 智能体本身就由工具驱动。你无需额外拼接一套独立的记忆系统，只要像添加其他工具包一样，把 `HindsightTools` 加入智能体的 `tools` 列表，模型就会决定何时存入或召回记忆。你还可以通过 `memory_instructions` 预先召回记忆并注入系统提示词，让上下文在第一轮对话前就已就绪。

本指南将介绍如何安装工具包、将其连接到 Hindsight 后端、为不同用户配置各自的记忆库，以及通过快速验证流程确认记忆确实在使用。操作时可随时参考[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-agno`。
> 2. 设置 `HINDSIGHT_API_KEY`（Cloud），或将 `hindsight_api_url` 指向自托管服务器。
> 3. 将 `HindsightTools(bank_id="user-123", hindsight_api_url="...")` 加入智能体的 `tools` 列表。
> 4. 记忆库通过 `bank_id`、自定义解析器或 `RunContext.user_id` 确定。
> 5. 验证后续运行能否召回先前运行存入的内容。

## 前提条件 {#prerequisites}

开始前，请确保已具备以下条件：

- Python >= 3.10，且已安装 `agno`
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器
- 已为 Agno 智能体配置模型（例如 `OpenAIChat`）

## 步骤 1：安装工具包 {#step-1-install-the-toolkit}

将工具包与 Agno 一起安装。

```bash
pip install hindsight-agno
```

`HindsightTools` 与 `Mem0Tools` 一样扩展了 Agno 原生的 `Toolkit` 基类，因此可以直接加入现有智能体，无需改变 Agno 的使用方式。

## 步骤 2：将工具包连接到 Hindsight {#step-2-point-the-toolkit-at-hindsight}

使用 Hindsight Cloud 时，可将 API 密钥设为环境变量，也可以直接传入 `api_key=`：

```bash
export HINDSIGHT_API_KEY="hsk_..."
```

然后将工具包添加到智能体：

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from hindsight_agno import HindsightTools

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
        api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
    )],
)

agent.print_response("Remember that I prefer dark mode")
agent.print_response("What are my preferences?")
```

使用自托管的 Hindsight 服务器时，将 URL 换成你的本地端点即可。例如，运行 `./scripts/dev/start-api.sh` 时，端点可以是 `http://localhost:8888`。

## 步骤 3：一次性进行全局配置（可选） {#step-3-configure-once-globally-optional}

你可以只配置一次连接信息，无需在每个工具包中重复传入：

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # Recall 预算：low/mid/high
    max_tokens=4096,               # 召回结果的最大 token 数
    tags=["env:prod"],             # 存入记忆时使用的标签
    recall_tags=["scope:global"],  # 用于筛选召回结果的标签
    recall_tags_match="any",       # 标签匹配模式：any/all/any_strict/all_strict
)

# 创建工具包时无需再传入连接信息
tools = [HindsightTools(bank_id="user-123")]
```

## 工具包如何使用记忆 {#how-the-toolkit-uses-memory}

添加 `HindsightTools` 后，智能体便可自行调用以下三个工具：

- **`retain_memory`**：将信息存入长期记忆
- **`recall_memory`**：在长期记忆中搜索相关事实
- **`reflect_on_memory`**：根据记忆综合生成经过推理的回答

你可以通过切换 `enable_retain`、`enable_recall` 和 `enable_reflect`，只启用所需工具：

```python
tools = [HindsightTools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不启用反思
)]
```

如果希望在第一轮对话前就提供记忆，可使用 `memory_instructions` 预先召回相关记忆，并将其注入系统提示词：

```python
from hindsight_agno import HindsightTools, memory_instructions

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
    instructions=[memory_instructions(
        bank_id="user-123",
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
)
```

如需了解更底层的行为，请阅读 [Hindsight 的 Recall API](/developer/api/recall) 和 [Hindsight 的 Retain API](/developer/api/retain)。

## 按用户划分记忆库 {#per-user-memory-banks}

记忆库 ID 按以下优先顺序解析：

1. **`bank_resolver`**：自定义可调用对象，签名为 `(RunContext) -> str`
2. **`bank_id`**：传给构造函数的静态记忆库 ID
3. **`run_context.user_id`**：自动按用户创建记忆库

这意味着，你可以向智能体传入 `user_id`，为每位用户提供独立的记忆；也可以使用自定义解析器，让团队成员共享同一个记忆库：

```python
# 从 RunContext 获取各用户的记忆库
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="https://api.hindsight.vectorize.io")],
    user_id="user-123",  # 用作 bank_id
)

# 自定义解析器
def resolve_bank(ctx):
    return f"team-{ctx.user_id}"

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(
        bank_resolver=resolve_bank,
        hindsight_api_url="https://api.hindsight.vectorize.io",
    )],
)
```

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

可以按以下步骤进行测试：

1. 创建一个使用 `HindsightTools` 的智能体
2. 告诉它一件值得记住的事
3. 在同一个记忆库上启动一次全新的运行
4. 询问先前提到的事实

例如：

```python
agent.print_response("Remember that I prefer dark mode")
agent.print_response("What are my preferences?")
```

如果第二次响应中出现了先前提到的偏好，说明配置已正常工作。

## 常见错误 {#common-mistakes}

### 未提供记忆库 {#not-providing-a-bank}

如果 `bank_resolver`、`bank_id` 和 `user_id` 都无法解析出记忆库，工具包就没有可读取或写入的记忆库。请确保至少设置其中一项。

### 期待跨记忆库召回 {#expecting-cross-bank-recall}

每个记忆库彼此隔离。在一个记忆库 ID 下存入的记忆不会出现在另一个记忆库中，因此请在不同运行之间保持记忆库策略一致。

### 忘记 API 密钥 {#forgetting-the-api-key}

使用 Hindsight Cloud 时，请设置 `HINDSIGHT_API_KEY`，或将 `api_key=` 传给工具包或 `configure()`。否则，调用 Cloud 时无法通过身份验证。

### 禁用了所需工具 {#disabling-the-tool-you-need}

`enable_retain`、`enable_recall` 和 `enable_reflect` 的默认值都是 `True`。关闭某个开关后，智能体就会失去对应能力。例如，禁用召回后，智能体仍能存入记忆，却无法搜索记忆。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不需要。自托管的 Hindsight 服务器也可以使用，只需将 `hindsight_api_url` 指向你自己的服务器，而不是 Cloud URL。

### 这会改变我使用 Agno 的方式吗？ {#does-this-change-how-i-use-agno}

不会。`HindsightTools` 扩展了 Agno 原生的 `Toolkit`，因此你只需像添加其他工具包一样，将它加入智能体的 `tools` 列表。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

范围按记忆库划分。记忆库依次通过 `bank_resolver`、`bank_id` 和 `RunContext.user_id` 解析。

### 我可以控制智能体能使用哪些工具吗？ {#can-i-control-which-tools-the-agent-gets}

可以。使用 `enable_retain`、`enable_recall` 和 `enable_reflect`，只启用所需的工具。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始
- 阅读 [Hindsight 完整文档](/)
- 按照[快速入门指南](/developer/api/quickstart)操作
- 查看 [Hindsight 的 Recall API](/developer/api/recall)
- 查看 [Hindsight 的 Retain API](/developer/api/retain)
- 阅读 [Agno 集成文档](/sdks/integrations/agno)
