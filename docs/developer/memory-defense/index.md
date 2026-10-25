---
sidebar_position: 95
---

# 记忆防护 {#memory-defense}

Hindsight 使用由 45 种模式组成的正则表达式集合，清除存入内容中的机密信息和个人身份信息（PII）。在内容进入记忆单元或文档正文之前，每处匹配内容都会被替换为 `[REDACTED:type]` 标记。该功能按记忆库配置，默认禁用。

## 工作原理 {#how-it-works}

记忆防护可按记忆库选择启用。该扩展始终存在，但在你为某个记忆库设置启用它的策略之前会保持休眠。设置策略后，智能体写入该记忆库的每条记忆都会在存入前接受扫描。扫描器识别出凭据、API 密钥、数据库连接字符串或已知 PII 格式时，会将匹配的子字符串替换为类似 `[REDACTED:github_token]` 的脱敏标记。

实际存储的是清除敏感内容后的版本。记忆单元和文档正文会持久保存脱敏后的文本，因此后续的召回响应、导出内容和反思操作都不会看到原始机密信息。

策略只影响设置该策略的记忆库后续收到的存入请求。添加或修改策略时，不会追溯扫描现有记忆。

## 配置记忆防护 {#configuring-memory-defense}

记忆防护通过记忆库的 `memory_defense` 配置字段按库设置。你可以在创建记忆库时设置策略，也可以稍后通过 `PATCH /v1/{tenant}/banks/{bank_id}/config` 更新。

开源版本实现了 `sensitive_data` 规则，并支持以下两种操作：

- **`redact`** — 将每处匹配到的机密信息替换为 `[REDACTED:type]` 标记，并存储脱敏后的记忆。
- **`block`** — 丢弃包含匹配内容的输入项。如果一次存入请求中的所有输入项都被阻止，调用将返回 `422`。

最简策略示例：

```json
{
  "memory_defense": {
    "enabled": true,
    "rules": [
      { "on": "sensitive_data", "action": "redact" }
    ]
  }
}
```

将该策略应用于记忆库后，发往该库的每次存入请求都会按下文记录的 45 种脱敏模式进行筛查。

:::note 不会追溯扫描现有记忆
在记忆库中启用记忆防护只会影响后续的存入请求。添加或修改策略时，不会重新扫描或修改库中已有的记忆。如果需要清理已包含未脱敏内容的记忆库，必须重新摄取受影响的记忆，或手动将其移除。
:::

### 默认禁用 {#disabled-by-default}

除非设置策略，否则所有记忆库中的记忆防护均处于关闭状态。以下情况的记忆库处理方式相同：没有 `memory_defense` 字段、`enabled: false`，或没有 `sensitive_data` 规则。扩展会返回 ALLOW，内容原样通过。若要停止在已启用该功能的记忆库中进行脱敏，请将 `enabled` 设为 `false` 或移除策略。

## 通知 {#notifications}

输入项被脱敏或阻止时，如果记忆库上的 webhook 已订阅该事件类型，Hindsight 就会触发 [`memory_defense.triggered` webhook](../api/webhooks.mdx#memory_defensetriggered)。载荷会报告所执行的操作、文档 ID 以及匹配到的脱敏模式，可用于将安全警报转发到 SIEM 或 Slack。内容未命中模式的输入项不会触发事件。

同样的 `redact` / `block` 判定也会作为 `memory_defense` 条目记录到[审计日志](../configuration.mdx#audit-logging)中（前提是已启用审计日志），条目元数据会包含所执行的操作和匹配模式标签。

## 覆盖的模式 {#patterns-covered}

捆绑提供的 45 种模式覆盖以下类别。

### AI 和 LLM 服务提供方 {#ai-and-llm-providers}

| 标签 | 可检测的格式 |
|---|---|
| `anthropic_key` | `sk-ant-...` |
| `openai_key`、`openai_project_key`、`openai_admin_key` | `sk-...`、`sk-proj-...`、`sk-admin-...` |
| `google_api_key` | `AIza...`（39 个字符） |
| `google_oauth_token` | `ya29.<token>` |
| `xai_key` | `xai-...` |
| `groq_key` | `gsk_...` |
| `huggingface_token` | `hf_...` |
| `replicate_token` | `r8_...` |
| `perplexity_key` | `pplx-...` |
| `databricks_token` | `dapi<hex32>` |

### 云服务提供方 {#cloud-providers}

| 标签 | 可检测的格式 |
|---|---|
| `aws_access_key` | `AKIA<16>` |
| `aws_session_token` | `ASIA<16>` |
| `digitalocean_token` | `dop_v1_<hex64>` |

### 源代码管理和 CI {#source-control-and-ci}

| 标签 | 可检测的格式 |
|---|---|
| `github_fg_pat` | `github_pat_...` |
| `github_token` | `ghp_<36>` |
| `github_app_token` | `ghs_<36>` |
| `github_user_token` | `ghu_<36>` |
| `github_refresh` | `ghr_<36>` |
| `github_oauth` | `gho_<36>` |
| `gitlab_pat` | `glpat-...` |
| `npm_token` | `npm_...` |
| `pypi_token` | `pypi-AgEIcHlwaS5vcmc...` |

### 支付处理服务 {#payment-processors}

| 标签 | 可检测的格式 |
|---|---|
| `stripe_secret` | `sk_live_...`、`sk_test_...` |
| `stripe_restricted` | `rk_live_...`、`rk_test_...` |
| `square_token` | `sq0...` |
| `braintree_token` | `access_token$production$...` |

### 通信和电子邮件 {#communications-and-email}

| 标签 | 可检测的格式 |
|---|---|
| `slack_token` | `xoxb-`、`xoxp-`、`xoxa-`、`xoxr-` |
| `slack_webhook` | `https://hooks.slack.com/services/...` |
| `twilio_api_key` | `SK<hex32>` |
| `twilio_account_sid` | `AC<hex32>` |
| `sendgrid_key` | `SG.<22>.<43>` |
| `mailgun_key` | `key-<32>` |
| `discord_bot` | `<MNO><23>.<6>.<27>` |
| `telegram_bot` | `<8-10 digits>:<35>` |

### 商业平台 {#commerce}

| 标签 | 可检测的格式 |
|---|---|
| `shopify_token` | `shpat_<hex32>` |

### 数据库连接字符串 {#database-connection-strings}

| 标签 | 可检测的格式 |
|---|---|
| `db_url_postgres` | `postgres://user:pass@host` 或 `postgresql://...` |
| `db_url_mysql` | `mysql://user:pass@host` |
| `db_url_mongodb` | `mongodb://user:pass@host` 或 `mongodb+srv://...` |

### 私钥、JWT 和通用凭据 {#private-keys-jwts-and-generic-credentials}

| 标签 | 可检测的格式 |
|---|---|
| `private_key_pem` | `-----BEGIN ... PRIVATE KEY-----` PEM 块 |
| `jwt` | `eyJ<header>.eyJ<payload>.<signature>` |

### PII（美国默认格式） {#pii-us-defaults}

| 标签 | 可检测的格式 |
|---|---|
| `credit_card` | 13 至 19 位数字，带常见分隔符 |
| `ssn_us` | `123-45-6789` 格式 |