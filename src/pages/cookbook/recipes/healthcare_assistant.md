---
sidebar_position: 7
---

# 使用 Hindsight 记忆的医疗助手 {#healthcare-assistant-with-hindsight-memory}


:::tip 运行此笔记本
此示例提供可交互的 Jupyter 笔记本。
[**在 GitHub 中打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/healthcare_assistant.ipynb)
:::


这是一款支持型医疗聊天机器人，能够记住患者病史、症状、用药和偏好，从而提供个性化指导。

## 免责声明 {#disclaimer}

**这是一个演示应用，绝不可用于实际医疗建议。请务必咨询合格的医疗专业人员。**

## 功能 {#features}
- 跟踪症状、用药和过敏情况
- 在多轮对话中保留患者病史
- 提供健康信息和健康建议
- 安排预约

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行 Hindsight（见下文的设置说明）

## 在本地启动 Hindsight {#start-hindsight-locally}

运行此笔记本之前，请先在终端中启动 Hindsight：

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

按提示输入 OpenAI API 密钥。Hindsight 和此演示都会使用该密钥。


```python
import getpass
import os

# 设置 OpenAI API 密钥，供 Hindsight 和此演示共同使用
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

print("API key configured!")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from datetime import datetime
import random
from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端（连接到本地 Docker 实例）
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PATIENT_ID = "patient-demo"

def get_patient_bank_id(patient_id: str) -> str:
    return f"patient-{patient_id}"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def store_patient_info(patient_id: str, info: str, category: str = "general") -> str:
    """Store patient information."""
    bank_id = get_patient_bank_id(patient_id)
    today = datetime.now().strftime("%B %d, %Y")

    hindsight.retain(
        bank_id=bank_id,
        content=f"{today} - {category.upper()}: {info}",
        metadata={"category": category, "date": today},
    )

    return f"Recorded {category}: {info}"


def get_patient_history(patient_id: str, query: str) -> str:
    """Retrieve relevant patient history."""
    bank_id = get_patient_bank_id(patient_id)

    memories = hindsight.recall(
        bank_id=bank_id,
        query=query,
        budget="high",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:10])
    return "No relevant history found."


def healthcare_chat(patient_id: str, user_message: str) -> str:
    """Chat with the healthcare assistant."""
    bank_id = get_patient_bank_id(patient_id)

    history = get_patient_history(
        patient_id,
        f"symptoms medications allergies conditions {user_message}"
    )

    system_prompt = f"""You are a supportive healthcare assistant chatbot.

IMPORTANT DISCLAIMERS:
- You are NOT a doctor and cannot provide medical diagnoses
- Always recommend consulting healthcare professionals for serious concerns
- Never prescribe medications or suggest stopping prescribed treatments

Your role:
- Listen empathetically to patient concerns
- Remember and reference their medical history
- Provide general health information and wellness tips
- Help track symptoms over time
- Remind about medications and appointments
- Suggest when to seek professional care

Patient History:
{history}

Guidelines:
- Be warm and supportive
- Ask clarifying questions when needed
- Reference their history when relevant
- Flag any concerning symptoms for professional review"""

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
        content=f"Patient concern: {user_message}\nGuidance provided: {answer[:200]}...",
        metadata={"category": "consultation"},
    )

    return answer


def get_health_summary(patient_id: str) -> str:
    """Generate a health summary for the patient."""
    bank_id = get_patient_bank_id(patient_id)

    summary = hindsight.reflect(
        bank_id=bank_id,
        query="""Summarize this patient's health profile:
        1. Known conditions and diagnoses
        2. Current medications
        3. Allergies and sensitivities
        4. Recent symptoms reported
        5. Lifestyle factors mentioned
        6. Any patterns or trends in their health""",
        budget="high",
    )
    return summary.text if hasattr(summary, 'text') else str(summary)


def schedule_appointment(patient_id: str, appointment_type: str, preferred_time: str) -> str:
    """Schedule an appointment (demo)."""
    confirmation_id = f"APT-{random.randint(10000, 99999)}"

    store_patient_info(
        patient_id,
        f"Appointment scheduled: {appointment_type} - Preferred time: {preferred_time} - Confirmation: {confirmation_id}",
        category="appointment"
    )

    return f"Appointment requested: {appointment_type}\nPreferred time: {preferred_time}\nConfirmation ID: {confirmation_id}\n\nA staff member will confirm the exact time within 24 hours."

print("Helper functions defined!")
```

## 5. 设置患者档案 {#5-set-up-patient-profile}


```python
print("Setting up patient profile...")

patient_info = [
    ("Age: 45, Male, Height: 5'11\", Weight: 185 lbs", "demographics"),
    ("Allergy: Penicillin - causes hives", "allergies"),
    ("Allergy: Shellfish - causes throat swelling", "allergies"),
    ("Current medication: Lisinopril 10mg daily for blood pressure", "medications"),
    ("Current medication: Metformin 500mg twice daily for Type 2 diabetes", "medications"),
    ("Condition: Diagnosed with Type 2 diabetes in 2020", "conditions"),
    ("Condition: Mild hypertension, well-controlled", "conditions"),
    ("Family history: Father had heart disease", "family_history"),
    ("Lifestyle: Sedentary job, trying to exercise more", "lifestyle"),
]

for info, category in patient_info:
    result = store_patient_info(PATIENT_ID, info, category)
    print(f"  {result}")
```

## 6. 医疗对话 {#6-healthcare-chat}


```python
import time

print("=" * 60)
print("  Healthcare Chat")
print("=" * 60)

conversations = [
    "Hi, I've been having headaches for the past few days. Should I be worried?",
    "The headaches are mostly in the afternoon. I've also been feeling more tired than usual.",
    "I've been checking my blood sugar and it's been a bit higher lately, around 140-150 fasting.",
    "Can you remind me what allergies I have? I'm going to a new restaurant.",
]

for message in conversations:
    print(f"\nPatient: {message}")
    print("-" * 40)
    response = healthcare_chat(PATIENT_ID, message)
    print(f"Assistant: {response}")
    time.sleep(1)
```

## 7. 安排预约 {#7-schedule-appointment}


```python
print("=" * 60)
print("  Scheduling Appointment")
print("=" * 60)
print(schedule_appointment(PATIENT_ID, "General checkup", "Next Tuesday afternoon"))
```

## 8. 健康摘要 {#8-health-summary}


```python
print("=" * 60)
print("  Patient Health Summary")
print("=" * 60)
print(get_health_summary(PATIENT_ID))
```

## 9. 尝试提出自己的问题 {#9-try-your-own-question}


```python
your_question = "Should I adjust my Metformin dose?"  # 可在此处修改

print(f"You: {your_question}")
print("-" * 40)
print(f"Assistant: {healthcare_chat(PATIENT_ID, your_question)}")
```

## 10. 清理 {#10-cleanup}


```python
hindsight.close()
print("Client connection closed.")
```
