---
title: "我用 80 行 Python 构建了一个永远不会忘记的聊天机器人"
authors: [benfrank241]
date: 2026-03-17T12:00
tags: [streamlit, tutorial, python, memory, chatbot, web-ui]
slug: python-chatbot-memory-streamlit
image: /img/blog/streamlit-chatbot-memory.webp
---

![我用 80 行 Python 构建了一个永远不会忘记的聊天机器人](/img/blog/streamlit-chatbot-memory.webp)

使用Streamlit和Hindsight构建具有持久记忆的网络聊天机器人。 Python 约 80 行，没有前端框架。 记忆在重启后仍然存在，侧边栏显示智能体记住的内容。

<!-- truncate -->

## 概览 {#tldr}

- 使用[Streamlit](https://streamlit.io/)和[Hindsight](https://ui.hindsight.vectorize.io)构建具有持久记忆的网络聊天机器人
- ~80行Python。没有前端框架，没有JavaScript，没有构建步骤。
- 浏览器刷新和服务器重新启动后记忆仍然存在
- 侧边栏显示智能体记住的内容——回忆的事实和综合的反思

---

## 问题：终端聊天机器人不发货 {#the-problem-terminal-chatbots-dont-ship}

您使用[OpenAI 和 Hindsight](/blog/2026/03/05/add-memory-to-openai-application)构建了一个具有记忆功能的聊天机器人。它在终端中工作：

```python
user_input = input("You: ")
```

对于演示来说这很好。但是，当您想与团队共享它时，“克隆此存储库并运行 `python chat.py`”并不能解决问题。

您需要一个网络用户界面。这通常意味着React、后端API、WebSocket 管道和部署管道。对于内部工具或原型，您不需要花费数周的时间。

[Streamlit](https://streamlit.io/) 为您提供纯Python 的网络应用程序。聊天组件、会话管理和内置服务器。没有前端构建。

陷阱：Streamlit 在每次交互时重新运行整个脚本。每一次点击按钮，每一条消息——从上到下。这与初始化API客户端和维护对话历史记录等有状态操作发生冲突。

本教程解决了这个问题。您将构建一个具有持久记忆和侧边栏的Python聊天机器人，该侧边栏显示智能体记住的内容，所有这些都在一个文件中。

---

## 架构：持久聊天机器人记忆如何工作 {#architecture-how-persistent-chatbot-memory-works}

```
Browser (Streamlit UI)
     ↓
st.chat_input → user message
     ↓
recall(query)       ← pull relevant memories from Hindsight
     ↓
OpenAI completion   ← inject memories into system prompt
     ↓
retain(exchange)    ← store the conversation
     ↓
st.chat_message → display response
     ↓
st.sidebar → show recalled facts + reflect button
```

三层：

- **`st.session_state`** — 每个选项卡的短暂对话历史记录（浏览器关闭时丢失）
- **[Hindsight](https://hindsight.vectorize.io)**— 重启后的持久记忆（事实、实体、[知识图谱](/blog/2026/03/12/spreading-activation-memory-graphs))
- **OpenAI** — 生成带有记忆增强上下文的响应

---

## 第 1 步 — 裸Streamlit 聊天（无记忆） {#step-1--bare-streamlit-chat-no-memory}

从工作的聊天 UI 开始。没有记忆，没有Hindsight。

```python
import streamlit as st
from openai import OpenAI

st.title("Chat")

if "messages" not in st.session_state:
    st.session_state.messages = []

openai = OpenAI()

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("说点什么"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    messages = [{"role": "system", "content": "你是一个有用的助手。"}]
    messages += st.session_state.messages

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.markdown(reply)
```

运行它：

```bash
pip install streamlit openai
streamlit run app.py
```

打开`http://localhost:8501`。你有一个聊天用户界面。

刷新浏览器选项卡。对话仍然存在（位于`st.session_state`）。

关闭选项卡并重新打开。走了。

重新启动Streamlit服务器。走了。

这就是我们正在填补的空白。

---

## 第 2 步 — 使用 Hindsight 添加持久记忆 {#step-2--add-persistent-memory-with-hindsight}

安装依赖项：

```bash
pip install hindsight-all hindsight-client
```

在单独的终端中启动Hindsight服务器：

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

> **注意：** 您还可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io) 代替自托管 — 只需将 `base_url` 更改为 `https://api.hindsight.vectorize.io` 并添加您的 API 密钥。

现在将Hindsight连接到聊天室。关键模式：使用[`@st.cache_resource`](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.cache_resource)初始化客户端一次，而不是每次重新运行。

```python
import streamlit as st
from openai import OpenAI
from hindsight_client import Hindsight

st.title("用记忆聊天")

BANK_ID = "streamlit-chatbot"
SYSTEM_PROMPT = "你是一个有长期记忆力的得力助手。"


@st.cache_resource
def get_hindsight():
    client = Hindsight(base_url="http://localhost:8888")
    client.create_bank(
        bank_id=BANK_ID,
        name="Streamlit 聊天机器人",
        mission="记住用户偏好、事实和对话历史记录。",
    )
    return client


@st.cache_resource
def get_openai():
    return OpenAI()


hindsight = get_hindsight()
openai_client = get_openai()

if "messages" not in st.session_state:
    st.session_state.messages = []

#显示聊天记录
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("说点什么"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    #记忆召回相关记忆
    with st.spinner("Remembering..."):
        memories = hindsight.recall(bank_id=BANK_ID, query=prompt, budget="low")
        memory_context = "\n".join(r.text for r in memories.results)

    system = SYSTEM_PROMPT
    if memory_context:
        system += "\n\n记忆中的相关上下文：\n" + memory_context

    messages = [{"role": "system", "content": system}] + st.session_state.messages

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.markdown(reply)

    #记忆存储 交易所
    hindsight.retain(
        bank_id=BANK_ID,
        content=f"User: {prompt}\nAssistant: {reply}",
    )
```

告诉聊天机器人你的名字。重新启动Streamlit服务器。问“我叫什么名字？”

它记得。因为`recall`从Hindsight中提取了事实并将其注入到系统提示符中。

**幕后发生了什么：** 当您调用 `retain` 时，Hindsight 从自然语言内容（实体、关系、时间戳）中提取结构化事实，并将它们存储在由嵌入式 Postgres 和 [pgvector](https://github.com/pgvector/pgvector) 支持的知识图中。当您调用 `recall` 时，它会对这些事实运行语义搜索，并返回与您的查询最相关的事实。您不需要编写模式、查询或提取逻辑。 [OpenAIAPI](https://platform.openai.com/docs/api-reference) 处理LLM 提取和生成的调用。

---

## 第 3 步 — 添加侧边栏以检查聊天机器人记忆 {#step-3--add-a-sidebar-to-inspect-chatbot-memory}

侧边栏将其从聊天机器人演示变成了记忆调试工具。你可以看到智能体回忆了什么，它存储了多少事实，并运行“反思”来获得综合结果。

这是最终的、完整的`app.py`：

```python
import streamlit as st
from openai import OpenAI
from hindsight_client import Hindsight

st.set_page_config(page_title="用记忆聊天", layout="wide")
st.title("用记忆聊天")

BANK_ID = "streamlit-chatbot"
SYSTEM_PROMPT = "你是一个有长期记忆力的得力助手。"


@st.cache_resource
def get_hindsight():
    client = Hindsight(base_url="http://localhost:8888")
    client.create_bank(
        bank_id=BANK_ID,
        name="Streamlit 聊天机器人",
        mission="记住用户偏好、事实和对话历史记录。",
    )
    return client


@st.cache_resource
def get_openai():
    return OpenAI()


hindsight = get_hindsight()
openai_client = get_openai()

if "messages" not in st.session_state:
    st.session_state.messages = []
if "last_recall" not in st.session_state:
    st.session_state.last_recall = []

#── 边栏：记忆面板 ──────────────────────────────────
with st.sidebar:
    st.header("Memory")

    memory_list = hindsight.list_memories(bank_id=BANK_ID, limit=1)
    st.metric("存储的事实", memory_list.total)

    if st.session_state.last_recall:
        st.subheader("最后召回")
        for fact in st.session_state.last_recall:
            st.caption(fact)
    else:
        st.caption("还没有回忆起任何记忆。")

    st.divider()
    reflect_query = st.text_input("问记忆问题", key="reflect_input")
    if st.button("Reflect"):
        if reflect_query:
            with st.spinner("Reflecting..."):
                reflection = hindsight.reflect(
                    bank_id=BANK_ID, query=reflect_query
                )
            st.subheader("Reflection")
            st.write(reflection.text)
        else:
            st.warning("先输入问题。")

# ── Main: Chat ─────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("说点什么"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Recall
    with st.spinner("Remembering..."):
        memories = hindsight.recall(bank_id=BANK_ID, query=prompt, budget="low")
        recalled_texts = [r.text for r in memories.results]
        st.session_state.last_recall = recalled_texts
        memory_context = "\n".join(recalled_texts)

    system = SYSTEM_PROMPT
    if memory_context:
        system += "\n\n记忆中的相关上下文：\n" + memory_context

    messages = [{"role": "system", "content": system}] + st.session_state.messages

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.markdown(reply)

    # Retain
    hindsight.retain(
        bank_id=BANK_ID,
        content=f"User: {prompt}\nAssistant: {reply}",
    )

    st.rerun()
```

运行：

```bash
export OPENAI_API_KEY=YOUR_KEY
streamlit run app.py
```

侧边栏显示：

- **存储的事实** — 总记忆数，在每次页面加载时更新
- **最后召回** — 最近查询找到的具体事实Hindsight
- **反思** — 运行 `reflect()` 并显示合成的文本输入和按钮

这对于调试（“智能体为什么这么说？”）和理解记忆如何随时间演变非常有用。

---

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

**1。 Streamlit 在每次交互时重新运行整个脚本。** 每次按钮点击、每条聊天消息、每个小部件更改都会触发完整的从上到下的重新执行。如果没有 `@st.cache_resource`，您将创建一个新的 Hindsight 客户端并在每次击键时调用 `create_bank`。缓存装饰器确保每个服务器进程初始化一次。

**2。 `st.session_state` 不是持久记忆。** 会话状态存在于Streamlit 服务器的记忆中，范围仅限于浏览器选项卡。关闭选项卡，丢失状态。重启服务器，状态丢失。 Hindsight是持久层。不要在`st.session_state`中存储任何你无法承受丢失的东西——对话显示历史记录没问题，但关键数据应该通过`retain`。

**3。阻止呼叫会冻结 UI。** `retain()`、`recall()`，尤其是 `reflect()` 是同步 HTTP 调用。当它们执行时，Streamlit UI 无响应。将它们包裹在 `st.spinner` 中，以便用户看到反馈。对于生产，请考虑在后台线程中运行记忆存储 - 用户无需等待事实提取完成即可看到下一个响应。

**4。如果部署到多人，则每个用户一个记忆库。** 该示例使用硬编码的`BANK_ID`。如果两个人使用同一个Streamlit应用程序，他们就会分享回忆。对于多用户部署，从会话标识符或身份验证 — `st_experimental_user`（Streamlit 的身份验证 API）或查询参数派生 `bank_id`。

**5。聊天消息后需要`st.rerun()`。** 如果没有它，侧边栏将不会更新最新的回忆事实，直到下一次交互。聊天处理程序末尾的 `st.rerun()` 会触发重新执行，以新的记忆召回结果刷新侧边栏。

**6。对话历史无限增长。** `st.session_state.messages` 累积每条消息。对于长时间会话，这意味着 OpenAI 的有效负载越来越大。修剪列表或切换到滑动窗口。 Hindsight 处理长期上下文 - 您不需要在提示中保留完整的对话。

---

## 权衡：Streamlit 聊天机器人与其他方法 {#tradeoffs-streamlit-chatbot-vs-other-approaches}

**Streamlit 与 Gradio**

[广播](https://www.gradio.app/) 有专用的 `gr.ChatInterface` 自动处理流媒体和消息历史记录。基本聊天的样板更少。但是 Streamlit 的侧边栏、布局选项和小部件库更适合围绕聊天构建完整的工具 - 就像这里的记忆面板。

**Streamlit 与自定义React**

如果您需要身份验证、路由、实时流或细粒度的 UI 控制，请构建一个真正的前端。 Streamlit 适用于内部工具、演示和原型，其中应用程序的工作速度比 UI 修饰更重要。

**当Streamlit正确时：**

- 团队的内部工具
- 智能体交互原型设计
- 需要 URL 而不是终端的演示
- 记忆调试和内省

**当它不是时：**

- 面向客户的生产应用程序
- 需要真实认证授权的应用
- 高并发部署（Streamlit每个会话单线程）

---

## 回顾 {#recap}

- `@st.cache_resource` 用于客户端初始化 — 运行一次，而不是每次交互
- `st.session_state`用于短暂显示状态，Hindsight用于持久记忆
响应前
- `recall`，响应后`retain` — 与终端版本相同的循环
- 侧边栏免费为您提供记忆内省——回忆事实、存储计数、按需回顾

Streamlit 处理 UI。 Hindsight 处理记忆。 OpenAI 处理生成。每个人只做一件事。

---

## 后续步骤 {#next-steps}

- **添加流媒体** 与 `st.write_stream` 和 OpenAI 的 `stream=True` 用于实时令牌输出
- **从用户身份派生`bank_id`** 使用 Streamlit 的身份验证或查询参数
- **添加“清除记忆”按钮** 调用 `hindsight.delete_bank()` 并重新创建它
- **展示知识图谱** — 在记忆召回和渲染实体连接上使用 `include_entities=True`
- **使用Streamlit社区云部署** — 添加 `OPENAI_API_KEY` 和 `HINDSIGHT_API_URL` 作为秘密
- **尝试[Hindsight Cloud](https://ui.hindsight.vectorize.io)**用于无需自托管记忆服务器的部署
- **定制智能体推理** — 使用 [性格特征](/blog/2026/03/13/disposition-aware-agents) 使您的聊天机器人更具同理心、怀疑性或文字性

具有记忆功能的聊天机器人很有用。具有可检查记忆的聊天机器人是一种开发工具。
