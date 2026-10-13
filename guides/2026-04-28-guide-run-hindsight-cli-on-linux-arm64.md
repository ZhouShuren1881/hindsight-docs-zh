---
title: "无需变通即可在 Linux ARM64 运行 Hindsight CLI"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [cli, linux, arm64, guide]
description: "使用新发布产物在 Linux ARM64 运行 Hindsight CLI，在树莓派或 ARM 主机配置档案、API 访问和日常记忆命令。"
image: /img/guides/guide-run-hindsight-cli-on-linux-arm64.webp
hide_table_of_contents: true
---

![无需变通即可在 Linux ARM64 运行 Hindsight CLI](/img/guides/guide-run-hindsight-cli-on-linux-arm64.webp)

**在 Linux ARM64 运行 Hindsight CLI** 终于变得直接。发布流程现在提供正式的 `hindsight-linux-arm64` 产物，树莓派、Graviton 实例和小型 ARM 服务器不再需要本地重建或非官方复制步骤。可参考 [CLI 参考](/sdks/cli)、[安装指南](/developer/installation)、[快速入门指南](https://hindsight.vectorize.io/developer/api/quickstart)和[文档首页](https://hindsight.vectorize.io)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 发布产物现在包含 Linux ARM64，以及已有 AMD64 和 macOS 二进制。
- 最快方式是下载 `hindsight-linux-arm64`，赋予执行权限，再放入 PATH。
- 安装后，普通 `configure`、`bank`、`retain`、`recall` 命令与其他平台一致。

## 为什么这次更新重要 {#why-this-update-matters}

许多自托管 Hindsight 部署恰好使用 Linux ARM64 硬件。树莓派、便宜 ARM VPS 或 AWS Graviton 实例通常足以运行轻量记忆服务，尤其按[安装指导](/developer/installation)使用 slim 镜像或外部提供商时。

发布任务加入这个产物前，即使平台其他部分运行正常，CLI 仍可能缺失。新产物补齐了这一点。发布流程改动很小，却让 ARM64 成为真正支持的路径。

## 安装 Linux ARM64 二进制 {#install-the-linux-arm64-binary}

直接使用发布产物：

```bash
curl -L   -o hindsight   https://github.com/vectorize-io/hindsight/releases/latest/download/hindsight-linux-arm64

chmod +x hindsight
sudo mv hindsight /usr/local/bin/hindsight
hindsight --help
```

如果偏好在主目录保存工具，将二进制移入 `~/.local/bin` 并确保该目录在 PATH。检查很简单：`hindsight --help` 应输出命令树，而非架构或权限错误。

## 配置 CLI 访问云端或本地 API {#configure-the-cli-for-cloud-or-local-api-access}

安装后，让 CLI 指向实际需要的 API。

```bash
# 托管云端 {#managed-cloud}
hindsight configure   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

# 或本地部署 {#or-a-local-deployment}
hindsight configure --api-url http://localhost:8888
```

切换环境时，使用 [CLI 参考](/sdks/cli)中的命名档案，而非反复改写一个共享配置文件：

```bash
hindsight profile create prod   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

hindsight -p prod bank list
```

环境变量仍优先于档案文件，CI 可导出 `HINDSIGHT_API_URL` 和 `HINDSIGHT_API_KEY`，不受本地默认值影响。

## 端到端验证核心工作流 {#verify-the-core-workflow-end-to-end}

配置后，用小型记忆库和简单存储召回测试完整路径：

```bash
hindsight bank list
hindsight memory retain test-bank "Alice 喜欢异步更新"
hindsight memory recall test-bank "应该如何向 Alice 更新进展？"
```

成功后，ARM64 配置就完成了。你使用的是[记忆存储 API 指南](/developer/api/retain)、[记忆召回 API 指南](/developer/api/recall)和[快速入门指南](https://hindsight.vectorize.io/developer/api/quickstart)中的相同记忆命令，只是运行在 Linux ARM64 主机。

## 排查 Linux ARM64 常见问题 {#troubleshooting-common-linux-arm64-misses}

优先检查以下情况：

- **`Exec format error`** 通常表示下载错产物。确认名称为 `hindsight-linux-arm64`，而非 AMD64 版本。
- **`Permission denied`** 表示缺少执行权限，重新运行 `chmod +x hindsight`。
- **连接被拒绝**通常意味着本地 API 尚未启动，或 CLI 指向错误主机和端口。
- **401 或 403 响应**通常意味着 API 密钥缺失、无效，或对应错误 Hindsight 环境。

CLI 正常但召回慢或 RAM 紧张时，对照[安装文档的硬件指导](/developer/installation)。通常是部署容量问题，而非 CLI 问题。

## 常见问题 {#faq}

### 这替代安装脚本吗？ {#does-this-replace-the-install-script}

不会。发布产物使 Linux ARM64 成为直接下载目标。已有安装流程封装发布产物时，此改动让 ARM64 顺利接入。

### CLI 可同时访问 Hindsight Cloud 和本地服务器吗？ {#can-i-use-the-cli-against-hindsight-cloud-and-a-local-server}

可以。使用档案或环境变量，便于在云端、预发布和本地部署之间切换。

### ARM64 仅用于开发吗？ {#is-arm64-only-for-development}

不是。对中小负载，它是合理生产目标，尤其按当前安装指导规划 API、Worker 和数据库时。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [CLI 参考](/sdks/cli)
- [安装指南](/developer/installation)
- [快速入门指南](https://hindsight.vectorize.io/developer/api/quickstart)
- [文档首页](https://hindsight.vectorize.io)
