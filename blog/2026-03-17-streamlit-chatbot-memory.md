---
title: "我用 80 行 Python 构建了一个永远不会忘记的聊天机器人"
authors: [benfrank241]
date: 2026-03-17T12:00
tags: [streamlit, tutorial, python, memory, chatbot, web-ui]
slug: python-chatbot-memory-streamlit
image: /img/blog/streamlit-chatbot-memory.webp
description: "用约 80 行 Python 代码，借助 Streamlit 和 Hindsight 构建网页聊天机器人。它在重启后仍保留记忆，并在侧栏展示已知内容。"
---

![我用 80 行 Python 构建了一个永远不会忘记的聊天机器人](/img/blog/streamlit-chatbot-memory.webp)

使用 Streamlit 和 Hindsight 构建具有持久记忆的 Web 聊天机器人。整个应用约 80 行 Python 代码，无需前端框架。记忆在浏览器刷新和服务器重启后仍然保留，侧边栏会显示智能体记住的内容。

<!-- truncate -->

## 概览 {#tldr}

- 使用 [Streamlit](https://streamlit.io/) 和 [Hindsight](https://ui.hindsight.vectorize.io) 构建具有持久记忆的 Web 聊天机器人
- 约 80 行 Python 代码，无需前端框架、JavaScript 或构建步骤。
- 浏览器刷新和服务器重新启动后记忆仍然存在
- 侧边栏显示智能体记住的内容，包括召回的事实和综合生成的反思

---

## 问题：终端聊天机器人难以交付 {#the-problem-terminal-chatbots-dont-ship}

你使用 [OpenAI 和 Hindsight](/blog/2026/03/05/add-memory-to-openai-application) 构建了一个带记忆功能的聊天机器人。它可以在终端中运行：

```python
user_input = input("You: ")
```

这足以用于演示。但如果你想把它分享给团队，“克隆这个仓库并运行 `python chat.py`”就行不通了。

你需要一个 Web 界面。这通常意味着要处理 React、后端 API、WebSocket 连接和部署流程。对于内部工具或原型，这些工作会耗费数周，而你并不需要这么做。

[Streamlit](https://streamlit.io/) 可以让你只用 Python 编写 Web 应用。它提供聊天组件、会话管理和内置服务器，无需构建前端。

问题在于，Streamlit 会在每次交互时从头到尾重新运行整个脚本。每次点击按钮、发送消息都会触发重新运行，这与初始化 API 客户端、维护对话历史等有状态操作相冲突。

本教程将解决这个问题。你会在一个文件中构建 Python 聊天机器人，为它添加持久记忆和侧边栏，以显示智能体记住的内容。

---

## 架构：持久聊天机器人记忆如何工作 {#architecture-how-persistent-chatbot-memory-works}

```
浏览器（Streamlit 界面）
     ↓
st.chat_input → 用户消息
     ↓
recall(query)       ← 从 Hindsight 召回相关记忆
     ↓
OpenAI completion   ← 将记忆注入系统提示
     ↓
retain(exchange)    ← 存储对话
     ↓
st.chat_message → 显示回复
     ↓
st.sidebar → 显示召回的事实和 Reflect 按钮
```

这套架构分为三层：

- **`st.session_state`** — 每个浏览器标签页独立的临时对话历史（关闭浏览器后会丢失）
- **[Hindsight](/)** — 跨重启保留的持久记忆（事实、实体和[知识图谱](/blog/2026/03/12/spreading-activation-memory-graphs)）
- **OpenAI** — 根据加入记忆的上下文生成回复

---

## 第 1 步 — 纯 Streamlit 聊天（无记忆） {#step-1--bare-streamlit-chat-no-memory}

先从一个可运行的聊天界面开始，不添加记忆，也不使用 Hindsight。

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

if prompt := st.chat_input("Say something"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    messages = [{"role": "system", "content": "You are a helpful assistant."}]
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

打开 `http://localhost:8501`，即可看到聊天界面。

刷新浏览器标签页。对话仍然存在（它保存在 `st.session_state` 中）。

关闭标签页后再重新打开，对话就消失了。

重启 Streamlit 服务器，对话也会消失。

这正是我们要弥补的缺口。

---

## 第 2 步 — 使用 Hindsight 添加持久记忆 {#step-2--add-persistent-memory-with-hindsight}

安装依赖项：

```bash
pip install hindsight-all hindsight-client
```

在另一个终端中启动 Hindsight 服务器：

```bash
export HINDSIGHT_API_LLM_API_KEY=YOUR_OPENAI_KEY
hindsight-api
```

> **注意：** 你也可以使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，无需自行托管。只需将 `base_url` 改为 `https://api.hindsight.vectorize.io`，并添加你的 API 密钥。

现在把 Hindsight 接入聊天应用。关键做法是使用 [`@st.cache_resource`](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.cache_resource) 只初始化一次客户端，而不是在每次重新运行脚本时都重新初始化。

```python
import streamlit as st
from openai import OpenAI
from hindsight_client import Hindsight

st.title("Chat with Memory")

BANK_ID = "streamlit-chatbot"
SYSTEM_PROMPT = "You are a helpful assistant with long-term memory."


@st.cache_resource
def get_hindsight():
    client = Hindsight(base_url="http://localhost:8888")
    client.create_bank(
        bank_id=BANK_ID,
        name="Streamlit Chatbot",
        mission="Remember user preferences, facts, and conversation history.",
    )
    return client


@st.cache_resource
def get_openai():
    return OpenAI()


hindsight = get_hindsight()
openai_client = get_openai()

if "messages" not in st.session_state:
    st.session_state.messages = []

# 显示聊天记录
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Say something"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 召回相关记忆
    with st.spinner("Remembering..."):
        memories = hindsight.recall(bank_id=BANK_ID, query=prompt, budget="low")
        memory_context = "\n".join(r.text for r in memories.results)

    system = SYSTEM_PROMPT
    if memory_context:
        system += "\n\nRelevant context from memory:\n" + memory_context

    messages = [{"role": "system", "content": system}] + st.session_state.messages

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.markdown(reply)

    # 存入本轮对话
    hindsight.retain(
        bank_id=BANK_ID,
        content=f"User: {prompt}\nAssistant: {reply}",
    )
```

告诉聊天机器人你的名字，然后重启 Streamlit 服务器。接着问：“我叫什么名字？”

它记得了。因为 `recall` 从 Hindsight 中召回了这条事实，并将其注入系统提示。

**幕后发生了什么：** 调用 `retain`（存入）时，Hindsight 会从自然语言内容中提取结构化事实，包括实体、关系和时间戳，并将它们存入由嵌入式 Postgres 和 [pgvector](https://github.com/pgvector/pgvector) 支持的知识图谱。调用 `recall`（召回）时，它会对这些事实执行语义检索，并返回与你的查询最相关的事实。你无需编写模式、查询或提取逻辑。提取和生成所需的大语言模型调用由 [OpenAI API](https://platform.openai.com/docs/api-reference) 处理。

---

## 第 3 步 — 添加侧边栏以检查聊天机器人记忆 {#step-3--add-a-sidebar-to-inspect-chatbot-memory}

侧边栏让这个聊天机器人演示成为记忆调试工具。你可以查看智能体召回了哪些内容、存储了多少事实，还可以运行 Reflect（反思）来综合生成答案。

这是最终的、完整的`app.py`：

```python
import streamlit as st
from openai import OpenAI
from hindsight_client import Hindsight

st.set_page_config(page_title="Chat with Memory", layout="wide")
st.title("Chat with Memory")

BANK_ID = "streamlit-chatbot"
SYSTEM_PROMPT = "You are a helpful assistant with long-term memory."


@st.cache_resource
def get_hindsight():
    client = Hindsight(base_url="http://localhost:8888")
    client.create_bank(
        bank_id=BANK_ID,
        name="Streamlit Chatbot",
        mission="Remember user preferences, facts, and conversation history.",
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

# ── 侧边栏：记忆面板 ──────────────────────────────────
with st.sidebar:
    st.header("Memory")

    memory_list = hindsight.list_memories(bank_id=BANK_ID, limit=1)
    st.metric("Stored facts", memory_list.total)

    if st.session_state.last_recall:
        st.subheader("Last recalled")
        for fact in st.session_state.last_recall:
            st.caption(fact)
    else:
        st.caption("No memories recalled yet.")

    st.divider()
    reflect_query = st.text_input("Ask memory a question", key="reflect_input")
    if st.button("Reflect"):
        if reflect_query:
            with st.spinner("Reflecting..."):
                reflection = hindsight.reflect(
                    bank_id=BANK_ID, query=reflect_query
                )
            st.subheader("Reflection")
            st.write(reflection.text)
        else:
            st.warning("Enter a question first.")

# ── 主区域：聊天 ─────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Say something"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 召回
    with st.spinner("Remembering..."):
        memories = hindsight.recall(bank_id=BANK_ID, query=prompt, budget="low")
        recalled_texts = [r.text for r in memories.results]
        st.session_state.last_recall = recalled_texts
        memory_context = "\n".join(recalled_texts)

    system = SYSTEM_PROMPT
    if memory_context:
        system += "\n\nRelevant context from memory:\n" + memory_context

    messages = [{"role": "system", "content": system}] + st.session_state.messages

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    reply = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.markdown(reply)

    # 存入对话
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
- **最后召回** — Hindsight 为最近一次查询找到的具体事实
- **反思** — 提供文本输入框和按钮，运行 `reflect()` 并显示综合生成的内容

这对于调试（“智能体为什么这么说？”）和理解记忆如何随时间演变非常有用。

---

## 陷阱和边缘情况 {#pitfalls-and-edge-cases}

**1. Streamlit 会在每次交互时重新运行整个脚本。** 每次点击按钮、发送聊天消息或更改控件，都会触发从头到尾的重新执行。如果没有 `@st.cache_resource`，每次按键都会创建新的 Hindsight 客户端并调用 `create_bank`。缓存装饰器可确保每个服务器进程只初始化一次。

**2. `st.session_state` 不等于持久记忆。** 会话状态保存在 Streamlit 服务器内存中，作用范围仅限于一个浏览器标签页。关闭标签页或重启服务器都会使状态丢失。Hindsight 才是持久存储层。不要在 `st.session_state` 中存放不能丢失的数据；用它保存对话显示历史没有问题，但关键数据应通过 `retain` 存入记忆库。

**3. 同步调用会冻结界面。** `retain()`、`recall()`，尤其是 `reflect()` 都是同步 HTTP 调用。调用执行期间，Streamlit 界面会无响应。可以将它们放在 `st.spinner` 中，让用户看到处理状态。用于生产环境时，可以考虑在后台线程中运行 `retain`；用户无需等事实提取完成后才能看到下一条回复。

**4. 多人使用时应为每位用户设置独立的记忆库。** 示例中使用了硬编码的 `BANK_ID`。如果两个人使用同一个 Streamlit 应用，他们会共享记忆。用于多用户部署时，应根据会话标识符或身份认证信息生成 `bank_id`，例如使用 `st_experimental_user`（Streamlit 的身份认证 API）或查询参数。

**5. 发送聊天消息后需要调用 `st.rerun()`。** 否则，侧边栏要等到下一次交互才会显示最新召回的事实。聊天处理逻辑末尾的 `st.rerun()` 会重新执行脚本，用最新的召回结果刷新侧边栏。

**6. 对话历史会不断增长。** `st.session_state.messages` 会累积所有消息。会话时间越长，发送给 OpenAI 的请求载荷就越大。可以裁剪列表或改用滑动窗口。Hindsight 负责处理长期上下文，因此无需在提示中保留完整对话。

---

## 权衡：Streamlit 聊天机器人与其他方法 {#tradeoffs-streamlit-chatbot-vs-other-approaches}

**Streamlit 与 Gradio**

[Gradio](https://www.gradio.app/) 提供专用的 `gr.ChatInterface`，可自动处理流式输出和消息历史。构建基础聊天应用所需的样板代码更少。不过，Streamlit 的侧边栏、布局选项和控件库更适合围绕聊天构建完整工具，例如这里的记忆面板。

**Streamlit 与自定义 React 前端**

如果你需要身份认证、路由、实时流式输出或精细控制界面，就应该构建完整的前端。Streamlit 适用于内部工具、演示和原型，在这些场景中，快速做出可用应用比打磨界面更重要。

**适合使用 Streamlit 的场景：**

- 团队的内部工具
- 智能体交互原型设计
- 需要 URL 而不是终端的演示
- 记忆调试和内省

**不适合使用 Streamlit 的场景：**

- 面向客户的生产应用程序
- 需要完善身份认证和授权的应用
- 高并发部署（Streamlit 的每个会话都使用单线程）

---

## 总结 {#recap}

- 使用 `@st.cache_resource` 初始化客户端，使其只运行一次，而不是每次交互都运行
- 使用 `st.session_state` 保存临时显示状态，使用 Hindsight 保存持久记忆
- 回复前调用 `recall`，回复后调用 `retain`，与终端版本遵循相同的循环
- 侧边栏可直接查看记忆：召回的事实、存储数量，以及按需运行的反思

Streamlit 负责界面，Hindsight 负责记忆，OpenAI 负责生成。每个工具各司其职。

---

## 后续步骤 {#next-steps}

- **添加流式输出**：结合 `st.write_stream` 和 OpenAI 的 `stream=True` 实时输出 token
- **根据用户身份生成 `bank_id`**：使用 Streamlit 身份认证或查询参数
- **添加“清除记忆”按钮**：调用 `hindsight.delete_bank()`，然后重新创建记忆库
- **展示知识图谱**：在召回记忆时使用 `include_entities=True`，并渲染实体之间的关系
- **部署到 Streamlit Community Cloud**：将 `OPENAI_API_KEY` 和 `HINDSIGHT_API_URL` 添加为机密信息
- **试用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)**，无需自行托管记忆服务器即可部署
- **定制智能体推理方式**：使用[性格倾向](/blog/2026/03/13/disposition-aware-agents)，让聊天机器人更有同理心、更审慎或更注重字面含义

带记忆的聊天机器人很有用；能够检查其记忆的聊天机器人则是开发工具。
