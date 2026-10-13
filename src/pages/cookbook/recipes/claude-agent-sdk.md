---
sidebar_position: 12
---

# 具有持久记忆的 Claude Agent SDK {#claude-agent-sdk-with-persistent-memory}


:::tip 运行此笔记本
此教程提供交互式 Jupyter 笔记本。
[**在 GitHub 打开 →**](https://github.com/vectorize-io/hindsight-cookbook/blob/main/notebooks/claude-agent-sdk.ipynb)
:::


使用 Hindsight 记忆工具和自动钩子，构建可跨会话记忆的 Claude 智能体。

## 功能 {#features}
- 进程内 MCP 服务器，提供存储、召回和反思工具
- 每次提示前自动注入上下文的记忆钩子
- 自动存储结果，供后续会话使用
- 多次运行中不断积累知识

## 前置条件 {#prerequisites}
- 已安装并认证的 **Claude Code CLI**（`npm install -g @anthropic-ai/claude-code && claude auth login`，或设置 `ANTHROPIC_API_KEY`）
- 用于 Hindsight 的 LLM API 密钥（OpenAI、Gemini 等）
- 通过 Docker 在本地运行 Hindsight，配置见下文
- 也可使用 [Hindsight Cloud](https://ui.hindsight.vectorize.io)，无需 Docker

:::note
Claude Agent SDK 以子进程运行 Claude Code CLI，必须**安装并完成认证**，可使用 `claude auth login` 或环境变量 `ANTHROPIC_API_KEY`。
:::

## 本地启动 Hindsight {#start-hindsight-locally}

运行笔记本前，在终端启动 Hindsight：

```bash
export LLM_API_KEY="your-llm-api-key"

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$LLM_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

## 1. 安装依赖 {#1-install-dependencies}


```python
!pip install -q hindsight-claude-agent-sdk nest-asyncio
```

## 2. 配置环境 {#2-configure-environment}


```python
import nest_asyncio
nest_asyncio.apply()

import os
import getpass

# Anthropic API 密钥（Claude Agent SDK 使用）
if not os.getenv("ANTHROPIC_API_KEY"):
    os.environ["ANTHROPIC_API_KEY"] = getpass.getpass("请输入 Anthropic API 密钥：")

# Hindsight 连接，默认使用本地自托管实例
# 使用 Cloud 时，设置 HINDSIGHT_API_URL 和 HINDSIGHT_API_KEY
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", None)  # Cloud 可选连接密钥
BANK_ID = "claude-agent-demo"

print(f"Hindsight API：{HINDSIGHT_API_URL}")
print(f"使用 API 密钥：{'是' if HINDSIGHT_API_KEY else '否（自托管）'}")
print(f"记忆库 ID：{BANK_ID}")
```

## 3. 创建记忆库 {#3-create-a-memory-bank}


```python
from hindsight_client import Hindsight

hindsight = Hindsight(base_url=HINDSIGHT_API_URL, api_key=HINDSIGHT_API_KEY)

# 为演示创建独立记忆库，可安全重复执行
try:
    hindsight.create_bank(
        bank_id=BANK_ID,
        name="Claude 智能体演示",
        mission="为软件开发助手记住用户偏好、决策和项目上下文。",
    )
    print(f"已创建记忆库 '{BANK_ID}'。")
except Exception:
    print(f"记忆库 '{BANK_ID}' 已存在，继续。")
```

## 4. 设置记忆工具 {#4-set-up-memory-tools}

创建进程内 MCP 服务器，提供存储、召回和反思：


```python
from hindsight_claude_agent_sdk import create_hindsight_server

server = create_hindsight_server(
    bank_id=BANK_ID,
    hindsight_api_url=HINDSIGHT_API_URL,
    api_key=HINDSIGHT_API_KEY,
    tags=["source:claude-agent-sdk-demo"],
)

print("已创建 Hindsight MCP 服务器，工具为 hindsight_retain、hindsight_recall、hindsight_reflect")
```

## 5. 显式使用记忆工具运行智能体 {#5-run-agent-with-explicit-memory-tools}

智能体自行决定何时存储和检索：


```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def run_agent(prompt: str, system: str = None):
    """使用 Hindsight 记忆工具运行 Claude 智能体。"""
    options = ClaudeAgentOptions(
        mcp_servers={"hindsight": server},
        allowed_tools=["mcp__hindsight__*"],
        model="claude-sonnet-4-6",
        permission_mode="bypassPermissions",
    )
    if system:
        options.system_prompt = system

    result_text = None
    async for msg in query(prompt=prompt, options=options):
        if hasattr(msg, "result"):
            result_text = msg.result
    return result_text


# 存储一些偏好
result = asyncio.get_event_loop().run_until_complete(
    run_agent(
        "使用存储工具记住以下信息：\n"
        "- 我偏好带类型提示和 async/await 的 Python\n"
        "- 团队使用 pytest 和 pytest-asyncio 测试\n"
        "- 遵循 Conventional Commits（feat:、fix:、chore:）\n"
        "- API 框架为 FastAPI，使用 Pydantic v2 模型"
    )
)
print("智能体结果：", result)
```

## 6. 新会话召回记忆 {#6-recall-memories-in-a-new-session}

模拟新会话，没有对话历史，但可从记忆库召回：


```python
# 新会话，没有此前上下文
result = asyncio.get_event_loop().run_until_complete(
    run_agent(
        "团队使用什么测试框架？"
        "回答前先搜索记忆。",
        system="你是有帮助的编程助手。回答用户相关问题前，始终检查记忆。",
    )
)
print("智能体结果：", result)
```

## 7. 通过反思深入综合 {#7-reflect-for-deeper-synthesis}

需要分析全部存储记忆时使用 reflect：


```python
result = asyncio.get_event_loop().run_until_complete(
    run_agent(
        "使用反思工具综合你了解的开发技术栈和偏好。",
    )
)
print("智能体结果：", result)
```

## 8. 添加自动记忆钩子 {#8-add-automatic-memory-hooks}

钩子自动注入记忆，无需显式调用：


```python
from hindsight_claude_agent_sdk import create_memory_hooks, MemoryHookConfig

hooks = create_memory_hooks(
    bank_id=BANK_ID,
    hindsight_api_url=HINDSIGHT_API_URL,
    api_key=HINDSIGHT_API_KEY,
    hook_config=MemoryHookConfig(
        auto_recall=True,       # 每次提示前注入相关记忆
        auto_retain=True,       # 每次会话后保存结果
        recall_max_results=5,   # 限制注入数量
    ),
)

print("已创建钩子：UserPromptSubmit 自动召回，Stop 自动存储")
```

## 9. 使用钩子运行智能体 {#9-run-agent-with-hooks}

现在相关记忆自动作为系统上下文注入：


```python
async def run_with_hooks(prompt: str):
    """同时使用工具和钩子运行 Claude 智能体。"""
    result_text = None
    async for msg in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            mcp_servers={"hindsight": server},
            allowed_tools=["mcp__hindsight__*"],
            hooks=hooks,
            model="claude-sonnet-4-6",
            permission_mode="bypassPermissions",
            system_prompt="你是有帮助的编程助手。",
        ),
    ):
        if hasattr(msg, "result"):
            result_text = msg.result
    return result_text


