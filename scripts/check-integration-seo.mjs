#!/usr/bin/env node
/**
 * 验证每个集成文档页面都有 `title` 和 出于 SEO 目的，将 `description`
 * 放在其前面。
 *
 * 检查独立的、未版本化的文档-integrations/页面。
 *
 * 运行：节点scripts/check-integration-seo.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const integrationsDir = join(__dirname, '..', 'docs-integrations');

const IGNORED_FILES = ['_template.md', '_category_.json'];

function parseFrontmatter(content) {
  content = content.replace(/\r\n/g, '\n');
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const fm = content.slice(4, end);
  const fields = {};
  for (const line of fm.split('\n')) {
    const match = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

// ────主要────────────────────────────────────────────────────────────────────

const files = readdirSync(integrationsDir).filter(
  f => (f.endsWith('.md') || f.endsWith('.mdx')) && !IGNORED_FILES.includes(f)
);

const violations = [];

for (const filename of files) {
  const filepath = join(integrationsDir, filename);
  const content = readFileSync(filepath, 'utf8');
  const fm = parseFrontmatter(content);
  const missing = [];
  if (!fm.title) missing.push('title');
  if (!fm.description) missing.push('description');
  if (missing.length > 0) {
    violations.push({ filename, missing });
  }
}

if (violations.length > 0) {
  console.error('[integration-seo] ❌ 以下集成页面缺少必需的 frontmatter：');
  for (const { filename, missing } of violations) {
    console.error(`文档-integrations/${filename}— 缺失：${missing.join(', ')}`);
  }
  console.error('所有集成页面的 frontmatter 都必须包含 title 和 description。');
  console.error('示例：');
  console.error('  ---');
  console.error('  sidebar_position: 1');
  console.error('  title: "MyFramework 与 Hindsight 的持久记忆 | 集成"');
  console.error('  description: "为 MyFramework 智能体添加 Hindsight 长期记忆。"');
  console.error('  ---');
  process.exit(1);
} else {
  console.log(`[integration-seo] ✅ 全部${files.length}集成页面有标题和描述。`);
}
