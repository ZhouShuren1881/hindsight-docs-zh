#!/usr/bin/env python3
"""
Hindsight 记忆 API 示例 — 读取、列出和整理记忆单元。
运行： python examples/api/memories.py
"""
import asyncio
import os

from hindsight_client import Hindsight
from hindsight_client_api.models.update_memory_request import UpdateMemoryRequest

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
BANK_ID = "memories-demo-bank"


async def wait_for_idle(client, bank_id, *, attempts=120, interval=0.5):
    """阻塞至记忆库没有 pending/processing 异步操作。

    存储及每次 update_memory 编辑都会在后台重新嵌入和整合。
    整理步骤之间排空队列可让示例行为确定，
    否则后一步可能与前一步重新整合竞争，
    在单元正被改写时产生 404。
    """
    await asyncio.sleep(interval)  # let the just-submitted operation register
    for _ in range(attempts):
        busy = False
        for state in ("pending", "processing"):
            res = await client.operations.list_operations(
                bank_id=bank_id, status=state, limit=1
            )
            if res.operations:
                busy = True
                break
        if not busy:
            return
        await asyncio.sleep(interval)


async def main():
    # =========================================================================
    # 初始化（不在文档中展示）
    # =========================================================================
    client = Hindsight(base_url=HINDSIGHT_URL)
    await client.acreate_bank(bank_id=BANK_ID, name="记忆演示")
    await client.aretain(bank_id=BANK_ID, content="助手在 2023 年访问巴黎。")
    await client.aretain(bank_id=BANK_ID, content="部署服务器 srv-04 运行 PostgreSQL 14。")
    await wait_for_idle(client, BANK_ID)  # let extraction + consolidation finish

    # =========================================================================
    # 文档示例
    # =========================================================================

    # [docs:list-memories]
    # 列出记忆单元，默认包含失效行。
    memories = await client.memory.list_memories(bank_id=BANK_ID)
    for unit in memories.items:
        print(f"- [{unit.fact_type}] {unit.text}")

    # 仅筛选失效事实，如审查重复项.
    invalidated = await client.memory.list_memories(bank_id=BANK_ID, state="invalidated")
    print(f"{len(invalidated.items)} 条失效事实")
    # [/docs:list-memories]

    # 派生观察展示来源到达时的演变。应在
    # 以下编辑/失效/恢复之前读取；每次 update_memory
    # 都重新整合并以新 ID 创建观察，因此提前获取的 ID
    # 之后会过时，get_observation_history 会 404。
    observation = next((u for u in memories.items if u.fact_type == "observation"), None)
    if observation is not None:
        # [docs:observation-history]
        # 获取派生观察刷新历史.
        history = await client.memory.get_observation_history(
            bank_id=BANK_ID, memory_id=observation.id
        )
        print(f"观察历史条目： {len(history)}")
        # [/docs:observation-history]

    # 选择原始事实供后续示例整理。
    fact = next((u for u in memories.items if u.fact_type in ("world", "experience")), None)
    if fact is None:
        await client.adelete_bank(bank_id=BANK_ID)
        print("memories.py: 全部示例通过 (尚未提取事实)")
        return
    memory_id = fact.id

    # [docs:get-memory]
    # 获取单个记忆单元（含元数据、实体、日期、状态）。
    memory = await client.memory.get_memory(bank_id=BANK_ID, memory_id=memory_id)

    print(f"Text: {memory['text']}")
    print(f"Type: {memory['type']}  Entities: {memory['entities']}")
    # [/docs:get-memory]

    # [docs:edit-memory]
    # 修正文本，重新嵌入、移除派生观察及链接，
    # 自动重新整合并重算图。
    await client.memory.update_memory(
        bank_id=BANK_ID,
        memory_id=memory_id,
        update_memory_request=UpdateMemoryRequest(
            text="用户在 2023 年访问巴黎。",
            reason="主体错误",
        ),
    )
    # [/docs:edit-memory]

    # 文本编辑在后台重新整合；等待完成再进行下一次编辑，
    # 避免再次访问时单元正被重写。
    await wait_for_idle(client, BANK_ID)

    # [docs:edit-memory-fields]
    # 一次修正日期、类型和实体。空字符串清字段；
    # entities 替换集合（[] 全解除），省略则不变。
    # resolve_entities=False 防止输入实体名匹配
    # 到已有的相似实体。
    await client.memory.update_memory(
        bank_id=BANK_ID,
        memory_id=memory_id,
        update_memory_request=UpdateMemoryRequest(
            occurred_start="2023-06-01",
            fact_type="experience",
            entities=["Alice", "Paris"],
            resolve_entities=False,
        ),
    )
    # [/docs:edit-memory-fields]

    await wait_for_idle(client, BANK_ID)

    # [docs:invalidate-memory]
    # 使事实软失效：移出召回/整合/图，剪除链接，
    # 重新计算不含它的观察，但保留审计。
    await client.memory.update_memory(
        bank_id=BANK_ID,
        memory_id=memory_id,
        update_memory_request=UpdateMemoryRequest(
            state="invalidated",
            reason="服务器于 2026-06-01 停用",
        ),
    )
    # [/docs:invalidate-memory]

    # 失效也在后台派生观察；先排空队列，
    # 避免后续恢复与跨表移动单元竞争。
    await wait_for_idle(client, BANK_ID)

    # [docs:restore-memory]
    # 恢复此前失效事实。
    await client.memory.update_memory(
        bank_id=BANK_ID,
        memory_id=memory_id,
        update_memory_request=UpdateMemoryRequest(state="valid"),
    )
    # [/docs:restore-memory]

    # =========================================================================
    # 清理（不在文档中展示）
    # =========================================================================
    await client.adelete_bank(bank_id=BANK_ID)
    print("memories.py: 全部示例通过")


asyncio.run(main())
