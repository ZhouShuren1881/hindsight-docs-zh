---
title: "使用 Ollama 运行 Hindsight：本地 AI 记忆，无需 API 密钥"
authors: [hindsight]
date: 2026-03-10T12:00
tags: [ollama, tutorial, python, memory, local, privacy, hindsight, llm, open-source]
image: /img/blog/run-hindsight-with-ollama.webp
hide_table_of_contents: true
---

使用 Ollama 运行 Hindsight，可以获得完全在本地运行的 AI 记忆系统。无需 API 密钥、无需承担云端费用，也不会有数据离开你的设备。如果你想在自己的硬件上使用开源模型为智能体提供持久记忆，本教程将带你完成整个设置过程。

<!-- truncate -->

## 概览 {#tldr}

- 在自己的设备上运行 Hindsight 和 Ollama，无需 API 密钥、云服务或费用
- Ollama 提供 LLM，Hindsight 提供记忆引擎。通过两个环境变量即可将它们连接起来。
- `retain` 和 `recall` 与本地模型配合良好
- `reflect` 需要支持工具调用的模型（并非所有本地模型都支持）
- 推理速度预计会比云 API 慢，但你可以获得完整的隐私保护，而且无需按 token 付费

---

## 问题：云端 LLM 掌握着智能体的记忆 {#the-problem-cloud-llms-own-your-agent-memory}

你希望为 AI 智能体提供持久记忆。Hindsight 可以处理事实提取、知识图谱、语义检索和综合生成。

但它需要 LLM。

默认设置会把数据发送给 OpenAI。这种方式可行，但也有以下问题：

- 每次 `retain` 调用都会通过 LLM 提取事实，因此每条记忆都会产生 API 费用。
- 每次 `reflect` 调用都会执行多步推理，需要更多 token，也会增加费用。
- 用户的记忆会经由第三方 API 传输。
- 你需要 API 密钥，这意味着要设置账户、配置账单并面对速率限制。

在开发、原型设计或对隐私敏感的部署中，你会希望所有内容都在本地处理。

