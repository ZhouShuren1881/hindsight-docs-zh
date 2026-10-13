---
title: "指南：使用 Hindsight 为 Agno 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, agno, agents, memory]
description: "使用 hindsight-agno 工具包，让 Agno 智能体召回相关事实、跨会话存储所学。"
image: /img/guides/guide-agno-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Agno 添加记忆](/img/guides/guide-agno-memory-with-hindsight.svg)

如需 **Agno 与 Hindsight 记忆**，使用继承原生 `Toolkit` 的 `hindsight-agno`，提供存储、召回和反思工具，跨会话保存知识、搜索事实和推理。

Agno 已由工具驱动，将 `HindsightTools` 加到 `tools`，模型决定时机。也可通过 `memory_instructions` 预召回注入，让首轮前有上下文。

本指南介绍安装、后端、按用户分库和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-agno`.
> 2. Cloud 设置 `HINDSIGHT_API_KEY`，或 URL 指向自托管。
> 3. 将 `HindsightTools(bank_id="user-123", hindsight_api_url="...")` 加入 `tools`。
> 4. 库由 ID、自定义解析器或 `RunContext.user_id` 决定。
> 5. 验证后续召回。

## 前提条件 {#prerequisites}

开始前确认：

- Python >= 3.10 和 `agno`。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。
- 已配置模型，如 `OpenAIChat`。

## 步骤 1：安装工具包 {#step-1-install-the-toolkit}

与 Agno 一起安装。

```bash
pip install hindsight-agno
```

与 `Mem0Tools` 一样继承 `Toolkit`，无需改现有方式。

## 步骤 2：连接 Hindsight {#step-2-point-the-toolkit-at-hindsight}

Cloud 设置环境密钥或直接传 `api_key=`：

```bash
export HINDSIGHT_API_KEY="hsk_..."
```

添加工具包：

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

agent.print_response("记住，我喜欢深色模式")
agent.print_response("我的偏好是什么？")
```

自托管换为本地端点，如 `./scripts/dev/start-api.sh` 的 `http://localhost:8888`。

## 步骤 3：可选全局配置 {#step-3-configure-once-globally-optional}

无需每工具包重复传入：

```python
from hindsight_agno import configure, HindsightTools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 召回预算：low/mid/high
    max_tokens=4096,               # 召回结果最大 token 数
    tags=["env:prod"],             # 存储标签
    recall_tags=["scope:global"],  # 召回筛选标签
    recall_tags_match="any",       # 匹配模式：any/all/any_strict/all_strict
)

# 创建时无需传连接细节 {#now-create-the-toolkit-without-passing-connection-details}
tools = [HindsightTools(bank_id="user-123")]
```

## 工具包如何使用记忆 {#how-the-toolkit-uses-memory}

提供三个自主调用工具：

- **`retain_memory`**：存入长期记忆。
- **`recall_memory`**：搜索相关事实。
- **`reflect_on_memory`**：从记忆综合推理回答。

用 `enable_retain`、`enable_recall`、`enable_reflect` 选择：

```python
tools = [HindsightTools(
    bank_id="user-123",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含反思
)]
```

首轮前需要记忆时，使用 `memory_instructions` 预召回并注入：

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

底层行为见[记忆召回 API](/developer/api/recall)和[记忆存储 API](/developer/api/retain)。

## 按用户记忆库 {#per-user-memory-banks}

按以下顺序解析：

1. **`bank_resolver`**：自定义 `(RunContext) -> str`。
2. **`bank_id`**：构造器静态 ID。
3. **`run_context.user_id`**：自动按用户。

传 `user_id` 可每用户隔离，自定义解析可团队共享：

```python
# 从 RunContext 获取用户记忆库 {#per-user-banks-from-runcontext}
agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[HindsightTools(hindsight_api_url="https://api.hindsight.vectorize.io")],
    user_id="user-123",  # 用作 bank_id
)

# 自定义解析器 {#custom-resolver}
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

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 创建带工具包的智能体。
2. 告知值得记住内容。
3. 同库全新运行。
4. 询问此前事实。

例如：

```python
agent.print_response("记住，我喜欢深色模式")
agent.print_response("我的偏好是什么？")
```

第二次反映偏好就有效。

## 常见错误 {#common-mistakes}

### 未提供记忆库 {#not-providing-a-bank}

三个来源都无法解析就无库可读写，至少设置一个。

### 期待跨库召回 {#expecting-cross-bank-recall}

各库隔离，不同 ID 不会呈现记忆，保持策略一致。

### 忘记密钥 {#forgetting-the-api-key}

Cloud 设置环境或传参数，否则无法认证。

### 关闭所需工具 {#disabling-the-tool-you-need}

三个开关默认 `True`，关闭即失去能力，如无召回可存但不能搜。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，URL 指自托管即可。

### 改变 Agno 用法吗？ {#does-this-change-how-i-use-agno}

不变，像其他工具包加入列表。

### 如何限定范围？ {#how-is-memory-scoped}

按库，依次解析器、ID、用户 ID。

### 可控制工具吗？ {#can-i-control-which-tools-the-agent-gets}

可以，三个 enable 开关选择。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [Agno 集成文档](/sdks/integrations/agno)。
