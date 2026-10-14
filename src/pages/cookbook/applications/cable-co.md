---
sidebar_position: 1
---

# CableConnect — AI 客服助手演示 {#cableconnect--ai-customer-service-copilot-demo}


:::info 完整应用
这是一个完整、可运行的应用，演示如何集成 Hindsight。
[**在 GitHub 上查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/cable-co)
:::


这是一个 AI 助手，可通过为模拟客户场景建议回复和操作，协助客户服务代表（CSR）。CSR 可以批准或拒绝每条建议，并提供反馈。该助手会通过 [Hindsight](https://hindsight.vectorize.io) 从纠正中学习，不再重复犯过的错误。

## 前提条件 {#prerequisites}

- Python 3.11+
- Node.js 18+
- OpenAI API 密钥（用于 GPT-4o）
- Hindsight API 密钥（[注册](https://hindsight.vectorize.io)）

## 快速开始 {#quick-start}

### 1. 后端 {#1-backend}

```bash
cd backend

# 创建并激活虚拟环境
python -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 创建包含凭据的 .env 文件
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-key
HINDSIGHT_API_KEY=hsk_your-hindsight-key
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_NAME=cable-connect-demo
EOF

# 启动后端（端口 8002）
./run.sh
```

### 2. 前端 {#2-frontend}

在另一个终端中：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（端口 5173）
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。

## 运行演示 {#running-the-demo}

1. 点击 **Next Customer**，加载第一个场景。
2. AI 助手会分析客户的问题并建议回复。
3. 在右侧面板中查看建议：
   - **Send to Customer** — 批准回复，并将其发送到客户聊天窗口。
   - **Approve** — 执行系统操作（账单抵扣、派单等）。
   - **Reject** — 输入反馈，说明哪里不对。
4. 助手会根据反馈进行调整并重试。
5. 持续操作，直到客户满意，然后批准解决操作。
6. 点击 **Next Customer**，进入下一个场景。

### 观察要点 {#what-to-watch-for}

8 个场景中包含 3 对**学习场景**：第一个场景教会智能体一条规则，第二个场景则测试它是否记住了这条规则。

| 组别 | 场景 | 智能体学到的内容 |
|------|-----------|----------------------|
| A | 2，然后 4 | 账单抵扣金额上限为 $25 |
| B | 3，然后 8 | 安排派单前先运行远程诊断 |
| C | 5，然后 6 | 提供挽留优惠要求客户在网时长达到 24 个月以上 |

开启 **Memory On**（默认设置）后，助手会在处理每位新客户前召回以往 CSR 的反馈。到了测试场景，它应该能够正确处理情况，无需他人纠正。

切换到 **Memory Off**，即可查看智能体在不学习时的表现：它每次都会犯同样的错误。

### 控件 {#controls}

- **Mode** 下拉菜单 — 在 Memory On 和 Memory Off 之间切换。
- **Reset** — 删除所有已存储的记忆，并重新开始场景队列。
- **Refresh Models** — 手动触发智能体心智模型刷新。

## 配置 {#configuration}

所有配置均通过 `backend/.env` 中的环境变量设置：

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API 密钥（必填） |
| `HINDSIGHT_API_KEY` | — | Hindsight API 密钥（必填） |
| `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` | Hindsight API 端点 |
| `HINDSIGHT_BANK_NAME` | `cable-connect-demo` | 记忆库名称 |
| `LLM_MODEL` | `openai/gpt-4o` | LLM 模型（LiteLLM 格式） |
| `BACKEND_PORT` | `8002` | 后端服务器端口 |

## 项目结构 {#project-structure}

```
cable-co/
├── backend/
│   ├── run.sh                  # 启动脚本（加载 .env 并运行 uvicorn）
│   ├── requirements.txt
│   ├── telecom_data.py         # 账户、套餐、账单、服务中断和场景
│   ├── agent_tools.py          # 19 个工具和业务规则提示
│   └── app/
│       ├── main.py             # FastAPI + WebSocket
│       ├── config.py
│       └── services/
│           ├── agent_service.py    # 带 CSR 审批环节的助手循环
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
└── article.md                  # 智能体学习机制的详细说明
```

## 工作原理 {#how-it-works}

智能体学习架构的详细说明请参阅 article.md，其中介绍了 Hindsight 如何将 CSR 反馈转化为观测和心智模型，随着时间推移改善助手的行为。
