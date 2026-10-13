---
sidebar_position: 95
---

# 记忆防护 {#memory-defense}

Hindsight 使用包含 45 种模式的正则表达式集合，清除记忆存储内容中的机密信息和个人身份信息（PII）。内容进入记忆单元或文档正文之前，每个匹配项都会被替换为 `[REDACTED:type]` 标记。该功能按记忆库配置，默认禁用。

## 工作原理 {#how-it-works}

记忆防护需要按记忆库显式启用。扩展始终存在，但只有为记忆库设置启用策略后才会生效。设置策略后，智能体写入该记忆库的每条记忆都会在存储前接受扫描。扫描器识别到凭据、API 密钥、数据库连接字符串或已知 PII 格式时，会将匹配的子字符串替换为 `[REDACTED:github_token]` 之类的脱敏标记。

实际存储的是清除敏感信息后的版本。记忆单元和文档正文持久化脱敏文本，因此之后的记忆召回回答、导出和反思操作都不会接触原始机密信息。

策略仅影响设置该策略的记忆库之后收到的记忆存储调用。添加或修改策略不会追溯扫描现有记忆。

## 配置记忆防护 {#configuring-memory-defense}

通过记忆库的 `memory_defense` 配置字段逐库设置记忆防护。可以在创建记忆库时设置策略，也可以之后通过 `PATCH /v1/{tenant}/banks/{bank_id}/config` 更新。

开源版本实现了 `sensitive_data` 规则，支持两种操作：

- **`redact`** — 将每个匹配的机密信息替换为 `[REDACTED:type]` 标记，存储脱敏后的记忆。
- **`block`** — 丢弃包含匹配项的条目。如果记忆存储请求中的所有条目均被拦截，调用返回 `422`。

最小策略示例：

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

记忆库应用该策略后，每次记忆存储都会使用下文列出的 45 种脱敏模式进行筛查。

:::note 不会追溯扫描现有记忆
为记忆库启用记忆防护仅影响后续记忆存储调用。添加或修改策略不会重新扫描或修改库中已有的记忆。如果需要清理已包含未脱敏内容的记忆库，必须重新导入受影响的记忆，或手动移除。
:::

### 默认禁用 {#disabled-by-default}

所有记忆库在设置策略前都不启用记忆防护。没有 `memory_defense` 字段、设置 `enabled: false` 或没有 `sensitive_data` 规则的记忆库，处理方式相同：扩展返回 ALLOW，内容原样通过。要停止已启用记忆库的脱敏，请设置 `enabled: false` 或删除策略。

## 通知 {#notifications}

条目被脱敏或拦截时，如果记忆库上的 webhook 订阅了该事件类型，Hindsight 会触发 [`memory_defense.triggered` webhook](../api/webhooks.mdx#memory_defensetriggered)。载荷报告执行的操作、文档 ID 和匹配的脱敏模式，可用于将安全警报发送至 SIEM 或 Slack。未包含敏感信息的条目不会触发事件。

启用审计日志时，相同的脱敏/拦截决定也会作为 `memory_defense` 条目写入[审计日志](../configuration.mdx#audit-logging)，操作及匹配模式标签存储在条目元数据中。

## 覆盖的模式 {#patterns-covered}

随附的 45 种模式覆盖以下类别。

### AI 和 LLM 提供方 {#ai-and-llm-providers}

| 标签 | 匹配内容 |
|---|---|
| `anthropic_key` | `sk-ant-...` |
| `openai_key`, `openai_project_key`, `openai_admin_key` | `sk-...`, `sk-proj-...`, `sk-admin-...` |
| `google_api_key` | `AIza...` （39 个字符） |
| `google_oauth_token` | `ya29.<token>` |
| `xai_key` | `xai-...` |
| `groq_key` | `gsk_...` |
| `huggingface_token` | `hf_...` |
| `replicate_token` | `r8_...` |
| `perplexity_key` | `pplx-...` |
| `databricks_token` | `dapi<hex32>` |

### 云服务提供方 {#cloud-providers}

| 标签 | 匹配内容 |
|---|---|
| `aws_access_key` | `AKIA<16>` |
| `aws_session_token` | `ASIA<16>` |
| `digitalocean_token` | `dop_v1_<hex64>` |

### 源代码管理和 CI {#source-control-and-ci}

| 标签 | 匹配内容 |
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

| 标签 | 匹配内容 |
|---|---|
| `stripe_secret` | `sk_live_...`, `sk_test_...` |
| `stripe_restricted` | `rk_live_...`, `rk_test_...` |
| `square_token` | `sq0...` |
| `braintree_token` | `access_token$production$...` |

### 通信和电子邮件 {#communications-and-email}

| 标签 | 匹配内容 |
|---|---|
| `slack_token` | `xoxb-`, `xoxp-`, `xoxa-`, `xoxr-` |
| `slack_webhook` | `https://hooks.slack.com/services/...` |
| `twilio_api_key` | `SK<hex32>` |
| `twilio_account_sid` | `AC<hex32>` |
| `sendgrid_key` | `SG.<22>.<43>` |
| `mailgun_key` | `key-<32>` |
| `discord_bot` | `<MNO><23>.<6>.<27>` |
| `telegram_bot` | `<8-10 digits>:<35>` |

### 商业平台 {#commerce}

| 标签 | 匹配内容 |
|---|---|
| `shopify_token` | `shpat_<hex32>` |

### 数据库连接字符串 {#database-connection-strings}

| 标签 | 匹配内容 |
|---|---|
| `db_url_postgres` | `postgres://user:pass@host` 或 `postgresql://...` |
| `db_url_mysql` | `mysql://user:pass@host` |
| `db_url_mongodb` | `mongodb://user:pass@host` 或 `mongodb+srv://...` |

### 私钥、JWT 和通用凭据 {#private-keys-jwts-and-generic-credentials}

| 标签 | 匹配内容 |
|---|---|
| `private_key_pem` | `-----BEGIN ... PRIVATE KEY-----` PEM 块 |
| `jwt` | `eyJ<header>.eyJ<payload>.<signature>` |

### PII（美国默认格式） {#pii-us-defaults}

| 标签 | 匹配内容 |
|---|---|
| `credit_card` | 13 至 19 位数字，带常见分隔符 |
| `ssn_us` | `123-45-6789` 格式 |
