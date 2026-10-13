#!/usr/bin/env node
/**
 * Hindsight 心智模型 API 示例 (Node.js)
 * 运行： node examples/api/mental-models.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const BANK_ID = 'mental-models-demo-bank';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
await client.createBank(BANK_ID, { name: '心智模型演示' });
await client.retain(BANK_ID, '团队偏好通过 Slack 异步沟通');
await client.retain(BANK_ID, '紧急问题使用 #incidents 频道');
await client.retain(BANK_ID, '每周同步会议在周一上午 10 点');
await new Promise(r => setTimeout(r, 2000));

// =============================================================================
// 文档示例
// =============================================================================

// [docs:create-mental-model]
// 创建心智模型，后台反思
const result = await client.createMentalModel(
    BANK_ID,
    '团队沟通偏好',
    '团队偏好如何沟通？',
    { tags: ['team', 'communication'] },
);

// 返回 operation_id，通过操作端点检查完成
console.log(`操作 ID： ${result.operation_id}`);
// [/docs:create-mental-model]

// [docs:create-mental-model-with-id]
// 创建指定自定义 ID 的心智模型
const resultWithId = await client.createMentalModel(
    BANK_ID,
    '沟通政策',
    "团队沟通准则是什么？",
    { id: 'communication-policy' },
);

console.log(`使用自定义 ID 创建： ${resultWithId.operation_id}`);
// [/docs:create-mental-model-with-id]

await new Promise(r => setTimeout(r, 5000));

// [docs:create-mental-model-with-trigger]
// 创建启用自动刷新的心智模型
const result2 = await client.createMentalModel(
    BANK_ID,
    '项目状态',
    '当前项目状态如何？',
    { trigger: { refreshCron: '0 3 * * *' } },
);

// 每天 03:00 UTC 检查，范围记忆改变时刷新
console.log(`操作 ID： ${result2.operation_id}`);
// [/docs:create-mental-model-with-trigger]

// [docs:create-mental-model-tags-match]
// 覆盖刷新时模型标签筛选来源的方式。
// 带标签模型默认 all_strict，记忆需包含全部标签；
// 每条记忆仅单主题时用 any，
// 刷新读取至少带一个模型标签的记忆。
const result3 = await client.createMentalModel(
    BANK_ID,
    '当前项目',
    '用户目前处理哪些项目？',
    {
        tags: ['projects', 'mental-model'],
        trigger: { tagsMatch: 'any' },
    },
);

console.log(`操作 ID： ${result3.operation_id}`);
// [/docs:create-mental-model-tags-match]

await new Promise(r => setTimeout(r, 5000));

// [docs:list-mental-models]
// 列出全部心智模型，默认仅元数据；
// detail: "content" 添加 source_query/content/trigger。
const mentalModels = await client.listMentalModels(BANK_ID, { detail: "content" });

for (const mm of mentalModels.items) {
    console.log(`- ${mm.name}: ${mm.source_query}`);
}
// [/docs:list-mental-models]

const mentalModelId = mentalModels.items[0]?.id;
if (!mentalModelId) {
    console.log('mental-models.mjs: 全部示例通过 (尚未创建心智模型)');
    await fetch(`${HINDSIGHT_URL}/v1/default/banks/${BANK_ID}`, { method: 'DELETE' });
    process.exit(0);
}

// [docs:get-mental-model]
// 获取指定心智模型
const mentalModel = await client.getMentalModel(BANK_ID, mentalModelId);

console.log(`Name: ${mentalModel.name}`);
console.log(`Content: ${mentalModel.content}`);
console.log(`上次刷新： ${mentalModel.last_refreshed_at}`);
// [/docs:get-mental-model]

// [docs:refresh-mental-model]
// 刷新心智模型，更新为当前知识
const refreshResult = await client.refreshMentalModel(BANK_ID, mentalModelId);

console.log(`刷新操作 ID： ${refreshResult.operation_id}`);
// [/docs:refresh-mental-model]

// [docs:clear-mental-model]
// 清空内容再刷新，完整重新综合
await client.clearMentalModel(BANK_ID, mentalModelId);

// 触发全新完整重建
const fullRefreshResult = await client.refreshMentalModel(BANK_ID, mentalModelId);

console.log(`完整刷新操作 ID： ${fullRefreshResult.operation_id}`);
// [/docs:clear-mental-model]

// [docs:update-mental-model]
// 更新模型元数据
const updated = await client.updateMentalModel(BANK_ID, mentalModelId, {
    name: '更新后的团队沟通偏好',
    trigger: { refreshAfterConsolidation: true },
});

console.log(`更新后名称： ${updated.name}`);
// [/docs:update-mental-model]

// [docs:get-mental-model-history]
// 获取模型变更历史
const history = await client.getMentalModelHistory(BANK_ID, mentalModelId);

for (const entry of history) {
    console.log(`变更时间： ${entry.changed_at}`);
    console.log(`此前内容： ${entry.previous_content}`);
}
// [/docs:get-mental-model-history]

// [docs:mental-model-detail]
// 列表默认仅元数据，最小响应
await client.listMentalModels(BANK_ID);

// 列表包含内容，不含来源链，需显式选择
await client.listMentalModels(BANK_ID, { detail: 'content' });

// 获取单模型，默认完整细节
await client.getMentalModel(BANK_ID, mentalModelId);
// [/docs:mental-model-detail]

// [docs:dry-run-refresh]
// 预览刷新，不写入
const preview = await client.dryRunRefreshMentalModel(BANK_ID, mentalModelId);

console.log(`模式： ${preview.effective_mode}, 将持久保存： ${preview.would_persist}`);
console.log(preview.diff);
// [/docs:dry-run-refresh]

// [docs:keep-trace]
// 记录每次刷新（含计划）如何得出结果
await client.updateMentalModel(BANK_ID, mentalModelId, {
    trigger: { mode: 'delta', keepTrace: true },
});
// [/docs:keep-trace]

// [docs:delete-mental-model]
// 删除心智模型
await client.deleteMentalModel(BANK_ID, mentalModelId);
// [/docs:delete-mental-model]

// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await client.deleteBank(BANK_ID);

console.log('mental-models.mjs: 全部示例通过');
