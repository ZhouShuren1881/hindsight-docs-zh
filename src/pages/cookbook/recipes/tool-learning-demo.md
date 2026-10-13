---
sidebar_position: 5
---

# 学习工具路由 {#routing-tool-learning}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/05-tool-learning-demo.ipynb)
:::


工具名称含糊时，Hindsight 可帮助 LLM 学会选择。无记忆时可能随机选相似工具，有记忆则可从交互反馈中学习，持续作出正确选择。

## 场景 {#the-scenario}

任务路由系统有两个工具：
- `route_to_channel_alpha`：路由到 Alpha 处理通道
- `route_to_channel_omega`：路由到 Omega 处理通道

名称和说明**有意含糊**，实际规则是：
- Alpha 处理**财务／付款**任务，如退款、账单
- Omega 处理**技术／支持**任务，如问题、功能

**没有 Hindsight：** 依据模糊说明随机猜测。  
**使用 Hindsight：** 从反馈学习各通道职责。

## 前置条件 {#prerequisites}

确保 Hindsight 正在运行：

```bash
export OPENAI_API_KEY=your-key

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=o3-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 安装 {#installation}


```python
!pip install hindsight-litellm hindsight-client litellm nest_asyncio python-dotenv -U -q
```

## 配置 {#setup}


```python
import os
import json
import uuid
import time
import logging
import nest_asyncio
from typing import Optional
from dotenv import load_dotenv

nest_asyncio.apply()
load_dotenv()

logging.basicConfig(level=logging.INFO)
logging.getLogger("LiteLLM").setLevel(logging.WARNING)
logging.getLogger("LiteLLM Router").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

import litellm
import hindsight_litellm
from hindsight_client import Hindsight

HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

if not os.getenv("OPENAI_API_KEY"):
    print("警告：未设置 OPENAI_API_KEY")
```

## 定义工具 {#define-tools}

工具定义**有意模糊**，说明不透露通道处理哪类请求。


```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "route_to_channel_alpha",
            "description": "将客户请求路由到 Alpha 处理通道。为适合的请求类型使用此通道。",
            "parameters": {
                "type": "object",
                "properties": {
                    "request_summary": {
                        "type": "string",
                        "description": "客户请求的简短摘要"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "请求优先级"
                    }
                },
                "required": ["request_summary"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_channel_omega",
            "description": "将客户请求路由到 Omega 处理通道。为适合的请求类型使用此通道。",
            "parameters": {
                "type": "object",
                "properties": {
                    "request_summary": {
                        "type": "string",
                        "description": "客户请求的简短摘要"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "请求优先级"
                    }
                },
                "required": ["request_summary"]
            }
        }
    }
]
```

## 测试场景 {#test-scenarios}

混合财务和技术请求，测试路由准确性。


```python
TEST_SCENARIOS = [
    {
        "type": "financial",
        "request": "上月订阅被扣费两次，需要退还重复款项。",
        "correct_tool": "route_to_channel_alpha"
    },
    {
        "type": "technical",
        "request": "上传超过 10 MB 的文件时应用总是崩溃，阻碍工作。",
        "correct_tool": "route_to_channel_omega"
    },
    {
        "type": "financial",
        "request": "发票金额错误，需要计费部门修正。",
        "correct_tool": "route_to_channel_alpha"
    },
    {
        "type": "technical",
        "request": "希望添加将报告导出为 PDF 的功能。",
        "correct_tool": "route_to_channel_omega"
    },
    {
        "type": "financial",
        "request": "需要更新付款方式，并了解上次付款失败原因。",
        "correct_tool": "route_to_channel_alpha"
    },
]
```

## 辅助函数 {#helper-functions}


```python
SYSTEM_PROMPT = """你是客服路由智能体，将请求交给合适通道。

可使用两个路由通道：
- route_to_channel_alpha：路由到 Alpha
- route_to_channel_omega：路由到 Omega

分析客户请求，选择最合适通道，必须调用一个路由函数。

重要：依据你了解的通道职责作出决定。若从历史交互学到各类请求由哪个通道处理，请应用该知识。"""


def make_routing_request(user_request: str, use_hindsight: bool, bank_id: Optional[str] = None):
    """发出路由请求，返回调用的工具。"""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"客户请求：{user_request}"}
    ]

    if use_hindsight and bank_id:
        response = hindsight_litellm.completion(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="required",
            temperature=0.0,
        )
    else:
        response = litellm.completion(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="required",
            temperature=0.7,
        )

    if response.choices[0].message.tool_calls:
        tool_call = response.choices[0].message.tool_calls[0]
        return tool_call.function.name
    return None


def store_feedback(bank_id: str, request: str, correct_tool: str, request_type: str):
    """存储某类请求应使用哪个工具的反馈。"""
    client = Hindsight(base_url=HINDSIGHT_API_URL, timeout=60.0)

    feedback_content = f"""路由反馈：
请求类型：{request_type}
客户请求：“{request}”
正确路由：{correct_tool}

已学规则：{request_type.upper()} 请求（如退款、计费、付款、扣费、发票）始终应路由到 {correct_tool}。
这是路由决策的重要组织知识。"""

    client.retain(
        bank_id=bank_id,
        content=feedback_content,
        context=f"routing:feedback:{request_type}",
        metadata={"request_type": request_type, "correct_tool": correct_tool}
    )
