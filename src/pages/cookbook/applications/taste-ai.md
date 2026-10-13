---
sidebar_position: 15
---

# Hindsight AI SDK - 私人厨师 {#hindsight-ai-sdk---personal-chef}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/taste-ai)
:::


私人餐饮助理演示三个关键Hindsight使用 进行集成 [Vercel AI SDK v6](https://sdk.vercel.ai/docs)。

## 架构：带有用户标签的单一记忆库 {#architecture-single-bank-with-user-tags}

此演示使用 **单个 Hindsight 记忆库** (`taste-ai`) 对于所有用户，每个用户的数据使用 进行标记 `user:${username}`。

```typescript
//所有用户共享相同的记忆库
const BANK_ID = 'taste-ai';

//每个记忆都带有用户标签
await hindsightTools.retain.execute({
  bankId: BANK_ID,
  content: userData,
  tags: [`user:${username}`],
});
```

该架构支持：
- **按用户查询**：按筛选 `user:alice` 获得个性化结果
- **聚合洞见**：查询所有用户以查找流行食谱或常见饮食模式
- **简化管理**：维护一个记忆库而不是每个用户的记忆库

## 三Hindsight集成 {#three-hindsight-integrations}

### 1。带有记忆、记忆和反思的膳食建议 {#1-meal-suggestions-with-memory-recall--reflection}

用途`recall` 和 `reflect` 工具AISDK基于智能身体的方法来收集个性化背景。

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

AI智能体自主：
- 搜索记忆以了解美食偏好和饮食限制
- 分析最近的蛋白质消耗情况
- 识别要避免的食物

### 2。用心智模型跟踪目标进度 {#2-goal-progress-tracking-with-mental-models}

使用心智模型自动维护有关用户进度的最新见解。

```typescript
//创建新餐后自动刷新的心智模型
await hindsightTools.createMentalModel.execute({
  bankId: BANK_ID,
  mentalModelId: getMentalModelId(username, 'goals'),
  name: `${username}'s Goal Progress`,
  sourceQuery: `Analyze ${username}'s dietary goals and eating patterns.
    Describe their progress towards their stated goals (weight loss, muscle gain, etc.).`,
  tags: [`user:${username}`],
  autoRefresh: true, //整合后自动刷新
});

//查询心智模型以获取当前见解
const result = await hindsightTools.queryMentalModel.execute({
  bankId: BANK_ID,
  mentalModelId: mentalModelId,
});
```

心智模型自动：
- 跟踪饮食目标的进展
- 记录每顿新餐后更新
- 提供新鲜见解，无需手动刷新

### 3。通过指令执行语言 {#3-language-enforcement-with-directives}

使用指令确保所有响应都符合用户的语言偏好。

```typescript
await hindsightClient.createDirective(BANK_ID, {
  name: `${username}'s Language Preference`,
  content: `Always respond in ${language}. All suggestions must be in ${language}.`,
  priority: 100,
  tags: [`user:${username}`, 'directive:language'],
});
```

当心智模型生成见解时，指令会自动注入，确保所有交互中的语言一致。

## 运行演示 {#running-the-demo}

```bash
npm install
npm run dev
```

**要求：**
- Hindsight服务器运行于 `http://localhost:8888`（或设置`HINDSIGHT_URL`)
- Node.js 18+

## 了解更多 {#learn-more}

- [npm 上的 Hindsight AI SDK](https://www.npmjs.com/package/@vectorize-io/hindsight-ai-sdk)
- [AI SDK 文档](https://sdk.vercel.ai/docs)
