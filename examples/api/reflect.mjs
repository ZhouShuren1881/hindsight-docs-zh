#!/usr/bin/env node
/**
 * Hindsight 反思 API 示例（Node.js）
 * 运行：node examples/api/reflect.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 准备，文档中不展示
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// 为反思示例准备数据
await client.retain('my-bank', 'Alice 在 Google 担任软件工程师');
await client.retain('my-bank', 'Alice 已在那里工作五年');
await client.retain('my-bank', 'Alice 最近晋升为高级工程师');

// =============================================================================
// 文档示例
// =============================================================================

// [docs:reflect-basic]
await client.reflect('my-bank', '关于 Alice，我应该了解什么？');
// [/docs:reflect-basic]


// [docs:reflect-with-params]
const response = await client.reflect('my-bank', '你如何看待远程工作？', {
    budget: 'mid',
    context: "正在考虑混合办公"
});
// [/docs:reflect-with-params]


// [docs:reflect-with-context]
// 上下文帮助 LLM 理解当前情境
const contextResponse = await client.reflect('my-bank', '你如何看待此提案？', {
    context: "我们正在预算评审会议讨论第四季度支出"
});
// [/docs:reflect-with-context]


// [docs:reflect-disposition]
// 创建具有指定性格倾向的记忆库
await client.createBank('cautious-advisor', {
    name: '谨慎的顾问',
    background: '我是关注风险的财务顾问',
    disposition: {
        skepticism: 5,
        literalism: 4,
        empathy: 2
    }
});

// 反思回答体现该性格倾向
const advisorResponse = await client.reflect('cautious-advisor', '应该投资加密货币吗？');
// [/docs:reflect-disposition]


// [docs:reflect-sources]
const sourcesResponse = await client.reflect('my-bank', '介绍一下 Alice', {
    includeFacts: true
});

console.log('回答：', sourcesResponse.text);
console.log('\n依据：');
for (const fact of (sourcesResponse.based_on?.memories || [])) {
    console.log(`  - [${fact.type}] ${fact.text}`);
}
// [/docs:reflect-sources]


// [docs:reflect-with-tags]
// 反思只使用指定用户标签的记忆
await client.reflect('my-bank', '用户提供了什么反馈？', {
    tags: ['user:alice'],
    tagsMatch: 'any_strict'
});
// [/docs:reflect-with-tags]


// [docs:reflect-structured-output]
// 直接定义 JSON schema
const responseSchema = {
    type: 'object',
    properties: {
        recommendation: { type: 'string' },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        key_factors: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['recommendation', 'confidence', 'key_factors'],
};

const structuredResponse = await client.reflect('my-bank', '你了解 Alice 及其职业经历的哪些内容？', {
    responseSchema: responseSchema,
});

// 结构化输出，若返回
if (structuredResponse.structuredOutput) {
    console.log('建议：', structuredResponse.structuredOutput.recommendation || 'N/A');
    console.log('关键因素：', structuredResponse.structuredOutput.key_factors || []);
}
// [/docs:reflect-structured-output]


// =============================================================================
// 清理，文档中不展示
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });
await fetch(`${HINDSIGHT_URL}/v1/default/banks/cautious-advisor`, { method: 'DELETE' });

console.log('reflect.mjs: 所有示例通过');
