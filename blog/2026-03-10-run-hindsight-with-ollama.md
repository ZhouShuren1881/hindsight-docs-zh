---
title: "使用Ollama运行Hindsight：本地AI记忆，无需API密钥"
authors: [hindsight]
date: 2026-03-10T12:00
tags: [ollama, tutorial, python, memory, local, privacy, hindsight, llm, open-source]
image: /img/blog/run-hindsight-with-ollama.webp
hide_table_of_contents: true
---

运行 Hindsight 和 Ollama 将为您提供完全本地的 AI 记忆系统。没有API密钥，没有云成本，没有数据离开您的机器。如果您希望在自己的硬件上获得由开源模型支持的持久智能体记忆，本教程将引导您完成完整的设置。

<!-- truncate -->

## 概览 {#tldr}

- 完全在您的计算机上运行 Hindsight 和 Ollama，无需 API 密钥，无需云，无需任何成本
- Ollama 提供LLM。 Hindsight 提供记忆引擎。两个环境变量将它们连接起来。
- `retain` 和 `recall` 与本地模型配合得很好
- `reflect` 需要支持工具调用的模型（并非所有本地模型都支持）
- 预计推理速度比云 API 慢，但您可以获得完全的隐私和零每个token成本

---

## 问题：云法学硕士拥有您的智能体记忆 {#the-problem-cloud-llms-own-your-agent-memory}

您想要为您的AI智能体提供持久的记忆。 Hindsight 处理：事实提取、知识图、语义搜索、合成。

但它需要一个LLM。

默认设置将您的数据发送到OpenAI。那行得通。但是：

- 每个记忆存储调用都通过LLM提取事实。这就是每个记忆的 API 成本。
- 每一次 `reflect` 调用都会运行多步推理。更多token，更多成本。
- 您的用户的记忆通过第三方API传输。
- 您需要一个API密钥，这意味着帐户设置、计费、费率限制。

对于开发、原型设计或隐私敏感的部署，您希望一切都在本地。

[Ollama](https://ollama.com/) 给你这个。在您的硬件上运行的开源模型。没有账户，没有密钥，没有网络调用。

使用Ollama运行Hindsight将生产级记忆引擎连接到本地LLM。本教程向您展示如何操作。

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

相同Hindsight记忆引擎。相同API。只需将 LLM 提供商从 `openai` 交换到 `ollama` 即可。其他一切，包括知识图谱、语义搜索和事实提取，都保持不变。

---

## 逐步设置Hindsight和Ollama {#setting-up-hindsight-with-ollama-step-by-step}

完整设置大约需要十分钟。您将安装Ollama，拉取模型，安装Hindsight，并将它们与两个环境变量连接。

### 第1步：安装Ollama {#step-1-install-ollama}

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

拉模型：

```bash
ollama pull gpt-oss:20b
```

> **注意：** OpenAI 的 `gpt-oss:20b` 是一个开放重量模型，其性能远超其尺寸——它在推理方面可与更大的模型相媲美，并支持开箱即用的工具调用。它需要 ~16GB RAM。对于完整的 `gpt-oss:120b` （接近 o4-mini 质量），您需要 ~80GB，但 20b 变体可以在大多数开发机器上轻松运行。

验证它正在运行：

```bash
ollama list
```

您应该在输出中看到`gpt-oss:20b`。

### 第2步：安装Hindsight {#step-2-install-hindsight}

```bash
pip install hindsight-all
```

这包括：

- 嵌入式Postgres（无数据库设置）
- 事实提取引擎
- 带有本地嵌入的语义搜索
- 知识图谱
- 合成引擎

无需外部基础设施。这与[OpenAI记忆教程](/blog/2026/03/05/add-memory-to-openai-application)和[CrewAI集成](/blog/2026/03/02/crewai)中使用的包相同，只是指向本地LLM而不是云API。

### 第3步：从Ollama开始Hindsight {#step-3-start-hindsight-with-ollama}

两个环境变量：

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

就是这样。 Hindsight 在 `localhost:11434` 检测到 Ollama 并使用 `gpt-oss:20b` 进行事实提取。

> **注意：** `LLM_MAX_CONCURRENT=1` 防止机器过载。本地模型一次运行一个请求；并行 LLM 调用排队并竞争 RAM/GPU。云 API 在其端处理并发性，但本地模型则不然。

> **注意：**`ENABLE_OBSERVATIONS=false`禁用观察（心智模型）。 观察运行后台LLM在每个记忆存储之后调用，以将事实合并为更高级别的见解。对于云 API，这是快速且有用的，但对于本地模型，它会显著增加每个记忆存储的推理时间。开始使用 Ollama 时禁用它们。调整设置后，您可以稍后重新启用观察。

你应该看到：

```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8888
```

### 第四步：创建记忆库并存储记忆 {#step-4-create-a-bank-and-store-memories}

安装客户端：

```bash
pip install hindsight-client
```

创建一个记忆库：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

hindsight.create_bank(
    bank_id="local-agent",
    name="本地智能体记忆",
    reflect_mission="记住用户偏好、事实和对话历史记录。",
)
```

存储记忆：

```python
hindsight.retain(
    bank_id="local-agent",
    content="用户：我叫 Alice，是波特兰的软件工程师，喜欢 Python 和函数式编程。\n助手：很高兴认识你，Alice！",
)
```

Ollama 从本地提取事实。没有数据离开您的机器。 Hindsight 解析对话，识别“Alice”和“Portland”等实体，提取“Alice 是软件工程师”等关系，并将它们存储在知识图中。所有这一切都是通过在本地硬件上运行的 Ollama 来实现的。

> **问题：** 使用本地模型进行事实提取比云 API 慢。在 Apple Silicon 上，每次记忆存储调用预计需要 15-20 秒，在纯 CPU 机器上则需要更长的时间。默认情况下，`retain()` 会阻塞，直到提取完成 - 您的代码会在 Ollama 处理内容时等待。如果您需要非阻塞摄取，请将 `async_=True` 传递给 `retain()`，调用会立即返回，同时提取在后台进行。

### 第五步：记忆召回 {#step-5-recall-memories}

```python
memories = hindsight.recall(
    bank_id="local-agent",
    query="Alice 喜欢什么编程语言？",
    budget="low",
)

for memory in memories.results:
    print(memory.text)
```

记忆召回默认使用本地嵌入，因此基本语义搜索不需要LLM调用。即使在中等硬件上运行 Hindsight 和 Ollama ，这也使得记忆恢复速度更快。如果您想将其连接到[MCP兼容AI客户端](/blog/2026/03/04/mcp-agent-memory)，记忆召回结果的工作方式相同。

### 第6步：反思（注意事项） {#step-6-reflect-with-a-caveat}

```python
reflection = hindsight.reflect(
    bank_id="local-agent",
    query="你对爱丽丝了解多少？",
)

print(reflection.text)
```

​​反思是Hindsight中LLM最密集的操作。它遍历知识图，识别相关记忆，并运行多步推理来合成连贯的答案。这使得 Hindsight 不仅仅是一个简单的向量存储； 推测产生的答案结合了多个记忆中的信息。

一个重要提示：**反思需要工具/函数调用**，并非所有本地型号都支持。 `gpt-oss:20b` 支持工具调用，因此开箱即用。如果您使用不同的模型（例如 Gemma 3），则可能会超时或返回错误。检查[Ollama的模型库](https://ollama.com/library)是否有支持工具调用的模型。

---

## 完整 Hindsight 与 Ollama 示例 {#full-hindsight-with-ollama-example}

另存为 `local_memory.py` 以使用 Ollama 工作流程测试完整的 Hindsight：

```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url="http://localhost:8888")

