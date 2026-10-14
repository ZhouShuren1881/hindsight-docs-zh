---
sidebar_position: 15
---

# Hindsight AI SDK：私人厨师 {#hindsight-ai-sdk---personal-chef}


:::info 完整应用
这是一个完整且可运行的应用，展示了如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/taste-ai)
:::


这是一个私人饮食助理示例，展示如何通过 [Vercel AI SDK v6](https://sdk.vercel.ai/docs) 集成 Hindsight 的三项关键功能。

## 架构：单个记忆库与用户标签 {#architecture-single-bank-with-user-tags}

本示例为所有用户共用一个 Hindsight 记忆库（`taste-ai`），并用 `user:${username}` 为每位用户的数据添加标签。

```typescript
// 所有用户共用同一个记忆库
const BANK_ID = 'taste-ai';

// 为每条记忆添加用户标签
await hindsightTools.retain.execute({
  bankId: BANK_ID,
  content: userData,
  tags: [`user:${username}`],
});
```

这种架构支持：
- **按用户查询**：筛选 `user:alice`，获取个性化结果
- **汇总洞见**：跨所有用户查询，找出热门食谱或常见饮食模式
- **简化管理**：只需维护一个记忆库，而不必为每位用户分别维护记忆库

## Hindsight 的三项集成 {#three-hindsight-integrations}

### 1. 使用记忆召回与反思推荐餐食 {#1-meal-suggestions-with-memory-recall--reflection}

采用 AI SDK 基于智能体的方式，通过 `recall` 和 `reflect` 工具收集个性化背景信息。

```typescript
const contextResult = await generateText({
  model: llmModel,
  tools: {
    recall: hindsightTools.recall,
    reflect: hindsightTools.reflect,
  },
  toolChoice: 'auto',
  prompt: `You are gathering context for personalized ${mealType} recipe suggestions.

Use the recall tool to search for the user's food preferences, dislikes, and recent meals.
Then use the reflect tool to analyze their dietary patterns and restrictions.

After gathering context, summarize their preferences and recent eating patterns.`,
});
```

AI 智能体会自主完成以下操作：
- 在记忆中搜索饮食偏好和饮食限制
- 分析近期蛋白质摄入情况，确保饮食多样
- 找出应避免的食物

### 2. 使用心智模型跟踪目标进度 {#2-goal-progress-tracking-with-mental-models}

使用心智模型自动维护有关用户进度的最新洞见。

```typescript
// 创建一个在新增餐食后自动刷新的心智模型
await hindsightTools.createMentalModel.execute({
  bankId: BANK_ID,
  mentalModelId: getMentalModelId(username, 'goals'),
  name: `${username}'s Goal Progress`,
  sourceQuery: `Analyze ${username}'s dietary goals and eating patterns.
    Describe their progress towards their stated goals (weight loss, muscle gain, etc.).`,
  tags: [`user:${username}`],
  autoRefresh: true, // 整合后自动刷新
});

// 查询心智模型，获取当前洞见
const result = await hindsightTools.queryMentalModel.execute({
  bankId: BANK_ID,
  mentalModelId: mentalModelId,
});
```

心智模型会自动：
- 跟踪用户的饮食目标进度
- 在记录每顿新餐后更新
- 提供最新洞见，无需手动刷新

### 3. 使用强制指令指定语言 {#3-language-enforcement-with-directives}

使用强制指令，确保所有回复都符合用户的语言偏好。

```typescript
await hindsightClient.createDirective(BANK_ID, {
  name: `${username}'s Language Preference`,
  content: `Always respond in ${language}. All suggestions must be in ${language}.`,
  priority: 100,
  tags: [`user:${username}`, 'directive:language'],
});
```

生成心智模型洞见时会自动注入强制指令，从而确保所有交互使用一致的语言。

## 运行示例 {#running-the-demo}

```bash
npm install
npm run dev
```

**要求：**
- Hindsight 服务器运行于 `http://localhost:8888`（或设置 `HINDSIGHT_URL`）
- Node.js 18+

## 了解更多 {#learn-more}

- [npm 上的 Hindsight AI SDK](https://www.npmjs.com/package/@vectorize-io/hindsight-ai-sdk)
- [AI SDK 文档](https://sdk.vercel.ai/docs)
