#!/usr/bin/env python3
"""
Hindsight 反思 API 示例。
运行：python examples/api/reflect.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 准备，文档中不展示
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# 为反思示例准备数据
client.retain(bank_id="my-bank", content="Alice 在 Google 担任软件工程师")
client.retain(bank_id="my-bank", content="Alice 已在那里工作五年")
client.retain(bank_id="my-bank", content="Alice 最近晋升为高级工程师")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:reflect-basic]
client.reflect(bank_id="my-bank", query="关于 Alice，我应该了解什么？")
# [/docs:reflect-basic]


# [docs:reflect-with-params]
response = client.reflect(
    bank_id="my-bank",
    query="正在考虑混合办公，你如何看待远程工作？",
    budget="mid",
)
# [/docs:reflect-with-params]


# [docs:reflect-with-context]
# 向 LLM 提供上下文，帮助理解情境
response = client.reflect(
    bank_id="my-bank",
    query="你如何看待此提案？",
    context="我们正在预算评审会议讨论第四季度支出"
)
# [/docs:reflect-with-context]


# [docs:reflect-disposition]
# 创建具有指定性格倾向的记忆库
client.create_bank(
    bank_id="cautious-advisor",
    name="谨慎的顾问",
    mission="我是关注风险的财务顾问",
    disposition={
        "skepticism": 5,   # 对陈述持高度怀疑
        "literalism": 4,   # 关注准确要求
        "empathy": 2       # 事实优先于感受
    }
)

# 反思回答体现该性格倾向
response = client.reflect(
    bank_id="cautious-advisor",
    query="应该投资加密货币吗？"
)
# 回答很可能强调风险与谨慎
# [/docs:reflect-disposition]


# [docs:reflect-sources]
# include_facts=True 使响应包含 based_on
response = client.reflect(
    bank_id="my-bank",
    query="介绍一下 Alice",
    include_facts=True,
)

print("回答：", response.text)
print("\n依据：")
for fact in (response.based_on.memories if response.based_on else []):
    print(f"  - [{fact.type}] {fact.text}")
# [/docs:reflect-sources]


# [docs:reflect-with-tags]
# 反思只考虑指定用户的记忆
response = client.reflect(
    bank_id="my-bank",
    query="用户如何看待产品？",
    tags=["user:alice"],
    tags_match="any_strict"  # 仅使用此用户标签记忆
)
# [/docs:reflect-with-tags]


# [docs:reflect-structured-output]
from pydantic import BaseModel

# 用 Pydantic 定义响应结构
class HiringRecommendation(BaseModel):
    recommendation: str
    confidence: str  # "low", "medium", "high"
    key_factors: list[str]
    risks: list[str] = []

response = client.reflect(
    bank_id="hiring-team",
    query="应该聘 Alice 为机器学习团队负责人吗？",
    response_schema=HiringRecommendation.model_json_schema(),
)

# 将结构化输出解析为 Pydantic 模型
result = HiringRecommendation.model_validate(response.structured_output)
print(f"建议： {result.recommendation}")
print(f"置信度： {result.confidence}")
print(f"关键因素： {result.key_factors}")
# [/docs:reflect-structured-output]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/cautious-advisor")

print("reflect.py: 所有示例通过")
