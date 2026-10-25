import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  "developerSidebar": [
    {
      "type": "category",
      "label": "架构",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "developer/index",
          "label": "概览",
          "customProps": {
            "icon": "lu-book"
          }
        },
        {
          "type": "doc",
          "id": "developer/retain",
          "label": "Retain",
          "customProps": {
            "icon": "lu-brain"
          }
        },
        {
          "type": "doc",
          "id": "developer/retrieval",
          "label": "Recall",
          "customProps": {
            "icon": "lu-search"
          }
        },
        {
          "type": "doc",
          "id": "developer/reflect",
          "label": "Reflect",
          "customProps": {
            "icon": "lu-message"
          }
        },
        {
          "type": "doc",
          "id": "developer/observations",
          "label": "观测",
          "customProps": {
            "icon": "lu-activity"
          }
        },
        {
          "type": "doc",
          "id": "developer/mental-models",
          "label": "心智模型",
          "customProps": {
            "icon": "lu-layers"
          }
        },
        {
          "type": "doc",
          "id": "developer/knowledge-pages",
          "label": "知识页",
          "customProps": {
            "icon": "lu-book-text"
          }
        },
        {
          "type": "doc",
          "id": "developer/multilingual",
          "label": "多语言",
          "customProps": {
            "icon": "lu-languages"
          }
        },
        {
          "type": "doc",
          "id": "developer/performance",
          "label": "性能",
          "customProps": {
            "icon": "lu-zap"
          }
        },
        {
          "type": "doc",
          "id": "developer/storage",
          "label": "存储",
          "customProps": {
            "icon": "lu-database"
          }
        },
        {
          "type": "doc",
          "id": "developer/rag-vs-hindsight",
          "label": "RAG 与记忆",
          "customProps": {
            "icon": "lu-compare"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "API",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "developer/api/quickstart",
          "label": "快速开始",
          "customProps": {
            "icon": "lu-rocket"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/retain",
          "label": "Retain",
          "customProps": {
            "icon": "lu-brain"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/recall",
          "label": "Recall",
          "customProps": {
            "icon": "lu-search"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/reflect",
          "label": "Reflect",
          "customProps": {
            "icon": "lu-message"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/mental-models",
          "label": "心智模型",
          "customProps": {
            "icon": "lu-layers"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/knowledge-pages",
          "label": "知识页",
          "customProps": {
            "icon": "lu-book-text"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/memories",
          "label": "记忆",
          "customProps": {
            "icon": "lu-eraser"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/memory-banks",
          "label": "记忆库",
          "customProps": {
            "icon": "lu-memory"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/documents",
          "label": "文档",
          "customProps": {
            "icon": "lu-file"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/operations",
          "label": "操作",
          "customProps": {
            "icon": "lu-cpu"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/webhooks",
          "label": "Webhooks",
          "customProps": {
            "icon": "lu-webhook"
          }
        },
        {
          "type": "doc",
          "id": "developer/api/bank-templates",
          "label": "记忆库模板",
          "customProps": {
            "icon": "lu-file-json"
          }
        },
        {
          "type": "link",
          "href": "/api-reference",
          "label": "API 参考",
          "customProps": {
            "icon": "lu-book-open",
            "iconAfter": "lu-arrow-up-right"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "安全",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "developer/memory-defense/index",
          "label": "记忆防护",
          "customProps": {
            "icon": "lu-shield"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "客户端",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "sdks/python",
          "label": "Python",
          "customProps": {
            "icon": "si-python"
          }
        },
        {
          "type": "doc",
          "id": "sdks/nodejs",
          "label": "TypeScript",
          "customProps": {
            "icon": "/img/icons/typescript.png"
          }
        },
        {
          "type": "doc",
          "id": "sdks/go",
          "label": "Go",
          "customProps": {
            "icon": "si-go"
          }
        },
        {
          "type": "doc",
          "id": "sdks/cli",
          "label": "CLI",
          "customProps": {
            "icon": "lu-terminal"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "集成",
      "collapsible": false,
      "items": [
        {
          "type": "link",
          "href": "/integrations",
          "label": "浏览所有集成"
        }
      ]
    },
    {
      "type": "category",
      "label": "云与企业",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "cloud-enterprise/overview",
          "label": "概览",
          "customProps": {
            "icon": "lu-compare"
          }
        },
        {
          "type": "doc",
          "id": "cloud-enterprise/hindsight-cloud",
          "label": "Hindsight Cloud",
          "customProps": {
            "icon": "lu-cloud"
          }
        },
        {
          "type": "doc",
          "id": "cloud-enterprise/enterprise",
          "label": "企业版",
          "customProps": {
            "icon": "lu-server"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "托管",
      "collapsible": false,
      "items": [
        {
          "type": "doc",
          "id": "developer/installation",
          "label": "安装",
          "customProps": {
            "icon": "lu-package"
          }
        },
        {
          "type": "doc",
          "id": "developer/services",
          "label": "服务",
          "customProps": {
            "icon": "lu-server"
          }
        },
        {
          "type": "doc",
          "id": "developer/configuration",
          "label": "配置",
          "customProps": {
            "icon": "lu-settings"
          }
        },
        {
          "type": "doc",
          "id": "developer/admin-cli",
          "label": "管理 CLI",
          "customProps": {
            "icon": "lu-terminal"
          }
        },
        {
          "type": "doc",
          "id": "developer/oracle",
          "label": "Oracle 数据库",
          "customProps": {
            "icon": "lu-database"
          }
        },
        {
          "type": "doc",
          "id": "developer/extensions",
          "label": "扩展",
          "customProps": {
            "icon": "lu-plug"
          }
        },
        {
          "type": "doc",
          "id": "developer/models",
          "label": "模型",
          "customProps": {
            "icon": "lu-cpu"
          }
        },
        {
          "type": "doc",
          "id": "developer/monitoring",
          "label": "监控",
          "customProps": {
            "icon": "lu-activity"
          }
        },
        {
          "type": "doc",
          "id": "developer/mcp-server",
          "label": "MCP 服务器",
          "customProps": {
            "icon": "lu-network"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "安装",
      "collapsible": false,
      "items": [
        {
          "type": "link",
          "href": "/developer/installation#docker",
          "label": "Docker",
          "customProps": {
            "icon": "si-docker",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "/developer/installation#helm--kubernetes",
          "label": "Kubernetes",
          "customProps": {
            "icon": "si-kubernetes",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "/developer/installation#bare-metal-pip",
          "label": "裸机部署",
          "customProps": {
            "icon": "lu-hard-drive",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "doc",
          "id": "sdks/hindsight-all",
          "label": "编程 API（Python）",
          "customProps": {
            "icon": "si-python"
          }
        },
        {
          "type": "doc",
          "id": "sdks/hindsight-all-npm",
          "label": "编程 API（Node.js）",
          "customProps": {
            "icon": "si-nodedotjs"
          }
        },
        {
          "type": "doc",
          "id": "sdks/embed",
          "label": "守护进程 CLI",
          "customProps": {
            "icon": "lu-terminal"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "资源",
      "collapsible": false,
      "items": [
        {
          "type": "link",
          "href": "/templates",
          "label": "记忆库模板中心",
          "customProps": {
            "icon": "lu-layout-template",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "/best-practices",
          "label": "最佳实践",
          "customProps": {
            "icon": "lu-star",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "/faq",
          "label": "常见问题",
          "customProps": {
            "icon": "lu-circle-help",
            "iconAfter": "lu-arrow-up-right"
          }
        }
      ]
    },
    {
      "type": "category",
      "label": "更多",
      "collapsible": false,
      "items": [
        {
          "type": "link",
          "href": "/cookbook",
          "label": "实践手册",
          "customProps": {
            "icon": "lu-book",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "/blog",
          "label": "博客",
          "customProps": {
            "icon": "lu-rss",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "https://vectorize.io/slack",
          "label": "社区",
          "customProps": {
            "icon": "si-slack",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "https://github.com/vectorize-io/hindsight",
          "label": "GitHub",
          "customProps": {
            "icon": "si-github",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "https://benchmarks.hindsight.vectorize.io/",
          "label": "基准测试",
          "customProps": {
            "icon": "lu-chart-bar",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "https://benchmarks.hindsight.vectorize.io/",
          "label": "如何选择模型？",
          "customProps": {
            "icon": "lu-cpu",
            "iconAfter": "lu-arrow-up-right"
          }
        },
        {
          "type": "link",
          "href": "https://arxiv.org/abs/2512.12818",
          "label": "论文",
          "customProps": {
            "icon": "lu-file-text",
            "iconAfter": "lu-arrow-up-right"
          }
        }
      ]
    }
  ]
};

export default sidebars;
