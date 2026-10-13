import React, {type ReactNode, useEffect, useRef} from 'react';
import clsx from 'clsx';
import type {Props} from '@theme/Navbar/Search';

import styles from './styles.module.css';

export default function NavbarSearch({children, className}: Props): ReactNode {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const input = container.current?.querySelector('input');
    if (input) {
      input.placeholder = '搜索文档';
      input.setAttribute('aria-label', '搜索文档');
    }
  }, []);
  return (
    <div ref={container} className={clsx(className, styles.navbarSearchContainer)}>
      {children}
    </div>
  );
}
