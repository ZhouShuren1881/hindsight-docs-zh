import React, {type ReactNode, useEffect, useRef} from 'react';
import clsx from 'clsx';
import styles from './PageHero.module.css';

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

/**
 * The band at the top of the standalone pages — FAQ, Best Practices, Cookbook,
 * Changelog, the blog and every integration changelog.
 *
 * The band itself is the shared `hs-hero-band` recipe in custom.css, the same
 * one the homepage hero and the two hub pages use, so this file carries only
 * its sizing and its own two pieces of content.
 */
export default function PageHero({title, subtitle}: PageHeroProps): ReactNode {
  const hero = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const root = document.documentElement;
    let frame: number | null = null;
    // clientWidth excludes the vertical scrollbar, unlike 100vw.
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
