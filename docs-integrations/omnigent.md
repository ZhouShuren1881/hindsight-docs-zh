---
sidebar_position: 41
title: "使用 Hindsight 为 Omnigent 添加持久记忆 | 集成"
description: "为 Omnigent 中运行的各个智能体运行环境提供持久记忆。一次 Hindsight 配置即可让 Claude Code、Codex、Cursor、Hermes、Pi 和自定义智能体使用 hindsight_recall、hindsight_retain 与 hindsight_reflect。"
---

# Omnigent {#omnigent}

为 [Omnigent](https://github.com/omnigent-ai/omnigent) 中的每个智能体运行环境提供持久长期记忆。Omnigent 是统一包装与编排多个 AI 智能体（Claude Code、Codex、Cursor、OpenCode、Hermes、Pi 等）的运行环境。

Omnigent 内置三个记忆工具：`hindsight_recall`、`hindsight_retain` 与 `hindsight_reflect`。Omnigent 拦截这些调用，通过 `hindsight-client` 在本地执行。工具位于 Omnigent 执行器中，因此被包装的每个智能体都可以获得记忆，无论其运行环境是否原生支持 Hindsight。

## 安装 {#installation}

```bash
pip install "omnigent[memory]"
export HINDSIGHT_API_KEY=hsk_...
```

从 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 获取 API 密钥，或通过 `HINDSIGHT_API_URL` 指向自托管服务器。

## 设置 {#setup}

在智能体 YAML 配置的 `tools.builtins` 中添加三个工具：

```yaml
name: my-agent

tools:
  builtins:
    - name: hindsight_recall
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory      #可选；默认为agent_id
      budget: mid                   # low / mid / high
      max_tokens: 4096

    - name: hindsight_retain
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory

    - name: hindsight_reflect
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory
```

重新启动你的智能体——这三个工具将出现在它的工具列表中。

## 工作原理 {#how-it-works}

Omnigent 在执行器层面拦截 `hindsight_*` 调用，通过 `hindsight-client` 在本地执行并返回结果，调用不会继续传递到被包装的智能体运行环境。这意味着：

- **经过包装的智能体运行环境**（Claude Code、Codex、Cursor、Pi 等）无需处理这些调用，由执行器负责。
- **原生智能体运行环境**（以原生模式运行智能体时）也会获得这些工具。
- **一次配置即可支持所有工具。** 许多运行环境已有原生 Hindsight 集成；通过 Omnigent，只需配置一次记忆，就能支持所有被编排的运行环境，包括没有原生集成的自定义环境。

智能体会**显式**调用工具，此集成不提供自动生命周期钩子。在智能体系统提示词中加入以下说明：

```
- 每项任务开始时，使用用户请求调用 hindsight_recall，
  加载相关决策、偏好和项目上下文。
- 用户提供长期有效的事实（约定、决策或偏好）时，
  调用 hindsight_retain 存储。
- 调用 hindsight_reflect，综合各会话中关于某一主题的知识。
```

## 限定记忆库作用域 {#bank-scoping}

Omnigent 按以下顺序确定记忆库：

1. YAML 配置中显式指定的 `bank_id`，行为最可预测，推荐使用。
2. 智能体的`agent_id` — 每个智能体一个记忆库，在对话中共享。
3. `conversation_id` — 每个对话一个记忆库；当对话结束时丢失。

要在两个智能体之间共享记忆，请将它们指向同一个`bank_id`。

## 配置参考 {#configuration-reference}

|字段|说明|默认值|
|---|---|---|
|`api_key`|Hindsight API 密钥|_（云所需）_|
|`api_url`|Hindsight API 基本 URL|`https://api.hindsight.vectorize.io`|
|`bank_id`|记忆库名称|`agent_id`或`conversation_id`|
|`budget`|记忆召回token 预算 (`low` / `mid` / `high`)|`mid`|
|`max_tokens`|记忆召回返回的最大 token 数|`4096`|
|`tags`|应用于保留记忆的 CSV 标签|_（无）_|
|`recall_tags`|用于过滤记忆召回的 CSV 标签|_（无）_|
|`recall_tags_match`|标签匹配模式 (`any` / `all` / `any_strict` / `all_strict`)|`any`|

## 自托管 {#self-hosted}

用指向你自己的服务器 `api_url`；开放服务器不需要令牌：

```yaml
- name: hindsight_recall
  api_url: http://localhost:8888
  bank_id: local-memory
```

## 工作示例 {#working-example}

Omnigent在 提供了完整的示例 [`examples/remy/config.yaml`](https://github.com/omnigent-ai/omnigent/blob/main/examples/remy/config.yaml) — 一个会话助手，所有三个工具都已连接，并说明何时调用每个工具：

```bash
HINDSIGHT_API_KEY=hsk_... omnigent run examples/remy
```

几次对话后，询问它在上一次会话中学到的东西。

## 哪些智能体运行环境能受益 {#which-harnesses-benefit}

|智能体运行环境|原生 Hindsight 集成|通过 Omnigent|
|---|---|---|
|Claude Code|是（官方）|是的|
|Cursor|是（官方）|是的|
|Codex|是（官方）|是的|
|OpenCode|是（官方）|是的|
|Pi|是（社区，通过 Epimetheus）|是的|
|自定义运行环境|通常没有|是的|

大多数工具已有原生 Hindsight 集成，适合独立使用。Omnigent 提供统一的记忆配置，覆盖你编排的所有智能体运行环境，也支持没有原生集成的自定义环境。

## 延伸阅读 {#further-reading}

- [为每个 AI 工具提供同一份记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将多个智能体运行环境连接到同一个记忆库。
- [retain() 的内部流程](/blog/2026/07/13/inside-retain-agent-memory)：当智能体调用时会发生什么 `hindsight_retain`。
- [GitHub 上的 Omnigent](https://github.com/omnigent-ai/omnigent)：统一运行环境的源码与示例。
