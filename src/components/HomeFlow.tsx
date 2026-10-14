import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {SiPostgresql} from 'react-icons/si';
import {LuArrowRight} from 'react-icons/lu';
import CodingAgentsChart from './CodingAgentsChart';
import styles from './HomeFlow.module.css';

/**
 * The one-glance version of how Hindsight is used, and the homepage's router.
 *
 * It exists because three kinds of visitor arrive on this page wanting
 * different answers to the same question: someone running a coding agent wants
 * to know it plugs into the tool they already use, someone running a personal
 * assistant wants the plugin for it, someone building an app wants the SDK. The
 * interactive figure further down explains the pipeline, which is the second
 * question, not the first.
 *
 * Each card opens on hover and shows what that path actually looks like: the
 * benchmark for coding agents, a remembered exchange for assistants, three
 * calls for an app. An earlier version did this on scroll — pinning the section
 * and advancing a step at a time — which looked good and read badly, because
 * taking the scroll away from someone on a docs site is a toll rather than a
 * feature. Hover costs the reader nothing and skips nothing: it is their
 * pointer, their timing, and the page still scrolls at the speed they expect.
 *
 * It is CSS only (`:hover`, plus `:focus-within` so a keyboard gets the same
 * thing). Where there is no pointer — touch, and any narrow screen — every card
 * is simply open, because a reveal nobody can trigger is content nobody can
 * read.
 *
 * The memory bank is drawn INSIDE the Hindsight boundary, not as a third stage
 * beside it: an earlier version put it in its own box on the right, which read
 * as a separate product you had to bring yourself. What actually sits outside
 * is the database, so Postgres is the thing on the right-hand end.
 *
 * Logos come from static/img/icons — the same set the integrations hub uses.
 */
const AGENTS = [
  {label: 'Claude Code', src: '/img/icons/claude-code.webp'},
  {label: 'Cursor', src: '/img/icons/cursor.svg'},
  {label: 'Codex', src: '/img/icons/codex.svg'},
  {label: 'Copilot', src: '/img/icons/github-copilot.svg'},
  {label: 'Gemini CLI', src: '/img/icons/gemini.svg'},
  {label: 'opencode', src: '/img/icons/opencode.png'},
];

/* The second arrival: someone who runs a personal assistant and wants it to
   remember. These are separate products with separate install paths, so each
   logo is its own link — one card-wide destination would send half of them to
   the wrong page. Two names and two arrows, nothing else: this card is a
   signpost, and the page it points at does the explaining. */
const ASSISTANTS = [
  {label: 'Hermes', src: '/img/icons/hermes.png', to: '/sdks/integrations/hermes'},
  {label: 'OpenClaw', src: '/img/icons/openclaw.svg', to: '/sdks/integrations/openclaw'},
];

const CLIENTS = [
  {label: 'Python', src: '/img/icons/python.svg'},
  {label: 'TypeScript', src: '/img/icons/typescript.png'},
  {label: 'Go', src: '/img/icons/golang.png'},
  {label: 'MCP', src: '/img/icons/mcp.png'},
];

function Icons({items}: {items: {label: string; src: string}[]}): ReactNode {
  const {withBaseUrl} = useBaseUrlUtils();
  return (
    <div className={styles.icons}>
      {items.map((i) => (
        <img key={i.label} src={withBaseUrl(i.src)} alt={i.label} title={i.label} loading="lazy" />
      ))}
    </div>
  );
}

export default function HomeFlow(): ReactNode {
  const {withBaseUrl} = useBaseUrlUtils();
  return (
    <div className={styles.flow}>
      <div className={styles.sources}>
        <Link className={styles.source} to="/sdks/integrations/coding-agents">
          <span className={styles.sourceLabel}>编程智能体</span>
          <Icons items={AGENTS} />
          <span className={styles.sourceNote}>
            一次安装，连接 20 多种运行工具
            <LuArrowRight size={13} />
          </span>

          <div className={styles.reveal}>
            <div>
              <CodingAgentsChart variant="card" />
              <span className={styles.revealNote}>
                AMB 的 sdebench：无论是否使用记忆，都能完成 61 项任务中的 60–61 项；
                使用记忆后，纠正次数更少，花费也更低。
              </span>
            </div>
          </div>
        </Link>

        <div className={styles.source}>
          <span className={styles.sourceLabel}>个人智能体</span>
          <div className={styles.assistants}>
            {ASSISTANTS.map((a) => (
              <Link key={a.label} className={styles.assistant} to={a.to}>
                <img src={withBaseUrl(a.src)} alt="" loading="lazy" />
                {a.label}
                <LuArrowRight size={12} />
              </Link>
            ))}
          </div>

          {/* What having memory sounds like, rather than a description of it.
              Invented, and obviously so — it is an illustration, not a claim. */}
          <div className={styles.reveal}>
            <div>
              <div className={styles.chat}>
                <span className={styles.ask}>里斯本之旅最后是怎么安排的？</span>
                <span className={styles.reply}>
                  你确定了 5 月 12–19 日出行，说想避开电车排队，
                  还让我记下 Cais do Sodré 附近的两家海鲜餐厅。
                </span>
              </div>
            </div>
          </div>
        </div>

        <Link className={styles.source} to="/developer/api/quickstart">
          <span className={styles.sourceLabel}>你的应用</span>
          <Icons items={CLIENTS} />
          <span className={styles.sourceNote}>
            SDK、MCP 或直接使用 HTTP
            <LuArrowRight size={13} />
          </span>

          <div className={styles.reveal}>
            <div>
              <pre className={styles.code}>
                <code>
                  {`await hs.retain(bank, transcript)
await hs.recall(bank, "她有什么偏好？")
await hs.reflect(bank, "我应该推荐 Vue 吗？")`}
                </code>
              </pre>
              <span className={styles.revealNote}>
                三个方法。背后的处理包括信息提取、实体关联、四路检索和重排序。
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className={styles.connector} aria-hidden="true" />

      <div className={styles.core}>
        <span className={styles.coreName}>Hindsight</span>

        <div className={styles.ops}>
          <span><code>retain</code> 存储发生的事情</span>
          <span><code>recall</code> 检索记忆</span>
          <span><code>reflect</code> 基于记忆进行反思</span>
        </div>

        {/* Inside the boundary: the bank is what Hindsight builds, not a
            component you supply. */}
        <div className={styles.bank}>
          <span className={styles.bankName}>记忆库</span>
          <div className={styles.bankItems}>
            <span>事实与实体</span>
            <span>观测</span>
            <span>知识页</span>
          </div>
          <span className={styles.bankNote}>每位用户或每个智能体各有独立记忆库，彼此完全隔离</span>
        </div>
      </div>

      <div className={styles.connector} aria-hidden="true" />

      <div className={styles.store}>
        <SiPostgresql className={styles.storeIcon} size={30} />
        <span className={styles.storeName}>Postgres</span>
        <span className={styles.storeNote}>使用 pgvector</span>

        {/* Managed first: it is the one option that takes no decision. */}
        <ul className={styles.options}>
          <li className={styles.optionPrimary}>
            <Link to="https://ui.hindsight.vectorize.io/signup">
              Hindsight Cloud
              <LuArrowRight size={12} />
            </Link>
            <span>完全托管</span>
          </li>
          <li>
            嵌入式
            <span>无需配置，本地运行</span>
          </li>
          <li>
            使用自己的集群
            <span>提供数据库连接字符串即可</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
