---
sidebar_position: 11
title: "Paperclip 与 Hindsight 持久记忆 | 集成指南"
description: "通过 Hindsight 为所有 Paperclip 智能体添加长期记忆。只需安装一次插件，每个智能体就会在运行前自动召回记忆，并在运行后存入记忆。"
---

# Paperclip {#paperclip}

借助 [Hindsight](/)，为 [Paperclip AI](https://github.com/paperclipai/paperclip) 智能体提供持久记忆。

只需安装一次 `@vectorize-io/hindsight-paperclip` 插件。Paperclip 实例中的每个智能体都会自动获得长期记忆，并在不同运行、公司和重启之间持续保留，无需更改代码。

[查看更新日志 →](/changelog/integrations/paperclip)

## 安装 {#installation}

```bash
pnpm paperclipai plugin install @vectorize-io/hindsight-paperclip
```

然后前往 **Settings → Plugins → Hindsight Memory（设置 → 插件 → Hindsight Memory）** 进行配置。

## 前置条件 {#prerequisites}

需要 Paperclip **2026.720.0 或更高版本**。如果要从较旧的插件版本升级，请打开插件设置并重新选定保存 API 密钥的 Paperclip 密钥项：旧版本保存的是密钥名称，而 Paperclip 现在只接受通过密钥选择器选定的引用。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io)，无需运行任何基础设施。可直接跳到下方的“配置”部分。
:::

**自托管方案**——在本地运行 Hindsight：

```bash
pip install hindsight-all
export HINDSIGHT_API_LLM_API_KEY=your-openai-key
hindsight-api
```

## 工作原理 {#how-it-works}

```
agent.run.started
  └─ 通过 ctx.issues.get 获取事项
       └─ recall(issueTitle + description) → 缓存到本次运行的插件状态中

智能体运行中……
  ├─ hindsight_recall(query) → 如果查询与运行开始时的查询相同，则使用缓存上下文；否则实时召回
  └─ hindsight_retain(content) → 立即存入记忆

issue.comment.created
  └─ 通过 ctx.issues.listComments 获取完整评论正文并存入记忆
       └─ 记忆库归属：有评论作者时使用该智能体；否则使用事项负责人

agent.run.finished
  └─ 不执行操作（保留此订阅，以便未来在载荷包含输出时使用）
```

随插件提供的清单声明了新 SDK 调用所需的 `issues.read` 和 `issue.comments.read` 权限，因此 Paperclip 可能会在首次安装或升级时提示授予这些权限。

记忆以 `companyId` 和 `agentId` 为键，绝不会以运行 ID 为键，因此会在每次运行之间累积。

## 配置 {#configuration}

| 字段 | 默认值 | 说明 |
|-------|---------|-------------|
| `hindsightApiUrl` | `https://api.hindsight.vectorize.io` | Hindsight 服务器 URL（Cloud 默认值；自托管时使用 `http://localhost:8888`） |
| `hindsightApiKeyRef` | — | 保存 Hindsight Cloud API 密钥的 Paperclip 密钥项，通过密钥选择器选定。自托管时留空 |
| `dynamicBankId` | `true` | 为 `true` 时，根据 `bankGranularity` 推导记忆库 ID。设为 `false` 并提供 `bankId`，即可让所有智能体共享一个静态记忆库 |
| `bankId` | — | `dynamicBankId` 为 `false` 时使用的静态记忆库 ID。所有使用此值的智能体都会读写同一个记忆库 |
| `bankGranularity` | `["company", "agent"]` | `dynamicBankId` 为 `true` 时的记忆隔离粒度：按公司和智能体、按公司或按智能体隔离。添加 `"user"` 可按用户隔离记忆（有助于满足 GDPR 要求） |
| `recallBudget` | `mid` | `low` = 速度最快，`mid` = 平衡，`high` = 最全面 |
| `requestTimeoutMs` | `15000` | Hindsight 每个请求的超时时间。对于召回较长事项描述时速度较慢的自托管实例，可以调高此值 |
| `autoRetain` | `true` | 每次运行后自动存入该次运行的输出 |

## 记忆库 ID 格式 {#bank-id-format}

```
paperclip::{companyId}::{agentId}                  ← 默认（公司 + 智能体粒度）
paperclip::{companyId}                             ← 公司粒度（智能体之间共享）
paperclip::{agentId}                               ← 智能体粒度（智能体的记忆跨公司共享）
paperclip::{companyId}::{agentId}::user::{userId}  ← 用户粒度（按用户隔离，便于满足 GDPR 要求）
{bankId}                                           ← 静态共享记忆库（dynamicBankId = false）
```

## 智能体工具 {#agent-tools}

智能体可以在运行期间直接调用以下工具：

**`hindsight_recall(query)`** — 在记忆中搜索相关上下文。运行开始时会自动调用；智能体也可以在运行中途调用它进行有针对性的查询。只有当智能体提出相同查询时，才会复用运行开始时的结果；其他查询都会触发实时召回。

**`hindsight_retain(content)`** — 立即存入一条事实或决策，无需等到运行结束。

## 适配器兼容性 {#adapter-compatibility}

借助事件系统，可与所有 Paperclip 适配器类型配合使用：

| 适配器 | 支持 |
|---------|-----------|
| Claude | ✓ |
| Codex | ✓ |
| Cursor | ✓ |
| HTTP | ✓ |
| Process | ✓ |
