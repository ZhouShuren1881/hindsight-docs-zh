---
title: "为实际部署规划 Hindsight 的内存占用"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [deployment, hardware, memory, guide]
description: "根据完整和精简镜像、工作进程、控制平面及 PostgreSQL 的容量规划指南，为 Hindsight 部署估算内存需求。"
image: /img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp
hide_table_of_contents: true
---

![为实际部署规划 Hindsight 的内存占用](/img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp)

如果你想**为部署规划 Hindsight 的内存占用**，现在的文档更有帮助了，因为安装指南终于按组件列出了实际的 RAM 范围。这很有用，因为合适的机器规格主要取决于一个简单的问题：你运行的是带本地模型的完整镜像，还是使用外部服务提供方的精简镜像？规划时，请同时打开[安装指南](/developer/installation)、[配置指南](/developer/configuration)、[服务指南](/developer/services)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

## 快速结论 {#the-quick-answer}

- 完整版 API 镜像至少需要约 1.5 GB，建议配置 2 GB，因为它会加载本地嵌入模型和重排模型。
- 精简版 API 镜像至少约需 512 MB，建议配置 1 GB；前提是将嵌入和重排任务交由外部服务处理。
- 控制平面占用较少；工作进程的内存需求与对应 API 镜像相当；PostgreSQL 也需要预留自己的余量。

## 先了解当前基准值 {#start-with-the-current-baseline-numbers}

新版安装指南给出了实用的基准值：

| 组件 | 最低 RAM | 建议 RAM |
|---|---:|---:|
| API，完整版镜像 | 1.5 GB | 2 GB |
| API，精简版镜像 | 512 MB | 1 GB |
| 控制平面 | 128 MB | 256 MB |
| 工作进程 | 与 API 镜像类型相同 | 与 API 镜像类型相同 |
| PostgreSQL | 512 MB | 1 GB+ |

这些数值不是理论上的最低值，而是规划用的参考值，考虑了本地模型的开销、运行时开销，以及 PostgreSQL 和工作进程也需要充足资源这一点。

## 选择机器前，先决定用完整版还是精简版 {#pick-full-vs-slim-before-you-pick-a-machine}

最关键的选择是：是否要把本地嵌入和重排功能一并装进 API 进程。

- 如果你希望部署更简单的一体化方案，并且能承担额外的 RAM 开销，请选择**完整版**。
- 如果你希望使用配置较低的主机，并且愿意按照[配置指南](/developer/configuration)接入外部服务提供方，请选择**精简版**。

这个决定通常比纠结小型 VM 的具体规格更重要。完整版镜像更方便；精简版镜像占用的资源少得多。

## 参考实用的部署方案 {#use-practical-deployment-recipes}

以下几种配置可以作为起点：

- **笔记本电脑或个人开发机**：完整版镜像、嵌入式数据库、2 个 vCPU、2 GB 到 4 GB RAM。
- **小型云 VM**：精简版镜像、使用外部嵌入和重排服务、1 GB 到 2 GB RAM，另配独立数据库。
- **负载较重的生产环境**：将 API 和工作进程分开部署，为 PostgreSQL 单独规划资源；如果召回延迟很重要，可将重排器部署到其他主机上。

因此，文档现在分别说明 API、工作进程、UI 和数据库的配置建议。Hindsight 是一个产品，但各组件的内存占用并不相同。

## 找出资源压力的真正来源 {#know-where-the-pressure-really-comes-from}

在生产流量下，重排器通常最先让主机显得资源吃紧。在仅使用 CPU 的机器上，它可能成为延迟和内存压力的主要来源。因此，安装文档现在指出：CPU 适合开发和基础工作负载；但生产流量通常能从 GPU 加速的重排或外部重排服务中受益。

换句话说，如果部署所需的资源比预期更多，问题往往出在模型运行位置，而不是控制平面或文档页面数量。

## 有条理地排查内存压力 {#troubleshoot-memory-pressure-without-guessing}

如果节点负载过高，可以按以下顺序检查各部分：

1. 确认使用的是完整版还是精简版镜像。
2. 检查工作进程是否与 API 共用同一台主机，导致模型的预期内存占用翻倍。
3. 确认 PostgreSQL 没有因部署在同一台机器而资源不足。
4. 查看[配置指南](/developer/configuration)中的外部服务提供方设置。
5. 如果你把 API 和工作进程拆开部署，请参照[服务指南](/developer/services)检查部署方式。

新文档不能替代后续的调优工作，但能让你更可靠地估算初始配置。

## 常见问题 {#faq}

### Hindsight 能在 1 GB RAM 的机器上运行吗？ {#can-i-run-hindsight-in-1-gb-of-ram}

可以，但通常需要使用精简版镜像和外部服务提供方。在这种内存条件下，完整版镜像并不合适。

### 工作进程需要单独规划资源吗？ {#do-workers-need-separate-sizing}

需要。工作进程加载的模型栈与对应类型的 API 镜像相同，因此应按再运行一个 API 进程来规划资源。

### 控制平面是资源开销最大的部分吗？ {#is-the-control-plane-the-expensive-part}

不是。控制平面的资源占用相对较少，主导内存占用的是本地嵌入和重排功能。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [安装指南](/developer/installation)
- [配置指南](/developer/configuration)
- [服务指南](/developer/services)
- [快速入门指南](/developer/api/quickstart)
