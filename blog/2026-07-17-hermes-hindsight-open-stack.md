---
title: "完全开放的智能体记忆堆栈：自托管Hermes + Hindsight"
authors: [benfrank241]
slug: "2026/07/17/hermes-hindsight-open-stack"
date: 2026-07-17T12:00
tags: [hindsight, hermes, agent-memory, open-source, self-hosted, persistent-memory, tutorial]
description: "大多数智能体加记忆堆栈都有一个封闭的核心：前沿API模型，专有的记忆服务，或两者兼而有之。 Hermes 和 Hindsight 是例外。每一层都是开源的，可以在您自己的硬件上运行，无需外部调用。"
image: /img/blog/hermes-hindsight-open-stack.webp
hide_table_of_contents: true
---

![完全开放的智能体记忆堆栈：开放权重模型、开放智能体和开放记忆，全部自托管](/img/blog/hermes-hindsight-open-stack.webp)

大多数“AI具有长期记忆能力的智能体”设置至少有一个部分是你无法自己掌控的。该模型是付费墙后面的前沿API，或者记忆是一种专有服务，将您的智能体的历史存储在其他人的服务器上，或者两者兼而有之。您可以将包装器代码移至您的基础设施中，但实际查看所有数据的两件事（模型和记忆）仍保留在云中。

Hermes 加上 Hindsight 是例外。模型权重开放，智能体开源，记忆系统开源。每个层都可以在您自己的硬件上运行，并且在默认配置中，记忆层根本不进行外部网络调用。这篇文章是该主张的有根据的、逐层版本：什么是真正开放的，在哪个许可证下，以及这些部分如何连接在一起形成您完全拥有的堆栈。

<!-- truncate -->

## 概览 {#tldr}

