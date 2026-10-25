---
title: Hindsight 的运行方式
sidebar_label: 概览
description: 自行运行开源版 Hindsight、使用托管的 Hindsight Cloud，或部署专属的 Hindsight Enterprise。
---

# Hindsight 的运行方式 {#ways-to-run-hindsight}

Hindsight 有三种运行方式。它们使用相同的记忆引擎：相同的 Retain（存入）、Recall（召回）和 Reflect（反思）操作、相同的心智模型和知识页，以及相同的 API 和 SDK。你可以先从一种方式开始，之后再切换到另一种。

| | 自托管（开源） | Hindsight Cloud | Hindsight Enterprise |
|---|---|---|---|
| **产品形态** | 由你自行运行的开源引擎 | 托管式、自助使用的多租户服务 | 由 Vectorize 与你共同安装和运行的单租户部署 |
| **运行位置** | 任意环境：你的笔记本电脑、Docker、Kubernetes | Hindsight Cloud | 我们的云、你的 AWS、Google Cloud 或 Azure 账户，或你的数据中心 |
| **运维方** | 你 | Vectorize | Vectorize，或由你负责本地部署的运维，Vectorize 提供协助 |
| **记忆存储** | PostgreSQL（或 Oracle） | 由 Vectorize 托管 | PostgreSQL，或存储在对象存储上的 [Hindsight Memlake](./enterprise.md#hindsight-memlake) |
| **模型** | 自备 LLM 和嵌入模型 | 已包含 | 已包含，也可使用你自己的模型（Bedrock、Vertex AI、Azure OpenAI） |
| **登录与访问** | 由你配置的 API 密钥 | 控制台、团队和 API 密钥 | 另提供 SSO、强制 MFA 和专用网络 |
| **价格** | 免费（MIT 许可证） | 使用预付额度按量付费 | 按合同计费 |
| **开始使用** | [安装](/developer/installation) | [注册](https://ui.hindsight.vectorize.io/signup) | [预约通话](https://calendly.com/d/dvy5-v3f-jhg?utm_source=oss_docs&utm_campaign=enterprise_docs) |

## 如何选择 {#how-to-choose}

- 如果你希望完全掌控环境、想在本地试用 Hindsight，或已经在运行 Postgres 和自己的模型，请选择 **自托管**。本文档介绍了这种方式：从[安装](/developer/installation)开始。
- 如果你希望几分钟内就为智能体配备记忆，无需部署任何内容且模型已包含，请选择 **[Hindsight Cloud](./hindsight-cloud.md)**。
- 如果你需要自己的部署，请选择 **[Hindsight Enterprise](./enterprise.md)**：它提供单租户隔离、可选择部署区域或云账户、专用网络、SSO 和合规功能、合同支持；当记忆规模大到使用 [Hindsight Memlake](./enterprise.md#hindsight-memlake) 更划算时，也可以选择它。

Hindsight Cloud 和 Enterprise 有各自的文档，详见 [docs.hindsight.vectorize.io](https://docs.hindsight.vectorize.io)。
