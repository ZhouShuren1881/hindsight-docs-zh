#!/usr/bin/env python3
"""
Hindsight 记忆库 API 示例.
运行： python examples/api/memory-banks.py
"""
import os
import requests

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-bank]
client.create_bank(bank_id="my-bank")
# [/docs:create-bank]


# [docs:bank-with-disposition]
client.create_bank(bank_id="architect-bank")
client.update_bank_config(
    "architect-bank",
    reflect_mission="你是一位高级软件架构师，跟踪系统设计、"
            "技术决策和架构模式。相比前沿技术，优先简单性。",
    disposition_skepticism=4,   # 质疑新技术
    disposition_literalism=4,   # 关注具体规格
    disposition_empathy=2,      # 优先技术事实
)
# [/docs:bank-with-disposition]


# [docs:bank-background]
client.create_bank(bank_id="my-bank")
client.update_bank_config(
    "my-bank",
    reflect_mission="我是专注机器学习的研究助手。",
)
# [/docs:bank-background]


# [docs:bank-mission]
client.create_bank(bank_id="my-bank")
client.update_bank_config(
    "my-bank",
    reflect_mission="你是一位高级软件架构师，跟踪系统设计、"
            "技术决策和架构模式。",
)
# [/docs:bank-mission]


# [docs:bank-support-agent]
client.create_bank(bank_id="support-bank")
client.update_bank_config(
    "support-bank",
    observations_mission="我是客户支持智能体，跟踪客户偏好、"
            "重复问题和解决历史，以提供一致个性化支持。",
)
# [/docs:bank-support-agent]


# [docs:update-bank-config]
client.update_bank_config(
    "my-bank",
    retain_mission="始终包含技术决策、API 设计选择及架构取舍。忽略会议安排和社交交流。",
    retain_extraction_mode="verbose",
    observations_mission="观察是关于人员和项目的稳定事实。始终包含偏好、技能和重复模式，忽略一次性事件。",
    disposition_skepticism=4,
    disposition_literalism=4,
    disposition_empathy=2,
)
# [/docs:update-bank-config]


# [docs:get-bank-config]
# 返回解析配置（服务默认合并库覆盖）及原始覆盖
data = client.get_bank_config("my-bank")
# data["config"]     — 完整解析配置
# data["overrides"]  — 仅库级覆盖字段
# [/docs:get-bank-config]


# [docs:reset-bank-config]
# 移除全部库级覆盖，恢复服务默认
client.reset_bank_config("my-bank")
# [/docs:reset-bank-config]


# =============================================================================
# 提示预览和库转移（底层 API 仅异步）
# =============================================================================
import asyncio

TRANSFER_BANKS = ["transfer-py", "transfer-py-copy", "transfer-py-other", "transfer-py-clone"]


async def wait_for(client, bank_id: str, operation_id: str) -> None:
    for _ in range(120):
        status = await client.operations.get_operation_status(bank_id, operation_id)
        if status.status == "completed":
            return
        if status.status in ("failed", "cancelled"):
            raise RuntimeError(f"operation {operation_id} {status.status}: {status.error_message}")
        await asyncio.sleep(1)
    raise TimeoutError(f"operation {operation_id} 未完成")


