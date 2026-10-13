import React, {type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import NavbarLayout from '@theme/Navbar/Layout';
import NavbarContent from '@theme/Navbar/Content';

export default function Navbar(): ReactNode {
  return (
    <NavbarLayout>
      <Head htmlAttributes={{lang: 'zh-CN'}}>{null}</Head>
      <NavbarContent />
    </NavbarLayout>
  );
}
