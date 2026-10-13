#!/usr/bin/env node
/**
 * Hindsight API 快速开始示例（Node.js）
 * 运行：node examples/api/quickstart.mjs
 */

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

// =============================================================================
// 文档示例
// =============================================================================

// [docs:quickstart-full]
import { HindsightClient } from '@vectorize-io/hindsight-client';

const client = new HindsightClient({ baseUrl: 'http://localhost:8888' });

// Retain：存储信息
await client.retain('my-bank', 'Alice 在 Google 担任软件工程师');

// Recall：搜索记忆
await client.recall('my-bank', 'Alice 做什么工作？');

// Reflect：生成回答
await client.reflect('my-bank', '介绍一下 Alice');
// [/docs:quickstart-full]


// =============================================================================
// 清理，文档中不展示
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });

console.log('quickstart.mjs: 所有示例通过');
