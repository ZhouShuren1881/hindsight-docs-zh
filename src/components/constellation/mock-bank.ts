// A synthetic memory bank for the docs hero, built the way `GET /graph` builds a
// real one (MemoryEngine.get_graph_data), so it can be hovered without a server:
//
// - Facts (world, experience) carry the links retain writes between facts:
//   `semantic` (similar meaning), `temporal` (close in time) and `caused_by`
//   (one fact explains another — retain writes only this causal kind).
// - Observations have no links of their own. They are consolidated from source
//   facts, inherit those facts' links and entities, are linked `semantic` to
//   observations sharing a source, and their size is their source count.
// - `entity` links are derived, not stored: units mentioning the same entity are
//   linked to their next 10 neighbours in that entity's list.
//
// Deterministic by design (a seeded LCG, no Math.random): the hero must render
// the same field on the server, after hydration, and in every screenshot, and a
// docs figure that reshuffles on reload is a figure nobody can point at.

import type { GraphData, GraphLink, GraphNode } from "./graph-data";

/** Seeded LCG (Numerical Recipes). Enough for placing dots. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

type Topic = {
  world: string[];
  experience: string[];
  /** `from` indexes the topic's facts: world first, then experience. */
  observation: Array<{ text: string; from: number[] }>;
  /** [effect, cause] pairs, same indexing as `from`. */
  causedBy?: Array<[number, number]>;
};

/**
 * What a coding agent working with one platform team would remember. Every
 * observation is consolidated from the facts it lists, and says nothing those
 * facts do not support.
 */
