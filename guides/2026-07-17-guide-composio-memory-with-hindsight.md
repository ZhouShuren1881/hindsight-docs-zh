---
title: "指南：使用 Hindsight 为 Composio 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, composio, agents, memory]
description: "将 Retain、Recall 和 Reflect 注册为 Composio 自定义工具，并自动按会话用户隔离记忆。"
image: /img/guides/guide-composio-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Composio 添加记忆](/img/guides/guide-composio-memory-with-hindsight.svg)

如果想让 Composio 使用 Hindsight 记忆，最简洁的配置方式是安装 `hindsight-composio` 包。它会将 Hindsight 的存入、召回和反思操作封装为 Composio 进程内自定义工具，让智能体直接通过现有工具存储和检索长期记忆。这样一来，Composio 智能体的记忆便可跨会话持久保存，无需每次都从零开始。

这种集成方式很适合 Composio，因为它通过 `composio.experimental.tool()` 注册自定义工具，并将工具绑定到会话。每次调用使用会话的 `user_id` 解析记忆库，因此，一组已注册的工具即可自动按用户隔离记忆；调用没有 `user_id` 时，也可以配置回退记忆库。

本指南将介绍如何安装这个包、将它连接到 Hindsight 后端、在会话中注册工具，以及如何快速验证记忆是否确实在使用。操作时可同时打开[文档首页](/)和[快速入门指南](/developer/api/quickstart)作为参考。

<!-- truncate -->

> **快速解答**
>
> 1. 运行 `pip install hindsight-composio`。
> 2. 设置 `HINDSIGHT_API_KEY`（Cloud），或传入 `hindsight_api_url`（自托管）。
> 3. 调用 `register_hindsight_tools(composio, ...)` 创建工具组。
> 4. 创建带有 `user_id` 的会话；该值会成为 Hindsight 的 `bank_id`。
> 5. 验证后续会话能否召回先前会话存入的内容。

## 前提条件 {#prerequisites}

开始前，请确认已具备以下条件：

- Python >= 3.10。
- 已安装并配置好 Composio（composio >= 0.13.1、< 1），并准备好 `COMPOSIO_API_KEY`。
- 可以访问 Hindsight 后端：[Hindsight Cloud](https://hindsight.vectorize.io) 或自托管服务器。

## 步骤 1：安装包 {#step-1-install-the-package}

安装集成包：

```bash
pip install hindsight-composio
```

该包会安装 `hindsight-client`（>= 0.4.0），并提供 `register_hindsight_tools` 和 `configure` 两个函数，用于将 Hindsight 接入 Composio。

## 步骤 2：将工具连接到 Hindsight {#step-2-point-the-tools-at-hindsight}

使用 Hindsight Cloud 时，可将 API 密钥设为环境变量，也可以直接传入：

```bash
export HINDSIGHT_API_KEY="hsk_..."
```

然后针对你的 `Composio` 实例注册工具：

```python
from composio import Composio
from hindsight_composio import register_hindsight_tools

composio = Composio()  # 使用 COMPOSIO_API_KEY

tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",  # 或设置 HINDSIGHT_API_KEY 环境变量
)
```

使用自托管 Hindsight 服务器时，替换 URL：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="http://localhost:8888",
)
```

自托管配置请参阅[安装指南](/developer/installation)。

## 步骤 3：在会话中注册工具 {#step-3-register-the-tools-on-a-session}

创建 Composio 会话，并将工具作为自定义工具传入。`user_id` 会成为 Hindsight 记忆库的 ID：

```python
session = composio.create(
    user_id="user-123",  # 成为 Hindsight bank_id
    experimental={"custom_tools": tools},
)

# 像往常一样，将 session.tools() 传给智能体或 LLM。
```

此时，会话中有三个可供智能体调用的工具：

- **`HINDSIGHT_RETAIN`** — 将信息存入长期记忆。
- **`HINDSIGHT_RECALL`** — 从长期记忆中检索相关事实。
- **`HINDSIGHT_REFLECT`** — 根据记忆综合生成有理有据的答案。

如果只需要其中一部分，可在调用 `register_hindsight_tools` 时传入 `enable_retain`、`enable_recall` 或 `enable_reflect`：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含 reflect
)
```

## 工具如何使用记忆 {#how-the-tools-use-memory}

该集成会将 Hindsight 的三个核心操作封装为 Composio 自定义工具：

- **Retain（存入）**：智能体调用 `HINDSIGHT_RETAIN`，将信息存入长期记忆。
- **Recall（召回）**：智能体调用 `HINDSIGHT_RECALL`，从长期记忆中检索相关事实。
- **Reflect（反思）**：智能体调用 `HINDSIGHT_REFLECT`，根据记忆综合生成有理有据的答案。

