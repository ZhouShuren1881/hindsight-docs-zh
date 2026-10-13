#!/usr/bin/env python3
"""
Hindsight 召回 API 示例。
运行：python examples/api/recall.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 准备，文档中不展示
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# 为召回示例准备数据
client.retain(bank_id="my-bank", content="Alice 在 Google 担任软件工程师")
client.retain(bank_id="my-bank", content="Alice 喜欢周末徒步")
client.retain(bank_id="my-bank", content="Bob 是与 Alice 一起工作的数据科学家")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:recall-basic]
response = client.recall(bank_id="my-bank", query="Alice 做什么工作？")

# response.results 为 RecallResult 列表，每项包含：
# - id:             事实 ID
# - text:           提取的事实
# - type:           "world", "experience", or "observation"
# - context:        存储时设置的上下文标签
# - metadata:       存储时设置的 dict[str, str]
# - tags:           标签列表
# - entities:       关联实体名称字符串列表
# - occurred_start: 事件开始的 ISO 日期时间
# - occurred_end:   事件结束的 ISO 日期时间
# - mentioned_at:   事实存储的 ISO 日期时间
# - document_id:    事实所属文档
# - chunk_id:       提取此事实的分块

# response.results 示例：
# [
#   RecallResult(id="a1b2...", text="Alice 在 Google 担任软件工程师", type="world", context="career", ...),
#   RecallResult(id="c3d4...", text="Alice 晋升为高级工程师", type="experience", occurred_start="2024-03-15T00:00:00Z", ...),
# ]
# [/docs:recall-basic]


# [docs:recall-with-options]
response = client.recall(
    bank_id="my-bank",
    query="Alice 做什么工作？",
    types=["world", "experience"],
    budget="high",
    max_tokens=8000,
    trace=True,
)

# 访问结果
for r in response.results:
    print(f"- {r.text}")
# [/docs:recall-with-options]


# [docs:recall-world-only]
# 仅世界事实，即客观信息
world_facts = client.recall(
    bank_id="my-bank",
    query="Alice 在哪里工作？",
    types=["world"]
)
# [/docs:recall-world-only]


# [docs:recall-experience-only]
# 仅经历事实，即对话和事件
experience = client.recall(
    bank_id="my-bank",
    query="我推荐过什么？",
    types=["experience"]
)
# [/docs:recall-experience-only]


# [docs:recall-observations-only]
# 仅观察，即整合知识
observations = client.recall(
    bank_id="my-bank",
    query="我学到了哪些模式？",
    types=["observation"]
)
# [/docs:recall-observations-only]


# [docs:recall-with-observations]
# 召回包含观察
results = client.recall(
    bank_id="my-bank",
    query="Alice 偏好什么编程语言？",
    types=["world", "experience", "observation"]
)

# 仅观察
observations = client.recall(
    bank_id="my-bank",
    query="我学到了哪些模式？",
    types=["observation"]
)
# [/docs:recall-with-observations]


# [docs:recall-source-facts]
# 召回观察及来源事实
response = client.recall(
    bank_id="my-bank",
    query="我了解 Alice 的哪些模式？",
    types=["observation"],
    include_source_facts=True,
    max_source_facts_tokens=4096,
)

for obs in response.results:
    print(f"观察： {obs.text}")
    if obs.source_fact_ids and response.source_facts:
        print("  来源：")
        for fact_id in obs.source_fact_ids:
            fact = response.source_facts.get(fact_id)
            if fact:
                print(f"    - [{fact.type}] {fact.text}")
# [/docs:recall-source-facts]


# [docs:recall-token-budget]
# 用相关记忆填充最多 4K token 上下文
results = client.recall(bank_id="my-bank", query="我对 Alice 了解什么？", max_tokens=4096)

# 快速查询使用较小预算
results = client.recall(bank_id="my-bank", query="Alice 的邮箱", max_tokens=500)
# [/docs:recall-token-budget]




# [docs:recall-budget-levels]
# 快速查询
results = client.recall(bank_id="my-bank", query="Alice 的邮箱", budget="low")

# 深入探索
results = client.recall(bank_id="my-bank", query="Alice 和 Bob 有什么关联？", budget="high")
# [/docs:recall-budget-levels]


# [docs:recall-with-tags]
# 按用户标签筛选召回
response = client.recall(
    bank_id="my-bank",
    query="用户提供了什么反馈？",
    tags=["user:alice"],
    tags_match="any"  # OR 匹配，默认包含无标签记忆
)
# [/docs:recall-with-tags]


# [docs:recall-tags-strict]
# 严格模式只返回标签匹配记忆，排除无标签
response = client.recall(
    bank_id="my-bank",
    query="用户说了什么？",
    tags=["user:alice"],
    tags_match="any_strict"  # OR 匹配，排除无标签记忆
)
# [/docs:recall-tags-strict]


# [docs:recall-tags-all]
# AND 匹配，要求包含全部指定标签
response = client.recall(
    bank_id="my-bank",
    query="报告了哪些问题？",
    tags=["user:alice", "bug-report"],
    tags_match="all_strict"  # 记忆必须有两个标签
)
# [/docs:recall-tags-all]


# [docs:recall-tags-any]
response = client.recall(
    bank_id="my-bank",
    query="沟通偏好",
    tags=["user:alice"],
    tags_match="any",  # default
)
# 返回：
#   [匹配]    "Alice 偏好异步沟通"     — 包含 "user:alice"
#   [不匹配] "Bob 不喜欢冗长会议"             — 不相交于 ["user:alice"]
#   [匹配]    "团队用 Slack 发布通知"      — 包含 "user:alice"
#   [匹配]    "公司规定：周五不开会" — 无标签，默认包含
# [/docs:recall-tags-any]


# [docs:recall-tags-any-strict]
response = client.recall(
    bank_id="my-bank",
    query="沟通偏好",
    tags=["user:alice"],
    tags_match="any_strict",
)
# 返回：
#   [匹配]    "Alice 偏好异步沟通"     — 包含 "user:alice"
#   [不匹配] "Bob 不喜欢冗长会议"             — 不相交于 ["user:alice"]
#   [匹配]    "团队用 Slack 发布通知"      — 包含 "user:alice"
#   [不匹配] "公司规定：周五不开会" — 无标签，排除
# [/docs:recall-tags-any-strict]


# [docs:recall-tags-all-mode]
response = client.recall(
    bank_id="my-bank",
    query="沟通工具",
    tags=["user:alice", "team"],
    tags_match="all",
)
# 返回：
#   [不匹配] "Alice 偏好异步沟通"     — 缺少 "team"
#   [不匹配] "Bob 不喜欢冗长会议"             — 缺少两个标签
#   [匹配]    "团队用 Slack 发布通知"      — 同时包含 "user:alice" and "team"
#   [匹配]    "公司规定：周五不开会" — 无标签，默认包含
# [/docs:recall-tags-all-mode]


# [docs:recall-tags-all-strict]
response = client.recall(
    bank_id="my-bank",
    query="沟通工具",
    tags=["user:alice", "team"],
    tags_match="all_strict",
)
# 返回：
#   [不匹配] "Alice 偏好异步沟通"     — 缺少 "team"
#   [不匹配] "Bob 不喜欢冗长会议"             — 缺少两个标签
#   [匹配]    "团队用 Slack 发布通知"      — 同时包含 "user:alice" and "team"
#   [不匹配] "公司规定：周五不开会" — 无标签，排除
# [/docs:recall-tags-all-strict]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")

print("recall.py: 所有示例通过")
