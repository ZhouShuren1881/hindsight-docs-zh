---
sidebar_position: 1
---

# Hindsight 快速开始 {#hindsight-quickstart}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/01-quickstart.ipynb)
:::


本笔记本涵盖使用 Hindsight 的基础：
- **存储（Retain）**：保存信息
- **召回（Recall）**：检索匹配查询的记忆
- **反思（Reflect）**：从记忆生成洞察

## 前置条件 {#prerequisites}

确保 Hindsight 正在运行，最简单的方式是 Docker：

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=o3-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- API：http://localhost:8888
- 界面：http://localhost:9999

## 安装 {#installation}

安装 Hindsight Python 客户端：


```python
!pip install hindsight-client nest_asyncio python-dotenv -U
```

## 连接 Hindsight {#connect-to-hindsight}


```python
# Jupyter 已运行 asyncio 事件循环；Hindsight 客户端
# 内部使用 loop.run_until_complete()，Python 默认不允许嵌套。
# nest_asyncio 修补事件循环以支持嵌套。
import nest_asyncio
nest_asyncio.apply()

import os
from dotenv import load_dotenv

# 从 .env 加载环境变量
# 复制 .env.example 为 .env 并填写值
load_dotenv()

# 配置，可用环境变量覆盖
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_UI_URL = os.getenv("HINDSIGHT_UI_URL", "http://localhost:9999")

from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_API_URL)
```

## Retain：存储信息 {#retain-store-information}

`retain` 向 Hindsight 写入新记忆，要求系统保留传入信息。

底层使用 LLM 提取关键事实、时间数据、实体和关系。


```python
# 简单存储
client.retain(
    bank_id="my-bank",
    content="Alice 在 Google 担任软件工程师"
)

# 在界面查看已存储文档：
print(f"查看文档：{HINDSIGHT_UI_URL}/banks/my-bank?view=documents")
```


```python
# 附加上下文和时间戳存储
client.retain(
    bank_id="my-bank",
    content="Alice 晋升为高级工程师",
    context="职业变化",
    timestamp="2025-06-15T10:00:00Z"
)
```

## Recall：检索记忆 {#recall-retrieve-memories}

`recall` 检索匹配查询的记忆，并行使用四种策略：
- **语义**：向量相似度
- **关键词**：BM25 精确匹配
- **图**：实体、时间和因果关联
- **时间**：时间范围筛选


```python
# 简单召回
results = client.recall(bank_id="my-bank", query="Alice 做什么工作？")

print("记忆：")
for r in results.results:
    print(f"  - {r.text}")
```


```python
# 时间召回
results = client.recall(bank_id="my-bank", query="六月发生了什么？")

print("记忆：")
for r in results.results:
    print(f"  - {r.text}")
```

## Reflect：生成洞察 {#reflect-generate-insights}

`reflect` 更深入地分析已有记忆，让智能体形成新的关联，并将其保存为观察。

示例用途：
- AI 项目经理分析应降低哪些风险
- 销售智能体分析哪些外联消息得到回复及原因
- 支持智能体分析客户尚未得到解答的问题


```python
response = client.reflect(bank_id="my-bank", query="关于 Alice，我应该了解什么？")
print(response)
```

## 记忆类型 {#memory-types}

Hindsight 通过三个网络组织记忆，模拟人类记忆：

- **世界事实**：“炉子会变热”等外部事实
- **经历事实**：“我碰了炉子，很疼”等自身经历
- **观察**：对事实和经历进行反思形成的复杂心智模型

## 清理 {#cleanup}

删除本笔记本创建的记忆库：


```python
import requests

response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/my-bank")
print(f"已删除 my-bank：{response.json()}")
```
