import React, {useEffect, useMemo, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {LuBox} from 'react-icons/lu';
import {MODEL_PROVIDERS, KIND_LABELS, type ModelKind, type ModelProvider} from '../data/modelProviders';
import styles from './ModelProviderSearch.module.css';
import {revealProvider} from './ProviderSetup';

/**
 * The Models page lists ~60 providers across four kinds of model. This grid finds one by name or
 * id and jumps to its setup, the way the Integrations hub finds an integration.
 */
function Card({provider, showKind}: {provider: ModelProvider; showKind: boolean}) {
  const imgSrc = useBaseUrl(provider.imgSrc ?? '');
  const imgSrcDark = useBaseUrl(provider.imgSrcDark ?? '');
  const Icon = provider.icon ?? LuBox;
  return (
    <a
      href={`#${provider.anchor}`}
      className={styles.card}
      // After the browser's own jump, so the bar is measured where the section landed.
      onClick={() => setTimeout(() => revealProvider(provider.anchor), 50)}>
      <span className={styles.icon} aria-hidden>
        {provider.imgSrcDark ? (
          <>
            <img src={imgSrc} alt="" className={styles.lightOnly} />
            <img src={imgSrcDark} alt="" className={styles.darkOnly} />
          </>
        ) : provider.imgSrc ? (
          <img src={imgSrc} alt="" />
        ) : (
          <Icon size={20} />
        )}
      </span>
      <span className={styles.name}>{provider.label}</span>
      <span className={styles.meta}>
        <code className={styles.id}>{provider.id}</code>
        {showKind && <span className={styles.kind}>{KIND_LABELS[provider.kind]}</span>}
      </span>
      {(provider.defaultModel || provider.batchApi || provider.promptCaching) && (
        <span className={styles.caps}>
          {provider.defaultModel && (
            <code className={styles.model} title="未设置模型时使用的默认模型">
              {provider.defaultModel}
            </code>
          )}
          {provider.batchApi && <span className={styles.cap} title="批量存入通过服务提供方的 Batch API 执行">Batch API</span>}
          {provider.promptCaching && <span className={styles.cap} title="Hindsight 会缓存固定的提示前缀">提示缓存</span>}
        </span>
      )}
    </a>
  );
}

/** `only` locks the grid to one kind of model, for that kind's section of the page. */
export function ModelProviderSearch({only}: {only?: ModelKind}) {
  const [search, setSearch] = useState('');
  const [picked, setKind] = useState<ModelKind | 'all'>('all');
  const kind = only ?? picked;

  // A link with a provider's anchor (shared, or from the table of contents) opens it too. Every
  // grid on the page runs this; revealing the same section twice is harmless.
  useEffect(() => {
    const onHash = () => revealProvider(decodeURIComponent(window.location.hash.slice(1)));
    const initial = setTimeout(onHash, 400);
    window.addEventListener('hashchange', onHash);
    return () => {
      clearTimeout(initial);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MODEL_PROVIDERS.filter(
      (p) =>
        (kind === 'all' || p.kind === kind) &&
        (!q || p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)),
    );
  }, [search, kind]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.input}
          placeholder={only ? `搜索${KIND_LABELS[only]}服务提供方…` : '搜索服务提供方…（OpenAI、Ollama、Cohere、hindsight）'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索模型服务提供方"
          autoComplete="off"
        />
        {search && (
          <button className={styles.clear} onClick={() => setSearch('')} aria-label="清除搜索">
            ×
          </button>
        )}
      </div>
      <div className={styles.toolbar}>
        {!only && (['all', 'llm', 'embeddings', 'reranker', 'decision'] as const).map((k) => (
          <button
            key={k}
            className={`${styles.pill} ${kind === k ? styles.pillActive : ''}`}
            onClick={() => setKind(k)}>
            {k === 'all' ? '全部' : KIND_LABELS[k]}
          </button>
        ))}
        <span className={styles.count}>
          {filtered.length} 个服务提供方
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className={styles.empty}>
          没有匹配的服务提供方。任何兼容 OpenAI 的端点都可以通过
          <a href="#openai-and-compatible-endpoints">openai 服务提供方</a>接入，还可通过
          <a href="#litellm-and-litellm-router">LiteLLM</a>接入另外 100 多个服务提供方。
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((p) => (
            <Card key={`${p.kind}-${p.id}`} provider={p} showKind={!only} />
          ))}
        </div>
      )}
    </div>
  );
}
