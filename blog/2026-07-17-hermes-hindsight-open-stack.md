---
title: "完全开放的智能体记忆堆栈：自托管 Hermes + Hindsight"
authors: [benfrank241]
slug: "2026/07/17/hermes-hindsight-open-stack"
date: 2026-07-17T12:00
tags: [hindsight, hermes, agent-memory, open-source, self-hosted, persistent-memory, tutorial]
description: "大多数智能体与记忆堆栈都有封闭的核心：前沿 API 模型、专有记忆服务，或两者兼有。Hermes 和 Hindsight 是例外：每一层都是开源的，可以在你自己的硬件上运行，无需外部调用。"
image: /img/blog/hermes-hindsight-open-stack.webp
hide_table_of_contents: true
---

![完全开放的智能体记忆堆栈：开放权重模型、开源智能体和开源记忆，全部自托管](/img/blog/hermes-hindsight-open-stack.webp)

大多数“带长期记忆的 AI 智能体”方案至少有一个部分无法由你自行托管：模型是需要付费的前沿 API，或者记忆由专有服务托管，智能体的历史记录存放在别人的服务器上，也可能两者兼有。你可以把封装代码迁移到自己的基础设施，但真正能看到全部数据的两个组件——模型和记忆——仍留在云端。

Hermes 加上 Hindsight 则是例外。模型权重开放，智能体开源，记忆系统也开源。每一层都能在你自己的硬件上运行，而且在默认配置下，记忆层完全不会发起外部网络调用。这篇文章会逐层说明这一主张的依据：哪些部分真正开放、采用什么许可证，以及各部分如何连接成由你完全掌控的堆栈。

<!-- truncate -->

## 概览 {#tldr}

