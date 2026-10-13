#!/usr/bin/env node
/**
 * Hindsight 存储 API 示例（Node.js）
 * 运行：node examples/api/retain.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 准备，文档中不展示
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// =============================================================================
// 文档示例
// =============================================================================

// [docs:retain-basic]
await client.retain('my-bank', 'Alice 在 Google 担任软件工程师');
// [/docs:retain-basic]


// [docs:retain-conversation]
// 将完整对话作为一个文档存储。
// 将每条消息写为“姓名（时间戳）：文本”，使 LLM 可将
// 事实归属于正确的人，并解析对话中的相对时间。
const conversation = [
    'Alice (2024-03-15T09:00:00Z): Bob，你上周最后去看医生了吗？',
    'Bob (2024-03-15T09:01:00Z): 去了，发现有轻度花生过敏。',
    'Alice (2024-03-15T09:02:00Z): 哎呀，你还好吗？',
    'Bob (2024-03-15T09:03:00Z): 还好，不严重，只需随身带抗组胺药。',
    'Alice (2024-03-15T09:04:00Z): 知道了，团队午餐会避开花生。',
].join('\n');

await client.retain('my-bank', conversation, {
    context: '团队聊天',
    timestamp: '2024-03-15T09:04:00Z',
    documentId: 'chat-2024-03-15-alice-bob',
});
// [/docs:retain-conversation]


// [docs:retain-with-context]
await client.retain('my-bank', 'Alice 晋升为高级工程师', {
    context: '职业变化',
    timestamp: '2024-03-15T10:00:00Z'
});
// [/docs:retain-with-context]


// [docs:retain-batch]
await client.retainBatch('my-bank', [
    { content: 'Alice 在 Google 工作', context: 'career', document_id: 'conversation_001_msg_1' },
    { content: 'Bob 在 Meta 担任数据科学家', context: 'career', document_id: 'conversation_001_msg_2' },
    { content: 'Alice 和 Bob 是朋友', context: 'relationship', document_id: 'conversation_001_msg_3' }
]);
// [/docs:retain-batch]


// [docs:retain-async]
// 开始异步摄取，立即返回
await client.retainBatch('my-bank', [
    { content: '大批量条目一', document_id: 'large-doc-1' },
    { content: '大批量条目二', document_id: 'large-doc-2' },
], {
    async: true
});
// [/docs:retain-async]


// [docs:retain-files]
// 上传文件，将内容存为记忆。
// 支持 PDF、DOCX、PPTX、XLSX、图片 OCR、音频转录及文本。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfBytes = readFileSync(join(__dirname, 'sample.pdf'));
const result = await client.retainFiles('my-bank', [
    new File([pdfBytes], 'sample.pdf'),
], { context: '季度报告' });
console.log(result.operation_ids);  // 通过操作端点跟踪进度
// [/docs:retain-files]


// [docs:retain-files-batch]
// 每请求最多十个文件，可分别设置元数据
const batchResult = await client.retainFiles('my-bank', [
    new File([pdfBytes], 'report.pdf'),
    new File([pdfBytes], 'notes.pdf'),
], {
    filesMetadata: [
        { context: '季度报告', document_id: 'q1-report', tags: ['project:alpha'] },
        { context: '会议记录', document_id: 'q1-notes', tags: ['project:alpha'] },
    ]
});
console.log(batchResult.operation_ids);  // 每文件一个操作 ID
// [/docs:retain-files-batch]


// =============================================================================
// 清理，文档中不展示
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });

console.log('retain.mjs: 所有示例通过');
