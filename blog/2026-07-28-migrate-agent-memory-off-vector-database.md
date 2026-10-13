---
title: "如何将智能体的记忆从矢量数据库中移出"
authors: [benfrank241]
slug: "2026/07/28/migrate-agent-memory-off-vector-database"
date: 2026-07-28T12:00
tags: [hindsight, agent-memory, vector-database, migration, pinecone, chroma, tutorial]
description: "将智能体记忆从 Pinecone 或 Chroma 等矢量数据库迁移到 Hindsight 的实用指南：导出什么、如何映射它以及您获得什么。"
image: /img/blog/migrate-agent-memory-vector-database.png
hide_table_of_contents: true
---

![将智能体记忆从矢量数据库迁移到Hindsight：导出文本和元数据，批量记忆存储，获取实体和观察](/img/blog/migrate-agent-memory-vector-database.png)

如果您按照大多数教程告诉您的方式构建了智能体记忆，它就存在于矢量数据库中。您嵌入每条消息，将其与一些元数据一起插入到 Pinecone 或 Chroma 中，并在运行时按余弦相似度进行查询。它有效，直到它不起作用：同一个人以三个略有不同的名字出现，上个月的决定与今天的决定相同，并且重复的事实堆积起来，因为没有任何东西可以使它们一致。我们[成功了](/blog/2026/05/12/case-against-external-vector-dbs-agent-memory)首先认为矢量数据库是智能体记忆的错误默认值。这篇文章是另一半：如果你已经有了，你如何摆脱？

