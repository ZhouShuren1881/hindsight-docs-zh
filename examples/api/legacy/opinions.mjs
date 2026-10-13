#!/usr/bin/env node
/**
 * Hindsight 观点 API 示例（已弃用，为版本化文档保留）。
 * 保留此文件以兼容 v0.3 文档。
 * 在 v0.4 及更高版本中，观点已被心智模型取代。
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });

// [docs:opinion-form]
// 记忆库遇到以下信息时，会自动形成观点：
// 已存储内容中的主张、偏好或判断
await client.retain('my-bank',
    "我认为 Python 很适合数据科学，因为它有丰富的库"
);

// 记忆库根据证据形成带有置信度的观点
// [/docs:opinion-form]


// [docs:opinion-search]
// 搜索有关某个主题的观点
const response = await client.recall('my-bank', '你对 Python 有什么看法？', {
    types: ['opinion']
});

for (const opinion of response.results) {
    console.log(`观点：${opinion.text}`);
    console.log(`置信度：${opinion.confidence}`);
}
// [/docs:opinion-search]


// [docs:opinion-disposition]
// 记忆库的性格倾向会影响观点的形成方式
// 怀疑程度较高 = 置信度较低，需要更多证据
// 怀疑程度较低 = 置信度较高，更容易接受主张

await client.createBank('skeptical-bank', {
    disposition: { skepticism: 5, literalism: 3, empathy: 2 }
});

// 内容相同，但性格倾向不同会导致置信度不同
await client.retain('skeptical-bank', 'Python 是最好的编程语言');
// [/docs:opinion-disposition]


// [docs:opinion-in-reflect]
// 观点会影响反思响应
const reflectResponse = await client.reflect('my-bank',
    '我应该在数据项目中使用 Python 吗？'
);

// 响应会以适当的置信度融入记忆库的观点
console.log(reflectResponse.text);
// [/docs:opinion-in-reflect]


// =============================================================================
// 清理（不在文档中显示）
// =============================================================================
await fetch(`${HINDSIGHT_URL}/v1/default/banks/my-bank`, { method: 'DELETE' });
await fetch(`${HINDSIGHT_URL}/v1/default/banks/skeptical-bank`, { method: 'DELETE' });

console.log('opinions.mjs：全部示例通过');
