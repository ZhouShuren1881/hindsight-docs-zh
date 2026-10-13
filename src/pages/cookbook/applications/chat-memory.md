---
sidebar_position: 2
---

# 聊天记忆应用程序 {#chat-memory-app}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-memory)
:::


使用 Groq 的演示聊天应用程序 `qwen/qwen3-32b` 型号Hindsight每个用户的持久记忆。

## 特点 {#features}

- 🧠**持久记忆**：每个用户都有自己的记忆库来记住对话
- 🚀**快速 AI**：由 Groq 的高速推理提供支持
- 🎯**按用户上下文**：每个用户的独立记忆，具有自动上下文检索功能
- 💬**实时聊天**：通过记忆增强上下文进行即时响应

## 设置 {#setup}

### 1。开始 Hindsight API {#1-start-hindsight-api}

首先，使用Docker启动HindsightAPI服务器：

```bash
export GROQ_API_KEY=your_groq_api_key_here

#以 Groq 作为 LLM 提供者启动 Hindsight
docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=groq \
  -e HINDSIGHT_API_LLM_API_KEY=$GROQ_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL="openai/gpt-oss-20b" \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API**：http://localhost:8888
- **控制平面界面**：http://localhost:9999

### 2。配置环境 {#2-configure-environment}

将 Groq API 密钥复制到环境文件中：

```bash
#使用 Groq API 叉更新 .env.local
echo "GROQ_API_KEY=your_groq_api_key_here" > .env.local
echo "HINDSIGHT_API_URL=http://localhost:8888" >> .env.local
```

如果你没有，你可以得到一个免费的 GroqAPI此处关键：https://console.groq.com/home

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
2. **创建记忆库**：第一条消息创建了一个个人记忆库Hindsight
3. **上下文检索**：回复前，检索相关记忆
4. **记忆增强回复**：Groq 生成具有记忆上下文的响应
5. **对话存储**：存储每个对话以供将来使用

## 建筑 {#architecture}

```
User Message
     ↓
Next.js API Route (/api/chat)
     ↓
Hindsight.recall() → Get relevant memories
     ↓
Groq API → Generate response with memory context
     ↓
Hindsight.retain() → Store conversation
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

4. **验证记忆**：访问Hindsight控制平面位于 http://localhost:9999 查看存储的记忆

## 发展 {#development}

- **Groq 模型**：用途`qwen/qwen3-32b` 快速、高质量的响应
- **记忆存储**：通过上下文分类自动保留对话
- **记忆召回**：使用 2048 token预算进行相关上下文的语义搜索
