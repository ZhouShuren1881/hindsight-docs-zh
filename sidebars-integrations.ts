import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import * as fs from 'fs';
import * as path from 'path';

interface IntegrationEntry {
  id: string;
  name: string;
  link: string;
  icon: string;
  category: string;
}

// 未版本化集成文档的侧栏，直接根据
// src/data/integrations.json 这一统一数据来源生成；
// 新增条目即可添加页面。由于集成页面没有版本，
// 可以在加载配置时构建侧栏，无需覆盖主题组件。
// 使用 doc 条目既能将页面关联到侧栏，使其正常显示，
// 也能在所列页面不存在时让构建报错。
//
// 有意采用平铺的字母顺序：访问集成页面后，用户通常需要
// 比较并切换不同集成，因此一次展示所有选项更有用。
// 精选的分组预览位于主文档侧栏，
// 用于向其他页面的读者介绍各类集成。
const {integrations} = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'integrations.json'), 'utf-8'),
) as {integrations: IntegrationEntry[]};

const internal = integrations
  .filter((entry) => entry.link.startsWith('/sdks/integrations/'))
  .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

// 已被替代的页面放在末尾的独立分组，主列表只列当前推荐的集成。
// 每个旧页面都有迁移横幅。
const current = internal.filter((entry) => entry.category !== 'legacy');
const legacy = internal.filter((entry) => entry.category === 'legacy');

const docItem = (entry: IntegrationEntry) => ({
  type: 'doc' as const,
  id: entry.link.replace('/sdks/integrations/', ''),
  label: entry.name,
  customProps: {icon: entry.icon},
});

const sidebars: SidebarsConfig = {
  integrationsSidebar: [
    {
      type: 'category',
      label: '集成',
      collapsible: false,
      items: [
        ...current.map(docItem),
        // 集成中心提供侧栏无法提供的搜索和筛选。
        {
          type: 'link' as const,
          href: '/integrations',
          label: '所有集成',
          customProps: {iconAfter: 'lu-arrow-up-right'},
        },
      ],
    },
    {
      type: 'category',
      label: '旧版集成',
      collapsible: true,
      collapsed: true,
      items: legacy.map(docItem),
    },
  ],
};

export default sidebars;
