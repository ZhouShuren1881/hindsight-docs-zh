---
title: "记忆库现在可以搬走了"
authors: [benfrank241]
slug: "2026/09/22/move-a-memory-bank"
date: 2026-09-22T15:00
tags: [hindsight, agent-memory, banks, transfer, migration, release]
description: "一次调用克隆记忆库、按明确范围导出导入，或原地重命名。了解携带、重建和需要注意的内容。"
image: /img/blog/move-a-memory-bank.webp
hide_table_of_contents: true
---

![移动记忆库：哪些内容迁移、哪些重建、哪些留下](/img/blog/move-a-memory-bank.webp)

选择记忆库 ID 过去像单向门：应叫 `support-prod` 却用了 `support`，或原本应按工作区划分却按客户建库，唯一修复方式是花费真实 LLM 费用重新摄取。

Hindsight 0.10.1 使记忆库可复制、跨实例移动或原地重命名，无需重新提取任何事实。

<!-- truncate -->

## 要点 {#tldr}

- **克隆**：一次 API 将库复制为新 ID，后台运行，不调用 LLM。
- **导出导入**：整库 ZIP，明确选择数据、记忆库配置和历史。
- **重命名**：使用 `hindsight-admin`，存储文件也移动到新前缀。
- **派生内容不迁移**：嵌入、数据库 ID 和实体图在目标重建，适配目标环境。
- **三个风险**：克隆默认继承 webhook，恢复拒绝覆盖已有记忆库，重命名不支持外部存储拥有的记忆库。

## 三种移动方式 {#three-ways-to-move-a-bank}

**克隆**是单次调用选项。`POST /v1/default/banks/{bank_id}/clone?target_bank_id=...` 返回 `202` 和可轮询操作 ID。内部在同一进程连续导出导入，归档不落盘；代码说明写入文件存储只会增加一次往返和清理对象。读取在单一事务中完成，得到某一时刻的副本，同时来源库仍可写，避免混入复制期间变化的数据。

**导出导入**用于跨实例。`POST .../transfer/export` 返回操作及下载 URL；`POST .../transfer/import` 以 multipart 接收 ZIP。这也是更换已有记忆库嵌入模型、向量扩展或全文搜索后端的受支持方式。

**重命名**是运维工具，不是 API。`hindsight-admin rename-bank --from old --to new` 在单一事务移动所有对应 `bank_id` 行，再迁移文件键前缀，并发重建向量索引。支持 `--dry-run`。

## 迁移哪些内容 {#what-travels}

范围由三个布尔值控制，而非枚举，含义如下：

| 标志 | 默认 | 携带内容 |
|---|---|---|
| `include_data` | 开启 | 文档、分块、事实、整合观察、附件及字节、整理归档、操作日志、**心智模型与知识页面树** |
| `include_bank_config` | 开启 | 记忆库记录（配置覆盖、名称、使命、性格倾向）、指令、**webhook** |
| `include_history` | 关闭 | 审计日志和 LLM 请求记录 |

令人意外的是心智模型和知识页面属于*数据*，不是配置。代码解释了原因：

> 它们是对事实的解读，不是设置。心智模型的 `based_on` 证据按 ID 引用记忆单元，单独携带模型会恢复一个无法找到依据的综合结果。

开发早期曾将其放在配置，后来调整，可见很容易误判。实际结果是 `include_data=false`、`include_bank_config=true` 只得到设置、指令和 webhook，没有心智模型。

## 派生内容不迁移 {#nothing-derived-travels}

这是整个机制有效的关键。

不携带嵌入、数据库 ID、实体表、共现图或记忆关联。归档保存来源材料：文档、分块、事实文本，以及规范名称而非 ID 表示的实体。导入用**目标**模型重新嵌入事实，在目标重新解析实体并构建图。

不调用 LLM。导入器执行的正是“retain 在 LLM 提取之后的步骤”。移动只花嵌入计算，不花 LLM token，副本适配目标，而非携带目标可能不使用的模型向量。

