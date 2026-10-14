import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import {LuArrowUpRight} from 'react-icons/lu';
import styles from './CodingAgentsChart.module.css';

/**
 * AMB sdebench 数据集展示了记忆对编程智能体的影响。
 *
 * 通过 `variant` 属性在两个位置渲染：主页的编程智能体卡片中使用 `card`，
 * 集成页面（解释指标含义的页面）中使用 `full`。它以前位于主页的基准测试部分；
 * 作为读者刚看到的方案的证据，比放在准确率图表下方作为第二张图更合适。
 *
 * 检索准确率图表回答“检索效果好吗”。这张图回答评估编程智能体插件的开发者
 * 真正关心的问题：它能否降低智能体成本，减少令人烦恼的纠正。两个指标同时变化，
 * 因此图表采用二维形式：每个智能体一支箭头，从无记忆指向 Hindsight，
 * 所有箭头都朝左上方。
 *
 * 智能体自己的徽标标记 Hindsight 端，空心灰点标记另一端，因此无需查图例，
 * 看到徽标就知道 Hindsight 的位置。每个点还标出纠正次数，和 AMB 自己的图表一样。
 *
 * 数值根据 agentmemorybenchmark.ai/dataset/sdebench 的逐次运行表计算；
 * 每个单元格包含 61 项任务 × 3 次运行：纠正次数/任务 = mean(interventions)/61，
 * 成本/任务 = mean(cost)/61。纠正次数复现了 AMB 自己图表上显示的两位小数标签，
 * 这也使推算出的成本列值得信赖。
 *
 * sdebench 是一个准确率并非重点的数据集：无论是否使用记忆，每次运行都能完成
 * 61 项中的 60–61 项。记忆改变的是达到这一结果的成本。
 */
const AGENTS: {
  name: string;
  icon: string;
  from: {cost: number; fixes: number};
  to: {cost: number; fixes: number};
}[] = [
  {
    name: 'Claude Code',
    icon: '/img/icons/claude-code.webp',
    from: {cost: 0.445, fixes: 0.85},
    to: {cost: 0.338, fixes: 0.36},
  },
  {
    name: 'Codex CLI',
    icon: '/img/icons/codex.svg',
    from: {cost: 0.577, fixes: 1.34},
    to: {cost: 0.276, fixes: 0.47},
  },
  {
    name: 'opencode',
    icon: '/img/icons/opencode.png',
    from: {cost: 0.634, fixes: 1.20},
    to: {cost: 0.553, fixes: 0.80},
  },
];

/**
 * 两种形状对应两个展示位置。
 *
 * `full` 又宽又矮，适合完整内容栏；如果再压窄，三个带标签的标记会彼此重叠。
 *
 * `card` 更接近方形，适合主页的编程智能体卡片；宽度约为一半，因此图表会牺牲
 * 长宽比来保持可读性。文字不会随之缩小（见样式表中的 `.compact`）。
 */
const GEOMETRY = {
  full: {W: 940, H: 270, PLOT: {left: 60, right: 860, top: 34, bottom: 196}},
  card: {W: 560, H: 286, PLOT: {left: 56, right: 520, top: 40, bottom: 216}},
};

// 成本按对数刻度绘制，与 AMB 的图表一致：刻度间隔表示乘法关系。
const COST = {min: 0.24, max: 0.72};
const FIXES_MAX = 1.5;

const CHIP = 26;

