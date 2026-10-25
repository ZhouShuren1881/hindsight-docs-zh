---
title: Hindsight Enterprise
description: Hindsight Enterprise 是面向单租户部署的 Hindsight，可部署在 Vectorize 的云、你的云或你的数据中心，并通过 Hindsight Memlake 支持大规模智能体记忆。
---

# Hindsight Enterprise {#hindsight-enterprise}

Hindsight Enterprise 面向需要独立部署的组织。你无需与其他租户共用多租户版 Hindsight Cloud，而是获得由 Vectorize 与你共同设置和运行的**单租户**安装。它包含 Hindsight Cloud 的全部功能，并提供以下安全、合规、网络和扩展能力。

**[预约通话](https://calendly.com/d/dvy5-v3f-jhg?utm_source=oss_docs&utm_campaign=enterprise_docs)** · **[Hindsight Enterprise 文档](https://docs.hindsight.vectorize.io/enterprise)**

## 部署选项 {#deployment-options}

| 选项 | 运行位置 | 运维方 |
|---|---|---|
| **带 Enterprise 功能的 Hindsight Cloud** | Hindsight Cloud（多租户） | Vectorize |
| **私有云** | 部署在 Vectorize 的云账户中，并位于你选择的区域 | Vectorize |
| **自带云（BYOC）** | 你的 AWS、Google Cloud 或 Azure 账户 | Vectorize，通过你授予的访问权限运行 |
| **本地部署** | 你的 Kubernetes 基础设施，包括与外部网络隔离的环境 | 你，在 Vectorize 协助下运行 |

私有云和 BYOC 可通过私有网络访问（AWS PrivateLink、Google Cloud Private Service Connect、Azure Private Link），因此流量不会经过公共互联网。完整对比（包括各方的责任）请参阅[选择部署选项](https://docs.hindsight.vectorize.io/enterprise/deployment/overview)。

## Enterprise 增加的功能 {#what-enterprise-adds}

- **单租户部署：** 拥有独立的数据库、存储、计算资源和身份服务。
- **[Hindsight Memlake](#hindsight-memlake)：** 使用对象存储保存记忆，适用于规模庞大且持续增长的记忆库。
- **单点登录和多重身份验证（MFA）：** 支持 Okta、Microsoft Entra ID、Google Workspace，以及任何 OIDC 或 SAML 提供方。
- **记忆防护（Memory Defense）：** 检测并脱敏密钥和敏感数据，并在提示注入内容存入系统前将其阻止。
- **数据隐私（GDPR）：** 可跨多个记忆库擦除、保留和导出个人数据。
- **审计日志、Webhook 和 SIEM：** 记录谁执行了什么操作，并将记录流式传输到你自己的系统。
- **企业支持：** 提供工单门户、专属 Slack 频道和合同约定的响应时间。
- **开票结算：** 采用年度或合同结算，而非银行卡付款。

## Hindsight Memlake {#hindsight-memlake}

Hindsight Memlake 是 Enterprise 面向智能体记忆的存储引擎。开源版 Hindsight 将记忆存储在 PostgreSQL 中，这适用于大多数记忆库。但智能体记忆只会不断增长；当记忆库达到数十万条记忆时，关系型数据库会变得更慢，也更难以较低成本维持性能。

Memlake 将记忆存储在**对象存储**中（S3、Google Cloud Storage、Azure Blob Storage，或本地部署时使用兼容 S3 的存储），并为每个组织配置一个存储桶：

- **为大规模使用而构建。** 在我们的测试中，使用四台服务器可为 1 亿条记忆提供服务，Recall（召回）延迟的 p99 低于 100 ms。
- **快速且稳定。** 记忆库增长时，Recall 延迟几乎不会变化，因为每个记忆库都有自己的索引，并在服务器上的缓存中保持热状态。
- **规模越大，成本越低。** 记忆存放在成本最低的持久化存储——对象存储中；服务器只保留缓存，因此扩容服务器是为了应对流量，而非存储数据。
- **持久可靠。** 写入操作会先将数据写入对象存储，再确认成功，并持续备份到另一个独立存储桶。
- **智能体无需改动。** API、SDK 和功能保持不变；记忆库、设置和后台作业仍存储在 PostgreSQL 中。

如果每个记忆库的记忆量都保持在约 50,000 条以下，PostgreSQL 就足够适用，无需使用 Memlake。Memlake 可用于私有云、BYOC 和本地部署。

更多信息：[Hindsight Memlake 概览](https://docs.hindsight.vectorize.io/enterprise/memlake)、[架构](https://docs.hindsight.vectorize.io/enterprise/memlake/architecture)、[性能与成本](https://docs.hindsight.vectorize.io/enterprise/memlake/performance)和[权衡](https://docs.hindsight.vectorize.io/enterprise/memlake/tradeoffs)。

## 了解更多 {#learn-more}

- [Hindsight Enterprise 文档](https://docs.hindsight.vectorize.io/enterprise)
- [运行 Hindsight 的方式](./overview.md)：对比自托管、Cloud 和 Enterprise
- [预约通话](https://calendly.com/d/dvy5-v3f-jhg?utm_source=oss_docs&utm_campaign=enterprise_docs)，与 Hindsight 团队交流
