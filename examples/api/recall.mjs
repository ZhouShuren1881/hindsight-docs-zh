#!/usr/bin/env node
/**
 * Hindsight 召回 API 示例（Node.js）
 * 运行：node examples/api/recall.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 准备，文档中不展示
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// 为召回示例准备数据
await client.retain('my-bank', 'Alice 在 Google 担任软件工程师');
await client.retain('my-bank', 'Alice 喜欢周末徒步');
await client.retain('my-bank', 'Bob 是与 Alice 一起工作的数据科学家');

// =============================================================================
// 文档示例
// =============================================================================

// [docs:recall-basic]
const response = await client.recall('my-bank', 'Alice 做什么工作？');

// response.results 为结果数组，每项包含：
// - id:            事实 ID
// - text:          提取的事实
// - type:          "world", "experience", or "observation"
// - context:       存储时设置的上下文标签
// - metadata:      存储时设置的 Record<string, string>
// - tags:          标签 string[]
// - entities:      关联实体名称 string[]
// - occurredStart: 事件开始的 ISO 日期时间
// - occurredEnd:   事件结束的 ISO 日期时间
// - mentionedAt:   事实存储的 ISO 日期时间
// - documentId:    事实所属文档
// - chunkId:       提取此事实的分块

// response.results 示例：
// [
//   { id: "a1b2...", text: "Alice 在 Google 担任软件工程师", type: "world", context: "career", ... },
//   { id: "c3d4...", text: "Alice 晋升为高级工程师", type: "experience", occurredStart: "2024-03-15T00:00:00Z", ... },
// ]
// [/docs:recall-basic]


// [docs:recall-with-options]
const detailedResponse = await client.recall('my-bank', 'Alice 做什么工作？', {
    types: ['world', 'experience'],
    budget: 'high',
    maxTokens: 8000,
    trace: true
});

// 访问结果
for (const r of detailedResponse.results) {
    console.log(`${r.text} (score: ${r.weight})`);
}
// [/docs:recall-with-options]


// [docs:recall-world-only]
await client.recall('my-bank', 'query', { types: ['world'] });
// [/docs:recall-world-only]


// [docs:recall-experience-only]
await client.recall('my-bank', 'query', { types: ['experience'] });
// [/docs:recall-experience-only]


// [docs:recall-observations-only]
await client.recall('my-bank', 'query', { types: ['observation'] });
// [/docs:recall-observations-only]


// [docs:recall-token-budget]
// 用相关记忆填充最多 4K token 上下文
await client.recall('my-bank', '我对 Alice 了解什么？', { maxTokens: 4096 });

// 快速查询使用较小预算
await client.recall('my-bank', "Alice 的邮箱", { maxTokens: 500 });
// [/docs:recall-token-budget]


// [docs:recall-with-tags]
// 按用户标签筛选召回
await client.recall('my-bank', '用户提供了什么反馈？', {
    tags: ['user:alice']
});
// [/docs:recall-with-tags]


// [docs:recall-tags-strict]
// 严格模式只返回标签匹配记忆，排除无标签
await client.recall('my-bank', '用户说了什么？', {
    tags: ['user:alice'],
    tagsMatch: 'any_strict'
});
// [/docs:recall-tags-strict]


// [docs:recall-tags-all]
// AND 匹配，要求包含全部指定标签
await client.recall('my-bank', '报告了哪些问题？', {
    tags: ['user:alice', 'bug-report'],
    tagsMatch: 'all_strict'
});
// [/docs:recall-tags-all]


// [docs:recall-tags-any]
await client.recall('my-bank', '沟通偏好', {
    tags: ['user:alice'],
    tagsMatch: 'any'
});
// [/docs:recall-tags-any]


// [docs:recall-tags-any-strict]
await client.recall('my-bank', '沟通偏好', {
    tags: ['user:alice'],
    tagsMatch: 'any_strict'
});
// [/docs:recall-tags-any-strict]


// [docs:recall-tags-all-mode]
await client.recall('my-bank', '沟通工具', {
    tags: ['user:alice', 'team'],
    tagsMatch: 'all'
});
// [/docs:recall-tags-all-mode]


// [docs:recall-tags-all-strict]
await client.recall('my-bank', '沟通工具', {
    tags: ['user:alice', 'team'],
    tagsMatch: 'all_strict'
});
// [/docs:recall-tags-all-strict]


// [docs:recall-source-facts]
// 召回观察及来源事实
const obsResponse = await client.recall('my-bank', '我了解 Alice 的哪些模式？', {
    types: ['observation'],
    includeSourceFacts: true,
    maxSourceFactsTokens: 4096,
});

for (const obs of obsResponse.results) {
    console.log(`观察： ${obs.text}`);
    if (obs.source_fact_ids && obsResponse.source_facts) {
        console.log('  来源：');
        for (const factId of obs.source_fact_ids) {
            const fact = obsResponse.source_facts[factId];
            if (fact) console.log(`    - [${fact.type}] ${fact.text}`);
        }
    }
}
// [/docs:recall-source-facts]


// [docs:recall-budget-levels]
// 快速查询
const quickResults = await client.recall('my-bank', "Alice 的邮箱", { budget: 'low' });

// 深入探索
const deepResults = await client.recall('my-bank', 'Alice 和 Bob 有什么关联？', { budget: 'high' });
// [/docs:recall-budget-levels]


// =============================================================================
// 清理，文档中不展示
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });

console.log('recall.mjs: 所有示例通过');
