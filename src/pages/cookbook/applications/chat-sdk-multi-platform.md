---
sidebar_position: 4
---

# 聊天SDK 多平台机器人 {#chat-sdk-multi-platform-bot}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-sdk-multi-platform)
:::


一个演示聊天机器人，同时在 Slack 和 Discord 上运行，共享一个 Hindsight 记忆库。在 Slack 中告诉机器人一些事情，在 Discord 中询问它，它就会记住。

内置[Vercel Chat SDK](https://github.com/vercel/chat)，[Hindsight](https://github.com/vectorize-io/hindsight)，和[Vercel AI SDK](https://sdk.vercel.ai)。

## 特点 {#features}

- **跨平台记忆**：Slack 和 Discord 共享一个记忆库
- **LLM 生成的回复**：用途OpenAI通过VercelAISDK
- **自动召回**：每次回复前都会检索记忆
- **自动存储**：对话自动存储
- **一个处理器支持所有平台**：`withHindsightChat()` 包含任何聊天SDK处理程序

## 建筑 {#architecture}

```
Slack message ─────┐
                    ├─→ withHindsightChat() ─→ auto-recall ─→ LLM handler ─→ auto-retain
Discord message ───┘                              │
                                                  ▼
                                           Hindsight API
                                           (shared bank)
```

## 设置 {#setup}

### 1。开始 Hindsight API {#1-start-hindsight-api}

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- API：http://localhost:8888
- 用户界面：http://localhost:9999

### 2。设置松弛 {#2-set-up-slack}

1. 前往[api.slack.com/apps](https://api.slack.com/apps) 并创建一个新应用程序
2. 下**OAuth 与权限（OAuth & Permissions）**，添加范围：`app_mentions:read`，`chat:write`，`channels:history`
3. 将应用程序安装到您的工作区
4. 复制**机器人用户 OAuth 令牌（Bot User OAuth Token）** 和 **签名密钥（Signing Secret）**

### 3。设置不和谐 {#3-set-up-discord}

1. 前往[discord.com/developers/applications](https://discord.com/developers/applications) 并创建一个新应用程序
2. 下**机器人（Bot）**，点击**重置令牌（Reset Token）**并复制
3. 启用特权网关意图下的 **消息内容权限（Message Content Intent）**
4. 下**基本信息（General Information）**，复制**应用 ID（Application ID）** 和 **公钥（Public Key）**
5. 下**OAuth2 > URL 生成器（OAuth2 > URL Generator）**，选择范围`bot` + `applications.commands`，权限：发送消息、读取消息历史记录
6. 使用生成的 URL 邀请机器人到您的服务器

### 4。配置环境 {#4-configure-environment}

```bash
cp .env.example .env.local
#使用您的令牌编辑 .env.local
```

或创建`.env.local` 手动：

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_PUBLIC_KEY=...
DISCORD_APPLICATION_ID=...
DISCORD_MENTION_ROLE_IDS=...  #可选：以逗号分隔的角色 ID

# Hindsight
HINDSIGHT_API_URL=http://localhost:8888

# LLM
OPENAI_API_KEY=sk-...
```

### 5。公开您的本地服务器 {#5-expose-your-local-server}

Discord 和 Slack 需要到达您的 webhook 端点：

```bash
ngrok http 3000
```

- 设置 Slack 的 **事件订阅 > 请求 URL（Event Subscriptions > Request URL）**至`https://your-ngrok-url/api/webhooks/slack`
- 设置 Discord **交互端点 URL（Interactions Endpoint URL）**至`https://your-ngrok-url/api/webhooks/discord`

### 6。安装并运行 {#6-install-and-run}

```bash
npm install
npm run dev
```

### 7。启动 Discord 网关 {#7-start-the-discord-gateway}

Discord 需要 WebSocket 连接来接收消息（与通过 HTTP 推送事件的 Slack 不同）。开发服务器启动后，在浏览器中打开此 URL：

```
http://localhost:3000/api/discord/gateway
```

这可以使网关连接保持活动状态 10 分钟。在生产中，使用 cron 作业来重新启动它。

## 尝试一下 {#try-it}

1. **Slack**：`@memory-bot 我正在构建面向 WebAssembly 的 Rust 编译器`
2. 等待几秒钟Hindsight索引记忆
3. **Discord**：`@memory-bot 我正在做什么？`
4. 机器人从 Slack 中回忆起 Rust/WebAssembly 记忆

## 它是如何工作的 {#how-it-works}

密钥文件是`lib/bot.ts`。 Slack 和 Discord 适配器都注册到同一个 Chat 实例，并且两个处理程序都使用 `withHindsightChat()` 具有共享记忆库 ID：

```typescript
bot.onNewMention(
  withHindsightChat(
    {
      client: hindsight,
      bankId: () => BANK_ID,    //所有平台都有相同的记忆库
      retain: { enabled: true },
    },
    async (thread, message, ctx) => {
      const system = ctx.memoriesAsSystemPrompt();
      //... 使用记忆上下文生成 LLM 响应
    }
  )
);
```

- **`client`**：A`@vectorize-io/hindsight-client` 指向您的实例HindsightAPI
- **`bankId`**：静态字符串或函数——共享记忆库=跨平台记忆
- **`ctx.memoriesAsSystemPrompt()`**：格式化调用的记忆LLM系统提示
- **`ctx.retain()`**：将对话内容存储回记忆库

## 记忆库 ID 策略 {#bank-id-strategies}

|策略|示例|使用案例|
|----------|---------|----------|
|静态|`bankId: 'demo'`|共享团队记忆|
|每个用户|`bankId: (msg) => msg.author.userId`|每个用户的独立记忆|
|跨平台身份|将平台 ID 映射到规范用户|相同用户，相同记忆库，任何平台|

## 许可证 {#license}

MIT