const TOPICS: Topic[] = [
  {
    world: [
      "Alice 在 Google 担任资深工程师", // 0
      "Alice 于 2023 年 3 月加入平台团队", // 1
      "Alice 负责数据摄取流水线", // 2
      "Alice 常驻苏黎世", // 3
      "Alice 会在每次迁移发布前进行审查", // 4
      "Alice 更喜欢收到呼叫通知，而非电子邮件", // 5
      "Alice 执行了 Postgres 16 升级", // 6
      "Alice 编写了数据摄取流水线使用的重试策略", // 7
    ],
    experience: [
      "我请 Alice 审查保留策略迁移", // 8
      "6 月数据摄取事故期间，我呼叫了 Alice", // 9
      "我把记忆召回基准测试数据发给了 Alice", // 10
      "我向 Alice 概述了迁移计划", // 11
    ],
    observation: [
      { text: "数据摄取相关问题应交给 Alice", from: [2, 7, 9] },
      { text: "通过呼叫通知而非邮件联系 Alice，响应最快", from: [5, 9] },
      { text: "迁移发布前需要 Alice 审查", from: [4, 8, 11] },
    ],
    causedBy: [
      [8, 4],
      [9, 5],
    ],
  },
  {
    world: [
      "团队将仪表盘从 React 迁移到了 Vue", // 0
      "Vue 3 组合式 API 是团队的标准写法", // 1
      "旧 React 组件保留在管理应用中", // 2
      "Vue 组件使用 eslint-plugin-vue 进行代码检查", // 3
      "设计系统在第二季度改用 Vue 重写", // 4
      "Storybook 针对 Vue 组件运行", // 5
    ],
    experience: [
      "改用 Vue 之前，我向 Bob 推荐过 React", // 6
      "我用 Vue 重写了设置页面", // 7
      "我移除了仪表盘中的最后一个 React 依赖", // 8
    ],
    observation: [
      { text: "团队的仪表盘已从 React 转向 Vue", from: [0, 4, 7, 8] },
      { text: "新的 UI 开发应采用 Vue，而非 React", from: [0, 1, 4] },
    ],
    causedBy: [
      [7, 0],
      [8, 0],
    ],
  },
  {
    world: [
      "记忆通过 pgvector 存储在 Postgres 中", // 0
      "pgvector 索引使用 HNSW，m=16", // 1
      "关键词搜索使用 Postgres 全文搜索", // 2
      "迁移通过 Alembic 管理", // 3
      "生产集群运行 Postgres 16", // 4
      "Postgres 只读副本处理记忆召回请求", // 5
      "连接池通过 pgbouncer 实现", // 6
    ],
    experience: [
      "我为包含 1000 万行的记忆库调整了 HNSW 参数", // 7
      "我发现一次缓慢的记忆召回是由缺少 Postgres 索引引起的", // 8
      "我在租户 schema 上执行了 Alembic 迁移", // 9
    ],
    observation: [
      { text: "记忆召回缓慢通常是因为缺少索引，而非 pgvector", from: [0, 8] },
      { text: "Schema 变更通过 Alembic 迁移发布", from: [3, 9] },
    ],
  },
  {
    world: [
      "Alice 在 2023 年春天去过巴黎", // 0
      "团队异地活动在巴黎举行", // 1
      "Google 在巴黎设有办公室", // 2
      "巴黎团队负责欧盟区域", // 3
      "欧盟客户数据保存在欧盟区域内", // 4
    ],
    experience: [
      "我预订了巴黎团队活动的行程", // 5
      "巴黎团队活动结束后，我撰写了出差报告", // 6
    ],
    observation: [{ text: "欧盟数据驻留问题应交给巴黎团队", from: [3, 4] }],
    causedBy: [[5, 1]],
  },
  {
    world: [
      "Hindsight 提取带类型的事实，而非存储对话记录", // 0
      "Hindsight 的记忆召回并行执行四路搜索", // 1
      "记忆召回结果按排名融合，而非按分数融合", // 2
      "交叉编码器对融合后的记忆召回结果重新排序", // 3
      "记忆召回填满 token 预算，而非固定返回 top-k 条结果", // 4
      "每条观测都保留其证据与历史", // 5
      "知识页会随着记忆整合的进行而重写", // 6
      "知识页从不相互引用", // 7
    ],
    experience: [
      "我在夜间对客服记忆库执行了记忆整合", // 8
      "我通过 hindsight fs mount 挂载了知识页", // 9
      "我通过反思回答了一个值班问题", // 10
    ],
    observation: [
      { text: "记忆召回按排名合并多路搜索结果，然后重新排序", from: [1, 2, 3] },
      { text: "只有持续执行记忆整合，知识页才能保持最新", from: [6, 8] },
    ],
  },
  {
    world: [
      "值班每周轮换，周一交接", // 0
      "Sev1 会同时呼叫主值班人员和备班人员", // 1
      "值班操作手册存放在知识页中，而非 Notion", // 2
      "每次事故都要在 5 天内形成书面复盘", // 3
      "仪表盘使用 Grafana，告警通过 Alertmanager 发送", // 4
      "每晚呼叫超过 5 次会触发一次告警优化", // 5
    ],
    experience: [
      "我从 Dana 手中接过值班工作", // 6
      "我将反复触发的磁盘告警静默了一周", // 7
      "我撰写了 6 月数据摄取事故的复盘", // 8
    ],
    observation: [{ text: "大多数值班呼叫来自数据摄取流水线", from: [7, 8] }],
    causedBy: [
      [6, 0],
      [7, 5],
      [8, 3],
    ],
  },
  {
    world: [
      "Bob 领导检索团队", // 0
      "Bob 编写了重排序器基准测试框架", // 1
      "Bob 更喜欢书面提案，而非开会", // 2
      "Bob 在巴黎办公室工作", // 3
      "Bob 负责记忆召回评估套件", // 4
    ],
    experience: [
      "我把排名融合提案发给了 Bob", // 5
      "我审查了 Bob 的重排序器基准测试数据", // 6
      "在 Bob 的设计评审中，我主张采用排名融合", // 7
    ],
    observation: [
      { text: "检索变更发布前需要 Bob 批准", from: [0, 4, 7] },
      { text: "Bob 会回应书面提案，而非会议邀请", from: [2, 5] },
    ],
    causedBy: [[5, 2]],
  },
  {
    world: [
      "嵌入默认使用本地 SentenceTransformers 模型", // 0
      "远程嵌入提供商包括 OpenAI、Cohere 和 TEI", // 1
      "记忆库的嵌入维度在创建时固定", // 2
      "重新生成记忆库嵌入会作为后台迁移运行", // 3
      "ONNX 嵌入提供商在进程内运行，无需服务器", // 4
    ],
    experience: [
      "我将客服记忆库切换到了 Cohere 嵌入", // 5
      "我对比测试了 ONNX 嵌入与本地模型", // 6
    ],
    observation: [
      { text: "更换嵌入提供商意味着要重新生成记忆库嵌入", from: [2, 3, 5] },
    ],
  },
  {
    world: [
      "记忆从不按计划自动删除", // 0
      "遗忘事实需要显式执行失效操作", // 1
      "已失效的事实仍作为观测的证据保留", // 2
      "导出记忆库时会包含其操作与队列", // 3
      "GDPR 删除会移除文档及其派生事实", // 4
    ],
    experience: [
      "我将已撤回工单中的事实标记为失效", // 5
      "迁移前，我导出了预发布环境的记忆库", // 6
    ],
    observation: [
      { text: "移除记忆时，也必须移除由其派生的事实", from: [1, 4, 5] },
    ],
  },
  {
    world: [
      "编程智能体会存储每个已结束会话的记忆", // 0
      "每份已存储文档都记录由哪个编程智能体撰写", // 1
      "编程智能体在写代码前会阅读知识页", // 2
      "会话自动采集，无需手动记录", // 3
      "Hindsight 插件以编程智能体可加载的技能形式提供", // 4
    ],
    experience: [
      "修改引擎前，我阅读了组件关系图", // 5
      "我纠正了一条关于默认配置的过时记忆", // 6
      "我将检索改进计划保存为知识页", // 7
    ],
    observation: [
      { text: "编程智能体会话是记忆库最大的事实来源", from: [0, 3] },
      { text: "纠正会取代与其矛盾的过时记忆", from: [6] },
    ],
  },
  {
    world: [
      "在包含 100 万条记忆的记忆库中，记忆召回 p50 延迟为 180ms", // 0
      "交叉编码器是记忆召回中最大的单项开销", // 1
      "图搜索每跳会为记忆召回增加约 20ms 延迟", // 2
      "记忆存储是异步的，会返回回执", // 3
      "记忆整合在工作进程中运行，不占用请求处理路径", // 4
    ],
    experience: [
      "我分析了包含 1000 万行的记忆库的记忆召回性能", // 5
      "我将记忆整合移出了记忆存储请求的处理路径", // 6
    ],
    observation: [
      { text: "记忆召回延迟主要花在重排序上，因此应限制候选数量", from: [0, 1, 5] },
    ],
    causedBy: [[6, 5]],
  },
  {
    world: [
      "平台团队常驻苏黎世", // 0
      "周一值班交接会议由苏黎世团队主持", // 1
      "苏黎世是欧盟区域的故障转移目标", // 2
    ],
    experience: ["我远程参加了苏黎世的交接会议"], // 3
    observation: [{ text: "平台团队在苏黎世负责值班工作", from: [0, 1, 3] }],
  },
];