[Ollama](https://ollama.com/) 可以满足这一需求：它让开源模型在你的硬件上运行，无需账户、密钥或网络调用。

将 Hindsight 与 Ollama 结合，可以把生产级记忆引擎连接到本地 LLM。本教程将说明具体做法。

---

## Hindsight 与 Ollama 的工作原理 {#how-hindsight-with-ollama-works}

```
User input
     ↓
retain(content)     → Ollama extracts facts locally
     ↓
recall(query)       → Semantic search + Ollama reranking
     ↓
reflect(query)      → Ollama reasons over the knowledge graph
     ↓
Response
```

Hindsight 记忆引擎和 API 都保持不变，只需将 LLM 服务提供方从 `openai` 换成 `ollama`。知识图谱、语义检索和事实提取等其他部分也都保持不变。

---

## 一步步设置 Hindsight 与 Ollama {#setting-up-hindsight-with-ollama-step-by-step}

整个设置过程大约需要十分钟。你将安装 Ollama、拉取模型、安装 Hindsight，再通过两个环境变量将它们连接起来。

### 第 1 步：安装 Ollama {#step-1-install-ollama}

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

拉取模型：

```bash
ollama pull gpt-oss:20b
```

> **注意：** OpenAI 的 `gpt-oss:20b` 是一个开放权重模型，性能远超其参数规模：在推理方面可与大得多的模型媲美，并且开箱即支持工具调用。它需要约 16GB RAM。完整的 `gpt-oss:120b` 接近 o4-mini 的质量，需要约 80GB；而 20b 版本在大多数开发者的机器上都能轻松运行。

验证模型正在运行：

```bash
ollama list
```

你应该能在输出中看到 `gpt-oss:20b`。

### 第 2 步：安装 Hindsight {#step-2-install-hindsight}

```bash
pip install hindsight-all
```

该软件包包含：

- 嵌入式 Postgres（无需配置数据库）
- 事实提取引擎
- 使用本地嵌入向量的语义检索
- 知识图谱
- 综合生成引擎

无需外部基础设施。这里使用的正是 [OpenAI 记忆教程](/blog/2026/03/05/add-memory-to-openai-application)和 [CrewAI 集成](/blog/2026/03/02/crewai)中的同一个软件包，只是将它指向本地 LLM，而非云 API。

### 第 3 步：启动连接到 Ollama 的 Hindsight {#step-3-start-hindsight-with-ollama}

设置以下环境变量：

```bash
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:20b
export HINDSIGHT_API_LLM_MAX_CONCURRENT=1
export HINDSIGHT_API_ENABLE_OBSERVATIONS=false
```

启动服务器：

```bash
hindsight-api
```

完成。Hindsight 会在 `localhost:11434` 检测到 Ollama，并使用 `gpt-oss:20b` 提取事实。

> **注意：** `LLM_MAX_CONCURRENT=1` 可以避免机器过载。本地模型一次处理一个请求；并行的 LLM 调用会排队，并争用 RAM/GPU。云 API 会在服务端处理并发，而本地模型则需要你的硬件承担这些工作。

> **注意：** `ENABLE_OBSERVATIONS=false` 会禁用观测（心智模型）。每次存入记忆后，观测都会在后台调用 LLM，将事实整合为更高层次的认知。使用云 API 时，这个过程既快又有用；使用本地模型时，它会显著增加每次存入操作的推理时间。刚开始使用 Ollama 时，可以先禁用观测；设置调试妥当后，再重新启用。

你应该能看到：

```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8888
```

### 第 4 步：创建记忆库并存入记忆 {#step-4-create-a-bank-and-store-memories}

安装客户端：

```bash
pip install hindsight-client
```

创建记忆库：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="local-agent",
    name="Local Agent Memory",
    reflect_mission="Remember user preferences, facts, and conversation history.",
)
```

存入一条记忆：

```python
hindsight.retain(
    bank_id="local-agent",
    content="User: My name is Alice and I'm a software engineer in Portland. I prefer Python and functional programming patterns.\nAssistant: Nice to meet you, Alice!",
)
```

Ollama 会在本地提取事实。数据不会离开你的设备。Hindsight 会解析对话，识别 “Alice” 和 “Portland” 等实体，提取 “Alice is a software engineer” 这样的关系，并将它们存入知识图谱。整个过程都由运行在本地硬件上的 Ollama 完成。

> **注意：** 本地模型的事实提取速度比云 API 慢。在 Apple Silicon 上，每次 `retain` 调用预计需要 15–20 秒；仅使用 CPU 的机器则会更久。默认情况下，`retain()` 会一直阻塞到提取完成，也就是说，Ollama 处理内容时，你的代码会等待。如果需要非阻塞摄取，可以向 `retain()` 传入 `async_=True`；调用会立即返回，提取工作则在后台继续进行。

### 第 5 步：召回记忆 {#step-5-recall-memories}

```python
memories = hindsight.recall(
    bank_id="local-agent",
    query="What programming languages does Alice prefer?",
    budget="low",
)

for memory in memories.results:
    print(memory.text)
```

Recall 默认使用本地嵌入向量，因此基础语义检索无需调用 LLM。即使在配置普通的硬件上使用 Hindsight 与 Ollama，召回也会很快。如果想将它连接到[兼容 MCP 的 AI 客户端](/blog/2026/03/04/mcp-agent-memory)，召回结果的处理方式也相同。

### 第 6 步：Reflect（有一点需要注意） {#step-6-reflect-with-a-caveat}

```python
reflection = hindsight.reflect(
    bank_id="local-agent",
    query="What do you know about Alice?",
)

