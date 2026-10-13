#!/usr/bin/env node
/**
 * Hindsight 知识页面 API 示例 (Node.js)
 * 运行： node examples/api/knowledge-pages.mjs
 */
import { HindsightClient } from '@vectorize-io/hindsight-client';

const HINDSIGHT_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';
const BANK_ID = 'knowledge-pages-demo-bank-node';

// =============================================================================
// 初始化（不在文档中展示）
// =============================================================================
const client = new HindsightClient({ baseUrl: HINDSIGHT_URL });
await client.createBank(BANK_ID, { name: '知识页面演示' });
await client.retain(BANK_ID, 'API 通过滚动更新部署到 Kubernetes');
await client.retain(BANK_ID, 'CI 通过后从 main 分支部署');
await client.retain(BANK_ID, '部署失败时重新部署上一个标签以回滚');
await new Promise(r => setTimeout(r, 2000));

// =============================================================================
// 文档示例
// =============================================================================

// [docs:create-folder]
// 创建文件夹，省略 parentId 或传 null 则在根目录
const folder = await client.createKnowledgeFolder(BANK_ID, '运维');

console.log(`文件夹 ID： ${folder.id}`);
// [/docs:create-folder]

// [docs:create-page]
// 创建页面，后台生成内容
const page = await client.createKnowledgePage(
    BANK_ID,
    '部署 API',
    'API 如何部署？',
    { parentId: folder.id, tags: ['ops', 'type:runbook'] },
);

// 轮询操作，确认首次构建完成
console.log(`页面 ID： ${page.page_id}, operation: ${page.operation_id}`);
// [/docs:create-page]

// 等待首次构建
await new Promise(r => setTimeout(r, 20000));

// [docs:get-tree]
// 获取嵌套文件夹/页面树，不含正文
const tree = await client.getKnowledgeBaseTree(BANK_ID);

for (const root of tree.roots) {
    console.log(`${root.kind}: ${root.name}`);
    for (const child of root.children ?? []) {
        console.log(`  ${child.kind}: ${child.name} (stale: ${child.is_stale})`);
    }
}
// [/docs:get-tree]

// [docs:get-page]
// 以 Markdown 文档读取页面
const document = await client.getKnowledgePage(BANK_ID, page.page_id);

console.log(document.type);      // "runbook" — 来自 type:runbook 标签
console.log(document.body);      // the synthesized markdown body
console.log(document.markdown);  // YAML frontmatter + body
// [/docs:get-page]

// [docs:search-pages]
// 整页全文和向量混合搜索
const results = await client.searchKnowledgeBase(BANK_ID, '如何部署', { limit: 5 });

for (const hit of results.results) {
    console.log(`${hit.score.toFixed(3)}  ${hit.name}: ${hit.snippet}`);
}
// [/docs:search-pages]

// [docs:filter-by-tags]
// 按标签限定树和搜索（召回的 tags / tags_match / tag_groups）
const runbooks = await client.getKnowledgeBaseTree(BANK_ID, { tags: ['type:runbook'], tagsMatch: 'any_strict' });
const opsHits = await client.searchKnowledgeBase(BANK_ID, '如何部署', { tags: ['ops'], tagsMatch: 'all_strict' });
console.log(`${runbooks.roots.length} 个运行手册根节点， ${opsHits.results.length} 条运维匹配`);

// 复合筛选使用 tagGroups，此处排除草稿运行手册
const notDrafts = await client.searchKnowledgeBase(BANK_ID, '如何部署', {
    tagGroups: [{ and: [{ tags: ['type:runbook'] }, { not: { tags: ['draft'] } }] }],
});
console.log(`${notDrafts.results.length} 份非草稿运行手册`);
// [/docs:filter-by-tags]

// [docs:update-node]
// 重命名、移动节点或更新页面选项。
// 修改 sourceQuery 按新问题重建页面。
await client.updateKnowledgeNode(BANK_ID, page.page_id, {
    name: '部署 API (v2)',
    tags: ['ops', 'type:runbook', 'reviewed'],
});
// [/docs:update-node]

// [docs:export]
// 导出为可移植 Markdown 包
const bundle = await client.exportKnowledgeBase(BANK_ID);

for (const file of bundle.files) {
    console.log(file.path);  // index.md, <page-id>.md, <page-id>.log.md
}
// [/docs:export]

// [docs:delete-node]
// 删除文件夹或页面，删除文件夹会移除整棵子树
await client.deleteKnowledgeNode(BANK_ID, folder.id);
// [/docs:delete-node]

// =============================================================================
// 清理（不在文档中展示）
// =============================================================================
await client.deleteBank(BANK_ID);

console.log('knowledge-pages.mjs: 全部示例通过');
