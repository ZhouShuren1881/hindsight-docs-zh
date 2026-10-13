---
sidebar_position: 5
title: "NemoClaw 持久记忆Hindsight |集成指南"
description: "使用Hindsight将持久记忆添加到NemoClaw沙盒智能体。一个命令可将自动记忆提取和自动记忆识别添加到任何 NemoClaw 沙箱中 — 无需更改代码。"
---

# NemoClaw {#nemoclaw}

持久记忆[NemoClaw](https://nemoclaw.ai) 沙盒智能体使用 [Hindsight](https://hindsight.vectorize.io)。

NemoClaw运行 [OpenClaw](https://openclaw.ai) 位于 OpenShell 沙箱内，具有受控的文件系统、进程和网络出口策略。 `hindsight-nemoclaw` 包自动添加Hindsight用一个命令记忆沙箱——无需更改代码。

[查看更新日志 →](/changelog/integrations/nemoclaw)

## 快速入门 {#quick-start}

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 得到一个API立即密钥，无需运行基础设施。
:::

```bash
npx @vectorize-io/hindsight-nemoclaw setup \
  --sandbox my-assistant \
  --api-token <your-api-key> \
  --bank-prefix my-sandbox
```

您将看到如下输出：

```
[0] 正在执行预检……
  ✓ 已找到 openshell
  ✓ 已找到 openclaw

[1] 正在安装 @vectorize-io/hindsight-openclaw 插件……
  ✓ 插件已安装

[2] 正在配置 ~/.openclaw/openclaw.json 中的插件……
  ✓ 已写入插件配置（记忆库：my-sandbox-openclaw）

[3] 正在为沙箱 "my-assistant" 应用 Hindsight 网络策略……
  ✓ 已提交策略版本 2
  ✓ 已加载策略版本 2（当前版本：2）

[4] 正在重启 OpenClaw 网关……
  ✓ 网关已重启

✓ 设置完成！
```

## 工作原理 {#how-it-works}

### 沙箱问题 {#the-sandbox-problem}

OpenShell 强制执行严格的网络出口 — 每个出站端点都必须在沙箱策略中明确允许。默认情况下，HindsightAPI(`api.hindsight.vectorize.io`) 不在该列表中。

`hindsight-openclaw`插件支持**外部 API 模式**，它完全跳过本地守护进程并直接进行 HTTPS 调用Hindsight Cloud。这非常适合沙盒环境：插件成为一个瘦 HTTP 客户端，唯一需要的沙盒更改是一个出口规则。

### 设置命令的作用 {#what-the-setup-command-does}

1. **预检** — 验证`openshell` 和 `openclaw`已安装
2. **安装插件** — 运行 `openclaw plugins install @vectorize-io/hindsight-openclaw`
3. **配置插件** — 写入外部API模式配置为`~/.openclaw/openclaw.json`
4. **应用策略（Apply policy）** — 读取当前沙箱策略，合并Hindsight出口阻塞，并通过重新申请 `openshell policy set`
5. **重启网关** — 运行 `openclaw gateway restart`

### 记忆流 {#memory-flow}

设置后，`hindsight-openclaw` 插件挂钩到OpenClaw网关生命周期：

- **`before_agent_start`** — 回忆过去会话中的相关记忆并将其注入上下文中
- **`agent_end`** — 将对话保留到Hindsight记忆库

沙箱不会干扰任何一个步骤 - 它将 Hindsight 调用视为到允许端点的正常 HTTPS 出口。

## CLI 参考 {#cli-reference}

```
hindsight-nemoclaw setup [options]

Options:
  --sandbox <name>       NemoClaw 沙箱名称（必填）
  --api-token <token>    Hindsight API 令牌（必填）
  --api-url <url>        Hindsight API URL（默认：https://api.hindsight.vectorize.io）
  --bank-prefix <prefix> 记忆库前缀（默认："nemoclaw"）
  --skip-policy          跳过沙箱网络策略更新
  --skip-plugin-install  跳过 openclaw 插件安装
  --dry-run              预览更改，不应用
  --help                 显示帮助
```

使用`--dry-run` 在应用任何内容之前预览所有更改。使用`--skip-policy` 如果您手动管理沙箱策略。

## 手动设置 {#manual-setup}

如果您更喜欢自己应用这些步骤而不是使用 CLI：

### 1。安装插件 {#1-install-the-plugin}

```bash
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 2。配置`~/.openclaw/openclaw.json` {#2-configure-openclawopenclawjson}

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

`llmProvider: "claude-code"` 使用Claude Code进程已存在于沙箱中 - 无需额外  需要API钥匙。

### 3。添加Hindsight网络策略 {#3-add-the-hindsight-network-policy}

`openshell policy set` 取代整个保单文件。首先导出您当前的策略，添加Hindsight块，然后重新应用：

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

|选项|类型|默认|说明|
|---|---|---|---|
|`hindsightApiUrl`|string|—|Hindsight API 基本 URL|
|`hindsightApiToken`|string|—|API 用于身份验证的令牌|
|`llmProvider`|string|自动检测|LLM 记忆提取提供者|
|`dynamicBankId`|boolean|`false`|隔离每个用户的记忆 (`true`) 或跨会话分享 (`false`)|
|`bankIdPrefix`|string|`"nemoclaw"`|记忆库名称的前缀|

### 记忆库命名 {#bank-naming}

当`dynamicBankId: false`，所有会话都写入一个名为 的记忆库 `{bankIdPrefix}-openclaw`。当`dynamicBankId: true`，每个用户都会获得一个独立的记忆库——对于多租户部署很有用。

## 验证它是否有效 {#verifying-it-works}

设置完成后，检查网关日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight
```

启动时您应该看到：

```
[Hindsight] 插件加载成功
[Hindsight] ✓ 使用外部 API： https://api.hindsight.vectorize.io
[Hindsight] 外部 API 健康状态： {"status":"healthy","database":"connected"}
[Hindsight] 默认记忆库： my-sandbox-openclaw
[Hindsight] ✓ 已就绪（外部 API 模式）
```

对话后：

```
[Hindsight] before_agent_start - bank: my-sandbox-openclaw, channel: undefined/webchat
[Hindsight Hook] 已触发 agent_end，记忆库： my-sandbox-openclaw
[Hindsight] 已将会话 agent:main:... 的 6 条消息存入记忆库 my-sandbox-openclaw
```

## 陷阱 {#pitfalls}

### 保单更换是完整文件 {#policy-replacement-is-full-document}

`openshell policy set` 取代整个保单文件。 `hindsight-nemoclaw setup` 命令会自动处理此问题。如果您手动应用，请先导出当前策略，以免现有规则丢失。

### LaunchAgent 无法跟踪 macOS 上的符号链接 {#launchagent-cant-follow-symlinks-on-macos}

开macOS，OpenClaw网关在受限安全上下文下作为 LaunchAgent 运行。 `openclaw plugins install --link` 创建 LaunchAgent 无法遵循的符号链接 — 安装命令将安装为副本。如果你看到网关日志中的 `EPERM: operation not permitted, scandir`，就是这个原因。

### 记忆保留是异步的 {#memory-retention-is-asynchronous}

事实提取和实体解析在之后在后台发生 `retain`。如果您在关闭会话后立即打开一个新会话，则最近的记忆可能尚未建立索引 - 通常需要几秒钟。

### 按二进制程序限定出站访问 {#binary-scoped-egress}

`binaries`字段将出口规则限制为特定的可执行路径。如果OpenClaw更新并且二进制路径发生变化，规则默默地停止工作。升级后检查您的二进制路径。

## 故障排查 {#troubleshooting}

### 插件未加载 {#plugin-not-loading}

```bash
openclaw plugins list | grep hindsight
#应显示：✓ 已启用 │ Hindsight 记忆 │ ...

# Reinstall
openclaw plugins install @vectorize-io/hindsight-openclaw
```

### 出口受阻 {#egress-blocked}

如果致电`api.hindsight.vectorize.io` 被阻止，检查活动沙箱策略：

```bash
openshell sandbox get my-assistant
```

验证`hindsight` 块存在并且 `binaries` 路径与您匹配OpenClaw二进制：

```bash
which openclaw
```

### 外部API未连接 {#external-api-not-connecting}

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep Hindsight

#如果您看到守护程序启动消息而不是“使用外部API”，
# 插件配置未被读取，请检查 ~/.openclaw/openclaw.json
```