由于这些工具直接注册在会话上，智能体可以自行决定何时存入信息、何时检索；记忆因此融入它已有的工具调用循环。

如需了解更底层的行为，请参阅 Hindsight 的[召回 API](/developer/api/recall)和[存入 API](/developer/api/retain)。

## 按用户划分记忆库 {#per-user-memory-banks}

每次调用都会按以下顺序解析记忆库：

1. 会话的 `user_id`（推荐）：一组工具即可按用户隔离记忆。
2. `default_bank`：调用没有 `user_id` 时，使用传给 `register_hindsight_tools` 或 `configure` 的值。

如果两者都不可用，工具会报错。可按如下方式设置回退记忆库：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    default_bank="shared",  # 仅在会话没有 user_id 时使用
)
```

连接详情、预算和标签也可以一次性全局配置，无需每次调用都传入：

```python
from hindsight_composio import configure, register_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    default_bank="shared",         # 没有 user_id 时使用的回退记忆库
    budget="mid",                  # 召回/反思预算：low/mid/high
    max_tokens=4096,               # 召回结果的最大 token 数
    tags=["env:prod"],             # 为存入的记忆添加标签
    recall_tags=["scope:global"],  # 用于筛选召回结果的标签
    recall_tags_match="any",       # any/all/any_strict/all_strict
)

tools = register_hindsight_tools(composio)
```

## 验证记忆是否正常工作 {#verify-that-memory-is-working}

推荐按以下顺序测试：

1. 注册工具，并创建带有 `user_id` 的会话。
2. 让智能体调用 `HINDSIGHT_RETAIN` 存入一条事实。
3. 使用同一个 `user_id` 开始新会话。
4. 让智能体调用 `HINDSIGHT_RECALL` 检索这条事实。
5. 确认先前存入的事实已返回。

例如：

- 第一个会话在对话中存入一项用户偏好。
- 同一用户在之后的请求中，通过第二个会话召回该偏好。

如果召回结果中出现了第一个会话存入的内容，就说明配置正常。

## 常见错误 {#common-mistakes}

### 忘记设置 `user_id` {#forgetting-to-set-a-user_id}

记忆库根据会话的 `user_id` 解析。如果没有 `user_id`，也没有 `default_bank`，工具就会报错。

### 误以为不同用户之间可以互相召回 {#expecting-cross-user-recall}

每个 `user_id` 都映射到各自的记忆库。默认情况下，一个用户存入的记忆对其他用户不可见；这正是隔离设计的目的。

### 使用了错误的 Composio SDK {#targeting-the-wrong-composio-sdk}

此集成面向 Composio 0.13.x SDK（`from composio import Composio`），明确不支持仍在开发中的 1.0.0 重写版本，因为其 API 不同。

### 注册了不希望智能体调用的工具 {#registering-tools-you-dont-want-the-agent-to-call}

默认情况下，三个工具都会启用。如果不希望智能体存入信息或综合生成答案，请通过 `enable_retain`、`enable_recall` 或 `enable_reflect` 禁用相应工具。

## 常见问题 {#faq}

### 必须使用 Hindsight Cloud 吗？ {#do-i-need-hindsight-cloud}

不必。自托管 Hindsight 服务器也可以使用：将 `hindsight_api_url="http://localhost:8888"`（或你的服务器 URL）传给 `register_hindsight_tools` 即可。

### 记忆的范围如何确定？ {#how-is-memory-scoped}

按会话的 `user_id` 划分，该值会映射到 Hindsight 的 `bank_id`。一组已注册的工具即可自动按用户隔离记忆。

### 智能体默认会获得哪些工具？ {#which-tools-does-the-agent-get}

默认会获得 `HINDSIGHT_RETAIN`、`HINDSIGHT_RECALL` 和 `HINDSIGHT_REFLECT`。通过 `enable_*` 标志可按需组合启用。

### Composio 的实验性自定义工具 API 会有什么影响？ {#does-composios-experimental-custom-tools-api-affect-this}

Composio 的自定义工具 API 目前仍处于实验阶段。此集成面向 Composio 0.13.x SDK，并基于该实验接口构建。

## 后续步骤 {#next-steps}

- 如果需要托管后端，可从 [Hindsight Cloud](https://hindsight.vectorize.io) 开始。
- 阅读 [Hindsight 完整文档](/)。
- 按照[快速入门指南](/developer/api/quickstart)操作。
- 查阅 [Hindsight 召回 API](/developer/api/recall)。
- 查阅 [Hindsight 存入 API](/developer/api/retain)。
- 阅读 [Composio 集成文档](/sdks/integrations/composio)。
