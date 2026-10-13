import clsx from 'clsx';
import React, {useMemo, useState, useCallback} from 'react';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import catalog from '@site/src/data/templates.json';
import integrationsData from '@site/src/data/integrations.json';
import styles from './index.module.css';

const SUBMIT_TEMPLATE_URL =
  'https://github.com/vectorize-io/hindsight/issues/new?template=feature_request.yml&title=Bank+template%3A+';

// Webpack's require.context eagerly bundles every .json file under
// src/data/templates/, so adding a template only requires creating
// the manifest file and adding a catalog entry — no code change here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifestContext = (require as any).context('@site/src/data/templates', false, /\.json$/);

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  integrations?: string[];
  manifest: Record<string, unknown>;
}

const templatesData: Template[] = catalog.templates.map((entry) => {
  // catalog's manifest_file is 'templates/<id>.json'; require.context keys are './<id>.json'
  const key = './' + entry.manifest_file.replace(/^templates\//, '');
  const manifest = manifestContext(key);
  if (!manifest) {
    throw new Error(`No manifest found for ${entry.manifest_file}`);
  }
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    integrations: entry.integrations,
    manifest,
  };
});

const CATEGORIES = ['all', 'chat', 'coding', 'assistant', 'business', 'orchestration', 'support', 'research'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  all: '全部',
  chat: '聊天',
  coding: '编程',
  assistant: '助手',
  business: '业务',
  orchestration: '编排',
  support: '客户支持',
  research: '研究',
};

// Build a lookup from integration ID to icon path and name
const INTEGRATION_MAP = Object.fromEntries(
  integrationsData.integrations.map((i) => [i.id, {icon: i.icon, name: i.name}]),
);

function IntegrationIcons({ids}: {ids: string[]}) {
  const {withBaseUrl} = useBaseUrlUtils();
  return (
    <div className={styles.integrationIcons}>
      {ids.map((id) => {
        const info = INTEGRATION_MAP[id];
        if (!info?.icon) return null;
        const src = withBaseUrl(info.icon);
        return <img key={id} src={src} alt={info.name} title={info.name} className={styles.integrationIcon} />;
      })}
    </div>
  );
}

function TemplateCard({template, onSelect}: {template: Template; onSelect: () => void}) {
  return (
    <button className={styles.card} onClick={onSelect}>
      <div className={styles.cardHeader}>
        <span className={styles.categoryBadge}>{CATEGORY_LABELS[template.category as Category] ?? (template.category === 'retrieval' ? '检索' : template.category)}</span>
        {template.integrations && template.integrations.length > 0 && (
          <IntegrationIcons ids={template.integrations} />
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{template.name}</h3>
        <p className={styles.cardDescription}>{template.description}</p>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.viewLabel}>查看清单 &rarr;</span>
      </div>
    </button>
  );
}

function ManifestModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(template.manifest, null, 2);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [json]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{template.name}</h2>
            <p className={styles.modalDescription}>{template.description}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="关闭">
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.manifestHeader}>
            <span className={styles.manifestLabel}>模板清单</span>
            <button className={styles.copyButton} onClick={handleCopy}>
              {copied ? '已复制！' : '复制 JSON'}
            </button>
          </div>
          <pre className={styles.manifestCode}>
            <code>{json}</code>
          </pre>
        </div>
        <div className={styles.modalFooter}>
          <p className={styles.usageHint}>
            使用此清单调用 <code>POST /v1/default/banks/&#123;bank_id&#125;/import</code>，或
            将其粘贴到控制面板的记忆库创建对话框中。
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TemplateGallery(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templates = templatesData;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, selectedCategory]);

  return (
    <Layout title="记忆库模板中心" description="适用于常见使用场景的预设记忆库模板">
      <div className={clsx('hs-hero-band', styles.heroSection)}>
        <h1 className={styles.heroTitle}>记忆库模板中心</h1>
        <p className={styles.heroSubtitle}>
          使用预设记忆库模板快速上手。浏览、预览并导入到你的 Hindsight 记忆库。
          {' '}<Link to="/developer/api/bank-templates" className={styles.heroLink}>了解模板的工作原理 &rarr;</Link>
        </p>

        <div className={styles.hubSearchWrapper}>
          <input
            type="text"
            className={styles.hubSearchInput}
            placeholder="搜索模板…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索模板"
            autoComplete="off"
            autoFocus
          />
          {search && (
            <button className={styles.hubSearchClear} onClick={() => setSearch('')} aria-label="清除搜索">
              &times;
            </button>
          )}
        </div>

        <div className={styles.heroStats}>
          <span className={styles.stat}>
            <strong>{templates.length}</strong> 个模板
          </span>
          <span className={styles.statDivider}>&middot;</span>
          <span className={styles.stat}>
            <strong>{new Set(templates.map((t) => t.category)).size}</strong> 个类别
          </span>
        </div>
      </div>

      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`${styles.filterPill} ${selectedCategory === c ? styles.filterPillActive : ''}`}
                onClick={() => setSelectedCategory(c)}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <span className={styles.resultCount}>
            {filtered.length} 个模板
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>没有符合搜索条件的模板。</p>
            <button
              className={styles.resetButton}
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}>
              重置筛选条件
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onSelect={() => setSelectedTemplate(t)} />
            ))}
          </div>
        )}

        <div className={styles.submitBanner}>
          <div className={styles.submitBannerContent}>
            <h3 className={styles.submitBannerTitle}>有想分享的模板吗？</h3>
            <p className={styles.submitBannerText}>
              与社区分享模板。提交包含模板的 issue，我们会将其加入记忆库模板列表。
            </p>
            <Link
              href={SUBMIT_TEMPLATE_URL}
              className={styles.submitButton}
              target="_blank"
              rel="noopener noreferrer">
              提交模板 →
            </Link>
          </div>
        </div>
      </div>

      {selectedTemplate && <ManifestModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />}
    </Layout>
  );
}
