---
title: "开源MCP记忆服务器您的AI智能体缺失"
authors: [benfrank241]

date: 2026-03-04T12:00
tags: [mcp, memory, agents, docker, tutorial]
image: /img/blog/mcp-agent-memory.webp
hide_table_of_contents: true
---

AI 智能体忘记会话之间的一切。 Hindsight 通过MCP 为他们提供持久的、结构化的记忆。一个 Docker 命令可在本地运行完整堆栈。连接任何MCP兼容的客户端。三个核心操作：`retain`（存储）、`recall`（搜索）、`reflect`（推理）——加上随着记忆增长自动更新的心智模型。

<!-- truncate -->

---

## 概览 {#tldr}

- AI 智能体忘记会话之间的一切。 Hindsight 通过MCP 为他们提供持久的、结构化的记忆。
- 一个 Docker 命令在本地运行完整堆栈。连接任何MCP兼容的客户端。
- 三个核心操作：`retain`（存储）、`recall`（搜索）、`reflect`（原因）。再加上心智模型——随着记忆的增长自动更新的活文件。
- Hindsight 不是矢量数据库。它提取结构化事实，解析实体，构建知识图，并使用跨编码器重排序来呈现真正重要的内容。
- 开源：[github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)。

---

## 问题 {#the-problem}

AI智能体是无状态的。每节课都从零开始。

你告诉你的编码助理你的技术堆栈、你的部署偏好、你的团队的惯例。下一次会议——消失了。您解释相同的架构决策，重新建立相同的上下文，重新陈述相同的约束。每次。

人们通过将上下文粘贴到系统提示中或维护手动复制的注释来解决此问题。这在一段时间内有效，但无法扩展。它无法捕获在智能体工作中积累的那种细致入微、不断发展的知识——比如“这个用户更喜欢功能模式”、“他们的团队使用PostgreSQL 16”或“他们上个月尝试过Redis缓存并将其回滚”。

你真正想要的是让你的智能体随着时间的推移建立记忆。存储重要的内容，在相关时检索它，并从积累中学习。

Hindsight 是一个为此而设计的开源记忆系统。它连接到任何MCP兼容的智能体，并赋予其持久的、结构化的长期记忆。

---

## 方法 {#the-approach}

```
Your MCP Client  ──MCP (HTTP)──>  Hindsight API
(Claude, Cursor,                       │
 VS Code, etc.)                        ├── Memory Engine (retain/recall/reflect)
                                       ├── Fact Extraction + Entity Resolution
                                       ├── Embeddings + Cross-Encoder Reranking
                                       ├── Knowledge Graph Traversal
                                       └── PostgreSQL + pgvector
```

您的智能体通过MCP（模型上下文协议）连接到Hindsight。 MCP 是一个开放标准——任何使用该标准的客户端都可以使用 Hindsight 作为记忆后端。

当您的智能体通过`retain`存储记忆时，Hindsight不仅仅将原始文本转储到矢量数据库中。它提取结构化事实，解析实体（“Alice”和“我的同事 Alice”是同一个人），生成嵌入，并对所有内容建立索引以供检索。

当您的智能体需要通过 `recall` 获取上下文时，Hindsight 并行运行四种检索策略 - 语义搜索、BM25 关键字匹配、实体图遍历和时间过滤 - 然后使用交叉编码器对结果重新排序。返回的是您记忆中最相关的子集，而不是原始转储。

这很重要，因为当你有数百个跨越不同主题和时间段的记忆时，天真的RAG（嵌入文本，余弦相似度，返回top-k）就会崩溃。 Hindsight 的多策略方法可确保解决诸如“我们对缓存做了什么决定？”之类的问题。即使记忆使用不同的术语，也能找到正确的答案。

---

## 实施 {#implementation}

### 第一步：开始Hindsight {#step-1-start-hindsight}

运行Hindsight最快的方法是使用Docker。一个命令即可为您提供完整的堆栈 - API 服务器、嵌入式 PostgreSQL、本地嵌入模型和 MCP 端点：

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_LLM_API_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

您需要一个LLMAPI密钥来进行Hindsight的内部处理（事实提取、实体解析、光束）。 Hindsight 支持多个 LLM 提供程序 — OpenAI、Anthropic、Gemini、Groq 或通过 Ollama 或 LM Studio 的本地模型。如果您不使用 OpenAI，请显式设置提供程序：

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=gemini \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_GEMINI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gemini-2.5-flash \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