- **模型：** 任何能通过 Ollama、vLLM 或 llama.cpp 在本地提供服务的开放权重模型。我们推荐 `gpt-oss-20b`，这是 OpenAI 采用 Apache-2.0 许可证的开放模型：上下文长度为 128K，原生支持工具调用，约占 13 GB，也是我们自己的存入排行榜上的榜首模型。
- **智能体：** [Hermes Agent](https://github.com/NousResearch/hermes-agent) 采用 MIT 许可证，且与模型无关。它可以连接任何兼容 OpenAI 的端点，因此无需修改代码就能驱动本地模型。
- **记忆：** [Hindsight](https://vectorize.io/hindsight) 采用 MIT 许可证。可以用 Docker 或 pip 自托管。嵌入和重排序默认在本地运行，事实提取也可以交给同一个本地模型，因此自托管服务器无需外部调用或 API 密钥。
- **笔记本电脑也能运行：** 整个堆栈可以在 M3 Max（36 GB）上运行。在我的测试中，首次存入约需 8 秒，召回不到一秒。具体数据见下文。
- **需要如实说明的限制：** 模型上下文长度至少要有 64K（需调高 Ollama 的默认值）；自动召回和存入功能需要较新的 Hermes Agent 版本；可自行托管的开放模型在最难的任务上未必能比得上前沿 API 模型。详情见下文。

## 为什么“完全开放”并不常见 {#why-fully-open-is-rare}

智能体记忆是堆栈中包含最敏感数据的部分。它持久记录了智能体看到的一切：对话、决策、代码和客户信息。这些数据恰恰是你最不愿交给无法检查或自行托管的第三方服务的。

常见的堆栈确实会把数据交出去。使用封闭模型时，每个提示都会发送到外部 API，包括注入提示中的记忆。使用专有记忆服务时，智能体的全部历史记录都留在别人的数据库里。“开放”常常只意味着胶水代码开源，而能看到一切的模型和记忆这两个组件却并不开放。

完全开放的堆栈能同时补上这两处缺口。下面分为三层说明。

## 第 1 层：模型（开放权重，由你选择） {#layer-1-the-model-open-weights-your-choice}

第 2 层的智能体与模型无关，因此模型是这套堆栈中由你选择的部分。硬性要求只有三项：模型采用开放权重（这样你可以自行运行），上下文长度至少为 64K，并且支持工具调用，因为记忆操作通过工具调用完成。

我们推荐 **`gpt-oss-20b`**，这是 OpenAI 的开放权重模型。它适合作为默认选择，有几个具体原因：采用 Apache 2.0 许可证，上下文窗口为 128K，原生支持函数调用，而且体量足够小，可以在笔记本电脑上轻松运行（Ollama 的 4 位量化版本约为 13 GB）。它也恰好是 Hindsight 自有存入排行榜上的榜首模型，这对下文第 3 层很重要。

顺带说说“随手选个热门模型”的想法，因为其中藏着一个陷阱。以一个名字听起来很小的 Kimi 模型为例。真正较新的 Kimi 版本是参数量超过 1 万亿的混合专家模型，任何笔记本电脑都装不下。看上去比较小的 Kimi-Linear-48B-A3B 宣称有 3B“激活”参数，但你仍需让全部 48B 权重常驻内存：它的 4 位量化版本在磁盘上约占 28 到 30 GB，也需要大致同等容量的 RAM。对于一台 36 GB 的机器，这就没有空间留给记忆系统，而且它的工具调用支持也没有文档说明。决定模型能否装下的不是激活参数，而是权重总量。

如果你需要比 `gpt-oss-20b` 更大的余量，Qwen3-Coder-30B-A3B 是一个不错的升级选择（约 19 GB、上下文长度 256K、Apache 2.0 许可证、原生支持工具），仍能装进 36 GB 的机器。如果你想用构建该智能体的同一团队所发布的模型，Nous Research 也提供开放权重的 Hermes 系列。不过，若想要一套开箱即用的本地堆栈，`gpt-oss-20b` 是首选。

## 第 2 层：智能体（开源，与模型无关） {#layer-2-the-agent-open-source-model-agnostic}

[Hermes Agent](https://github.com/NousResearch/hermes-agent) 是 Nous Research 的智能体框架，采用 MIT 许可证。关键在于，它**并不**绑定 Hermes 模型。它与模型无关：只需将它指向任何兼容 OpenAI 的端点，再用 `hermes model` 切换模型，无需修改代码。

这样一来，开放模型和开源智能体就能配合使用。你可以在本地提供所选模型，再将智能体的 `base_url` 指向它。以下是在 `~/.hermes/config.yaml` 中使用 `gpt-oss-20b` 的 Ollama 版本的配置：

```yaml
model:
  default: gpt-oss:20b
  provider: custom
  base_url: http://localhost:11434/v1   # 本地 Ollama 服务器
  context_length: 64000
```

其他本地后端采用相同模式，只是端口不同：vLLM 使用 `8000`，llama.cpp 的服务器使用 `8080`，LM Studio 使用 `1234`。开始之前有两点实用信息需要了解：

- **上下文长度：** Hermes Agent 要求模型的上下文长度至少为 **64,000 token**，并会在启动时拒绝上下文更短的模型。`gpt-oss-20b` 支持 128K，但 Ollama 默认使用小得多的窗口，因此需要设置 `OLLAMA_CONTEXT_LENGTH=65536`（或更高），否则检查会失败。这是本地模型最常见的问题。
- **工具调用：** Ollama 提供的 `gpt-oss-20b` 内置了工具调用能力。如果你使用原始服务器，vLLM 需要 `--enable-auto-tool-choice --tool-call-parser hermes`，llama.cpp 的服务器则需要 `--jinja`。记忆操作通过工具调用完成，因此这一点很重要。

到这里，你就有了一个在自己机器上运行开放模型的开源智能体。还缺少记忆：默认情况下，智能体在不同会话间没有状态，或者会使用内置的记忆工具，只把内容写入本地 Markdown 文件。接下来是第三层。

## 第 3 层：记忆（开源，默认在本地运行） {#layer-3-the-memory-open-source-local-by-default}

Hindsight 采用 MIT 许可证，整套系统都可以自托管。“完全开放”这一说法的关键不只是许可证，还在于自托管的 Hindsight 服务器可以在**没有外部依赖、也不发起外部调用**的情况下运行。

使用 Docker 启动服务器：

```bash
docker run -it --pull always --name hindsight --restart unless-stopped \
  -p 8888:8888 -p 9999:9999 \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

也可以通过 pip 安装，并指向你已经为智能体运行的同一个本地模型：

```bash
pip install hindsight-api
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:20b
hindsight-api          # 服务地址为 http://localhost:8888
```

API 会在 `localhost:8888` 启动。本地服务器默认**不启用身份认证**，因此不需要 API 密钥。

数据存在哪里？哪些组件会与外界通信？默认情况下，后者一个也没有：

- **数据库：** Hindsight 内置了嵌入式 PostgreSQL（“pg0”），因此不必另外运行数据库。用于生产环境时，可以连接你自己的 PostgreSQL 14+ 并安装向量扩展；用于本地堆栈时，也可以继续使用内置数据库。在 Windows 上，内置数据库意味着无需 Docker 或 WSL。
- **嵌入：** 默认服务提供方是 `local`（`BAAI/bge-small-en-v1.5`），在进程内计算，无需嵌入 API。
- **重排序：** 默认重排序器也为 `local`（一个交叉编码器模型），无需重排序 API。
- **LLM：** Hindsight 使用 LLM 在 `retain` 时提取事实、在 `reflect` 时进行推理。这些操作也可以使用本地模型。像上文那样将它指向 Ollama 端点，或者设置 `HINDSIGHT_API_LLM_PROVIDER=llamacpp`，使用内置推理，无需外部服务器（首次运行时会自动下载一个较小的 GGUF 文件）。`recall` 本身也就是搜索过程，只使用本地嵌入和重排序，因此检索完全不需要 LLM。

因此，记忆层确实可以完全在本地运行：本地数据库、本地嵌入、本地重排序，以及本地事实提取模型。存储或召回记忆时，没有任何内容必须离开你的网络。

### Hindsight 应该使用哪种模型？ {#which-model-should-hindsight-use}

模型在这里很重要，但它不必像聊天机器人所需的模型那么大。Hindsight 只在 `retain`（提取事实）和 `reflect`（基于事实推理）时调用 LLM；`recall` 则完全是本地搜索。事实提取是一项结构清晰、范围明确的任务，因此小模型也能做得很好，前沿模型反而大材小用。

我们发布了一个[模型排行榜](https://benchmarks.hindsight.vectorize.io/)，专门对 LLM 在 `retain` 和 `reflect` 上的表现排名，并按质量、速度和成本评分。这样你就能依据数据而不是感觉来选择。`gpt-oss-20b` 目前在存入排名中居首。这很方便：你已经为智能体运行的同一个模型，也是事实提取得分最高的模型，因此**一个 13 GB 的模型就能驱动整套堆栈**。

## 将各部分连接起来 {#wiring-it-together}

Hermes 提供可插拔的记忆提供方系统。内置提供方会写入 Markdown 文件；Hindsight 则是一个可选提供方，只需一项设置即可启用。

```bash
hermes config set memory.provider hindsight
```

然后在 `~/.hermes/.env` 中告诉 Hermes 自托管服务器的地址：

```bash
HINDSIGHT_API_URL=http://localhost:8888
# 本地服务器关闭身份认证时，无需设置 HINDSIGHT_API_KEY
```

启用该提供方后，Hermes 会通过三种方式使用 Hindsight：

- **自动召回：** 每轮对话中，在调用模型之前，Hermes 会向 Hindsight 查询相关记忆，并将其注入系统提示词（通过 `pre_llm_call` 钩子）。
- **自动存入：** 每次响应之后，Hermes 会将本轮对话存入 Hindsight（通过 `post_llm_call` 钩子）。
- **显式工具：** 模型可以直接调用 `hindsight_recall`、`hindsight_retain` 和 `hindsight_reflect`。

你可以通过记忆模式选择自动处理与工具调用的组合方式：`hybrid`（自动注入并提供工具）、`context`（仅自动注入）或 `tools`（仅提供工具，不注入记忆）。

有一个容易忽略的版本限制需要说明：自动召回和自动存入钩子要求使用较新的 Hermes Agent 版本，也就是加入了 `pre_llm_call` 和 `post_llm_call` 钩子的版本。在较旧版本中，三个显式工具仍会注册，但自动注入会被静默跳过。如果自动记忆功能似乎没有生效，请先更新 Hermes。

如果你不想运行独立服务器，还有更简单的方式：Hindsight 提供方支持 `local` 模式，会自动启动带有内置数据库的嵌入式 Hindsight。这是最快的试用方式。如果你想让多个智能体或多台机器共用一个记忆存储，或者完全控制事实提取所用的 LLM，那么在 `localhost:8888` 上运行自己的服务器会更合适。

## 完整堆栈是什么样的 {#what-the-finished-stack-looks-like}

组合起来，图中的每个组件都是开放的，并运行在你自己的硬件上：

| 层 | 组件 | 许可证 | 运行位置 |
| --- | --- | --- | --- |
| 模型 | gpt-oss-20b（推荐） | Apache 2.0 | Ollama / vLLM / llama.cpp，本地运行 |
| 智能体 | Hermes Agent | MIT | 你的机器 |
| 记忆 | Hindsight | MIT | 你的机器（嵌入式数据库、本地嵌入） |

无需前沿 API 模型，无需专有记忆服务，记忆处理路径也不要求外部网络调用。智能体使用开放模型进行推理，并使用开放记忆保存经历；推理和记忆都运行在你掌控的基础设施上。

## 笔记本电脑能运行吗？我在 M3 Max 上试过 {#does-it-fit-on-a-laptop-i-ran-it-on-an-m3-max}

上面所有说法都可以实测，因此我在一台 MacBook Pro（M3 Max，36 GB）上运行了整套系统，验证这些说法是否成立。结果确实如此。

我先通过 Ollama 提供 `gpt-oss-20b`，然后启动自托管的 Hindsight，使用完全本地的默认配置、嵌入式 PostgreSQL、本地嵌入和本地重排序器，并让它使用同一个模型提取事实：

```bash
export HINDSIGHT_API_LLM_PROVIDER=ollama
export HINDSIGHT_API_LLM_MODEL=gpt-oss:20b
hindsight-api
```

服务器大约六秒后报告健康。嵌入和重排序模型加载到了 Mac 的 GPU（MPS）上，嵌入式数据库也自行启动了。接着我从 CLI 执行了存入和召回：

- **存入**一个包含两个事实的句子，首次调用约需 **8 秒**，其中包括将 `gpt-oss-20b` 加载到内存的时间。Hindsight 正确地将句子拆分成两个独立事实，并完成了实体消解。
- **召回**返回了排名后的两个事实，耗时约 **0.6 秒**。召回不会调用 LLM，所以后续查询仍然很快。

从资源占用来看，模型是唯一较大的部分：磁盘上约 13 GB，加载后也会占用相近容量的 RAM，因此在 36 GB 的机器上仍有充足余量。本地嵌入和重排序模型合计只有几百 MB，内置数据库也很小。不需要 API 密钥，任何数据都没有离开笔记本电脑。

整个测试可以用一句话概括：开放模型、开源智能体和开源记忆都在一台笔记本电脑上运行，记忆层不发起外部调用。

## 这种方案何时重要，何时不重要 {#when-this-actually-matters-and-when-it-does-not}

自行托管整套堆栈并非没有代价。你需要为模型提供 GPU、运行服务器，而且你能托管的开放模型在最难的任务上可能比不上前沿 API 模型。因此，应该如实判断完全开放的堆栈何时值得采用：

- **隔离网络或受监管的环境：** 数据不能离开你的网络。在这种情况下，封闭模型或记忆 SaaS 会被直接排除，开放堆栈是唯一选择。
- **数据驻留和隐私要求：** “供应商承诺不会查看数据”还不够；你需要让智能体的记忆实际保存在自己的系统上。
- **没有按 token 计费，也没有供应商锁定：** 本地推理没有按量计费的 API 账单；智能体和模型都可以替换，因此你不会受制于某一家服务提供方。

如果这些情况都不适用，托管模型加 Hindsight Cloud 会减少运维工作，这完全是合理的选择。重点并不是人人都应该把所有内容都自行托管，而是 Hermes 和 Hindsight 让你可以自行托管一切，包括能看到你全部数据的两个层，而能做到这一点的智能体记忆堆栈少之又少。

## 延伸阅读 {#further-reading}

- [Hermes Agent 与 Hindsight 的持久记忆](/sdks/integrations/hermes)：完整的集成参考，包含记忆模式说明。
- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：了解记忆层如何处理存入的每一轮对话。
- [一个记忆库还是多个？](/blog/2026/07/16/bank-strategy-agent-memory)：了解系统运行后该如何划分记忆范围。
