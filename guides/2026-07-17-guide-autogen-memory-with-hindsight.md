---
title: "指南：使用 Hindsight 为 AutoGen 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, autogen, agents, memory]
description: "使用 hindsight-autogen 工具，让 AssistantAgent 跨对话存储、召回和反思长期记忆。"
image: /img/guides/guide-autogen-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 AutoGen 添加记忆](/img/guides/guide-autogen-memory-with-hindsight.svg)

如需 **AutoGen 与 Hindsight 记忆**，包提供存储、召回和反思 `FunctionTool`，直接接入 `AssistantAgent(tools=[...])`，跨对话保存、搜索和推理。

框架围绕工具，模型决定调用 `hindsight_retain`、`hindsight_recall`、`hindsight_reflect`。原生异步直接使用客户端，适配运行时。

本指南介绍安装、建库、接入和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"`.
> 2. 客户端指向后端，用 `acreate_bank` 建库。
> 3. `create_hindsight_tools(client=client, bank_id="user-123")` 创建工具。
> 4. 传给 `AssistantAgent(tools=tools)`。
> 5. 验证后续召回。

## 前提条件 {#prerequisites}

开始前确认：

- Python 3.10 或更高。
- `autogen-agentchat` 和 OpenAI 客户端所需 `autogen-ext[openai]`。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：安装包 {#step-1-install-the-package}

与 AutoGen 一起安装。

```bash
pip install hindsight-autogen autogen-agentchat "autogen-ext[openai]"
```

包依赖 `autogen-core`、`hindsight-client`，还需智能体包和 OpenAI 扩展。

## 步骤 2：创建并接入工具 {#step-2-create-the-tools-and-wire-them-into-your-agent}

创建客户端、库、工具，再传入：

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from hindsight_client import Hindsight
from hindsight_autogen import create_hindsight_tools

async def main():
    client = Hindsight(base_url="http://localhost:8888")
    await client.acreate_bank(bank_id="user-123")

    model_client = OpenAIChatCompletionClient(model="gpt-4o")
    tools = create_hindsight_tools(client=client, bank_id="user-123")

    agent = AssistantAgent(
        name="assistant",
        model_client=model_client,
        tools=tools,
    )

    # 存储记忆
    result = await agent.run(task="记住，我喜欢深色模式")
    print(result.messages[-1].content)

    # Hindsight 异步处理内容：提取事实、
    # 解析实体和生成嵌入。短暂停顿确保
    # 下次召回前记忆可搜索。
    await asyncio.sleep(3)

    # 之后召回
    result = await agent.run(task="我的界面偏好是什么？")
    print(result.messages[-1].content)

    await client.aclose()
    await model_client.close()

asyncio.run(main())
```

Jupyter 已有活动事件循环，无需 `asyncio.run()`，单元格直接 `await`。

## 智能体获得什么 {#what-the-agent-gets}

三个自主调用操作：

- **`hindsight_retain`**：存入长期记忆。
- **`hindsight_recall`**：搜索相关事实。
- **`hindsight_reflect`**：综合推理回答。

普通 `FunctionTool` 由模型决定调用。底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

仅需部分时：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    include_retain=True,
    include_recall=True,
    include_reflect=False,  # 不包含反思
)
```

## 步骤 3：一次配置或按标签限定 {#step-3-configure-once-or-scope-with-tags}

可全局设默认，之后各处创建：

```python
from hindsight_autogen import configure, create_hindsight_tools

configure(
    hindsight_api_url="http://localhost:8888",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    budget="mid",                  # 召回预算：low/mid/high
    max_tokens=4096,
    tags=["env:prod"],             # 存储标签
    recall_tags=["scope:global"],  # 召回筛选标签
    recall_tags_match="any",
)

tools = create_hindsight_tools(bank_id="user-123")
```

标签按主题、会话或用户划分，`tags` 存储、`recall_tags` 筛选、匹配参数控制：

```python
tools = create_hindsight_tools(
    client=client,
    bank_id="user-123",
    tags=["source:chat", "session:abc"],
    recall_tags=["source:chat"],
    recall_tags_match="any",
)
```

团队可各自库或共享，完整模式见[集成文档](/sdks/integrations/autogen)。

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 存储，例如 `agent.run(task="记住，我喜欢深色模式")`。
2. 等待处理完成。
3. 之后询问，如 `agent.run(task="我的界面偏好是什么？")`。
4. 确认回答反映此前事实。

第二次呈现偏好即接入正确。

## 常见错误 {#common-mistakes}

### 忘记建库 {#forgetting-to-create-the-bank}

首次前调用 `acreate_bank`，幂等可每次调用。

### 存储后立即召回 {#recalling-immediately-after-retain}

异步处理，同脚本紧接调用需短暂等待。

### 未处理错误 {#not-handling-memory-errors}

失败抛 `HindsightError`，AutoGen 显示工具错误。需平滑降级时包装调用。

### 标签不匹配 {#mismatched-tags}

存储与筛选标签不重叠会为空，保持约定一致。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，客户端 base URL 或全局 URL 指自托管。

### 支持异步运行时吗？ {#does-this-work-in-autogens-async-runtime}

支持，直接用 `aretain`、`arecall`、`areflect`。

### 可只召回无反思吗？ {#can-i-use-only-recall-without-reflect}

可以，用三个 include 开关。

### 如何团队共享？ {#how-do-i-share-memory-across-a-team-of-agents}

相同 ID 共享或各自库，标签进一步限定。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[记忆召回 API](/developer/api/recall)。
- 查阅[记忆存储 API](/developer/api/retain)。
- 阅读 [AutoGen 集成文档](/sdks/integrations/autogen)。
