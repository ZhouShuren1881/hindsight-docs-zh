#!/usr/bin/env node
/**
 * Hindsight 观测树 API 示例（Node.js），以 Markdown 文件呈现记忆库的观测。
 * 运行：node examples/api/observation-tree.mjs
 */
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { HindsightClient, sdk, createClient, createConfig } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const BANK_ID = 'observation-tree-demo-bank-node';

// =============================================================================
// 准备工作（文档未展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
await client.createBank(BANK_ID, { name: 'Observation Tree Demo' });
await client.retain(BANK_ID, 'The API runs on Kubernetes behind an nginx ingress.', { tags: ['team:platform'] });
await client.retain(BANK_ID, 'Redis keys expire after an hour.', { tags: ['team:platform'] });
await client.retain(BANK_ID, 'The GPU nodes serve Gemma with vLLM.', { tags: ['team:ml'] });
await new Promise((r) => setTimeout(r, 5000));
const outDir = mkdtempSync(join(tmpdir(), 'observation-tree-'));

// =============================================================================
// 文档示例
// =============================================================================

// [docs:get-tree]
// 整个记忆库的目录、主题文件和各目录的 index.md。
const apiClient = createClient(createConfig({ baseUrl: HINDSIGHT_URL }));
const { data: tree } = await sdk.getObservationTree({ client: apiClient, path: { bank_id: BANK_ID } });
console.log(`${tree.observation_count} observations`);

const walk = (folder) => {
    for (const f of folder.files) console.log(`/${f.path} (${f.observation_count})`);
    folder.folders.forEach(walk);
};
walk(tree);

// 仅查看一个范围，标签筛选方式与 Recall 相同。
const { data: platform } = await sdk.getObservationTree({
    client: apiClient,
    path: { bank_id: BANK_ID },
    query: { tags: ['team:platform'], tags_match: 'any_strict' },
});
walk(platform);
// [/docs:get-tree]

// [docs:write-bundle]
// 将文件包写入磁盘，按每个文件的路径保存相应的 Markdown 内容。
const write = (folder) => {
    for (const f of folder.files) {
        const path = join(outDir, f.path);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, f.content, 'utf8');
    }
    folder.folders.forEach(write);
};
write(tree);
// [/docs:write-bundle]
if (!existsSync(join(outDir, 'index.md'))) throw new Error('index.md missing');

// =============================================================================
// 清理（文档未展示）
// =============================================================================
await client.deleteBank(BANK_ID);

console.log('observation-tree.mjs: All examples passed');
