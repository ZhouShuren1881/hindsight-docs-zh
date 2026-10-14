---
sidebar_position: 3
---

# 聊天记忆应用（Hindsight Cloud） {#chat-memory-app-hindsight-cloud}


:::info 完整应用
这是一个完整、可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源代码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-memory-cloud)
:::


这是一个演示聊天应用，使用 [Hindsight Cloud](https://hindsight.vectorize.io) 为每位用户提供持久记忆。它支持 OpenAI 或 Groq 作为 LLM 提供商，无需本地运行 Hindsight 服务器。

## 功能 {#features}

- 🧠 **持久记忆**：每位用户都有自己的记忆库，可以记住对话内容
- ☁️ **Hindsight Cloud**：记忆存储在云端，无需配置 Docker
- 🔀 **可选 LLM**：可选择 OpenAI（GPT-4o）或 Groq（Qwen 32B）
- 🎯 **按用户隔离上下文**：每位用户的记忆彼此隔离，并自动检索上下文
- 💬 **实时聊天**：结合记忆上下文，即时生成回复

## 设置 {#setup}

### 1. 获取 API 密钥 {#1-get-api-keys}

- **Hindsight** — 在 https://hindsight.vectorize.io 注册
- **OpenAI** — https://platform.openai.com/api-keys
- **Groq**（可选）— 可在 https://console.groq.com/home 免费使用

### 2. 配置环境 {#2-configure-environment}

编辑 `.env.local`，填入 API 密钥并选择首选提供商：

```bash
# LLM 提供商：“openai”或“groq”
LLM_PROVIDER=openai

# OpenAI（当 LLM_PROVIDER=openai 时必需）
OPENAI_API_KEY=sk-your-key-here

# Groq（当 LLM_PROVIDER=groq 时必需）
GROQ_API_KEY=gsk_your-key-here

# Hindsight Cloud
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=hsk_your-key-here
```

你也可以通过 `LLM_MODEL` 指定模型（默认情况下，OpenAI 使用 `gpt-4o`，Groq 使用 `qwen/qwen3-32b`）。

### 3. 安装依赖 {#3-install-dependencies}

```bash
npm install
```

### 4. 运行应用 {#4-run-the-app}

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 工作原理 {#how-it-works}

1. **用户身份**：每个浏览器会话都会获得一个唯一的用户 ID。
2. **创建记忆库**：用户发送第一条消息时，Hindsight Cloud 会为其创建个人记忆库。
3. **检索上下文**：生成回复前，系统会召回相关记忆。
4. **结合记忆生成回复**：LLM 结合记忆上下文生成回复。
5. **存储对话**：每段对话都会存入记忆，以便后续提供上下文。

## 架构 {#architecture}

```
用户消息
     ↓
Next.js API 路由 (/api/chat)
     ↓
Hindsight Cloud recall() → 获取相关记忆
     ↓
OpenAI 或 Groq → 结合记忆上下文生成回复
     ↓
Hindsight Cloud retain() → 存储对话
     ↓
向用户返回回复
```

## 记忆库结构 {#memory-bank-structure}

每位用户都有一个独立的记忆库，其中包含：
- **名称**：“[userId] 的聊天记忆”
- **背景**：对话式 AI 助手的上下文
- **性格倾向**：共情倾向（4）、低怀疑倾向（2）、平衡的字面解读倾向（3）

## 试用应用 {#try-it-out}

1. **首次对话**：向助手介绍自己
   - “Hi! I'm a software engineer from San Francisco. I love Python and machine learning.”

2. **再次对话**：询问助手记得什么
   - “What do you know about me?”
   - “What programming languages do I like?”

3. **补充上下文**：继续分享偏好
   - “I prefer VS Code over other editors”
   - “I'm working on a React project”

4. **验证记忆**：登录 [Hindsight 控制台](https://hindsight.vectorize.io)，查看存储的记忆

## 配置 {#configuration}

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_PROVIDER` | `openai` | LLM 提供商：`openai` 或 `groq` |
| `LLM_MODEL` | `auto` | 覆盖所用模型（默认值：`gpt-4o` / `qwen/qwen3-32b`） |
| `OPENAI_API_KEY` | — | 使用 OpenAI 时必需 |
| `GROQ_API_KEY` | — | 使用 Groq 时必需 |
| `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` | Hindsight API 端点 |
| `HINDSIGHT_API_KEY` | — | 你的 Hindsight API 密钥 |
