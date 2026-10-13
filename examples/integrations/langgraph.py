"""
Hindsight 的 LangGraph 集成示例。
文档通过 CodeSnippet 嵌入这些代码片段。
"""

# [docs:setup]
from hindsight_langgraph import create_hindsight_tools

# 使用默认 API URL。设置 HINDSIGHT_API_KEY 环境变量进行身份验证。
tools = create_hindsight_tools(bank_id="user-123")

# 要连接自行托管的实例，请显式传入 URL：
# tools = create_hindsight_tools(bank_id="user-123", hindsight_api_url="http://localhost:8888")
# [/docs:setup]

# [docs:react-agent]
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    ChatOpenAI(model="gpt-4o"),
    tools=tools,
    prompt=(
        "你是一个拥有长期记忆、乐于助人的助手。"
        "使用 hindsight_retain 存储有关用户的重要事实。"
        "在回答前使用 hindsight_recall 搜索记忆。"
        "使用 hindsight_reflect 对已知信息进行深入总结。"
    ),
)

result = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "记住我偏好深色模式"}]}
)
# [/docs:react-agent]

# [docs:memory-nodes]
from hindsight_langgraph import create_recall_node, create_retain_node
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END

recall = create_recall_node(
    bank_id_from_config="user_id",
    budget="mid",
    max_results=5,
)
retain = create_retain_node(
    bank_id_from_config="user_id",
    tags=["source:auto"],
)


async def llm_node(state: MessagesState):
    model = ChatOpenAI(model="gpt-4o")
    response = await model.ainvoke(state["messages"])
    return {"messages": [response]}


builder = StateGraph(MessagesState)
builder.add_node("recall", recall)
builder.add_node("llm", llm_node)
builder.add_node("retain", retain)

builder.add_edge(START, "recall")
builder.add_edge("recall", "llm")
builder.add_edge("llm", "retain")
builder.add_edge("retain", END)

graph = builder.compile()

result = await graph.ainvoke(
    {"messages": [HumanMessage(content="我今天应该做什么运动？")]},
    config={"configurable": {"user_id": "user-456"}},
)
# [/docs:memory-nodes]

# [docs:memory-instructions]
from hindsight_langgraph import memory_instructions

get_instructions = memory_instructions(
    bank_id="user-123",
    base_instructions="你是一个拥有长期记忆、乐于助人的助手。",
    budget="mid",
    max_results=5,
)

# 在 LangChain 链中使用（无需图）
instructions = await get_instructions()
response = await ChatOpenAI(model="gpt-4o").ainvoke(
    [{"role": "system", "content": instructions}, {"role": "user", "content": "你对我了解多少？"}]
)
# [/docs:memory-instructions]

# [docs:constructor-options]
tools = create_hindsight_tools(
    bank_id="user-123",
    budget="high",
    max_tokens=2048,
    tags=["env:prod", "app:support"],
    recall_tags=["env:prod"],
    recall_tags_match="any",
    retain_metadata={"version": "2.0"},
    retain_document_id="session-abc",
    recall_types=["experience", "world"],
    recall_include_entities=True,
    reflect_context="用户是一位高级工程师。",
    include_retain=True,
    include_recall=True,
    include_reflect=True,
)
# [/docs:constructor-options]
