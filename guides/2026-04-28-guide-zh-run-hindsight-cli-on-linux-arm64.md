---
title: "在 Linux ARM64 上运行 Hindsight CLI，无需额外变通"
authors: [benfrank241]
date: 2026-04-28T14:00:00Z
tags: [cli, linux, arm64, guide]
description: "借助新的发布资产在 Linux ARM64 上运行 Hindsight CLI，并在 Pi 或 ARM 主机上设置命名配置文件、API 访问和日常记忆命令。"
image: /img/guides/guide-run-hindsight-cli-on-linux-arm64.webp
hide_table_of_contents: true
---

![在 Linux ARM64 上运行 Hindsight CLI，无需额外变通](/img/guides/guide-run-hindsight-cli-on-linux-arm64.webp)

如果您想**在 Linux ARM64 上运行 Hindsight CLI**，现在的设置终于简单了。最新的发布流程已提供正式的 `hindsight-linux-arm64` 资产，因此 Raspberry Pi 设备、Graviton 实例和小型 ARM 服务器不再需要本地重新构建，也不必通过非官方方式复制文件才能运行 CLI。工作时如果还需要查阅相关文档，可以同时打开 [CLI 参考](/sdks/cli)、[安装指南](/developer/installation)、[快速入门指南](/developer/api/quickstart) 和 [文档首页](/)。

<!-- truncate -->

## 快速解答 {#the-quick-answer}

- Linux ARM64 现已包含在已发布的发行资产中，与现有的 AMD64 和 macOS 二进制文件并列提供。
- 最快捷的方式是下载 `hindsight-linux-arm64`，将其设为可执行文件，然后移到 `PATH` 中的目录。
- 安装二进制文件后，常用的 `configure`、`bank`、`retain` 和 `recall` 命令在 Linux ARM64 上的用法与其他平台相同。

## 此次更新为何重要 {#why-this-update-matters}

Linux ARM64 支持很重要，因为许多自托管的 Hindsight 部署正好运行在这类硬件上。放在储物间里的 Raspberry Pi、价格实惠的 ARM VPS 或 AWS Graviton 实例，通常足以运行轻量级记忆服务；如果您按照较新的[安装指南](/developer/installation)，采用精简镜像或外部提供方来规划资源，就更是如此。

在将这项发行资产接入发布任务之前，即使平台的其他部分运行正常，CLI 本身也可能找不到。新增的资产补上了这个缺口。这只是发布工作流的一项小改动，却让 ARM64 成为真正受支持的使用方式，不再只是差一步。

## 安装 Linux ARM64 二进制文件 {#install-the-linux-arm64-binary}

直接使用已发布的发行资产：

```bash
curl -L   -o hindsight   https://github.com/vectorize-io/hindsight/releases/latest/download/hindsight-linux-arm64

chmod +x hindsight
sudo mv hindsight /usr/local/bin/hindsight
hindsight --help
```

如果您更愿意把本地工具放在主目录中，可以将二进制文件移到 `~/.local/bin`，并确保该目录已加入 `PATH`。检查很简单：运行 `hindsight --help` 后，应显示命令树，而不是架构或权限错误。

## 配置 CLI 以访问云端或本地 API {#configure-the-cli-for-cloud-or-local-api-access}

安装后，将 CLI 指向您实际要使用的 API。

```bash
# 托管云服务
hindsight configure   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

# 或者使用本地部署
hindsight configure --api-url http://localhost:8888
```

如果需要在不同环境之间切换，可以使用 [CLI 参考](/sdks/cli)中的命名配置文件，不必反复改写同一个共享配置文件：

```bash
hindsight profile create prod   --api-url https://api.hindsight.vectorize.io   --api-key YOUR_API_KEY

hindsight -p prod bank list
```

环境变量的优先级仍高于配置文件，因此 CI 作业可以导出 `HINDSIGHT_API_URL` 和 `HINDSIGHT_API_KEY`，而不会与本地默认值冲突。

## 端到端验证核心工作流 {#verify-the-core-workflow-end-to-end}

配置好 CLI 后，创建一个小型记忆库并执行一次简单的记忆存入与召回，以测试整个流程：

```bash
hindsight bank list
hindsight memory retain test-bank "Alice prefers async updates"
hindsight memory recall test-bank "How should I update Alice?"
```

如果这些命令能正常运行，ARM64 端的设置就完成了。您在 Linux ARM64 主机上使用的，正是[存入 API 指南](/developer/api/retain)、[召回 API 指南](/developer/api/recall)和[快速入门指南](/developer/api/quickstart)中介绍的同一套记忆命令。

## 排查 Linux ARM64 上的常见问题 {#troubleshooting-common-linux-arm64-misses}

遇到以下问题时，可以先检查这些原因：

- **`Exec format error`** 通常表示下载了错误的资产。请确认文件名是 `hindsight-linux-arm64`，而不是 AMD64 版本。
- **`Permission denied`** 表示二进制文件没有执行权限。重新运行 `chmod +x hindsight`。
- **Connection refused** 通常表示本地 API 尚未启动，或者 CLI 指向了错误的主机和端口。
- **401 或 403 响应** 通常表示 API 密钥缺失、无效，或指向了错误的 Hindsight 环境。

如果 CLI 本身运行正常，但 Recall 速度较慢，或者主机的 RAM 感觉不够用，请参照安装文档中的新[硬件指南](/developer/installation)检查当前配置。这通常是部署规格问题，与 CLI 无关。

## 常见问题 {#faq}

### 这会取代安装脚本吗？ {#does-this-replace-the-install-script}

不会。发行资产只是让 Linux ARM64 有了一个直接、简便的下载目标。如果您的安装流程已经封装了已发布的发行资产，这项改动会让 ARM64 顺利纳入该流程。

### 我可以通过 CLI 访问 Hindsight Cloud 和本地服务器吗？ {#can-i-use-the-cli-against-hindsight-cloud-and-a-local-server}

可以。使用配置文件或环境变量即可。这是切换云端、暂存和本地部署的简便方式。

### ARM64 只能用于开发吗？ {#is-arm64-only-for-development}

不能。对于中小型工作负载，ARM64 是合适的生产环境目标；特别是当您依据当前安装指南为 API、工作进程和数据库规划资源时。

## 后续步骤 {#next-steps}

- [Hindsight Cloud](https://hindsight.vectorize.io)
- [CLI 参考](/sdks/cli)
- [安装指南](/developer/installation)
- [快速入门指南](/developer/api/quickstart)
- [文档首页](/)
