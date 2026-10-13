---
title: "赋予您在Omnigent中运行的每一个智能体持久的记忆"
authors: [benfrank241]
slug: "2026/07/14/omnigent-persistent-memory"
date: 2026-07-14T12:00
tags: [hindsight, omnigent, agent-memory, persistent-memory, tutorial, mcp]
description: "Omnigent 包装任何 AI 智能体：Claude Code、Codex、Cursor、Hermes 等。添加 Hindsight 一次，它编排的每个线束都可以从单个设置中获得记忆召回、记忆存储和反思。"
image: /img/blog/omnigent-persistent-memory.webp
hide_table_of_contents: true
---

![Omnigent 与 Hindsight 持久记忆：记忆召回、记忆存储和每条安全带上的回忆](/img/blog/omnigent-persistent-memory.webp)

大多数智能体记忆集成可以用一种工具解决一个问题。将Hindsight添加到Cursor，Cursor就记住了。将其添加到Aider，Aider会记住。每个都有自己的设置、自己的配置、自己的上限。

[Omnigent](https://github.com/omnigent-ai/omnigent)打破了这种模式。它是一个元框架：单个编排层，一次包装和协调多个AI智能体，包括Claude Code、Codex、Cursor、OpenCode、Hermes和Pi。当您将Hindsight添加到Omnigent时，您可以通过单个设置将持久记忆添加到**全部经过一处**，而不是单独连接每个工具的集成。对于任何没有本机 Hindsight 集成的线束（包括自定义线束），Omnigent 是记忆层。这座桥位于Omnigent，所以里面的智能体不需要自己携带它。

<!-- truncate -->

## 概览 {#tldr}

- Omnigent 附带三个内置记忆工具：`hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect`。
- Omnigent**在本地拦截并执行这些工具**，因此它包装的每个线束都可以从一个设置中获得相同的记忆，包括没有本地Hindsight集成的自定义线束。
- ​​安装是一项可选附加功能：`pip install "omnigent[memory]"`。
- 连接智能体YAML规范中的工具，设置`HINDSIGHT_API_KEY`，智能体决定何时进行记忆召回和记忆存储。
- 记忆在各个会话中持续存在，并且范围仅限于每个智能体（或每个对话，作为后备）的记忆库。

## 这与其他集成有何不同 {#what-makes-this-different-from-other-integrations}

到目前为止，我们介绍的每个Hindsight集成都位于一个工具中：Cursor挂钩到VS Code的MCP层，Aider包装CLI，Zed使用其全局智能体规则。每个工具都适用于该工具，并且仅适用于该工具。
到目前为止，我们所介绍的

Omnigent 是不同的，因为它位于 *以上* 工具中。它不关心下面的智能体调用哪个工具。当Omnigent中运行的智能体调用`hindsight_recall`时，Omnigent会在运行器级别拦截它，使用`hindsight-client`在本地执行它，并发送回结果。包裹的安全带，无论是Claude Code、Codex，还是定制的智能体，都不需要知道记忆是如何工作的。

其中一些工具也有自己的本机Hindsight集成，当您单独运行该工具时，它们非常出色。 Omnigent 路径的要点是您配置记忆​​**一次，集中**，它适用于您编排的每个线束，以及根本没有本机选项的线束。一套 Hindsight 设置，任何安全带。那是通用记忆桥。

## 安装 {#install}

记忆工具是可选的额外功能，因此您只需提取您需要的内容：

```bash
pip install "omnigent[memory]"
```

这将添加 `hindsight-client>=0.4.0` 作为唯一的依赖项。您还需要 [Hindsight Cloud](https://hindsight.vectorize.io) 仪表板中的 API 密钥（或指向自托管服务器）：

```bash
export HINDSIGHT_API_KEY=hsk_...
```

## 连接智能体规范中的工具 {#wire-up-the-tools-in-your-agent-spec}

Omnigent智能体在YAML中定义。添加`tools.builtins`下的三个工具：

```yaml
name: my-agent
#...你的智能体规格的其余部分

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

这就是整个设置。下次运行时，智能体的工具列表中将提供这三个工具。

## 工具如何工作 {#how-the-tools-work}

连接后，智能体会显式调用工具。这是经过深思熟虑的：Omnigent赋予智能体能力，由智能体决定何时使用它。标准模式是将其包含在您的智能体的系统指令中：

```
- At the start of each task, call hindsight_recall with the user's request
  to load relevant decisions, preferences, and project context before answering.
- When the user gives you a durable fact (a convention, a decision, a preference),
  call hindsight_retain to store it.
- Call hindsight_reflect to synthesize what you know about a topic across sessions.
```

**`hindsight_recall`** 对您的记忆库运行语义搜索，并返回与当前消息最相关的记忆。 `budget`和`max_tokens`设置控制返回多少记忆令牌。

**`hindsight_retain`** 将一条信息存储到记忆库中。智能体决定什么值得保留；如果您稍后想要更细粒度的过滤，可以在配置中使用 `tags` 进行控制。

**`hindsight_reflect`**从记忆库中积累的观察中综合得出答案。对于“我们对 X 了解多少？”很有用。跨越许多过去会话的查询。

### 记忆库范围如何运作 {#how-bank-scoping-works}

记忆是根据记忆库隔离的。 Omnigent 解析按以下顺序使用哪个记忆库：

1. 明确的`bank_id`在你的YAML配置（最可预测，推荐用于生产）。
2. 智能体的`agent_id`：每个智能体一个记忆库，在智能体的所有对话中共享。
3. `conversation_id`：每个对话一个记忆库。新的对话解析为新的记忆库，因此记忆不会跨对话进行（早期的记忆库仍然存在，只是不再被引用）。

如果您在Omnigent中运行多个智能体并希望它们共享一个记忆（例如共享项目记忆库），请将它们全部指向同一个`bank_id`。

## 一个工作示例：Remy 智能体 {#a-working-example-the-remy-agent}

Omnigent 在 `examples/remy/config.yaml` 提供了完整的工作示例。雷米（Remy）是一位对话助理，所有三个记忆工具都已连接，并提供有关何时呼叫每个工具的说明。针对 Hindsight Cloud 运行它是一个命令：

```bash
HINDSIGHT_API_KEY=hsk_... omnigent run examples/remy
```

几次对话后，尝试向 Remy 询问它在上一次会话中学到的东西。它针对你的问题调用`hindsight_recall`，找到相关的记忆，并从上下文中找到答案，如果记忆不存在，它就会丢失。

## 云或自托管 {#cloud-or-self-hosted}

对于**Hindsight Cloud**，您的规格中的`api_key`加上您的仪表板记忆库就是您所需要的。 API URL 默认为 `https://api.hindsight.vectorize.io`。

对于**自托管**服务器，覆盖配置中的URL：

```yaml
- name: hindsight_recall
  api_url: http://localhost:8888
  bank_id: local-memory
```

开放的本地服务器不需要令牌。

## 哪个利用好处 {#which-harnesses-benefit}

任何线束Omnigent包装都可以获得记忆工具，无论线束是否有自己的Hindsight集成：

|安全带|原生 Hindsight 集成|经Omnigent|
|---|---|---|
|Claude Code|是（官方）|是|
|Cursor|是（官方）|是|
|Codex|是（官方）|是|
|OpenCode|是（官方）|是|
|Pi|是（社区，通过 Epimetheus）|是|
|定制安全带|通常没有|是|

大多数工具已经具有本机Hindsight集成，当您独立运行该工具时，每个工具都是一个不错的选择。 Omnigent 添加的是一个单一的中央记忆设置，适用于您一次编排的每个线束，并覆盖没有本机选项的自定义或内部线束。您可以在一个地方配置记忆，而不是每个工具一次。

## Omnigent 的工具与本机集成 {#omnigents-tools-vs-a-native-integration}

如果安全带有两种选择，您应该使用哪一种？每个记忆库选择一条路径。不要在同一个记忆库中启用工具的本机Hindsight集成**和**点Omnigent的记忆工具，否则您将获得两个记忆召回和记忆存储路径，将同一对话写入两次。

权衡：

- **原生集成** 通常是自动的。它挂钩工具自己的生命周期，因此记忆召回和记忆存储的发生无需智能体考虑，但它的范围仅限于该工具并针对每个工具进行配置。
- **Omnigent的记忆工具** 是一个中央设置，适用于您编排的每个线束，但它们是智能体驱动的：智能体在其系统指令的指导下显式调用它们。

​​一个简单的规则：当您单独运行该工具时，请使用该工具的本机集成；当您通过Omnigent编排多个线束并希望它们通过一个设置共享一个记忆时，请使用Omnigent的记忆工具。

## 常见问题 {#frequently-asked-questions}

**Omnigent会自动调用记忆召回和记忆存储吗？**
没有。当智能体的系统指令要求时，智能体就会调用这些工具。这使行为保持透明：您可以阅读智能体规范并准确查看记忆操作何时发生。

**两个智能体可以共享一个记忆库吗？**
是的。在两个智能体工具配置上设置相同的`bank_id`，它们会从同一个存储中读取和写入。一个智能体保留的事实可以通过记忆召回提供给另一个智能体。

**更换安全带后记忆还能保存吗？**
是的。记忆库存在于Hindsight中，而不是在安全带中。如果您将Omnigent智能体从Codex切换到Claude Code，记忆库就在原来的位置。

**`hindsight_reflect` 能做什么而`hindsight_recall` 不能？**
记忆召回检索与特定查询相关的记忆。 未来综合积累的观察来推理一个主题，当你想要总结智能体在多次会话中学到的东西，而不仅仅是匹配一个查询的事实时，这很有用。 期望还通过 `response_schema` 字段支持结构化输出，并可以返回用于生成答案的底层事实。

**我可以过滤记忆召回到特定主题或用户吗？**
是的。 `recall_tags` 和 `recall_tags_match` 配置字段过滤考虑哪些记忆。在 `hindsight_retain` 上设置 `tags` 来标记存储的内容，并在 `hindsight_recall` 上设置 `recall_tags` 仅拉回与这些标签匹配的记忆。当一个记忆库服务于多个用户或项目时，这非常有用。

## 进一步阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：记忆召回和保留背后的概念。
- [每个AI工具一个记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：将多个智能体指向同一个记忆库。
- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：当智能体调用`hindsight_retain`时，幕后会发生什么。
- [Claude Code持久记忆](/blog/2026/05/06/claude-code-subagents-shared-memory)：如果您在Omnigent内运行Claude Code。
