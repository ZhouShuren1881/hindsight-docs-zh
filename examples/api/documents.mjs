#!/usr/bin/env node
/**
 * Hindsight 文档 API 示例 (Node.js)
 * 运行： node examples/api/documents.mjs
 */
import { HindsightClient, sdk, createClient, createConfig } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// =============================================================================
// 文档示例
// =============================================================================

// [docs:document-retain]
// 使用文档 ID 存储
await client.retain('my-bank', 'Alice 介绍了第四季度路线图...', {
    document_id: 'meeting-2024-03-15'
});

// 分章节批量存储文档
await client.retainBatch('my-bank', [
    { content: '事项 1：产品发布延期至第二季度', document_id: 'meeting-2024-03-15-section-1' },
    { content: '事项 2：公布新招聘目标', document_id: 'meeting-2024-03-15-section-2' },
    { content: '事项 3：机器学习团队预算获批', document_id: 'meeting-2024-03-15-section-3' }
]);
// [/docs:document-retain]


// [docs:document-update]
// Original
await client.retain('my-bank', '项目截止日期：3 月 31 日', {
    document_id: 'project-plan'
});

// Update
await client.retain('my-bank', '项目截止日期：4 月 15 日（已延期）', {
    document_id: 'project-plan'
});
// [/docs:document-update]


// [docs:document-list]
const apiClient = createClient(createConfig({ baseUrl: 'http://localhost:8888' }));

// 列出全部文档
const { data: allDocs } = await sdk.listDocuments({
    client: apiClient,
    path: { bank_id: 'my-bank' }
});
console.log(`文档总数： ${allDocs.total}`);

// 按文档 ID 子串筛选
const { data: reportDocs } = await sdk.listDocuments({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { q: 'report' }
});

// 按标签筛选，仅 team-a 文档（排除无标签）
const { data: taggedDocs } = await sdk.listDocuments({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { tags: ['team-a'], tags_match: 'any_strict' }
});

// 组合 ID 搜索与标签
const { data: filtered } = await sdk.listDocuments({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { q: 'meeting', tags: ['team-a', 'team-b'], tags_match: 'all_strict' }
});

// Paginate
const { data: page } = await sdk.listDocuments({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { limit: 20, offset: 40 }
});
console.log(`本页条目： ${page.items.length}`);
// [/docs:document-list]


// [docs:document-get]
// 获取文档，扩展召回上下文
const { data: doc, error } = await sdk.getDocument({
    client: apiClient,
    path: { bank_id: 'my-bank', document_id: 'meeting-2024-03-15-section-1' }
});

if (error) {
    throw new Error(`获取文档失败： ${JSON.stringify(error)}`);
}

console.log(`Document: ${doc.id}`);
console.log(`原始文本： ${doc.original_text}`);
console.log(`记忆数量： ${doc.memory_unit_count}`);
console.log(`Created: ${doc.created_at}`);
// [/docs:document-get]


// [docs:document-update-tags]
// 修正文档错误范围标签
const { data: updateResult, error: updateError } = await sdk.updateDocument({
    client: apiClient,
    path: { bank_id: 'my-bank', document_id: 'meeting-2024-03-15-section-1' },
    body: { tags: ['team-a', 'team-b'] }
});

if (updateError) {
    throw new Error(`Failed to update tags: ${JSON.stringify(updateError)}`);
}

console.log(`Updated: ${updateResult.success}`);

// 移除全部标签，使文档在所有范围可见
await sdk.updateDocument({
    client: apiClient,
    path: { bank_id: 'my-bank', document_id: 'meeting-2024-03-15-section-1' },
    body: { tags: [] }
});
// [/docs:document-update-tags]


// [docs:document-delete]
// 删除文档及其全部记忆
const { data: deleteResult } = await sdk.deleteDocument({
    client: apiClient,
    path: { bank_id: 'my-bank', document_id: 'meeting-2024-03-15-section-1' }
});

console.log(`Deleted ${deleteResult.memory_units_deleted} memories`);
// [/docs:document-delete]


// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });

console.log('documents.mjs: 全部示例通过');
