---
slug: sandboxed-agent-persistent-memory-nemoclaw
title: "通过一个命令为NemoClaw提供最佳智能体记忆"
description: "将持久记忆添加到NemoClaw沙盒AI智能体中，无需更改代码。一项命令，一项网络策略，记忆在会话中得以保存。"
authors: [hindsight]
date: 2026-03-19T12:00
image: /img/blog/2026-03-19/nemoclaw-memory.webp
hide_table_of_contents: true
tags: [tutorial]
---

![通过一个命令为NemoClaw提供最佳智能体记忆](/img/blog/2026-03-19/nemoclaw-memory.webp)

## 概览 {#tldr}

- [NemoClaw](https://nemoclaw.ai) 沙箱隔离 AI 智能体 — 受控文件系统、进程和网络。这种孤立使得持久记忆变得更加困难。
- 我们使用[Hindsight Cloud](https://ui.hindsight.vectorize.io)将`hindsight-openclaw`插件连接到实时NemoClaw沙箱。无需更改任何代码 — 一条命令。
- External API 模式是自然的选择：插件成为一个瘦 HTTP 客户端，沙箱只需要一个出口规则。
- ​​在一个会话中捕获的记忆将在下一个会话中被调用。沙箱没有干扰。
- 该模式概括为：沙箱控制智能体可以做什么*do*，记忆控制它*知道*。他们的作曲干净利落。

## 问题：沙盒智能体没有持久记忆 {#the-problem-sandboxed-agents-have-no-persistent-memory}

AI 在沙箱内运行的智能体提出了一个有趣的记忆问题。沙箱旨在隔离智能体——它控制它可以读取哪些文件、它可以生成哪些进程以及它可以到达哪些网络端点。隔离就是重点。但它提出了一个问题：如果每个会话都在一个干净、受限的环境中开始，那么持久记忆存在于哪里？

我们着手通过 [NemoClaw](https://nemoclaw.ai) 来回答这个问题，[NemoClaw](https://nemoclaw.ai) 是 NVIDIA 基于 OpenShell 构建的沙盒智能体运行时。目标很简单：将 `hindsight-openclaw` 插件连接到实时 NemoClaw 沙箱，并验证在一个会话中捕获的记忆是否会在下一个会话中调用。不允许更改代码 - 如果我们需要修改插件以使其工作，我们就学到了有关架构的一些重要知识。

我们不需要改变线路。

<!-- truncate -->

## 方法：沙盒记忆的外部API模式 {#the-approach-external-api-mode-for-sandbox-memory}

[NemoClaw](https://nemoclaw.ai) 在 OpenShell 沙箱内运行 [OpenClaw](https://openclaw.ai)。沙箱强制执行文件系统策略（智能体可以读取和写入的路径）、进程策略（其运行方式）和网络出口策略（允许哪些出站端点）。

默认情况下，沙箱附带其所需服务的策略：LLM 提供者、GitHub、npm、OpenClaw API。其他一切都被阻止。这是一个很好的默认设置——可以调用任意端点的智能体更难信任。

[Hindsight](https://hindsight.vectorize.io) 作为外部API 运行。该插件对 `api.hindsight.vectorize.io` 到 [记忆存储和记忆召回](https://hindsight.vectorize.io/blog/2026/03/04/mcp-agent-memory) 进行 HTTPS 调用。从沙箱的角度来看，这只是另一个出站端点 - 需要明确允许的端点。

完整堆栈如下所示：

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

当插件保留对话时，Hindsight不仅仅存储原始文本。它提取结构化事实，解析实体，构建[知识图谱](https://hindsight.vectorize.io/blog/2026/03/12/spreading-activation-memory-graphs)，并为多策略检索的所有内容建立索引 - 语义搜索、BM25关键字匹配、图形遍历和使用[交叉编码器重排序](https://hindsight.vectorize.io/blog/2026/03/04/mcp-agent-memory)进行时间过滤。这就是记忆召回发挥作用的原因，即使智能体的问题与存储内容的确切措辞不匹配。

该插件有两种模式。在 **本地守护进程模式** 中，它生成本地 `hindsight-embed` 进程并通过本地端口与其通信。在**外部API模式**中，它完全跳过守护进程并直接向Hindsight Cloud端点进行HTTP调用。

在沙箱内，本地守护进程模式很尴尬。沙箱控制可以生成哪些进程，而启动 `uvx` 子进程的后台守护进程是我们不需要的摩擦。外部 API 模式非常适合：插件成为瘦 HTTP 客户端，唯一的基础设施要求是网络出口规则。

有关OpenClaw插件本身的背景——它如何挂钩网关生命周期、自动将记忆注入上下文以及防止反馈循环——请参阅[每个OpenClaw用户需求的记忆升级](https://hindsight.vectorize.io/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。

## 实现：一个命令 {#implementation-one-command}

`hindsight-nemoclaw` 包自动完成整个设置 — 安装插件、配置外部 API 模式、读取当前的沙箱策略、合并 Hindsight 出口规则以及重新启动网关：

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-url https://api.hindsight.vectorize.io \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

就是这样。你会看到类似的输出：

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

使用`--dry-run`在应用之前预览所有更改。如果您手动管理沙箱策略，请使用`--skip-policy`。

## 验证它是否有效 {#verifying-it-works}

设置后，网关日志确认插件正在运行：

```
[Hindsight] Plugin loaded successfully
[Hindsight] ✓ Using external API: https://api.hindsight.vectorize.io
[Hindsight] External API health: {"status":"healthy","database":"connected"}
[Hindsight] Default bank: my-sandbox-openclaw
[Hindsight] ✓ Ready (external API mode)
```

给智能体发送消息：

```bash
openclaw agent --agent main --session-id session-1 \
  -m "我叫 Ben，我在 Hindsight 工作。我更喜欢详细的提交消息。"
```

网关日志显示钩子触发：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] agent_end triggered - bank: my-sandbox-openclaw
[Hindsight] Retained 6 messages to bank my-sandbox-openclaw for session agent:main:...
```

打开一个新会话并询问智能体记住了什么：

```bash
openclaw agent --agent main --session-id session-2 \
  -m "你还记得我什么？"
```

```
Right now I've just got the basics: your name is Ben, you're working on
Hindsight, and you like commit messages to be detailed. If there's anything
else you want me to keep in mind, let me know.
```

记忆在会话边界中幸存下来。沙箱没有干扰它。

## 设置命令的作用（手动替代） {#what-the-setup-command-does-manual-alternative}

如果您更喜欢自己应用这些步骤，以下是 `hindsight-nemoclaw setup` 的幕后作用。

**安装插件：**

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

**配置`~/.openclaw/openclaw.json`：**

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

**将 Hindsight 块添加到您的沙箱网络策略中**（注：`openshell policy set` 替换完整文档 — 包括所有现有政策）：

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

## 陷阱和边缘情况 {#pitfalls--edge-cases}

### 1。保单更换是完整的文档 {#1-policy-replacement-is-full-document}

`openshell policy set` 替换整个保单文档，而不仅仅是您要添加的部分。 `hindsight-nemoclaw setup` 命令会自动处理此问题 - 它读取当前策略，合并 Hindsight 块，然后重新应用完整文档。如果您手动申请，请确保您的 YAML 包含所有现有网络策略。

### 2。 LaunchAgent 无法跟踪 macOS 上的符号链接 {#2-launchagent-cant-follow-symlinks-on-macos}

在 macOS 上，OpenClaw 网关作为具有受限安全上下文的 LaunchAgent 运行，无法访问 `~/Documents` 或其他用户目录。 `openclaw plugins install --link` 创建一个 LaunchAgent 无法遵循的符号链接 - 作为副本安装：

```bash
# 可用，会将文件复制到 ~/.openclaw/extensions/
openclaw plugins install @vectorize-io/hindsight-openclaw
```

如果您在网关日志中看到`EPERM: operation not permitted, scandir`，则说明正在发生这种情况。

### 3。 记忆保留是异步的 {#3-memory-retention-is-asynchronous}

当插件在会话结束时调用`retain`时，[事实提取和实体解析](https://hindsight.vectorize.io/blog/2026/03/12/spreading-activation-memory-graphs)会在Hindsight一侧的后台发生。如果您立即打开新会话，则最近的记忆可能尚未建立索引。实际上，这只是几秒钟——但如果您正在连续测试，则值得了解一下。

### 4。二进制范围的出口是严格的 {#4-binary-scoped-egress-is-strict}

网络策略中的 `binaries` 字段表示*只有*指定的可执行文件能访问端点。更新 OpenClaw 后，若二进制路径变化，出站规则会静默失效。升级后请检查二进制路径。

## 权衡：外部API与沙盒中的本地守护进程 {#tradeoffs-external-api-vs-local-daemon-in-a-sandbox}

||**外部API模式**|**本地守护进程模式**|
|---|---|---|
|**设置**|一个命令|进程生成权限|
|**依赖关系**|仅 HTTPS 出口|`uvx`、Python、本地 PostgreSQL|
|**数据位置**|Hindsight Cloud|本地沙盒|
|**多沙箱共享**|任何地方的相同记忆库|仅限每个沙盒|
|**沙箱兼容性**|干净贴合|反对流程政策|

**使用外部API模式** 当您位于沙箱中，想要跨实例共享记忆，或者不想管理本地数据库时。

**使用本地守护进程模式** 当数据必须保留在计算机上时，网络出口被完全锁定，或者您在进程生成不受限制的沙箱外运行。

有关本地守护进程方法的背景，请参阅[每个OpenClaw用户需求的记忆升级](https://hindsight.vectorize.io/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight)。

## 这种模式对于沙盒智能体记忆意味着什么 {#what-this-pattern-means-for-sandboxed-agent-memory}

这里的模式值得命名。沙盒智能体并不是对持久记忆的限制——它是一个不同的信任边界：

- **沙盒** 控制智能体可以执行的操作 *do* — 文件系统访问、进程生成、网络调用。
- **记忆** 控制智能体 *知道* 的内容 — 先前会话中的事实、实体、上下文。

这些都是正交关注点，而且它们的组合很干净。

通过将记忆保留在外部服务中并使网络策略明确，您可以获得两者：一种受其影响范围限制的智能体，以及一种跨会话构建持久知识的智能体。策略文件是智能体所具有的每个外部依赖项的可读记录。这种透明度很有用。

`dynamicBankId`还有一个有趣的性质：

- **已启用** (`true`)：每个用户都获得一个独立的记忆库。一个用户的会话记忆不能渗透到另一个用户的会话中。将此用于多租户部署。
- **禁用** (`false`)：共享记忆库积累所有会话的上下文。将其用于单用户沙箱，例如个人编码助理。

> **想要跳过自托管吗？** [Hindsight Cloud](https://ui.hindsight.vectorize.io) 是我们在本演练中使用的 — 没有 Docker，没有基础设施。注册，获取 API 密钥，然后运行 ​​`npx @vectorize-io/hindsight-nemoclaw setup`。

## 回顾 {#recap}

沙盒中的持久记忆AI智能体是一个命令：`npx @vectorize-io/hindsight-nemoclaw setup`。它安装插件，应用网络出口规则，并配置外部API模式——沙箱需要让Hindsight通过的一切。

关键见解：沙箱隔离和持久记忆是正交问题。沙箱控制智能体可以影响的内容； 记忆控制智能体所知道的内容。一个网络策略规则可以将它们桥接起来，而不会影响其中任何一个。

## 后续步骤 {#next-steps}

- **运行安装程序**：`npx @vectorize-io/hindsight-nemoclaw setup --help`开始。
- **尝试每个用户记忆库**：启用`dynamicBankId: true`，在多租户部署中为每个用户提供独立的记忆。
- **深入探索OpenClaw插件**：请参阅 [每个OpenClaw用户需求的记忆升级](https://hindsight.vectorize.io/blog/2026/03/06/adding-memory-to-openclaw-with-hindsight) 了解插件如何挂钩网关生命周期事件。
- **将其他智能体连接到同一个记忆**：Hindsight与[Hermes智能体](https://hindsight.vectorize.io/blog/2026/03/17/hermes-agent-memory)、[Streamlit 聊天机器人](/blog/python-chatbot-memory-streamlit)和[任何MCP客户端](https://hindsight.vectorize.io/blog/2026/03/04/mcp-agent-memory)配合使用。
- **查看文档**：完整的API参考和SDK指南位于[docs.hindsight.vectorize.io](/developer/retrieval)。

---

**资源：**
- [hindsight-nemoclaw npm 包](https://www.npmjs.com/package/@vectorize-io/hindsight-nemoclaw)
- [hindsight-openclaw npm 包](https://www.npmjs.com/package/@vectorize-io/hindsight-openclaw)
- [OpenClaw插件文档](https://vectorize.io/hindsight/sdks/integrations/openclaw)
- [Hindsight Cloud](https://ui.hindsight.vectorize.io)