#创建记忆库（幂等，安全重复运行）
hindsight.create_bank(
    bank_id="local-agent",
    name="本地智能体记忆",
    reflect_mission="记住用户偏好和重要事实。",
)

#存储一些记忆（每个记忆存储调用都会阻塞，而Ollama提取事实）
print("保留记忆...")
hindsight.retain(
    bank_id="local-agent",
    content="用户：我是 Alice，Acme Corp 的实验室工程师。我主要使用 Python 和 Go 工作。",
)
print("保留第一个记忆。")
hindsight.retain(
    bank_id="local-agent",
    content="用户：我更喜欢深色模式、vim 键绑定和制表符而不是空格。",
)
print("保留第二记忆。")

# Recall
print("\n正在召回：'Alice 做什么工作？'")
memories = hindsight.recall(
    bank_id="local-agent",
    query="爱丽丝做什么工作？",
    budget="low",
)

for r in memories.results:
    print(f"  → {r.text}")

print("\n完成，全部处理均在本地进行。")
```

运行：

```bash
python local_memory.py
```

---

## Hindsight 与 Ollama：陷阱和边缘情况 {#hindsight-with-ollama-pitfalls-and-edge-cases}

**1。第一次请求很慢。** Ollama 在第一次推理调用时将模型加载到记忆中。这可能需要 10-30 秒。后续调用速度更快。

**2。并发请求将排队。** 设置`HINDSIGHT_API_LLM_MAX_CONCURRENT=1`。本地模型无法像云 API 那样并行化。多个并发记忆存储调用将按顺序排队和处理。

**3。并非所有型号都支持工具调用。** 反思需要它。 `gpt-oss:20b` 支持开箱即用的工具调用。如果你换成不同的型号（比如 Gemma 3），反思就不起作用了。

**4。记忆很重要。** `gpt-oss:20b` 需要 ~16GB RAM。添加 Hindsight 的嵌入式 Postgres 和本地嵌入，您总共需要 24GB 以上。对于完整的 `gpt-oss:120b`，您需要 ~80GB（专用 GPU）。在受限硬件上使用较小的模型。

**5。模型质量各不相同。** 局部模型产生的事实提取不如 GPT-4o 或 Claude 精确。您可能会看到更多遗漏的事实或不太准确的实体解析。对于生产工作负载，云 API 仍然以质量取胜。

​​**6。全新的 Linux 安装可能需要 `zstd`。** Ollama 安装程序需要它来提取。如果遇到错误，请先运行 `sudo apt-get install zstd` (Debian/Ubuntu) 或 `sudo dnf install zstd` (RHEL/Fedora)。

---

## 本地 Ollama 与云 LLM 的智能体记忆 {#local-ollama-vs-cloud-llms-for-agent-memory}

||Ollama（本地）|OpenAI / Anthropic（云）|
|---|---|---|
|**成本**|硬件后免费|每个token定价|
|**隐私**|完整，没有任何东西离开你的机器|数据中转第三方API|
|**速度**|每个记忆存储 15-20 秒（Apple Silicon）|每个记忆存储 1-3 秒|
|**品质**|适合 12b+ 型号|最佳可用|
|**工具调用**|取决于型号|完全支持|
|**反思**|需要特定型号|与所有提供商合作|
|**设置**|Ollama 安装 + 模型拉取|API 键|
|**并发**|受硬件限制|云规模|

**在以下情况下使用本地：** 开发、原型设计、在隔离环境中运行、处理敏感数据或避免每个token的成本。

**在以下情况下使用云：** 您需要速度、最高质量、工具调用可靠性或生产规模的并发性。

您还可以混合使用这两种方法：使用Hindsight和Ollama进行本地开发，然后使用OpenAI或Anthropic部署到生产环境。相同的HindsightAPI，相同的代码，只需更改环境变量。许多团队使用这种模式来将开发成本保持为零，同时获得最佳的生产质量。

---

## 覆盖 Hindsight Ollama 默认值 {#override-hindsight-ollama-defaults}

Hindsight 与 Ollama 一起运行时会选择合理默认值，但所有设置都可以覆盖：

```bash
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:120b       #从20b升级
export HINDSIGHT_API_LLM_BASE_URL=http://192.168.1.50:11434/v1  #遥控器Ollama
export HINDSIGHT_API_LLM_MAX_CONCURRENT=2         #如果你的 GPU 可以处理的话
export HINDSIGHT_API_ENABLE_OBSERVATIONS=true      #调整后重新启用
```

这也意味着您可以在不同的机器（例如 GPU 服务器）上运行 Ollama 并通过网络将 Hindsight 指向它。对于需要本地隐私但需要更好性能的团队来说，这是一种常见模式：在网络中的专用 GPU 盒上运行 Ollama，并在应用程序服务器上运行 Hindsight。

---

## 回顾：与 Ollama 一起运行 Hindsight {#recap-running-hindsight-with-ollama}

使用Ollama运行Hindsight需要两个环境变量和大约十分钟的设置。连接后，您将获得与云版本提供的相同的记忆引擎、相同的知识图和相同的记忆存储/记忆感知/映射API，所有这些都在您自己的硬件上运行。

要记住的要点：

- `HINDSIGHT_API_LLM_PROVIDER=ollama`是您唯一需要的开关
- `retain`、`recall`和`reflect`都可以与`gpt-oss:20b`一起使用——包括工具调用
- 为了获得更好的质量，`gpt-oss:120b`可与OpenAIo4-mini竞争，但需要约80GB RAM
- 本地推理比云 API 慢，但您可以获得完全的隐私和零每个token成本
- 相同的代码适用于本地或云提供商，因此您可以通过更改环境变量进行交换

对于需要数据隐私、气隙部署或零成本开发环境的团队来说，Hindsight和Ollama是在本地运行持久智能体记忆的最快方法。

---

## 后续步骤 {#next-steps}

- **尝试完整模型** -- `gpt-oss:120b` 接近 o4-mini 质量（需要 ~80GB RAM / 专用 GPU）
- **在 GPU 服务器上运行 Ollama** -- 将 `LLM_BASE_URL` 指向远程计算机以加快推理速度
- **添加OpenAI聊天机器人循环**——将其与 [OpenAI记忆教程](/blog/2026/03/05/add-memory-to-openai-application) 结合起来，形成一个完全本地化的聊天机器人
- **尝试MCP集成** -- 连接 Hindsight 到 [Claude、Cursor，或通过 MCP 的 VS Code](/blog/2026/03/04/mcp-agent-memory)
- **按LiteLLM缩放**——通过单个接口使用[100+模型提供商](/blog/2026/03/03/litellm)
- **在 Web UI 中检查记忆**——在`localhost:9999`运行控制平面来浏览提取的事实
- **使用云进行生产** -- 准备好后切换到 `HINDSIGHT_API_LLM_PROVIDER=openai`

本地记忆才是真正的记忆。它只在您的硬件上运行。
