import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import type {Props} from '@theme/BlogTagsPostsPage';
import type {PropBlogPostContent} from '@docusaurus/plugin-content-blog';
import styles from '../BlogListPage/styles.module.css';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {month: 'short', day: 'numeric', year: 'numeric'});
}

function BlogCard({content}: {content: PropBlogPostContent}) {
  const {metadata, assets} = content;
  const {title, description, date, readingTime, permalink, frontMatter} = metadata;
  const {withBaseUrl} = useBaseUrlUtils();
  const image = assets.image ?? frontMatter.image ?? '/img/blog-default.webp';

  return (
    <Link to={permalink} className={styles.card}>
      <div className={styles.cardImageWrapper}>
        {image ? (
          <img src={withBaseUrl(image)} alt={title} className={styles.cardImage} />
        ) : (
          <div className={styles.cardImagePlaceholder} />
        )}
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {description && <p className={styles.cardDescription}>{description}</p>}
        <div className={styles.cardFooter}>
          <span className={styles.cardDate}>{formatDate(date)}</span>
          {readingTime !== undefined && (
            <span className={styles.cardReadTime}>{Math.ceil(readingTime)} 分钟阅读</span>
          )}
        </div>
      </div>
    </Link>
  );
}

const TAG_LABELS: Record<string, {title: string; subtitle: string}> = {
  'hindsight-cloud': {
    title: 'Hindsight Cloud',
    subtitle: 'Hindsight Cloud 新闻与动态',
  },
  'deep-dive': {
    title: '深度解析',
    subtitle: '架构、工程与基准测试',
  },
  'release': {
    title: '公告与版本发布',
    subtitle: '新版本、里程碑与产品动态',
  },
  'tutorial': {
    title: '教程与集成',
    subtitle: '如何在你的技术栈中使用 Hindsight',
  },
};

export default function BlogTagsPostsPage({tag, items, listMetadata}: Props): React.ReactElement {
  const {totalPages, page, nextPage, previousPage} = listMetadata;
  const tagInfo = TAG_LABELS[tag.label] ?? {title: tag.label, subtitle: undefined};

  return (
    <Layout title={tagInfo.title} description={tagInfo.subtitle}>
      <main className={styles.blogPage}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>{tagInfo.title}</h1>
          {tagInfo.subtitle && <p className={styles.headerSubtitle}>{tagInfo.subtitle}</p>}
        </header>

        <div className={styles.grid}>
          {items.map(({content: BlogPostContent}) => (
            <BlogCard key={BlogPostContent.metadata.permalink} content={BlogPostContent} />
          ))}
        </div>

        {totalPages > 1 && (
          <nav className={styles.pagination}>
            {previousPage && (
              <Link to={previousPage} className={styles.paginationButton}>
                ← 上一页
              </Link>
            )}
            <span className={styles.paginationInfo}>
              第 {page} 页，共 {totalPages} 页
            </span>
            {nextPage && (
              <Link to={nextPage} className={styles.paginationButton}>
                下一页 →
              </Link>
            )}
          </nav>
        )}
      </main>
    </Layout>
  );
}
