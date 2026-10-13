---
title: "规划实际部署中的 Hindsight 内存占用"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [deployment, hardware, memory, guide]
description: "使用新的内存占用指导，规划 Hindsight 完整及 slim 镜像、Worker、控制平面和 PostgreSQL 的部署容量。"
image: /img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp
hide_table_of_contents: true
---

![规划实际部署中的 Hindsight 内存占用](/img/guides/guide-size-hindsight-memory-footprint-for-deployments.webp)

**规划 Hindsight 部署内存占用**现在有更好的文档支持，安装指南明确列出各组件实际 RAM 范围。合适主机大小取决于一个简单问题：使用带本地模型的完整镜像，还是采用外部提供商的 slim 镜像？规划时可参考[安装指南](/developer/installation)、[配置指南](/developer/configuration)、[服务指南](/developer/services)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 完整 API 镜像最低约 1.5 GB、推荐 2 GB，因为加载本地嵌入和重排序模型。
- slim API 镜像最低约 512 MB、推荐 1 GB，但需要将嵌入和重排序转移到外部。
- 控制平面较轻，Worker 与相应 API 镜像占用一致，PostgreSQL 还需独立余量。

## 从当前基线数字开始 {#start-with-the-current-baseline-numbers}

新安装指导提供实用基线：

| 组件 | 最低 RAM | 推荐 RAM |
|---|---:|---:|
| API，完整镜像 | 1.5 GB | 2 GB |
| API，slim 镜像 | 512 MB | 1 GB |
| 控制平面 | 128 MB | 256 MB |
| Worker | 与 API 变体相同 | 与 API 变体相同 |
| PostgreSQL | 512 MB | 1 GB+ |

这不是理论最低值，而是反映本地模型成本、运行时开销，以及数据库和 Worker 需要余量的规划数字。

## 选择机器前先选完整或 slim {#pick-full-vs-slim-before-you-pick-a-machine}

最大区别是是否把本地嵌入和重排序包含在 API 进程中。

- 希望简单的一体部署且可承担额外 RAM 时，选择**完整镜像**。
- 希望小型主机且愿意按[配置指南](/developer/configuration)接入外部提供商时，选择 **slim**。

这个决定通常比争论小型虚拟机系列更重要。完整镜像换来便利，slim 换来显著更小占用。

## 使用实用部署方案 {#use-practical-deployment-recipes}

以下起点很合适：

- **笔记本或个人开发机**：完整镜像、嵌入式数据库、2 vCPU、2 GB 至 4 GB RAM。
- **小型云虚拟机**：slim 镜像、外部嵌入和重排序、1 GB 至 2 GB RAM，另配数据库。
- **更重的生产配置**：API 与 Worker 分开，PostgreSQL 独立规划；重视召回延迟时，将重排序器移到外部。

文档因此区分 API、Worker、UI 和数据库。Hindsight 是一个产品，却没有单一内存占用值。

## 理解压力实际来自哪里 {#know-where-the-pressure-really-comes-from}

生产流量中，重排序器通常最先让主机显得昂贵。仅 CPU 主机上，它可能成为主要延迟和内存压力来源。安装文档因此指出，CPU 适合开发和基础负载，生产通常受益于 GPU 重排序或外部服务。

如果部署比预期更重，原因通常是模型在本地运行，而非控制平面或简单文档页数。

## 有依据地排查内存压力 {#troubleshoot-memory-pressure-without-guessing}

节点负载高时，按顺序检查：

1. 确认使用完整还是 slim 镜像。
2. 检查 Worker 是否共用主机，令预期模型占用翻倍。
3. 确认同机 PostgreSQL 没有内存不足。
4. 查看[配置指南](/developer/configuration)中的外部提供商设置。
5. API 与 Worker 分离时，对照[服务指南](/developer/services)检查部署形态。

新文档不能消除调优工作，但让初步估算更有依据。

## 常见问题 {#faq}

### 1 GB RAM 可以运行 Hindsight 吗？ {#can-i-run-hindsight-in-1-gb-of-ram}

可以，但通常需 slim 镜像和外部提供商，完整镜像不适合这个容量。

### Worker 需要单独规划吗？ {#do-workers-need-separate-sizing}

需要。Worker 加载与相应 API 镜像相同的模型系统，应按另一个 API 进程预算。

### 控制平面是昂贵部分吗？ {#is-the-control-plane-the-expensive-part}

不是，它相对轻。本地嵌入和重排序主导占用。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [安装指南](/developer/installation)
- [配置指南](/developer/configuration)
- [服务指南](/developer/services)
- [快速入门指南](/developer/api/quickstart)
