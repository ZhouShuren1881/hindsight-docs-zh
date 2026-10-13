---
sidebar_position: 10
---

# 拥有 Hindsight 记忆的个性化搜索智能体 {#personalized-search-agent-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/personalized_search.ipynb)
:::


学习偏好、位置、饮食需求和生活方式，提供符合上下文的搜索结果。

## 功能 {#features}
- 学习位置、饮食限制和生活方式
- 根据上下文定制查询
- 记住过去搜索和偏好
- 可选接入 Tavily 真实网页搜索

## 前置条件 {#prerequisites}
- OpenAI API 密钥
- 通过 Docker 在本地运行 Hindsight，配置见下文
- Tavily API 密钥（可选，用于真实网页搜索）

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
# Tavily 可选，未安装时使用模拟结果
!pip install -q hindsight-client openai tavily-python nest-asyncio
```

## 2. 配置 API 密钥 {#2-configure-api-keys}

按提示输入密钥。Tavily 可选，按回车跳过则使用模拟搜索。


```python
import getpass
import os

# 设置 Hindsight 与演示共同使用的 OpenAI API 密钥
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("请输入 OpenAI API 密钥：")

# Tavily 可选，用于真实网页搜索
if not os.getenv("TAVILY_API_KEY"):
    tavily_key = getpass.getpass("请输入 Tavily API 密钥，或按回车跳过：")
    if tavily_key:
        os.environ["TAVILY_API_KEY"] = tavily_key

print("API 密钥配置完成！")
```

## 3. 初始化客户端 {#3-initialize-clients}


```python
import nest_asyncio
nest_asyncio.apply()

from openai import OpenAI
from hindsight_client import Hindsight

# 初始化 Hindsight 客户端，连接本地 Docker 实例
hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 可选：使用 Tavily 真实搜索
try:
    from tavily import TavilyClient
    tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    HAS_TAVILY = True
    print("已配置 Tavily，使用真实网页搜索！")
except (ImportError, Exception) as e:
    HAS_TAVILY = False
    print("提示：Tavily 未配置，使用模拟搜索结果")

USER_ID = "search-user-demo"

print("客户端初始化完成！")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def store_preference(preference: str) -> str:
    """存储用户偏好。"""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"用户偏好：{preference}",
        metadata={"category": "preference"},
    )
    return f"已了解：{preference}"


def store_interaction(query: str, response: str) -> None:
    """存储搜索交互。"""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"搜索查询：{query}\n结果要点：{response[:200]}",
        metadata={"category": "search_history"},
    )


def get_user_context(query: str) -> str:
    """检索相关用户上下文。"""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"偏好 位置 饮食 生活方式 {query}",
        budget="mid",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:6])
    return ""


def personalized_search(query: str) -> str:
    """执行个性化搜索。"""
    user_context = get_user_context(query)

    enhancement_prompt = f"""根据用户偏好和查询，建议如何增强搜索。

用户偏好：
{user_context if user_context else "尚未记录偏好。"}

搜索查询：{query}

返回 JSON 对象，包含：
- "enhanced_query"：结合相关偏好的改进查询
- "filters"：具体筛选条件，例如“素食”“五英里以内”
- "reasoning"：简要解释应用的个性化调整"""

    enhancement = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": enhancement_prompt}],
        temperature=0.3,
        max_tokens=300,
    )

    enhanced_info = enhancement.choices[0].message.content

    # 执行搜索
    if HAS_TAVILY:
        search_results = tavily.search(
            query=query,
            search_depth="advanced",
            max_results=5,
        )
        results_text = "\n".join(
            f"- {r['title']}: {r['content'][:150]}..."
            for r in search_results.get('results', [])
        )
    else:
        results_text = f"[模拟搜索结果：{query}]"

    response_prompt = f"""根据搜索结果和用户偏好提供个性化摘要。

用户偏好：
{user_context if user_context else "尚未记录偏好。"}

查询：{query}

应用的搜索增强：
{enhanced_info}

搜索结果：
{results_text}

提供有帮助、考虑用户偏好的回答。"""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": response_prompt}],
        temperature=0.7,
        max_tokens=500,
    )

    answer = response.choices[0].message.content
    store_interaction(query, answer)

    return answer


def get_preference_profile() -> str:
    """总结用户偏好资料。"""
    profile = hindsight.reflect(
        bank_id=USER_ID,
        query="""总结你对用户的了解：
        - 位置和社区
        - 饮食偏好和限制
        - 工作方式和日程
        - 爱好
        - 家庭情况
        - 购物偏好""",
        budget="high",
    )
    return profile.text if hasattr(profile, 'text') else str(profile)

print("辅助函数定义完成！")
```

## 5. 建立用户资料 {#5-build-user-profile}


```python
print("正在学习用户偏好……")

preferences = [
    "住在旧金山 Mission 区",
    "远程软件工程师",
    "素食，尽量选择有机食品",
    "五岁女儿叫 Emma",
    "周末喜欢徒步和户外活动",
    "远程工作偏好安静咖啡馆",
    "乳糖不耐受，使用燕麦奶",
    "关注可持续环保产品",
    "通常周二和周四下午有空",
    "丈夫对坚果过敏",
]

for pref in preferences:
    result = store_preference(pref)
    print(f"  {result}")
```

## 6. 个性化搜索结果 {#6-personalized-search-results}


```python
import time

print("=" * 60)
print("  个性化搜索结果")
print("=" * 60)

searches = [
    "寻找适合远程工作的咖啡馆",
    "推荐家庭晚餐餐馆",
    "五岁孩子生日礼物建议",
]

for query in searches:
    print(f"\n搜索：{query}")
    print("-" * 40)
    result = personalized_search(query)
    print(result)
    time.sleep(1)
```

## 7. 查看偏好资料 {#7-view-preference-profile}


```python
print("=" * 60)
print("  用户偏好资料")
print("=" * 60)
print(get_preference_profile())
```

## 8. 尝试自己的搜索 {#8-try-your-own-search}


```python
your_search = "附近最好的徒步路线"  # 可修改此问题

print(f"搜索：{your_search}")
print("-" * 40)
print(personalized_search(your_search))
```

## 9. 清理 {#9-cleanup}


```python
hindsight.close()
print("客户端连接已关闭。")
```
