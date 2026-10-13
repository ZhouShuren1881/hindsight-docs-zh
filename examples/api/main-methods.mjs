#!/usr/bin/env node
/**
 * Hindsight 核心方法示例（Node.js）
 * 运行：node examples/api/main-methods.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 准备，文档中不展示
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// =============================================================================
// 文档示例：存储
// =============================================================================

// [docs:main-retain]
// 存储单条事实
await client.retain('my-bank', 'Alice 于 2024 年 3 月加入 Google，担任高级机器学习工程师');

// 存储对话
const conversation = `
用户：今天做了什么？
助手：评审了新的机器学习流水线架构。
用户：效果如何？
助手：很有前景，但需要改进错误处理。
`;

await client.retain('my-bank', conversation, {
    context: '每日站会对话'
});

// 批量存储多个条目
await client.retainBatch('my-bank', [
    { content: 'Bob 偏好使用 Python 进行数据科学工作' },
    { content: 'Alice 建议用 pytest 测试' },
    { content: '团队使用 GitHub 进行代码评审' }
]);
// [/docs:main-retain]


// =============================================================================
// 文档示例：召回
// =============================================================================

// [docs:main-recall]
// 基本搜索
const results = await client.recall('my-bank', 'Alice 在 Google 做什么工作？');

for (const result of results.results) {
    console.log(`- ${result.text}`);
}

// 附带选项搜索
const filteredResults = await client.recall('my-bank', '去年春天发生了什么？', {
    budget: 'high',
    maxTokens: 8192,
    types: ['world']
});

// 包含实体信息
const entityResults = await client.recall('my-bank', '介绍一下 Alice', {
    includeEntities: true,
    maxEntityTokens: 500
});

// 检查实体详情
for (const [entityId, entity] of Object.entries(entityResults.entities || {})) {
    console.log(`Entity: ${entity.canonical_name}`);
    console.log(`Observations: ${entity.observations}`);
}
// [/docs:main-recall]


// =============================================================================
// 文档示例：反思
// =============================================================================

// [docs:main-reflect]
// 基本反思
const response = await client.reflect('my-bank', '后端应该采用 TypeScript 吗？');

console.log(response.text);
console.log('\n依据：', (response.based_on || []).length, '条事实');

// 附带选项反思
const detailedResponse = await client.reflect('my-bank', "Alice 担任团队负责人的优势是什么？", {
    budget: 'high'
});

// 查看影响回答的事实
for (const fact of detailedResponse.based_on || []) {
    console.log(`- ${fact.text}`);
}
// [/docs:main-reflect]


// =============================================================================
// 文档示例：记忆列表
// =============================================================================

// [docs:main-list-memories]
// 列出全部记忆
const memories = await client.listMemories('my-bank', {
    limit: 10
});

for (const memory of memories.items) {
    console.log(`- [${memory.fact_type}] ${memory.text}`);
}

// 按类型筛选
const worldFacts = await client.listMemories('my-bank', {
    type: 'world',
    limit: 5
});

// 在记忆内搜索
const searchResults = await client.listMemories('my-bank', {
    q: 'Alice',
    limit: 10
});
// [/docs:main-list-memories]


// =============================================================================
// 清理，文档中不展示
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });

console.log('main-methods.mjs: 所有示例通过');
