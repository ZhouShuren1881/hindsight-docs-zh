#!/usr/bin/env node
/**
 * 验证src/data/featured-posts.json，固定在文档中的博客文章
 * 侧边栏和博客索引顶部：最多`max` 针脚，每个 `href`
 * 是真实帖子，每个`cover`是static/下的真实文件。
 *
 * 运行：节点scripts/check-featured-posts.mjs
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { max, posts } = JSON.parse(readFileSync(join(docsRoot, 'src/data/featured-posts.json'), 'utf-8'));

// 帖子的 URL 是/blog/<slug> 来自 frontmatter，其他 Docusaurus 的默认值
// /blog/YYYY/MM/DD/<name> 来自 YYYY-MM-DD-<name>。md(x)文件名。
const postHrefs = new Set();
for (const file of readdirSync(join(docsRoot, 'blog'))) {
  const named = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.mdx?$/);
  if (!named) continue;
  const slug = readFileSync(join(docsRoot, 'blog', file), 'utf-8').match(/^slug:\s*"?([^"\n]+?)"?\s*$/m);
  postHrefs.add(slug ? `/blog/${slug[1].replace(/^\//, '')}` : `/blog/${named[1]}/${named[2]}/${named[3]}/${named[4]}`);
}

const errors = [];
if (posts.length > max) {
  errors.push(`${posts.length}固定帖子，最多为${max}。先取消固定一个。`);
}
for (const post of posts) {
  if (!postHrefs.has(post.href)) errors.push(`"${post.href}”不是博客文章。`);
  if (!existsSync(join(docsRoot, 'static', post.cover))) errors.push(`封面”${post.cover}”在 static/ 下找不到。`);
}

if (errors.length > 0) {
  for (const e of errors) console.error(`\x1b[31m✗\x1b[0m 精选-posts.json:${e}`);
  process.exit(1);
}
console.log(`\x1b[32m✓\x1b[0m${posts.length}/${max}精选帖子有效。`);
