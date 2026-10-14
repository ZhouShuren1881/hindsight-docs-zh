import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import clsx from 'clsx';
import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import {usePluginData} from '@docusaurus/useGlobalData';
import IntegrationsBanner from '@site/src/components/IntegrationsBanner';
import {integrationsSorted, CATEGORY_LABELS, groupByCategory} from '@site/src/lib/integrations';
// Agents covered by the Coding Agents plugin. Shared with the sidebar preview so the two cannot
// drift.
import {
  CODING_AGENT_HARNESSES,
  harnessDocLink,
  harnessIconPath,
} from '@site/src/lib/coding-agent-harnesses';
import styles from './index.module.css';

/**
 * Pinned above the grid. These three are the ones we want a first-time visitor to see: the umbrella
 * coding-agent plugin, and the two agent harnesses that ship Hindsight as a first-class memory
 * provider — Hermes lists it in its own plugin catalog, so `hermes plugins install hindsight` is
 * the whole setup.
 */
const FEATURED_IDS = ['coding-agents', 'hermes', 'openclaw'];

const SUBMIT_INTEGRATION_URL =
  'https://github.com/vectorize-io/hindsight/issues/new?template=feature_request.yml&title=Integration%3A+';

type IntegrationType = 'official' | 'community';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: IntegrationType;
  by: string;
  category: string;
  link: string;
  icon?: string;
}

/**
 * The gallery is a browse surface, not a reading surface: 60 three-line cards with a repeated
 * "Hindsight Team" byline made the page long enough that scanning it meant scrolling past what you
 * were looking for. This is the same row the changelog listing uses — icon, name, two lines of
 * description — grouped by category so the shape of the catalogue is visible at a glance.
 *
 * Featured uses the same row, tinted and spanning wider tracks, so the page reads as one list with
 * three entries lifted out of it rather than two competing card designs.
 */
