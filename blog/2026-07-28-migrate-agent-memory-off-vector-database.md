---
title: "如何将智能体记忆迁出向量数据库"
authors: [benfrank241]
slug: "2026/07/28/migrate-agent-memory-off-vector-database"
date: 2026-07-28T12:00
tags: [hindsight, agent-memory, vector-database, migration, pinecone, chroma, tutorial]
description: "本指南介绍如何将智能体记忆从 Pinecone 或 Chroma 等向量数据库迁移到 Hindsight：导出哪些数据、如何映射，以及迁移后能获得什么。"
image: /img/blog/migrate-agent-memory-vector-database.png
hide_table_of_contents: true
---

![将智能体记忆从向量数据库迁移到 Hindsight：导出文本和元数据、分批存入，并获得实体和观测](/img/blog/migrate-agent-memory-vector-database.png)

如果你按照大多数教程介绍的方式构建了智能体记忆，它通常就存放在向量数据库中。你为每条消息生成嵌入向量，将消息连同一些元数据写入 Pinecone 或 Chroma，并在运行时按余弦相似度查询。这套做法起初可行，但问题迟早会出现：同一个人会以三个略有差异的名字出现，上个月的决定与今天的决定排名相同，重复事实也不断堆积，因为没有机制协调它们。我们曾[说明为什么](/blog/2026/05/12/case-against-external-vector-dbs-agent-memory)向量数据库从一开始就不该是智能体记忆的默认选择。这篇文章讲另一半：如果你已经用了向量数据库，该如何迁出？

简而言之，你不需要迁移向量，只需迁移文本，再让 [Hindsight](https://vectorize.io/hindsight) 重建其余内容。

<!-- truncate -->

## 概要 {#tldr}

- **不要导出嵌入向量。** Hindsight 会在摄取时使用自己的模型重新生成嵌入。请导出原始文本和元数据。
- **将每个命名空间或索引映射为一个记忆库。** 记忆库是 Hindsight 的隔离边界，作用类似于 Pinecone 的命名空间。
- **分批重新调用 `retain` 存入文本。** 这一调用会执行事实提取、实体解析、嵌入和后台整合；这些正是向量数据库没有提供的机制。
- **用 `recall` 和 `reflect` 验证结果，** 然后停用第二个服务。

## 第一步：启动 Hindsight {#step-1-stand-up-hindsight}

迁移数据之前，你需要先运行 Hindsight。最快的方式是使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)：注册并获取 API 密钥，无需自行托管。

```python
from hindsight_client import Hindsight

# Cloud
client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")

# 或自行托管
# client = Hindsight(base_url="http://localhost:8888")
```

如果要自行托管，请运行容器并让客户端连接到它：

```bash
docker run -it --pull always --name hindsight --restart unless-stopped \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 第二步：重新考虑要迁移的数据单元 {#step-2-rethink-the-unit-you-are-moving}

很多人会跳过这一步，但它至关重要。在向量数据库中，数据单元是一行：一个嵌入向量、生成该向量的文本块，以及一组元数据。在 Hindsight 中，数据单元是记忆库中的一条*事实*，事实还会与实体及其他事实建立关联。

因此，映射关系不是逐行对应，而是这样：

| 向量数据库 | Hindsight |
| --- | --- |
| 索引 / 命名空间 | 记忆库（`bank_id`） |
| 嵌入向量 | 丢弃；摄取时重新生成嵌入 |
| 存储的文本 / 文本块 | 传给 `retain` 的 `content` |
| 元数据中的 `user_id` | 通常映射为 `bank_id`，每位用户一个记忆库 |
| 主题 / 类别元数据 | 用于筛选召回结果的 `tags` |
| 时间戳元数据 | `event_date`，用于按时间排序 |

实际迁移时，如果你的 Pinecone 索引通过 `user_id` 元数据字段隔离租户，那么这个字段应该映射为记忆库，而不是筛选条件。这样，每位用户的数据隔离就由结构边界保证，无需依赖查询时记得添加 `where` 子句。如果不确定应该如何划分记忆库，可以参考我们的[记忆库策略指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 第三步：导出文本，不导出向量 {#step-3-export-the-text-not-the-vectors}

从现有存储中取出记录，保留文本和你需要的元数据，并丢弃嵌入向量。从 Pinecone 获取数据时需要分页；从 Chroma 获取时，可以调用 `collection.get(include=["documents", "metadatas"])`。无论哪种方式，最后都会得到一组普通记录：

```python
records = [
    {
        "text": "Customer prefers email over phone for support.",
        "user_id": "user_123",
        "topic": "support",
        "created_at": "2026-05-02T14:30:00Z",
    },
    # ...
]
```

## 第四步：分批调用 retain {#step-4-retain-in-batches}

接下来，将这些记录重新写入 Hindsight。`retain` 接受 `items` 列表，因此可以一次发送多条记录，而不必每条记录调用一次。先按记录所属的记忆库分组，再分批处理：

```python
from collections import defaultdict

