#!/usr/bin/env python3
"""
Hindsight 心智模型 API 示例.
运行： python examples/api/mental-models.py
"""
import os
import time

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
BANK_ID = "mental-models-demo-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

# 建库并初始化数据
client.create_bank(bank_id=BANK_ID, name="心智模型演示")
client.retain(bank_id=BANK_ID, content="团队偏好通过 Slack 异步沟通")
client.retain(bank_id=BANK_ID, content="紧急问题使用 #incidents 频道")
client.retain(bank_id=BANK_ID, content="每周同步会议在周一上午 10 点")

# 等待数据处理
time.sleep(2)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-mental-model]
# 创建心智模型，后台反思
result = client.create_mental_model(
    bank_id=BANK_ID,
    name="团队沟通偏好",
    source_query="团队偏好如何沟通？",
    tags=["team", "communication"]
)

# 返回 operation_id，通过操作端点检查完成
print(f"操作 ID： {result.operation_id}")
# [/docs:create-mental-model]

# [docs:create-mental-model-with-id]
# 创建指定自定义 ID 的心智模型
result_with_id = client.create_mental_model(
    bank_id=BANK_ID,
    name="沟通政策",
    source_query="团队沟通准则是什么？",
    id="communication-policy"
)

print(f"使用自定义 ID 创建： {result_with_id.operation_id}")
# [/docs:create-mental-model-with-id]

# 等待模型创建
time.sleep(5)

# [docs:create-mental-model-with-trigger]
# 创建启用自动刷新的心智模型
result = client.create_mental_model(
    bank_id=BANK_ID,
    name="项目状态",
    source_query="当前项目状态如何？",
    trigger={"refresh_cron": "0 3 * * *"}
)

# 每天 03:00 UTC 检查，范围记忆改变时刷新
print(f"操作 ID： {result.operation_id}")
# [/docs:create-mental-model-with-trigger]

# [docs:create-mental-model-tags-match]
# 覆盖刷新时模型标签筛选来源的方式。
# 带标签模型默认 all_strict，记忆需包含全部标签；
# 每条记忆仅单主题时用 any，
# 刷新读取至少带一个模型标签的记忆。
result = client.create_mental_model(
    bank_id=BANK_ID,
    name="当前项目",
    source_query="用户目前处理哪些项目？",
    tags=["projects", "mental-model"],
    trigger={"tags_match": "any"}
)

print(f"操作 ID： {result.operation_id}")
# [/docs:create-mental-model-tags-match]

# 等待模型创建
time.sleep(5)

# [docs:list-mental-models]
# 列出全部心智模型，默认仅元数据；
# detail="content" 添加 source_query/content/trigger。
mental_models = client.list_mental_models(bank_id=BANK_ID, detail="content")

for mental_model in mental_models.items:
    print(f"- {mental_model.name}: {mental_model.source_query}")
# [/docs:list-mental-models]

# 获取模型 ID 供后续示例
mental_model_id = mental_models.items[0].id if mental_models.items else None

if mental_model_id:
    # [docs:get-mental-model]
    # 获取指定心智模型
    mental_model = client.get_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    print(f"Name: {mental_model.name}")
    print(f"Content: {mental_model.content}")
    print(f"上次刷新： {mental_model.last_refreshed_at}")
    # [/docs:get-mental-model]


    # [docs:refresh-mental-model]
    # 刷新心智模型，更新为当前知识
    result = client.refresh_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    print(f"刷新操作 ID： {result.operation_id}")
    # [/docs:refresh-mental-model]


    # [docs:clear-mental-model]
    # 清空内容再刷新，完整重新综合
    client.clear_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    # 触发全新完整重建
    result = client.refresh_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    print(f"完整刷新操作 ID： {result.operation_id}")
    # [/docs:clear-mental-model]


    # [docs:update-mental-model]
    # 更新模型元数据
    updated = client.update_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id,
        name="更新后的团队沟通偏好",
        trigger={"refresh_after_consolidation": True}  # 启用自动刷新
    )

    print(f"更新后名称： {updated.name}")
    # [/docs:update-mental-model]


    # [docs:get-mental-model-history]
    # 获取模型变更历史
    history = client.get_mental_model_history(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    for entry in history:
        print(f"变更时间： {entry['changed_at']}")
        print(f"此前内容： {entry['previous_content']}")
    # [/docs:get-mental-model-history]

    # [docs:mental-model-detail]
    # 列表默认仅元数据，最小响应
    client.list_mental_models(bank_id=BANK_ID)

    # 列表包含内容，不含来源链，需显式选择
    client.list_mental_models(bank_id=BANK_ID, detail="content")

    # 获取单模型，默认完整细节
    client.get_mental_model(bank_id=BANK_ID, mental_model_id=mental_model_id)
    # [/docs:mental-model-detail]

    # [docs:dry-run-refresh]
    # 预览刷新，不写入
    preview = client.dry_run_refresh_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )

    print(f"模式： {preview.effective_mode}, 将持久保存： {preview.would_persist}")
    print(preview.diff)
    # [/docs:dry-run-refresh]

    # [docs:keep-trace]
    # 记录每次刷新（含计划）如何得出结果
    client.update_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id,
        trigger={"mode": "delta", "keep_trace": True}
    )
    # [/docs:keep-trace]

    # [docs:delete-mental-model]
    # 删除心智模型
    client.delete_mental_model(
        bank_id=BANK_ID,
        mental_model_id=mental_model_id
    )
    # [/docs:delete-mental-model]


# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
client.delete_bank(bank_id=BANK_ID)

print("mental-models.py: 全部示例通过")
