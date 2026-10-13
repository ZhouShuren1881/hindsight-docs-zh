#!/usr/bin/env python3
"""
Hindsight 操作 API 示例（异步跟踪）。
运行： python examples/api/operations.py
"""
import asyncio
import os

from hindsight_client import Hindsight

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
client = Hindsight(base_url=HINDSIGHT_URL)


async def main() -> None:
    # 创建实际待处理操作，让后续按 ID 的端点有
    # 操作对象。使用异步路径（aretain_batch + retain_async=True）
    # 将全部保留同一事件循环，混合同步便利方法
    # 和异步 API 会破坏底层 HTTP 客户端。
    seeded = await client.aretain_batch(
        bank_id="my-bank",
        items=[{"content": "Alice 于 2023 年加入 Google"}],
        retain_async=True,
    )
    seeded_id = seeded.operation_id

    # [docs:operations-list]
    # 列出近期操作，默认最近 20 个。
    result = await client.operations.list_operations("my-bank")
    for op in result.operations:
        print(op.id, op.task_type, op.status)

    # 按状态和类型筛选。
    pending_recompute = await client.operations.list_operations(
        "my-bank", status="pending", type="graph_maintenance"
    )

    # 隐藏 retain_batch 父行，仅显示子存储任务。
    flat = await client.operations.list_operations("my-bank", exclude_parents=True)
    # [/docs:operations-list]

    # [docs:operations-get]
    status = await client.operations.get_operation_status("my-bank", seeded_id)
    print(status.status, status.error_message)

    # 包含提交载荷，批量存储可能较大。
    detailed = await client.operations.get_operation_status(
        "my-bank", seeded_id, include_payload=True
    )
    # [/docs:operations-get]

    # [docs:operations-cancel]
    # Worker 领取前取消待处理操作。
    # 已 processing/completed/failed 时返回 409。
    try:
        await client.operations.cancel_operation("my-bank", seeded_id)
    except Exception:
        # 已非待处理状态，此示例可接受。
        pass
    # [/docs:operations-cancel]

    # [docs:operations-retry]
    # 重新排队失败或取消操作。
    # 非 failed/cancelled 时返回 409。
    try:
        await client.operations.retry_operation("my-bank", seeded_id)
    except Exception:
        # 已不可重试终态，此处可接受。
        pass
    # [/docs:operations-retry]

    # [docs:operations-async-retain]
    # 异步提交批量，立即返回
    # 可轮询的 operation_id。
    submission = await client.aretain_batch(
        bank_id="my-bank",
        items=[
            {"content": "Alice 于 2023 年加入 Google"},
            {"content": "Bob 比起 JavaScript 更喜欢 Python"},
        ],
        retain_async=True,
    )
    op_id = submission.operation_id

    while True:
        s = await client.operations.get_operation_status("my-bank", op_id)
        if s.status in ("completed", "failed", "cancelled"):
            print(f"finished: {s.status}")
            break
        await asyncio.sleep(2)
    # [/docs:operations-async-retain]


asyncio.run(main())
