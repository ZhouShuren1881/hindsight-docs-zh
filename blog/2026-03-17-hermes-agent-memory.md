---
title: "给予唯一的自我提升AI智能体（Hermes）应得的记忆升级"
authors: [benfrank241]
date: 2026-03-17T12:00
tags: [hermes, agents, python, memory, tutorial, plugin]
image: /img/blog/hermes-agent-memory.webp
---

![如何为Hermes智能体添加持久记忆](/img/blog/hermes-agent-memory.webp)

:::warning 已弃用
本文中描述的 `hindsight-hermes` pip 插件已弃用。 Hindsight 现在是从 Hermes 插件目录安装的 Hermes 记忆提供程序：`hermes plugins install hindsight`，然后是 `hermes memory setup`。有关当前设置指南，请参阅[Hindsight 成为Hermes 插件后有何变化](/blog/2026/10/01/hindsight-hermes-plugin-what-changed)。
:::

[Hermes智能体](https://github.com/NousResearch/hermes-agent)是一个自我改进的AI智能体，拥有40多个工具和插件系统。其内置记忆保存到本地文件。 `hindsight-hermes` 通过一个 pip 安装和三个环境变量将其替换为结构化事实提取、实体解析和多策略检索。

<!-- truncate -->

**概览：**
- Hermes智能体的内置记忆是基于本地文件的——没有结构，没有检索智能，没有跨机器同步
- `hindsight-hermes` 是一个 pip 可安装插件，可将 Hindsight 存储记忆/记忆召回/反思注册为本机 Hermes 工具
- 一个`pip install`，三个环境变量，禁用内置的`memory`工具，就完成了
- 与[Hindsight Cloud](https://ui.hindsight.vectorize.io)（零基础设施）或自托管一起使用

## 问题：记忆力很好，但还可以更进一步 {#the-problem-good-memory-but-it-could-go-further}

Hermes智能体内置记忆，设计合理。 `memory`工具将持久事实作为持久文件保存到`~/.hermes/`，而`session_search`工具让智能体回顾过去的对话。它有效——智能体可以存储偏好、记忆召回上下文，并跨会话携带知识。

但是还有成长的空间：

- **结构。** 记忆以文本形式存储。没有实体解析（将“Alice”与“我的工程同事 Alice”连接起来），没有关系跟踪，也没有会话时间戳之外的时间感知。
- **检索。** 搜索基于关键字。对于简单的查找来说，这很好，但它很难处理使用与存储的术语不同的术语的问题。
- **地点。** 记忆存在于磁盘上。在笔记本电脑和服务器上运行Hermes——两个独立的大脑，无法共享上下文。
- **​​合成。** 您可以存储和检索事实，但您不能询问“根据您对这位客户的了解，我们应该优先考虑什么？”并得到合理的答案。

Hindsight在顶部添加了一层：结构化事实提取、实体解析、知识图、跨编码器重排序的多策略检索，以及综合所有存储记忆的`reflect`操作。

## Architecture：注册三个工具的插件 {#architecture-a-plugin-that-registers-three-tools}

```
User  ──>  Hermes Agent
              ├── Built-in tools (terminal, browser, files, ...)
              └── [hindsight] plugin
                    ├── hindsight_retain  ──>  Hindsight API  ──> fact extraction,
                    ├── hindsight_recall  ──>       │              entity resolution,
                    └── hindsight_reflect ──>       │              knowledge graph,
                                                   └──>           PostgreSQL + pgvector
```

`hindsight-hermes` 钩入 Hermes 的 [插件系统](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/plugins.py)。当Hermes启动时，它会扫描具有`hermes_agent.plugins`入口点的包，找到`hindsight-hermes`，并调用其`register()`函数。这会将三个工具注册到 Hermes 的工具注册表中。

无分叉Hermes。没有修补配置文件。只是 `pip install` 和环境变量。

## 设置Hindsight {#setting-up-hindsight}

您有两个选择：Hindsight Cloud（无需设置）或自托管。

**选项A：Hindsight Cloud**

1. [Hindsight Cloud报名](https://ui.hindsight.vectorize.io)
2. 在仪表板中创建一个记忆库并复制您的API密钥
3. 您的基本网址是`https://api.hindsight.vectorize.io`

**选项 B：使用 Docker 自托管**

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

等待健康检查：

```bash
curl http://localhost:8888/health
# {"status":"healthy","database":"connected"}
```

`-v`标志在容器重新启动时保留数据。端口8888是API；端口 9999 是用于浏览记忆的管理 UI。

**选项 C：使用 pip 自托管**

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

## 安装后见之明-hermes {#install-hindsight-hermes}

一个pip安装。该包通过 Python 入口点自动注册为 Hermes 插件 — 无需配置文件，无需手动插件设置。唯一的要求是它作为 Hermes 安装在 **相同Python环境** 中。

```bash
uv pip install hindsight-hermes --python $HOME/.hermes/hermes-agent/venv/bin/python
```

就是这样。当Hermes启动时，它会自动发现包并注册三个记忆工具。

您可以验证它是否已注册：

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

在启动Hermes之前设置这些环境变量：

```bash
#必需 — Hindsight 正在运行
export HINDSIGHT_API_URL=http://localhost:8888

#必需 — 记忆库（这个智能体的一个孤立的“大脑”）
export HINDSIGHT_BANK_ID=my-agent

# 可选，仅 Hindsight Cloud（https://api.hindsight.vectorize.io）需要
export HINDSIGHT_API_KEY=hsk_your-key-here

#可选 — 记忆召回预算：低（快）、中（默认）、高（彻底）
export HINDSIGHT_BUDGET=mid
```

如果`HINDSIGHT_API_URL`和`HINDSIGHT_API_KEY`都没有设置，插件会默默地跳过注册——Hermes在没有Hindsight工具的情况下正常启动。

### 禁用Hermes的内置记忆 {#disable-hermess-built-in-memory}

这是人们错过的一步。 Hermes 有自己的记忆存储，保存到`~/.hermes/`。如果两者都处于活动状态，**LLM 默认为内置** — 它是它已经识别的单一工具。您的 Hindsight 工具将闲置。

```bash
hermes config set memory.memory_enabled false        # MEMORY.md
hermes config set memory.user_profile_enabled false  # USER.md (optional)
```

这在会话中持续存在。稍后通过将相同的标志设置回 `true` 来重新启用。

## 使用记忆工具 {#using-the-memory-tools}

启动Hermes：

```bash
hermes
```

输入`/tools`进行验证。您应该看到 `[hindsight]` 工具集：

```
[hindsight]
  * hindsight_recall     - Search long-term memory for relevant information.
  * hindsight_reflect    - Synthesize a thoughtful answer from long-term memories.
  * hindsight_retain     - Store information to long-term memory for later retrieval.
```

### 记忆存储 — 存储记忆 {#retain--store-memories}

告诉Hermes需要记住的事情：

```
● Remember that my favourite programming language is Rust and I prefer dark mode.
```

您应该在响应中看到 `⚡ hindsight` — 这证实了它称为 `hindsight_retain`，而不是内置的记忆工具。

在底层，Hindsight提取结构化事实（“用户最喜欢的编程语言是Rust”），解析实体，生成嵌入，并对所有内容建立索引。这些你都管不了。

### 记忆召回 — 搜索记忆 {#recall--search-memories}

```
● What do you know about my programming preferences?
```

记忆召回并行运行四种检索策略——语义搜索、BM25关键字匹配、实体图遍历和时间过滤——然后使用交叉编码器对结果重新排序。这就是它比平面文件上的字符串匹配更好的原因。

### 反思 — 跨记忆合成 {#reflect--synthesize-across-memories}

```
● Based on what you know about me, suggest a colour scheme for my IDE.
```

反思不返回原始事实。它遍历知识图谱，对记忆库中的所有内容进行推理，并生成综合答案。比记忆召回慢，但对于开放式问题更有用。

### 通过API验证 {#verify-via-the-api}

直接查询Hindsight确认记忆已存储：

```bash
curl -s http://localhost:8888/v1/default/banks/my-agent/memories/recall \
  -H "Content-Type: application/json" \
  -d '{"query": "programming preferences", "budget": "low"}' | python3 -m json.tool
```

```json
{
  "results": [
    {
      "text": "用户最喜欢的编程语言是 Rust。",
      "type": "world",
      "entities": ["user"]
    },
    {
      "text": "用户在所有编辑器中都喜欢深色模式。",
      "type": "world",
      "entities": ["user"]
    }
  ]
}
```

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

1. **插件不在`/tools`中。** 最常见的原因：`hindsight-hermes` 安装在与 Hermes 不同的 Python 环境中。入口点是每个环境的。从 Hermes venv 运行 `python -c "import importlib.metadata; print(list(importlib.metadata.entry_points(group='hermes_agent.plugins')))"` 进行验证。

2. **LLM选择内置记忆。** 即使加载了插件，如果`memory`和`hindsight_retain`都存在，LLM会选择`memory`。运行`hermes config set memory.memory_enabled false`。

3. **记忆存储是异步的。** API立即返回；事实提取发生在后台。如果你同时记忆存储和立即记忆召回，新的事实可能还没有被索引。设计使记忆发生在随后的回合中。

4. **环境变量在启动时读取一次。
启动后**更改`HINDSIGHT_API_URL`或`HINDSIGHT_BANK_ID`无效。重新启动Hermes以获取更改。


## 权衡：Hindsight插件与替代方案 {#tradeoffs-hindsight-plugin-vs-alternatives}

||**Hindsight插件**|**内置记忆**|
|---|---|---|
|**存储**|PostgreSQL + pgvector|本地文件(~/.hermes/)|
|**结构**|事实、实体、关系|原始文本|
|**检索**|语义 + BM25 + 图，重新排名|基本搜索|
|**合成**|反思工具|无|
|**跨机**|是的|否|
|**设置**|pip 安装 + 环境变量|内置|

**使用内置记忆** 当您想要零设置和基本持久性时。

**使用Hindsight插件** 当您想要结构化检索、实体解析和跨机器持久的记忆时。

## 回顾 {#recap}

`hindsight-hermes` 通过pip可安装插件为Hermes提供智能体持久、结构化的长期记忆。没有代码更改，没有配置补丁。

Hermes的插件系统使用标准的Python入口点，因此任何pip包都可以注册工具。 `hindsight-hermes`注入了记忆存储、记忆召回和反思——由Hindsight的多策略检索、实体解析和知识图谱支持。

关键实用细节：禁用Hermes内置`memory`工具。否则 LLM 更喜欢它，而你的 Hindsight 工具就不会被使用。

## 后续步骤 {#next-steps}

- **随着时间的推移建立记忆。** 正常使用Hermes — 它将记忆重要的内容并在相关时记忆召回。
- **尝试合成。** 提出开放式问题：“根据您对我的了解，我会喜欢什么样的项目？”
- **使用每个用户的记忆库。** 为每个用户设置`HINDSIGHT_BANK_ID`，以实现每个人的独立记忆。
- **探索MCP替代方案。** Hermes 原生支持 MCP 服务器。您可以直接连接Hindsight的MCP服务器（`http://localhost:8888/mcp`）而不是插件 - 不需要`hindsight-hermes`包。权衡是插件使用Hermes本机模式注册工具，而MCP工具需要发现。
- ​​**使用手动注册进行更多控制。** 如果你想设置标签，记忆召回过滤器，或者跳过插件系统，`hindsight-hermes`暴露了`register_tools()`和`memory_instructions()`功能供直接使用。
- **阅读文档。** [hindsight.vectorize.io/sdks/integrations/hermes](https://hindsight.vectorize.io/sdks/integrations/hermes) 的完整集成参考。
