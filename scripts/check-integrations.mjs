#!/usr/bin/env node
/**
 * 集成单个-source-of-truth护栏。
 *
 * src/data/integrations.json 是单一来源：它驱动 /integrations
 * 画廊和（通过混合的DocPage/Layout/Sidebar组件）
 * 集成侧边栏类别。该脚本强制执行
 * 保持诚实的两个不变量：
 *
 *   1。转发 — 每个条目都有一个内部 `/sdks/integrations/<slug>`链接
 *      在 docs 上有一个文档页面-integrations/<slug>.{md,mdx}。 （侧边栏是
 *      在渲染时注入，因此它不被 Docusaurus 的构建-time 覆盖
 *      broken-link 检查——这就是捕获丢失页面的方法。）
 *
 *   2。可发现 - 每个与变更日志页面的集成都链接到它
 *      其文档页面。变更日志页面由发布脚本编写，并且
 *      只能通过猜测 URL 才能访问。
 *
 * 运行：节点scripts/check-integrations.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..');
const integrationsJson = join(docsDir, 'src', 'data', 'integrations.json');
const integrationsDocsDir = join(docsDir, 'docs-integrations');
const changelogDir = join(docsDir, 'src', 'pages', 'changelog', 'integrations');

const { integrations } = JSON.parse(readFileSync(integrationsJson, 'utf8'));
const internal = integrations.filter((entry) => entry.link.startsWith('/sdks/integrations/'));
const documented = new Set(internal.map((entry) => entry.link.replace('/sdks/integrations/', '')));

let failed = false;

// ─── 1. 转发：每个内部条目都有一个文档页面──────────────────────────
const missingPages = [];
for (const entry of internal) {
  const slug = entry.link.replace('/sdks/integrations/', '');
  const hasDoc = ['md', 'mdx'].some((ext) => existsSync(join(integrationsDocsDir, `${slug}.${ext}`)));
  if (!hasDoc) {
    missingPages.push({ id: entry.id, slug });
  }
}
if (missingPages.length > 0) {
  failed = true;
  console.error('[integrations]❌没有文档页面的integrations.json条目：');
  for (const { id, slug } of missingPages) {
    console.error(`  ${id} — 缺少 docs-integrations/${slug}.{md,mdx}`);
  }
  console.error('添加文档页面，或者删除或外部化 Integrations.json 中的条目。');
} else {
  console.log(`[integrations] ✅ 全部${internal.length}​​ 集成条目有一个文档页面。`);
}

// Release-tag 检查属于上游 monorepo，而不是这个独立副本。

// ──── 2. 可发现：变更日志页面从其文档页面链接────────────
const changelogSlugs = readdirSync(changelogDir)
  .filter((f) => f.endsWith('.md') && f !== 'index.md')
  .map((f) => f.slice(0, -'.md'.length));

const unlinked = [];
let checkedChangelogs = 0;
for (const slug of changelogSlugs) {
  if (!documented.has(slug)) continue; // 无画廊条目⇒不是用户-facing
  checkedChangelogs++;
  const docPath = ['md', 'mdx']
    .map((ext) => join(integrationsDocsDir, `${slug}.${ext}`))
    .find((p) => existsSync(p));
  if (!docPath) continue; // 已通过支票1报告
  if (!readFileSync(docPath, 'utf8').includes(`/changelog/integrations/${slug}`)) {
    unlinked.push(slug);
  }
}
if (unlinked.length > 0) {
  failed = true;
  console.error('[integrations]❌变更日志页面未从其文档页面链接：');
  for (const slug of unlinked) {
    console.error(`  ${slug}— 添加[查看变更日志 →](/changelog/integrations/${slug})`);
  }
  console.error(
    '\nThe /changelog listing finds these pages automatically, but the doc page is where ' +
      'someone using the integration looks first.\n',
  );
} else {
  console.log(`[integrations] ✅ 全部${checkedChangelogs}变更日志页面从其文档页面链接。`);
}

process.exit(failed ? 1 : 0);
