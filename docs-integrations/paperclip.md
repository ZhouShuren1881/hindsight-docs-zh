---
sidebar_position: 11
title: "Paperclip 持久记忆Hindsight |集成指南"
description: "通过Hindsight为所有Paperclip智能体添加长期记忆。作为插件安装一次 - 每个智能体在运行前都会自动进行记忆召回，在运行后会自动进行记忆存储。"
---

# Paperclip {#paperclip}

持久记忆[Paperclip AI](https://github.com/paperclipai/paperclip)智能体使用[Hindsight](https://hindsight.vectorize.io)。

安装`@vectorize-io/hindsight-paperclip`插件一次。你的每一个智能体Paperclip实例自动获得在运行、公司和重新启动时持续存在的长期记忆 - 无需更改代码。

[查看更新日志 →](/changelog/integrations/paperclip)

## 安装 {#installation}

```bash
pnpm paperclipai plugin install @vectorize-io/hindsight-paperclip
```

然后在中配置 **设置 → 插件 → Hindsight Memory（Settings → Plugins → Hindsight Memory）**。

## 前置条件 {#prerequisites}

需要Paperclip**2026.720.0 或更高版本**。从旧插件版本升级？打开插件设置并选择API再次密钥秘密：旧版本保存了秘密的名称，并且Paperclip现在仅接受使用秘密选择器选择的参考。

:::tip Hindsight Cloud（推荐）
[免费注册](https://ui.hindsight.vectorize.io) — 无需运行基础设施。直接跳到下面的配置。
:::

**自托管替代方案** — 运行Hindsight本地：

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
  ├─ hindsight_recall(query) → 查询与运行开始时一致则使用缓存上下文，否则实时召回
  └─ hindsight_retain(content) → 立即存储

issue.comment.created
  └─ retain(通过 ctx.issues.listComments 获取的完整评论正文)
       └─ 记忆库归属：优先使用评论作者智能体，否则使用事项负责人

agent.run.finished
  └─ 不执行操作（保留订阅，以便未来载荷包含输出时使用）
```

捆绑的插件清单声明了 `issues.read` 和 `issue.comments.read`新需求的能力SDK调用，所以Paperclip可能会在首次安装或升级时提示输入这些信息。

记忆的关键是`companyId`+`agentId` - 永远不会到运行 ID - 因此它会在每次运行中累积。

## 配置 {#configuration}

|字段|默认|说明|
|-------|---------|-------------|
|`hindsightApiUrl`|`https://api.hindsight.vectorize.io`|Hindsight服务器 URL（云默认；使用 `http://localhost:8888` 自托管）|
|`hindsightApiKeyRef`|—|Paperclip 秘密持有您的 Hindsight Cloud API 密钥，通过秘密选择器选择。留空用于自托管|
|`dynamicBankId`|`true`|当`true`，记忆库ID源自`bankGranularity`。设置`false`并提供`bankId` 在智能体上共享一个静态记忆库|
|`bankId`|—|时使用的静态记忆库ID `dynamicBankId` 是 `false`。所有智能体都共享这一价值read/write相同的记忆库 |
|`bankGranularity`|`["company", "agent"]`|记忆隔离时`dynamicBankId` 是 `true`：每个公司+智能体、每个公司或每个智能体。添加`"user"` 用于每用户记忆隔离（对于 GDPR 合规性有用）|
|`recallBudget`|`mid`|`low` = 最快，`mid` = 平衡，`high` = 最彻底|
|`requestTimeoutMs`|`15000`|每个对 Hindsight 的请求超时。对于长问题描述的记忆召回速度较慢的自托管实例，请提高该值|
|`autoRetain`|`true`|每次运行后自动记忆存储运行输出|

## 记忆库ID格式 {#bank-id-format}

```
paperclip::{companyId}::{agentId}                  ← 默认（公司 + 智能体粒度）
paperclip::{companyId}                             ← 公司粒度（智能体之间共享）
paperclip::{agentId}                               ← 智能体粒度（跨公司保留智能体记忆）
paperclip::{companyId}::{agentId}::user::{userId}  ← 用户粒度（按用户隔离，便于满足 GDPR 要求）
{bankId}                                           ← 静态共享记忆库（dynamicBankId = false）
```

## 智能体工具 {#agent-tools}

智能体可以在运行过程中直接调用这些工具：

**`hindsight_recall(query)`** — 在记忆中搜索相关上下文。运行开始时自动调用； 智能体也可以将其称为中期运行以进行有针对性的查询。仅当智能体请求相同查询时，才会重用运行启动结果；任何其他查询都会触发实时记忆召回。

​​ **`hindsight_retain(content)`** — 立即存储事实或决定，无需等待运行结束。

## 适配器兼容性 {#adapter-compatibility}

通过事件系统与所有Paperclip适配器类型配合使用：

|适配器|支持|
|---------|-----------|
|Claude|✓|
|Codex|✓|
|Cursor|✓|
|HTTP|✓|
|流程|✓|
