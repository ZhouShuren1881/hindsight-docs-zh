---
title: "使用 Hindsight 配置 OpenClaw 本地与云端记忆"
authors: [benfrank241]
date: 2026-04-15
tags: [comparison, openclaw, memory, setup]
description: "比较使用 Hindsight 为 OpenClaw 配置本地和云端记忆的方式，涵盖配置、隐私、共享记忆、维护，以及两种方式各自适用的场景。"
image: /img/blog/comparison-openclaw-local-vs-cloud-memory-setup-with-hindsight.png
hide_table_of_contents: true
---

![使用 Hindsight 配置 OpenClaw 本地与云端记忆](/img/blog/comparison-openclaw-local-vs-cloud-memory-setup-with-hindsight.png)

如果你正在考虑使用 Hindsight 为 OpenClaw 配置**本地记忆还是云端记忆**，真正要考虑的不只是记忆运行在哪里，还包括你希望怎样权衡运维。使用本地模式时，完整的记忆系统与 OpenClaw 运行在同一台机器上；云端模式则提供托管的 Hindsight 端点，供 OpenClaw 通过网络访问。两种模式都会自动存入记忆并自动召回记忆。它们的差异在于基础设施的位置、凭据的管理方式，以及跨机器共享记忆的难易程度。

这个选择影响的不只是部署方式。它还会改变启动行为、可靠性模式和隐私边界，也决定一个 OpenClaw 实例能否与另一个实例共享记忆。只在一台笔记本电脑上使用的个人用户，可能更喜欢本地模式，因为它简单，而且所有内容都留在设备上。运行多个 OpenClaw 网关的团队通常会选择云端模式，因为这样更容易共享记忆。

本文会介绍两种模式分别如何工作、配置方式有哪些不同、何时本地模式更合适、何时云端模式更合适，以及需求改变后如何切换。比较时可以同时打开 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)，查看完整参考。

<!-- truncate -->

> **结论**
>
> 如果你需要单机记忆、尽量少的外部依赖和充分的本地控制，请使用**本地模式**。如果你希望尽快完成配置、更轻松地在多个实例间共享记忆，并减少基础设施工作，请使用**云端模式**。如果还不确定，团队或多设备场景可以先从云端模式开始，个人单机部署则可以先从本地模式开始。

## 两种配置的作用 {#what-each-setup-does}

概括来说，两种模式为 OpenClaw 提供相同的功能：

- 每轮对话结束后自动存入对话内容。
- 每次回复前自动召回相关记忆。
- 无需智能体显式调用记忆工具，就能为智能体提供上下文。

两种模式的区别在于 Hindsight 运行在哪里。

### 本地模式 {#local-mode}

在本地模式下，插件通过 `hindsight-embed` 运行嵌入式 Hindsight 服务。因此，记忆 API 及其 PostgreSQL 存储都与 OpenClaw 位于同一台机器上。

为 Hindsight 配置提取模型并启动 OpenClaw 后，本地守护进程就会就近处理记忆操作。

典型的嵌入式配置命令如下：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key-env OPENAI_API_KEY
```

如果运行 OpenClaw 的机器也应该负责存储和处理记忆，那么本地模式很合适。

### 云端模式 {#cloud-mode}

在云端模式下，OpenClaw 使用 API 令牌访问位于 `https://api.hindsight.vectorize.io` 的托管 Hindsight 端点。本地网关不再需要自行托管记忆服务。

典型的云端配置命令如下：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN
```

无需在本地管理 Hindsight 服务器，就能让一个或多个 OpenClaw 实例使用记忆；云端模式是最快的实现方式。

## 并列比较 {#side-by-side-comparison}

| 维度 | 本地模式 | 云端模式 |
|---|---|---|
| 配置方式 | 在 OpenClaw 所在机器上运行嵌入式守护进程 | 使用带 API 令牌的托管 Hindsight 端点 |
| 需要管理的基础设施 | OpenClaw 和本地 Hindsight 运行时 | 仅 OpenClaw |
| 数据位置 | 记忆服务留在本机 | 记忆服务在远端运行 |
| 跨设备共享记忆 | 默认情况下较麻烦 | 简单 |
| 启动行为 | 首次使用时可能需要启动守护进程 | 无需启动本地记忆守护进程 |
| 适用场景 | 单机，优先选择本地部署 | 团队、多实例、最快获得实际价值 |
| 关键凭据 | 用于提取的 LLM 提供商密钥 | Hindsight 云端令牌 |
| 故障模式 | 本地守护进程或本地配置问题 | 网络或远端端点问题 |

这张表已经概括了大部分差异，但通过具体工作流更容易看清实际影响。

## 何时使用本地模式 {#when-to-use-local-mode}

如果你更看重控制权和数据留在本地，而不是集中管理，那么本地模式更合适。

以下情况可以选择本地模式：

- 你只在一台机器上运行一个 OpenClaw 实例。
- 你希望记忆服务留在这台机器上。
- 你可以接受在本地向 Hindsight 提供提取模型凭据。
- 你暂时不需要多个 OpenClaw 实例共享同一个记忆库。

本地部署简洁明了，因为 OpenClaw 和 Hindsight 在同一处运行，无需另行管理记忆服务器。对于个人助手配置来说，这一点很有吸引力。

本地模式也便于反复试验。你可以更改插件设置、重启网关、查看日志，让整套记忆系统都近在手边。

代价是记忆服务不再能轻松地跨设备共享。如果你之后希望笔记本电脑上的 OpenClaw 和服务器上的 OpenClaw 共用一个记忆库，本地模式就不再是显而易见的选择。

### 本地模式示例 {#local-mode-example}

嵌入式模式的 `openclaw.json` 配置示例如下：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "llmProvider": "openai",
          "llmApiKey": {
            "$ref": {
              "source": "env",
              "provider": "default",
              "id": "OPENAI_API_KEY"
            }
          },
          "apiPort": 9077,
          "daemonIdleTimeout": 0
        }
      }
    }
  }
}
```

