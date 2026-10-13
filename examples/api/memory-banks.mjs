#!/usr/bin/env node
/**
 * Hindsight 记忆库 API 示例 (Node.js)
 * 运行： node examples/api/memory-banks.mjs
 */
import { HindsightClient, sdk, createClient, createConfig } from '@vectorize-io/hindsight-client';
import { readFile, writeFile, rm } from 'node:fs/promises';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// =============================================================================
// 文档示例
// =============================================================================

// [docs:create-bank]
await client.createBank('my-bank');
// [/docs:create-bank]


// [docs:bank-with-disposition]
await client.createBank('architect-bank');
await client.updateBankConfig('architect-bank', {
    reflectMission: "你是一位高级软件架构师，跟踪系统设计、技术决策和架构模式。",
    dispositionSkepticism: 4,   // 质疑新技术
    dispositionLiteralism: 4,   // 关注具体规格
    dispositionEmpathy: 2,      // 优先技术事实
});
// [/docs:bank-with-disposition]


// [docs:bank-background]
await client.createBank('my-bank');
await client.updateBankConfig('my-bank', {
    reflectMission: '我是专注机器学习的研究助手。',
});
// [/docs:bank-background]


// [docs:bank-mission]
await client.createBank('my-bank');
await client.updateBankConfig('my-bank', {
    reflectMission: "你是一位高级软件架构师，跟踪系统设计、技术决策和架构模式。",
});
// [/docs:bank-mission]


// [docs:update-bank-config]
await client.updateBankConfig('my-bank', {
    retainMission: '始终包含技术决策、API 设计选择及架构取舍。忽略会议安排和社交交流。',
    retainExtractionMode: 'verbose',
    observationsMission: '观察是关于人员和项目的稳定事实。始终包含偏好、技能和重复模式，忽略一次性事件。',
    dispositionSkepticism: 4,
    dispositionLiteralism: 4,
    dispositionEmpathy: 2,
});
// [/docs:update-bank-config]


// [docs:get-bank-config]
// 返回解析配置（服务默认合并库覆盖）及原始覆盖
const { config, overrides } = await client.getBankConfig('my-bank');
// config    — 完整解析配置
// overrides — 仅库级覆盖字段
// [/docs:get-bank-config]


// [docs:reset-bank-config]
// 移除全部库级覆盖，恢复服务默认
await client.resetBankConfig('my-bank');
// [/docs:reset-bank-config]


