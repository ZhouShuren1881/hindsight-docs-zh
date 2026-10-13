#!/usr/bin/env python3
"""
Hindsight 的观察（整合）示例。
运行：python examples/api/observations.py
"""
import asyncio
import os

from hindsight_client import Hindsight
from hindsight_client_api.models.consolidation_request import ConsolidationRequest

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
BANK_ID = "observations-demo-bank"


async def main():
    # =========================================================================
    # 初始化（不在文档中显示）
    # =========================================================================
    client = Hindsight(base_url=HINDSIGHT_URL)
    await client.acreate_bank(bank_id=BANK_ID)
    await client.aretain(bank_id=BANK_ID, content="Alice 偏好深色模式。", tags=["user:alice"])
    await client.aretain(bank_id=BANK_ID, content="工程团队在每周五发布。", tags=["team:engineering"])

    # =========================================================================
    # 文档示例
    # =========================================================================

    # [docs:targeted-consolidation]
    # 仅整合带有 user:alice 标签的记忆
    await client.banks.trigger_consolidation(
        bank_id=BANK_ID,
        consolidation_request=ConsolidationRequest(observation_scopes=[["user:alice"]]),
    )

    # 整合 alice 或工程团队的记忆
    await client.banks.trigger_consolidation(
        bank_id=BANK_ID,
        consolidation_request=ConsolidationRequest(
            observation_scopes=[["user:alice"], ["team:engineering"]]
        ),
    )
    # [/docs:targeted-consolidation]

    # [docs:clear-observations]
    # 清除记忆库中的所有观察
    await client.banks.clear_observations(bank_id=BANK_ID)
    # [/docs:clear-observations]

    # =========================================================================
    # 清理（不在文档中显示）
    # =========================================================================
    await client.adelete_bank(bank_id=BANK_ID)
    await client.aclose()
    print("observations.py：所有示例均已通过")


asyncio.run(main())
