#!/usr/bin/env node
/**
 * 从集成的自述文件中生成docs-integrations/coding-agents.md。
 *
 * 这两个页面用不同的语言说了同样的事情并且漂移了——文档页面保持安装
 * 不再起作用的说明和已经落后的安全带表。自述文件是
 * 现在单一来源；这会重写文档页面，因此“使它们保持同步”是机械的
 * 而不是习惯。
 *
 * 应用了两项调整，都是因为受众不同：
 *   - Docusaurus frontmatter 取代了 README 的 H1 （标题来自 frontmatter）。
 *   - 回购协议-relative链接 (`src/…`, `../other-integration`) 被删除为纯文本：它们解析 `src/…` 上的
 *     上GitHub但文档网站上是 404。
 *   - 我们自己域上的绝对资产 URL 成为站点-relative。自述文件必须使用绝对 URL
 *     所以图像在 npm 和 GitHub 上渲染，但在文档网站上，这些相同的 URL 将每个图像固定到
 *     生产 - 因此新资产在部署之前在本地和预览中显示为损坏，
 *     这正是你试图观察它的时候。
 *   -A`<!-- figure: <name> -->`线变成React组件，在顶部导入（参见
 *     数字）。自述文件在那里保留了一个不可见的注释，因为 React 组件呈现在
 *     既不是GitHub也不是npm。
 *   - `skill:begin` / `skill:end` 标记被丢弃。他们告诉集成的
 *     scripts/build-skill.mjs 同伴技能复制的区域； MDX 没有 HTML 注释，
 *     所以将它们留在里面会导致文档构建彻底失败。
 *
 * 运行：节点hindsight-docs/scripts/sync-coding-agents-doc.mjs [--check]
 * 当文档页面过期而不是编写它时， `--check`会失败（对于 CI）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const readme = join(here, '..', '..', 'hindsight-integrations', 'coding-agents', 'README.md');
const page = join(here, '..', 'docs-integrations', 'coding-agents.md');

// 保留在文档页面的frontmatter中而不是衍生出来，所以title/description敬请关注
// 在不触及自述文件本身标题的情况下进行搜索。
// 自述文件中的
const FRONTMATTER = `---
sidebar_position: 6
title: "编程智能体"
description: "统一的 Hindsight 编程智能体记忆插件：从 git 历史和既往会话自动构建各仓库记忆库，在智能体工作时注入相关上下文。"
---

{/* GENERATED from hindsight-integrations/coding-agents/README.md — edit that file, then run
    node hindsight-docs/scripts/sync-coding-agents-doc.mjs */}
`;

/**
 * 当文档页面过期而不是编写它时， `<!-- figure: NAME -->` -> 文档页面上的此组件及其导入。
 * 该标记是 HTML 注释，因此它在呈现 README 的 GitHub 和 npm 上保持不可见
 * 但无法渲染React。
 */
const FIGURES = {
  'coding-agents': {
    jsx: '<Figure doc={codingAgents} />',
    imports: [
      "import Figure from '@site/src/components/Figure';",
      "import codingAgents from '@site/figures/coding-agents.json';",
    ],
  },
  'coding-agents-benchmark': {
    jsx: "<CodingAgentsChart title=\"AMB · sdebench\" />",
    imports: ["import CodingAgentsChart from '@site/src/components/CodingAgentsChart';"],
  },
};

/** 仅在存储库（贡献者-facing）内有意义的部分，从文档页面删除。*/
const DROP_SECTIONS = ['Layout', 'Ingestion internals (no CLI)', 'Companion skill (generated)'];

function build() {
  const src = readFileSync(readme, 'utf8');
  const lines = src.split('\n');
  const out = [];
  let dropping = false;
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const [, hashes, text] = heading;
      if (hashes.length === 1) continue; // theH1成为焦点 `title`
      // 只有H2 打开或关闭拖放的部分。对每个标题重新计算会让
      // H3*里面*掉落的分段开关掉落并泄漏其余部分。
      if (hashes.length === 2) {
        dropping = DROP_SECTIONS.includes(text.trim());
        if (dropping) continue;
      } else if (dropping) {
        continue;
      }
    }
    if (!dropping) out.push(line);
  }
  const body = out
    .join('\n')
    // 同伴-skill生成器的区域标记 - MDX 中的语法无效，并且无意义
    // 均适用于文档网站的读者。
    .replace(/^<!--\s*skill:(?:begin|end)[^>]*-->\n?/gm, '')
    .replace(/^<!--\s*figure: ([a-z0-9-]+)\s*-->$/gm, (line, name) => {
      // 大声，而不是将注释留在原处：MDX 没有 HTML 注释，所以是一个拼写错误
      // 否则，
      // 标记将在文档构建中显示为不相关的解析错误。
      if (!FIGURES[name]) {
        throw new Error(
          `[coding-agents]未知人物”${name}” 在自述文件中 - 将其添加到图形或修复标记。`,
        );
      }
      return FIGURES[name].jsx;
    })
    // Repo-relative 文档站点上的 404 链接；保留标签，删除链接。
    .replace(/\[([^\]]+)\]\((?!https?:|\/)[^)]+\)/g, '$1')
    // 我们自己的绝对URL -> 站点-relative。资产，因此页面使用此构建的静态
    // 文件，而不是生产中的任何文件；文档链接，以便它们在
    // 站点（因此文档-skill生成器可以将它们转换为文件-relative路径，它
    // 不能使用绝对 URL）。自述文件使它们保持绝对，因为它也呈现
    // GitHub 上的
    // 上GitHub，地点-relative会是 404。
    .replace(/https:\/\/hindsight\.vectorize\.io\/([^\s"')]+)/g, '/$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const imports = Object.values(FIGURES)
    .filter((f) => body.includes(f.jsx))
    .flatMap((f) => f.imports)
    .join('\n');
  return `${FRONTMATTER}\n${imports ? `${imports}\n\n` : ''}${body}\n`;
}

const generated = build();
if (process.argv.includes('--check')) {
  const current = readFileSync(page, 'utf8');
  if (current !== generated) {
    console.error(
      '[coding-agents] ❌ docs page is out of date with the README.\n' +
        '  Run: node hindsight-docs/scripts/sync-coding-agents-doc.mjs',
    );
    process.exit(1);
  }
  console.log('[coding-agents] ✅ 文档页面与自述文件匹配。');
} else {
  writeFileSync(page, generated);
  console.log(`[coding-agents] 写道${page}。`);
}
