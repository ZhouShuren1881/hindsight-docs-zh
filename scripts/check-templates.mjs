#!/usr/bin/env node
/**
 * 验证从 templates.json 引用的每个清单都符合
 * 到记忆库模板JSON架构（static/bank-template-schema.json）。
 * 每个目录条目的manifest_file 均从磁盘加载。
 *
 * 运行：节点scripts/check-templates.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(__dirname, '..');
const dataRoot = join(docsRoot, 'src/data');

const catalog = JSON.parse(
  readFileSync(join(dataRoot, 'templates.json'), 'utf-8'),
);
const schema = JSON.parse(
  readFileSync(join(docsRoot, 'static/bank-template-schema.json'), 'utf-8'),
);

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

let failed = 0;

for (const entry of catalog.templates) {
  const manifest = JSON.parse(
    readFileSync(join(dataRoot, entry.manifest_file), 'utf-8'),
  );
  const valid = validate(manifest);
  if (!valid) {
    failed++;
    console.error(`\x1b[31m✗\x1b[0m 模板"${entry.id}" (${entry.manifest_file}) 的清单无效：`);
    // 过滤掉嘈杂的anyOf包装器错误，仅保留带有路径的叶错误
    const meaningful = validate.errors.filter(
      (e) => e.keyword !== 'anyOf' && e.keyword !== 'if' && e.keyword !== 'then',
    );
    const shown = meaningful.length > 0 ? meaningful : validate.errors;
    for (const err of shown) {
      const path = err.instancePath || err.schemaPath || '(root)';
      console.error(`    ${path}: ${err.message} ${err.params ? JSON.stringify(err.params) : ''}`);
    }
  } else {
    console.log(`\x1b[32m✓\x1b[0m 模板"${entry.id}” — 有效`);
  }
}

if (failed > 0) {
  console.error(`\n\x1b[31m${failed}template(s) 架构验证失败。\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32mAll${catalog.templates.length}模板有效。\x1b[0m`);
}