- **型号：** 您可以使用 Ollama、vLLM 或 llama.cpp 在本地提供的任何开放权重模型。我们推荐`gpt-oss-20b`、OpenAI的Apache-2.0开放模型：128K上下文，原生工具调用，约13GB，是我们自己的记忆存储排行榜上的顶级模型。
- **智能体：** [Hermes智能体](https://github.com/NousResearch/hermes-agent) 是 MIT 许可的且与模型无关。它与任何 OpenAI 兼容端点通信，因此无需更改代码即可驱动您的本地模型。
- **记忆：** [Hindsight](https://vectorize.io/hindsight) 已获得 MIT 许可。使用 Docker 或 pip 自行托管。嵌入和重排序默认在本地运行，并且相同的本地模型可以进行提取，因此自托管服务器不需要外部调用，也不需要API密钥。
- **适合笔记本电脑：** 整个堆栈在 M3 Max (36 GB) 上运行。在我的测试中，记忆存储大约需要 8 秒，而记忆召回则不到一秒。下面的数字。
- **诚实的警告：**模型需要至少64K上下文（提高Ollama的默认值），自动记忆召回/记忆存储需要最近的Hermes智能体构建，并且自托管开放模型在最困难的任务上将无法与前沿API模型相匹配。详细信息如下。

## 为什么“全面开放”很少见 {#why-fully-open-is-rare}

智能体记忆是堆栈中包含最敏感数据的部分。它是您的智能体所看到的一切的持久记录：对话、决策、代码、客户详细信息。这正是您最不想交给无法检查或托管的第三方服务的数据。

普通堆栈确实会交出它。封闭模型意味着每个提示（包括注入其中的记忆）都会发送到外部API。专有的记忆服务意味着您的智能体的整个历史都存在于其他人的数据库中。 “开放”通常意味着只有粘合代码是开放的，而模型和记忆这两个可以看到一切的组件则不是开放的。

完全开放的堆栈弥补了这两个差距。这是三层。

## 第 1 层：模型（开放权重，您的选择） {#layer-1-the-model-open-weights-your-choice}

由于第 2 层中的智能体与模型无关，因此模型是您可以选择的该堆栈的一部分。唯一的硬性要求是它是开放权重的（这样你就可以自己运行它），至少有 64K 的上下文，并且支持工具调用，因为记忆操作是工具调用。

我们推荐的是**`gpt-oss-20b`**、OpenAI的开放重量模型。它是一个很好的默认值，具体原因如下：Apache 2.0 许可证、128K 上下文窗口、本机函数调用，并且足够小，可以在笔记本电脑上舒适地运行（4 位 Ollama 版本中大约 13 GB）。碰巧的是，它也是 Hindsight 自己的记忆存储排行榜上排名最高的模型，这对于下面的第 3 层很重要。

关于“只抓时髦模特”本能的一句话，因为它隐藏着一个陷阱。以一个听起来很小的 Kimi 模型为例。当前真正发布的 Kimi 版本是任何笔记本电脑都无法容纳的超过 1 万亿个参数的专家混合模型。 Kimi-Linear-48B-A3B 看起来很小，宣传 3B“活动”参数，但您仍然必须保留所有 48B 权重：它的 4 位构建大约为 28 到 30 GB 磁盘，需要大约那么多 RAM，这在 36 GB 机器上没有为记忆系统留下空间，而且它的工具调用支持没有记录。活动参数并不是决定模型是否拟合的数字。总重量为。

如果您想要比 gpt-oss-20b 更多的空间，Qwen3-Coder-30B-A3B（大约 19 GB、256K 上下文、Apache 2.0、本机工具）是一个强大的升级，仍然适合 36 GB 机器。如果您想要来自构建智能体的同一团队的模型，Nous Research 也发布了开放权重 Hermes 系列。但对于可以正常工作的本地堆栈，gpt-oss-20b 是最佳选择。

## 第 2 层：智能体（开源、与模型无关） {#layer-2-the-agent-open-source-model-agnostic}

[Hermes智能体](https://github.com/NousResearch/hermes-agent)是Nous Research的智能体框架，并获得MIT许可。重要的是，它与 *不是* 绑定到 Hermes 模型。它与模型无关：您将其指向任何与 OpenAI 兼容的端点，并使用 `hermes model` 切换模型，无需更改代码。

这就是让开放模型和开放智能体相遇的原因。在本地提供您选择的模型并将智能体的 `base_url` 指向它。使用 gpt-oss-20b 的 Ollama 版本，在 `~/.hermes/config.yaml` 中：

```yaml
model:
  default: gpt-oss:20b
  provider: custom
  base_url: http://localhost:11434/v1   #您本地的Ollama服务器
  context_length: 64000
```

其他本地后端使用相同的模式和不同的端口：`8000`上的vLLM，`8080`上的llama.cpp服务器，`1234`上的LM Studio。在开始之前值得了解的两个实用注意事项：

- **上下文长度：**Hermes智能体需要一个至少具有**64,000 token**上下文的模型，并在启动时拒绝较小的模型。 gpt-oss-20b支持128K，但Ollama默认为更小的窗口，因此设置`OLLAMA_CONTEXT_LENGTH=65536`（或更高），否则检查将失败。这是本地模型最常见的问题。
- **工具调用：** Ollama 为 gpt-oss-20b 提供内置工具调用。如果您使用原始服务器，则 vLLM 需要 `--enable-auto-tool-choice --tool-call-parser hermes`，llama.cpp 的服务器需要 `--jinja`。 记忆操作是工具调用，所以这很重要。

此时，您拥有一个完全在您的机器上驱动开放模型的开放智能体。缺少的是记忆：默认情况下，智能体在会话之间是无状态的，或者它使用仅写入本地 Markdown 文件的内置记忆工具。那是第三层。

## 第3层：记忆（开源，默认本地） {#layer-3-the-memory-open-source-local-by-default}

Hindsight 已获得 MIT 许可，并且整个内容是自我托管的。 “完全开放”声明的重要部分不仅仅是许可证，而是自托管的Hindsight服务器可以与**无外部依赖，无外部调用**一起运行。

使用Docker启动服务器：

```bash
docker run -it --pull always --name hindsight --restart unless-stopped \
  -p 8888:8888 -p 9999:9999 \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

或者使用pip，指向您已经为智能体运行的相同本地模型：

```bash
pip install hindsight-api
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:20b
hindsight-api          # serves http://localhost:8888
```

API出现在`localhost:8888`上，本地服务器有**默认不进行身份验证**，因此不需要API密钥。

数据存放在哪里，以及与外界通信什么？默认情况下，什么都不做：

- **数据库：** Hindsight 附带嵌入式PostgreSQL（“pg0”），因此无需运行单独的数据库。将其指向您自己的 PostgreSQL 14+，并带有用于生产的矢量扩展，或者保留嵌入的用于本地堆栈。在Windows上，嵌入式数据库意味着没有Docker，也没有WSL。
- **嵌入：** 默认提供程序是 `local` (`BAAI/bge-small-en-v1.5`)，在进程中计算。无嵌入API。
- **重排序：** 默认的重排序器也是`local`（交叉编码器模型）。没有重新排名API。
- **LLM：** Hindsight 使用LLM 提取`retain` 上的事实并在`reflect` 上进行推理。这也可以是本地的。将其指向上面的 Ollama 端点，或者将 `HINDSIGHT_API_LLM_PROVIDER=llamacpp` 设置为在没有外部服务器的情况下运行内置推理（它会在第一次运行时自动下载一个小的 GGUF）。 `recall`本身，即搜索路径，只是本地嵌入和重排序，因此检索根本不需要LLM。

所以记忆层是真正本地的：本地数据库、本地嵌入、本地重排序和本地提取模型。存储或回忆记忆的任何内容都不必离开您的网络。

### Hindsight应该使用哪种型号？ {#which-model-should-hindsight-use}

模型在这里很重要，它不必与聊天机器人所需的大小相同。 Hindsight 仅针对`retain`（提取事实）和`reflect`（推理）调用LLM； `recall`是纯本地搜索。由于提取是一项结构化的、范围广泛的任务，因此小型模型效果很好，而前沿模型则显得过分了。

我们发布了[模特排行榜](https://benchmarks.hindsight.vectorize.io/)，专门根据记忆召回和感觉对法学硕士进行排名，根据质量、速度和成本进行评分，这样你就可以用数据而不是共鸣来选择。 `gpt-oss-20b`目前在记忆存储排名中名列前茅。这很方便：您已经为智能体服务的同一模型也是最佳评分提取模型，因此**一个 13 GB 型号为整个堆栈提供动力**。

## 接线 {#wiring-it-together}

Hermes 有一个可插拔的记忆提供者系统。内置provider写入markdown文件； Hindsight 是一个可选择的提供程序，您可以通过一个设置打开。

```bash
hermes config set memory.provider hindsight
```

然后告诉Hermes你的自托管服务器在哪里，在`~/.hermes/.env`：

```bash
HINDSIGHT_API_URL=http://localhost:8888
# 关闭认证的本地服务器无需 HINDSIGHT_API_KEY
```

一旦提供者处于活动状态，Hermes将通过三种方式使用Hindsight：

- **自动记忆召回：** 在每次调用模型之前，Hermes都会查询Hindsight相关记忆并将其注入系统提示符（`pre_llm_call`钩子）。
- **自动记忆存储：
每次响应后**，它保留与Hindsight（`post_llm_call`钩子）的交换。
- **显式工具：** `hindsight_recall`、`hindsight_retain`和`hindsight_reflect`可供模型直接控制。

您可以通过记忆模式选择平衡：`hybrid`（自动注射加工具）、`context`（仅自动注射）或`tools`（仅工具，无注射）。

需要标记一个版本警告，因为很容易错过：自动记忆召回和记忆存储挂钩需要最近的Hermes智能体构建（添加`pre_llm_call`和`post_llm_call`挂钩的那些）。在旧版本上，三个显式工具仍然会注册，但自动注入会被默默地跳过。如果自动记忆似乎没有启动，请先更新Hermes。

如果您不想运行单独的服务器，还有一个更简单的路径：Hindsight提供程序有一个`local`模式，可以自动启动带有内置数据库的嵌入式Hindsight。这是尝试堆栈的最快方法。当您希望在多个智能体或机器之间共享一个记忆存储，或者完全控制提取LLM时，在`localhost:8888`上运行您自己的服务器是更好的选择。

## 完成的堆栈是什么样子的 {#what-the-finished-stack-looks-like}

放在一起，图中的每个框都是打开的并且在您的硬件上：

|层|组件|许可证|运行到哪里|
|---|---|---|---|
|型号|gpt-oss-20b（推荐）|阿帕奇 2.0|Ollama / vLLM / llama.cpp，本地|
|智能体|Hermes 智能体|麻省理工学院|你的机器|
|记忆|Hindsight|麻省理工学院|你的机器（嵌入式数据库，本地嵌入）|

无边界API型号。没有专有的记忆服务。记忆路径中不需要外部网络调用。智能体以开放模型进行推理，以开放记忆进行记忆，推理和记忆都发生在您控制的基础设施上。

## 它适合笔记本电脑吗？我在 M3 Max 上运行了它 {#does-it-fit-on-a-laptop-i-ran-it-on-an-m3-max}

以上所有内容都是可测试的，因此我在 MacBook Pro（M3 Max，36 GB）上运行它，看看声明是否成立。他们确实这么做了。

我通过Ollama服务gpt-oss-20b，然后启动了一个自托管的Hindsight，具有完全本地默认值、嵌入式PostgreSQL、本地嵌入、本地重排序器，指向相同的模型进行提取：

```bash
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:20b
hindsight-api
```

服务器在大约六秒内报告健康。嵌入和重排序加载到 Mac 的 GPU (MPS) 上，嵌入式数据库自行启动。然后是来自 CLI 的记忆存储和记忆召回：

- **记忆存储**大约需要**8秒
第一次调用时，一个包含两个事实的句子的**，其中包括将 gpt-oss-20b 加载到记忆中。 Hindsight 正确地将其拆分为两个单独的事实并解析了实体。
包含两个事实的句子的
- **记忆召回** 返回了两个事实，排名约为**0.6秒**。 记忆召回不会调用LLM，因此它在后续查询中保持快速。

从资源角度来看，该模型是唯一较重的部分：大约 13 GB 的磁盘空间和加载时类似数量的 RAM，这为 36 GB 机器留下了舒适的空间。本地嵌入和重排序器模型加起来有几百兆，嵌入的数据库很小。没有API键，笔记本电脑上什么也没有留下。

这就是整个练习：开放模型、开放智能体和开放记忆，全部在一台笔记本电脑上，记忆层不进行外部调用。

## 何时这确实重要（以及何时不重要） {#when-this-actually-matters-and-when-it-does-not}

能够自行托管整个堆栈并不是免费的。您为模型提供 GPU，运行服务器，并且您可以托管的开放模型在最困难的任务上可能无法与前沿 API 模型相匹配。因此，请诚实地对待完全开放的堆栈何时能发挥作用：

- **气隙或监管环境** 数据无法离开您的网络。在这种情况下，封闭模型或记忆 SaaS 根本就不合格，开放堆栈是唯一的选择。
- **数据驻留和隐私** 要求“供应商承诺不看”还不够好，并且您需要智能体的记忆以物理方式保留在您的系统上。
- **没有每个token成本，也没有锁定。** 本地推理没有计量的 API 账单，并且由于智能体和模型都是可交换的，因此您不会依赖于任何一个提供商。

如果这些都不适用，托管模型和Hindsight Cloud将减少运营工作，这是一个非常好的选择。重点并不是每个人都应该自行托管一切。关键是，使用 Hermes 和 Hindsight，您可以 *可以* 自托管所有内容，包括查看所有数据的两层，并且很少有智能体记忆堆栈可以让您做到这一点。

## 进一步阅读 {#further-reading}

- [Hermes 智能体持久记忆与Hindsight](/sdks/integrations/hermes)：完整的集成参考，包括记忆模式。
- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：记忆层对其存储的每个交换实际上做了什么。
- ​​[一个记忆库还是多个？](/blog/2026/07/16/bank-strategy-agent-memory)：一旦运行记忆，如何确定其范围。
