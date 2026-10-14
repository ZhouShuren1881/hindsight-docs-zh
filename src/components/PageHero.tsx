import React, {type ReactNode, useEffect, useRef} from 'react';
import clsx from 'clsx';
import styles from './PageHero.module.css';

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

/**
 * 独立页面顶部的横幅，适用于 FAQ、最佳实践、Cookbook、Changelog、博客和所有集成更新日志。
 *
 * 横幅本身使用 custom.css 中共享的 `hs-hero-band` 样式，与首页主视觉区和两个 Hub 页面相同；
 * 因此本文件只负责设置尺寸和显示这两个内容项。
 */
export default function PageHero({title, subtitle}: PageHeroProps): ReactNode {
  const hero = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const root = document.documentElement;
    let frame: number | null = null;
    // 与 100vw 不同，clientWidth 不包含垂直滚动条的宽度。
    const syncWidth = () => {
      el.style.setProperty('--page-hero-width', `${root.clientWidth}px`);
    };
    syncWidth();
    const observer = new ResizeObserver(() => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        syncWidth();
      });
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={hero} className={clsx('hs-hero-band', styles.hero)}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
