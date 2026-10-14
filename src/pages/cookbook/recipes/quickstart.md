---
sidebar_position: 1
---

# Hindsight 快速开始 {#hindsight-quickstart}


:::tip 运行此笔记本
本教程提供交互式 Jupyter 笔记本。
[**在 GitHub 中打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/01-quickstart.ipynb)
:::


本笔记本介绍使用 Hindsight 的基础知识：
- **Retain（存入）**：将信息存入记忆
- **Recall（召回）**：检索与查询匹配的记忆
- **Reflect（反思）**：从记忆中生成洞察

## 前置条件 {#prerequisites}

确保 Hindsight 已在运行。最简单的方式是使用 Docker：

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=o3-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- API：http://localhost:8888
- UI：http://localhost:9999

## 安装 {#installation}

安装 Hindsight Python 客户端：


```python
!pip install hindsight-client nest_asyncio python-dotenv -U
```

## 连接 Hindsight {#connect-to-hindsight}


```python
# Jupyter 笔记本已运行 asyncio 事件循环。Hindsight 客户端
# 内部使用 loop.run_until_complete()，但 Python 默认不允许嵌套事件循环。
# nest_asyncio 会修补这一限制，以支持嵌套事件循环。
import nest_asyncio
nest_asyncio.apply()

import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
# 将 .env.example 复制为 .env，并填写其中的值
load_dotenv()

# 配置（如果设置了环境变量，则使用其值覆盖）
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_UI_URL = os.getenv("HINDSIGHT_UI_URL", "http://localhost:9999")

from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_API_URL)
```

## Retain：存入信息 {#retain-store-information}

`retain` 操作可将新记忆写入 Hindsight。它会让 Hindsight 存入你传入的信息。

在底层，`retain` 操作会使用 LLM 提取关键事实、时间数据、实体和关系。


```python
# 简单存入
client.retain(
    bank_id="my-bank",
    content="Alice works at Google as a software engineer"
)

# 在 UI 中查看已存储的文档：
print(f"View documents: {HINDSIGHT_UI_URL}/banks/my-bank?view=documents")
```


```python
# 存入信息时附加上下文和时间戳
client.retain(
    bank_id="my-bank",
    content="Alice got promoted to senior engineer",
    context="career update",
    timestamp="2025-06-15T10:00:00Z"
)
```

## Recall：召回记忆 {#recall-retrieve-memories}

`recall` 操作会检索与查询匹配的记忆。它会并行执行四种检索策略：
- **语义**：向量相似度
- **关键词**：BM25 精确匹配
- **图**：实体、时间和因果关联
- **时间**：按时间范围筛选


```python
# 简单召回
results = client.recall(bank_id="my-bank", query="What does Alice do?")

print("Memories:")
for r in results.results:
    print(f"  - {r.text}")
```


```python
# 按时间召回
results = client.recall(bank_id="my-bank", query="What happened in June?")

print("Memories:")
for r in results.results:
    print(f"  - {r.text}")
```

## Reflect：生成洞察 {#reflect-generate-insights}

`reflect` 操作会对已有记忆进行更全面的分析。这使智能体能够在记忆之间建立新的关联，并将这些关联持久保存为观测。

示例用途：
- AI 项目经理通过反思分析需要降低哪些风险
- 销售智能体通过反思分析某些外联消息为何得到回复
- 支持智能体通过反思分析客户有哪些问题尚未得到解答


```python
response = client.reflect(bank_id="my-bank", query="What should I know about Alice?")
print(response)
```

## 记忆类型 {#memory-types}

Hindsight 将记忆组织成三个网络，以模拟人类记忆：

- **世界事实**：关于世界的事实（“炉子会变热”）
- **经历事实**：智能体自身的经历（“我碰了炉子，结果真的很疼”）
- **观测**：通过反思事实和经历得出的复杂心智模型

## 清理 {#cleanup}

删除本笔记本创建的记忆库：


```python
import requests

response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/my-bank")
print(f"Deleted my-bank: {response.json()}")
```
