import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {version} from './package.json';

const umamiUrl = process.env.UMAMI_URL;
const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;

const config: Config = {
  title: 'Hindsight',
  tagline: 'Hindsight：能够持续学习的智能体记忆',
  favicon: 'img/favicon.webp',

  future: {
    v4: true,
    // 使用标准构建器，确保 Windows 构建可移植。

  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },

  url: 'https://zhoushuren1881.github.io',
  baseUrl: '/hindsight-docs-zh/',

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en'],
    localeConfigs: {
      'zh-CN': {
        label: '简体中文',
      },
      en: {
        label: 'English',
        url: 'https://hindsight.vectorize.io',
        baseUrl: '/',
      },
    },
  },

  organizationName: 'zhoushuren1881',
  projectName: 'hindsight-docs-zh',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap',
        media: 'print',
        onload: "this.media='all'",
      },
    },
  ],

  scripts: [
    ...(umamiUrl && umamiWebsiteId
      ? [
          {
            src: `${umamiUrl}/script.js`,
            async: true,
            defer: true,
            'data-website-id': umamiWebsiteId,
          },
        ]
      : []),
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          // 侧栏已展示页面位置，每篇文档也有自己的一级标题，
          // 因此面包屑只会重复这些内容。
          // src/theme/DocBreadcrumbs 仍渲染：此标志让原组件
          // 返回 null，包装组件则保留技能横幅。
          breadcrumbs: false,
          // 与源仓库一致，从 docs/ 维护 current 文档，仅提供当前版本。
          path: './docs',
          onlyIncludeVersions: ['current'],
          lastVersion: 'current',
          versions: {current: {label: `${version}（当前）`, path: '', badge: false}},
        },
        blog: {
          showReadingTime: true,
          blogTitle: 'Hindsight 博客',
          blogDescription: '智能体记忆的动态、见解与深入分析',
          feedOptions: {language: 'zh-CN'},
          postsPerPage: 'ALL',
          blogSidebarCount: 0,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'hindsight-api',
            spec: 'static/openapi.json',
            route: '/api-reference',
            url: '/openapi.json',
          },
        ],
        theme: {
          primaryColor: '#0074d9',
          sidebar: {
            backgroundColor: '#09090b',
          },
          rightPanel: {
            backgroundColor: '#18181b',
          },
          typography: {
            fontSize: '15px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            headings: {
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            },
            code: {
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace",
              fontSize: '13px',
            },
          },
        },
        config: {
          scrollYOffset: 60,
          nativeScrollbars: true,
          expandSingleSchemaField: true,
          expandResponses: '200,201',
        },
      },
    ],
  ],

  plugins: [
    // 构建时获取仓库星标数，用于导航栏和
    // 首页首屏。
    './plugins/github-stars',
    // 构建时索引集成更新日志页面，
    // 让集成中心知道哪些集成有更新日志入口。
    './plugins/integration-changelogs',
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'integrations',
        path: './docs-integrations',
        routeBasePath: 'sdks/integrations',
        breadcrumbs: false, // 独立文档插件使用自身的开关
        // 未版本化插件：根据 src/data/integrations.json
        // 生成集成页面的侧栏，不为这些页面添加版本。
        sidebarPath: './sidebars-integrations.ts',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'guides',
        routeBasePath: 'guides',
        path: './guides',
        showReadingTime: true,
        postsPerPage: 'ALL',
        blogSidebarCount: 0,
        blogTitle: '指南',
        blogDescription: '人工智能记忆与智能体开发的深入指南',
        feedOptions: {type: []},
        onUntruncatedBlogPosts: 'ignore',
      },
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['zh', 'en'],
        docsDir: ['docs', 'docs-integrations'],
        docsRouteBasePath: ['/', '/sdks/integrations'],
        indexBlog: true,
        blogDir: ['blog', 'guides'],
        blogRouteBasePath: ['/blog', '/guides'],
        indexPages: true,
        highlightSearchTermsOnTargetPage: false,
        // 搜索框位于文档侧栏（见
        // src/theme/DocSidebar/Desktop/Content），结果面板应在
        // 搜索框右侧打开。自动检测会依据导航栏推断位置，
        // 从而将面板推到窗口左侧之外。
        searchBarPosition: 'left',
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.webp',
    // 页面未单独设置描述时使用此默认值；页面自身的描述优先。
    metadata: [
      {name: 'description', content: '为智能体提供先进的长期记忆。Hindsight 让 AI 智能体拥有能够跨会话持续学习的记忆。'},
    ],
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'Hindsight 标志',
        src: 'img/logo.webp',
        style: { height: '32px' },
      },
      items: [
        {
          type: 'doc',
          docId: 'developer/index',
          position: 'left',
          label: '文档',
          className: 'navbar-item-developer',
        },
        // 版本入口紧随“文档”，因为版本只修饰文档，
        // 不应看起来像额外的独立导航目的地。
        {
          type: 'docsVersionDropdown',
          position: 'left',
          className: 'navbar-item-version',
        },
        {
          to: '/integrations',
          position: 'left',
          label: '集成',
          className: 'navbar-item-integrations',
        },
        {
          to: '/changelog',
          position: 'left',
          label: '更新日志',
          className: 'navbar-item-changelog',
        },
        {
          href: 'https://learn.hindsight.vectorize.io',
          position: 'left',
          label: '学院',
          className: 'navbar-item-academy',
        },
        {
          type: 'dropdown',
          label: '资源',
          position: 'left',
          className: 'navbar-item-resources',
          items: [
            {
              to: '/templates',
              label: '记忆库模板中心',
              customProps: { icon: 'lu-layout-template' },
            },
            {
              to: '/best-practices',
              label: '最佳实践',
              customProps: { icon: 'lu-star' },
            },
            {
              to: '/faq',
              label: '常见问题',
              customProps: { icon: 'lu-circle-help' },
            },
            {
              to: '/cookbook',
              label: '实践手册',
              customProps: { icon: 'lu-book' },
            },
            {
              to: '/blog',
              label: '博客',
              customProps: { icon: 'lu-rss' },
            },
            {
              to: '/api-reference',
              label: 'API 参考',
              customProps: { icon: 'lu-book-open' },
            },
            {
              href: 'https://vectorize.io/slack',
              label: '社区',
              customProps: { icon: 'si-slack' },
            },
            {
              href: 'https://benchmarks.hindsight.vectorize.io/',
              label: '基准测试',
              customProps: { icon: 'lu-chart-bar' },
            },
            {
              href: 'https://benchmarks.hindsight.vectorize.io/',
              label: '如何选择模型？',
              customProps: { icon: 'lu-cpu' },
            },
            {
              href: 'https://arxiv.org/abs/2512.12818',
              label: '论文',
              customProps: { icon: 'lu-file-text' },
            },
          ],
        },
        {
          type: 'localeDropdown',
          position: 'right',
          className: 'navbar-item-language',
        },
        {
          href: 'https://github.com/vectorize-io/hindsight',
          position: 'right',
          label: 'GitHub',
          className: 'header-github-link',
        },
      ],
    },
    footer: {
      // 使用 light，避免无论当前主题如何都套用深色页脚，
      // 导致浅色页面底部出现黑色块。
      // 页脚现在延续页面配色，仅用分隔线区分
      // （见 custom.css）。
      style: 'light',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '介绍',
              to: '/',
            },
            {
              label: '开发指南',
              to: '/developer/installation',
            },
            {
              label: '客户端与集成',
              to: '/sdks/python',
            },
            {
              label: 'API 参考',
              to: '/api-reference/',
            },
          ],
        },
        {
          title: '资源',
          items: [
            {
              label: '实践手册',
              to: '/cookbook',
            },
            {
              label: '更新日志',
              to: '/changelog',
            },
            {
              label: '指南',
              to: '/guides',
            },
            {
              label: '学院',
              href: 'https://learn.hindsight.vectorize.io',
            },
            {
              label: 'Hindsight Cloud',
              href: 'https://ui.hindsight.vectorize.io',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/vectorize-io/hindsight',
            },
            {
              label: '中文文档仓库',
              href: 'https://github.com/ZhouShuren1881/hindsight-docs-zh',
            },
            {
              label: 'Slack',
              href: 'https://vectorize.io/slack',
            },
            {
              label: 'Vectorize',
              href: 'https://vectorize.io',
            },
          ],
        },
      ],
      copyright: `版权所有 © ${new Date().getFullYear()} <a href="https://vectorize.io">Vectorize, Inc.</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python', 'rust'],
    },
    mermaid: {
      theme: {
        light: 'base',
        dark: 'base',
      },
      options: {
        themeVariables: {
          // 节点渐变起始颜色（#0074d9 蓝色）
          primaryColor: '#0074d9',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#005db0',
          // 边和分组的渐变结束颜色（#009296 青色）
          secondaryColor: '#009296',
          secondaryTextColor: '#ffffff',
          secondaryBorderColor: '#007a7d',
          // 第三种颜色
          tertiaryColor: '#e6f7f8',
          tertiaryTextColor: '#1e293b',
          // 线和边：渐变结束颜色
          lineColor: '#009296',
          // 文字
          textColor: '#1e293b',
          // 节点专用：渐变起始颜色
          nodeBkg: '#0074d9',
          nodeTextColor: '#ffffff',
          nodeBorder: '#005db0',
          // 主背景
          mainBkg: '#0074d9',
          // 分组：渐变结束颜色
          clusterBkg: 'rgba(0, 146, 150, 0.08)',
          clusterBorder: '#009296',
          // 标签
          edgeLabelBackground: 'transparent',
          labelBackground: 'transparent',
          // 使用 Inter 字体，与正文一致
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
