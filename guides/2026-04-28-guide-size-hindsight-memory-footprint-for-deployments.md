---
title: "规划实际部署中的 Hindsight 内存占用"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [deployment, hardware, memory, guide]
description: "根据新的内存占用指南，规划 Hindsight 完整版和 slim 镜像、Worker、控制平面及 PostgreSQL 的部署容量。"
image: /img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp
hide_table_of_contents: true
---

![规划实际部署中的 Hindsight 内存占用](/img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp)

如果你正在**为实际部署规划 Hindsight 的内存占用**，现在的文档更实用了：安装指南终于按组件列出了实际 RAM 范围。这很有帮助，因为合适的主机规格与其说取决于宣传，不如说取决于一个简单的问题：你运行的是带本地模型的完整镜像，还是使用外部提供商的 slim 镜像？规划时请打开[安装指南](/developer/installation)、[配置指南](/developer/configuration)、[服务指南](/developer/services)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 完整版 API 镜像至少需要约 1.5 GB，建议配置 2 GB，因为它会加载本地嵌入模型和重排序模型。
- slim API 镜像最低约需 512 MB，建议配置 1 GB；前提是将嵌入和重排序交由外部服务处理。
- 控制平面的内存占用较低，Worker 的占用与对应 API 镜像相当，而 PostgreSQL 仍需要单独预留余量。

## 从当前基线数字开始 {#start-with-the-current-baseline-numbers}

新版安装指南给出了实用的基线：

| 组件 | 最低 RAM | 建议 RAM |
|---|---:|---:|
| API，完整版镜像 | 1.5 GB | 2 GB |
| API，slim 镜像 | 512 MB | 1 GB |
| 控制平面 | 128 MB | 256 MB |
| Worker | 与 API 变体相同 | 与 API 变体相同 |
| PostgreSQL | 512 MB | 1 GB+ |

这些不是理论上的最低值，而是用于规划的数字，考虑了本地模型的开销、运行时开销，以及 PostgreSQL 和 Worker 也需要充足运行空间这一事实。

## 选择机器前先选完整版还是 slim {#pick-full-vs-slim-before-you-pick-a-machine}

首要选择是：是否要将本地嵌入和重排序打包进 API 进程。

- 如果你想要更简单的一体化部署，并且能承担额外的 RAM 开销，就选择**完整版**。
- 如果你想使用配置较小的主机，并且愿意按照[配置指南](/developer/configuration)接入外部提供商，就选择**slim**。

通常，这个选择比纠结小型虚拟机规格系列更重要。完整版镜像更方便，slim 镜像则能大幅降低内存占用。

## 使用实用的部署方案 {#use-practical-deployment-recipes}

以下几种配置适合作为起点：

- **笔记本或个人开发机**：完整版镜像、嵌入式数据库、2 vCPU、2 GB 至 4 GB RAM。
- **小型云虚拟机**：slim 镜像、外部嵌入和重排序服务、1 GB 至 2 GB RAM，另配独立数据库。
- **负载较重的生产环境**：将 API 和 Worker 分开部署，单独规划 PostgreSQL；如果召回延迟很重要，则将重排序器移到主机之外。

这就是文档现在分别说明 API、Worker、UI 和数据库配置要求的原因。Hindsight 是同一个产品，但内存占用会因部署方式而异。

## 了解内存压力真正来自哪里 {#know-where-the-pressure-really-comes-from}

在生产流量下，重排序器通常最先让主机显得资源开销很大。在仅使用 CPU 的主机上，它可能成为延迟和内存压力的主要来源。因此，安装文档现在指出：CPU 适合开发和基础工作负载，而生产流量通常能从 GPU 加速的重排序或外部重排序服务中受益。

换句话说，如果部署所需资源比预期多，原因通常是模型在本地运行，而不是控制平面或文档页数之类的简单因素。

## 有依据地排查内存压力 {#troubleshoot-memory-pressure-without-guessing}

如果某个节点负载过高，请按顺序检查整个部署：

1. 确认使用的是完整版还是 slim 镜像。
2. 检查 Worker 是否与 API 共用同一主机，导致预期的模型内存占用翻倍。
3. 确认同一主机上的 PostgreSQL 没有内存不足。
4. 查看[配置指南](/developer/configuration)中的外部提供商设置。
5. 如果将 API 与 Worker 分开部署，请对照[服务指南](/developer/services)检查部署形态。

新文档不能免去调优工作，但能让初步估算更有依据。

## 常见问题 {#faq}

### 可以在 1 GB RAM 的机器上运行 Hindsight 吗？ {#can-i-run-hindsight-in-1-gb-of-ram}

可以，但通常只有使用 slim 镜像和外部提供商时才行。对于这样的内存容量，完整版镜像并不合适。

### Worker 需要单独规划容量吗？ {#do-workers-need-separate-sizing}

需要。Worker 加载的模型栈与对应 API 镜像相同，因此应按另一个 API 进程来规划资源。

### 控制平面是资源开销最大的部分吗？ {#is-the-control-plane-the-expensive-part}

不是。控制平面的资源开销相对较低，内存占用主要由本地嵌入和重排序决定。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [安装指南](/developer/installation)
- [配置指南](/developer/configuration)
- [服务指南](/developer/services)
- [快速入门指南](/developer/api/quickstart)