// =============================================================================
// 提示预览和库转移
// =============================================================================
const apiClient = createClient(createConfig({ baseUrl: HINDSIGHT_URL }));
const TRANSFER_BANKS = ['transfer-js', 'transfer-js-copy', 'transfer-js-other', 'transfer-js-clone'];
for (const b of TRANSFER_BANKS) await fetch(`${HINDSIGHT_URL}/v1/default/banks/${b}`, { method: 'DELETE' });
// chunks 模式原样存文本，无需 LLM。
await client.createBank('transfer-js', {});
await client.updateBankConfig('transfer-js', { retainExtractionMode: 'chunks' });
const retainRes = await fetch(`${HINDSIGHT_URL}/v1/default/banks/transfer-js/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [
        { content: 'Alice 领导支付团队。', document_id: 'doc-1' },
        { content: 'Bob 调到柏林办公室。', document_id: 'doc-2' },
    ] }),
});
if (!retainRes.ok) throw new Error(`存储失败： ${retainRes.status}`);
await client.createBank('transfer-js-other', {});

async function waitFor(bankId, operationId) {
    for (let i = 0; i < 120; i++) {
        const { data } = await sdk.getOperationStatus({
            client: apiClient, path: { bank_id: bankId, operation_id: operationId },
        });
        if (data.status === 'completed') return data;
        if (data.status === 'failed' || data.status === 'cancelled') {
            throw new Error(`operation ${operationId} ${data.status}: ${data.error_message}`);
        }
        await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`operation ${operationId} 未完成`);
}

// [docs:prompts-preview]
const { data: preview } = await sdk.previewPrompt({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    body: { operation: 'retain' },
});
for (const message of preview.messages) console.log(message.role, message.blocks.length);
// [/docs:prompts-preview]
if (!preview.messages.length) throw new Error('预览为空');


// [docs:transfer-export]
// 整个库，记忆和配置，不含历史.
// 提交导出、轮询操作、下载 ZIP。
const archive = await client.exportBank('transfer-js');

// 仅记忆
const memoriesOnly = await client.exportBank('transfer-js', { includeBankConfig: false });

// 特定文档，文档子集不含库级部分.
// 底层仅提交，需自行轮询。
const { data: subset } = await sdk.exportBankTransfer({
    client: apiClient,
    path: { bank_id: 'transfer-js' },
    query: { document_id: ['doc-1', 'doc-2'], include_bank_config: false },
});
// [/docs:transfer-export]
if (archive[0] !== 0x50 || memoriesOnly[0] !== 0x50) throw new Error('不是 ZIP');
await waitFor('transfer-js', subset.operation_id);


// [docs:transfer-import]
// 以新 ID 恢复库
const restoreId = await client.importBank('transfer-js', new Blob([archive]), {
    targetBankId: 'transfer-js-copy',
});
// 恢复记录在 URL 的库，在那里轮询
const { data: restoreStatus } = await sdk.getOperationStatus({
    client: apiClient,
    path: { bank_id: 'transfer-js', operation_id: restoreId },
});

// 将归档文档合并到现有库
const { data: merge } = await sdk.importBankTransfer({
    client: apiClient,
    path: { bank_id: 'transfer-js-other' },
    query: { mode: 'merge', document_conflict: 'replace' },
    body: { file: new Blob([archive]) },
});
// [/docs:transfer-import]
await waitFor('transfer-js', restoreId);
await waitFor('transfer-js-other', merge.operation_id);
const copied = await client.listDocuments('transfer-js-copy');
if (copied.total !== 2) throw new Error(`restore copied ${copied.total} documents`);


// [docs:clone-bank]
const cloneId = await client.cloneBank('transfer-js', 'transfer-js-clone');
// 操作记录在来源库
const { data: cloneStatus } = await sdk.getOperationStatus({
    client: apiClient,
    path: { bank_id: 'transfer-js', operation_id: cloneId },
});
// [/docs:clone-bank]
await waitFor('transfer-js', cloneId);
const cloned = await client.listDocuments('transfer-js-clone');
if (cloned.total !== 2) throw new Error(`clone copied ${cloned.total} documents`);


// [docs:document-export]
// 提交整库导出，传 { documentIds: [...] } 限定，
// 轮询至完成，下载归档。
const docArchive = await client.exportDocuments('transfer-js');
await writeFile('transfer-js-documents.zip', docArchive);
// [/docs:document-export]


// [docs:document-import]
const { data: docImport } = await sdk.importDocuments({
    client: apiClient,
    path: { bank_id: 'transfer-js-other' },
    query: { on_conflict: 'replace' },
    body: { file: new Blob([await readFile('transfer-js-documents.zip')]) },
});

const { data: docImportStatus } = await sdk.getOperationStatus({
    client: apiClient,
    path: { bank_id: 'transfer-js-other', operation_id: docImport.operation_id },
});
// docImportStatus.result_metadata -> { documents_imported: 3, facts_imported: 42, observations_imported: 5, ... }
// [/docs:document-import]
await waitFor('transfer-js-other', docImport.operation_id);
await rm('transfer-js-documents.zip');

// [docs:transfer-import-external]
import { crc32 } from 'node:zlib';

// 最小无压缩 ZIP 写入器，Node 未内置，也可用 jszip。
function zip(files) {
    const locals = [], centrals = [];
    let offset = 0;
    for (const [name, text] of Object.entries(files)) {
        const n = Buffer.from(name), d = Buffer.from(text), crc = crc32(d);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x21, 12);
        local.writeUInt32LE(crc, 14); local.writeUInt32LE(d.length, 18); local.writeUInt32LE(d.length, 22);
        local.writeUInt16LE(n.length, 26);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(d.length, 20);
        central.writeUInt32LE(d.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(offset, 42);
        locals.push(local, n, d);
        centrals.push(central, n);
        offset += 30 + n.length + d.length;
    }
    const dir = Buffer.concat(centrals), end = Buffer.alloc(22);
    const count = Object.keys(files).length;
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
    end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, dir, end]);
}

const doc = {
    id: 'session-2026-09-22',
    original_text: '完整原始会话文本...',
    chunks: [{ chunk_index: 0, chunk_text: '调用方定义的来源区域...' }],
    facts: [{
        text: '用户偏好轻量本地语音识别模型。',
        fact_type: 'experience',
        chunk_index: 0,
        mentioned_at: '2026-09-22T18:34:00Z',
        entities: ['Parakeet'],
    }],
};
const archiveZip = zip({
    'manifest.json': JSON.stringify({ schema_version: 1, source_bank_id: 'external' }),
    [`documents/${doc.id}.json`]: JSON.stringify(doc),
});

const { data: external } = await sdk.importBankTransfer({
    client: apiClient,
    path: { bank_id: 'transfer-js-other' },
    query: { mode: 'merge', document_conflict: 'replace' },
    body: { file: new Blob([archiveZip]) },
});
// [/docs:transfer-import-external]
await waitFor('transfer-js-other', external.operation_id);
const { data: importedDoc } = await sdk.getDocument({
    client: apiClient,
    path: { bank_id: 'transfer-js-other', document_id: 'session-2026-09-22' },
});
if (importedDoc.memory_unit_count !== 1) throw new Error(`external import stored ${importedDoc.memory_unit_count} facts`);
for (const b of TRANSFER_BANKS) await fetch(`${HINDSIGHT_URL}/v1/default/banks/${b}`, { method: 'DELETE' });


// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });
await fetch(`${HINDSIGHT_URL}/v1/default/banks/architect-bank`, { method: 'DELETE' });

console.log('memory-banks.mjs: 全部示例通过');
