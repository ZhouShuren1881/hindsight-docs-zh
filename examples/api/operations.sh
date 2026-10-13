#!/bin/bash
# Hindsight 操作 API 示例 CLI
# 运行： bash examples/api/operations.sh

set -e

BANK_ID="my-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
# 异步存储创建实际待处理 ID，以测试
# 后续获取/取消。
OPERATION_ID=$(
  hindsight memory retain "$BANK_ID" "操作示例初始化 1" --async -o json \
    | jq -r '.operation_id'
)


# =============================================================================
# 文档示例
# =============================================================================

# [docs:operations-list]
hindsight operation list my-bank
# [/docs:operations-list]


# [docs:operations-get]
hindsight operation get my-bank "$OPERATION_ID"
# [/docs:operations-get]


# [docs:operations-cancel]
hindsight operation cancel my-bank "$OPERATION_ID"
# [/docs:operations-cancel]


# 重试初始化：创建并取消另一操作，使其可重试。
OPERATION_ID=$(
  hindsight memory retain "$BANK_ID" "重试示例初始化 2" --async -o json \
    | jq -r '.operation_id'
)
hindsight operation cancel "$BANK_ID" "$OPERATION_ID" >/dev/null


# [docs:operations-retry]
hindsight operation retry my-bank "$OPERATION_ID"
# [/docs:operations-retry]


# [docs:operations-async-retain]
# 提交异步存储，从 JSON 获取 ID。
OPERATION_ID=$(
  hindsight memory retain my-bank "Alice 于 2023 年加入 Google" --async -o json \
    | jq -r '.operation_id'
)

# 轮询至完成，completed/failed/cancelled 均终态。
while true; do
  STATUS=$(hindsight operation get my-bank "$OPERATION_ID" -o json | jq -r '.status')
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
    echo "finished: $STATUS"
    break
  fi
  sleep 2
done
# [/docs:operations-async-retain]
