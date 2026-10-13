#!/usr/bin/env python3
"""
Hindsight 记忆库模板 API 示例.
运行： python examples/api/bank-templates.py
"""
import json
import os

import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:import-template]
template = {
    "version": "1",
    "bank": {
        "retain_mission": "提取客户问题、解决方案和情绪。",
        "enable_observations": True,
        "observations_mission": "跟踪重复出现的客户痛点。",
    },
    "mental_models": [
        {
            "id": "sentiment-overview",
            "name": "客户情绪概览",
            "source_query": "整体情绪趋势是什么？",
            "trigger": {"refresh_after_consolidation": True},
        }
    ],
    "directives": [
        {
            "name": "认可不满情绪",
            "content": "提供解决方案前，始终先认可用户的不满情绪。",
            "priority": 10,
        }
    ],
}

response = requests.post(
    f"{HINDSIGHT_URL}/v1/default/banks/my-bank/import",
    json=template,
)
result = response.json()
print(f"已应用配置： {result['config_applied']}")
print(f"已创建心智模型： {result['mental_models_created']}")
print(f"已创建指令： {result['directives_created']}")
# [/docs:import-template]


# [docs:import-dry-run]
response = requests.post(
    f"{HINDSIGHT_URL}/v1/default/banks/my-bank/import",
    params={"dry_run": "true"},
    json=template,
)
result = response.json()
print(f"试运行： {result['dry_run']}")
print(f"将应用配置： {result['config_applied']}")
# [/docs:import-dry-run]


# [docs:export-template]
response = requests.get(
    f"{HINDSIGHT_URL}/v1/default/banks/my-bank/export"
)
exported = response.json()
print(json.dumps(exported, indent=2))
# [/docs:export-template]


# [docs:export-reimport]
# 从来源记忆库导出
response = requests.get(
    f"{HINDSIGHT_URL}/v1/default/banks/source-bank/export"
)
exported = response.json()

# 导入新记忆库
response = requests.post(
    f"{HINDSIGHT_URL}/v1/default/banks/new-bank/import",
    json=exported,
)
# [/docs:export-reimport]


# [docs:get-schema]
response = requests.get(
    f"{HINDSIGHT_URL}/v1/bank-template-schema"
)
schema = response.json()
print(json.dumps(schema, indent=2))
# [/docs:get-schema]