function IntegrationCard({
  integration,
  changelogSlug,
  featured = false,
}: {
  integration: Integration;
  changelogSlug?: string;
  featured?: boolean;
}) {
  const iconSrc = useBaseUrl(integration.icon ?? '');
  const isExternal = integration.link.startsWith('http');

  return (
    <div className={`${styles.compactCard} ${featured ? styles.compactCardFeatured : ''}`}>
      <div className={styles.compactHeader}>
        {integration.icon && <img src={iconSrc} alt="" className={styles.compactIcon} aria-hidden />}
        <Link
          to={integration.link}
          className={styles.compactName}
          {...(isExternal ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>
          {integration.name}
        </Link>
        {integration.type === 'community' && (
          <img
            src={`https://github.com/${integration.by}.png?size=40`}
            alt={`由社区作者 @${integration.by}`}
            title={`由社区作者 @${integration.by}`}
            className={styles.compactAuthor}
            loading="lazy"
          />
        )}
      </div>

      <p className={styles.compactDescription}>{integration.description}</p>

      <div className={styles.compactActions}>
        <Link
          to={integration.link}
          className={styles.actionPill}
          {...(isExternal ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>
          {isExternal ? '网站 ↗' : '文档'}
        </Link>
        {/* Only integrations that publish a package have a changelog; the rest would link to a 404. */}
        {changelogSlug && (
          <Link to={`/changelog/integrations/${changelogSlug}`} className={styles.actionPill}>
            更新日志
          </Link>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsHub(): React.ReactElement {
  const {withBaseUrl} = useBaseUrlUtils();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<IntegrationType | 'all'>('all');

  // Which integrations have a changelog page, from the same build-time index the /changelog
  // listing uses — so a card grows a Changelog button the release after its first release,
  // with nothing here to update.
  const {entries: changelogEntries} = usePluginData('integration-changelogs') as {
    entries: {id: string; slug: string}[];
  };
  const changelogSlugs = useMemo(
    () => new Map(changelogEntries.map((e) => [e.id, e.slug])),
    [changelogEntries],
  );

  // Superseded pages stay published and linked from the docs sidebar, but the gallery is where
  // people come to CHOOSE an integration — offering something we are actively migrating them off
  // would be pointing them at a dead end.
  const integrations = (integrationsSorted as unknown as Integration[]).filter(
    (i) => i.category !== 'legacy',
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return integrations.filter((i) => {
      if (selectedType !== 'all' && i.type !== selectedType) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [integrations, search, selectedType]);

  // Featured only makes sense on the unfiltered view: once someone searches or filters, pinned
  // cards would sit above results that don't match them and read as noise.
  const showFeatured = !search.trim() && selectedType === 'all';
  const featured = useMemo(
    () =>
      FEATURED_IDS.map((id) => integrations.find((i) => i.id === id)).filter(
        (i): i is Integration => Boolean(i),
      ),
    [integrations],
  );
  const rest = useMemo(
    () => (showFeatured ? filtered.filter((i) => !FEATURED_IDS.includes(i.id)) : filtered),
    [filtered, showFeatured],
  );

  // The individual coding agents are not catalogue entries — one plugin installs all of them — but
  // people search this page for the agent they use, not for the plugin's name, and found nothing.
  // A card each, pointing at that agent's install section on the plugin page. All official, so the
  // community filter hides the section rather than showing an empty one.
  const harnesses = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (selectedType === 'community') return [];
    return CODING_AGENT_HARNESSES.filter((h) => !q || h.label.toLowerCase().includes(q));
  }, [search, selectedType]);

  // Counts what the page is showing, harness cards included — searching "Codex" matches no
  // catalogue entry, and a toolbar reading "0 integrations" above a matching card is just wrong.
  const resultCount = filtered.length + harnesses.length;

  const officialCount = integrations.filter((i) => i.type === 'official').length;
  const communityCount = integrations.filter((i) => i.type === 'community').length;

  return (
    <Layout title="集成中心" description="浏览 Hindsight 智能体记忆的官方集成与社区集成">

      {/* Full-width hero with its own background */}
      <div className={clsx('hs-hero-band', styles.heroSection)}>
        <h1 className={styles.heroTitle}>集成中心</h1>
        <p className={styles.heroSubtitle}>
          将 Hindsight 接入你的技术栈，浏览官方集成和社区构建的连接器。
        </p>

        <div className={styles.hubSearchWrapper}>
          <input
            type="text"
            className={styles.hubSearchInput}
            placeholder="搜索集成…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索集成"
            autoComplete="off"
          />
          {search && (
            <button className={styles.hubSearchClear} onClick={() => setSearch('')} aria-label="清除搜索">
              ×
            </button>
          )}
        </div>

        <div className={styles.heroStats}>
          <span className={styles.stat}><strong>{officialCount}</strong> 个官方集成</span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.stat}><strong>{communityCount}</strong> 个社区集成</span>
        </div>
      </div>

      {/* Scrolling banner */}
      <IntegrationsBanner />

      {/* Main content */}
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            {(['all', 'official', 'community'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.filterPill} ${selectedType === t ? styles.filterPillActive : ''}`}
                onClick={() => setSelectedType(t)}>
                {t === 'all' ? '全部' : t === 'official' ? '官方' : '社区'}
              </button>
            ))}
          </div>
          <span className={styles.resultCount}>
            {resultCount} 个集成
          </span>
        </div>

        {showFeatured && featured.length > 0 && (
          <section className={styles.featuredSection}>
            <h2 className={styles.featuredTitle}>精选</h2>
            <div className={styles.featuredGrid}>
              {featured.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  changelogSlug={changelogSlugs.get(integration.id)}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {harnesses.length > 0 && (
          <section className={styles.group}>
            <h3 className={styles.groupTitle}>
              编程智能体
              <span className={styles.groupCount}>{harnesses.length}</span>
            </h3>
            <p className={styles.harnessNote}>
              这些智能体都由同一个{' '}
              <Link to="/sdks/integrations/coding-agents">Coding Agents</Link> 插件安装。
            </p>
            <div className={styles.harnessGrid}>
              {harnesses.map((h) => (
                <Link key={h.id} to={harnessDocLink(h)} className={styles.harnessCard}>
                  <img
                    src={withBaseUrl(harnessIconPath(h))}
                    alt=""
                    className={styles.compactIcon}
                    aria-hidden
                    loading="lazy"
                  />
                  <span className={styles.compactName}>{h.label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {showFeatured && (
          <>
            <hr className={styles.sectionDivider} />
            <h2 className={styles.sectionTitle}>全部集成</h2>
          </>
        )}

        {filtered.length === 0 && harnesses.length === 0 ? (
          <div className={styles.empty}>
            <p>没有符合搜索条件的集成。</p>
            <button className={styles.resetButton} onClick={() => { setSearch(''); setSelectedType('all'); }}>
              重置筛选条件
            </button>
          </div>
        ) : (
          <div className={styles.groups}>
            {groupByCategory(rest).map(([category, items]) => (
              <section key={category} className={styles.group}>
                <h3 className={styles.groupTitle}>
                  {CATEGORY_LABELS[category] ?? category}
                  <span className={styles.groupCount}>{items.length}</span>
                </h3>
                <div className={styles.compactGrid}>
                  {items.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      changelogSlug={changelogSlugs.get(integration.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className={styles.submitBanner}>
          <div className={styles.submitBannerContent}>
            <h2 className={styles.submitBannerTitle}>用 Hindsight 构建了什么？</h2>
            <p className={styles.submitBannerText}>
              与社区分享你的集成。提交包含集成链接的 issue，我们会将其加入集成列表。
            </p>
            <Link
              href={SUBMIT_INTEGRATION_URL}
              className={styles.submitButton}
              target="_blank"
              rel="noopener noreferrer">
              提交集成 →
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
