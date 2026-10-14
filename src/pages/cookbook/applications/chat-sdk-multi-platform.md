---
sidebar_position: 4
---

# Chat SDK 多平台机器人 {#chat-sdk-multi-platform-bot}


:::info 完整应用
这是一个完整、可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源代码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/chat-sdk-multi-platform)
:::


这是一个演示聊天机器人，可同时在 Slack 和 Discord 上运行，并共享同一个 Hindsight 记忆库。在 Slack 中告诉机器人一件事，再在 Discord 中询问它，它就会记得。

此应用基于 [Vercel Chat SDK](https://github.com/vercel/chat)、[Hindsight](https://github.com/vectorize-io/hindsight) 和 [Vercel AI SDK](https://sdk.vercel.ai) 构建。

## 功能 {#features}

- **跨平台记忆**：Slack 和 Discord 共享同一个记忆库
- **LLM 生成回复**：通过 Vercel AI SDK 使用 OpenAI
- **自动召回**：每次回复前都会检索记忆
- **自动存入**：自动存储对话内容
- **一个处理器适用于所有平台**：`withHindsightChat()` 可包装任意 Chat SDK 处理器

## 架构 {#architecture}

```
Slack 消息 ─────┐
                  ├─→ withHindsightChat() ─→ 自动召回 ─→ LLM 处理器 ─→ 自动存入
Discord 消息 ───┘                              │
                                                  ▼
                                           Hindsight API
                                           (共享记忆库)
```

## 设置 {#setup}

### 1. 启动 Hindsight API {#1-start-hindsight-api}

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- API：http://localhost:8888
- 界面：http://localhost:9999

### 2. 设置 Slack {#2-set-up-slack}

1. 前往 [api.slack.com/apps](https://api.slack.com/apps) 并创建一个新应用
2. 在 **OAuth & Permissions** 中添加以下权限范围：`app_mentions:read`、`chat:write`、`channels:history`
3. 将应用安装到你的工作区
4. 复制 **Bot User OAuth Token** 和 **Signing Secret**

### 3. 设置 Discord {#3-set-up-discord}

1. 前往 [discord.com/developers/applications](https://discord.com/developers/applications) 并创建一个新应用
2. 在 **Bot** 下点击 **Reset Token** 并复制令牌
3. 在 Privileged Gateway Intents 下启用 **Message Content Intent**
4. 在 **General Information** 下复制 **Application ID** 和 **Public Key**
5. 在 **OAuth2 > URL Generator** 下选择范围 `bot` 和 `applications.commands`，并选择权限：发送消息、读取消息历史记录
6. 使用生成的 URL 将机器人邀请到你的服务器

### 4. 配置环境 {#4-configure-environment}

```bash
cp .env.example .env.local
# 使用你的令牌编辑 .env.local
```

也可以手动创建 `.env.local`：

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_PUBLIC_KEY=...
DISCORD_APPLICATION_ID=...
DISCORD_MENTION_ROLE_IDS=...  # 可选：以逗号分隔的角色 ID

# Hindsight
HINDSIGHT_API_URL=http://localhost:8888

# LLM
OPENAI_API_KEY=sk-...
```

### 5. 暴露本地服务器 {#5-expose-your-local-server}

Discord 和 Slack 需要能够访问你的 webhook 端点：

```bash
ngrok http 3000
```

- 将 Slack 的 **Event Subscriptions > Request URL** 设为 `https://your-ngrok-url/api/webhooks/slack`
- 将 Discord 的 **Interactions Endpoint URL** 设为 `https://your-ngrok-url/api/webhooks/discord`

### 6. 安装并运行 {#6-install-and-run}

```bash
npm install
npm run dev
```

### 7. 启动 Discord Gateway {#7-start-the-discord-gateway}

Discord 需要通过 WebSocket 连接来接收消息（Slack 则通过 HTTP 推送事件）。开发服务器启动后，在浏览器中打开以下 URL：

```
http://localhost:3000/api/discord/gateway
```

这会让 Gateway 连接保持活动状态 10 分钟。在生产环境中，可以使用 cron 作业重新启动它。

## 试试看 {#try-it}

1. **Slack**：`@memory-bot I'm building a Rust compiler that targets WebAssembly`
2. 等待几秒钟，让 Hindsight 为这条记忆建立索引
3. **Discord**：`@memory-bot what am I working on?`
4. 机器人会从 Slack 中召回关于 Rust/WebAssembly 的记忆

## 工作原理 {#how-it-works}

关键文件是 `lib/bot.ts`。Slack 和 Discord 适配器都注册到同一个 Chat 实例，两个处理器也都通过共享的记忆库 ID 使用 `withHindsightChat()`：

```typescript
bot.onNewMention(
  withHindsightChat(
    {
      client: hindsight,
      bankId: () => BANK_ID,    // 所有平台使用同一个记忆库
      retain: { enabled: true },
    },
    async (thread, message, ctx) => {
      const system = ctx.memoriesAsSystemPrompt();
      // ... 使用记忆上下文生成 LLM 回复
    }
  )
);
```

- **`client`**：指向你的 Hindsight API 的 `@vectorize-io/hindsight-client` 实例
- **`bankId`**：静态字符串或函数；共享记忆库即可实现跨平台记忆
- **`ctx.memoriesAsSystemPrompt()`**：将召回的记忆整理为 LLM 系统提示
- **`ctx.retain()`**：将对话内容存回记忆库

## 记忆库 ID 策略 {#bank-id-strategies}

| 策略 | 示例 | 用途 |
|----------|---------|----------|
| 静态 | `bankId: 'demo'` | 团队共享记忆 |
| 按用户 | `bankId: (msg) => msg.author.userId` | 为每位用户隔离记忆 |
| 跨平台身份 | 将平台 ID 映射到规范用户 | 同一用户在任何平台上使用同一个记忆库 |

## 许可证 {#license}

MIT