​​简短的版本是您不迁移向量。您迁移文本，然后让 [Hindsight](https://vectorize.io/hindsight) 重建其他所有内容。

<!-- truncate -->

## 概览 {#tldr}

- **不要导出嵌入。** Hindsight 使用自己的模型重新嵌入摄取。导出原始文本和元数据。
- **将每个命名空间或索引映射到记忆库。** 记忆库是Hindsight的隔离边界，与 Pinecone 命名空间扮演的角色相同。
- **Re-`retain`批量文本。** 该单个调用运行提取、实体解析、嵌入和后台集成，这正是矢量数据库没有执行的机制。
- **用`recall`和`reflect`验证**，然后停用第二个服务。

## 第一步：站起来Hindsight {#step-1-stand-up-hindsight}

在移动任何东西之前，您需要运行Hindsight。最快的路径是[Hindsight Cloud](https://ui.hindsight.vectorize.io)：注册，获取API密钥，无需托管。

```python
from hindsight_client import Hindsight

# Cloud
client = Hindsight(base_url="https://api.hindsight.vectorize.io", api_key="hsk_...")

#或自托管
# client = Hindsight(base_url="http://localhost:8888")
```

要自行托管，请运行容器并将客户端指向它：

```bash
docker run -it --pull always --name hindsight --restart unless-stopped \
  -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 第 2 步：重新考虑您要移动的单元 {#step-2-rethink-the-unit-you-are-moving}

这是人们跳过的步骤，也是最重要的一步。在矢量数据库中，单位是一行：一个嵌入、它来自的文本块和一包元数据。在Hindsight中，单位是*记忆库*内的*事实*，事实与实体以及彼此之间相连。

所以映射不是行到行的。它是：

|矢量数据库|Hindsight|
|---|---|
|索引/命名空间|记忆库 (`bank_id`)|
|嵌入向量|丢弃，摄取时重新嵌入|
|存储的文本/块|`content` 传递给 `retain`|
|元数据中的 `user_id`|通常映射为 `bank_id`，每个用户一个记忆库|
|主题/类别元数据|`tags` 用于过滤记忆召回|
|时间戳元数据|`event_date`，所以时间排序有效|

实际结果：如果您的 Pinecone 索引使用`user_id`元数据字段来分隔租户，则该字段将成为记忆库，而不是过滤器。每用户隔离不再是您必须记住的查询时 `where` 子句，而是成为结构边界。如果您不确定切片的精细程度，我们写了一个[记忆库策略实地指南](/blog/2026/07/16/bank-strategy-agent-memory)。

## 第 3 步：导出文本，而不是向量 {#step-3-export-the-text-not-the-vectors}

从现有存储中提取记录，保留您关心的文本和元数据并删除嵌入。从 Pinecone 中获取分页数据；从 Chroma 来看，它是 `collection.get(include=["documents", "metadatas"])`。不管怎样，你最终都会得到一个简单记录的列表：

```python
records = [
    {
        "text": "客户更喜欢通过电子邮件而不是电话来获得支持。",
        "user_id": "user_123",
        "topic": "support",
        "created_at": "2026-05-02T14:30:00Z",
    },
    # ...
]
```

## 第四步：批量记忆存储 {#step-4-retain-in-batches}

现在将这些记录重播到Hindsight。 `retain` 接受 `items` 列表，因此您可以一次发送多个列表，而不是每条记录一次调用。按记录所属的记忆库对记录进行分组，然后进行批处理：

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
    #分块发送，以便每次调用保持合理的大小
    for i in range(0, len(items), 100):
        client.retain(bank_id=bank_id, items=items[i:i + 100])
```

没有专用的 Pinecone 或 Chroma 导入器可供安装，您也不需要。这个循环就是迁移。每个 `retain` 调用都会完成矢量数据库从未做过的工作：它从文本中提取持久的事实，根据记忆库中已有的内容解析其中的实体，嵌入它们，并对后台集成进行排队。 `retain` 快速返回，并且较繁重的处理会异步继续，因此大型迁移会作为队列耗尽，而不是阻塞脚本。

一个诚实的警告：因为Hindsight重新提取并重新嵌入每条记录，所以大迁移不是即时的，它确实可以进行真正的模型工作。这就是将一堆块变成结构化记忆的成本。你付一次钱。

## 第5步：验证，然后停用 {#step-5-verify-then-decommission}

在撕下任何东西之前，请确认记忆按照您期望的方式读回。使用 `recall` 对事实进行抽查，并使用 `reflect` 当您想查看更高层次的理解是否在迁移中幸存下来：

```python
client.recall(bank_id="user_123", query="该客户希望我们如何联系？")
client.reflect(bank_id="user_123", query="总结我们对该客户的了解")
```

如果这些看起来正好穿过记忆库样本，请将应用程序的读取路径指向Hindsight并关闭矢量数据库。您现在正在运行一项有状态服务，而不是两项。

## 你实际获得了什么 {#what-you-actually-gained}

迁移是值得做的，因为目的地不仅仅是另一家存储。相同的文本现在得到：

- **实体解析。**“爱丽丝”、“爱丽丝陈”和“爱丽丝C”。折叠成一个实体，因此有关她的查询会找到所有内容，而不是恰好与您的措辞匹配的第三个实体。
- **整合。** 重复和相关的事实会在后台被提炼到观察中，而不是积累为接近重复的行，您必须自己进行重复数据删除。
- **时间意识。** 因为您携带了 `event_date`，Hindsight 可以根据最近的时间进行排名并回答有时间限制的问题，而不是将一年前的笔记和今天早上的笔记视为平等。
- **混合检索。** 记忆召回运行语义搜索、BM25 关键字搜索和对链接实体的图形遍历，当查询具有时间元素时进行时间传递，然后融合并重新排列结果。你的旧设置执行了这四个中的第一个，并将其称为记忆。

## 常见问题 {#frequently-asked-questions}

**我会丢失嵌入吗？**
是的，故意的。 Hindsight 嵌入了自己的模型，因此向量无论如何都不兼容。您保留文本，这是带有含义的部分。

**如何映射多租户 Pinecone 索引？**
任何将租户分开的领域，通常是`user_id`，都会成为`bank_id`。每个租户一个记忆库，通过结构隔离。

**有没有一键导入器？**
没有。迁移就是上面的批量`retain`循环。这是经过深思熟虑的：摄取必须运行提取和实体解析，因此没有捷径可以跳过使记忆有用的部分。

**我可以增量迁移吗？**
是的。 记忆库是惰性创建的，并且 `retain` 是可加性的，因此您可以一次移动一个租户或一个命名空间，并并行运行两个系统，直到您有信心为止。

## 进一步阅读 {#further-reading}

- [记忆存储内部()](/blog/2026/07/13/inside-retain-agent-memory)：当你存储每条记录时，它会发生什么。
- [记忆召回 vs 反思](/blog/2026/07/24/recall-vs-reflect)：移动后读取记忆的两种方法。
- [你的1M-token上下文窗口不被记忆](/blog/2026/07/22/context-window-is-not-memory)：为什么你检索一小部分而不是粘贴所有内容。