export default function CodingAgentsChart({
  title = '编程智能体',
  variant = 'full',
}: {
  title?: string;
  /** `card` 不显示标题、“完整结果”链接或图注：它渲染在自身就是链接的卡片内，
      不能嵌套使用 <a>。 */
  variant?: keyof typeof GEOMETRY;
}): ReactNode {
  const {withBaseUrl} = useBaseUrlUtils();
  const {W, H, PLOT} = GEOMETRY[variant];
  const compact = variant === 'card';

  const lx = (c: number) =>
    PLOT.left +
    ((Math.log(c) - Math.log(COST.min)) / (Math.log(COST.max) - Math.log(COST.min))) *
      (PLOT.right - PLOT.left);

  // 纵轴反向：纠正次数越少越好，因此数值越少，位置越靠上。
  const ly = (f: number) => PLOT.top + (f / FIXES_MAX) * (PLOT.bottom - PLOT.top);

  return (
    <section className={clsx(styles.section, compact && styles.compact)}>
      {!compact && (
        <div className={styles.head}>
          <h3 className={styles.title}>{title}</h3>
          <Link className={styles.more} to="https://agentmemorybenchmark.ai/dataset/sdebench">
            完整结果
            <LuArrowUpRight size={14} />
          </Link>
        </div>
      )}

      <figure className={styles.figure}>
    <svg
      className={styles.chart}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="AMB 的 sdebench 中每项任务的纠正次数与成本。使用 Hindsight 后，Claude Code 从 0.85 次纠正、0.45 美元降至 0.36 次、0.34 美元；Codex CLI 从 1.34 次、0.58 美元降至 0.47 次、0.28 美元；opencode 从 1.20 次、0.63 美元降至 0.80 次、0.55 美元。所有智能体的纠正次数和成本均有所下降。">
      <defs>
        <marker
          id="hca-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className={styles.arrowHead} />
        </marker>
      </defs>

      {[0, 0.5, 1.0, 1.5].map((f) => (
        <g key={f}>
          <line className={styles.grid} x1={PLOT.left} x2={PLOT.right} y1={ly(f)} y2={ly(f)} />
          <text className={styles.axis} x={PLOT.left - 10} y={ly(f) + 4} textAnchor="end">
            {f.toFixed(1)}
          </text>
        </g>
      ))}
      {[0.25, 0.35, 0.5, 0.7].map((c) => (
        <text key={c} className={styles.axis} x={lx(c)} y={PLOT.bottom + 22} textAnchor="middle">
          ${c.toFixed(2)}
        </text>
      ))}

      <text className={styles.axisTitle} x={PLOT.left - 48} y={PLOT.top - 16}>
        纠正次数 / 任务 — 越少越好 ↑
      </text>
      <text
        className={styles.axisTitle}
        x={(PLOT.left + PLOT.right) / 2}
        y={PLOT.bottom + 48}
        textAnchor="middle">
        成本 / 任务（美元，对数刻度）— 越低越好 ←
      </text>

      {AGENTS.map((a) => (
        <g key={a.name}>
          {/* 起始位置。空心灰点表示所有智能体共有的“无记忆”状态，并非独立数据系列。 */}
          <circle className={styles.before} cx={lx(a.from.cost)} cy={ly(a.from.fixes)} r={4.5} />
          <text
            className={styles.valueBefore}
            x={lx(a.from.cost) + 10}
            y={ly(a.from.fixes) + 4}>
            {a.from.fixes.toFixed(2)}
          </text>

          <line
            className={styles.arrow}
            x1={lx(a.from.cost)}
            y1={ly(a.from.fixes)}
            x2={lx(a.to.cost)}
            y2={ly(a.to.fixes)}
            markerEnd="url(#hca-arrow)"
          />

          {/* Hindsight 的位置：智能体自己的徽标位于准确坐标。白色底片并非装饰，
              有几个徽标是近黑色线稿，直接放在主视觉色带上会看不清。
              名称放在徽标上方，数值放在下方，二者都以徽标为中心；若放在旁边，
              三个智能体中有两个会因位置太近而重叠。 */}
          <rect
            className={styles.chip}
            x={lx(a.to.cost) - CHIP / 2}
            y={ly(a.to.fixes) - CHIP / 2}
            width={CHIP}
            height={CHIP}
            rx={7}
          />
          <image
            href={withBaseUrl(a.icon)}
            x={lx(a.to.cost) - 9}
            y={ly(a.to.fixes) - 9}
            width={18}
            height={18}
          />
          <text
            className={styles.label}
            x={lx(a.to.cost)}
            y={ly(a.to.fixes) - CHIP / 2 - 7}
            textAnchor="middle">
            {a.name}
          </text>
          <text
            className={styles.valueAfter}
            x={lx(a.to.cost)}
            y={ly(a.to.fixes) + CHIP / 2 + 13}
            textAnchor="middle">
            {a.to.fixes.toFixed(2)}
          </text>
        </g>
      ))}
    </svg>

        <figcaption className={styles.caption}>
          <span className={styles.key}>
            <i className={styles.keyBefore} /> 无记忆
            <i className={styles.keyAfter} /> 使用 Hindsight
          </span>
          {!compact &&
            '无论是否使用记忆，每个智能体都能完成 61 项任务中的 60–61 项；记忆改变的是完成任务的成本。数据为 3 次运行的平均值。'}
        </figcaption>
      </figure>

    </section>
  );
}
