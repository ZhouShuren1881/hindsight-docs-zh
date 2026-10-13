---
title: "记住的语音智能体：使用Hindsight为Vapi添加记忆"
authors: [benfrank241]
slug: "2026/06/03/vapi-persistent-memory"
date: 2026-06-03T12:00
tags: [memory, voice, ai, vapi, phone, agents, webhook, tutorial, hindsight]
description: "使用一个 webhook 将持久的长期记忆添加到 Vapi 语音 AI 呼叫中。 在通话开始时记忆呼叫者历史记录，在通话结束时记忆存储通话记录 — 无需每轮集成。"
image: /img/blog/vapi-persistent-memory.webp
hide_table_of_contents: true
---

![记住的语音智能体：Vapi + Hindsight](/img/blog/vapi-persistent-memory.webp)

[Vapi](https://vapi.ai) 使交付智能手机生产变得非常容易 — 托管 STT、流式 TTS、电话、传输和 LLM 循环，所有这些都在单个仪表板和 API 后面。它留给你的部分是记忆。

每次Vapi调用都从零开始。昨天解释了帐户问题的来电者今天再次解释了这一问题。三周前预约的顾客必须再次拼写自己的名字。上周二诊断出路由问题的智能体在周三重新发现了该问题。跨调用的持久记忆不是您可以在 Vapi 内部打开的功能 - 但您可以通过 Webhook 插入该功能。

`hindsight-vapi` 集成为任何具有一个 HTTP 端点的 Vapi 助手添加了长期记忆。每次通话开始时都会调用记忆，并在结束时保留记录 - 无需每轮集成，无需更改助手配置，无需自定义工具接线。

<!-- truncate -->

## 概览 {#tldr}

- Vapi语音智能体没有内置的交叉调用记忆。
- `hindsight-vapi` 是一个 webhook 处理程序 - 一个端点覆盖两个方向。
- 在`assistant-request`，它为调用者调用记忆并将其作为`assistantOverrides`返回（注入系统提示符中）。
- 在`end-of-call-report`，它保留了完整的记录，即发即忘。
- 无每转挂钩。通话过程中不会增加延迟。 在通话开始时，记忆被注入**每次通话一次**。

---

## 问题：Vapi 调用从头开始 {#the-problem-vapi-calls-start-from-scratch}

Vapi 为您提供了语音智能体堆栈的清晰抽象 — 语音到文本、LLM 循环、文本到语音、呼叫控制、电话提供商。它没有为您提供在调用之间保留的记忆层。每个调用都会获得一个新的 LLM 上下文。文字记录是你可以保留的，但如果你不进行连接，智能体就无法在下次通话时访问它。

您可以使用智能体在对话期间调用的自定义工具来解决此问题（“在响应之前查找呼叫者的历史记录”），但这会增加第一轮的延迟，并且LLM必须记住调用它。您可以在每个助手的系统提示符前面添加一个摘要，但这需要您知道给定的呼叫者将拨打哪个助手，并在新呼叫到达时保持摘要最新。

更干净的解决方案是使用 Vapi 现有的服务器 Webhook 事件。 Vapi 已在呼叫开始 (`assistant-request`) 时触发 HTTP 事件，并在呼叫结束 (`end-of-call-report`) 时触发另一个 HTTP 事件。如果您处理了这两个问题，您就拥有了记忆召回和保留的自然插入点 - 无需触摸助手配置，无需增加呼叫中延迟，也无需依赖 LLM 记住调用工具。

​​这就是`hindsight-vapi`的作用。

---

## 它是如何工作的 {#how-it-works}

Vapi 不会在其服务器架构中公开每回合钩子。因此，在通话开始时会注入记忆**每次通话一次**，然后通话照常运行，并在结束时保留记录。

```text
来电
└─ Vapi 触发“助手请求”webhook
└─ 记忆召回（查询=来电者的电话号码）
└─ 作为助理返回并覆盖<hindsight_memories>系统消息
└─ Vapi 在通话开始前合并到助手配置中

通话正常进行
（没有每回合挂钩 - LLM 在整个调用过程中使用注入的记忆）

通话结束
└─ Vapi 触发“通话结束报告”webhook
└─ 记忆存储完整记录（即发即忘 — webhook 立即响应）
```

`assistant-request`实际发生了什么：

1. **记忆再现。** webhook 从 `message.call.customer.number` 中提取呼叫者的电话号码，并在 Hindsight 中查询相关记忆。 （如果没有电话号码——不常见，但可以通过网络呼叫助手实现——它就会退回到通用的“回访者”查询。）
2. **注射。** 召回的记忆被包装在`<hindsight_memories>`块中并作为`assistantOverrides.model.messages`返回——系统消息Vapi在LLM生成令牌之前合并到活动助手配置中。
3. **运行呼叫。** LLM 在其上下文中从第一个单词开始就有呼叫者的历史记录。

`end-of-call-report` 发生了什么：

1. ​​**Webhook 立即响应。** Vapi 预计很快会达到 200；积分返回 1。
2. **保留在后台运行。** 完整的成绩单通过 `asyncio.create_task` 发送到 Hindsight — 即发即忘，无阻塞，没有因保留速度慢而导致 Webhook 失败的风险。

记忆会在通话中积累。当同一呼叫者打来第二个或第三个电话时，记忆召回会自动显示真实的历史记录——过去的决定、帐户详细信息、陈述的偏好。

---

## 设置：一个 Webhook，完成 {#setup-one-webhook-done}

集成是一个瘦处理程序，您可以安装在任何 HTTP 服务器上。这是 FastAPI 的端到端版本：

### 1。安装 {#1-install}

```bash
pip install hindsight-vapi
```

### 2。选择 Hindsight 部署 {#2-pick-a-hindsight-deployment}

**Hindsight Cloud**是最快的路径 - [免费注册](https://ui.hindsight.vectorize.io)，抓住API键，将代码指向`https://api.hindsight.vectorize.io`。没有守护进程可以运行。

**自托管** 是单个命令：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api  # starts at http://localhost:8888
```

### 3。连接 Webhook {#3-wire-the-webhook}

```python
from fastapi import FastAPI, Request
from hindsight_vapi import HindsightVapiWebhook

app = FastAPI()

memory = HindsightVapiWebhook(
    bank_id="vapi-support",
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_your_token_here",
)

@app.post("/webhook")
async def vapi_webhook(request: Request):
    event = await request.json()
    response = await memory.handle(event)
    return response or {}
```

这就是整个集成。一个处理程序涵盖两个方向 - `assistant-request` 上的记忆召回，`end-of-call-report` 上的记忆存储，其他一切都返回 200 OK。

### 4。将瓦皮指向它 {#4-point-vapi-at-it}

在 Vapi 仪表板中：

1. **设置 → 服务器 URL** — 粘贴您的端点（例如，`https://your-domain.com/webhook`）
2. 启用`assistant-request`和`end-of-call-report`事件类型

请参阅[Vapi 的服务器事件文档](https://docs.vapi.ai/server-url)了解本地开发期间的隧道技巧（`ngrok`、`cloudflared`等）。

就是这样。对该助理的下一个入站呼叫将通过两端的Hindsight。

---

## 外拨电话 {#outbound-calls}

Vapi 的 `assistant-request` webhook 仅针对 **入境** 调用触发。对于出站，您需要在呼叫创建时自行构建记忆覆盖：

```python
overrides = await memory.build_assistant_overrides("Vectorize 的 Ben")

vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

`build_assistant_overrides()` 运行与入站路径相同的记忆召回逻辑，并返回相同的 `assistantOverrides` 有效负载 - 仅按需使用您提供的查询（呼叫者姓名、账户 ID、呼叫主题）。保留方面保持不变：每当 Vapi 将 `end-of-call-report` 传递到您的 webhook（入站或出站）时，处理程序都会自动保留脚本。

---

## 配置 {#configuration}

一切都可以在构造函数上调整：

```python
HindsightVapiWebhook(
    bank_id="vapi-support",            # Required: memory bank to read/write
    hindsight_api_url="...",           #Hindsight API 网址
    api_key="hsk_...",                 #Hindsight Cloudtoken
    recall_budget="mid",               # "low", "mid", or "high"
    recall_max_tokens=4096,            #记忆召回块中的token上限
    enable_recall=True,                #在通话开始时注入记忆
    enable_retain=True,                #在通话结束时存储文字记录
    memory_prefix="此前对话中的相关记忆：\n",
)
```

**`recall_budget`** 是观看的杠杆。语音呼叫对延迟敏感 - 但由于记忆注入发生在 **通话开始时** 而不是每轮，因此您比流式传输管道拥有更多的空间。 `"mid"` 是大多数助手的正确默认值。如果您的 Vapi 助手配置已经在第一响应预算上紧张，则降至 `"low"`；如果您的助手处理复杂的多线程对话，并且更深层次的记忆召回会带来回报，则可以使用`"high"`。

**选择性启用/禁用** 对于分阶段推出很有用。首先运行记忆召回，以显示记忆库中已有的内容，然后在您满意后打开记忆功能：

```python
memory = HindsightVapiWebhook(
    bank_id="vapi-support",
    enable_recall=True,
    enable_retain=False,   #先别写——只是观察
)
```

**全局配置** 对于多个助手：

```python
from hindsight_vapi import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    recall_budget="mid",
)

#每个助理 webhook 只需要bank_id
support_memory = HindsightVapiWebhook(bank_id="vapi-support")
booking_memory = HindsightVapiWebhook(bank_id="vapi-booking")
```

---

## 记忆库 范围界定：谁与谁分享记忆？ {#bank-scoping-who-shares-memory-with-whom}

`bank_id` 是控制每个呼叫者可以看到的内容的控制杆。

**每个呼叫者** — 典型的个人助理/客户支持设置。每个电话号码都有自己的记忆库，无交叉污染：

```python
caller_number = event["message"]["call"]["customer"]["number"]
memory = HindsightVapiWebhook(bank_id=f"user-{caller_number}")
```

**每个助手** — 当一名 Vapi 助理处理共享工作负载时非常有用（例如，跨多个业务线预订的接待台）：

```python
memory = HindsightVapiWebhook(bank_id="vapi-reception")
```

**每个帐户** — 您自己的内部客户或帐户 ID，在实例化 Webhook 处理程序之前从电话号码中查找。当一个客户可能从多个号码拨打电话时，这是正确的模式。

你不必选择一次。接待员 + 每个客户的设置是一个完全合理的组合 - 通过针对不同路径运行两个 Webhooks，共享接待员记忆库用于一般信息，每个客户记忆库用于个人历史记录。

---

## Vapi 记忆的闪光点 {#where-vapi-memory-shines}

集成非常适合调用者关系比调用更持久的任何情况：

- **客户支持电话线** — 智能体从上次通话中断的地方继续。过去的票证、什么有效、上一次通话的另一端是谁、解决状态。
- **销售和资质** — 智能体记住规定的预算、决策时间表以及呼叫者已经询问过哪些产品。不再需要“再次告诉我你在寻找什么”。
- **日程安排和预订** — 智能体会记住呼叫者的偏好（早上还是晚上、面对面还是视频、重复模式），并且可以建议正确的时段，而无需重新发现。
- **医疗保健摄入和随访** — 症状历史、用药笔记和之前的摄入答案可以在呼叫中进行，无需手动审查笔记（在您已经运行的任何合规状态下）。
- **现场服务调度** — 重复致电者询问持续存在的问题，跳过“您的帐号是什么”介绍，智能体已经知道待处理的工作订单。

共同点：记忆的值显示了**第二**有人打电话的时间。这也是他们最痛苦的时候。

---

## 制作笔记 {#production-notes}

一旦你完成了原型，需要了解一些事情：

**延迟。** `assistant-request` 上的记忆召回在 Vapi 开始呼叫之前运行，因此一旦呼叫生效，它就不会增加每回合的延迟。预计记忆召回会增加大约 50-300 毫秒，具体取决于 `recall_budget` 和记忆大小 - 并且因为它在通话开始时而不是在对话中间发生一次，所以预算是宽松的。

**隐私和保留。** 如果需要删除特定调用者的记忆（被遗忘权、账户关闭），则HindsightPython客户端公开`delete_bank`/`adelete_bank`，而RESTAPI在`DELETE /v1/default/banks/{bank_id}`下提供相同的操作。如果您通过电话号码或帐户 ID 输入记忆库，则只需一次调用即可删除。

**故障隔离。** 记忆召回和保留都会在内部吞下异常并记录它们 - 失败的 Hindsight 调用永远不会中断 Vapi 调用。如果记忆错误，助手会在没有注入记忆的情况下运行（并不比没有集成更糟糕）。如果保留错误，您将丢失一份成绩单；下一次通话仍然可以正常工作。

**多个事件。** 处理程序忽略它不关心的事件类型（调用状态更改、函数调用、运行时转录等）并返回 `None`，FastAPI 将其转换为带有空正文的 200 OK。您可以将这些事件的逻辑与记忆处理程序一起安装 - 它们不会冲突。

---

## 回顾 {#recap}

Vapi 语音智能体默认情况下不会记住通话之间的任何内容。添加持久记忆不需要重建您的助手，将工具插入每个对话中，或者运行一个监视呼叫的 sidecar。它需要一个 webhook 处理程序来：

- **召回** 通话开始时呼叫者的历史记录，通过`assistantOverrides`注入到系统提示符中
- **保留** 通话结束时的完整记录，即发即忘

两个事件。一个端点。 每次呼叫 Vapi 助手时，记忆都会变得更加复杂。

---

## 后续步骤 {#next-steps}

- **使用免费的Hindsight Cloud帐户试用**：[注册](https://ui.hindsight.vectorize.io)，抓住一个密钥，将 FastAPI Webhook 指向 Cloud URL
- **运行本地示例**：`hindsight-integrations/vapi/`中的`python examples/interactive_webhook.py --bank demo-user`端到端模拟Vapi事件（使用`:script`、`:end <transcript>`、`:call <number>`、`:memories`命令）
- **调音`recall_budget`**：从`"mid"`开始，如果您要优化第一响应延迟，则降至`"low"`
- **选择记忆库范围界定策略** 与您的客户模型匹配 - 每个呼叫者、每个助理或每个帐户
- **浏览[完整集成列表](https://hindsight.vectorize.io/integrations/)** — Hermes, OpenAI智能体，n8n，Paperclip，以及其他 30 多个其他人都具有相同的记忆层

---

**进一步阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/) — 基本概念
- [Hindsight Vapi 集成文档](/sdks/integrations/vapi) — 完整配置参考
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/) — 全景观比较
