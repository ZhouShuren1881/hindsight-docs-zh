#!/usr/bin/env python3
"""
Hindsight 指令 API 示例.
运行： python examples/api/directives.py
"""
import os

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
BANK_ID = "directives-example-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# 创建测试记忆库
client.create_bank(bank_id=BANK_ID, name="测试记忆库")

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-directive]
# 创建指令（反思的硬性规则）
directive = client.create_directive(
    bank_id=BANK_ID,
    name="正式语言",
    content="始终使用正式英语回复，避免俚语和口语表达。"
)

print(f"已创建指令： {directive.id}")
# [/docs:create-directive]

directive_id = directive.id

# [docs:list-directives]
# 列出记忆库中的全部指令
directives = client.list_directives(bank_id=BANK_ID)

for d in directives.items:
    print(f"- {d.name}: {d.content[:50]}...")
# [/docs:list-directives]

# [docs:update-directive]
# 更新指令（如禁用而不删除）
updated = client.update_directive(
    bank_id=BANK_ID,
    directive_id=directive_id,
    is_active=False
)

print(f"指令启用状态： {updated.is_active}")
# [/docs:update-directive]

# [docs:delete-directive]
# 删除指令
client.delete_directive(
    bank_id=BANK_ID,
    directive_id=directive_id
)
# [/docs:delete-directive]

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
client.delete_bank(bank_id=BANK_ID)

print("directives.py: 全部示例通过")
