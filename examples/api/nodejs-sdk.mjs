#!/usr/bin/env node
/**
 * Hindsight TypeScript / JavaScript SDK 页面示例 (docs/sdks/nodejs.mdx).
 * 运行： node examples/api/nodejs-sdk.mjs
 *
 * 快速入门和客户端初始化都以相同导入开始。ES
 * 模块每名称只能导入一次，两部分共用导入行
 * （一标记同时开关），后续部分各置独立
 * { } 块，避免重复 const 名冲突。
 */
const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 文档示例
// =============================================================================

// [docs:quickstart] // [docs:client-init]
import { HindsightClient } from '@vectorize-io/hindsight-client';

// [/docs:quickstart] // [/docs:client-init]

// [docs:client-init]
const client = new HindsightClient({
    baseUrl: 'http://localhost:8888',
});
// [/docs:client-init]

{
// [docs:quickstart]
const client = new HindsightClient({ baseUrl: 'http://localhost:8888' });

// 存入一条记忆
await client.retain('nodejs-sdk-bank', 'Alice works at Google');

// 召回记忆
const response = await client.recall('nodejs-sdk-bank', 'What does Alice do?');
for (const r of response.results) {
    console.log(r.text);
}

// Reflect：根据性格倾向生成响应
const answer = await client.reflect('nodejs-sdk-bank', 'Tell me about Alice');
console.log(answer.text);
// [/docs:quickstart]
}

{
// [docs:get-version]
const version = await client.getVersion();

console.log(version.api_version);

if (!version.features.mcp) {
    throw new Error('This server does not expose the MCP endpoint');
}
// [/docs:get-version]
}

{
// [docs:retain]
// 简单调用
await client.retain('nodejs-sdk-bank', 'Alice works at Google');

// 带选项
await client.retain('nodejs-sdk-bank', 'Alice got promoted', {
    timestamp: new Date('2024-01-15'),
    context: 'career update',
    metadata: { source: 'slack' },
    async: false,  // 设为 true 可在后台处理
});
// [/docs:retain]
}

{
// [docs:retain-batch]
await client.retainBatch('nodejs-sdk-bank', [
    { content: 'Alice works at Google', context: 'career' },
    { content: 'Bob is a data scientist', context: 'career' },
], {
    async: false,
});
// [/docs:retain-batch]
}

{
// [docs:recall]
// 简单调用，返回 RecallResponse
const response = await client.recall('nodejs-sdk-bank', 'What does Alice do?');

for (const r of response.results) {
    console.log(`${r.text} (type: ${r.type})`);
}

// 带选项
const filtered = await client.recall('nodejs-sdk-bank', 'What does Alice do?', {
    types: ['world', 'observation'],  // 按事实类型筛选
    maxTokens: 4096,
    budget: 'high',  // 'low'、'mid' 或 'high'
});
// [/docs:recall]
}

{
// [docs:reflect]
const answer = await client.reflect('nodejs-sdk-bank', 'What should I know about Alice?', {
    budget: 'low',  // 'low'、'mid' 或 'high'
    context: 'preparing for a meeting',
});

console.log(answer.text);       // 生成的响应
// [/docs:reflect]
}

{
// [docs:create-bank]
await client.createBank('nodejs-sdk-bank', {
    name: 'Assistant',
    mission: "You're a helpful AI assistant - keep track of user preferences and conversation history.",
    disposition: {
        skepticism: 3,   // 1-5：从信任到怀疑
        literalism: 3,   // 1-5：从灵活解读到字面解读
        empathy: 3,      // 1-5：从疏离到共情
    },
});
// [/docs:create-bank]
}

{
// [docs:list-memories]
const response = await client.listMemories('nodejs-sdk-bank', {
    type: 'world',  // 可选筛选
    q: 'Alice',     // 可选文本搜索
    limit: 100,
    offset: 0,
});
console.log(response);
// [/docs:list-memories]
}

// 初始化（不在文档中展示）: a document for the document examples below
await client.retain('nodejs-sdk-bank', 'Alice and Bob met to plan the launch', {
    documentId: 'conversation_001',
});

{
// [docs:get-document]
const doc = await client.getDocument('nodejs-sdk-bank', 'conversation_001');
if (doc) {
    console.log(doc);  // 找不到文档时为 null
}
// [/docs:get-document]
if (!doc) throw new Error('expected conversation_001 to exist');
}

{
// [docs:list-documents]
const response = await client.listDocuments('nodejs-sdk-bank', {
    limit: 50,
    offset: 0,
});
console.log(response);
// [/docs:list-documents]
}

// [docs:update-document]
await client.updateDocument('nodejs-sdk-bank', 'conversation_001', {
    tags: ['important', 'meeting-notes'],
});
// [/docs:update-document]

// [docs:delete-document]
await client.deleteDocument('nodejs-sdk-bank', 'conversation_001');
// [/docs:delete-document]

// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/nodejs-sdk-bank`, { method: 'DELETE' });

console.log('nodejs-sdk.mjs: All examples passed');