/**
 * Entity extraction, standing in for the LLM's: a fact mentions an entity when
 * its text matches the pattern. Unmatched facts get no entities — as they would
 * in a real bank — and so no entity links.
 */
const ENTITIES: Array<[string, RegExp]> = [
  ["Alice", /\bAlice\b/],
  ["Bob", /\bBob\b/],
  ["Dana", /\bDana\b/],
  ["Google", /\bGoogle\b/],
  ["苏黎世", /\bZurich\b|苏黎世/],
  ["巴黎", /\bParis\b|巴黎/],
  ["欧盟区域", /\bEU\b|欧盟/],
  ["Vue", /\bVue\b/],
  ["React", /\bReact\b/],
  ["Postgres", /\bPostgres|pgvector|pgbouncer\b/],
  ["Alembic", /\bAlembic\b/],
  ["HNSW", /\bHNSW\b/],
  ["Grafana", /\bGrafana\b/],
  ["Cohere", /\bCohere\b/],
  ["ONNX", /\bONNX\b/],
  ["Hindsight", /\bHindsight\b/],
  ["记忆召回", /\brecall\b|记忆召回/i],
  ["重排序器", /\brerank|cross-encoder|重排序|交叉编码器/i],
  ["排名融合", /\bfus(ed|ion)\b|融合/i],
  ["记忆整合", /\bconsolidat|记忆整合/i],
  ["知识页", /\bknowledge pages?\b|知识页/i],
  ["嵌入", /\bembedding|嵌入/i],
  ["数据摄取流水线", /\bingestion\b|数据摄取/i],
  ["值班", /\bon-call\b|\bpaged\b|值班|呼叫/i],
  ["迁移", /\bmigrations?\b|迁移/i],
  ["编程智能体", /\bcoding agent\b|\bsessions?\b|编程智能体|会话/i],
  ["失效", /\binvalidat|\bforget|失效|遗忘/i],
  ["删除", /\bdelet|\bremov(e|ing) a memory|删除|移除记忆/i],
  ["记忆库导出", /\bexport|导出/i],
  ["观测", /\bobservations?\b|观测/i],
  ["事故", /\bincident\b|事故/i],
  ["告警", /\balerts?\b|告警/i],
  ["记忆存储", /\bretain|记忆存储|存储/i],
  ["纠正", /\bcorrect|纠正/i],
];

