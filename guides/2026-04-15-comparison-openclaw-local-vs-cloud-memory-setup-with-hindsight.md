---
title: "OpenClaw 与 Hindsight：本地和云端记忆配置对比"
authors: [benfrank241]
date: 2026-04-15
tags: [comparison, openclaw, memory, setup]
description: "对比 OpenClaw 与 Hindsight 的本地和云端记忆配置，包括配置方式、隐私、共享记忆、维护及适用场景。"
image: /img/blog/comparison-openclaw-local-vs-cloud-memory-setup-with-hindsight.png
hide_table_of_contents: true
---

![OpenClaw 与 Hindsight：本地和云端记忆配置对比](/img/blog/comparison-openclaw-local-vs-cloud-memory-setup-with-hindsight.png)

选择 **OpenClaw 与 Hindsight 的本地或云端记忆配置**时，真正的问题不只是记忆在哪里运行，而是你希望如何权衡运维。本地模式让完整记忆系统与 OpenClaw 运行在同一台机器上；云端模式提供托管 Hindsight 端点，OpenClaw 通过网络访问。两者都支持自动存储和自动召回，区别在于基础设施的位置、凭据管理，以及跨机器共享记忆的便利程度。

这个决定不只影响部署，还会改变启动行为、可靠性模式、隐私边界，以及 OpenClaw 实例之间能否共享记忆。在单台笔记本上使用的个人用户可能偏好本地模式，因为它简单且把服务留在设备上。运行多个 OpenClaw 网关的团队通常更适合云端模式，因为共享记忆更直接。

本文比较两种模式的作用、配置差异、各自更适合的场景，以及需求变化后如何切换。如需完整参考，请打开 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[文档首页](/)和[快速入门指南](/developer/api/quickstart)。

<!-- truncate -->

> **结论**
>
> 如果需要单机记忆、尽量少的外部依赖和较强的本地控制，使用**本地模式**。如果需要最快的配置、更简单的多实例共享和更少的基础设施工作，使用**云端模式**。不确定时，团队或多设备场景从云端开始，单人单机部署从本地开始。

## 两种配置分别做什么 {#what-each-setup-does}

从整体看，两种模式为 OpenClaw 提供相同的产品行为：

- 每轮后自动存储对话。
- 每次回复前自动召回相关记忆。
- 智能体无需显式调用记忆工具即可获得上下文。

变化在于 Hindsight 的运行位置。

### 本地模式 {#local-mode}

本地模式下，插件通过 `hindsight-embed` 运行嵌入式 Hindsight 服务。记忆 API 和 PostgreSQL 存储与 OpenClaw 位于同一台机器。

为 Hindsight 配置提取模型并启动 OpenClaw 后，本地守护进程就在同机处理记忆操作。

典型的嵌入式配置命令如下：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key-env OPENAI_API_KEY
```

如果运行 OpenClaw 的机器也是应存储和处理记忆的机器，这种方式很合适。

### 云端模式 {#cloud-mode}

云端模式下，OpenClaw 使用 API 令牌访问 `https://api.hindsight.vectorize.io` 上的托管 Hindsight 端点。本地网关无需自行托管记忆服务。

