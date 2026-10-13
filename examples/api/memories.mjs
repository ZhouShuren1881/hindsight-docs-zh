#!/usr/bin/env node
/**
 * Hindsight 记忆 API 示例 (Node.js) — 读取、列出和整理记忆单元。
 * 运行： node examples/api/memories.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const BANK_ID = 'memories-demo-bank';

// 高层客户端尚无 PATCH，整理通过 fetch。
const patchMemory = (memoryId, body) =>
    fetch(`${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
await client.createBank(BANK_ID, { name: '记忆演示' });
await client.retain(BANK_ID, '助手在 2023 年访问巴黎。');
await client.retain(BANK_ID, '部署服务器 srv-04 运行 PostgreSQL 14。');
await new Promise(r => setTimeout(r, 3000));

// =============================================================================
// 文档示例
// =============================================================================

// [docs:list-memories]
// 列出记忆单元，默认包含失效行。
const memories = await client.listMemories(BANK_ID);
for (const unit of memories.items) {
    console.log(`- [${unit.fact_type}] ${unit.text}`);
}

// 仅筛选失效事实，如审查重复项.
const invalidated = await client.listMemories(BANK_ID, { state: 'invalidated' });
console.log(`${invalidated.items.length} 条失效事实`);
// [/docs:list-memories]

// 选择 world/experience 原始事实整理。
const fact = memories.items.find(u => u.fact_type === 'world' || u.fact_type === 'experience');
if (!fact) {
    await client.deleteBank(BANK_ID);
    console.log('memories.mjs: 全部示例通过 (尚未提取事实)');
    process.exit(0);
}
const memoryId = fact.id;

// [docs:get-memory]
// 获取单个记忆单元（元数据、实体、日期、状态）.
const memory = await (
    await fetch(`${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}/memories/${memoryId}`)
).json();
console.log(`Text: ${memory.text}`);
console.log(`Type: ${memory.type}  Entities: ${memory.entities}`);
// [/docs:get-memory]

// [docs:edit-memory]
// 修正文本，重新嵌入、移除派生观察及链接，
// 自动重新整合并重算图。
await patchMemory(memoryId, { text: '用户在 2023 年访问巴黎。', reason: '主体错误' });
// [/docs:edit-memory]

// [docs:edit-memory-fields]
// 一次修正日期、类型和实体。空字符串清字段；
// entities 替换集合（[] 全解除），省略则不变。
// resolve_entities: false 防止输入实体名匹配
// 到已有的相似实体。
await patchMemory(memoryId, {
    occurred_start: '2023-06-01',
    fact_type: 'experience',
    entities: ['Alice', 'Paris'],
    resolve_entities: false,
});
// [/docs:edit-memory-fields]

// [docs:invalidate-memory]
// 使事实软失效：移出召回/整合/图，剪除链接，
// 重新计算不含它的观察，但保留审计。
await patchMemory(memoryId, { state: 'invalidated', reason: '服务器于 2026-06-01 停用' });
// [/docs:invalidate-memory]

// [docs:restore-memory]
// 恢复此前失效事实。
await patchMemory(memoryId, { state: 'valid' });
// [/docs:restore-memory]

// 派生观察展示来源到达时的演变。
const observation = memories.items.find(u => u.fact_type === 'observation');
if (observation) {
    // [docs:observation-history]
    // 获取派生观察刷新历史.
    const history = await (
        await fetch(`${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}/memories/${observation.id}/history`)
    ).json();
    console.log(`观察历史条目： ${history.length}`);
    // [/docs:observation-history]
}

// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await client.deleteBank(BANK_ID);

console.log('memories.mjs: 全部示例通过');
