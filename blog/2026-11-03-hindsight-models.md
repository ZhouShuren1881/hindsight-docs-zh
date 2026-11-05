---
title: "介绍 Hindsight Models：记忆成本降低 2.5 倍、速度提升 2 倍，答案更好"
description: "LLM 负责撰写，决策模型负责判断。hs-decide-1-flash 接手 Hindsight 中的细小判断：七个 LLM 中六个的答案更好，五个的成本更低。另有专为智能体记忆构建的重排序模型和嵌入模型，提供开放权重和托管服务。"
authors: [nicoloboschi, andrewneeser, cdbartholomew, benfrank241]
date: 2026-11-03
slug: "2026/11/03/hindsight-models"
tags: [release, inference, models]
image: /img/blog/hindsight-models/cover.webp
hide_table_of_contents: false
---

import ThemedImage from '@theme/ThemedImage';
import useBaseUrl from '@docusaurus/useBaseUrl';
import YouTubeVideo from '@site/src/components/YouTubeVideo';
import { StaticImage } from '@site/src/components/StaticMedia';

**LLM 负责撰写，决策模型负责判断。** AI 应用交给 LLM 的大多数任务并不是写作，而是一些细小的判断：这是新内容吗？哪些内容重要？这些足够了吗？今天，我们发布三个专为智能体记忆构建的模型，首先是决策模型 `hs-decide-1-flash`。它直接回答这些判断问题，让 LLM 专注于撰写。

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/leaderboards/all-operations"><ThemedImage alt={"Hindsight 全部操作中各 LLM 的质量与成本；箭头连接每个 LLM 单独运行和搭配 hs-decide-1-flash 的结果，后者位于左侧（成本更低），大多数也更高（质量更好）"} sources={{light: useBaseUrl('/img/blog/hindsight-models/chart-all-operations-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/chart-all-operations-dark.png')}} /></a>

</div>

## 要点 {#tldr}

