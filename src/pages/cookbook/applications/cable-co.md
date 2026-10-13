---
sidebar_position: 1
---

# CableConnect — AI 客户服务 Copilot 演示 {#cableconnect--ai-customer-service-copilot-demo}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/cable-co)
:::


安AI副驾驶，通过针对模拟客户场景提出响应和操作建议来协助客户服务代表 (CSR)。 CSR 批准或拒绝每项建议并提供反馈。副驾驶通过 从纠正中学习 [Hindsight](https://hindsight.vectorize.io)并停止重复错误。

## 先决条件 {#prerequisites}

- Python 3.11+
- Node.js 18+
- OpenAI API 键（用于 GPT-4o）
- AHindsightAPI键（[注册](https://hindsight.vectorize.io))

## 快速入门 {#quick-start}

### 1。后端 {#1-backend}

```bash
cd backend

#创建并激活虚拟环境
python -m venv venv
source venv/bin/activate

#安装依赖项
pip install -r requirements.txt

#使用您的凭据创建 .env 文件
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-key
HINDSIGHT_API_KEY=hsk_your-hindsight-key
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_NAME=cable-connect-demo
EOF

#启动后端（端口8002）
./run.sh
```

### 2。前端 {#2-frontend}

在第二个终端：

```bash
cd frontend

#安装依赖项
npm install

#启动开发服务器（端口5173）
npm run dev
```

打开浏览器中的 `http://localhost:5173`。

## 运行演示 {#running-the-demo}

1. 点击**下一位客户（Next Customer）**加载第一个场景
2. AI副驾驶将分析客户的问题并提出响应建议
3. 查看右侧面板中的建议：
   - **发送给客户（Send to Customer）** — 批准响应，将其发送到客户聊天室
   - **批准（Approve）** — 执行系统操作（信用、调度等）
   - **拒绝（Reject）** — 输入反馈来解释问题所在
4. 副驾驶根据您的反馈进行调整并重试
5. Continue直到客户满意，然后批准解决操作
6. 点击**下一位客户（Next Customer）** 下一个场景

### 注意事项 {#what-to-watch-for}

8个场景包括3个**学习样例对**——第一个场景教智能体规则，第二个场景测试它是否记住：

|一对|场景|智能体学到什么|
|------|-----------|----------------------|
|A|2 然后 4|信用调整上限为 25 美元|
|B|3 然后 8|在安排调度之前运行远程诊断|
|C|5 然后 6|保留优惠需要 24 个月以上的任期|

与**开启记忆（Memory On）**（默认），副驾驶在每位新客户面前回忆过去的 CSR 反馈。根据测试场景，它应该正确处理这种情况而不需要纠正。

切换**关闭记忆（Memory Off）** 看看智能体在不学习的情况下如何表现——它每次都会犯同样的错误。

### 控制 {#controls}

- **模式（Mode）** 下拉菜单 — 在记忆打开和记忆关闭之间切换
- **重置（Reset）** — 删除所有存储的记忆并重新开始场景队列
- **刷新模型（Refresh Models）** — 手动触发智能体心智模型刷新

## 配置 {#configuration}

所有配置均通过中的环境变量进行 `backend/.env`：

|变量|默认|说明|
|----------|---------|-------------|
|`OPENAI_API_KEY`|—|您的 OpenAI API 密钥（必填）|
|`HINDSIGHT_API_KEY`|—|您的 Hindsight API 密钥（必填）|
|`HINDSIGHT_API_URL`|`https://api.hindsight.vectorize.io`|Hindsight API 端点|
|`HINDSIGHT_BANK_NAME`|`cable-connect-demo`|记忆库名称|
|`LLM_MODEL`|`openai/gpt-4o`|LLM 型号（通过 LiteLLM 格式）|
|`BACKEND_PORT`|`8002`|后端服务器端口|

## 项目结构 {#project-structure}

```
cable-co/
├── backend/
│   ├── run.sh                  #启动脚本（加载.env，运行 uvicorn）
│   ├── requirements.txt
│   ├── telecom_data.py         # Accounts, plans, billing, outages, scenarios
│   ├── agent_tools.py          #19个工具+业务规则提示
│   └── app/
│       ├── main.py             # FastAPI + WebSocket
│       ├── config.py
│       └── services/
│           ├── agent_service.py    #Copilot 带有 CSR 审批门的循环
│           └── memory_service.py   # Hindsight retain/recall/mental models
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── stores/sessionStore.ts
│       ├── hooks/useWebSocket.ts
│       └── components/
│           ├── ControlBar.tsx
│           ├── CustomerChat.tsx
│           ├── CopilotChat.tsx
│           ├── KnowledgePanel.tsx
│           └── MentalModelsPanel.tsx
└── article.md                  #智能体学习如何运作的详细文章
```

## 它是如何工作的 {#how-it-works}

请参阅文章.md，了解智能体学习架构的详细说明，包括Hindsight如何将 CSR 反馈转化为观察和心智模型，从而随着时间的推移改善副驾驶的行为。
