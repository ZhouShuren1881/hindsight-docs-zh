---
title: "会记忆的语音智能体：使用 Hindsight 为 Vapi 添加记忆"
authors: [benfrank241]
slug: "2026/06/03/vapi-persistent-memory"
date: 2026-06-03T12:00
tags: [memory, voice, ai, vapi, phone, agents, webhook, tutorial, hindsight]
description: "只需一个 webhook，即可为 Vapi 语音 AI 通话添加持久的长期记忆。在通话开始时召回来电者的历史记录，在通话结束时存入通话转录文本，无需逐轮集成。"
image: /img/blog/vapi-persistent-memory.webp
hide_table_of_contents: true
---

![会记忆的语音智能体：Vapi + Hindsight](/img/blog/vapi-persistent-memory.webp)

[Vapi](https://vapi.ai) 让你可以轻松构建生产级电话智能体：托管式语音转文本（STT）、流式文本转语音（TTS）、电话接入、转接和 LLM 循环，都可以通过一个控制台和 API 管理。记忆则需要你自行添加。

每次 Vapi 通话都从零开始。昨天解释过账户问题的来电者，今天还得再解释一遍。三周前预约过的客户，又得重新拼一遍自己的名字。上周二诊断出路由问题的智能体，到了周三又得重新发现一次。Vapi 里没有开关可以让记忆跨通话保留，不过你可以通过 webhook 轻松接入这项能力。

`hindsight-vapi` 集成只需一个 HTTP 端点，就能为任何 Vapi 助手添加长期记忆。每次通话开始时都会召回记忆，结束时则存入通话转录文本。无需逐轮集成，也无需修改助手配置或自定义工具接线。

<!-- truncate -->

## 概览 {#tldr}

- Vapi 语音智能体没有内置的跨通话记忆。
- `hindsight-vapi` 是一个 webhook 处理程序；一个端点即可处理两个方向的操作。
- 收到 `assistant-request` 时，它会召回来电者的记忆，并通过 `assistantOverrides` 返回（注入系统提示词）。
- 收到 `end-of-call-report` 时，它会以即发即忘的方式存入完整转录文本。
- 无需逐轮钩子；通话过程中不会增加延迟。记忆在每次通话开始时注入一次。

---

## 问题：Vapi 通话每次都从头开始 {#the-problem-vapi-calls-start-from-scratch}

Vapi 为语音智能体技术栈提供了清晰的抽象，包括语音转文本、LLM 循环、文本转语音、通话控制和电话服务提供方。但它没有提供能在通话之间保留信息的记忆层。每次通话都会获得全新的 LLM 上下文。转录文本由你保存，但如果不自行接入，智能体下次通话时就无法查阅它。

你可以添加一个由智能体在对话中调用的自定义工具（例如“回答前先查一下来电者的历史记录”），但这会增加第一轮响应的延迟，而且 LLM 必须记得调用它。你也可以在每个助手的系统提示词前附上一份摘要，但这要求你知道某个来电者会联系哪个助手，还要随着新通话不断更新摘要。

更简洁的方案是使用 Vapi 现有的服务器 webhook 事件。Vapi 会在通话开始时触发一个 HTTP 事件（`assistant-request`），在通话结束时再触发另一个（`end-of-call-report`）。处理这两个事件，就能在自然的节点召回和存入记忆，无需修改助手配置、增加通话中的延迟，也无需依赖 LLM 记得调用工具。

这正是 `hindsight-vapi` 的作用。

---

## 工作原理 {#how-it-works}

Vapi 的服务器架构不提供逐轮钩子。因此，记忆只会在每次通话开始时注入一次，之后通话照常进行，并在结束时存入转录文本。

```text
来电
  └─ Vapi 触发 "assistant-request" webhook
       └─ 召回记忆（查询 = 来电者的电话号码）
            └─ 通过 assistantOverrides 返回 <hindsight_memories> 系统消息
                 └─ Vapi 在通话开始前将其合并到助手配置中

通话照常进行
  （没有逐轮钩子，LLM 在整个通话中使用注入的记忆）

通话结束
  └─ Vapi 触发 "end-of-call-report" webhook
       └─ 存入完整转录文本（即发即忘，webhook 立即响应）
```

收到 `assistant-request` 时具体会发生什么：

1. **召回。** webhook 从 `message.call.customer.number` 中读取来电者的电话号码，并向 Hindsight 查询相关记忆。（如果没有电话号码——这种情况并不常见，但使用 Web 通话助手时可能发生——就会改用通用的“回访来电者”查询。）
2. **注入。** 召回的记忆会放入 `<hindsight_memories>` 块中，并作为 `assistantOverrides.model.messages` 返回。Vapi 会在 LLM 生成第一个 token 之前，将这条系统消息合并到当前助手配置中。
3. **开始通话。** 从第一个词开始，来电者的历史记录就已经在 LLM 的上下文中了。

收到 `end-of-call-report` 时会发生什么：

1. **webhook 立即响应。** Vapi 需要快速收到 200 响应；此集成会立即返回。
2. **在后台存入记忆。** 完整转录文本会通过 `asyncio.create_task` 发送给 Hindsight，采用即发即忘方式，不会阻塞请求，也不会因存入记忆耗时而导致 webhook 失败。

记忆会随着通话不断积累。同一位来电者打来第二或第三次电话后，系统就能自动召回真实的历史信息，例如过去的决定、账户详情和明确表达过的偏好。

---

## 设置：一个 Webhook 即可完成 {#setup-one-webhook-done}

这个集成是一个轻量的处理程序，可以挂载到任意 HTTP 服务器上。下面是完整的 FastAPI 示例：

### 1. 安装 {#1-install}

```bash
pip install hindsight-vapi
```

### 2. 选择 Hindsight 部署方式 {#2-pick-a-hindsight-deployment}

使用 **Hindsight Cloud** 是最快的方式：[免费注册](https://ui.hindsight.vectorize.io)，获取 API key，并将代码指向 `https://api.hindsight.vectorize.io`。无需运行守护进程。

**自托管**：只需运行以下命令：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api  # starts at http://localhost:8888
```

### 3. 接入 Webhook {#3-wire-the-webhook}

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

整个集成就是这样。一个处理程序同时处理两个方向：在 `assistant-request` 时召回记忆，在 `end-of-call-report` 时存入记忆，其他所有事件都会返回 200 OK。

### 4. 将 Vapi 指向 Webhook {#4-point-vapi-at-it}

在 Vapi 控制台中：

1. 打开 **Settings → Server URL**，粘贴你的端点（例如 `https://your-domain.com/webhook`）。
2. 启用 `assistant-request` 和 `end-of-call-report` 事件类型。

本地开发时如需建立隧道，请参阅 [Vapi 服务器事件文档](https://docs.vapi.ai/server-url)（例如使用 `ngrok` 或 `cloudflared`）。

完成后，该助手的下一次来电就会在开始和结束时分别通过 Hindsight 处理。

---

## 外呼 {#outbound-calls}

Vapi 的 `assistant-request` webhook 只会为“**呼入**”通话触发。对于外呼，你需要在创建通话时自行构建记忆覆盖项：

```python
overrides = await memory.build_assistant_overrides("Ben from Vectorize")

vapi.calls.create(
    assistant_id="...",
    assistant_overrides=overrides,
    customer={"number": "+15555550100"},
)
```

`build_assistant_overrides()` 会运行与呼入路径相同的记忆召回逻辑，并返回相同的 `assistantOverrides` 载荷。区别在于，你可以按需提供查询内容，例如来电者姓名、账户 ID 或通话主题。存入记忆的流程不变：无论呼入还是外呼，只要 Vapi 将 `end-of-call-report` 发送到你的 webhook，处理程序就会自动存入转录文本。

---

## 配置 {#configuration}

构造函数中的所有选项都可以调整：

```python
HindsightVapiWebhook(
    bank_id="vapi-support",            # 必填：要读取和写入的记忆库
    hindsight_api_url="...",           # Hindsight API URL
    api_key="hsk_...",                 # Hindsight Cloud 令牌
    recall_budget="mid",               # "low"、"mid" 或 "high"
    recall_max_tokens=4096,            # 召回记忆块的 token 上限
    enable_recall=True,                # 在通话开始时注入记忆
    enable_retain=True,                # 在通话结束时存入转录文本
    memory_prefix="Relevant memories from past conversations:\n",
)
```

需要重点关注的是 **`recall_budget`**。语音通话对延迟很敏感，但由于记忆是在每次通话开始时注入，而不是每轮注入，因此相比流式处理管道，你有更多余量。对大多数助手来说，`"mid"` 是合适的默认值。如果 Vapi 助手配置的首次响应预算已经比较紧张，可以降到 `"low"`；如果助手要处理复杂的多线程对话，而深入召回更有价值，可以调到 `"high"`。

按需启用或禁用的功能适合分阶段推出。可以先只启用记忆召回，查看记忆库中已有的内容，满意后再启用记忆存入：

```python
memory = HindsightVapiWebhook(
    bank_id="vapi-support",
    enable_recall=True,
    enable_retain=False,   # 暂不写入，只观察
)
```

要为多个助手进行**全局配置**：

```python
from hindsight_vapi import configure

configure(
    hindsight_api_url="https://api.hindsight.vectorize.io",
    api_key="hsk_...",
    recall_budget="mid",
)

# 每个助手的 webhook 只需指定 bank_id
support_memory = HindsightVapiWebhook(bank_id="vapi-support")
booking_memory = HindsightVapiWebhook(bank_id="vapi-booking")
```

---

## 记忆库范围：哪些人共享记忆？ {#bank-scoping-who-shares-memory-with-whom}

`bank_id` 决定每位来电者能看到哪些内容。

**每位来电者一个记忆库**——适用于个人助理或客户支持场景。每个电话号码使用自己的记忆库，不会与其他人混杂：

```python
caller_number = event["message"]["call"]["customer"]["number"]
memory = HindsightVapiWebhook(bank_id=f"user-{caller_number}")
```

**每个助手一个记忆库**——适用于一个 Vapi 助手处理共享工作负载的情况，例如为多个业务线安排预约的接待台：

```python
memory = HindsightVapiWebhook(bank_id="vapi-reception")
```

**每个账户一个记忆库**——在实例化 webhook 处理程序前，根据电话号码查找你自己的内部客户或账户 ID。如果同一客户可能用多个电话号码来电，这种方式更合适。

你不必只选一种。接待台共享记忆库与每位客户各自的记忆库可以合理地组合使用：为一般信息使用共享接待台记忆库，为个人历史记录使用各客户的记忆库，并通过不同路径运行两个 webhook。

---

## Vapi 记忆适用的场景 {#where-vapi-memory-shines}

只要来电者关系持续时间超过一次通话，这种集成都很适用：

- **客户支持热线**——智能体可以接着上次通话的进度继续处理，包括查看过往工单、有效的解决方法、上次通话的对方是谁以及问题是否已解决。
- **销售与客户资格评估**——智能体记得客户表达过的预算、决策时间表，以及来电者已经咨询过哪些产品。无需再问“能告诉我你想找什么吗？”
- **日程安排与预约**——智能体记得来电者的偏好（上午还是晚上、线下还是视频、重复预约习惯），可以直接推荐合适的时段，无需重新确认。
- **医疗初诊与随访**——症状历史、用药记录和先前的初诊回答可以在不同通话间延续，无需人工查阅记录（具体做法应符合你已有的合规要求）。
- **现场服务调度**——针对持续问题再次来电的人无需重新回答“你的账户号码是什么”，智能体也已知道尚未完成的工单。

这些场景的共同点是：记忆的价值会在有人第二次来电时体现出来。缺少记忆带来的不便，也恰恰从这时开始变得明显。

---

## 生产环境注意事项 {#production-notes}

从原型进入生产环境时，有几点需要了解：

**延迟。** `assistant-request` 上的记忆召回会在 Vapi 开始通话前运行，因此通话接通后不会增加逐轮延迟。根据 `recall_budget` 和记忆量，召回预计会增加约 50–300 ms。由于它只在通话开始时运行一次，而不在对话中途运行，因此延迟预算相对宽裕。

**隐私与保留。** 如果需要删除某位来电者的记忆（例如响应被遗忘权请求或关闭账户），Hindsight Python 客户端提供 `delete_bank` / `adelete_bank`，REST API 也通过 `DELETE /v1/default/banks/{bank_id}` 提供相同操作。如果记忆库以电话号码或账户 ID 为键，调用一次即可删除。

**故障隔离。** 记忆召回和存入逻辑都会在内部捕获异常并记录日志；Hindsight 调用失败不会中断 Vapi 通话。若召回出错，助手会在没有注入记忆的情况下运行（效果不会比没有接入集成更差）。若存入出错，就会丢失这一次通话的转录文本；下一次通话仍可正常进行。

**多个事件。** 处理程序会忽略它不关心的事件类型（例如通话状态变更、函数调用、通话进行中的转录文本），并返回 `None`。FastAPI 会将其转换为带空响应正文的 200 OK。你可以在记忆处理程序旁边挂载自己对这些事件的处理逻辑，两者不会冲突。

---

## 回顾 {#recap}

默认情况下，Vapi 语音智能体无法记住不同通话之间发生的事情。添加持久记忆无需重建助手、在每段对话中加入工具，或运行一个旁路服务来监视通话。你只需要一个 webhook 处理程序来完成以下操作：

- 在通话开始时召回来电者的历史记录，并通过 `assistantOverrides` 注入系统提示词。
- 在通话结束时以即发即忘的方式存入完整转录文本。

两个事件，一个端点；每次与 Vapi 助手通话都会为记忆添砖加瓦。

---

## 后续步骤 {#next-steps}

- **免费试用 Hindsight Cloud**：[注册](https://ui.hindsight.vectorize.io)，获取 API key，并将 FastAPI webhook 指向 Cloud URL。
- **运行本地示例**：在 `hindsight-integrations/vapi/` 中运行 `python examples/interactive_webhook.py --bank demo-user`，即可端到端模拟 Vapi 事件（支持 `:script`、`:end <transcript>`、`:call <number>` 和 `:memories` 命令）。
- **调整 `recall_budget`**：从 `"mid"` 开始；如果要优化首次响应延迟，可以降到 `"low"`。
- **选择符合客户模型的记忆库范围策略**：每位来电者、每个助手或每个账户分别使用记忆库。
- **浏览[完整集成列表](/integrations)**：Hermes、OpenAI Agents、n8n、Paperclip 等 30 多种集成都使用相同的底层记忆层。

---

**延伸阅读：**

- [什么是智能体记忆？](https://vectorize.io/what-is-agent-memory/)——基础概念。
- [Hindsight Vapi 集成文档](/sdks/integrations/vapi)——完整配置参考。
- [2026 年最佳 AI 智能体记忆系统](https://vectorize.io/articles/best-ai-agent-memory-systems/)——全面比较。

---