/** The window the bank's facts were mentioned in, for the recency colour. */
const FIRST_MENTION = Date.parse("2026-01-05T00:00:00Z");
const LAST_MENTION = Date.parse("2026-09-15T00:00:00Z");
const DAY = 86_400_000;
/** The days the agent had sessions on: roughly weekly across the window. */
const SESSIONS = Array.from(
  { length: 36 },
  (_, i) => FIRST_MENTION + (i / 35) * (LAST_MENTION - FIRST_MENTION)
);

/** The API's own node colour: by how many entities the memory mentions. */
function entityColor(count: number): string {
  return count === 0 ? "#e0e0e0" : count === 1 ? "#90caf9" : "#42a5f5";
}

/** The API's own label: the text cut at 30 characters. */
function shortLabel(text: string): string {
  return text.length > 30 ? `${text.slice(0, 30)}...` : text;
}

type Unit = {
  id: string;
  text: string;
  type: "world" | "experience" | "observation";
  entities: string[];
  mentioned: number;
  sources: string[];
};

export function buildMockBank(): GraphData {
  const rand = rng(20260408);
  const facts: Unit[] = [];
  const observations: Unit[] = [];
  const links: GraphLink[] = [];
  const link = (a: string, b: string, type: string, weight: number, entity?: string) =>
    links.push({ source: a, target: b, type, weight, entity });

  TOPICS.forEach((topic, ti) => {
    const mine: Unit[] = [];
    [
      ...topic.world.map((t) => ["world", t] as const),
      ...topic.experience.map((t) => ["experience", t] as const),
    ].forEach(([type, text], i) => {
      const unit: Unit = {
        id: `t${ti}-${type}-${i}`,
        text,
        type,
        entities: ENTITIES.filter(([, re]) => re.test(text)).map(([name]) => name),
        // Facts arrive in sessions, so mention dates cluster by session.
        mentioned: SESSIONS[Math.floor(rand() * SESSIONS.length)] + rand() * 6 * 3_600_000,
        sources: [],
      };
      mine.push(unit);
      facts.push(unit);
    });

    // Semantic links: facts about one topic are mostly similar to each other.
    for (let a = 0; a < mine.length; a++) {
      for (let b = a + 1; b < mine.length; b++) {
        if (rand() < 0.8) link(mine[a].id, mine[b].id, "semantic", 0.7 + rand() * 0.25);
      }
    }
    for (const [effect, cause] of topic.causedBy ?? []) {
      link(mine[effect].id, mine[cause].id, "caused_by", 0.9);
    }

    for (const [k, obs] of topic.observation.entries()) {
      const sources = obs.from.map((i) => mine[i]);
      observations.push({
        id: `t${ti}-observation-${k}`,
        text: obs.text,
        type: "observation",
        // Inherited from the sources, as the graph endpoint does.
        entities: [...new Set(sources.flatMap((s) => s.entities))],
        // Consolidated a few days after its newest evidence was mentioned.
        mentioned: Math.max(...sources.map((s) => s.mentioned)) + (1 + rand() * 4) * DAY,
        sources: sources.map((s) => s.id),
      });
    }
  });

  // Cross-topic semantic links: fewer, and only between facts that share an
  // entity — "Alice ran the Postgres 16 upgrade" is near the Postgres facts.
  for (let a = 0; a < facts.length; a++) {
    for (let b = a + 1; b < facts.length; b++) {
      const sameTopic = facts[a].id.split("-")[0] === facts[b].id.split("-")[0];
      const shared = facts[a].entities.some((e) => facts[b].entities.includes(e));
      if (!sameTopic && shared && rand() < 0.7)
        link(facts[a].id, facts[b].id, "semantic", 0.7 + rand() * 0.2);
      // Temporal links: mentioned within eight days (about one session apart), stronger when closer.
      const gap = Math.abs(facts[a].mentioned - facts[b].mentioned);
      if (gap < 8 * DAY) link(facts[a].id, facts[b].id, "temporal", 1 - gap / (8 * DAY));
    }
  }

  // Observations inherit every link touching one of their sources.
  const factLinks = [...links];
  for (const obs of observations) {
    for (const l of factLinks) {
      if (obs.sources.includes(l.source) && !obs.sources.includes(l.target))
        link(obs.id, l.target, l.type!, l.weight!);
      else if (obs.sources.includes(l.target) && !obs.sources.includes(l.source))
        link(l.source, obs.id, l.type!, l.weight!);
    }
  }
  // ...and are semantically linked to observations sharing a source.
  for (let a = 0; a < observations.length; a++) {
    for (let b = a + 1; b < observations.length; b++) {
      if (observations[a].sources.some((s) => observations[b].sources.includes(s))) {
        link(observations[a].id, observations[b].id, "semantic", 1);
      }
    }
  }

  // Entity links, derived: each unit to its next 10 in each entity's list.
  const units = [...facts, ...observations];
  for (const [name] of ENTITIES) {
    const members = units.filter((u) => u.entities.includes(name));
    members.forEach((u, i) => {
      for (const v of members.slice(i + 1, i + 11)) link(u.id, v.id, "entity", 1, name);
    });
  }

  const nodes: GraphNode[] = units.map((u) => ({
    id: u.id,
    label: shortLabel(u.text),
    color: entityColor(u.entities.length),
    metadata: {
      text: u.text,
      fact_type: u.type,
      entities: u.entities.join(", "),
      mentioned_at: new Date(u.mentioned).toISOString(),
      ...(u.type === "observation" ? { proof_count: u.sources.length } : {}),
    },
  }));

  // The ungrouped layout places nodes around a ring by their index, so a bank
  // listed topic by topic draws as arcs. A real bank comes back interleaved;
  // shuffle (seeded) so the field reads like one.
  for (let i = nodes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
  }

  return { nodes, links };
}
