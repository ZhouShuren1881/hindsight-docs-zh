#!/usr/bin/env python3
"""
Hindsight 配置示例（逐次调用的记忆存储策略）。
运行： python examples/api/configuration.py
"""
import os

from hindsight_client import Hindsight

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
client = Hindsight(base_url=HINDSIGHT_URL)
bank_id = "strategy-demo-bank"
client.create_bank(bank_id=bank_id)
client.update_bank_config(
    bank_id,
    retain_default_strategy="conversations",
    retain_strategies={
        "conversations": {
            "retain_extraction_mode": "concise",
            "retain_chunk_size": 3000,
            "retain_structured_chunk_size": 12000,
        },
        "documents": {
            "retain_extraction_mode": "chunks",
            "retain_chunk_size": 800,
            "entity_labels": None,
            "entities_allow_free_form": False,
        },
    },
)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:retain-strategy]
# 使用默认策略 ("conversations")
client.retain_batch(bank_id, items=[{"content": "Alice 今天加入了团队"}])

# 显式使用文档策略
client.retain_batch(bank_id, items=[{"content": "...文档文本...", "strategy": "documents"}])
# [/docs:retain-strategy]

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
client.delete_bank(bank_id)
client.close()

print("configuration.py: 全部示例通过")