async def transfer_examples() -> None:
    # 新客户端：上述同步调用运行在另一事件循环。
    client = Hindsight(base_url=HINDSIGHT_URL)
    for bank_id in TRANSFER_BANKS:
        requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/{bank_id}")
    # chunks 模式原样存文本，无需 LLM。
    await client.acreate_bank(bank_id="transfer-py")
    await client.aupdate_bank_config("transfer-py", retain_extraction_mode="chunks")
    await client.aretain_batch(
        "transfer-py",
        [
            {"content": "Alice 领导支付团队。", "document_id": "doc-1"},
            {"content": "Bob 调到柏林办公室。", "document_id": "doc-2"},
        ],
    )
    await client.acreate_bank(bank_id="transfer-py-other")

    # [docs:prompts-preview]
    from hindsight_client_api.models import PromptPreviewRequest

    preview = await client.banks.preview_prompt("my-bank", PromptPreviewRequest(operation="retain"))
    for message in preview.messages:
        print(message.role, len(message.blocks))
    # [/docs:prompts-preview]
    assert preview.messages

    # [docs:transfer-export]
    # 整个库，记忆和配置，不含历史.
    # 提交导出、轮询操作、下载 ZIP。
    archive = await client.aexport_bank("transfer-py")

    # 仅记忆
    memories_only = await client.aexport_bank("transfer-py", include_bank_config=False)

    # 特定文档，文档子集不含库级部分.
    # 底层仅提交，需自行轮询。
    submission = await client.bank_transfer.export_bank_transfer(
        "transfer-py", document_id=["doc-1", "doc-2"], include_bank_config=False
    )
    # [/docs:transfer-export]
    assert archive[:2] == b"PK" and memories_only[:2] == b"PK"
    await wait_for(client, "transfer-py", submission.operation_id)

    # [docs:transfer-import]
    # 以新 ID 恢复库
    operation_id = await client.aimport_bank("transfer-py", archive, target_bank_id="transfer-py-copy")
    # 恢复记录在 URL 的库，在那里轮询
    status = await client.operations.get_operation_status("transfer-py", operation_id)

    # 将归档文档合并到现有库
    submission = await client.bank_transfer.import_bank_transfer(
        "transfer-py-other",
        ("transfer-py.zip", archive),
        mode="merge",
        document_conflict="replace",
    )
    # [/docs:transfer-import]
    await wait_for(client, "transfer-py", operation_id)
    await wait_for(client, "transfer-py-other", submission.operation_id)
    copied = await client.documents.list_documents("transfer-py-copy")
    assert copied.total == 2, copied

    # [docs:clone-bank]
    operation_id = await client.aclone_bank("transfer-py", "transfer-py-clone")
    # 操作记录在来源库
    status = await client.operations.get_operation_status("transfer-py", operation_id)
    # [/docs:clone-bank]
    await wait_for(client, "transfer-py", operation_id)
    cloned = await client.documents.list_documents("transfer-py-clone")
    assert cloned.total == 2, cloned

    # [docs:document-export]
    # 提交整库导出，传 document_ids=[...] 限定，
    # 轮询至完成，下载归档。
    archive = await client.aexport_documents("transfer-py")
    with open("transfer-py-documents.zip", "wb") as f:
        f.write(archive)
    # [/docs:document-export]
    assert archive[:2] == b"PK"

    # [docs:document-import]
    with open("transfer-py-documents.zip", "rb") as f:
        submission = await client.document_transfer.import_documents(
            "transfer-py-other", ("transfer-py-documents.zip", f.read()), on_conflict="replace"
        )

    status = await client.operations.get_operation_status("transfer-py-other", submission.operation_id)
    # status.result_metadata -> {"documents_imported": 3, "facts_imported": 42, "observations_imported": 5, ...}
    # [/docs:document-import]
    await wait_for(client, "transfer-py-other", submission.operation_id)
    os.remove("transfer-py-documents.zip")

    # [docs:transfer-import-external]
    import io
    import json
    import zipfile

    doc = {
        "id": "session-2026-09-22",
        "original_text": "完整原始会话文本...",
        "chunks": [{"chunk_index": 0, "chunk_text": "调用方定义的来源区域..."}],
        "facts": [
            {
                "text": "用户偏好轻量本地语音识别模型。",
                "fact_type": "experience",
                "chunk_index": 0,
                "mentioned_at": "2026-09-22T18:34:00Z",
                "entities": ["Parakeet"],
            }
        ],
    }
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("manifest.json", json.dumps({"schema_version": 1, "source_bank_id": "external"}))
        z.writestr(f"documents/{doc['id']}.json", json.dumps(doc))

    submission = await client.bank_transfer.import_bank_transfer(
        "transfer-py-other",
        ("import.zip", buf.getvalue()),
        mode="merge",
        document_conflict="replace",
    )
    # [/docs:transfer-import-external]
    await wait_for(client, "transfer-py-other", submission.operation_id)
    imported = await client.documents.get_document("transfer-py-other", "session-2026-09-22")
    assert imported.memory_unit_count == 1, imported

    for bank_id in TRANSFER_BANKS:
        requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/{bank_id}")
    await client.aclose()


asyncio.run(transfer_examples())


# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/my-bank")
requests.delete(f"{HINDSIGHT_URL}/v1/default/banks/architect-bank")

print("memory-banks.py: 全部示例通过")
