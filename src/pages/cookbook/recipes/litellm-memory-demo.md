---
sidebar_position: 4
---

# 通过 LiteLLM 使用记忆 {#memory-with-litellm}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/04-litellm-memory-demo.ipynb)
:::


本笔记本演示使用 `hindsight-litellm` 为任意 LLM 应用添加持久记忆。LiteLLM 回调自动存储和注入记忆，无需手动管理。

**演示的核心功能：**
1. `configure()` + `enable()`：设置自动记忆集成
2. 自动存储：每次 LLM 调用后保存对话
3. 自动注入：向提示词注入相关记忆

`hindsight-litellm` 接入 LiteLLM 回调系统：
- LLM 成功响应后存储对话
- LLM 调用前向系统提示词注入相关记忆

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

- API：http://localhost:8888
- 界面：http://localhost:9999

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

# 应用 nest_asyncio，兼容 Jupyter
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
    print("警告：未设置 OPENAI_API_KEY")
```

## 配置并启用自动记忆 {#configure-and-enable-automatic-memory}

只需这些设置，之后每次 LiteLLM 调用都会：
- 向提示词注入相关记忆
- 响应后将对话存入 Hindsight


```python
# 为本次演示生成唯一 bank_id
bank_id = f"demo-{uuid.uuid4().hex[:8]}"
print(f"使用记忆库 ID：{bank_id}")

# 配置并启用 Hindsight
hindsight_litellm.configure(
    hindsight_api_url=HINDSIGHT_API_URL,
    bank_id=bank_id,
    store_conversations=True,  # 自动存储对话
    inject_memories=True,       # 自动注入相关记忆
    verbose=True,               # 启用记忆调试日志
)
hindsight_litellm.enable()

print("已启用 Hindsight 记忆集成！")
```

## 对话一：用户介绍自己 {#conversation-1-user-introduces-themselves}

第一次对话中用户分享自身信息，将自动存入记忆。


```python
user_message_1 = "你好！我是 Alex，在 Google 担任软件工程师。我喜欢 Python 和机器学习。"
print(f"用户：{user_message_1}\n")

# 直接使用 hindsight_litellm.completion()
response_1 = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "你是有帮助的助手。"},
        {"role": "user", "content": user_message_1}
    ],
)

assistant_response_1 = response_1.choices[0].message.content
print(f"助手：{assistant_response_1}")
print("\n（对话自动存入 Hindsight）")
```

## 等待记忆处理 {#wait-for-memory-processing}

Hindsight 需要几秒处理对话并提取事实。


```python
print("等待 12 秒处理记忆……")
time.sleep(12)
print("完成！")
```

## 对话二：测试记忆增强回答 {#conversation-2-test-memory-augmented-response}

开始全新对话，询问助手记住什么。前一次的记忆会自动注入提示词。


```python
user_message_2 = "你了解我什么？下一个项目应该用什么编程语言？"
print(f"用户：{user_message_2}\n")

# 调用前自动注入记忆
response_2 = hindsight_litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "你是有帮助的助手。"},
        {"role": "user", "content": user_message_2}
    ],
)

print(f"助手：{response_2.choices[0].message.content}")
```

## 结果说明 {#summary}

助手应记住 Alex：
- 在 Google 担任软件工程师
- 喜欢 Python 和机器学习

并根据这些知识推荐 Python。


```python
print(f"记忆存储在库中：{bank_id}")
print(f"在界面查看：http://localhost:9999/banks/{bank_id}")
```

## 清理 {#cleanup}


```python
hindsight_litellm.cleanup()

# 可选：删除记忆库
import requests
response = requests.delete(f"{HINDSIGHT_API_URL}/v1/default/banks/{bank_id}")
print(f"已删除记忆库：{response.json()}")
```