print(reflection.text)
```

Reflect 是 Hindsight 中最消耗 LLM 资源的操作。它会遍历知识图谱、识别相关记忆，并执行多步推理来综合生成连贯的答案。这让 Hindsight 不只是简单的向量存储；Reflect 生成的答案可以综合多条记忆中的信息。

有一点需要特别注意：**Reflect 需要模型支持工具/函数调用**，但并非所有本地模型都支持这一功能。`gpt-oss:20b` 支持工具调用，因此开箱即用。如果使用其他模型（例如 Gemma 3），Reflect 可能会超时或返回错误。请查看 [Ollama 的模型库](https://ollama.com/library)，了解哪些模型支持工具调用。

---

## Hindsight 与 Ollama 完整示例 {#full-hindsight-with-ollama-example}

将以下代码保存为 `local_memory.py`，即可测试完整的 Hindsight 与 Ollama 工作流程：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

# 创建记忆库（幂等，可安全重复运行）
hindsight.create_bank(
    bank_id="local-agent",
    name="Local Agent Memory",
    reflect_mission="Remember user preferences and important facts.",
)

# 存入一些记忆（每次 retain 调用都会等待 Ollama 完成事实提取）
print("Retaining memories...")
hindsight.retain(
    bank_id="local-agent",
    content="User: I'm Alice, a backend engineer at Acme Corp. I work mostly in Python and Go.",
)
print("First memory retained.")
hindsight.retain(
    bank_id="local-agent",
    content="User: I prefer dark mode, vim keybindings, and tabs over spaces.",
)
print("Second memory retained.")

# 召回
print("\nRecalling: 'What does Alice do for work?'")
memories = hindsight.recall(
    bank_id="local-agent",
    query="What does Alice do for work?",
    budget="low",
)

for r in memories.results:
    print(f"  → {r.text}")

print("\nDone. All processing happened locally.")
```

运行：

```bash
python local_memory.py
```

---

## Hindsight 与 Ollama：注意事项和边缘情况 {#hindsight-with-ollama-pitfalls-and-edge-cases}

**1. 首次请求较慢。** Ollama 会在第一次推理调用时将模型加载到内存中，这可能需要 10–30 秒。后续调用会更快。

**2. 并发请求会排队。** 将 `HINDSIGHT_API_LLM_MAX_CONCURRENT=1` 设为 1。本地模型无法像云 API 那样并行处理请求。多个并发的 `retain` 调用会排队，并按顺序处理。

**3. 并非所有模型都支持工具调用。** Reflect 需要工具调用。`gpt-oss:20b` 开箱即支持工具调用。如果换用其他模型（例如 Gemma 3），Reflect 将无法工作。

**4. RAM 容量很重要。** `gpt-oss:20b` 需要约 16GB RAM。加上 Hindsight 的嵌入式 Postgres 和本地嵌入向量，总共需要 24GB 以上。完整的 `gpt-oss:120b` 需要约 80GB（专用 GPU）。硬件资源有限时，请使用更小的模型。

**5. 模型质量各不相同。** 本地模型提取事实的准确度低于 GPT-4o 或 Claude。你可能会遇到更多遗漏事实或较不准确的实体消歧。对于生产工作负载，云 API 的质量仍然更高。

**6. 新安装的 Linux 系统可能需要安装 `zstd`。** Ollama 安装程序需要用它解压文件。如果遇到错误，请先运行 `sudo apt-get install zstd`（Debian/Ubuntu）或 `sudo dnf install zstd`（RHEL/Fedora）。

---

## 使用 Ollama 本地模型或云端 LLM 为智能体提供记忆 {#local-ollama-vs-cloud-llms-for-agent-memory}

| | Ollama（本地） | OpenAI / Anthropic（云端） |
|---|---|---|
| **费用** | 硬件投入后免费 | 按 token 计费 |
| **隐私** | 完整，数据不会离开你的设备 | 数据经由第三方 API 传输 |
| **速度** | 每次 `retain` 需 15–20 秒（Apple Silicon） | 每次 `retain` 需 1–3 秒 |
| **质量** | 12b 及以上模型表现良好 | 当前可用模型中最佳 |
| **工具调用** | 取决于模型 | 完全支持 |
| **Reflect** | 需要特定模型 | 所有服务提供方均可使用 |
| **设置** | 安装 Ollama 并拉取模型 | API 密钥 |
| **并发** | 受硬件限制 | 由云端扩展支持 |

