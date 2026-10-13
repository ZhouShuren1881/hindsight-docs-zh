#!/usr/bin/env node
/**
 * Hindsight 记忆库模板 API 示例 (Node.js)
 * 运行： node examples/api/bank-templates.mjs
 */

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 文档示例
// =============================================================================

// [docs:import-template]
const template = {
  version: '1',
  bank: {
    retain_mission: '提取客户问题、解决方案和情绪。',
    enable_observations: true,
    observations_mission: '跟踪重复出现的客户痛点。',
  },
  mental_models: [
    {
      id: 'sentiment-overview',
      name: '客户情绪概览',
      source_query: '整体情绪趋势是什么？',
      trigger: { refresh_after_consolidation: true },
    },
  ],
  directives: [
    {
      name: '认可不满情绪',
      content: '提供解决方案前，始终先认可用户的不满情绪。',
      priority: 10,
    },
  ],
};

const importResponse = await fetch(
  `${HINDSIGHT_URL}/v1/default/banks/my-bank/import`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  },
);
const result = await importResponse.json();
console.log('已应用配置：', result.config_applied);
console.log('已创建心智模型：', result.mental_models_created);
console.log('已创建指令：', result.directives_created);
// [/docs:import-template]


// [docs:import-dry-run]
const dryRunResponse = await fetch(
  `${HINDSIGHT_URL}/v1/default/banks/my-bank/import?dry_run=true`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  },
);
const dryRunResult = await dryRunResponse.json();
console.log('试运行：', dryRunResult.dry_run);
console.log('将应用配置：', dryRunResult.config_applied);
// [/docs:import-dry-run]


// [docs:export-template]
const exportResponse = await fetch(
  `${HINDSIGHT_URL}/v1/default/banks/my-bank/export`,
);
const exported = await exportResponse.json();
console.log(JSON.stringify(exported, null, 2));
// [/docs:export-template]


// [docs:export-reimport]
// 从来源记忆库导出
const srcResponse = await fetch(
  `${HINDSIGHT_URL}/v1/default/banks/source-bank/export`,
);
const srcExported = await srcResponse.json();

// 导入新记忆库
await fetch(`${HINDSIGHT_URL}/v1/default/banks/new-bank/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(srcExported),
});
// [/docs:export-reimport]


// [docs:get-schema]
const schemaResponse = await fetch(
  `${HINDSIGHT_URL}/v1/bank-template-schema`,
);
const schema = await schemaResponse.json();
console.log(JSON.stringify(schema, null, 2));
// [/docs:get-schema]
