#!/usr/bin/env node
/**
 * Hindsight 操作 API 示例 (Node.js)
 * 运行： node examples/api/operations.mjs
 */
import { HindsightClient, sdk, createClient, createConfig } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
const apiClient = createClient(createConfig({ baseUrl: HINDSIGHT_URL }));

// 确保库存在，未创建的库列操作会 404（#4442）。
// memory-banks.mjs 先运行并清理 my-bank，因此此文件
// 不能假设此前示例留下记忆库。
await client.createBank('my-bank', {});

// =============================================================================
// 文档示例
// =============================================================================

// [docs:operations-list]
// 列出近期操作，默认最近 20 个。
const { data: recent } = await sdk.listOperations({
    client: apiClient,
    path: { bank_id: 'my-bank' },
});
for (const op of recent.operations) {
    console.log(op.id, op.task_type, op.status);
}

// 按状态和类型筛选。
const { data: pendingRecompute } = await sdk.listOperations({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { status: 'pending', type: 'graph_maintenance' },
});

// 隐藏 retain_batch 父行，仅显示子存储任务。
const { data: flat } = await sdk.listOperations({
    client: apiClient,
    path: { bank_id: 'my-bank' },
    query: { exclude_parents: true },
});
// [/docs:operations-list]


// [docs:operations-get]
const { data: status } = await sdk.getOperationStatus({
    client: apiClient,
    path: { bank_id: 'my-bank', operation_id: '550e8400-e29b-41d4-a716-446655440000' },
});
console.log(status.status, status.error_message);

// 包含提交载荷，批量存储可能较大。
const { data: detailed } = await sdk.getOperationStatus({
    client: apiClient,
    path: { bank_id: 'my-bank', operation_id: '550e8400-e29b-41d4-a716-446655440000' },
    query: { include_payload: true },
});
// [/docs:operations-get]


// [docs:operations-cancel]
// Worker 领取前取消待处理操作。
// 已 processing/completed/failed 时返回 409。
await sdk.cancelOperation({
    client: apiClient,
    path: { bank_id: 'my-bank', operation_id: '550e8400-e29b-41d4-a716-446655440000' },
});
// [/docs:operations-cancel]


// [docs:operations-retry]
// 重新排队失败或取消操作。
// 非 failed/cancelled 时返回 409。
await sdk.retryOperation({
    client: apiClient,
    path: { bank_id: 'my-bank', operation_id: '550e8400-e29b-41d4-a716-446655440000' },
});
// [/docs:operations-retry]


// [docs:operations-async-retain]
// 异步提交大批量，立即返回 an
// 可轮询的 operation_id。
const submission = await client.retainBatch('my-bank', [
    { content: 'Alice 于 2023 年加入 Google' },
    { content: 'Bob 比起 JavaScript 更喜欢 Python' },
], { async: true });
const operationId = submission.operation_id;

while (true) {
    const { data: s } = await sdk.getOperationStatus({
        client: apiClient,
        path: { bank_id: 'my-bank', operation_id: operationId },
    });
    if (['completed', 'failed', 'cancelled'].includes(s.status)) {
        console.log(`finished: ${s.status}`);
        break;
    }
    await new Promise((r) => setTimeout(r, 2000));
}
// [/docs:operations-async-retain]
