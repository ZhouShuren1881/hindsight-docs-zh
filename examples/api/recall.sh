#!/bin/bash
# Hindsight CLI 召回示例
# 运行：bash examples/api/recall.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# =============================================================================
# 准备，文档中不展示
# =============================================================================
hindsight memory retain my-bank "Alice 在 Google 担任软件工程师"
hindsight memory retain my-bank "Alice 喜欢周末徒步"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:recall-basic]
hindsight memory recall my-bank "Alice 做什么工作？"
# [/docs:recall-basic]


# [docs:recall-with-options]
hindsight memory recall my-bank "徒步建议" \
  --budget high \
  --max-tokens 8192
# [/docs:recall-with-options]


# [docs:recall-fact-type]
hindsight memory recall my-bank "query" --fact-type world,observation
# [/docs:recall-fact-type]


# [docs:recall-trace]
hindsight memory recall my-bank "query" --trace
# [/docs:recall-trace]


# [docs:recall-budget-levels]
# 快速查询
hindsight memory recall my-bank "Alice 的邮箱" --budget low

# 深入探索
hindsight memory recall my-bank "Alice 和 Bob 有什么关联？" --budget high
# [/docs:recall-budget-levels]


# [docs:recall-token-budget]
# 用相关记忆填充最多 4K token 上下文
hindsight memory recall my-bank "我对 Alice 了解什么？" --max-tokens 4096

# 快速查询使用较小预算
hindsight memory recall my-bank "Alice 的邮箱" --max-tokens 500
# [/docs:recall-token-budget]


# [docs:recall-source-facts]
# 召回观察及来源事实
hindsight memory recall my-bank "我了解 Alice 的哪些模式？" \
  --fact-type observation
# [/docs:recall-source-facts]


# [docs:recall-with-tags]
# 按用户标签筛选召回
hindsight memory recall my-bank "用户提供了什么反馈？" \
  --tags "user:alice"
# [/docs:recall-with-tags]


# [docs:recall-tags-strict]
# 严格模式只返回标签匹配记忆，排除无标签
hindsight memory recall my-bank "用户说了什么？" \
  --tags "user:alice" --tags-match any_strict
# [/docs:recall-tags-strict]


# [docs:recall-tags-all]
# AND 匹配，要求包含全部指定标签
hindsight memory recall my-bank "报告了哪些问题？" \
  --tags "user:alice,bug-report" --tags-match all_strict
# [/docs:recall-tags-all]


# [docs:recall-tags-any]
hindsight memory recall my-bank "沟通偏好" \
  --tags "user:alice" --tags-match any
# [/docs:recall-tags-any]


# [docs:recall-tags-any-strict]
hindsight memory recall my-bank "沟通偏好" \
  --tags "user:alice" --tags-match any_strict
# [/docs:recall-tags-any-strict]


# [docs:recall-tags-all-mode]
hindsight memory recall my-bank "沟通工具" \
  --tags "user:alice,team" --tags-match all
# [/docs:recall-tags-all-mode]


# [docs:recall-tags-all-strict]
hindsight memory recall my-bank "沟通工具" \
  --tags "user:alice,team" --tags-match all_strict
# [/docs:recall-tags-all-strict]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/my-bank" > /dev/null

echo "recall.sh: 所有示例通过"
