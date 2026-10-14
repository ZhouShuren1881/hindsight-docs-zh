---
title: "为唯一会自我改进的 AI 智能体 Hermes 升级它应得的记忆能力"
authors: [benfrank241]
date: 2026-03-17T12:00
tags: [hermes, agents, python, memory, tutorial, plugin]
image: /img/blog/hermes-agent-memory.webp
---

![如何为 Hermes Agent 添加持久记忆](/img/blog/hermes-agent-memory.webp)

:::warning 已弃用
本文介绍的 `hindsight-hermes` pip 插件已弃用。现在，Hindsight 是从 Hermes 插件目录安装的记忆提供方：运行 `hermes plugins install hindsight`，然后运行 `hermes memory setup`。如需了解当前设置方法，请参阅[成为 Hermes 插件后，Hindsight 有哪些变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 是一款可自我改进的 AI 智能体，提供 40 多种工具和插件系统。它的内置记忆会保存到本地文件。`hindsight-hermes` 通过一次 pip 安装和三个环境变量，将内置记忆替换为结构化事实提取、实体解析和多策略检索。

<!-- truncate -->

**概要：**
- Hermes Agent 的内置记忆基于本地文件：没有结构化处理、智能检索或跨机器同步
- `hindsight-hermes` 是可通过 pip 安装的插件，可将 Hindsight 的 Retain、Recall 和 Reflect 注册为 Hermes 原生工具
- 只需运行一次 `pip install`、设置三个环境变量并停用内置 `memory` 工具即可
- 可搭配 [Hindsight Cloud](https://ui.hindsight.vectorize.io)（无需自备基础设施）使用，也可自行托管

## 问题：记忆功能不错，但还可以更进一步 {#the-problem-good-memory-but-it-could-go-further}

Hermes Agent 内置了记忆功能，设计也算合理。`memory` 工具会将持久事实保存为 `~/.hermes/` 中的文件，`session_search` 工具则能让智能体回顾过去的对话。这套功能确实可用：智能体可以保存偏好、召回上下文，并在不同会话之间延续已有知识。

不过，仍有改进空间：

- **结构。** 记忆以文本形式存储。系统无法解析实体（例如，将“Alice”与“我在工程团队的同事 Alice”关联起来），也不会追踪关系；除了会话时间戳之外，它也没有时间感知能力。
- **检索。** 搜索基于关键词。简单查找没有问题，但如果问题使用的措辞与已存内容不同，搜索就难以奏效。
- **本地存储。** 记忆保存在磁盘上。如果你在笔记本电脑和服务器上分别运行 Hermes，就会得到两个彼此隔离、无法共享上下文的“大脑”。
- **综合推理。** 你可以存入和检索事实，却无法询问“根据你对这位客户的了解，我们应该优先处理什么？”，并获得经过推理的答案。

Hindsight 在此基础上增加了一层能力：结构化事实提取、实体解析、知识图谱、结合交叉编码器重排序的多策略检索，以及能够综合所有已存记忆的 `reflect` 操作。

## 架构：注册三个工具的插件 {#architecture-a-plugin-that-registers-three-tools}

```
User  ──>  Hermes Agent
              ├── Built-in tools (terminal, browser, files, ...)
              └── [hindsight] plugin
                    ├── hindsight_retain  ──>  Hindsight API  ──> fact extraction,
                    ├── hindsight_recall  ──>       │              entity resolution,
                    └── hindsight_reflect ──>       │              knowledge graph,
                                                   └──>           PostgreSQL + pgvector
```

`hindsight-hermes` 接入 Hermes 的[插件系统](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/plugins.py)。Hermes 启动时会扫描带有 `hermes_agent.plugins` 入口点的程序包，找到 `hindsight-hermes`，并调用它的 `register()` 函数。该函数会将三个工具注册到 Hermes 的工具注册表中。

无需分叉 Hermes，也无需修改配置文件。只要运行 `pip install` 并设置环境变量即可。

## 设置 Hindsight {#setting-up-hindsight}

你可以选择使用 Hindsight Cloud（无需自行设置），也可以自行托管。

**选项 A：Hindsight Cloud**

1. [注册 Hindsight Cloud 账号](https://ui.hindsight.vectorize.io)
2. 在控制台中创建记忆库并复制 API 密钥
3. 你的基础 URL 是 `https://api.hindsight.vectorize.io`

**选项 B：使用 Docker 自行托管**

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

等待健康检查通过：

```bash
curl http://localhost:8888/health
# {"status":"healthy","database":"connected"}
```

`-v` 标志会在容器重启后保留数据。8888 端口用于 API；9999 端口是用于浏览记忆的管理界面。

**选项 C：使用 pip 自行托管**

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

## 安装 hindsight-hermes {#install-hindsight-hermes}

只需通过 pip 安装一次。该程序包会通过 Python 入口点自动注册为 Hermes 插件，无需配置文件或手动设置插件。唯一的要求是：它必须安装在与 Hermes **相同的 Python 环境**中。

```bash
uv pip install hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python
```

就这么简单。Hermes 启动时会自动发现该程序包，并注册三个记忆工具。

你可以检查工具是否已注册：

```bash
python -c "
import importlib.metadata
eps = importlib.metadata.entry_points(group='hermes_agent.plugins')
for ep in eps:
    print(f'{ep.name}: {ep.value}')
"
# Expected: hindsight: hindsight_hermes
```

## 配置 {#configuration}

启动 Hermes 前，先设置以下环境变量：

```bash
# 必需 — Hindsight 的运行地址
export HINDSIGHT_API_URL=http://localhost:8888

# 必需 — 此智能体使用的独立“记忆大脑”
export HINDSIGHT_BANK_ID=my-agent

# 可选 — 仅使用 Hindsight Cloud 时需要（https://api.hindsight.vectorize.io）
export HINDSIGHT_API_KEY=hsk_your-key-here

# 可选 — Recall 预算：low（快速）、mid（默认）、high（全面）
export HINDSIGHT_BUDGET=mid
```

如果既未设置 `HINDSIGHT_API_URL`，也未设置 `HINDSIGHT_API_KEY`，插件会静默跳过注册；Hermes 仍会正常启动，只是不会加载 Hindsight 工具。

### 停用 Hermes 的内置记忆 {#disable-hermess-built-in-memory}

这一步最容易被遗漏。Hermes 有自己的记忆存储，数据保存在 `~/.hermes/` 中。如果两者同时启用，**LLM 默认会选择内置记忆**，因为它是 LLM 已熟悉的单个工具。这样一来，Hindsight 工具就不会被使用。

```bash
hermes config set memory.memory_enabled false        # MEMORY.md
hermes config set memory.user_profile_enabled false  # USER.md (optional)
```

这些设置会在不同会话间保留。之后如需重新启用，将相同标志的值改回 `true` 即可。

## 使用记忆工具 {#using-the-memory-tools}

启动 Hermes：

```bash
hermes
```

输入 `/tools` 进行检查。你应该能看到 `[hindsight]` 工具集：

```
[hindsight]
  * hindsight_recall     - Search long-term memory for relevant information.
  * hindsight_reflect    - Synthesize a thoughtful answer from long-term memories.
  * hindsight_retain     - Store information to long-term memory for later retrieval.
```

### Retain（存入）— 存储记忆 {#retain--store-memories}

告诉 Hermes 一条需要记住的信息：

```
● Remember that my favourite programming language is Rust and I prefer dark mode.
```

如果响应中出现 `⚡ hindsight`，就说明 Hermes 调用了 `hindsight_retain`，而不是内置记忆工具。

在底层，Hindsight 会提取结构化事实（“用户最喜欢的编程语言是 Rust”），解析实体、生成嵌入向量并为所有内容建立索引。这些工作都不需要你管理。

### Recall（召回）— 检索记忆 {#recall--search-memories}

```
● What do you know about my programming preferences?
```

Recall 会并行运行四种检索策略：语义检索、BM25 关键词匹配、实体图遍历和时间过滤，然后使用交叉编码器对结果重排序。正因如此，它比在扁平文件中进行字符串匹配效果更好。

### Reflect（反思）— 综合多条记忆 {#reflect--synthesize-across-memories}

```
● Based on what you know about me, suggest a colour scheme for my IDE.
```

Reflect 不会返回原始事实。它会遍历知识图谱，基于记忆库中的全部内容进行推理，并生成综合后的答案。它比 Recall 慢，但更适合开放式问题。

### 通过 API 验证 {#verify-via-the-api}

直接查询 Hindsight，确认记忆已存入：

```bash
curl -s http://localhost:8888/v1/default/banks/my-agent/memories/recall \
  -H "Content-Type: application/json" \
  -d '{"query": "programming preferences", "budget": "low"}' | python3 -m json.tool
```

```json
{
  "results": [
    {
      "text": "User's favourite programming language is Rust.",
      "type": "world",
      "entities": ["user"]
    },
    {
      "text": "User prefers dark mode in all editors.",
      "type": "world",
      "entities": ["user"]
    }
  ]
}
```

## 常见问题和边缘情况 {#pitfalls-and-edge-cases}

1. **插件未出现在 `/tools` 中。** 最常见的原因是 `hindsight-hermes` 与 Hermes 安装在不同的 Python 环境中。入口点按环境分别注册。请在 Hermes 的虚拟环境中运行以下命令进行检查：`python -c "import importlib.metadata; print(list(importlib.metadata.entry_points(group='hermes_agent.plugins')))"`。

2. **LLM 选择了内置记忆。** 即使插件已加载，只要 `memory` 和 `hindsight_retain` 同时存在，LLM 仍可能选择 `memory`。请运行 `hermes config set memory.memory_enabled false`。

3. **Retain 是异步的。** API 会立即返回，事实提取则在后台进行。如果存入后马上在同一轮中调用 Recall，新事实可能尚未建立索引。请将流程设计为在后续轮次中召回。

4. **环境变量只在启动时读取一次。** 启动后修改 `HINDSIGHT_API_URL` 或 `HINDSIGHT_BANK_ID` 不会生效。重启 Hermes 才能应用更改。


## 权衡：Hindsight 插件与其他方案 {#tradeoffs-hindsight-plugin-vs-alternatives}

| | **Hindsight 插件** | **内置记忆** |
|---|---|---|
| **存储** | PostgreSQL + pgvector | 本地文件（~/.hermes/） |
| **结构** | 事实、实体和关系 | 原始文本 |
| **检索** | 语义检索 + BM25 + 图检索，并重排序 | 基本搜索 |
| **综合推理** | `reflect` 工具 | 无 |
| **跨机器同步** | 支持 | 不支持 |
| **设置** | pip 安装 + 环境变量 | 内置 |

如果你希望免配置地使用基本持久化功能，可以选择内置记忆。

如果你需要结构化检索、实体解析以及可跨机器持久保存的记忆，可以选择 Hindsight 插件。

## 回顾 {#recap}

通过可用 pip 安装的插件，`hindsight-hermes` 为 Hermes Agent 提供持久、结构化的长期记忆。无需修改代码或打补丁改配置。

Hermes 的插件系统使用标准 Python 入口点，因此任何 pip 程序包都可以注册工具。`hindsight-hermes` 注入了 Retain、Recall 和 Reflect 功能，并由 Hindsight 的多策略检索、实体解析和知识图谱提供支持。

实际使用中的关键一步是：停用 Hermes 内置的 `memory` 工具。否则 LLM 会优先使用它，Hindsight 工具就会闲置。

## 后续步骤 {#next-steps}

- **逐步积累记忆。** 像平时一样使用 Hermes；它会存入重要信息，并在相关时召回。
- **尝试 Reflect 进行综合推理。** 提出开放式问题，例如：“根据你对我的了解，我会喜欢什么类型的项目？”
- **为每位用户使用独立记忆库。** 按用户设置 `HINDSIGHT_BANK_ID`，使每个人的记忆彼此隔离。
- **探索 MCP 方案。** Hermes 原生支持 MCP 服务器。你可以直接连接 Hindsight 的 MCP 服务器（`http://localhost:8888/mcp`），而不使用插件，无需安装 `hindsight-hermes` 程序包。两种方式的差别在于：插件会使用 Hermes 原生模式注册工具，而 MCP 工具需要先发现。
- **通过手动注册获得更多控制。** 如果你想设置标签、Recall 筛选条件，或跳过插件系统，可以直接使用 `hindsight-hermes` 提供的 `register_tools()` 和 `memory_instructions()` 函数。
- **阅读文档。** 请参阅[完整集成参考](https://hindsight.vectorize.io/sdks/integrations/hermes)。
