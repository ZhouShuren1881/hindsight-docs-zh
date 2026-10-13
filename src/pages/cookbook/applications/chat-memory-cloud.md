---
sidebar_position: 3
---

# 聊天记忆应用程序（Hindsight Cloud） {#chat-memory-app-hindsight-cloud}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-memory-cloud)
:::


一个演示聊天应用程序，具有持久的每用户记忆，由 提供支持 [Hindsight Cloud](https://hindsight.vectorize.io)。支持OpenAI或 Groq 作为LLM提供商。没有本地  需要Hindsight服务器。

## 特点 {#features}

- 🧠**持久记忆**：每个用户都有自己的记忆库来记住对话
- ☁️**Hindsight Cloud**：记忆存储在云端 - 否  需要Docker设置
- 🔀**可选择的 LLM**：选择OpenAI（GPT-4o) 或 Groq (Qwen 32B)
- 🎯**按用户上下文**：每个用户的独立记忆，具有自动上下文检索功能
- 💬**实时聊天**：通过记忆增强上下文进行即时响应

## 设置 {#setup}

### 1。获取API钥匙 {#1-get-api-keys}

- **Hindsight** — 注册https://hindsight.vectorize.io
- **OpenAI** — https://platform.openai.com/api-keys
- **Groq**（替代）— 免费于 https://console.groq.com/home

### 2。配置环境 {#2-configure-environment}

编辑`.env.local` 与你的API密钥和首选提供商：

```bash
#LLM 提供商：“openai”或“groq”
LLM_PROVIDER=openai

# OpenAI（LLM_PROVIDER=openai 时必需）
OPENAI_API_KEY=sk-your-key-here

# Groq（LLM_PROVIDER=groq 时必需）
GROQ_API_KEY=gsk_your-key-here

#Hindsight Cloud
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=hsk_your-key-here
```

您还可以使用 覆盖模型 `LLM_MODEL`（默认为`gpt-4o` 为OpenAI，`qwen/qwen3-32b` 用于 Groq）。

### 3。安装依赖项 {#3-install-dependencies}

```bash
npm install
```

### 4。运行应用程序 {#4-run-the-app}

```bash
npm run dev
```

打开浏览器中的 `http://localhost:3000`。

## 它是如何工作的 {#how-it-works}

1. **用户身份**：每个浏览器会话都会获得一个唯一的用户 ID
2. **创建记忆库**：第一条消息创建了一个个人记忆库Hindsight Cloud
3. **上下文检索**：在做出反应之前，相关记忆被调出
4. **记忆增强回复**：LLM生成带有记忆上下文的响应
5. **对话存储**：保留每个对话以供将来使用

## 建筑 {#architecture}

```
User Message
     ↓
Next.js API Route (/api/chat)
     ↓
Hindsight Cloud recall() → Get relevant memories
     ↓
OpenAI or Groq → Generate response with memory context
     ↓
Hindsight Cloud retain() → Store conversation
     ↓
Response to User
```

## 记忆库结构 {#memory-bank-structure}

每个用户都有自己独立的记忆库：
- **名称**：“[userId] 的聊天记忆”
- **背景**：会话AI辅助上下文
- **倾向**：同理心 (4)、低怀疑主义 (2)、平衡的字面主义 (3)

## 尝试一下 {#try-it-out}

1. **第一次对话**：向助理介绍一下你自己
   - “嗨！我是来自旧金山的软件工程师。我喜欢 Python 和机器学习。”

2. **第二次对话**：询问它记住了什么
   - “你对我了解多少？”
   - “我喜欢什么编程语言？”

3. **构建上下文**：Continue分享偏好
   - “与其他编辑器相比，我更喜欢 VS Code”
   - “我正在做一个React项目”

4. **验证记忆**：登录[Hindsight 仪表盘](https://hindsight.vectorize.io) 查看存储的记忆

## 配置 {#configuration}

|变量|默认|说明|
|----------|---------|-------------|
|`LLM_PROVIDER`|`openai`|LLM提供商：`openai`或`groq`|
|`LLM_MODEL`|汽车|模型覆盖（默认值：`gpt-4o` / `qwen/qwen3-32b`)|
|`OPENAI_API_KEY`|—|使用OpenAI时需要|
|`GROQ_API_KEY`|—|使用 Groq 时需要|
|`HINDSIGHT_API_URL`|`https://api.hindsight.vectorize.io`|Hindsight API 端点|
|`HINDSIGHT_API_KEY`|—|您的 Hindsight API 钥匙|
