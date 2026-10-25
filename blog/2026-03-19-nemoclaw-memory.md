---
slug: sandboxed-agent-persistent-memory-nemoclaw
title: "用一条命令为 NemoClaw 配备出色的智能体记忆"
description: "无需修改代码，即可为 NemoClaw 沙盒中的 AI 智能体添加持久记忆。一条命令、一条网络策略，让记忆跨会话留存。"
authors: [hindsight]
date: 2026-03-19T12:00
image: /img/blog/2026-03-19/nemoclaw-memory.webp
hide_table_of_contents: true
tags: [tutorial]
---

![用一条命令为 NemoClaw 配备出色的智能体记忆](/img/blog/2026-03-19/nemoclaw-memory.webp)

## 简要概述 {#tldr}

- [NemoClaw](https://nemoclaw.ai) 通过沙盒隔离 AI 智能体，并控制其文件系统、进程和网络。这种隔离让持久记忆更难实现。
- 我们使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，将 `hindsight-openclaw` 插件连接到正在运行的 NemoClaw 沙盒。无需修改代码，只需一条命令。
- 外部 API 模式很适合这种场景：插件变成轻量的 HTTP 客户端，沙盒只需添加一条网络出口规则。
- 一个会话中捕获的记忆，可以在下一个会话中召回。沙盒没有妨碍这一过程。
- 这种模式可以推广到其他场景：沙盒控制智能体可以*做什么*，记忆控制它*知道什么*。两者可以很好地协同工作。

## 问题：沙盒中的智能体没有持久记忆 {#the-problem-sandboxed-agents-have-no-persistent-memory}

在沙盒中运行的 AI 智能体面临一个有意思的记忆问题。沙盒的设计目标是隔离智能体：它控制智能体可以读取哪些文件、可以启动哪些进程，以及可以访问哪些网络端点。隔离本身正是沙盒的意义所在。但这也带来一个问题：如果每个会话都从一个干净、受限的环境开始，持久记忆应存放在哪里？

我们用 [NemoClaw](https://nemoclaw.ai) 来回答这个问题。NemoClaw 是 NVIDIA 基于 OpenShell 构建的沙盒智能体运行时。目标很简单：将 `hindsight-openclaw` 插件连接到正在运行的 NemoClaw 沙盒，并验证一个会话中捕获的记忆能否在下一个会话中召回。不允许修改代码——如果必须修改插件才能运行，我们就会从中发现架构上的重要问题。

结果是，我们一行代码也不用改。

<!-- truncate -->

## 方案：在沙盒记忆中使用外部 API 模式 {#the-approach-external-api-mode-for-sandbox-memory}

[NemoClaw](https://nemoclaw.ai) 在 OpenShell 沙盒中运行 [OpenClaw](https://openclaw.ai)。沙盒会执行文件系统策略（智能体可以读写哪些路径）、进程策略（智能体以何种方式运行）和网络出口策略（允许访问哪些出站端点）。

默认情况下，沙盒会为所需服务配置策略：LLM 提供商、GitHub、npm 和 OpenClaw API。其他所有端点都会被阻止。这是一个合理的默认设置——如果智能体可以调用任意端点，就更难让人放心。

[Hindsight](/) 以外部 API 的形式运行。插件通过 HTTPS 调用 `api.hindsight.vectorize.io`，以[存入和召回记忆](/blog/2026/03/04/mcp-agent-memory)。从沙盒的角度看，这只是另一个出站端点，需要明确允许访问。

完整架构如下：

```
┌─────────────────────────────────────────────┐
│  NemoClaw Sandbox (OpenShell)               │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  OpenClaw Gateway                    │   │
│  │  + hindsight-openclaw plugin         │   │
│  │    ↓ before_agent_start: recall      │   │
│  │    ↓ agent_end: retain               │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Network egress policy:                     │
│    ✓ api.anthropic.com                      │
│    ✓ integrate.api.nvidia.com               │
│    ✓ api.hindsight.vectorize.io  ← added    │
└─────────────────────────────────────────────┘
```

插件存入一段对话时，Hindsight 不会只保存原始文本。它会提取结构化事实、消解实体、构建[知识图谱](/blog/2026/03/12/spreading-activation-memory-graphs)，并为多策略检索建立索引，包括语义检索、BM25 关键词匹配、图遍历，以及结合[交叉编码器重排序](/blog/2026/03/04/mcp-agent-memory)的时间筛选。这样一来，即使智能体的问题与已存储内容的确切措辞不同，召回仍然有效。

插件有两种模式。在**本地守护进程模式**下，它会启动本地 `hindsight-embed` 进程，并通过本地端口与其通信。在**外部 API 模式**下，它完全跳过守护进程，直接向 Hindsight Cloud 端点发送 HTTP 请求。

在沙盒中，本地守护进程模式不太方便。沙盒会控制可以启动哪些进程，而后台守护进程还要启动 `uvx` 子进程，这会带来不必要的阻碍。外部 API 模式很适合这种场景：插件变成轻量的 HTTP 客户端，所需的基础设施只有一条网络出口规则。

如需了解 OpenClaw 插件本身的背景——例如它如何接入网关生命周期、自动将记忆注入上下文，以及防止反馈循环——请参阅[每个 OpenClaw 用户都需要的记忆升级](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。

## 实现：一条命令 {#implementation-one-command}

`hindsight-nemoclaw` 包会自动完成全部设置：安装插件、配置外部 API 模式、读取当前沙盒策略、合并 Hindsight 网络出口规则，以及重启网关：

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-url https://api.hindsight.vectorize.io \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

就是这样。你会看到类似以下输出：

```
[0] Preflight checks...
  ✓ openshell found
  ✓ openclaw found

[1] Installing @vectorize-io/hindsight-openclaw plugin...
  ✓ Plugin installed

[2] Configuring plugin in ~/.openclaw/openclaw.json...
  ✓ Plugin config written (bank: my-sandbox-openclaw)

[3] Applying Hindsight network policy to sandbox "my-assistant"...
  ✓ Policy version 2 submitted
  ✓ Policy version 2 loaded (active version: 2)

[4] Restarting OpenClaw gateway...
  ✓ Gateway restarted

✓ Setup complete!
```

使用 `--dry-run` 可在应用更改前预览全部内容。如果你手动管理沙盒策略，请使用 `--skip-policy`。

## 验证是否正常工作 {#verifying-it-works}

设置完成后，网关日志会确认插件正在运行：

```
[Hindsight] Plugin loaded successfully
[Hindsight] ✓ Using external API: https://api.hindsight.vectorize.io
[Hindsight] External API health: {"status":"healthy","database":"connected"}
[Hindsight] Default bank: my-sandbox-openclaw
[Hindsight] ✓ Ready (external API mode)
```

向智能体发送一条消息：

```bash
openclaw agent --agent main --session-id session-1 \
  -m "My name is Ben and I work on Hindsight. I prefer detailed commit messages."
```

网关日志会显示钩子已触发：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] agent_end triggered - bank: my-sandbox-openclaw
[Hindsight] Retained 6 messages to bank my-sandbox-openclaw for session agent:main:...
```

开启一个新会话，询问智能体记得什么：

```bash
openclaw agent --agent main --session-id session-2 \
  -m "What do you remember about me?"
```

```
Right now I've just got the basics: your name is Ben, you're working on
Hindsight, and you like commit messages to be detailed. If there's anything
else you want me to keep in mind, let me know.
```

记忆跨越了会话边界，沙盒没有妨碍这一过程。

## 设置命令的作用（手动替代方案） {#what-the-setup-command-does-manual-alternative}

如果你更愿意手动执行这些步骤，下面说明了 `hindsight-nemoclaw setup` 在幕后所做的事情。

**安装插件：**

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

**配置 `~/.openclaw/openclaw.json`：**

```json
{
  "plugins": {
    "entries": {
      "hindsight-openclaw": {
        "enabled": true,
        "config": {
          "hindsightApiUrl": "https://api.hindsight.vectorize.io",
          "hindsightApiToken": "<your-api-key>",
          "llmProvider": "claude-code",
          "dynamicBankId": false,
          "bankIdPrefix": "my-sandbox"
        }
      }
    }
  }
}
```

**将 Hindsight 配置块添加到沙盒网络策略中**（注意：`openshell policy set` 会替换整个文档，因此必须包含所有现有策略）：

```yaml
network_policies:
  hindsight:
    name: hindsight
    endpoints:
      - host: api.hindsight.vectorize.io
        port: 443
        protocol: rest
        tls: terminate
        enforcement: enforce
        rules:
          - allow:
              method: GET
              path: /**
          - allow:
              method: POST
              path: /**
          - allow:
              method: PUT
              path: /**
    binaries:
      - path: /usr/local/bin/openclaw
```

```bash
openshell policy set my-sandbox --policy /path/to/full-policy.yaml --wait
openclaw gateway restart
```

## 陷阱与边缘情况 {#pitfalls--edge-cases}

### 1. 策略替换会覆盖整个文档 {#1-policy-replacement-is-full-document}

`openshell policy set` 会替换整个策略文档，而不只是你要添加的部分。`hindsight-nemoclaw setup` 命令会自动处理：读取当前策略、合并 Hindsight 配置块，再重新应用完整文档。如果手动应用，请确保 YAML 包含所有现有网络策略。

### 2. macOS 上的 LaunchAgent 无法跟随符号链接 {#2-launchagent-cant-follow-symlinks-on-macos}

在 macOS 上，OpenClaw 网关以 LaunchAgent 身份运行，安全上下文受到限制，无法访问 `~/Documents` 或其他用户目录。`openclaw plugins install --link` 会创建 LaunchAgent 无法跟随的符号链接，因此应安装副本：

```bash
# 可用：将文件复制到 ~/.openclaw/extensions/
openclaw plugins install @vectorize-io/hindsight-openclaw
```

如果网关日志中出现 `EPERM: operation not permitted, scandir`，原因就在这里。

### 3. 记忆存入是异步的 {#3-memory-retention-is-asynchronous}

插件在会话结束时调用 `retain` 后，[事实提取和实体消解](/blog/2026/03/12/spreading-activation-memory-graphs)会在 Hindsight 一侧的后台进行。如果你立即开启新会话，最新的记忆可能尚未建立索引。实际等待时间通常只有几秒，不过连续测试时需要留意这一点。

### 4. 按二进制文件限定的网络出口规则很严格 {#4-binary-scoped-egress-is-strict}

网络策略中的 `binaries` 字段表示，只有指定的可执行文件可以访问该端点。如果更新 OpenClaw 后二进制文件路径发生变化，网络出口规则会静默失效。升级后请检查二进制文件路径。

## 权衡：沙盒中的外部 API 与本地守护进程 {#tradeoffs-external-api-vs-local-daemon-in-a-sandbox}

| | **外部 API 模式** | **本地守护进程模式** |
|---|---|---|
| **设置** | 一条命令 | 需要进程启动权限 |
| **依赖项** | 仅需 HTTPS 网络出口 | `uvx`、Python、本地 PostgreSQL |
| **数据位置** | Hindsight Cloud | 沙盒本地 |
| **多沙盒共享** | 可从任何位置访问同一记忆库 | 仅限每个沙盒内部 |
| **沙盒兼容性** | 适配顺畅 | 与进程策略冲突 |

当你在沙盒中运行、希望多个实例共享记忆，或不想管理本地数据库时，**使用外部 API 模式**。

当数据必须保留在本机、网络出口被完全锁定，或你在沙盒之外且进程启动不受限制时，**使用本地守护进程模式**。

如需了解本地守护进程方案的背景，请参阅[每个 OpenClaw 用户都需要的记忆升级](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。

## 这种模式对沙盒智能体记忆的意义 {#what-this-pattern-means-for-sandboxed-agent-memory}

这种模式值得专门说明。沙盒中的智能体并不会因此无法使用持久记忆；它只是处在不同的信任边界中：

- **沙盒** 控制智能体可以*做什么*——访问文件系统、启动进程、调用网络。
- **记忆** 控制智能体*知道什么*——来自先前会话的事实、实体和上下文。

两者是彼此独立的问题，可以很好地协同工作。

将记忆放在外部服务中，并明确配置网络策略，就能同时做到两点：限制智能体可以影响的范围，同时让它在不同会话间积累持久知识。策略文件会清楚记录智能体的每一项外部依赖。这种透明度很有用。

`dynamicBankId` 还有一个有意思的特性：

- **启用**（`true`）：每个用户都有独立的记忆库。一个用户各个会话中的记忆不会泄漏到另一个用户那里。适用于多租户部署。
- **禁用**（`false`）：所有会话的上下文都会累积到同一个共享记忆库中。适用于个人编码助手这类单用户沙盒。

> **想跳过自托管？** 本演练使用的是 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，无需 Docker，也无需基础设施。注册并获取 API 密钥，然后运行 `npx @vectorize-io/hindsight-nemoclaw setup`。

## 回顾 {#recap}

为沙盒中的 AI 智能体添加持久记忆只需一条命令：`npx @vectorize-io/hindsight-nemoclaw setup`。它会安装插件、应用网络出口规则并配置外部 API 模式，完成沙盒访问 Hindsight 所需的一切设置。

关键在于，沙盒隔离与持久记忆是彼此独立的问题。沙盒控制智能体可以影响什么，记忆控制智能体知道什么。一条网络策略规则就能连接两者，同时不损害任何一方。

## 后续步骤 {#next-steps}

- **运行设置命令**：执行 `npx @vectorize-io/hindsight-nemoclaw setup --help` 开始使用。
- **尝试按用户划分记忆库**：启用 `dynamicBankId: true`，在多租户部署中为每位用户提供独立记忆。
- **深入了解 OpenClaw 插件**：参阅[每个 OpenClaw 用户都需要的记忆升级](/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)，了解插件如何接入网关生命周期事件。
- **将其他智能体连接到同一记忆**：Hindsight 也适用于 [Hermes Agent](/blog/2026/03/17/hermes-agent-memory)、[Streamlit 聊天机器人](/blog/python-chatbot-memory-streamlit)和[任意 MCP 客户端](/blog/2026/03/04/mcp-agent-memory)。
- **查看文档**：[docs.hindsight.vectorize.io](/developer/api/recall) 提供完整的 API 参考和 SDK 指南。

---

**资源：**
- [npm 上的 hindsight-nemoclaw](https://www.npmjs.com/package/@vectorize-io/hindsight-nemoclaw)
- [npm 上的 hindsight-openclaw](https://www.npmjs.com/package/@vectorize-io/hindsight-openclaw)
- [OpenClaw 插件文档](https://vectorize.io/hindsight/sdks/integrations/openclaw)
- [Hindsight Cloud](https://ui.hindsight.vectorize.io)
