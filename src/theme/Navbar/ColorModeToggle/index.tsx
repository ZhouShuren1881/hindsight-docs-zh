import React, {type ReactNode} from 'react';
import {useColorMode, useThemeConfig} from '@docusaurus/theme-common';
import useIsBrowser from '@docusaurus/useIsBrowser';
import IconLightMode from '@theme/Icon/LightMode';
import IconDarkMode from '@theme/Icon/DarkMode';
import IconSystemColorMode from '@theme/Icon/SystemColorMode';
import type {Props} from '@theme/Navbar/ColorModeToggle';
import styles from './styles.module.css';

export default function NavbarColorModeToggle({className}: Props): ReactNode {
  const navbarStyle = useThemeConfig().navbar.style;
  const {disableSwitch, respectPrefersColorScheme} = useThemeConfig().colorMode;
  const {colorModeChoice, setColorMode} = useColorMode();
  const isBrowser = useIsBrowser();

  if (disableSwitch) {
    return null;
  }

  const label = colorModeChoice === null ? '跟随系统' : colorModeChoice === 'dark' ? '深色模式' : '浅色模式';
  const Icon = colorModeChoice === null ? IconSystemColorMode : colorModeChoice === 'dark' ? IconDarkMode : IconLightMode;
  const next = respectPrefersColorScheme
    ? colorModeChoice === null ? 'light' : colorModeChoice === 'light' ? 'dark' : null
    : colorModeChoice === 'dark' ? 'light' : 'dark';
  return (
    <div className={className}>
      <button
        type="button"
        className={`clean-btn ${navbarStyle === 'dark' ? styles.darkNavbarColorModeToggle : ''}`}
        style={{width: 32, height: 32, display: 'grid', placeItems: 'center'}}
        title={label}
        aria-label={`切换配色模式（当前：${label}）`}
        disabled={!isBrowser}
        onClick={() => setColorMode(next)}>
        <Icon aria-hidden />
      </button>
    </div>
  );
}
