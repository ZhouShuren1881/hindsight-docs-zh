import React from 'react';
import DropdownNavbarItem from '@theme-original/NavbarItem/DropdownNavbarItem';
import type {Props as NavbarItemProps} from '@theme/NavbarItem/DropdownNavbarItem';

import type {IconType} from 'react-icons';
import {LuLayoutGrid, LuLayoutTemplate, LuBook, LuRss, LuBookOpen} from 'react-icons/lu';
import {SiSlack} from 'react-icons/si';

const ICON_MAP: Record<string, IconType> = {
  'lu-layout-grid':     LuLayoutGrid,
  'lu-layout-template': LuLayoutTemplate,
  'lu-book':            LuBook,
  'lu-rss':             LuRss,
  'lu-book-open':       LuBookOpen,
  'si-slack':           SiSlack,
};

type Props = NavbarItemProps & {customProps?: {icon?: string}};

export default function DropdownNavbarItemWrapper(props: Props): React.JSX.Element {
  const iconKey = props.customProps?.icon as string | undefined;
  const IconComponent = iconKey ? ICON_MAP[iconKey] : undefined;

  if (!IconComponent) {
    return <DropdownNavbarItem {...props} />;
  }

  const modifiedProps = {
    ...props,
    label: (
      <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
        <IconComponent size={14} style={{flexShrink: 0, opacity: 0.8}} />
        {props.label}
      </span>
    ),
  };

  return <DropdownNavbarItem {...modifiedProps} />;
}