by_bank = defaultdict(list)
for r in records:
    by_bank[r["user_id"]].append({
        "content": r["text"],
        "tags": [r["topic"]],
        "event_date": r["created_at"],
    })

for bank_id, items in by_bank.items():
    client.create_bank(bank_id=bank_id, name=f"Memory for {bank_id}")
    # 分块发送，控制每次调用的数据量
    for i in range(0, len(items), 100):
        client.retain(bank_id=bank_id, items=items[i:i + 100])
```

你无需安装 Pinecone 或 Chroma 的专用导入器，也不需要其他工具；这个循环本身就是迁移过程。每次调用 `retain` 都会完成向量数据库一直没有做的工作：从文本中提取可长期保留的事实，根据记忆库中已有的内容解析这些事实涉及的实体，为事实生成嵌入，并将后台整合作业加入队列。`retain` 会快速返回，较重的处理则在后台异步继续。因此，大规模迁移会以队列方式逐步完成，而不会阻塞脚本。

有一点需要说明：Hindsight 会为每条记录重新提取事实并生成嵌入，所以大规模迁移不会立即完成，而且确实会消耗模型算力。这是把一堆文本块转化为结构化记忆所需的成本，只需承担一次。

## 第五步：验证结果，然后停用旧服务 {#step-5-verify-then-decommission}

停用旧服务之前，请确认记忆能按预期读取。可以用 `recall` 抽查事实；如果想确认迁移后更高层次的理解是否保留，则使用 `reflect`：

```python
client.recall(bank_id="user_123", query="how does this customer like to be contacted?")
client.reflect(bank_id="user_123", query="summarize what we know about this customer")
```

如果抽查的几个记忆库都符合预期，就将应用程序的读取路径切换到 Hindsight，并关闭向量数据库。这样，你只需运行一个有状态服务，而不是两个。

## 迁移后实际获得的能力 {#what-you-actually-gained}

这次迁移值得做，因为 Hindsight 不只是另一个存储。现在，同一份文本还能用于：

- **实体解析。** “Alice”“Alice Chen”和“Alice C.”会归并为同一个实体。因此，关于她的查询可以找到所有相关内容，而不是只找到名称恰好与查询措辞相符的那部分。
- **整合。** 重复且相关的事实会在后台提炼为观测，而不是累积成需要你自行去重的近似重复行。
- **时间感知。** 由于你保留了 `event_date`，Hindsight 可以按新近程度排序并回答带时间范围的问题，而不再把一年前的记录和今天早上的记录视为同等新近。
- **混合检索。** Recall 会结合语义搜索、BM25 关键词搜索和关联实体图遍历；查询涉及时间时，还会执行时间检索，然后融合并重新排序结果。旧方案只实现了这四种方式中的第一种，却把它称为记忆。

## 常见问题 {#frequently-asked-questions}

**我会丢失嵌入向量吗？**
会，这是有意的。Hindsight 使用自己的模型生成嵌入，因此原来的向量无论如何也不兼容。你会保留真正承载含义的文本。

**如何映射多租户 Pinecone 索引？**
用于区分租户的字段（通常是 `user_id`）映射为 `bank_id`。每个租户使用一个记忆库，通过结构实现隔离。

**有没有一键导入器？**
没有。迁移过程就是上面的批量 `retain` 循环。这是有意的：摄取必须执行事实提取和实体解析，没有捷径可以跳过这些让记忆变得有用的步骤。

**可以逐步迁移吗？**
可以。记忆库会按需创建，`retain` 会在现有内容上追加数据，因此你可以一次迁移一个租户或一个命名空间，并让两个系统并行运行，直到确认迁移结果可靠。

## 延伸阅读 {#further-reading}

- [深入了解 retain()](/blog/2026/07/13/inside-retain-agent-memory)：了解每条记录调用 `retain` 后会发生什么。
- [recall 与 reflect 的区别](/blog/2026/07/24/recall-vs-reflect)：迁移后读取记忆的两种方式。
- [你的 1M-token 上下文窗口不等于记忆](/blog/2026/07/22/context-window-is-not-memory)：为什么应该检索一小部分内容，而不是把所有内容都粘贴进去。
