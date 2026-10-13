// 守护总览英雄星座背后的合成记忆库
// (src/components/constellation/mock-bank.ts)。记忆库就是手-written事实
// 加上生成的链接，以及观察中的拼写错误 `from` 索引或损坏
// 链接规则绘制的图形仍然可以渲染——只是错误的。这会检查
// 统治真实`GET /graph`保证，所以这个数字保持一个真正的记忆库
// 可能已经产生了。
//
// CI 运行 Node 20（没有 TypeScript 剥离），因此模块在这里被转译
// 带有文档包已经依赖的TypeScript编译器。
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const src = readFileSync(
  new URL('../src/components/constellation/mock-bank.ts', import.meta.url),
  'utf8'
);
const js = ts.transpileModule(src, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {buildMockBank} = await import(`data:text/javascript,${encodeURIComponent(js)}`);

const failures = [];
const check = (ok, msg) => ok || failures.push(msg);

let first;
try {
  first = buildMockBank();
} catch (err) {
  // 很可能是观察的`from` 索引了一个不存在的事实。
  // 仅打印消息：堆栈跟踪将整个模块作为数据 URL 携带。
  console.error(`检查-mock-bank：buildMockBank()抛出：${err.message}`);
  process.exit(1);
}
const ids = new Set(first.nodes.map((n) => n.id));
check(ids.size === first.nodes.length, 'node ids are not unique');

for (const n of first.nodes) {
  check(typeof n.metadata?.text === 'string' && n.metadata.text.length > 0, `${n.id}: no text`);
  check(!Number.isNaN(Date.parse(n.metadata?.mentioned_at)), `${n.id}: bad mentioned_at`);
}

const LINK_TYPES = new Set(['semantic', 'temporal', 'entity', 'caused_by']);
const degree = new Map();
for (const l of first.links) {
  check(
    ids.has(l.source) && ids.has(l.target),
    `link ${l.source} -> ${l.target}: unknown endpoint`
  );
  check(l.source !== l.target, `link on ${l.source}: self-link`);
  check(LINK_TYPES.has(l.type), `link ${l.source} -> ${l.target}: unexpected type ${l.type}`);
  check(
    l.weight >= 0 && l.weight <= 1,
    `link ${l.source} -> ${l.target}: weight ${l.weight} outside 0..1`
  );
  degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
  degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
}
for (const n of first.nodes) check(degree.get(n.id) > 0, `${n.id}: no links`);

// 观察的大小取决于其来源数量，因此每个观察都必须有一个。
for (const n of first.nodes.filter((n) => n.metadata.fact_type === 'observation')) {
  check(n.metadata.proof_count >= 1, `${n.id}: observation without sources`);
}

// 确定性：在水合后和重新加载时，服务器上的相同字段。
check(
  JSON.stringify(buildMockBank()) === JSON.stringify(first),
  'buildMockBank() is not deterministic'
);

if (failures.length) {
  console.error(
    `检查-mock-bank：${failures.length}problem(s)\n${failures.slice(0, 20).join('\n  ')}`
  );
  process.exit(1);
}
console.log(`检查-mock-bank：${first.nodes.length}回忆，${first.links.length}链接正常`);
