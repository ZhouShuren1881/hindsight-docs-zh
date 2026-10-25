---
title: Hindsight Cloud
description: Hindsight Cloud 是托管式、自助使用的 Hindsight 服务。无需部署，已包含模型。
---

# Hindsight Cloud {#hindsight-cloud}

Hindsight Cloud 为你托管运行 Hindsight。注册账号、创建记忆库并连接智能体即可开始使用，无需部署或运维。它运行的引擎与开源版 Hindsight 相同，因此本文档中关于记忆工作方式的内容同样适用。

**[开始使用 Hindsight Cloud](https://ui.hindsight.vectorize.io/signup)** · **[Hindsight Cloud 文档](https://docs.hindsight.vectorize.io/cloud)**

## 你将获得 {#what-you-get}

- **无需自行运行服务。** 无需管理服务器、数据库或升级。服务已包含 LLM、嵌入模型和重排序模型。
- **使用相同的 API。** 通过相同的 [Python](/sdks/python)、[TypeScript](/sdks/nodejs) 和 [Go](/sdks/go) 客户端、[CLI](/sdks/cli) 及 MCP 服务器，使用 Retain（存入）、Recall（召回）、Reflect（反思）、心智模型和知识页。只需将它们指向你的 Cloud API URL 并配置密钥。
- **[集成](/integrations)。** 提供与智能体框架、编程智能体和 AI 工具配合使用的预构建集成。
- **控制台。** 浏览记忆库、记忆、心智模型和知识页，并查看记忆库的学习情况。
- **团队协作。** 邀请团队成员并按角色控制访问权限，还可以管理 API 密钥。
- **用量分析。** 通过仪表板查看各记忆库的用量。

## 定价 {#pricing}

费用从预付额度余额中按实际用量扣除：Retain 和 Recall 按 token 计费，Reflect 以及创建或刷新心智模型和知识页按调用次数计费；保留超过 30 天的记忆还会产生存储费用。当前费率请参阅[账单说明](https://docs.hindsight.vectorize.io/cloud/billing)。

## Cloud 上的企业功能 {#enterprise-features-on-cloud}

Hindsight Enterprise 的部分功能可以为 Cloud 组织启用：SSO、强制 MFA、记忆防护（Memory Defense）、数据隐私（GDPR）、审计日志、Webhook 和 SIEM，以及企业支持。请参阅[启用企业功能的 Hindsight Cloud](https://docs.hindsight.vectorize.io/enterprise/deployment/cloud-enterprise)。

Hindsight Cloud 是共享的多租户服务。如果你需要专属部署，请参阅 [Hindsight Enterprise](./enterprise.md)。

## 了解更多 {#learn-more}

- [快速入门](https://docs.hindsight.vectorize.io/cloud/getting-started)：逐步创建你的第一个记忆库
- [Hindsight Cloud 文档](https://docs.hindsight.vectorize.io/cloud)
- [运行 Hindsight 的方式](./overview.md)：比较自托管、Cloud 和 Enterprise
