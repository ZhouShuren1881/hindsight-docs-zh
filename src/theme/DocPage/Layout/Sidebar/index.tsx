import React from 'react';
import Sidebar from '@theme-original/DocRoot/Layout/Sidebar';
import type SidebarType from '@theme/DocRoot/Layout/Sidebar';
import type {WrapperProps} from '@docusaurus/types';
import {useLocation} from '@docusaurus/router';
import SkillBanner from '@site/src/components/SkillBanner';

type Props = WrapperProps<typeof SidebarType>;

export default function SidebarWrapper(props: Props): React.JSX.Element | null {
  const location = useLocation();
  const isCookbook = location.pathname.includes('/cookbook');

  // Don't render sidebar for cookbook pages
  if (isCookbook) {
    return null;
  }

  return (
    <>
      <SkillBanner />
      <Sidebar {...props} />
    </>
  );
}
