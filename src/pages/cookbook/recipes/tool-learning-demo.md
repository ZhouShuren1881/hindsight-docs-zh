---
sidebar_position: 5
---

# 工具路由学习 {#routing-tool-learning}


:::tip 运行此笔记本
此示例提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/05-tool-learning-demo.ipynb)
:::


本笔记本演示工具名称含糊时，Hindsight 如何帮助 LLM 学会选择合适的工具。没有记忆时，LLM 可能会在名称相似的工具之间随机选择；使用 Hindsight 后，它可以从过去的交互中学习，并持续作出正确选择。

## 场景 {#the-scenario}

我们有一个任务路由系统，其中包含两个工具：
- `route_to_channel_alpha`：路由到 Alpha 处理通道
- `route_to_channel_omega`：路由到 Omega 处理通道

工具名称和说明**有意写得含糊**。实际规则如下：
- Alpha 处理**财务/付款**任务，如退款、账单等。
- Omega 处理**技术/支持**任务，如缺陷、功能需求等。

**没有 Hindsight：** 依据模糊说明随机猜测。  
**使用 Hindsight：** LLM 从反馈中学习各通道的职责。

## 前置条件 {#prerequisites}

请先确保 Hindsight 已启动：

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

## 设置 {#setup}


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
    print("Warning: OPENAI_API_KEY not set")
```

## 定义工具 {#define-tools}

这些工具定义**有意含糊**，其说明不会透露每个通道负责处理哪类请求。


```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "route_to_channel_alpha",
            "description": "Routes the customer request to processing channel Alpha. Use this channel for appropriate request types.",
            "parameters": {
                "type": "object",
                "properties": {
                    "request_summary": {
                        "type": "string",
                        "description": "A brief summary of the customer's request"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Priority level of the request"
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
            "description": "Routes the customer request to processing channel Omega. Use this channel for appropriate request types.",
            "parameters": {
                "type": "object",
                "properties": {
                    "request_summary": {
                        "type": "string",
                        "description": "A brief summary of the customer's request"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Priority level of the request"
                    }
                },
                "required": ["request_summary"]
            }
        }
    }
]
```

## 测试场景 {#test-scenarios}

下面混合了财务和技术请求，用于测试路由准确性。


```python
TEST_SCENARIOS = [
    {
        "type": "financial",
        "request": "I was charged twice for my subscription last month. I need a refund for the duplicate charge.",
        "correct_tool": "route_to_channel_alpha"
    },
    {
        "type": "technical",
        "request": "The app keeps crashing when I try to upload a file larger than 10MB. This bug is blocking my work.",
        "correct_tool": "route_to_channel_omega"
    },
    {
        "type": "financial",
        "request": "My invoice shows an incorrect amount. The billing department needs to fix this.",
        "correct_tool": "route_to_channel_alpha"
    },
    {
        "type": "technical",
        "request": "I'd like to request a new feature: the ability to export reports as PDF.",
        "correct_tool": "route_to_channel_omega"
    },
    {
        "type": "financial",
        "request": "I need to update my payment method and understand why my last payment failed.",
        "correct_tool": "route_to_channel_alpha"
    },
]
```

## 辅助函数 {#helper-functions}


```python
SYSTEM_PROMPT = """You are a customer service routing agent. Your job is to route customer requests to the appropriate processing channel.

You have access to two routing channels:
- route_to_channel_alpha: Routes to channel Alpha
- route_to_channel_omega: Routes to channel Omega

Analyze the customer's request and route it to the most appropriate channel. You must call one of the routing functions to process the request.

Important: Base your routing decision on what you know about each channel's purpose. If you have learned from previous interactions which channel handles specific types of requests, use that knowledge."""


def make_routing_request(user_request: str, use_hindsight: bool, bank_id: Optional[str] = None):
    """Make a routing request and return the tool called."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Customer Request: {user_request}"}
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
    """Store feedback about which tool was correct for a request type."""
    client = Hindsight(base_url=HINDSIGHT_API_URL, timeout=60.0)

    feedback_content = f"""ROUTING FEEDBACK:
Request type: {request_type}
Customer request: "{request}"
Correct routing: {correct_tool}

