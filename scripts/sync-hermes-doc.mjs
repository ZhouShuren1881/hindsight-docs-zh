#!/usr/bin/env node
/**
 * 从集成的自述文件中生成docs-integrations/hermes.md。
 *
 * 这两页是手工维护的，漂移严重：到Hindsight离开Hermes时
 * 树状文档页面记录了插件从未读取过的 15 个配置键（`apiPort`, `retainRoles`,
 * camelCase 真实拼写）并省略了 24，同时仍然描述了捆绑的内容
 * provider 作为获胜的副本。自述文件现在是单一来源；这重写了文档页面
 * 因此“让他们保持同步”是机械的而不是习惯。
 *
 * 与sync-coding-agents-doc.mjs形状相同，调整的原因相同：
 *   - Docusaurus frontmatter 替换了 README 的 H1 （标题来自 frontmatter），并且
 *     携带检查-integration-seo.mjs 所需的title/description。
 *   - Repo-relative 链接被删除为纯文本：它们在 GitHub 上解析，但在网站上解析为 404。
 *   - 贡献者-only 部分已删除 - 文档站点的读者不会编辑此树。
 *
 * 运行：节点hindsight-docs/scripts/sync-hermes-doc.mjs [--check]
 * 当文档页面过期而不是编写它时， `--check`会失败（对于 CI）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const readme = join(here, '..', '..', 'hindsight-integrations', 'hermes', 'README.md');
const page = join(here, '..', 'docs-integrations', 'hermes.md');

// 保留在这里而不是衍生出来，所以title/description请继续关注搜索而不触及
// 自述文件自己的标题。 sidebar_position 保留页面在侧边栏中的现有插槽。
const FRONTMATTER = `---
sidebar_position: 10
title: "Hermes 智能体与 Hindsight 的持久记忆 | 集成"
description: "为 Hermes 智能体添加 Hindsight 长期记忆。从 Hermes 插件目录安装，在每轮对话前自动召回上下文，并保存对话供未来会话使用。"
---

{/* GENERATED from hindsight-integrations/hermes/README.md — edit that file, then run
    node hindsight-docs/scripts/sync-hermes-doc.mjs */}
`;

/** 仅在存储库（贡献者-facing）内有意义的部分，从文档页面删除。*/
const DROP_SECTIONS = ['Development'];

/**
 * 前置在 frontmatter: site-only 上下文之后，该上下文在从 README 中读取的内容中没有位置
 * 插件目录（桌面应用程序是一个不同的界面，旧的pip插件是一个文档-era
 * 指向仅存在于网站上的指南的迁移说明）。
 */
const SITE_ONLY_INTRO = `:::tip
Using the **Hermes desktop app**? You can select and configure Hindsight entirely in Settings — no
terminal required. See [Hermes Desktop](/sdks/integrations/hermes-desktop).
:::

:::warning Deprecated: the standalone \`hindsight-hermes\` plugin
The old **\`hindsight-hermes\`** pip plugin (installed into the Hermes virtual environment and
registered through the \`hermes_agent.plugins\` entry point) is **deprecated** — on current Hermes
builds its tools fail with \`{"error": "Timeout context manager should be used inside a task"}\`.
Follow [Migrate hindsight-hermes to Native Hermes Memory](/guides/2026/04/14/guide-migrate-hindsight-hermes-to-native-hermes-memory)
to switch over while keeping the same memory bank.
:::
`;

function build() {
  const src = readFileSync(readme, 'utf8');
  const out = [];
  let dropping = false;
  for (const line of src.split('\n')) {
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
    // Repo-relative 文档站点上的 404 链接；保留标签，删除链接。
    .replace(/\[([^\]]+)\]\((?!https?:|\/)[^)]+\)/g, '$1')
    // 我们自己的绝对 URL -> 站点-relative，因此页面保留在此版本中。
    .replace(/https:\/\/hindsight\.vectorize\.io\/([^\s"')]+)/g, '/$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `${FRONTMATTER}\n${SITE_ONLY_INTRO}\n${body}\n`;
}

const generated = build();
if (process.argv.includes('--check')) {
  if (readFileSync(page, 'utf8') !== generated) {
    console.error(
      '[hermes] ❌ docs page is out of date with the README.\n' +
        '  Run: node hindsight-docs/scripts/sync-hermes-doc.mjs',
    );
    process.exit(1);
  }
  console.log('[hermes] ✅ 文档页面与自述文件匹配。');
} else {
  writeFileSync(page, generated);
  console.log(`[hermes] 写道${page}。`);
}