```

## 阶段一：无 Hindsight，无记忆 {#phase-1-without-hindsight-no-memory}

LLM 不知道通道职责，模糊说明可能导致错误路由。


```python
print("=" * 60)
print("阶段一：无 Hindsight，无记忆")
print("=" * 60)

phase1_results = []
for i, scenario in enumerate(TEST_SCENARIOS[:3], 1):
    print(f"\n--- 测试 {i}：{scenario['type'].upper()} 请求 ---")
    print(f"请求：\"{scenario['request'][:60]}...\"")

    tool_name = make_routing_request(scenario['request'], use_hindsight=False)

    is_correct = tool_name == scenario['correct_tool']
    phase1_results.append(is_correct)

    print(f"LLM 选择：{tool_name}")
    print(f"正确工具：{scenario['correct_tool']}")
    print(f"结果：{'✓ 正确' if is_correct else '✗ 错误'}")

phase1_accuracy = sum(phase1_results) / len(phase1_results) * 100
print(f"\n>>> 阶段一准确率：{phase1_accuracy:.0f}%（{sum(phase1_results)}/{len(phase1_results)}）")
```

## 阶段二：教学 {#phase-2-teaching-phase}

提供正确路由反馈建立记忆，模拟人类主管纠正 AI 决策。


```python
bank_id = f"tool-learning-{uuid.uuid4().hex[:8]}"
print(f"使用记忆库 ID：{bank_id}")

# 配置并启用 Hindsight
hindsight_litellm.configure(
    hindsight_api_url=HINDSIGHT_API_URL,
    bank_id=bank_id,
    store_conversations=True,
    inject_memories=True,
    max_memories=10,
    recall_budget="high",
    verbose=False,
)
hindsight_litellm.enable()

print("\n正在存储路由反馈……")

feedback_examples = [
    ("账户被错误扣费，需要退款。", "route_to_channel_alpha", "financial"),
    ("系统错误导致数据丢失。", "route_to_channel_omega", "technical"),
    ("账单有错误，需要更正。", "route_to_channel_alpha", "financial"),
    ("希望仪表盘添加新功能。", "route_to_channel_omega", "technical"),
]

for request, correct_tool, req_type in feedback_examples:
    print(f"  存储：{req_type.upper()} → {correct_tool}")
    store_feedback(bank_id, request, correct_tool, req_type)

print("\n等待 15 秒处理记忆……")
time.sleep(15)
print("完成！")
```

## 阶段三：使用 Hindsight，记忆增强 {#phase-3-with-hindsight-memory-augmented}

LLM 可获取已学路由知识，应依据过去反馈正确选择。


```python
print("=" * 60)
print("阶段三：使用 Hindsight，记忆增强")
print("=" * 60)

phase3_results = []
for i, scenario in enumerate(TEST_SCENARIOS, 1):
    print(f"\n--- 测试 {i}：{scenario['type'].upper()} 请求 ---")
    print(f"请求：\"{scenario['request'][:60]}...\"")

    tool_name = make_routing_request(
        scenario['request'],
        use_hindsight=True,
        bank_id=bank_id
    )

    is_correct = tool_name == scenario['correct_tool']
    phase3_results.append(is_correct)

    print(f"LLM 选择：{tool_name}")
    print(f"正确工具：{scenario['correct_tool']}")
    print(f"结果：{'✓ 正确' if is_correct else '✗ 错误'}")

phase3_accuracy = sum(phase3_results) / len(phase3_results) * 100
print(f"\n>>> 阶段三准确率：{phase3_accuracy:.0f}%（{sum(phase3_results)}/{len(phase3_results)}）")
```

## 结果说明 {#summary}


```python
print("=" * 60)
print("结果说明")
print("=" * 60)
print(f"\n阶段一（无记忆）：{phase1_accuracy:.0f}% 准确率")
print(f"阶段三（Hindsight）：{phase3_accuracy:.0f}% 准确率")

improvement = phase3_accuracy - phase1_accuracy
if improvement > 0:
    print(f"\n🎉 使用 Hindsight 后，准确率提高 {improvement:.0f} 个百分点！")
elif improvement == 0:
    print("\n提示：结果可能变化，再运行一次观察学习效果。")
else:
    print("\n提示：阶段一碰巧猜对了，再运行观察通常表现。")

print(f"记忆存储在库中：{bank_id}")
print(f"在界面查看：http://localhost:9999/banks/{bank_id}")

print("\n" + "=" * 60)
print("核心洞察")
print("=" * 60)
print("即使工具名称和说明含糊，Hindsight 也能让 LLM")
print("从经验学习应该选择哪个工具。")
```

## 清理 {#cleanup}


```python
hindsight_litellm.cleanup()

# 可选：删除记忆库
import requests
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/{bank_id}")
print(f"已删除记忆库：{response.json()}")
```