LEARNED RULE: {request_type.upper()} requests (like refunds, billing, payments, charges, invoices) should ALWAYS be routed to {correct_tool}.
This is important institutional knowledge for routing decisions."""

    client.retain(
        bank_id=bank_id,
        content=feedback_content,
        context=f"routing:feedback:{request_type}",
        metadata={"request_type": request_type, "correct_tool": correct_tool}
    )
```

## 阶段一：无 Hindsight，无记忆 {#phase-1-without-hindsight-no-memory}

LLM 事先不知道各通道的职责。面对含糊的工具说明，它可能会把请求路由到错误的通道。


```python
print("=" * 60)
print("PHASE 1: WITHOUT HINDSIGHT (No Memory)")
print("=" * 60)

phase1_results = []
for i, scenario in enumerate(TEST_SCENARIOS[:3], 1):
    print(f"\n--- Test {i}: {scenario['type'].upper()} Request ---")
    print(f"Request: \"{scenario['request'][:60]}...\"")

    tool_name = make_routing_request(scenario['request'], use_hindsight=False)

    is_correct = tool_name == scenario['correct_tool']
    phase1_results.append(is_correct)

    print(f"LLM chose: {tool_name}")
    print(f"Correct tool: {scenario['correct_tool']}")
    print(f"Result: {'✓ CORRECT' if is_correct else '✗ INCORRECT'}")

phase1_accuracy = sum(phase1_results) / len(phase1_results) * 100
print(f"\n>>> Phase 1 Accuracy: {phase1_accuracy:.0f}% ({sum(phase1_results)}/{len(phase1_results)})")
```

## 阶段二：教学 {#phase-2-teaching-phase}

现在提供正确路由的反馈，以建立记忆。这模拟了人工主管纠正 AI 路由决策的过程。


```python
bank_id = f"tool-learning-{uuid.uuid4().hex[:8]}"
print(f"Using bank_id: {bank_id}")

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

print("\nStoring routing feedback...")

feedback_examples = [
    ("I need a refund for an incorrect charge on my account.", "route_to_channel_alpha", "financial"),
    ("There's a bug in the system causing data loss.", "route_to_channel_omega", "technical"),
    ("My billing statement has errors that need correction.", "route_to_channel_alpha", "financial"),
    ("I want to request a new feature for the dashboard.", "route_to_channel_omega", "technical"),
]

for request, correct_tool, req_type in feedback_examples:
    print(f"  Storing: {req_type.upper()} → {correct_tool}")
    store_feedback(bank_id, request, correct_tool, req_type)

print("\nWaiting 15 seconds for Hindsight to process memories...")
time.sleep(15)
print("Done!")
```

## 阶段三：使用 Hindsight，记忆增强 {#phase-3-with-hindsight-memory-augmented}

现在，LLM 可以通过 Hindsight 获取学到的路由知识，并应根据过去收到的反馈正确处理请求。


```python
print("=" * 60)
print("PHASE 3: WITH HINDSIGHT (Memory-Augmented)")
print("=" * 60)

phase3_results = []
for i, scenario in enumerate(TEST_SCENARIOS, 1):
    print(f"\n--- Test {i}: {scenario['type'].upper()} Request ---")
    print(f"Request: \"{scenario['request'][:60]}...\"")

    tool_name = make_routing_request(
        scenario['request'],
        use_hindsight=True,
        bank_id=bank_id
    )

    is_correct = tool_name == scenario['correct_tool']
    phase3_results.append(is_correct)

    print(f"LLM chose: {tool_name}")
    print(f"Correct tool: {scenario['correct_tool']}")
    print(f"Result: {'✓ CORRECT' if is_correct else '✗ INCORRECT'}")

phase3_accuracy = sum(phase3_results) / len(phase3_results) * 100
print(f"\n>>> Phase 3 Accuracy: {phase3_accuracy:.0f}% ({sum(phase3_results)}/{len(phase3_results)})")
```

## 总结 {#summary}


```python
print("=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"\nPhase 1 (No Memory):      {phase1_accuracy:.0f}% accuracy")
print(f"Phase 3 (With Hindsight): {phase3_accuracy:.0f}% accuracy")

improvement = phase3_accuracy - phase1_accuracy
if improvement > 0:
    print(f"\n🎉 Improvement: +{improvement:.0f}% accuracy with Hindsight!")
elif improvement == 0:
    print(f"\nNote: Results may vary. Run again to see learning effect.")
else:
    print(f"\nNote: Phase 1 got lucky! Run again to see typical behavior.")

print(f"\nMemories stored in bank: {bank_id}")
print(f"View in UI: http://localhost:9999/banks/{bank_id}")

print("\n" + "=" * 60)
print("KEY INSIGHT")
print("=" * 60)
print("Hindsight allows the LLM to learn from experience which tool")
print("to use, even when tool names/descriptions are ambiguous.")
```

## 清理 {#cleanup}


```python
hindsight_litellm.cleanup()

# 可选：删除记忆库
import requests
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/{bank_id}")
print(f"Deleted bank: {response.json()}")
```
