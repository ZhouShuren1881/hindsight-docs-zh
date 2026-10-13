#!/usr/bin/env python3
"""
Hindsight 观点 API 示例（已弃用，为版本化文档保留）。
保留此文件以兼容 v0.3 文档。
在 v0.4 及更高版本中，观点已被心智模型取代。
"""
import os
import requests

from hindsight_client import Hindsight

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
client = Hindsight(base_url=HINDSIGHT_URL)

# [docs:opinion-form]
# 记忆库遇到以下信息时，会自动形成观点：
# 已存储内容中的主张、偏好或判断
client.retain(
    bank_id="my-bank",
    content="我认为 Python 很适合数据科学，因为它有丰富的库"
)

# 记忆库根据证据形成带有置信度的观点
# [/docs:opinion-form]


# [docs:opinion-search]
# 搜索有关某个主题的观点
response = client.recall(
    bank_id="my-bank",
    query="你对 Python 有什么看法？",
    types=["opinion"]
)

for opinion in response.results:
    print(f"观点：{opinion.text}")
    print(f"置信度：{opinion.confidence}")
# [/docs:opinion-search]


# [docs:recall-opinions-only]
# 仅检索观点（信念和偏好）
opinions = client.recall(
    bank_id="my-bank",
    query="我有哪些偏好？",
    types=["opinion"]
)
# [/docs:recall-opinions-only]


# [docs:recall-include-entities]
# 在记忆召回结果中包含实体摘要
response = client.recall(
    bank_id="my-bank",
    query="我对 Alice 了解多少？",
    include_entities=True,
    max_entity_tokens=500
)

# 结果同时包含事实和实体摘要
for result in response.results:
    print(f"- {result.text}")
    if hasattr(result, 'entity_summary'):
        print(f"  实体：{result.entity_summary}")
# [/docs:recall-include-entities]


# [docs:opinion-disposition]
# 记忆库的性格倾向会影响观点的形成方式
# 怀疑程度较高 = 置信度较低，需要更多证据
# 怀疑程度较低 = 置信度较高，更容易接受主张

client.create_bank(
    bank_id="skeptical-bank",
    disposition={"skepticism": 5, "literalism": 3, "empathy": 2}
)

# 内容相同，但性格倾向不同会导致置信度不同
client.retain(bank_id="skeptical-bank", content="Python 是最好的编程语言")
# [/docs:opinion-disposition]


# [docs:opinion-in-reflect]
# 观点会影响反思响应
response = client.reflect(
    bank_id="my-bank",
    query="我应该在数据项目中使用 Python 吗？"
)

# 响应会以适当的置信度融入记忆库的观点
print(response.text)
# [/docs:opinion-in-reflect]


# =============================================================================
# 清理（不在文档中显示）
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/skeptical-bank")

print("opinions.py：全部示例通过")