因此更换嵌入模型的官方方式是导出导入。已填充记忆库不能原地修改，可以迁移到新库。

文档保留 ID，事实、观察和实体获得新 ID。心智模型和知识页面保留 ID，目录树继续有效。自有数据库保存的 Hindsight 事实 ID 不会跨迁移保留。

## 需要注意的地方 {#where-it-will-bite-you}

对重要数据执行前，应知道四点。

**克隆继承来源 webhook。** `include_bank_config` 默认开启，webhook 属于配置，因此副本会调用来源端点。针对单库消费者时，应传 `include_bank_config=false` 或在副本删除 webhook。复制生产库用于调试，却触发生产 webhook，会造成麻烦。

**恢复拒绝已有目标。** 克隆和恢复要求目标不存在，否则提示先删除或换 ID。定期将开发库提升为生产，不能直接覆盖循环，需要先删后恢复，或每次新 ID 并重定向客户端。合并模式按文档处理冲突，不对事实去重，重复导入可生成基于相同事实的重叠观察。

**重命名限制较多。** 仅支持 PostgreSQL，有待处理或进行中操作时拒绝，外部存储拥有的记忆库也拒绝；后者只能克隆到新 ID 再删旧库。必须先停止客户端，否则继续用旧 ID 会得到 404，或按需创建一个旧名空库。

**缩小范围会静默无操作。** 导入范围与归档实际内容取交集，请求归档没有的内容不会报错，应检查清单确认标志真正生效。

## 升级带附件的外部存储记忆库 {#if-you-upgrade-with-attachments-in-a-store-owned-bank}

0.10.1 迁移让附件直接属于文档，替代 `document_attachments`。普通部署开销低，不移动字节，记录保留原存储键。

外部存储拥有的记忆库写入附件记录，却没有回填读取的文档附件记录，无法发现所属文档，因此**迁移会删除这些附件记录**。二进制对象留在存储中直到库被删除。使用此部署且有附件时，应在升级前了解。

## 模板是另一种功能 {#templates-are-a-different-feature}

Hindsight 自 0.5.0 提供[记忆库模板](https://hindsight.vectorize.io/blog/2026/04/10/templates-hub-hindsight-050)，容易与迁移混淆。

模板是可手工编辑的 JSON，包含配置覆盖、指令和心智模型*定义*，即问题而非内容。在新库导入会调用 reflect 重建模型，花费 LLM 调用；采用更新或插入，可应用到已有库。

迁移是不透明归档，携带记忆库本身及完整内容，不调用 LLM，目标必须尚不存在。

模板搬配方，迁移搬记忆库。

## 可用入口 {#where-this-is-available}

克隆、导出、导入通过 HTTP API 和 Python、TypeScript、Go 客户端提供。控制平面 Actions 菜单提供克隆，Cloud 端点已上线。

重命名仅在 `hindsight-admin`，没有 API、MCP 或 SDK。管理 CLI 也有 `export-bank` 和 `import-bank`，但三类范围只在 HTTP 提供。

脚本用户注意：没有归档大小上限或任务超时，克隆在进程内保存载荷和归档。操作结果报告归档字节数，是唯一的大小信号。

## 了解更多 {#learn-more}

- [一个记忆库还是多个？智能体记忆结构指南](https://hindsight.vectorize.io/blog/2026/07/16/bank-strategy-agent-memory)：决定库代表什么，现在可反悔。
- [AI 产品的按用户记忆](https://hindsight.vectorize.io/blog/2026/08/04/per-user-multi-tenant-agent-memory)：租户隔离，以及克隆种子库配置的风险。
- [将智能体记忆迁出向量数据库](https://hindsight.vectorize.io/blog/2026/07/28/migrate-agent-memory-off-vector-database)：从其他系统迁入。
- [Hindsight 0.10.1 新功能](https://hindsight.vectorize.io/blog/2026/09/21/version-0-10-1)：包括 TypeSafe Jev 的其他更新。