典型的云端配置命令如下：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN
```

这是无需在本地管理 Hindsight 服务器，就能为一个或多个 OpenClaw 实例提供可用记忆的最快方式。

## 并列比较 {#side-by-side-comparison}

| 维度 | 本地模式 | 云端模式 |
|---|---|---|
| 配置方式 | OpenClaw 所在机器上的嵌入式守护进程 | 带 API 令牌的托管 Hindsight 端点 |
| 需要管理的基础设施 | OpenClaw 和本地 Hindsight 运行时 | 仅 OpenClaw |
| 数据位置 | 记忆服务留在本机 | 记忆服务远程运行 |
| 跨设备共享记忆 | 默认较麻烦 | 简单 |
| 启动行为 | 首次使用可能需要启动守护进程 | 无需启动本地记忆守护进程 |
| 适合场景 | 单机、偏好本地优先 | 团队、多实例、快速获得价值 |
| 关键凭据 | 用于提取的 LLM 提供商密钥 | Hindsight 云端令牌 |
| 故障表现 | 本地守护进程或本地配置问题 | 网络或远端端点问题 |

这张表涵盖了主要差异，但具体工作流更能说明实际影响。

## 何时使用本地模式 {#when-to-use-local-mode}

当控制权和本地性比集中管理更重要时，本地模式更合适。

以下情况选择本地模式：

- 在一台机器上运行一个 OpenClaw 实例。
- 希望记忆服务留在同一台机器。
- 可以接受在本地向 Hindsight 提供提取模型凭据。
- 暂时不需要多个 OpenClaw 实例共享同一记忆库。

本地部署很直观：OpenClaw 和 Hindsight 运行在一起，无需考虑单独的记忆服务器。对于个人助手，这很有吸引力。

它也便于反复实验：更改插件设置、重启网关、查看日志，整个记忆系统始终就在手边。

代价是记忆服务不容易自然地跨设备共享。如果之后希望笔记本和服务器上的 OpenClaw 共享记忆库，本地模式就不再显得理所当然。

### 本地模式示例 {#local-mode-example}

嵌入式模式的直接 `openclaw.json` 配置示例如下：

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

具体细节可能有所不同，但关键是 OpenClaw 在本地托管 Hindsight 路径，而非调用远程 Hindsight API。

## 何时使用云端模式 {#when-to-use-cloud-mode}

如果希望减少基础设施工作、获得更多运维灵活性，云端模式更合适。

以下情况选择云端模式：

- 希望从零开始尽快获得可用记忆。
- 运行多个 OpenClaw 实例。
- 希望跨机器共享记忆库。
- 不想在本地管理嵌入式记忆服务。

主要收益是规模扩大后仍然简单。第二个 OpenClaw 实例可直接指向同一 Hindsight 后端，无需暴露或同步本地嵌入式守护进程。

因此云端模式与共享记忆很自然地结合。如果希望用户或团队的上下文随他们跨实例延续，云端模式消除了最大的运维障碍。

代价也很明确：记忆后端位于远端。这通常值得，但确实改变了系统边界。

### 云端模式示例 {#cloud-mode-example}

直接的云端配置如下：

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

如果需要约束更严格的生产配置，应通过环境变量、文件或执行命令使用 `SecretRef`，而不是内联写入秘密值。[OpenClaw 集成文档](/sdks/integrations/openclaw)更详细地介绍这些方式。

## 配置和运维体验的差异 {#how-setup-and-operations-feel-different}

### 启动与可靠性 {#startup-and-reliability}

本地模式中，全新机器可能需要等待嵌入式记忆运行时启动。如果仔细观察日志，最初几次启用记忆的交互可能显得更慢或更脆弱。

云端模式中，主要运维依赖转为网络可达性和 API 健康状态。避免了本地守护进程启动，但依赖远端端点可访问。

### 凭据 {#credentials}

本地模式中，主要敏感值通常是提取模型凭据，例如 `OPENAI_API_KEY` 或其他提供商密钥。

云端模式中，关键凭据是 Hindsight 云端令牌。两种方式都可使用 `SecretRef`，非简单试验场景也应这样做。

### 共享记忆 {#shared-memory}

云端模式通常在这方面有明显优势。如果希望多个 OpenClaw 实例向同一记忆库学习，云端更容易理解。现有 OpenClaw 共享记忆模式依赖共同的外部端点，因此云端模式自然适合多实例记忆。

如果这是主要目标，还应阅读 [OpenClaw 集成文档](/sdks/integrations/openclaw)、[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)和[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)，以理解多智能体和多工具场景。

## 何时本地优于云端 {#when-local-is-better-than-cloud}

以下情况本地模式更好：

- 最重视让记忆服务靠近网关所在机器。
- 采用单用户部署。
- 希望日常使用中涉及更少外部组件。
- 可以自行管理本地提取模型凭据。

也就是说，部署规模较小且获得的控制权值得承担运维职责时，本地模式更有优势。

## 何时云端优于本地 {#when-cloud-is-better-than-local}

以下情况云端模式更好：

- 希望从配置到有用记忆的过程尽量快。
- 预计有多个 OpenClaw 实例。
- 希望跨机器共享记忆。
- 希望避免运行或诊断本地记忆服务。

对于团队，云端通常也更容易推荐：一旦多个网关需要同一记忆，本地优先的优势就会减弱。

## 迁移说明 {#migration-notes}

好消息是，这个选择并非永久固定。

### 从本地迁移到云端 {#moving-from-local-to-cloud}

最直接的方式通常是以云端模式重新运行配置向导：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode cloud --token-env HINDSIGHT_CLOUD_TOKEN
openclaw gateway restart
```

然后核对更新后的配置，测试真实的记忆对话。

### 从云端迁移到本地 {#moving-from-cloud-to-local}

同样，以嵌入式模式重新运行向导：

```bash
npx --package @vectorize-io/hindsight-openclaw hindsight-openclaw-setup \
    --mode embedded --provider openai --api-key-env OPENAI_API_KEY
openclaw gateway restart
```

无论哪个方向，都不能把切换当作单纯的外观开关。它改变记忆后端的运维形态，应在更改后重新测试召回、存储及记忆库行为。

## 后续步骤 {#next-steps}

- [创建 Hindsight Cloud 账户](https://hindsight.vectorize.io)，快速实现跨实例共享 OpenClaw 记忆。
- 阅读 [OpenClaw 集成文档](/sdks/integrations/openclaw)，了解完整插件配置参考。
- 如需简明的端到端 Hindsight 回顾，查阅[快速入门指南](/developer/api/quickstart)。
- 使用[记忆召回 API 参考](/developer/api/recall)，了解每种模式在内容进入 OpenClaw 前检索什么。
- 使用[记忆存储 API 参考](/developer/api/retain)，理解什么内容实际成为记忆。
- 设计更广泛的多工具记忆方案时，可对照[使用 Hindsight 为 Codex 添加记忆](/blog/2026/04/08/adding-memory-to-codex-with-hindsight)和[团队共享记忆文章](/blog/2026/07/10/shared-memory-across-ai-tools)等相关工作流。