`-v` 标志在容器重新启动时保留数据。如果没有它，当容器停止时，记忆就会丢失。端口 8888 是 API 和 MCP 端点；端口 9999 是用于浏览记忆的可选管理 UI。

运行后，MCP端点在`http://localhost:8888/mcp/your_bank_id/`可用（将`your_bank_id`替换为您喜欢的任何名称）。

**或使用Hindsight Cloud** — 完全跳过Docker。 [注册免费帐户](https://ui.hindsight.vectorize.io)，抓住你的API钥匙，并通过MCP连接：

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "http",
      "url": "https://api.hindsight.vectorize.io/mcp/your_bank_id/",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

或使用Claude Code：

```bash
claude mcp add --transport http hindsight \
  https://api.hindsight.vectorize.io/mcp/your_bank_id/ \
  --header "Authorization: Bearer YOUR_API_KEY"
```

### 第 2 步：连接您的 MCP 客户端 {#step-2-connect-your-mcp-client}

Hindsight 适用于任何 MCP 兼容客户端。将以下 JSON 添加到客户端的配置文件中：

```json
{
  "mcpServers": {
    "hindsight": {
      "type": "http",
      "url": "http://localhost:8888/mcp/your_bank_id/"
    }
  }
}
```

客户端的配置文件位置：

|客户端|配置文件|
|--------|-------------|
|Claude 桌面版|`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 或 `%APPDATA%\Claude\claude_desktop_config.json` (Windows)|
|Cursor|`.cursor/mcp.json`（项目）或 `~/.cursor/mcp.json`（全局）|
|VS 代码|`.vscode/mcp.json` — 使用 `"servers"` 代替 `"mcpServers"`|
|风帆冲浪|`~/.codeium/windsurf/mcp_config.json` — 使用 `"serverUrl"` 代替 `"url"`|

**Claude Code** — 使用 CLI 代替：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/your_bank_id/
```

重新启动您的客户端以使更改生效。

### 第 3 步：验证其是否正常工作 {#step-3-verify-its-working}

问你的智能体：

> “你有什么可用的记忆工具？”

应该列出Hindsight的记忆工具，包括三个核心操作（`retain`、`recall`、`reflect`）、六个心智模型工具，以及用于浏览记忆、管理文档和记忆库管理的附加工具。

---

## 记忆工具 {#the-memory-tools}

连接后，您的智能体可以访问三个核心操作和一组心智模型工具。

**记忆存储** — 存储记忆：

告诉你的智能体一些你想让它记住的事情。它会根据工具的内置指令自动调用`retain`，或者你可以明确地：

> “请记住，对于所有新项目，我更喜欢 TypeScript 而不是 JavaScript。”

在幕后，Hindsight提取结构化事实，解析实体，并索引记忆以供以后检索。对“工程部门的 Alice 建议我们切换到 Postgres 16 以获取新的 JSONB 功能”的单个 `retain` 调用会生成：

- 事实：“Alice 建议切换到 Postgres 16 以获取 JSONB 功能”
- 实体解析：“Alice”链接到“Alice from Engineering”
- 时间索引：当提到这一点时
- Embeddings：用于稍后的语义搜索

**记忆召回** — 搜索记忆：

当你提出问题时，你的智能体会主动记忆相关上下文。也可以直接提示：

> “你对我的编程偏好了解多少？”

记忆召回并行运行四种检索策略 - 语义搜索、关键字匹配 (BM25)、图遍历和时间过滤 - 然后使用交叉编码器对结果重新排序。这就是它比简单的矢量搜索更好的原因。

**反思** — 综合见解：

反思比记忆召回更深。它不是返回原始事实，而是使用 LLM 来推理你的记忆：

> “根据您对我的了解，您会为我的下一个业余项目推荐什么技术堆栈？”

这对于需要连接多个记忆点的问题非常有用。

**心智模型** — 动态文档：

心智模型是随着新记忆的添加而自动保持最新的摘要。将它们视为可自行刷新的预先计算的反思：

> “创建一个名为‘我的技术堆栈’的心智模型，用于跟踪我使用的语言、框架和工具。”

可以列出、检索、更新、删除心智模型。它们对于维护主题的始终最新视图非常有用，而无需每次都运行完整的`reflect`。

---

## 记忆库 {#memory-banks}

URL 路径控制您正在使用的记忆库。在上面的示例中，`/mcp/your_bank_id/`将所有操作范围限制在该记忆库中。

记忆库是孤立的存储——将每个存储视为一个单独的大脑。您可以为不同的上下文运行单独的记忆库：

- `my-project` 针对特定项目
- `team-knowledge` 用于共享团队信息
- 多智能体系统中每个用户一个记忆库

记忆库在首次使用时自动创建。要使用不同的记忆库，请更改 URL 路径：

```
http://localhost:8888/mcp/project-x/
```

如果您希望智能体在单个会话中管理多个记忆库，请连接到`/mcp/`处的多记忆库端点。这将 `bank_id` 作为参数添加到每个工具中，并包括额外的记忆库管理工具，如 `list_banks`、`create_bank` 和 `get_bank_stats`。

---

## 陷阱和边缘情况 {#pitfalls--edge-cases}

### 记忆处理是异步的 {#memory-processing-is-async}

当您的智能体调用`retain`时，事实提取和索引会在后台发生。如果你储存一些东西并立即尝试记忆它，它可能还不存在。给它几秒钟的时间来回忆复杂的记忆。

### 记忆召回的token限制 {#token-limits-on-recall}

默认情况下，`recall` 返回最多 4096 个记忆内容标记。对于具有广泛历史的记忆库，可以从响应中删除一些较旧的或较低相关性的记忆。这是有意为之的——它使上下文窗口保持可管理性。

### 心智模型创建也是异步的 {#mental-model-creation-is-async-too}

当您创建或刷新心智模型时，LLM驱动的生成在后台运行。初始调用返回一个`operation_id`。内容很快就会可用——通常是几秒钟，具体取决于需要合成多少记忆。

### LLM键是Hindsight，不是你的智能体 {#llm-key-is-for-hindsight-not-your-agent}

`HINDSIGHT_API_LLM_API_KEY`由Hindsight内部用于事实提取、实体解析和坐标操作。它与您的智能体使用的任何 LLM 是分开的。您可以在这里使用便宜、快速的模型（Gemini Flash、Groq 等）——它不需要与为您的智能体提供动力的相同模型。

---

## 当Hindsight工作良好时 {#when-hindsight-works-well}

- 您需要结构化记忆，而不仅仅是对话日志上的矢量搜索
- 你需要跨会话、客户和智能体的记忆
- 您想要开箱即用的实体解析、时间感知和多策略检索
- 你正在构建能够随着时间的推移积累知识的智能体

---

## 回顾 {#recap}

Hindsight 给予任何MCP兼容的智能体持久的长期记忆。一条Docker命令启动，几行JSON连接。

关键的见解是记忆不仅仅是存储和检索。 Hindsight 从原始输入中提取结构化事实，链接实体，跟踪时间数据，并使用跨编码器重排序来显示最相关的记忆。这就是它与将对话日志填充到矢量数据库中的区别。

MCP工具涵盖整个生命周期：`retain`用于存储，`recall`用于多策略检索搜索，`reflect`用于综合见解，心智模型工具用于维护自动更新的活动文档，以及用于浏览和管理记忆、文档和标签的实用工具。

> **想要托管吗？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 为您运行完整的堆栈 — 没有 Docker，没有基础设施。注册、获取 API 密钥，然后通过 HTTPS 连接。

---

## 后续步骤 {#next-steps}

- **增强你的记忆力**：开始正常使用你的智能体。告诉它您的偏好、您的项目背景和您的决定。它将记忆重要的事情。
- **探索心智模型**：创建随着记忆增长而自动更新的动态文档。尝试：`"创建一个总结项目架构的心智模型。"`
- **尝试多记忆库设置**：为不同的项目或智能体运行单独的记忆库。连接`/mcp/`，实现多记忆库模式。
- **直接使用SDK**：除了MCP之外，Hindsight还有[Python](https://pypi.org/project/hindsight-client/)和[TypeScript](https://www.npmjs.com/package/@vectorize-io/hindsight-client) SDK，用于将记忆集成到您自己的应用程序中。
- **查看文档**：完整的API参考、SDK指南以及[hindsight.vectorize.io](https://hindsight.vectorize.io)的更多内容。
