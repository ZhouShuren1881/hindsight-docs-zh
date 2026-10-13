---
sidebar_position: 7
---

# 拥有 Hindsight 记忆的健康助手 {#healthcare-assistant-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/healthcare_assistant.ipynb)
:::


支持性的健康聊天助手，记住病史、症状、用药和偏好，提供个性化指导。

## 免责声明 {#disclaimer}

**这只是演示应用，不应用于实际医疗建议。请始终咨询合格的医疗专业人员。**

## 功能 {#features}
- 跟踪症状、用药和过敏
- 跨对话保存患者历史
- 提供健康信息和保健提示
- 安排预约

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行 Hindsight，配置见下文

## 本地启动 Hindsight {#start-hindsight-locally}

运行笔记本前，在终端启动 Hindsight：

```bash
export OPENAI_API_KEY="your-openai-api-key"

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 1. 安装依赖 {#1-install-dependencies}


```python
!pip install -q hindsight-client openai nest-asyncio
```

## 2. 配置 OpenAI API 密钥 {#2-configure-openai-api-key}

按提示输入 OpenAI API 密钥，Hindsight 和演示共同使用。


```python
import getpass
import os

# 设置 Hindsight 与演示共同使用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("请输入 OpenAI API 密钥：")

print("API 密钥配置完成！")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from datetime import datetime
import random
from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端，连接本地 Docker 实例
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PATIENT_ID = "patient-demo"

def get_patient_bank_id(patient_id: str) -> str:
    return f"patient-{patient_id}"

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def store_patient_info(patient_id: str, info: str, category: str = "general") -> str:
    """存储患者信息。"""
    bank_id = get_patient_bank_id(patient_id)
    today = datetime.now().strftime("%B %d, %Y")

    hindsight.retain(
        bank_id=bank_id,
        content=f"{today} - {category.upper()}: {info}",
        metadata={"category": category, "date": today},
    )

    return f"已记录 {category}：{info}"


def get_patient_history(patient_id: str, query: str) -> str:
    """检索相关病史。"""
    bank_id = get_patient_bank_id(patient_id)

    memories = hindsight.recall(
        bank_id=bank_id,
        query=query,
        budget="high",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:10])
    return "未找到相关历史。"


def healthcare_chat(patient_id: str, user_message: str) -> str:
    """与健康助手对话。"""
    bank_id = get_patient_bank_id(patient_id)

    history = get_patient_history(
        patient_id,
        f"症状 用药 过敏 疾病 {user_message}"
    )

    system_prompt = f"""你是给予支持的健康聊天助手。

重要声明：
- 你不是医生，不能进行医疗诊断
- 严重问题应始终建议咨询医疗专业人员
- 不开药，也不建议停止医生处方治疗

你的职责：
- 共情倾听患者顾虑
- 记住并参考病史
- 提供一般健康信息和保健提示
- 跟踪症状变化
- 提醒用药和预约
- 提示何时寻求专业医疗帮助

患者历史：
{history}

指导原则：
- 温暖且支持
- 必要时询问澄清
- 相关时引用病史
- 提醒对令人担忧的症状进行专业评估"""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
        max_tokens=600,
    )

    answer = response.choices[0].message.content

    hindsight.retain(
        bank_id=bank_id,
        content=f"患者顾虑：{user_message}\n提供的指导：{answer[:200]}...",
        metadata={"category": "consultation"},
    )

    return answer


def get_health_summary(patient_id: str) -> str:
    """生成患者健康摘要。"""
    bank_id = get_patient_bank_id(patient_id)

    summary = hindsight.reflect(
        bank_id=bank_id,
        query="""总结患者健康资料：
        1. 已知疾病与诊断
        2. 当前用药
        3. 过敏和敏感情况
        4. 近期症状
        5. 提及的生活方式因素
        6. 健康模式或趋势""",
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)


def schedule_appointment(patient_id: str, appointment_type: str, preferred_time: str) -> str:
    """安排预约，演示用途。"""
    confirmation_id = f"APT-{random.randint(10000, 99999)}"

    store_patient_info(
        patient_id,
        f"预约：{appointment_type} - 希望时间：{preferred_time} - 确认号：{confirmation_id}",
        category="appointment"
    )

    return f"已申请预约：{appointment_type}\n希望时间：{preferred_time}\n确认号：{confirmation_id}\n\n工作人员将在 24 小时内确认具体时间。"

print("辅助函数定义完成！")
```

## 5. 设置患者资料 {#5-set-up-patient-profile}


```python
print("正在设置患者资料……")

patient_info = [
    ("45 岁，男性，身高 5 英尺 11 英寸，体重 185 磅", "demographics"),
    ("过敏：青霉素，引起荨麻疹", "allergies"),
    ("过敏：贝类，引起喉咙肿胀", "allergies"),
    ("用药：每日赖诺普利 10 mg，用于血压", "medications"),
    ("用药：二甲双胍 500 mg，每日两次，用于 2 型糖尿病", "medications"),
    ("疾病：2020 年确诊 2 型糖尿病", "conditions"),
    ("疾病：轻度高血压，控制良好", "conditions"),
    ("家族史：父亲有心脏病", "family_history"),
    ("生活方式：久坐工作，希望增加运动", "lifestyle"),
]

for info, category in patient_info:
    result = store_patient_info(PATIENT_ID, info, category)
    print(f"  {result}")
```

## 6. 健康对话 {#6-healthcare-chat}


```python
import time

print("=" * 60)
print("  健康对话")
print("=" * 60)

conversations = [
    "你好，过去几天头痛，需要担心吗？",
    "主要下午头痛，也比平时更疲劳。",
    "最近血糖偏高，空腹约 140～150。",
    "我准备去新餐馆，提醒一下有哪些过敏？",
]

for message in conversations:
    print(f"\n患者：{message}")
    print("-" * 40)
    response = healthcare_chat(PATIENT_ID, message)
    print(f"助手：{response}")
    time.sleep(1)
```

## 7. 安排预约 {#7-schedule-appointment}


```python
print("=" * 60)
print("  安排预约")
print("=" * 60)
print(schedule_appointment(PATIENT_ID, "常规检查", "下周二下午"))
```

## 8. 健康摘要 {#8-health-summary}


```python
print("=" * 60)
print("  患者健康摘要")
print("=" * 60)
print(get_health_summary(PATIENT_ID))
```

## 9. 尝试自己的问题 {#9-try-your-own-question}


```python
your_question = "我应该调整二甲双胍剂量吗？"  # 可修改此问题

print(f"你：{your_question}")
print("-" * 40)
print(f"助手：{healthcare_chat(PATIENT_ID, your_question)}")
```

## 10. 清理 {#10-cleanup}


```python
hindsight.close()
print("客户端连接已关闭。")
```
