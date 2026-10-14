---
title: "为你在 Omnigent 中运行的每个智能体配备持久记忆"
authors: [benfrank241]
slug: "2026/07/14/omnigent-persistent-memory"
date: 2026-07-14T12:00
tags: [hindsight, omnigent, agent-memory, persistent-memory, tutorial, mcp]
description: "Omnigent 可以编排任意 AI 智能体，包括 Claude Code、Codex、Cursor、Hermes 等。只需添加一次 Hindsight，Omnigent 编排的每个智能体运行框架都能通过同一套配置使用 Retain（存入）、Recall（召回）和 Reflect（反思）。"
image: /img/blog/omnigent-persistent-memory.webp
hide_table_of_contents: true
---

![Omnigent 与 Hindsight 持久记忆：在每个智能体运行框架中召回、存入和反思](/img/blog/omnigent-persistent-memory.webp)

大多数智能体记忆集成只为一种工具解决一个问题。把 Hindsight 添加到 Cursor，Cursor 就能记住信息；把它添加到 Aider，Aider 也能记住信息。每种工具都要单独设置和配置，而且各自都有能力上限。

[Omnigent](https://github.com/omnigent-ai/omnigent) 改变了这种模式。它是一个元编排框架，能够同时封装并协调多个 AI 智能体，包括 Claude Code、Codex、Cursor、OpenCode、Hermes 和 Pi。将 Hindsight 添加到 Omnigent 后，你只需在一个地方完成一次设置，就能为**所有这些智能体配备持久记忆**，无需逐一接入每种工具的集成。对于没有原生 Hindsight 集成的智能体运行框架（包括自定义框架），Omnigent 也可以充当记忆层。桥接逻辑由 Omnigent 承担，其中的智能体无需自行处理。

<!-- truncate -->

## 概览 {#tldr}

- Omnigent 内置了三个记忆工具：`hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect`。
- Omnigent **会在本地拦截并执行这些工具**，因此它封装的每种智能体运行框架都能通过一套配置使用相同的记忆，包括没有原生 Hindsight 集成的自定义框架。
- 安装时只需添加一个可选扩展：`pip install "omnigent[memory]"`。
- 在智能体的 YAML 规范中配置这些工具，设置 `HINDSIGHT_API_KEY`，之后由智能体决定何时召回和存入记忆。
- 记忆会跨会话持久保存，并按智能体划分到不同记忆库；如果无法据此划分，则回退到按对话划分。

## 这与其他集成有何不同 {#what-makes-this-different-from-other-integrations}

我们此前介绍的每种 Hindsight 集成都位于单个工具内部：Cursor 接入 VS Code 的 MCP 层，Aider 封装 CLI，Zed 使用全局智能体规则。每种集成都适用于对应的工具，也仅适用于该工具。

Omnigent 则位于这些工具之上。它不关心底层智能体调用的是哪种智能体运行框架。当在 Omnigent 中运行的智能体调用 `hindsight_recall` 时，Omnigent 会在运行器层拦截该调用，使用 `hindsight-client` 在本地执行，然后返回结果。无论被封装的是 Claude Code、Codex 还是自定义智能体，都不必了解记忆的工作方式。

其中一些智能体运行框架也有自己的原生 Hindsight 集成；单独运行相应工具时，这些集成都很出色。使用 Omnigent 的意义在于：只需**集中配置一次记忆**，就能应用到你编排的每种智能体运行框架，也能覆盖没有原生选项的框架。一套 Hindsight 配置，适用于任何智能体运行框架。这就是通用记忆桥接层。

## 安装 {#install}

记忆工具属于可选扩展，因此只需安装所需的功能：

```bash
pip install "omnigent[memory]"
```

这会添加唯一的依赖项 `hindsight-client>=0.4.0`。你还需要从 [Hindsight Cloud](https://hindsight.vectorize.io) 控制台获取 API 密钥（也可以将其指向自托管服务器）：

```bash
export HINDSIGHT_API_KEY=hsk_...
```

## 在智能体规范中配置工具 {#wire-up-the-tools-in-your-agent-spec}

Omnigent 智能体使用 YAML 定义。在 `tools.builtins` 下添加这三个工具：

```yaml
name: my-agent
# ...智能体规范的其余部分

tools:
  builtins:
    - name: hindsight_recall
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory      # 可选；默认使用 agent_id
      budget: mid                   # low / mid / high
      max_tokens: 4096

    - name: hindsight_retain
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory

    - name: hindsight_reflect
      api_key: ${HINDSIGHT_API_KEY}
      bank_id: my-agent-memory
```

配置就完成了。下次运行时，这三个工具就会出现在智能体的工具列表中。

## 工具的工作方式 {#how-the-tools-work}

配置完成后，智能体会显式调用这些工具。这是有意如此：Omnigent 为智能体提供能力，由智能体决定何时使用。常见做法是在智能体的系统指令中加入以下内容：

```
- At the start of each task, call hindsight_recall with the user's request
  to load relevant decisions, preferences, and project context before answering.
- When the user gives you a durable fact (a convention, a decision, a preference),
  call hindsight_retain to store it.
- Call hindsight_reflect to synthesize what you know about a topic across sessions.
```

**`hindsight_recall`** 会在记忆库中执行语义检索，并返回与当前消息最相关的记忆。`budget` 和 `max_tokens` 设置共同控制返回的记忆 token 数量。

**`hindsight_retain`** 会将一条信息存入记忆库。由智能体判断哪些内容值得保留；如果之后需要更精细地筛选，可以在配置中使用 `tags`。

**`hindsight_reflect`** 会根据记忆库中累积的观测综合生成答案。对于“我们对 X 了解多少？”这类需要综合多个过往会话的查询很有用。

### 记忆库范围的划分方式 {#how-bank-scoping-works}

记忆按记忆库隔离。Omnigent 会按以下顺序确定要使用的记忆库：

1. YAML 配置中显式指定的 `bank_id`（最明确，建议用于生产环境）。
2. 智能体的 `agent_id`：每个智能体使用一个记忆库，该库由此智能体的所有对话共享。
3. `conversation_id`：每个对话使用一个记忆库。新对话会对应一个新记忆库，因此记忆不会跨对话延续（早先的记忆库仍然存在，只是不再被引用）。

如果你在 Omnigent 中运行多个智能体，并希望它们共享记忆（例如共享项目记忆库），就将它们全部指向同一个 `bank_id`。

## 完整示例：Remy 智能体 {#a-working-example-the-remy-agent}

Omnigent 在 `examples/remy/config.yaml` 中提供了一个完整可运行的示例。Remy 是一款对话助手，已配置好全部三个记忆工具，并附有何时调用各工具的指令。通过一条命令即可让它连接 Hindsight Cloud 运行：

```bash
HINDSIGHT_API_KEY=hsk_... omnigent run examples/remy
```

与 Remy 对话几次后，可以问问它还记得上一次会话中学到的什么。它会针对你的问题调用 `hindsight_recall`，找到相关记忆，再根据上下文作答；如果没有记忆，这些上下文早已丢失。

## 云端或自托管 {#cloud-or-self-hosted}

使用 **Hindsight Cloud** 时，只需在规范中配置 `api_key`，并在控制台中创建记忆库。API URL 默认为 `https://api.hindsight.vectorize.io`。

对于**自托管**服务器，可以在配置中覆盖 URL：

```yaml
- name: hindsight_recall
  api_url: http://localhost:8888
  bank_id: local-memory
```

开放访问的本地服务器不需要令牌。

## 哪些智能体运行框架适用 {#which-harnesses-benefit}

Omnigent 封装的任何智能体运行框架都能使用这些记忆工具，无论该框架是否有自己的 Hindsight 集成：

| 智能体运行框架 | 原生 Hindsight 集成 | 通过 Omnigent 使用 |
|---|---|---|
| Claude Code | 有（官方） | 有 |
| Cursor | 有（官方） | 有 |
| Codex | 有（官方） | 有 |
| OpenCode | 有（官方） | 有 |
| Pi | 有（社区提供，通过 epimetheus） | 有 |
| 自定义智能体运行框架 | 通常没有 | 有 |

其中大多数框架已经有原生 Hindsight 集成，单独运行对应工具时都是不错的选择。Omnigent 提供的是一套集中配置的记忆，能同时用于你编排的每种框架，也覆盖没有原生选项的自定义或内部框架。你只需在一个地方配置记忆，无须为每种工具分别配置。

## Omnigent 工具与原生集成 {#omnigents-tools-vs-a-native-integration}

如果某个智能体运行框架同时支持这两种方式，该选哪一种？每个记忆库只选择一种接入方式。不要同时启用工具的原生 Hindsight 集成，**又**让 Omnigent 的记忆工具指向同一记忆库，否则两条召回和存入路径会把同一段对话写入两次。

两种方式各有取舍：

- **原生集成**通常是自动的。它接入工具自身的生命周期，因此无需智能体主动决定何时召回和存入记忆；但它只适用于该工具，并且需要逐个工具配置。
- **Omnigent 的记忆工具**只需集中配置一次，就能用于你编排的每种框架；但它们由智能体驱动，需要智能体在系统指令的引导下显式调用。

简单来说：单独运行某个工具时，使用它的原生集成；通过 Omnigent 编排多个框架并希望它们通过一套配置共享记忆时，使用 Omnigent 的记忆工具。

## 常见问题 {#frequently-asked-questions}

**Omnigent 会自动调用召回和存入工具吗？**
不会。只有在智能体的系统指令要求时，智能体才会调用这些工具。这样行为是透明的：你可以查看智能体规范，准确了解记忆操作何时发生。

**两个智能体可以共用一个记忆库吗？**
可以。在两个智能体的工具配置中设置相同的 `bank_id`，它们就会从同一存储中读取和写入记忆。一个智能体存入的事实，另一个智能体召回时也能获取。

**切换智能体运行框架后，记忆还会保留吗？**
会。记忆库存储在 Hindsight 中，而不是智能体运行框架中。如果你将 Omnigent 智能体从 Codex 切换到 Claude Code，记忆库仍在原处。

**`hindsight_reflect` 能做什么，而 `hindsight_recall` 做不到？**
Recall 会检索与特定查询相关的记忆。Reflect 会综合累积的观测，对某个主题进行推理；如果你想了解智能体在多个会话中学到了什么，而不只是查找与单个查询匹配的事实，这种方式就很有用。Reflect 还支持通过 `response_schema` 字段指定结构化输出，也可以返回生成答案时所依据的底层事实。

**我可以只召回特定主题或用户的记忆吗？**
可以。`recall_tags` 和 `recall_tags_match` 配置字段可以筛选纳入考虑的记忆。在 `hindsight_retain` 中设置 `tags`，为存入的内容添加标签；在 `hindsight_recall` 中设置 `recall_tags`，只召回匹配这些标签的记忆。当一个记忆库供多个用户或项目共用时，这种方式很有用。

## 延伸阅读 {#further-reading}

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory)：了解召回和存入背后的概念。
- [让每种 AI 工具都拥有记忆](/blog/2026/04/07/one-memory-for-every-ai-tool)：让多个智能体使用同一个记忆库。
- [深入了解 retain()：智能体记住信息时实际发生了什么](/blog/2026/07/13/inside-retain-agent-memory)：了解智能体调用 `hindsight_retain` 时幕后发生的事情。
- [Claude Code 持久记忆](/blog/2026/05/06/claude-code-subagents-shared-memory)：了解如何在 Omnigent 中运行 Claude Code。
