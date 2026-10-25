---
title: "你的 AI 智能体需要的开源 MCP 记忆服务器"
authors: [benfrank241]

date: 2026-03-04T12:00
tags: [mcp, memory, agents, docker, tutorial]
image: /img/blog/mcp-agent-memory.webp
hide_table_of_contents: true
---

AI 智能体会忘记不同会话之间的一切。Hindsight 通过 MCP 为它们提供持久、结构化的记忆。只需一条 Docker 命令，就能在本地运行完整堆栈；再连接任意兼容 MCP 的客户端即可。它提供三个核心操作：`retain`（存入）、`recall`（召回）和 `reflect`（反思），以及会随着记忆增长而自动更新的心智模型。

<!-- truncate -->

---

## 概览 {#tldr}

- AI 智能体会忘记不同会话之间的一切。Hindsight 通过 MCP 为它们提供持久、结构化的记忆。
- 一条 Docker 命令即可在本地运行完整堆栈。连接任意兼容 MCP 的客户端。
- 三个核心操作：`retain`（存入）、`recall`（召回）和 `reflect`（反思）。此外还有心智模型，也就是会随着记忆增长而自动更新的持续维护型文档。
- Hindsight 不是向量数据库。它会提取结构化事实、解析实体、构建知识图谱，并使用交叉编码器重排序，呈现真正重要的内容。
- 开源：[github.com/vectorize-io/hindsight](https://github.com/vectorize-io/hindsight)。

---

## 问题 {#the-problem}

AI 智能体没有状态。每次会话都从零开始。

你告诉编程助手自己使用的技术栈、部署偏好和团队惯例。下次会话，这些信息就不见了。你又得解释同样的架构决策、重新建立同样的上下文、重申同样的约束。每次都如此。

人们会把上下文粘贴到系统提示中，或手动维护笔记并在需要时复制进去，以此绕过这个问题。这种办法短期内行得通，但无法扩展，也无法捕捉与智能体协作数周后逐渐积累的细致且不断演变的知识，例如“这位用户偏好函数式模式”“他们的团队使用 PostgreSQL 16”或“他们上个月尝试过 Redis 缓存，后来又回滚了”。

你真正需要的是让智能体随着时间积累记忆：存入重要信息，在相关时召回，并从积累的内容中学习。

Hindsight 是专为此目的设计的开源记忆系统。它可以连接任意兼容 MCP 的智能体，为其提供持久、结构化的长期记忆。

---

## 实现思路 {#the-approach}

```
你的 MCP 客户端  ──MCP (HTTP)──>  Hindsight API
(Claude、Cursor、                       │
 VS Code 等)                            ├── 记忆引擎（retain/recall/reflect）
                                        ├── 事实提取 + 实体解析
                                        ├── 嵌入向量 + 交叉编码器重排序
                                        ├── 知识图谱遍历
                                        └── PostgreSQL + pgvector
```

你的智能体通过 MCP（模型上下文协议）连接到 Hindsight。MCP 是一项开放标准，任何支持该协议的客户端都能把 Hindsight 用作记忆后端。

智能体通过 `retain` 存入记忆时，Hindsight 不会只是把原始文本丢进向量数据库。它会提取结构化事实、解析实体（“Alice”和“我的同事 Alice”会被识别为同一个人）、生成嵌入向量，并为所有内容建立索引，以便之后检索。

智能体通过 `recall` 获取上下文时，Hindsight 会并行运行四种检索策略：语义检索、BM25 关键词匹配、实体图遍历和时间筛选，然后使用交叉编码器对结果重排序。返回的是记忆中最相关的子集，而不是原始内容的完整倾倒。

这一点很重要，因为当数百条记忆涉及不同主题和时间段时，朴素的 RAG（嵌入文本、计算余弦相似度、返回 top-k）就会失效。Hindsight 的多策略方法可以确保诸如“我们对缓存做了什么决定？”这类问题找到正确答案，即使记忆中使用了不同的术语。

---

## 实施 {#implementation}

### 第一步：启动 Hindsight {#step-1-start-hindsight}

使用 Docker 是运行 Hindsight 最快的方法。一条命令即可启动完整堆栈，其中包括 API 服务器、嵌入式 PostgreSQL、本地嵌入模型和 MCP 端点：

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_LLM_API_KEY \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

Hindsight 的内部处理（事实提取、实体解析和反思操作）需要 LLM API 密钥。Hindsight 支持多个 LLM 服务提供方：OpenAI、Anthropic、Gemini、Groq，以及通过 Ollama 或 LM Studio 使用的本地模型。如果使用的不是 OpenAI，请显式设置服务提供方：

```bash
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=gemini \
  -e HINDSIGHT_API_LLM_API_KEY=YOUR_GEMINI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gemini-2.5-flash \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

`-v` 标志会在容器重启后保留数据。若省略此标志，容器停止时记忆也会丢失。端口 8888 用于 API 和 MCP 端点；端口 9999 是可选的管理界面，可用来浏览记忆。

启动后，可通过 `http://localhost:8888/mcp/your_bank_id/` 访问 MCP 端点（将 `your_bank_id` 替换为你喜欢的任意名称）。

**也可以使用 Hindsight Cloud**，完全跳过 Docker。[注册免费账户](https://ui.hindsight.vectorize.io)，获取 API 密钥，然后通过 MCP 连接：

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

也可以使用 Claude Code：

```bash
claude mcp add --transport http hindsight \
  https://api.hindsight.vectorize.io/mcp/your_bank_id/ \
  --header "Authorization: Bearer YOUR_API_KEY"
```

### 第二步：连接 MCP 客户端 {#step-2-connect-your-mcp-client}

Hindsight 适用于任意兼容 MCP 的客户端。将以下 JSON 添加到客户端的配置文件中：

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

各客户端的配置文件位置如下：

| 客户端 | 配置文件 |
| --- | --- |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或 `%APPDATA%\Claude\claude_desktop_config.json`（Windows） |
| Cursor | `.cursor/mcp.json`（项目级）或 `~/.cursor/mcp.json`（全局） |
| VS Code | `.vscode/mcp.json`；使用 `"servers"` 而不是 `"mcpServers"` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json`；使用 `"serverUrl"` 而不是 `"url"` |

**Claude Code**：改用 CLI 添加：

```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/your_bank_id/
```

重启客户端以应用更改。

### 第三步：验证是否正常工作 {#step-3-verify-its-working}

询问智能体：

> “你有哪些可用的记忆工具？”

它应该会列出 Hindsight 的记忆工具，包括三个核心操作（`retain`、`recall`、`reflect`）、六个心智模型工具，以及用于浏览记忆、管理文档和管理记忆库的其他工具。

---

## 记忆工具 {#the-memory-tools}

连接后，智能体可以使用三个核心操作和一组心智模型工具。

**Retain（存入）** — 存入一条记忆：

告诉智能体你希望它记住什么。根据工具内置的指令，它会自动调用 `retain`；你也可以明确要求：

> “请记住，所有新项目我都更偏好 TypeScript，而不是 JavaScript。”

在幕后，Hindsight 会提取结构化事实、解析实体，并为记忆建立索引，以便之后检索。对“工程团队的 Alice 建议我们切换到 Postgres 16，以使用新的 JSONB 功能”调用一次 `retain`，会产生以下内容：

- 一条事实：“Alice 建议切换到 Postgres 16，以使用 JSONB 功能”
- 实体解析：“Alice”与“Alice from engineering”关联
- 时间索引：记录提及这件事的时间
- 嵌入向量：用于之后的语义检索

**Recall（召回）** — 检索记忆：

当你提问时，智能体会主动召回相关上下文。你也可以直接提示它：

> “你知道哪些关于我编程偏好的信息？”

Recall 会并行运行四种检索策略：语义检索、关键词匹配（BM25）、图遍历和时间筛选，然后使用交叉编码器对结果重排序。这正是它优于简单向量检索的原因。

**Reflect（反思）** — 综合生成见解：

Reflect 比 Recall 更深入。它不会只返回原始事实，而是使用 LLM 综合推理你的记忆：

> “根据你对我的了解，你会为我的下一个业余项目推荐什么技术栈？”

这适用于需要关联多条记忆的问题。

**心智模型** — 持续更新的文档：

添加新记忆后，心智模型会自动保持最新。可以把它们看作预先计算、会自行刷新的反思结果：

> “创建一个名为‘我的技术栈’的心智模型，跟踪我使用的语言、框架和工具。”

你可以列出、检索、更新和删除心智模型。它们有助于持续掌握某个主题的最新情况，无需每次都完整运行一次 `reflect`。

---

## 记忆库 {#memory-banks}

URL 路径决定你使用哪个记忆库。在上面的示例中，`/mcp/your_bank_id/` 会将所有操作限定在该记忆库内。

各记忆库彼此隔离，可以把每个记忆库想成一个独立的大脑。你可以针对不同场景分别运行记忆库：

- `my-project`：用于特定项目
- `team-knowledge`：用于团队共享信息
- 在多智能体系统中，为每位用户设置一个记忆库

记忆库会在首次使用时自动创建。要使用另一个记忆库，只需更改 URL 路径：

```
http://localhost:8888/mcp/project-x/
```

如果希望智能体在同一个会话中管理多个记忆库，请改为连接 `/mcp/` 处的多记忆库端点。该端点会将 `bank_id` 添加为每个工具的参数，并提供额外的记忆库管理工具，例如 `list_banks`、`create_bank` 和 `get_bank_stats`。

---

## 常见陷阱与边缘情况 {#pitfalls--edge-cases}

### 记忆处理是异步的 {#memory-processing-is-async}

智能体调用 `retain` 后，事实提取和索引会在后台进行。如果存入信息后立刻尝试召回，它可能还不可用。对于复杂记忆，请等待几秒钟。

### Recall 的 token 限制 {#token-limits-on-recall}

默认情况下，`recall` 最多返回 4096 个 token 的记忆内容。对于历史记录很多的记忆库，响应中可能会截去一些较旧或相关性较低的记忆。这是有意设计的，目的是让上下文窗口保持在可管理的范围内。

### 心智模型创建同样是异步的 {#mental-model-creation-is-async-too}

创建或刷新心智模型时，由 LLM 驱动的生成过程会在后台运行。首次调用会返回一个 `operation_id`。内容通常会在几秒钟后可用，具体取决于需要综合多少记忆。

### LLM 密钥供 Hindsight 使用，而非供智能体使用 {#llm-key-is-for-hindsight-not-your-agent}

Hindsight 在内部使用 `HINDSIGHT_API_LLM_API_KEY` 进行事实提取、实体解析和 Reflect 操作。它与智能体所使用的 LLM 相互独立。这里可以使用便宜、快速的模型（例如 Gemini Flash、Groq 等），不必与为智能体提供能力的模型相同。

---

## Hindsight 适用的场景 {#when-hindsight-works-well}

- 你需要结构化记忆，而不只是对话日志上的向量检索
- 你需要让记忆跨会话、客户端和智能体发挥作用
- 你希望开箱即用地获得实体解析、时间感知和多策略检索
- 你正在构建会随着时间积累知识的智能体

---

## 回顾 {#recap}

Hindsight 为任意兼容 MCP 的智能体提供持久的长期记忆。一条 Docker 命令即可启动，几行 JSON 即可连接。

关键在于，记忆不只是存储和检索。Hindsight 会从原始输入中提取结构化事实、关联实体、追踪时间信息，并通过交叉编码器重排序呈现最相关的记忆。这使它有别于把对话日志塞进向量数据库的做法。

MCP 工具覆盖记忆的完整生命周期：用 `retain` 存入记忆，用 `recall` 通过多种策略检索，用 `reflect` 综合生成见解，用心智模型工具维护自动更新的文档，还可以使用实用工具浏览和管理记忆、文档及标签。

> **想要托管服务？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 会为你运行完整堆栈，无需 Docker，也无需自行管理基础设施。注册、获取 API 密钥，然后通过 HTTPS 连接。

---

## 后续步骤 {#next-steps}

- **积累记忆**：像平常一样开始使用智能体。告诉它你的偏好、项目背景和决策，它会存入重要信息。
- **探索心智模型**：创建会随着记忆增长而自动更新的文档。试试：`"创建一个总结项目架构的心智模型。"`
- **尝试多记忆库配置**：为不同项目或智能体分别运行记忆库。连接 `/mcp/` 以使用多记忆库模式。
- **直接使用 SDK**：除了 MCP，Hindsight 还提供 [Python](https://pypi.org/project/hindsight-client/) 和 [TypeScript](https://www.npmjs.com/package/@vectorize-io/hindsight-client) SDK，可将记忆集成到你自己的应用中。
- **查看文档**：完整 API 参考、SDK 指南及更多内容请见 [hindsight.vectorize.io](/)。
