---
title: "Mira Murati 的 Thinking Machines 推出了 Inkling。我们用 5 分钟让它成为智能体的记忆引擎。"
authors: [benfrank241]
slug: "2026/07/21/inkling-agent-memory-hindsight"
date: 2026-07-21T12:00
tags: [hindsight, inkling, thinking-machines, agent-memory, open-weights, tutorial]
description: "Thinking Machines 将 Inkling 开源了。我们只用四个环境变量，就让它成为 AI 智能体的长期记忆模型；第一次尝试时，它就把“上周”解析成了真实日期。具体做法如下。"
image: /img/blog/inkling-agent-memory-hindsight.webp
hide_table_of_contents: true
---

![将 Thinking Machines 的 Inkling 接入 Hindsight，作为智能体记忆引擎](/img/blog/inkling-agent-memory-hindsight.webp)

7 月 15 日，[Thinking Machines Lab](https://thinkingmachines.ai) 发布了 [Inkling](https://thinkingmachines.ai/news/introducing-inkling/)，这是 Mira Murati 的新实验室推出的首个开放权重模型。它是一个拥有 9750 亿参数的混合专家模型，采用 Apache 2.0 许可证，支持多模态，上下文窗口长达 100 万 token。整个互联网随即做了同一件事：开始微调它。

我们做了发布文章没有提议的一件事：让它承担整个智能体技术栈中最不起眼、最被低估的工作——**充当智能体长期记忆背后的大脑。** 无需微调，只需四个环境变量。大约 8 秒后，它就从一个杂乱的句子中提取出清晰的事实，还悄悄地把“上周”解析成了一个具体的日历日期。

下面介绍具体做法，以及我们尝试后的结果。

<!-- truncate -->

## 概览 {#tldr}

- Inkling 可以通过任何兼容 OpenAI 的端点运行（NVIDIA、Together、Fireworks、Baseten、Hugging Face）。
- Hindsight 是我们的开源智能体记忆系统，可以通过 **四个环境变量**，将该端点配置为事实提取和推理所用的模型。
- 无需自行托管 975B 权重。跟着本文操作，只需要一个免费的 NVIDIA API 密钥。
- 在我们的测试中，Inkling 开箱即用地提取了结构清晰的事实、自行解析了相对日期，并生成了连贯的反思结果。
- 本次实验的总成本只有几百个 token，基本可以忽略。

## 等等，为什么要用前沿模型处理*记忆*？ {#wait-why-would-you-use-a-frontier-model-for-memory}

因为“记忆”不是一项工作，而是两项，而且这两项都很难做好，只是平时不太显眼。

智能体完成一轮交互后，需要有东西读取原始对话，并判断哪些内容值得记住：哪些事实、涉及哪些实体，以及对应什么时间戳。这就是 **Retain（存入）** 步骤，它本质上是一个结构化提取问题。之后，当智能体询问“关于 X，我们知道些什么”时，还需要有东西根据已存储的所有内容进行推理并综合生成答案。这就是 **Reflect（反思）**。

Hindsight 自行处理存储、搜索、实体消解和整合。但这两个步骤——提取和反思——都要调用大语言模型（LLM）。选择哪个 LLM，会决定智能体的记忆实际有多好。因此，真正的问题不是“Inkling 能不能聊天”，而是“Inkling 能不能把一个句子转化成结构化、带日期、关联到实体的事实”。我们来看看。

## 四个环境变量，完成整个集成 {#four-environment-variables-that-is-the-whole-integration}

Hindsight 可以连接任何兼容 OpenAI 的端点，因此接入 Inkling 只需配置，无需编写代码：

```bash
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_BASE_URL=https://integrate.api.nvidia.com/v1
export HINDSIGHT_API_LLM_API_KEY=nvapi-your-key
export HINDSIGHT_API_LLM_MODEL=thinkingmachines/inkling
```

然后启动服务器：

```bash
pip install hindsight-api
hindsight-api        # 在 http://localhost:8888 提供服务
```

就这么简单。嵌入和重排序默认在本地运行，数据库是嵌入式 Postgres，因此只有发往 Inkling 的事实提取和反思请求会离开你的机器。启动时，Hindsight 会验证连接：

```
Connection verified: openai/thinkingmachines/inkling
```

### 免费获取密钥 {#getting-a-key-for-free}

Inkling 可以通过多个服务提供方使用，其中 NVIDIA 提供免费选项。你可以在 [build.nvidia.com/thinkingmachines/inkling](https://build.nvidia.com/thinkingmachines/inkling) 获取密钥，并领取免费额度。如果你更喜欢其他选择，Together AI 和 Fireworks 注册后也提供免费额度。你不需要 Hugging Face 上的原始权重，而且几乎肯定不想尝试在笔记本电脑上运行 975B 模型。

对于这类模型，有一个值得设置的标志：

```bash
export HINDSIGHT_API_LLM_STRICT_SCHEMA=false
```

这会让 Hindsight 使用“在提示中描述 schema”的事实提取模式，而不要求 API 原生强制执行语法约束的 JSON。下文会进一步解释这样做的原因。

## 测试：让它处理一个杂乱的句子 {#the-test-teach-it-one-messy-sentence}

我们给 Inkling 输入了一个特意写得纠缠复杂的句子，也就是智能体在实际使用中经常会听到的那种话：

```bash
hindsight memory retain inkling-test \
  "Ben is a staff engineer at Vectorize in Toronto. He prefers Rust for
   performance-critical services and uses Postgres with pgvector. Last week
   he decided to drop the Kafka pipeline in favor of a simpler cron-based ingester."
```

Retain 大约 8 秒就完成了。接着，我们询问 Hindsight 实际存储了什么：

```bash
hindsight memory recall inkling-test "what tech stack and decisions does Ben prefer?"
```

```
[WORLD] Ben is a staff engineer at Vectorize in Toronto, prefers Rust for
        performance-critical services, and uses Postgres with pgvector.
        | Involving: Ben
[WORLD] Last week, Ben decided to drop the Kafka pipeline in favor of a
        simpler cron-based ingester. | When: on July 14, 2026 | Involving: Ben
```

## 最让我们惊讶的部分 {#the-part-that-made-us-do-a-double-take}

再看第二条事实：**`When: on July 14, 2026`**。

我们从未给 Inkling 提供日期，只写了“上周”。Inkling 读取消息时间戳，计算出对应日期，并将这项决定定位到一个绝对日期。这正是我们想要的，因为三个月后，“上周”对智能体毫无用处。时间定位是较小型模型经常处理不好的事情之一，而 Inkling 第一次尝试就主动做到了。

它还把一个连写的长句清晰地**拆分成两条事实**（一条稳定的个人资料事实和一条带日期的决定），并完成了八个实体的识别与消解，正确判断两条事实说的都是同一个 Ben：

```
Total entities: 8   (Ben ×2, Vectorize, Toronto, Rust, Postgres, pgvector, Kafka, ...)
```

## Reflect：它能根据存储的内容进行推理吗？ {#reflect-can-it-reason-across-what-it-stored}

事实提取只完成了一半工作。我们让 Hindsight 综合生成答案：

```bash
hindsight memory reflect inkling-test \
  "Summarize Ben's engineering preferences and recent architectural decisions."
```

Inkling 在大约 11 秒后给出了结构清晰、准确的摘要，其中采用了解析出的日期，甚至还做出了恰当的解读：

> On July 14, 2026, Ben decided to drop the Kafka pipeline in favor of a more straightforward cron-based ingester. This change reflects his inclination towards simplicity and efficiency in architectural choices.

没人告诉它 Ben 喜欢简单。它从 Kafka 转向 cron 这件事推断出了这一点。这种建立联系的推理能力，会让人觉得记忆真正理解了你，而不只是把你说过的话存起来。

## 为什么开箱即用 {#why-this-works-out-of-the-box}

原因有两个，另外还有一个坦诚的提醒。

首先，Inkling 是**经过后训练的模型**，而不是原始基础检查点。Thinking Machines 使用聊天、智能体编程和工具调用数据训练了它，因此它能够遵循指令并生成格式规范的输出，无需费力反复恳求。这就是为什么即使在 Hindsight 的软 schema 模式下，它也能生成有效的结构化事实：在这种模式下，JSON 结构是在提示中描述的，而非由 API 通过语法约束强制执行。

其次，记忆任务恰好能发挥大型模型的优势。事实提取和时间定位需要广泛的世界知识与仔细阅读，反思则需要综合能力。Inkling 这三方面都具备。

提醒：Inkling **尚未列入我们的[模型排行榜](https://benchmarks.hindsight.vectorize.io)**，一个干净利落的案例也不等于基准测试。对于 Retain 步骤，我们目前首选小得多的 `gpt-oss-20b`，因为在高吞吐量的记忆写入场景下，它速度更快、成本更低。Inkling 每次调用需要 8 到 11 秒，这是使用 975B 推理模型要付出的代价。准确地说，Inkling 是一个能力出众的记忆大脑；批量处理数千次存入操作时可能有些大材小用，但对于重视质量的任务，它确实令人印象深刻。

## 什么时候适合选择它 {#when-you-would-actually-reach-for-this}

- **你已经在基于 Inkling 构建应用**，希望智能体的记忆也使用同一个模型。一个服务提供方，一笔账单。
- **质量优先于吞吐量。** 输入冗长、含义模糊、时间信息混乱，而你希望提取得准确，不只是快速。
- **你想要一个完全可替换的技术栈。** 开源记忆系统（Hindsight，MIT 许可证）、开放权重模型（Inkling，Apache 2.0 许可证），并且可以自由替换其中任意部分，无需重写。

如果要海量写入记忆，可以让一个小型快速模型负责 Retain，把 Inkling 留给 Reflect。如果你愿意，Hindsight 可以让这两个步骤分别连接不同的端点。

## 五分钟快速上手 {#the-five-minute-version}

1. 在 [build.nvidia.com/thinkingmachines/inkling](https://build.nvidia.com/thinkingmachines/inkling) 获取免费的密钥。
2. 设置四个环境变量（`PROVIDER=openai`、NVIDIA 的 `BASE_URL`、你的密钥、`MODEL=thinkingmachines/inkling`），再设置 `STRICT_SCHEMA=false`。
3. 执行 `pip install hindsight-api` 并运行服务。
4. 使用 `retain`、`recall`、`reflect`，看着它把“上周”变成一个具体日期。

Thinking Machines 构建 Inkling，是为了将其作为微调的基础。事实证明，即使完全不微调，它也是一个出色的记忆引擎。给你的智能体一个真正能记住信息的大脑。

## 延伸阅读 {#further-reading}

- [完全开放的智能体记忆技术栈](/blog/2026/07/17/hermes-hindsight-open-stack)：从头到尾将开放模型与开放记忆系统配对使用。
- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：了解 Hindsight 如何处理模型提取出的每一条事实。
- [Hindsight 模型排行榜](https://benchmarks.hindsight.vectorize.io)：了解哪些 LLM 在记忆任务上的得分最高。