- **质量更好，成本更低。** 由 `hs-decide-1-flash` 进行细小判断后，七个 LLM 中有六个在 Hindsight 全部操作中给出更好的答案，五个的成本降低。对于 `gemini-3.8-flash`，决策模型参与的操作成本降低 2.5 倍，模型调用耗时降低 1.9 倍，得分提高 2.2 分。
- **新增 Hindsight Inference API 和开放权重。** 三个模型均通过同一个 API 托管，输入每百万 token 起价 $0.005，兼容 Cohere 和 OpenAI 客户端；新账户可获得 $5 免费额度。**[注册 Hindsight Inference →](https://inference.hindsight.vectorize.io)**（[文档](https://docs.hindsight.vectorize.io/cloud/inference/overview/)）权重已发布在 [Hugging Face](https://huggingface.co/hindsight-ai)：决策模型采用 Apache 2.0 许可证，另外两个采用 MIT 许可证。
- **低成本 LLM 的表现接近前沿模型。** `glm-5.3-flash` 搭配决策模型的得分与单独使用 `gemini-3.8-flash` 相差不到 2 分，成本降低 19 倍。
- **每次决策模型请求的中位耗时为 167 毫秒**；LLM 调用需要 1 到 7 秒。
- **更精简的召回。** Recall 可以在记忆送达智能体之前剔除不相关和重复的记忆，让智能体自身的 LLM 读取更少 token。
- **专为智能体记忆构建的重排序模型和嵌入模型。** 在八种语言的测试中，`hs-rerank-1` 和 `hs-embed-1` 的综合得分高于目前使用的小型开放模型，并可在 CPU 上运行。

<!-- truncate -->

<YouTubeVideo id="NqipFrDSZgU" title="介绍 Hindsight Models：以更低成本获得更好的智能体记忆" poster="/img/blog/hindsight-models/video-poster.jpg" duration="1:17" />

## 判断占据大部分工作 {#judgments-are-most-of-the-work}

记忆系统中充满了判断。从存入记忆到召回记忆，Hindsight 会问：这个事实是新的，还是已经知道？它会改变现有认知判断吗？哪些记忆与这个问题有关？这些证据足以回答问题吗？这条新记忆会改变那篇知识页吗？

过去 Hindsight 每次都会询问 LLM。每个答案都是一次完整的生成调用：要等待数秒，为上下文中的每个 token 付费，还要把自由文本解析回是或否。在我们的评测中，由决策模型回答这些判断问题后，LLM 调用次数减少约三分之一：每个案例从 4.5 次降至 3.1 次。

决策模型正是为这类问题构建的。向它提供状态和问题，它会返回带类型的答案：一个选择及每个选项的概率、量表上的一个分数，或某件事为真的可能性。它不生成文本，因此回答所需的时间和成本都只是原来的一小部分。

## 起源 {#where-it-started}

我们最初使用 TypeSafe 的决策模型 [Jev](https://typesafe.ai) 尝试这一做法，发现 Hindsight 的许多工作从来不需要 LLM。于是我们针对 Hindsight 所做的判断训练了自己的模型：0.8B 参数、开放权重，并支持相同的 System One 请求，因此为其中一个模型编写的应用只需更改模型名称即可在另一个上运行。

## Hindsight 如何使用决策模型 {#how-hindsight-uses-it}

Hindsight 在四个环节询问决策模型。如果没有决策模型，各环节仍完全按原来的方式运行。

**Recall：降低智能体的账单。** Recall 返回的每条记忆都会进入智能体的提示词，而对大多数团队来说，智能体自身的 LLM 是最大的成本来源。过去无论记忆是否有帮助，Recall 都会填满 token 预算。有了决策模型，它可以只向智能体提供能回答问题的内容：

- **Prune** 会剔除对查询没有帮助的记忆。它复用排序结果，因此无需额外请求，并且始终保留最佳记忆。
- **Dedup** 会剔除与排名更高的记忆重复的记忆，因此从多个文档存入的同一事实只会传给智能体一次。它需要额外一次决策模型请求，仅针对嵌入向量相似的记忆提问；日期不同或类型不同的记忆绝不会被判为重复。

记忆更少、相关性更高，意味着智能体每轮使用的 token 更少，也减少了智能体推理时需要排除的噪声。这两项默认关闭；可以按请求（`"rerank": {"prune": true, "dedup": true}`）或按记忆库开启。Reflect 和页面刷新通过 Recall 搜索，因此也能受益。（[Recall 文档](/developer/api/recall#rerank)）

**Reflect：这些证据足够吗？** Reflect 通过多轮搜索记忆来回答问题。以前每轮由 LLM 智能体执行：选择搜索工具、编写查询、读取所有结果，再决定是否继续搜索。使用决策模型后：

1. 一次 LLM 调用将请求转为搜索查询，或发现没有需要搜索的内容并立即返回。
2. 使用该查询并行执行搜索。
3. 决策模型**精简证据**：根据请求对返回内容排序并剔除无关内容，让 LLM 读取更少内容。
4. 它**判断证据是否已经回答请求**。如果是，下一次 LLM 调用便撰写答案；否则，LLM 编写下一条查询并进行另一轮搜索。
5. 记忆库有知识页时，它先询问**仅凭知识页能否回答问题**；如果可以，就跳过对原始内容的搜索。

如果决策模型失败，Reflect 会回退到智能体轮次。

**整合：这个事实是新的吗？** 整合将新事实转化为观测，即记忆库当前的认知判断。以前，每个新事实都会与可能受其影响的观测一起送给 LLM。有了决策模型，它会先处理简单的事实，每个事实问一个问题：**重述**某条观测的事实会作为证据关联到该观测，**闲聊**则会被跳过，两者都不调用 LLM。只有会改变观测内容、添加新内容或模型不确定的事实才会送给 LLM；所有观测的文本仍由 LLM 撰写。

**知识页：这会改变页面吗？** 重建页面会运行 Reflect，因此可以获得上述所有好处。节省发生在用新内容更新页面时。以前，每次更新都会针对新记忆运行 Reflect 并重写页面。有了决策模型，它会针对每条新记忆询问*这会改变页面吗？* 然后只根据可能改变页面的记忆进行编辑；如果没有任何记忆能改变页面，更新完全不会调用 LLM。

## 结果 {#results}

这里的所有数字都来自 [benchmarks.hindsight.vectorize.io](https://benchmarks.hindsight.vectorize.io)：这些是 Hindsight 自身的系统评测，在 Hindsight 1.2.0 上通过公共 API 对一台全新服务器运行。每个 LLM 都在相同案例上分别单独运行和搭配 `hs-decide-1-flash` 运行，所有结果由同一个评判模型 `gemini-3.1-flash-lite` 评分（它也是七个被测试的 LLM 之一，因此自己的结果由自己评分）。

- **质量**是通过的案例比例，每个案例均由评判模型评分；Hindsight 全部操作的质量取各操作的平均值。
- **成本**是每千个案例实际使用的 token 按标价计算的费用，其中决策模型 token 按每百万 $0.02 计入。“Hindsight 全部操作”按评测中的操作（Retain、整合、Reflect、知识页）等比例混合；实际工作负载中各操作的占比会有所不同。
- **时间**是同一轮运行的追踪记录中，每次操作花在模型调用（LLM 和决策模型）上的时间，而非端到端延迟。

每张图都以质量对成本作图，每个 LLM 对应一个点；箭头连接该 LLM 单独运行和搭配决策模型的结果。越靠左上越好。

### Hindsight 全部操作 {#all-of-hindsight}

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/leaderboards/all-operations"><ThemedImage alt={"Hindsight 全部操作：各 LLM 的质量与成本，箭头指向同一 LLM 搭配 hs-decide-1-flash 的结果"} sources={{light: useBaseUrl('/img/blog/hindsight-models/chart-all-operations-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/chart-all-operations-dark.png')}} /></a>

</div>

七个 LLM 中六个的质量提高，最需要提升的模型获益最大（`glm-5.3-flash` 73.8 → 87.1，`gemma-4-26b-a4b` 76.6 → 81.1，`deepseek-v4.1-flash` 81.9 → 85.1），`gemini-3.1-flash-lite` 基本持平（87.1 → 86.6）。LLM 调用次数减少约三分之一，读取的输入 token 减少一半或更多，因此五个模型的成本降低：`gemini-3.8-flash` $147 → $61（降低 2.4 倍）、`gemini-3.1-flash-lite` $42 → $22、`claude-haiku-5.5` $31 → $18、`gpt-6-luna` $16 → $9.88、`gemma-4-26b-a4b` $16 → $12。七个模型的调用耗时均有下降，降幅从 1.2 倍（`gemini-3.1-flash-lite`）到 1.9 倍（`gemini-3.8-flash`）。

Retain 不使用决策模型，因此两种情况下成本相同，稀释了上述总体结果。将它排除，只计算决策模型参与的整合、Reflect 和知识页操作：在 `gemini-3.8-flash` 上，它们的成本降低 2.5 倍、模型调用耗时降低 1.9 倍，得分提高 2.2 分。

**低成本 LLM 接近前沿模型配置。** `glm-5.3-flash` 搭配决策模型得分 87.1，每千个案例成本 $7.72；`gpt-6-luna` 搭配决策模型得分 87.0，成本 $9.88。单独使用 `gemini-3.8-flash` 得分 89.0，成本 $147：高约 2 分，成本却是 15–19 倍。换用更便宜的 LLM 并添加决策模型，是这些结果中最大的成本节省来源。

**调用更快。** 决策模型请求的中位耗时为 167 毫秒（p90 为 350 毫秒），并且一次回答有关某个事实或记忆的所有问题；它替代的 LLM 调用中位耗时为 1 到 7 秒，具体取决于模型。

**对大多数 LLM 而言，决策模型只占账单的一小部分。** 它自身的 token 每千个案例花费 $4 到 $7：使用 `gemini-3.8-flash` 时，$61 中有 $3.93 来自决策模型。对最便宜的 LLM，这占据账单的大部分，因此搭配决策模型后的成本更高（见下文）。

### 权衡 {#the-trade-offs}

决策模型几乎在所有地方都让 Hindsight 更便宜、更快，并在大多数地方提高质量，但并非全部：

- **Reflect** 节省最多，质量也在这里下降。在 `gemini-3.8-flash` 上，Reflect 成本降低 4.6 倍，质量从 94.1 降至 91.2。七个 LLM 中四个下降约 3 分，`gemini-3.1-flash-lite` 从 94.1 降至 85.3。
- **两个最便宜的 LLM 用略高的成本获得好得多的答案。** `glm-5.3-flash` 在 Hindsight 全部操作中从 73.8 升至 87.1（每千个案例 $4.58 → $7.72），整合得分从 36 升至 84。`deepseek-v4.1-flash` 从 81.9 升至 85.1（$10.57 → $12.21），整合得分从 68 升至 86。成本上升是因为这些 LLM 非常便宜，决策模型自身 token 的成本超过了它节省的费用。

### Reflect {#reflect}

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/leaderboards/reflect"><ThemedImage alt={"Reflect：各 LLM 的质量与成本，箭头指向同一 LLM 搭配 hs-decide-1-flash 的结果"} sources={{light: useBaseUrl('/img/blog/hindsight-models/chart-reflect-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/chart-reflect-dark.png')}} /></a>

</div>

七个箭头中五个指向左侧。LLM 的轮次数约减半（每个问题从 4.4 降至 2.5），读取的证据也只是原来的一部分，因为决策模型先对证据进行了精简：`gemini-3.8-flash` 每个问题读取 7.5K 输入 token，而非 45K。`gemini-3.8-flash` 的成本降低 4.6 倍（每千个问题 $36 → $7.91），`gemini-3.1-flash-lite` 降低 2.9 倍，`claude-haiku-5.5` 降低 2.2 倍，`gpt-6-luna` 降低 2 倍；模型调用耗时降低 1.1 到 2.1 倍。`glm-5.3-flash` 的质量提高（91.2 → 94.1），`gpt-6-luna` 保持不变（94.1），四个 LLM 下降约 3 分，`gemini-3.1-flash-lite` 从 94.1 降至 85.3。

### 知识页 {#knowledge-pages}

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/leaderboards/refresh-pages"><ThemedImage alt={"刷新页面：各 LLM 的质量与成本，箭头指向同一 LLM 搭配 hs-decide-1-flash 的结果"} sources={{light: useBaseUrl('/img/blog/hindsight-models/chart-refresh-pages-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/chart-refresh-pages-dark.png')}} /></a>

</div>

这里的箭头同时指向左上方。`gpt-6-luna` 从 82.5 升至 90.0，成本不到原来的一半（$7.33 → $3.16）；`gemini-3.1-flash-lite` 从 85.0 升至 90.0，成本降至三分之一（$17 → $5.78）；`gemini-3.8-flash` 从 82.5 升至 90.0，成本降低 3.6 倍（$65 → $18）。七个 LLM 中五个能更准确地维护页面，LLM 的调用次数也减半（每个案例约 8.5 → 4 次），因为无法改变页面的记忆不会送到 LLM。

### 整合 {#consolidation}

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/leaderboards/consolidation"><ThemedImage alt={"整合：各 LLM 的质量与成本，箭头指向同一 LLM 搭配 hs-decide-1-flash 的结果"} sources={{light: useBaseUrl('/img/blog/hindsight-models/chart-consolidation-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/chart-consolidation-dark.png')}} /></a>

</div>

所有箭头都指向上方：搭配决策模型后，七个 LLM 都能更准确地维护观测。提升最大的是 `glm-5.3-flash`，从 36 升至 84。单独使用时，它的调用全部成功，但很少更新观测：大多数未通过的检查都涉及没有任何观测引用的新事实。决策模型先处理重述和闲聊后，LLM 只收到少数需要重写观测的事实，并能处理好它们。`deepseek-v4.1-flash` 从 68 升至 86，`gemma-4-26b-a4b` 从 66 升至 82。这里的收益体现在质量和时间上，而非成本：LLM 调用次数减少约 20%，整合的模型调用耗时最多降低 2.3 倍，成本基本持平。

“这是新内容，还是已知内容？”你的应用也可能需要回答这个问题。在 Hindsight 之外，只需调用一次 [Decisions API](#hindsight-inference)。

## 在 Hindsight 中使用 {#use-them-with-hindsight}

**在自己的 Hindsight 中获得上述所有结果：只需登录一次并设置一个环境变量，无需 GPU。** 在开源 Hindsight 1.2 中，决策模型默认关闭，直到你完成设置。使用 `hindsight` 供应商后，它会用于整合、Reflect 和知识页；Recall 仍使用原有重排序模型，除非你也为 Recall 启用决策模型。新账户初始有 $5 免费额度，按照我们的评测，足以支付约 4,000 次 Reflect 中决策模型的费用。

```bash
hindsight-admin cloud login     # signs in to Hindsight Cloud and saves a key
export HINDSIGHT_API_DECISION_MODEL_PROVIDER=hindsight
export HINDSIGHT_API_RECALL_DECISION_MODEL_PROVIDER=hindsight   # optional: rank recall with it too
export HINDSIGHT_API_RECALL_DECISION_MODEL_PRUNE=true          # optional: drop results that don't help
export HINDSIGHT_API_RECALL_DECISION_MODEL_DEDUP=true          # optional: drop repeats
export HINDSIGHT_API_RERANKER_PROVIDER=hindsight
export HINDSIGHT_API_EMBEDDINGS_PROVIDER=hindsight
```

要获得上述结果，只需要前两行；其余都是可选的。如果你更愿意自行运行所有模型，重排序模型和嵌入模型可在自己的机器上、Hindsight API 进程内运行：

```bash
export HINDSIGHT_API_RERANKER_PROVIDER=local
export HINDSIGHT_API_RERANKER_LOCAL_MODEL=hindsight-ai/hs-rerank-1
export HINDSIGHT_API_EMBEDDINGS_PROVIDER=local
export HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL=hindsight-ai/hs-embed-1
```

切换嵌入模型时，必须重新生成记忆库中已存储向量的嵌入。要在 vLLM 上自行提供决策模型服务，请参阅[自行运行](/developer/decision-models#run-it-yourself)；所有设置参见[决策模型](/developer/decision-models)和[模型](/developer/models)。

## Hugging Face 上的开放权重 {#open-weights-on-hugging-face}

三个模型都属于 Hugging Face 上的 [`hindsight-ai`](https://huggingface.co/hindsight-ai) 组织，均支持英语、西班牙语、法语、德语、葡萄牙语、日语、韩语和中文。

| 模型 | 功能 | 大小 | 基于 | 许可证 | 上下文 |
|---|---|---|---|---|---|
| [`hs-decide-1-flash`](https://huggingface.co/hindsight-ai/hs-decide-1-flash) | 带类型的判断：选择、分数、可能性 | 0.8B | `Qwen/Qwen3.5-0.8B` | Apache 2.0 | 65,536 tokens |
| [`hs-rerank-1`](https://huggingface.co/hindsight-ai/hs-rerank-1) | 按文档与查询的相关性排序 | 114M | `jhu-clsp/mmBERT-small` | MIT | 8,192 tokens |
| [`hs-embed-1`](https://huggingface.co/hindsight-ai/hs-embed-1) | 将文本转为 384 维向量 | 112M | `hotchpotch/bekko-embedding-v1-a25m` | MIT | 8,192 tokens |

决策模型一次前向计算就能回答有关一个请求的所有问题，并可通过其仓库 `serving/` 文件夹中的插件在 vLLM 上提供服务。重排序模型和嵌入模型每次前向计算分别运行 15M 和 13M 参数的 Transformer（大部分权重属于词汇表），因此在 CPU 上运行很快；两者都提供 int8 ONNX 导出版本，可直接通过 Text Embeddings Inference 提供服务。

### 模型对比 {#how-they-compare}

完整表格：[Hindsight Models 基准测试](https://benchmarks.hindsight.vectorize.io/models)。

**决策模型。** 我们将 `hs-decide-1-flash` 与其他同等规模的开放决策模型进行比较：`StartLux-Decision 0.8B Instant`、`d3-lite`（vLLM Semantic Router）和 `decider-0.8b`（Mapika）。它在八项基准测试中的平均得分最高（75.6，其他模型分别为 74.5、73.4 和 66.6），优势体现在 Hindsight 所做的记忆判断上：判断新记忆是否会改变页面（79.5，其他模型为 56.0–72.0）以及跳过不会改变任何内容的刷新（89.4，其他模型为 45.0–78.3）。在通用决策基准测试中它落后于其他模型：公开的 Decision Index 测试中得分 36.1（StartLux 为 53.8），对话推断中得分 75.8（StartLux 为 83.0，`d3-lite` 为 88.0）。

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/models/decision"><ThemedImage alt={"决策模型基准测试：hs-decide-1-flash 与其他开放决策模型的对比"} sources={{light: useBaseUrl('/img/blog/hindsight-models/decision-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/decision-dark.png')}} /></a>

</div>

**重排序模型。** 对 Hindsight 用户来说，这意味着开箱即用的八种语言更好召回效果；托管版本还能将重排序工作从 API 服务器的 CPU 上移走。我们在七项基准测试中，将它与参数量最高达 278M 的开放重排序模型进行比较：英语（NanoBEIR、BRIGHT）、多语言（MIRACL，以及涵盖 8 种语言的 26 项任务集合）和记忆（KnowMeBench、MemBench、ConvoMem）。得分采用 nDCG@10；速度是在两个 CPU 线程上对 50 条记忆重排序的中位耗时。

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/models/reranker"><ThemedImage alt={"重排序模型基准测试：hs-rerank-1 与参数量最高达 278M 的开放重排序模型对比"} sources={{light: useBaseUrl('/img/blog/hindsight-models/reranker-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/reranker-dark.png')}} /></a>

</div>

**嵌入模型。** 对 Hindsight 用户来说，这意味着可以在八种语言中按语义找到记忆，也能在小型英语模型表现下降的长对话和长文档中找到记忆。我们在十二项基准测试中，将它与参数量最高达 118M 的开放嵌入模型进行比较：英语和多语言检索、长对话（BEAM）、长文档（LongEmbed）及记忆检索（LMEB）。速度是在两个 CPU 线程上处理每个查询的中位耗时。图中每组显示一项基准测试；平均值涵盖全部十二项，点击即可查看完整表格。与多语言模型比较才公平；列出仅支持英语的模型是因为它们是常见的默认选择。

<div className="post-wide">

<a href="https://benchmarks.hindsight.vectorize.io/models/embeddings"><ThemedImage alt={"嵌入模型基准测试：hs-embed-1 与参数量最高达 118M 的开放嵌入模型对比，显示十二项基准测试中的六项"} sources={{light: useBaseUrl('/img/blog/hindsight-models/embeddings-light.png'), dark: useBaseUrl('/img/blog/hindsight-models/embeddings-dark.png')}} /></a>

</div>

## Hindsight Inference {#hindsight-inference}

Hindsight Inference 向任何应用提供这三个模型。它是 Hindsight Cloud 的一部分：使用 Cloud 账户登录 [inference.hindsight.vectorize.io](https://inference.hindsight.vectorize.io)（使用相同的组织、团队和额度余额），新账户初始有 $5 免费额度。

**编写代码前，在 Playground 中试用每个模型。** 选择重排序、嵌入或决策后，界面会预填一个可编辑的示例。每次运行都会显示答案、耗时、token 数量和成本。下图中，重排序模型被问及 Mia 加入哪家公司担任首席机器学习工程师，它将正确的记忆排在首位。开启 **Drop irrelevant documents** 后，它从四条中返回两条，而不是全部返回；这与 Recall 使用的剔除方式相同：

<div className="post-wide">

<a href="https://inference.hindsight.vectorize.io/playground"><StaticImage alt="Hindsight Inference Playground：开启 Drop irrelevant documents 后，对四条记忆重排序，正确记忆排在首位并剔除两条" src="/img/blog/hindsight-models/playground-rerank.png" /></a>

</div>

结果符合预期后，Playground 会以代码形式显示相同请求（curl、Python、Cohere 或 OpenAI SDK，或 Hindsight 配置），供你复制到应用中；在 **API Keys** 下创建密钥即可。每个 API 都可以直接替换你可能已经使用的接口：

| API | 端点 | 模型 | 可直接替换 | 每百万输入 token 的价格 |
|---|---|---|---|---|
| Decisions | `POST /v1/systemone` | `hs-decide-1-flash` | System One | $0.02 |
| Reranker | `POST /v1/rerank` | `hs-rerank-1`，或使用 `hs-decide-1-flash` 同时剔除不相关文档 | Cohere Rerank | $0.015 / $0.02 |
| Embeddings | `POST /v1/embeddings` | `hs-embed-1` | OpenAI Embeddings | $0.005 |

**已经在使用 Cohere Rerank？** 将客户端指向这里并把模型设为 `hs-decide-1-flash`：代码不变，就能只返回相关内容。

三个模型都不生成文本，因此只需支付输入 token 的费用。将 Cohere 客户端指向 `https://inference.hindsight.vectorize.io`，或将 OpenAI 客户端指向 `https://inference.hindsight.vectorize.io/v1`，更改模型名称，其余代码保持不变。完整参考：[Inference 文档](https://docs.hindsight.vectorize.io/cloud/inference/overview/)。

## 试用 {#try-it}

- **自行托管的 Hindsight：** 运行 `hindsight-admin cloud login` 并[启用决策模型](/developer/decision-models)。$5 免费额度足以支付约 4,000 次 Reflect 中决策模型的费用。
- **你自己的应用：** [打开 Playground](https://inference.hindsight.vectorize.io/playground)，试用三个模型，然后创建 API 密钥（[Inference 文档](https://docs.hindsight.vectorize.io/cloud/inference/overview/)）。
- **开放权重：** 从 [Hugging Face](https://huggingface.co/hindsight-ai) 获取权重，并在 [benchmarks.hindsight.vectorize.io](https://benchmarks.hindsight.vectorize.io) 查看所有结果。
- 在 [GitHub](https://github.com/vectorize-io/hindsight) 上为我们加星。
