#!/usr/bin/env node
/**
 * 验证 MDX 文档中的每个“语言”Tabs 块都具有所有 4 个必需的变体：
 * Python，Node.js，CLI，开始。
 *
 * A Tabs 块如果包含至少一个 TabItem 则被视为“语言”块
 * 值为“python”、“node”、“cli”或“go”。
 *
 * 运行：节点scripts/check-code-parity.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(__dirname, '..');
const REQUIRED_TABS = new Set(['python', 'node', 'cli', 'go']);

const IGNORED_PATHS = [
  'node_modules',
  'build',
  '.docusaurus',
  'versioned_docs', // 跳过版本化文档
];

/**
 * 递归查找目录下的所有.mdx文件。
 */
function findMdxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_PATHS.includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findMdxFiles(full));
    } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 解析单个 MDX 文件并返回所有违规行为。
 * 违规是指Tabs块至少有一个语言选项卡但缺失
 * 4 种必需的语言变体中的一种或多种。
 */
function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];

  // 将内容分割成Tabs块。
  // 策略：寻找<Tabs>...</Tabs> 部分并扫描TabItem值。
  // 我们使用简单的线-by-line状态机。
  const lines = content.split('\n');
  let inTabs = false;
  let tabsStartLine = -1;
  let currentTabValues = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inTabs) {
      // 寻找开口<Tabs>标签（不是<TabItem>)
      if (/^\s*<Tabs[\s>]/.test(line) && !/<\/Tabs/.test(line)) {
        inTabs = true;
        tabsStartLine = i + 1; // 1-indexed
        currentTabValues = new Set();
      }
    } else {
      // 里面Tabs块 — 寻找 </Tabs> 或嵌套TabItem值
      if (/^\s*<\/Tabs\s*>/.test(line)) {
        // End of Tabs 块 — 检查它是否是语言块
        const hasLanguageTab = [...currentTabValues].some(v => REQUIRED_TABS.has(v));
        if (hasLanguageTab) {
          const missing = [...REQUIRED_TABS].filter(t => !currentTabValues.has(t));
          if (missing.length > 0) {
            violations.push({
              line: tabsStartLine,
              found: [...currentTabValues].filter(v => REQUIRED_TABS.has(v)),
              missing,
            });
          }
        }
        inTabs = false;
        currentTabValues = new Set();
      } else {
        // 寻找TabItem值属性
        // 匹配：<TabItem value="python" 或 <TabItem value='cli'
        const match = line.match(/TabItem[^>]*value=["']([^"']+)["']/);
        if (match) {
          currentTabValues.add(match[1]);
        }
      }
    }
  }

  return violations;
}

// ────主要────────────────────────────────────────────────────────────────────

const mdxFiles = findMdxFiles(docsRoot);
let totalViolations = 0;

for (const filePath of mdxFiles) {
  const violations = checkFile(filePath);
  if (violations.length > 0) {
    const rel = relative(docsRoot, filePath);
    for (const v of violations) {
      console.error(
        `[code-parity]${rel}:${v.line}— Tabs 阻止缺失的语言选项卡：${v.missing.join(', ')}（发现：${v.found.join(', ')})`
      );
    }
    totalViolations += violations.length;
  }
}

if (totalViolations > 0) {
  console.error(`\n[code-parity]❌找到${totalViolations}Tabs block(s) 缺少所需的语言变体。`);
  console.error('[code-parity] 每个带有语言选项卡的 Tabs 块必须包含：python、node、cli、go');
  process.exit(1);
} else {
  console.log(`[code-parity] ✅ 全部${mdxFiles.length}文档文件通过 4-tab 奇偶校验。`);
}
