---
sidebar_position: 5
title: "使用 Hindsight 为 NemoClaw 添加持久记忆 | 集成指南"
description: "使用 Hindsight 为 NemoClaw 沙盒智能体添加持久记忆。只需一条命令，即可为任意 NemoClaw 沙盒自动提取记忆并自动召回，无需修改代码。"
---

# NemoClaw {#nemoclaw}

使用 [Hindsight](https://hindsight.vectorize.io) 为 [NemoClaw](https://nemoclaw.ai) 沙盒智能体提供持久记忆。

NemoClaw 在 OpenShell 沙盒中运行 [OpenClaw](https://openclaw.ai)，并通过策略控制文件系统、进程和网络出口。`hindsight-nemoclaw` 软件包可通过一条命令自动为沙盒添加 Hindsight 记忆，无需修改代码。

[查看更新日志 →](/changelog/integrations/nemoclaw)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)，立即获取 API 密钥，无需自行运行基础设施。
:::

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

运行后会看到类似以下输出：

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

## 工作原理 {#how-it-works}

### 沙盒面临的问题 {#the-sandbox-problem}

OpenShell 会严格限制网络出口：每个出站端点都必须在沙盒策略中明确获准。默认情况下，Hindsight API（`api.hindsight.vectorize.io`）不在允许列表中。

`hindsight-openclaw` 插件支持**外部 API 模式**，在此模式下会完全跳过本地守护进程，直接通过 HTTPS 调用 Hindsight Cloud。这很适合沙盒环境：插件只充当轻量的 HTTP 客户端，沙盒只需增加一条网络出口规则。

### 设置命令会执行什么 {#what-the-setup-command-does}

1. **预检** — 验证是否已安装 `openshell` 和 `openclaw`
2. **安装插件** — 运行 `openclaw plugins install @vectorize-io/hindsight-openclaw`
3. **配置插件** — 将外部 API 模式的配置写入 `~/.openclaw/openclaw.json`
4. **应用策略** — 读取当前沙盒策略，合并 Hindsight 网络出口配置块，然后通过 `openshell policy set` 重新应用
5. **重启网关** — 运行 `openclaw gateway restart`

### 记忆流转 {#memory-flow}

设置完成后，`hindsight-openclaw` 插件会接入 OpenClaw 网关的生命周期：

- **`before_agent_start`** — 从以往会话中召回相关记忆，并将其注入上下文
- **`agent_end`** — 将对话存入 Hindsight 记忆库

沙盒不会干扰这两个步骤：它会将 Hindsight 调用视为发往获准端点的常规 HTTPS 出站流量。

## CLI 参考 {#cli-reference}

```
hindsight-nemoclaw setup [options]

选项：
  --sandbox <name>       NemoClaw 沙盒名称（必填）
  --api-token <token>    Hindsight API 令牌（必填）
  --api-url <url>        Hindsight API URL（默认值：https://api.hindsight.vectorize.io）
  --bank-prefix <prefix> 记忆库名称前缀（默认值："nemoclaw"）
  --skip-policy          跳过沙盒网络策略更新
  --skip-plugin-install  跳过 OpenClaw 插件安装
  --dry-run              预览更改，但不应用
  --help                 显示帮助
```

使用 `--dry-run` 可在应用任何更改前预览全部更改。如果您手动管理沙盒策略，请使用 `--skip-policy`。

## 手动设置 {#manual-setup}

如果您希望自行执行这些步骤，而不使用 CLI：

### 1. 安装插件 {#1-install-the-plugin}

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 2. 配置 `~/.openclaw/openclaw.json` {#2-configure-openclawopenclawjson}

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

`llmProvider: "claude-code"` 会使用沙盒中已有的 Claude Code 进程，因此无需额外的 API 密钥。

### 3. 添加 Hindsight 网络策略 {#3-add-the-hindsight-network-policy}

`openshell policy set` 会替换整个策略文档。请先导出当前策略，再添加 Hindsight 配置块，然后重新应用：

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

## 配置选项 {#configuration-options}

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `hindsightApiUrl` | string | — | Hindsight API 基础 URL |
| `hindsightApiToken` | string | — | 用于身份验证的 API 令牌 |
| `llmProvider` | string | 自动检测 | 用于记忆提取的 LLM 提供方 |
| `dynamicBankId` | boolean | `false` | `true` 表示按用户隔离记忆，`false` 表示在不同会话间共享记忆 |
| `bankIdPrefix` | string | `"nemoclaw"` | 记忆库名称的前缀 |

### 记忆库命名 {#bank-naming}

当 `dynamicBankId: false` 时，所有会话都会写入同一个名称为 `{bankIdPrefix}-openclaw` 的记忆库。当 `dynamicBankId: true` 时，每个用户都会获得独立的记忆库，适用于多租户部署。

## 验证是否正常运行 {#verifying-it-works}

设置完成后，检查网关日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

启动时应该会看到：

```
[Hindsight] Plugin loaded successfully
[Hindsight] ✓ Using external API: https://api.hindsight.vectorize.io
[Hindsight] External API health: {"status":"healthy","database":"connected"}
[Hindsight] Default bank: my-sandbox-openclaw
[Hindsight] ✓ Ready (external API mode)
```

完成一次对话后：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] agent_end triggered - bank: my-sandbox-openclaw
[Hindsight] Retained 6 messages to bank my-sandbox-openclaw for session agent:main:...
```

## 常见问题 {#pitfalls}

### 策略替换会覆盖整个文档 {#policy-replacement-is-full-document}

`openshell policy set` 会替换整个策略文档。`hindsight-nemoclaw setup` 命令会自动处理这一过程。如果您手动应用策略，请先导出当前策略，以免丢失现有规则。

### macOS 上的 LaunchAgent 无法跟随符号链接 {#launchagent-cant-follow-symlinks-on-macos}

在 macOS 上，OpenClaw 网关以 LaunchAgent 身份在受限的安全上下文中运行。`openclaw plugins install --link` 会创建符号链接，但 LaunchAgent 无法跟随该链接，因此设置命令会以复制方式安装。如果网关日志中出现 `EPERM: operation not permitted, scandir`，原因就在于此。

### 记忆提取在后台异步进行 {#memory-retention-is-asynchronous}

调用 `retain` 后，事实提取和实体消解会在后台进行。如果关闭一个会话后立即开启新会话，最近的记忆可能尚未编入索引，通常需要几秒钟。

### 将网络出口规则限定到二进制文件 {#binary-scoped-egress}

网络策略中的 `binaries` 字段会将网络出口规则限制到特定的可执行文件路径。如果 OpenClaw 更新后可执行文件路径发生变化，该规则会在不发出提示的情况下停止生效。升级后请检查二进制文件路径。

## 故障排查 {#troubleshooting}

### 插件未加载 {#plugin-not-loading}

```bash
openclaw plugins list | grep hindsight
# 应显示：✓ enabled │ Hindsight Memory │ ...

# 重新安装
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 网络出口受阻 {#egress-blocked}

如果对 `api.hindsight.vectorize.io` 的调用被阻止，请检查当前生效的沙盒策略：

```bash
openshell sandbox get my-assistant
```

确认其中包含 `hindsight` 配置块，并且 `binaries` 路径与您的 OpenClaw 二进制文件路径一致：

```bash
which openclaw
```

### 外部 API 无法连接 {#external-api-not-connecting}

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

# 如果看到的是守护进程启动消息，而不是“Using external API”，
# 说明插件配置未被读取，请检查 ~/.openclaw/openclaw.json
```
