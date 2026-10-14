---
sidebar_position: 10
---

# 使用 Hindsight 记忆的个性化搜索智能体 {#personalized-search-agent-with-hindsight-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/personalized_search.ipynb)
:::


这个搜索助手会逐步了解你的偏好、所在地、饮食需求和生活方式，从而提供符合上下文的搜索结果。

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
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

# Tavily 可选，用于真实网页搜索
if not os.getenv("TAVILY_API_KEY"):
    tavily_key = getpass.getpass("Enter your Tavily API key (or press Enter to skip): ")
    if tavily_key:
        os.environ["TAVILY_API_KEY"] = tavily_key

print("API keys configured!")
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
    print("Tavily configured - using real web search!")
except (ImportError, Exception) as e:
    HAS_TAVILY = False
    print("Note: Using simulated search results (Tavily not configured)")

USER_ID = "search-user-demo"

print("Clients initialized!")
```

## 4. 定义辅助函数 {#4-define-helper-functions}


```python
def store_preference(preference: str) -> str:
    """Store a user preference."""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"User preference: {preference}",
        metadata={"category": "preference"},
    )
    return f"Learned: {preference}"


def store_interaction(query: str, response: str) -> None:
    """Store a search interaction."""
    hindsight.retain(
        bank_id=USER_ID,
        content=f"Search query: {query}\nResult highlights: {response[:200]}",
        metadata={"category": "search_history"},
    )


def get_user_context(query: str) -> str:
    """Retrieve relevant user context."""
    memories = hindsight.recall(
        bank_id=USER_ID,
        query=f"preferences location dietary lifestyle {query}",
        budget="mid",
    )

    if memories and memories.results:
        return "\n".join(f"- {m.text}" for m in memories.results[:6])
    return ""


def personalized_search(query: str) -> str:
    """Perform a personalized search."""
    user_context = get_user_context(query)

    enhancement_prompt = f"""Given this user's preferences and the search query, suggest how to enhance the search.

User preferences:
{user_context if user_context else "No preferences recorded yet."}

Search query: {query}

Return a JSON object with:
- "enhanced_query": The improved search query incorporating relevant preferences
- "filters": Any specific filters to apply (e.g., "vegetarian", "within 5 miles")
- "reasoning": Brief explanation of personalizations applied"""

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
        results_text = f"[Simulated search results for: {query}]"

    response_prompt = f"""Based on the search results and user preferences, provide a personalized summary.

User preferences:
{user_context if user_context else "No preferences recorded yet."}

Query: {query}

Search enhancement applied:
{enhanced_info}

Search results:
{results_text}

Provide a helpful, personalized response that takes into account their preferences."""

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
    """Get a summary of the user's preference profile."""
    profile = hindsight.reflect(
        bank_id=USER_ID,
        query="""Summarize what we know about this user:
        - Location and neighborhood
        - Dietary preferences and restrictions
        - Work style and schedule
        - Hobbies and interests
        - Family situation
        - Shopping preferences""",
        budget="high",
    )
    return profile.text if hasattr(profile, 'text') else str(profile)

print("Helper functions defined!")
```

## 5. 建立用户资料 {#5-build-user-profile}


```python
print("Learning user preferences...")

preferences = [
    "Lives in San Francisco, Mission District",
    "Works remotely as a software engineer",
    "Vegetarian, prefers organic food when possible",
    "Has a 5-year-old daughter named Emma",
    "Enjoys hiking and outdoor activities on weekends",
    "Prefers quiet coffee shops for remote work",
    "Lactose intolerant, uses oat milk",
    "Interested in sustainable and eco-friendly products",
    "Usually free on Tuesday and Thursday afternoons",
    "Husband is allergic to nuts",
]

for pref in preferences:
    result = store_preference(pref)
    print(f"  {result}")
```

## 6. 个性化搜索结果 {#6-personalized-search-results}


```python
import time

print("=" * 60)
print("  Personalized Search Results")
print("=" * 60)

searches = [
    "Find a good coffee shop for working remotely",
    "Restaurant recommendations for a family dinner",
    "Birthday gift ideas for a 5-year-old",
]

for query in searches:
    print(f"\nSearch: {query}")
    print("-" * 40)
    result = personalized_search(query)
    print(result)
    time.sleep(1)
```

## 7. 查看偏好资料 {#7-view-preference-profile}


```python
print("=" * 60)
print("  User Preference Profile")
print("=" * 60)
print(get_preference_profile())
```

## 8. 尝试自己的搜索 {#8-try-your-own-search}


```python
your_search = "Best hiking trails near me"  # 可修改此问题

print(f"Search: {your_search}")
print("-" * 40)
print(personalized_search(your_search))
```

## 9. 清理 {#9-cleanup}


```python
hindsight.close()
print("Client connection closed.")
```