具体配置可能有所不同，但关键是：OpenClaw 在本地托管 Hindsight，而不是调用远端 Hindsight API。

## 何时使用云端模式 {#when-to-use-cloud-mode}

如果你想减少基础设施工作并提高运维灵活性，那么云端模式更合适。

以下情况可以选择云端模式：

- 你希望从零开始尽快用上记忆功能。
- 你运行多个 OpenClaw 实例。
- 你希望多个机器共用一个记忆库。
- 你不想在本地管理嵌入式记忆服务。

云端模式最大的优势是：规模扩大后依然简单。第二个 OpenClaw 实例可以直接连接同一个 Hindsight 后端，无需公开或同步本地嵌入式守护进程。

因此，云端模式很适合共享记忆配置。如果你希望某位用户或某个团队的上下文能随他们在不同实例间切换，云端模式就能消除最大的运维障碍。

取舍也很明确：记忆后端现在运行在远端。这通常是值得的，但这确实改变了系统边界。

### 云端模式示例 {#cloud-mode-example}

云端配置示例如下：

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://api.hindsight.vectorize.io",
          "hindsightApiToken": {
            "$ref": {
              "source": "env",
              "provider": "default",
              "id": "HINDSIGHT_CLOUD_TOKEN"
            }
          }
        }
      }
    }
  }
}
```

如果生产环境需要更严格的凭据管理，请通过环境变量、文件或 exec 使用 `SecretRef`，不要把密钥直接写进配置。[OpenClaw 集成文档](/sdks/integrations/openclaw)详细介绍了这些方式。

## 配置和运维体验的差异 {#how-setup-and-operations-feel-different}

### 启动与可靠性 {#startup-and-reliability}

在本地模式下，新机器可能需要一些时间才能启动嵌入式记忆运行时。如果你密切关注日志，最初几次启用记忆的交互可能会显得更慢，也更容易出问题。

在云端模式下，主要的运维依赖转为网络连通性和 API 健康状态。你不必等待本地守护进程启动，但需要确保能访问远端端点。

### 凭据 {#credentials}

在本地模式下，主要的敏感值通常是提取模型凭据，例如 `OPENAI_API_KEY` 或其他提供商的密钥。

在云端模式下，关键凭据是 Hindsight 云端令牌。两种模式都可以使用 `SecretRef` 方式；对于较正式的使用场景，你也应该这样管理凭据。

### 共享记忆 {#shared-memory}

共享记忆是云端模式通常明显占优的地方。如果你希望多个 OpenClaw 实例都能学习并写入同一个记忆库，云端模式更容易理解和管理。现有的 OpenClaw 共享记忆模式依赖共同的外部端点，因此云端模式很适合多实例共享记忆。

如果这是你的主要目标，还可以阅读 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，进一步了解多智能体和多工具的使用方式。

## 何时本地模式优于云端模式 {#when-local-is-better-than-cloud}

以下情况本地模式更合适：

- 你最在意记忆服务靠近网关所在的机器。
- 你采用单用户部署。
- 你希望日常使用时涉及更少的外部组件。
- 你愿意自行管理本地提取模型凭据。

换句话说，当部署规模较小，且你认为获得的控制权值得承担相应的运维责任时，本地模式更有优势。

## 何时云端模式优于本地模式 {#when-cloud-is-better-than-local}

以下情况云端模式更合适：

- 你希望尽快从完成配置转向使用记忆。
- 你预计会运行多个 OpenClaw 实例。
- 你希望多个机器共享记忆。
- 你希望避免运行或诊断本地记忆服务。

对于团队，云端模式通常也更容易推荐，因为多个网关一旦需要共用记忆，本地优先的优势就会减弱。

## 迁移说明 {#migration-notes}

好在这个选择并非一成不变。

### 从本地迁移到云端 {#moving-from-local-to-cloud}

通常最直接的做法是以云端模式重新运行配置向导：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN
openclaw gateway restart
```

之后核对更新后的配置，并测试一次真实的记忆对话。

### 从云端迁移到本地 {#moving-from-cloud-to-local}

同样，以嵌入式模式重新运行配置向导：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key-env OPENAI_API_KEY
openclaw gateway restart
```

无论朝哪个方向切换，都不要把它当作纯粹改变外观的开关。切换会改变记忆后端的运维方式，因此更改后应重新测试记忆召回、存入和记忆库行为。

## 后续步骤 {#next-steps}

- 如果你希望尽快让多个实例共享 OpenClaw 记忆，可以[创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)。
- 阅读 [OpenClaw 集成文档](/sdks/integrations/openclaw)，查看完整的插件配置说明和参考。
- 如需简明回顾 Hindsight 的端到端流程，可以随时查阅[快速入门指南](/developer/api/quickstart)。
- 使用 [Recall API 参考](/developer/api/recall)，了解每种模式在记忆到达 OpenClaw 前会检索哪些内容。
- 使用 [Retain API 参考](/developer/api/retain)，了解哪些内容最终会成为记忆。
- 如果你正在设计更广泛的多工具记忆方案，可以对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)等相近工作流。
