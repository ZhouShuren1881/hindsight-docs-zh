---
sidebar_position: 2
---

# 聊天记忆应用 {#chat-memory-app}


:::info 完整应用
这是一个展示 Hindsight 集成方式的完整可运行应用。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-memory)
:::


这是一个演示聊天应用，使用 Groq 的 `qwen/qwen3-32b` 模型与 Hindsight 为每位用户提供持久记忆。

## 功能 {#features}

- 🧠 **持久记忆**：每位用户都有自己的记忆库，用于记住对话
- 🚀 **快速 AI**：由 Groq 的高速推理提供支持
- 🎯 **按用户隔离上下文**：每位用户的记忆相互隔离，并自动检索上下文
- 💬 **实时聊天**：结合记忆增强的上下文即时响应

## 设置 {#setup}

### 1. 启动 Hindsight API {#1-start-hindsight-api}

首先，使用 Docker 启动 Hindsight API 服务器：

```bash
export GROQ_API_KEY=your_groq_api_key_here

# 使用 Groq 作为 LLM 服务提供方启动 Hindsight
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=groq \
  -e HINDSIGHT_API_LLM_API_KEY=$GROQ_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL="openai/gpt-oss-20b" \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API**：http://localhost:8888
- **控制台界面**：http://localhost:9999

### 2. 配置环境 {#2-configure-environment}

将 Groq API 密钥复制到环境文件中：

```bash
# 在 .env.local 中填写你的 Groq API 密钥
echo "GROQ_API_KEY=your_groq_api_key_here" > .env.local
echo "HINDSIGHT_API_URL=http://localhost:8888" >> .env.local
```

如果你还没有 Groq API 密钥，可以在这里免费获取：https://console.groq.com/home

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

1. **用户身份**：每个浏览器会话都会获得一个唯一的用户 ID
2. **创建记忆库**：收到第一条消息时，Hindsight 会为该用户创建个人记忆库
3. **上下文检索**：回复之前，应用会检索相关记忆
4. **记忆增强的回复**：Groq 会结合记忆上下文生成回复
5. **存储对话**：每段对话都会存储起来，以便后续提供上下文

## 架构 {#architecture}

```
用户消息
     ↓
Next.js API Route (/api/chat)
     ↓
Hindsight.recall() → 获取相关记忆
     ↓
Groq API → 结合记忆上下文生成响应
     ↓
Hindsight.retain() → 存储对话
     ↓
向用户返回响应
```

## 记忆库结构 {#memory-bank-structure}

每位用户都有自己的独立记忆库，其中包含：
- **名称**："为 [userId] 创建的聊天记忆"
- **背景**：对话式 AI 助手的上下文
- **性格倾向**：共情倾向（4）、低怀疑倾向（2）、中等字面解读倾向（3）

## 试用 {#try-it-out}

1. **第一次对话**：向助手介绍一下自己
   - "Hi! I'm a software engineer from San Francisco. I love Python and machine learning."

2. **第二次对话**：询问它记得什么
   - "What do you know about me?"
   - "What programming languages do I like?"

3. **逐步建立上下文**：继续分享你的偏好
   - "I prefer VS Code over other editors"
   - "I'm working on a React project"

4. **验证记忆**：访问 Hindsight 控制台 http://localhost:9999，查看已存储的记忆

## 开发 {#development}

- **Groq 模型**：使用 `qwen/qwen3-32b`，以快速生成高质量回复
- **记忆存储**：自动将对话存入记忆，并按上下文分类
- **记忆检索**：使用 2048 token 的预算，通过语义搜索检索相关上下文
