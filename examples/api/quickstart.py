#!/usr/bin/env python3
"""
Hindsight API 快速开始示例。
运行：python examples/api/quickstart.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:quickstart-full]
from hindsight_client import Hindsight

client = Hindsight(base_url="http://localhost:8888")

# Retain：存储信息
client.retain(bank_id="my-bank", content="Alice 在 Google 担任软件工程师")

# Recall：搜索记忆
client.recall(bank_id="my-bank", query="Alice 做什么工作？")

# Reflect：生成考虑性格倾向的回答
client.reflect(bank_id="my-bank", query="介绍一下 Alice")
# [/docs:quickstart-full]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")

print("quickstart.py: 所有示例通过")