# 自动获取历史记忆，无需主动调用工具
result = asyncio.get_event_loop().run_until_complete(
    run_with_hooks("按团队偏好，为 FastAPI 端点编写 pytest 示例。")
)
print("智能体结果：", result)
```

智能体在工作前通过自动召回获得团队测试偏好，结果也自动存储，供后续会话使用。

## 10. 再次运行，观察知识积累 {#10-run-again-to-see-knowledge-compound}

每次会话增加知识，再用相关提示运行：


```python
result = asyncio.get_event_loop().run_until_complete(
    run_with_hooks("刚创建的测试文件应该使用什么提交信息格式？")
)
print("智能体结果：", result)
```

智能体召回早前在完全不同会话中存储的 Conventional Commits 偏好。

## 11. 自动存储工具输出（可选） {#11-auto-retain-tool-outputs-optional}

也可自动存储 Bash 等指定工具的输出：


```python
hooks_with_bash = create_memory_hooks(
    bank_id=BANK_ID,
    hindsight_api_url=HINDSIGHT_API_URL,
    api_key=HINDSIGHT_API_KEY,
    hook_config=MemoryHookConfig(
        auto_recall=True,
        auto_retain=True,
        retain_on_tools=["Bash"],  # 记住 Bash 输出
        retain_tags=["source:cli"],
    ),
)

print("已创建钩子，并启用 Bash 输出存储")
```

## 清理 {#cleanup}

删除本笔记本创建的记忆库：


```python
hindsight.delete_bank(bank_id=BANK_ID)
print(f"已删除记忆库 '{BANK_ID}'。")
```
