---
title: "指南：使用 Hindsight 为 Composio 添加记忆"
authors: [benfrank241]
date: 2026-07-17
tags: [how-to, composio, agents, memory]
description: "将存储、召回和反思注册为 Composio 自定义工具，自动按会话用户隔离。"
image: /img/guides/guide-composio-memory-with-hindsight.svg
hide_table_of_contents: true
---

![指南：使用 Hindsight 为 Composio 添加记忆](/img/guides/guide-composio-memory-with-hindsight.svg)

使用 `hindsight-composio` 将核心操作暴露为进程内自定义工具，智能体通过已有调用长期存储搜索，跨会话延续。

通过 `composio.experimental.tool()` 注册并绑定会话，每调用以 `user_id` 分库，无用户时可配置回退。

本指南介绍安装、连接、注册和验证。参考[文档首页](/)和[快速入门](/developer/api/quickstart)。

<!-- truncate -->

> **快速解答**
>
> 1. `pip install hindsight-composio`.
> 2. Cloud 设置密钥，自托管传 URL。
> 3. `register_hindsight_tools(composio, ...)` 创建工具组。
> 4. 会话 `user_id` 成为 `bank_id`。
> 5. 验证后续会话。

## 前提条件 {#prerequisites}

开始前确认：

- Python >= 3.10。
- Composio >= 0.13.1、< 1，及 `COMPOSIO_API_KEY`。
- 可达 [Cloud](https://hindsight.vectorize.io)或自托管。

## 步骤 1：安装包 {#step-1-install-the-package}

安装集成。

```bash
pip install hindsight-composio
```

依赖 `hindsight-client` >= 0.4.0，提供注册和 configure。

## 步骤 2：连接 Hindsight {#step-2-point-the-tools-at-hindsight}

Cloud 环境变量或直接密钥：

```bash
export HINDSIGHT_API_KEY="hsk_..."
```

为实例注册：

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

自托管换 URL：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="http://localhost:8888",
)
```

自托管见[安装指南](https://hindsight.vectorize.io/developer/installation)。

## 步骤 3：在会话中注册 {#step-3-register-the-tools-on-a-session}

创建并传自定义工具，用户 ID 成为库：

```python
session = composio.create(
    user_id="user-123",  # 成为 Hindsight bank_id
    experimental={"custom_tools": tools},
)

# 像往常一样向智能体或 LLM 传 session.tools()。 {#pass-sessiontools-to-your-agentllm-as-usual}
```

三个可用工具：

- **`HINDSIGHT_RETAIN`**：存入长期记忆。
- **`HINDSIGHT_RECALL`**：搜索事实。
- **`HINDSIGHT_REFLECT`**：综合推理。

仅需部分时传 enable 开关：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    enable_retain=True,
    enable_recall=True,
    enable_reflect=False,  # 不包含反思
)
```

## 工具如何使用记忆 {#how-the-tools-use-memory}

三个核心操作：

- **存储**：调用 `HINDSIGHT_RETAIN`。
- **召回**：调用 `HINDSIGHT_RECALL`。
- **反思**：调用 `HINDSIGHT_REFLECT`。

直接会话注册，智能体决定时机，属于已有工具循环。

底层见[召回 API](/developer/api/recall)和[存储 API](/developer/api/retain)。

## 按用户记忆库 {#per-user-memory-banks}

每调用解析：

1. 会话 `user_id`，推荐一组工具自动隔离。
2. 缺用户时，注册或 configure 的 `default_bank`。

都无则报错。回退设置：

```python
tools = register_hindsight_tools(
    composio,
    hindsight_api_url="https://api.hindsight.vectorize.io",
    default_bank="shared",  # 仅无 user_id 时使用
)
```

连接、预算和标签可一次全局：

```python
from hindsight_composio import configure, register_hindsight_tools

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="your-api-key",       # 或设置 HINDSIGHT_API_KEY 环境变量
    default_bank="shared",         # 无用户时回退
    budget="mid",                  # 召回/反思预算：low/mid/high
    max_tokens=4096,               # 召回最大 token 数
    tags=["env:prod"],             # 存储标签
    recall_tags=["scope:global"],  # 筛选标签
    recall_tags_match="any",       # any/all/any_strict/all_strict
)

tools = register_hindsight_tools(composio)
```

## 验证记忆是否有效 {#verify-that-memory-is-working}

推荐顺序：

1. 注册并用用户 ID 建会话。
2. 存事实。
3. 同用户新会话。
4. 召回事实。
5. 确认返回。

例如：

- 首次存用户偏好。
- 后续同用户请求召回。

返回此前内容就有效。

## 常见错误 {#common-mistakes}

### 忘记用户 ID {#forgetting-to-set-a-user_id}

无用户也无回退会报错。

### 期待跨用户召回 {#expecting-cross-user-recall}

每用户独立，默认不互见，这是隔离目标。

### 错误 SDK {#targeting-the-wrong-composio-sdk}

面向 0.13.x，明确排除 API 不同、开发中的 1.0.0 重写。

### 注册不应调用工具 {#registering-tools-you-dont-want-the-agent-to-call}

默认全部启用，按需要禁用。

## 常见问题 {#faq}

### 必须 Cloud 吗？ {#do-i-need-hindsight-cloud}

不用，注册传本地或自托管 URL。

### 如何限定？ {#how-is-memory-scoped}

会话用户映射库，一组工具自动隔离。

### 默认哪些工具？ {#which-tools-does-the-agent-get}

三个核心，enable 任意组合。

### 实验 API 有影响吗？ {#does-composios-experimental-custom-tools-api-affect-this}

自定义工具 API 仍实验，集成针对 0.13.x 实验接口。

## 后续步骤 {#next-steps}

- 如需托管后端，从 [Hindsight Cloud](https://hindsight.vectorize.io)开始。
- 阅读[完整文档](/)。
- 按[快速入门](/developer/api/quickstart)操作。
- 查阅[召回 API](/developer/api/recall)。
- 查阅[存储 API](/developer/api/retain)。
- 阅读 [Composio 集成文档](/sdks/integrations/composio)。
