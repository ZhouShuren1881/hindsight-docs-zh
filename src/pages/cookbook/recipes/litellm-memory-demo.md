---
sidebar_position: 4
---

# 通过 LiteLLM 使用记忆 {#memory-with-litellm}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/04-litellm-memory-demo.ipynb)
:::


本笔记本演示如何使用 `hindsight-litellm` 包为任意 LLM 应用添加持久记忆。记忆存储和注入通过 LiteLLM 回调自动完成，无需手动管理记忆！

**演示的核心功能：**
1. `configure()` + `enable()`：设置自动记忆集成
2. 自动存储：每次 LLM 调用后存储对话
3. 自动注入：向提示词注入相关记忆

`hindsight-litellm` 包接入 LiteLLM 的回调系统，以便：
- 在成功收到 LLM 响应后存储每段对话
- 在调用 LLM 前向系统提示词注入相关记忆

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

- API: http://localhost:8888
- UI: http://localhost:9999

## 安装 {#installation}


```python
!pip install hindsight-litellm litellm nest_asyncio python-dotenv -U -q
```

## 配置 {#setup}


```python
import os
import uuid
import time
import logging
import nest_asyncio
from dotenv import load_dotenv

# 应用 nest_asyncio，以兼容 Jupyter
nest_asyncio.apply()

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logging.getLogger("LiteLLM").setLevel(logging.WARNING)
logging.getLogger("LiteLLM Router").setLevel(logging.WARNING)
logging.getLogger("LiteLLM Proxy").setLevel(logging.WARNING)

# 导入 hindsight_litellm
import hindsight_litellm

# 配置
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")

# 检查 API 密钥
if not os.getenv("OPENAI_API_KEY"):
    print("Warning: OPENAI_API_KEY not set")
```

## 配置并启用自动记忆 {#configure-and-enable-automatic-memory}

只需完成这些设置，之后所有 LiteLLM 调用都会自动：
- 在提示词中注入相关记忆
- 在响应后将对话存储到 Hindsight


```python
# 为本次演示生成唯一的 bank_id
bank_id = f"demo-{uuid.uuid4().hex[:8]}"
print(f"Using bank_id: {bank_id}")

# 配置并启用 Hindsight
hindsight_litellm.configure(
    hindsight_api_url=HINDSIGHT_API_URL,
    bank_id=bank_id,
    store_conversations=True,  # 自动存储对话
    inject_memories=True,       # 自动注入相关记忆
    verbose=True,               # 启用日志以调试记忆操作
)
hindsight_litellm.enable()

print("Hindsight memory integration enabled!")
```

## 对话一：用户介绍自己 {#conversation-1-user-introduces-themselves}

在第一次对话中，用户会分享一些个人信息。这些信息会自动存入 Hindsight 记忆。


```python
user_message_1 = "Hi! I'm Alex and I work at Google as a software engineer. I love Python and machine learning."
print(f"User: {user_message_1}\n")

# 直接使用 hindsight_litellm.completion()
response_1 = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_message_1}
    ],
)

assistant_response_1 = response_1.choices[0].message.content
print(f"Assistant: {assistant_response_1}")
print("\n(Conversation automatically stored to Hindsight)")
```

## 等待记忆处理 {#wait-for-memory-processing}

Hindsight 需要几秒钟来处理对话并提取事实。


```python
print("Waiting 12 seconds for memory processing...")
time.sleep(12)
print("Done!")
```

## 对话二：测试记忆增强回答 {#conversation-2-test-memory-augmented-response}

现在开始一段全新的对话，并询问助手记得哪些信息。前一段对话中的记忆会自动注入提示词！


```python
user_message_2 = "What do you know about me? What programming language should I use for my next project?"
print(f"User: {user_message_2}\n")

# 此次调用前会自动注入记忆！
response_2 = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": user_message_2}
    ],
)

print(f"Assistant: {response_2.choices[0].message.content}")
```

## 结果说明 {#summary}

助手应该记得 Alex：
- 在 Google 担任软件工程师
- 喜欢 Python 和机器学习

并且应该根据这些信息推荐 Python！


```python
print(f"Memories stored in bank: {bank_id}")
print(f"View in UI: http://localhost:9999/banks/{bank_id}")
```

## 清理 {#cleanup}


```python
hindsight_litellm.cleanup()

# 可选：删除记忆库
import requests
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/{bank_id}")
print(f"Deleted bank: {response.json()}")
```