**适合使用本地模型的情况：** 开发、原型设计、在断网隔离环境中运行、处理敏感数据，或避免按 token 付费。

**适合使用云端模型的情况：** 需要更快速度、最高质量、可靠的工具调用能力，或面向生产规模的并发处理。

你也可以混合使用这两种方式：开发时在本地使用 Hindsight 和 Ollama，再通过 OpenAI 或 Anthropic 部署到生产环境。Hindsight API 和代码都相同，只需更改环境变量即可。许多团队采用这种方式，让开发成本保持为零，同时在生产环境中获得最佳质量。

---

## 覆盖 Hindsight 的 Ollama 默认设置 {#override-hindsight-ollama-defaults}

Hindsight 使用 Ollama 运行时会采用合适的默认设置，但你可以覆盖所有设置：

```bash
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:120b       # 从 20b 升级
export HINDSIGHT_API_LLM_BASE_URL=http://192.168.1.50:11434/v1  # 远程 Ollama
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2         # 如果 GPU 能够处理
export HINDSIGHT_API_ENABLE_OBSERVATIONS=true      # 调整妥当后重新启用
```

这也意味着你可以在另一台机器（例如 GPU 服务器）上运行 Ollama，再通过网络让 Hindsight 连接到它。需要本地隐私和更高性能的团队常用这种模式：在网络中的专用 GPU 服务器上运行 Ollama，在应用服务器上运行 Hindsight。

---

## 回顾：使用 Ollama 运行 Hindsight {#recap-running-hindsight-with-ollama}

使用 Ollama 运行 Hindsight，只需设置两个环境变量，整个过程大约需要十分钟。连接完成后，你就能在自己的硬件上使用与云端版本相同的记忆引擎、知识图谱，以及 `retain`、`recall`、`reflect` API。

要点如下：

- `HINDSIGHT_API_LLM_PROVIDER=ollama` 是唯一需要的切换项。
- `retain`、`recall` 和 `reflect` 都可以与 `gpt-oss:20b` 配合使用，包括工具调用。
- 如需更高质量，可使用 `gpt-oss:120b`；其质量接近 OpenAI o4-mini，但需要约 80GB RAM。
- 本地推理比云 API 慢，但可以提供完整的隐私保护，而且无需按 token 付费。
- 相同的代码既适用于本地服务提供方，也适用于云端服务提供方；更改环境变量即可切换。

对于需要保护数据隐私、在气隙环境中部署或打造零成本开发环境的团队，使用 Ollama 运行 Hindsight 是在本地启动持久智能体记忆最快捷的方式。

---

## 后续步骤 {#next-steps}

- **尝试完整模型**：使用接近 o4-mini 质量的 `gpt-oss:120b`（需要约 80GB RAM 或专用 GPU）
- **在 GPU 服务器上运行 Ollama**：将 `LLM_BASE_URL` 指向远程机器，以加快推理速度
- **添加 OpenAI 聊天机器人循环**：结合[OpenAI 记忆教程](/blog/2026/03/05/add-memory-to-openai-application)，构建完全本地运行的聊天机器人
- **尝试 MCP 集成**：通过 MCP 将 Hindsight 连接到 [Claude、Cursor 或 VS Code](/blog/2026/03/04/mcp-agent-memory)
- **通过 LiteLLM 扩展**：通过单一接口使用 [100 多个模型服务提供方](/blog/2026/03/03/litellm)
- **在 Web UI 中查看记忆**：在 `localhost:9999` 启动控制台，浏览提取出的事实
- **使用云端服务进入生产环境**：准备就绪后，将 `HINDSIGHT_API_LLM_PROVIDER` 切换为 `openai`

本地记忆就是真正的记忆，只不过运行在你的硬件上。

---
