---
title: "无需变通即可在 Linux ARM64 上运行 Hindsight CLI"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [cli, linux, arm64, guide]
description: "使用新版发布产物在 Linux ARM64 上运行 Hindsight CLI，并在树莓派或 ARM 主机上配置档案、API 访问和日常记忆命令。"
image: /img/guides/guide-run-hindsight-cli-on-linux-arm64.webp
hide_table_of_contents: true
---

![无需变通即可在 Linux ARM64 上运行 Hindsight CLI](/img/guides/guide-run-hindsight-cli-on-linux-arm64.webp)

如果你想要**在 Linux ARM64 上运行 Hindsight CLI**，现在的配置过程终于简单直接了。最新的发布流程现在会提供正式的 `hindsight-linux-arm64` 产物，因此 Raspberry Pi 设备、Graviton 实例和小型 ARM 服务器不再需要为了运行 CLI 而在本地重新构建，也不必通过非官方方式复制二进制文件。如果你在操作时还需要查阅相关文档，可以同时打开 [CLI 参考](/sdks/cli)、[安装指南](/developer/installation)、[快速入门指南](/developer/api/quickstart)和[文档首页](/)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- 现在发布产物已包含 Linux ARM64，同时也提供原有的 AMD64 和 macOS 二进制文件。
- 最快的方式是下载 `hindsight-linux-arm64`，将其设为可执行文件，再移到 PATH 中的目录。
- 安装二进制文件后，常用的 `configure`、`bank`、`retain` 和 `recall` 命令与其他平台上的用法相同。

## 这次更新为何重要 {#why-this-update-matters}

Linux ARM64 支持很重要，因为许多自托管的 Hindsight 部署正好运行在这类硬件上。放在储物间里的 Raspberry Pi、价格低廉的 ARM VPS，或 AWS Graviton 实例，通常就足以运行轻量级记忆服务；尤其是按照新版[安装指南](/developer/installation)，采用精简镜像或外部服务提供方时。

在将这个发布产物接入发布任务之前，即使平台的其他部分运行正常，也很容易发现 CLI 还没有对应的版本。新增的产物补上了这一缺口。这只是发布流程中的一项小改动，却让 ARM64 成为真正受支持的部署方式，不再只是差一步就能用。

## 安装 Linux ARM64 二进制文件 {#install-the-linux-arm64-binary}

直接使用已发布的产物：

```bash
curl -L   -o hindsight   https://github.com/vectorize-io/hindsight/releases/latest/download/hindsight-linux-arm64

chmod +x hindsight
sudo mv hindsight /usr/local/bin/hindsight
hindsight --help
```

如果你更愿意把本地工具放在自己的主目录中，可以将二进制文件移到 `~/.local/bin`，并确保该目录位于 PATH 中。检查方法很简单：`hindsight --help` 应该会输出命令树，而不是报架构或权限错误。

## 配置 CLI 以访问云端或本地 API {#configure-the-cli-for-cloud-or-local-api-access}

安装后，将 CLI 指向你实际要使用的 API。

```bash
# 托管云端
hindsight configure   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

# 或者使用本地部署
hindsight configure --api-url http://localhost:8888
```

如果你要在多个环境之间切换，可以使用 [CLI 参考](/sdks/cli)中介绍的命名配置档案，无需反复改写同一个共享配置文件：

```bash
hindsight profile create prod   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

hindsight -p prod bank list
```

环境变量的优先级仍高于配置档案文件，因此 CI 任务可以导出 `HINDSIGHT_API_URL` 和 `HINDSIGHT_API_KEY`，而不受本地默认值影响。

## 端到端验证核心工作流 {#verify-the-core-workflow-end-to-end}

配置好 CLI 后，用一个小型记忆库执行简单的记忆存入和召回往返，测试整条流程：

```bash
hindsight bank list
hindsight memory retain test-bank "Alice prefers async updates"
hindsight memory recall test-bank "How should I update Alice?"
```

如果命令运行成功，Linux ARM64 的配置就完成了。你在 Linux ARM64 主机上使用的，正是[记忆存入 API 指南](/developer/api/retain)、[记忆召回 API 指南](/developer/api/recall)和[快速入门指南](/developer/api/quickstart)中介绍的那些记忆命令。

## 排查 Linux ARM64 常见问题 {#troubleshooting-common-linux-arm64-misses}

遇到问题时，可以先检查以下几项：

- **`Exec format error`** 通常表示下载了错误的产物。请确认文件名是 `hindsight-linux-arm64`，而不是 AMD64 版本。
- **`Permission denied`** 表示二进制文件缺少执行权限。重新运行 `chmod +x hindsight` 即可。
- **连接被拒绝**通常表示本地 API 尚未启动，或者 CLI 指向了错误的主机和端口。
- **401 或 403 响应**通常表示 API 密钥缺失、无效，或密钥对应的 Hindsight 环境不正确。

如果 CLI 本身运行正常，但召回速度很慢，或者主机的 RAM 显得吃紧，可以根据新版[安装文档中的硬件指南](/developer/installation)检查当前主机。这通常是部署资源配置问题，而不是 CLI 问题。

## 常见问题 {#faq}

### 这会取代安装脚本吗？ {#does-this-replace-the-install-script}

不会。这个发布产物只是让 Linux ARM64 成为一个可以直接下载的目标。如果你的安装流程已经封装了已发布的产物，这项改动会让 ARM64 顺利纳入该流程。

### 我可以用 CLI 访问 Hindsight Cloud 和本地服务器吗？ {#can-i-use-the-cli-against-hindsight-cloud-and-a-local-server}

可以。使用配置档案或环境变量即可。这是切换云端、预发布和本地部署最简便的方式。

### ARM64 只能用于开发吗？ {#is-arm64-only-for-development}

不是。对于中小型工作负载，ARM64 是合理的生产环境目标，尤其是在你根据当前安装指南为 API、工作进程和数据库选择合适规格时。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [CLI 参考](/sdks/cli)
- [安装指南](/developer/installation)
- [快速入门指南](/developer/api/quickstart)
- [文档首页](/)
