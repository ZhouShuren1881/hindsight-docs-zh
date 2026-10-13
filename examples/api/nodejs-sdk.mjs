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

// 存储记忆
await client.retain('nodejs-sdk-bank', 'Alice 在 Google 工作');

// 召回记忆
const response = await client.recall('nodejs-sdk-bank', 'Alice 做什么工作？');
for (const r of response.results) {
    console.log(r.text);
}

// 反思，依据倾向生成回复
const answer = await client.reflect('nodejs-sdk-bank', '介绍一下 Alice');
console.log(answer.text);
// [/docs:quickstart]
}

{
// [docs:get-version]
const version = await client.getVersion();

console.log(version.api_version);

if (!version.features.mcp) {
    throw new Error('此服务器未提供 MCP 端点');
}
// [/docs:get-version]
}

{
// [docs:retain]
// Simple
await client.retain('nodejs-sdk-bank', 'Alice 在 Google 工作');

// 带选项
await client.retain('nodejs-sdk-bank', 'Alice 升职了', {
    timestamp: new Date('2024-01-15'),
    context: '职业动态',
    metadata: { source: 'slack' },
    async: false,  // Set true for background processing
});
// [/docs:retain]
}

{
// [docs:retain-batch]
await client.retainBatch('nodejs-sdk-bank', [
    { content: 'Alice 在 Google 工作', context: '职业' },
    { content: 'Bob 是数据科学家', context: '职业' },
], {
    async: false,
});
// [/docs:retain-batch]
}

{
// [docs:recall]
// 简单调用，返回 RecallResponse
const response = await client.recall('nodejs-sdk-bank', 'Alice 做什么工作？');

for (const r of response.results) {
    console.log(`${r.text} (type: ${r.type})`);
}

// 带选项
const filtered = await client.recall('nodejs-sdk-bank', 'Alice 做什么工作？', {
    types: ['world', 'observation'],  // 按事实类型筛选
    maxTokens: 4096,
    budget: 'high',  // 'low', 'mid', or 'high'
});
// [/docs:recall]
}

{
// [docs:reflect]
const answer = await client.reflect('nodejs-sdk-bank', '关于 Alice，我应该了解什么？', {
    budget: 'low',  // 'low', 'mid', or 'high'
    context: '准备会议',
});

console.log(answer.text);       // Generated response
// [/docs:reflect]
}

{
// [docs:create-bank]
await client.createBank('nodejs-sdk-bank', {
    name: 'Assistant',
    mission: "你是一位乐于助人的 AI 助手，跟踪用户偏好和对话历史。",
    disposition: {
        skepticism: 3,   // 1-5：信任到怀疑
        literalism: 3,   // 1-5：灵活到字面
        empathy: 3,      // 1-5：冷淡到共情
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
await client.retain('nodejs-sdk-bank', 'Alice 和 Bob 开会规划发布', {
    documentId: 'conversation_001',
});

{
// [docs:get-document]
const doc = await client.getDocument('nodejs-sdk-bank', 'conversation_001');
if (doc) {
    console.log(doc);  // null when document not found
}
// [/docs:get-document]
if (!doc) throw new Error('预期 conversation_001 存在');
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

console.log('nodejs-sdk.mjs: 全部示例通过');
