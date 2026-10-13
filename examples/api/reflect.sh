#!/bin/bash
# Hindsight CLI 反思示例
# 运行：bash examples/api/reflect.sh

set -e

HINDSIGHT_URL="${HINDSIGHT_API_URL:-http://localhost:8888}"

# =============================================================================
# 准备，文档中不展示
# =============================================================================
hindsight memory retain my-bank "Alice 在 Google 担任软件工程师"
hindsight memory retain my-bank "Alice 已在那里工作五年"

# =============================================================================
# 文档示例
# =============================================================================

# [docs:reflect-basic]
hindsight memory reflect my-bank "你了解 Alice 什么？"
# [/docs:reflect-basic]


# [docs:reflect-with-context]
hindsight memory reflect my-bank "应该学 Python 吗？" --context "职业建议"
# [/docs:reflect-with-context]


# [docs:reflect-with-params]
hindsight memory reflect my-bank "总结这一周" --budget high --max-tokens 8192
# [/docs:reflect-with-params]


# [docs:reflect-disposition]
hindsight bank set-config my-bank \
  --disposition-skepticism 5 \
  --disposition-literalism 4 \
  --disposition-empathy 2
hindsight memory reflect my-bank "应该投资加密货币吗？"
# [/docs:reflect-disposition]


# [docs:reflect-sources]
hindsight memory reflect my-bank "介绍一下 Alice" --include-facts
# [/docs:reflect-sources]


# [docs:reflect-with-tags]
hindsight memory reflect my-bank "用户提供了什么反馈？" \
  --tags "user:alice" --tags-match any_strict
# [/docs:reflect-with-tags]


# [docs:reflect-structured-output]
# 先创建 schema.json：
cat > schema.json << 'EOF'
{
  "type": "object",
  "properties": {
    "recommendation": {"type": "string"},
    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
    "key_factors": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["recommendation", "confidence", "key_factors"]
}
EOF

# 然后使用 --schema：
hindsight memory reflect hiring-team \
  "应该聘 Alice 为机器学习团队负责人吗？" \
  --schema schema.json

# 清理临时 schema 文件
rm -f schema.json
# [/docs:reflect-structured-output]


# =============================================================================
# 清理，文档中不展示
# =============================================================================
curl -s -X DELETE "${HINDSIGHT_URL}/v1/default/banks/my-bank" > /dev/null

echo "reflect.sh: 所有示例通过"
