---
title: "Mira Murati 的思维机器掉落Inkling。我们在 5 分钟内将其变成您智能体的记忆。"
authors: [benfrank241]
slug: "2026/07/21/inkling-agent-memory-hindsight"
date: 2026-07-21T12:00
tags: [hindsight, inkling, thinking-machines, agent-memory, open-weights, tutorial]
description: "Thinking Machines 开源Inkling。我们将其作为 AI 智能体在四个环境变量中的长期记忆，并且在第一次尝试时就将“上周”解析为真实日期。方法如下。"
image: /img/blog/inkling-agent-memory-hindsight.webp
hide_table_of_contents: true
---

![将思维机器的Inkling连接到Hindsight作为智能体记忆引擎](/img/blog/inkling-agent-memory-hindsight.webp)

7月15日，[思维机器实验室](https://thinkingmachines.ai)发货了[Inkling](https://thinkingmachines.ai/news/introducing-inkling/)，这是Mira Murati新实验室的第一个开放重量模型。 9750 亿个参数的专家混合体、Apache 2.0、多模式、一百万个令牌上下文窗口。整个互联网立即对其做了同样的事情：开始微调。

我们做了一些发布帖子中没有建议的事情。我们指出了整个智能体堆栈中最不迷人、最被低估的工作：**是智能体长期记忆背后的大脑。** 没有微调。四个环境变量。大约八秒之内，它用了一个凌乱的句子，拉出了干净的事实，并悄悄地将“上周”这个短语解析为实际的日历日期。

这就是具体的操作方法，以及我们尝试时发生的情况。

<!-- truncate -->

## 概览 {#tldr}

- Inkling 在任何OpenAI兼容端点（NVIDIA、Together、Fireworks、Baseten、Hugging Face）后面运行。
- Hindsight，我们的开源智能体记忆系统，可让您将该端点作为其提取和推理模型与**四个环境变量**交换。
- 您不需要自行托管 975B 权重。一个免费的 NVIDIA API 密钥足以完成后续操作。
- 在我们的测试中，Inkling干净地提取了结构化事实，自行解决了相对日期，并产生了连贯的反映，所有这些都是开箱即用的。
- 实验总成本：几百token。基本免费。

## 等等，为什么要为*记忆*使用前沿模型？ {#wait-why-would-you-use-a-frontier-model-for-memory}

因为“记忆”不是一项工作，它是两项工作，而且两者都默默地努力。

当你的智能体完成一个回合时，某些东西必须读取原始对话并决定什么实际上值得记住：哪些事实，关于哪些实体，带有什么时间戳。这就是**记忆存储**步骤，它是一个结构化提取问题。后来，当智能体询问“我们对 X 了解什么”时，某些东西必须对存储的所有内容进行推理并综合答案。那就是**反思**。

Hindsight 处理存储、搜索、实体解析和集成本身。但是提取和反思这两个步骤需要LLM。你选择哪个LLM决定了你的智能体的记忆实际上有多好。因此，真正的问题不是“可以Inkling聊天”，而是“可以Inkling将句子变成结构化的、过时的、与实体相关的事实”。让我们来看看吧。

## 四个环境变量。这就是整个整合。 {#four-environment-variables-that-is-the-whole-integration}

Hindsight 与任何OpenAI兼容端点通信，因此Inkling中的接线是配置，而不是代码：

```bash
export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_BASE_URL=https://integrate.api.nvidia.com/v1
export HINDSIGHT_API_LLM_API_KEY=nvapi-your-key
export HINDSIGHT_API_LLM_MODEL=thinkingmachines/inkling
```

然后启动服务器：

```bash
pip install hindsight-api
hindsight-api        # serves http://localhost:8888
```

就是这样。嵌入和重排序默认在本地运行，数据库是嵌入式Postgres，因此离开机器的唯一事情就是对Inkling的提取和反思调用。启动时您将看到Hindsight验证连接：

```
Connection verified: openai/thinkingmachines/inkling
```

### 免费获取钥匙 {#getting-a-key-for-free}

Inkling 由多个提供商提供，但免费的是 NVIDIA 的。在[build.nvidia.com/thinkingmachines/inkling](https://build.nvidia.com/thinkingmachines/inkling)获取一把钥匙，里面有免费积分。如果您愿意，AI 和 Fireworks 还可以提供免费注册积分。您不需要原始的 Hugging Face 权重，而且您几乎肯定不想尝试在笔记本电脑上运行 975B 模型。

值得为这样的模型设置一个标志：

```bash
export HINDSIGHT_API_LLM_STRICT_SCHEMA=false
```

这告诉Hindsight使用其模式提示提取模式，而不是要求强制执行本机语法JSON。下面详细解释为什么这很重要。

## 测试：教它一个凌乱的句子 {#the-test-teach-it-one-messy-sentence}

我们向Inkling扔了一个故意纠结的句子，这是一个真正的智能体经常听到的东西：

```bash
hindsight memory retain inkling-test \
  "Ben is a staff engineer at Vectorize in Toronto. He prefers Rust for
   performance-critical services and uses Postgres with pgvector. Last week
   he decided to drop the Kafka pipeline in favor of a simpler cron-based ingester."
```

记忆存储大约在**8秒
第一次调用时，一个包含两个事实的句子的**完成。然后我们询问Hindsight实际存储了什么：

```bash
hindsight memory recall inkling-test "Ben 更喜欢什么技术堆栈和决策？"
```

```
[WORLD] Ben is a staff engineer at Vectorize in Toronto, prefers Rust for
        performance-critical services, and uses Postgres with pgvector.
        | Involving: Ben
[WORLD] Last week, Ben decided to drop the Kafka pipeline in favor of a
        simpler cron-based ingester. | When: on July 14, 2026 | Involving: Ben
```

## 让我们回味无穷的部分 {#the-part-that-made-us-do-a-double-take}

再看第二个事实：**`When: on July 14, 2026`**。

我们从未给过Inkling约会。我们写了“上周”。 Inkling 读取消息时间戳，进行算术运算，并将决定固定到绝对日期，这正是您想要的，因为“上周”对于三个月后的智能体来说毫无用处。时间接地是廉价型号经常出现的问题之一，而Inkling在第一次尝试时就自发地做到了这一点。

它还干净地**将一个连续句子分成两个事实**（稳定的概况事实和过时的决定）并解决了八个实体，正确认识到这两个事实都与同一个本有关：

```
Total entities: 8   (Ben ×2, Vectorize, Toronto, Rust, Postgres, pgvector, Kafka, ...)
```

## 反思：它能推理出它存储的内容吗？ {#reflect-can-it-reason-across-what-it-stored}

提取是工作的一半。我们要求Hindsight合成：

```bash
hindsight memory reflect inkling-test \
  "总结 Ben 的工程偏好和最近的架构决策。"
```

Inkling（大约 11 秒）返回了一个结构化、准确的摘要，该摘要使用了已解决的日期，甚至进行了正确的编辑：

> 2026 年 7 月 14 日，Ben 决定放弃 Kafka 管道，转而采用更简单的基于 cron 的摄取器。这一变化反映了他在架构选择上倾向于简单和高效。

没有人告诉过本喜欢简单。它是从 Kafka 到 cron 的交换推断出来的。这就是一种连接推理，让记忆感觉它理解你，而不仅仅是存储你。

## 为什么它开箱即用 {#why-this-works-out-of-the-box}

两个原因，以及一个诚实的警告。

首先，Inkling是**训练后**，不是原始基础检查点。 Thinking Machines 对它进行了聊天、代理代码和工具使用方面的训练，因此它会遵循指令并发出格式良好的输出，而无需您乞求。这就是为什么即使在 Hindsight 的软模式模式下，它也会产生有效的结构化事实，其中 JSON 形状是在提示中描述的，而不是由 API 语法强制执行的。

其次，记忆任务发挥了大模型的优势。提取和时间基础奖励广泛的世界知识和仔细的阅读，而反思则奖励综合。 Inkling 拥有这三个。

警告：Inkling是**尚未在我们的[模型排行榜](https://benchmarks.hindsight.vectorize.io)上**，一件整洁的轶事并不是一个基准。我们目前记忆存储步骤的首选是小得多的`gpt-oss-20b`，对于大容量记忆写入来说更快、更便宜。Inkling8 到 11 秒的调用是你为 975B 推理模型支付的税。所以诚实的框架是：Inkling是*非常明显*记忆能力强的大脑，对于完成数千次保留来说可能有点过分，但对于质量敏感的工作来说确实令人印象深刻。

## 当你真正达到这个目标时 {#when-you-would-actually-reach-for-this}

- **您已经在Inkling上进行构建**并希望你的智能体的记忆说出相同的模型。一位提供商，一张账单。
- **质量高于吞吐量。** 长、不明确、暂时混乱的输入，您希望提取正确，而不仅仅是快速。
- **您想要一个完全可交换的堆栈。** 开放记忆（Hindsight，MIT），开放模型（Inkling，Apache 2.0），以及无需重写即可进行更改的自由。

对于消防卷记忆写入，在存储记忆上保留一个小型快速模型，并保存Inkling以进行反思。如果需要，Hindsight 可以让您将每个端点指向不同的端点。

## 五分钟版本 {#the-five-minute-version}

1. 在[build.nvidia.com/thinkingmachines/inkling](https://build.nvidia.com/thinkingmachines/inkling)获取免费密钥。
2. 设置四个环境变量（`PROVIDER=openai`、NVIDIA `BASE_URL`、您的密钥、`MODEL=thinkingmachines/inkling`）以及`STRICT_SCHEMA=false`。
3. `pip install hindsight-api` 并运行它。
4. `retain`，`recall`，`reflect`。看着它把“上周”变成一个真正的日期。

Thinking Machines 构建Inkling 作为微调的基础。事实证明，它也是一个令人震惊的、完全零微调的记忆引擎。给你的智能体一个真正可以记忆的大脑。

## 进一步阅读 {#further-reading}

- [完全开放的智能体记忆堆栈](/blog/2026/07/17/hermes-hindsight-open-stack)：将开放模型与开放记忆端到端配对。
- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：Hindsight 对模型提取的每个事实执行什么操作。
- [Hindsight模型排行榜](https://benchmarks.hindsight.vectorize.io)：哪些法学硕士在记忆任务上得分最高。
