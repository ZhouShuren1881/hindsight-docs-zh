#!/usr/bin/env node
/**
 * Hindsight 指令 API 示例 (Node.js)
 * 运行： node examples/api/directives.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const BANK_ID = 'directives-example-bank';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
await client.createBank(BANK_ID, { name: '测试记忆库' });

// =============================================================================
// 文档示例
// =============================================================================

// [docs:create-directive]
// 创建指令（反思的硬性规则）
const directive = await client.createDirective(
    BANK_ID,
    '正式语言',
    '始终使用正式英语回复，避免俚语和口语表达。'
);

console.log(`已创建指令： ${directive.id}`);
// [/docs:create-directive]

const directiveId = directive.id;

// [docs:list-directives]
// 列出记忆库中的全部指令
const directives = await client.listDirectives(BANK_ID);

for (const d of directives.items) {
    console.log(`- ${d.name}: ${d.content.slice(0, 50)}...`);
}
// [/docs:list-directives]

// [docs:update-directive]
// 更新指令（如禁用而不删除）
const updated = await client.updateDirective(BANK_ID, directiveId, {
    isActive: false
});

console.log(`指令启用状态： ${updated.is_active}`);
// [/docs:update-directive]

// [docs:delete-directive]
// 删除指令
await client.deleteDirective(BANK_ID, directiveId);
// [/docs:delete-directive]

// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await client.deleteBank(BANK_ID);

console.log('directives.mjs: 全部示例通过');
