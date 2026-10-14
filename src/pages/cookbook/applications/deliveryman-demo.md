---
sidebar_position: 7
---

# 送货员演示 {#deliveryman-demo}

:::info 完整应用
这是一个完整、可运行的应用，用于演示如何集成 Hindsight。
[**在 GitHub 上查看源代码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/deliveryman-demo)
:::

这是一个送货智能体模拟项目，用于展示 Hindsight 的长期记忆能力。AI 智能体会在由多栋建筑组成的办公园区中穿行并递送包裹，借助心智模型逐渐了解员工的位置和最优路线。

## 先决条件 {#prerequisites}

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/)（Python 包管理器）

## 设置（全新环境） {#setup-fresh-environment}

### 1. 克隆仓库 {#1-clone-repositories}

```bash
# 克隆 Hindsight（记忆引擎）
git clone https://github.com/anthropics/hindsight.git

# 克隆 cookbook（包含此演示）
git clone https://github.com/anthropics/hindsight-cookbook.git
```

### 2. 启动 Hindsight API {#2-start-hindsight-api}

```bash
cd hindsight
cp .env.example .env
```

编辑 `.env`，配置 LLM：

```bash
HINDSIGHT_API_LLM_PROVIDER=groq
HINDSIGHT_API_LLM_API_KEY=<your-groq-api-key>
HINDSIGHT_API_LLM_MODEL=openai/gpt-oss-120b
HINDSIGHT_API_HOST=0.0.0.0
HINDSIGHT_API_PORT=8888
HINDSIGHT_API_ENABLE_OBSERVATIONS=true

# Retain 提取设置（改善员工和地点信息的提取）
HINDSIGHT_API_RETAIN_EXTRACTION_MODE=custom
HINDSIGHT_API_RETAIN_CUSTOM_INSTRUCTIONS="Delivery agent. Remember employee locations, building layout, and optimal paths."

# 嵌入式数据库存储
PG0_DATA_DIR=/tmp/hindsight-data
```

启动 API：

```bash
./scripts/dev/start-api.sh
# 运行于 http://localhost:8888
```

### 3. 启动 Hindsight 控制台（可选） {#3-start-hindsight-control-plane-optional}

控制台提供 Web UI，可用于查看记忆库、事实和心智模型。

```bash
cd hindsight
./scripts/dev/start-control-plane.sh
# 运行于动态端口（查看终端输出）
```

### 4. 启动演示后端 {#4-start-demo-backend}

```bash
cd hindsight-cookbook/deliveryman-demo/backend

# 创建虚拟环境并安装依赖
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

创建 `backend/.env`：

```bash
OPENAI_API_KEY=<your-openai-api-key>
GROQ_API_KEY=<your-groq-api-key>
HINDSIGHT_API_URL=http://localhost:8888
LLM_MODEL=openai/gpt-4o
```

启动后端：

```bash
./run.sh
# 或手动启动：
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --ws wsproto --reload
```

**注意：** WebSocket 支持必须使用 `--ws wsproto` 标志。否则，连接会以错误 1006 失败。

### 5. 启动演示前端 {#5-start-demo-frontend}

```bash
cd hindsight-cookbook/deliveryman-demo/frontend
npm install
npm run dev
# 运行于 http://localhost:5173
```

### 6. 打开演示 {#6-open-the-demo}

在浏览器中打开 `http://localhost:5173`。

## 工作原理 {#how-it-works}

1. 智能体收到递送任务（例如，“Deliver Package #3954 to Victor Huang”）。
2. 它会在一个包含多栋建筑、多个楼层、电梯和空中连廊的园区中导航。
3. 沿途它会遇到员工，并了解他们的位置。
4. 每次递送完成后，对话都会通过 **Retain（存入）** API 发送到 Hindsight。
5. Hindsight 会提取事实（例如员工位置和建筑布局），并构建**心智模型**。
6. 后续递送时，智能体会查询 Hindsight，召回已学到的信息。

## 架构 {#architecture}

```
浏览器 (5173) → 前端 (React + Phaser)
                    ↓ WebSocket
                 后端 (8000) → FastAPI + 送货智能体
                    ↓ HTTP
                 Hindsight API (8888) → 记忆引擎 + PostgreSQL
```

## 故障排查 {#troubleshooting}

| 问题 | 解决方案 |
|---------|----------|
| WebSocket 错误 1006 | 使用 `--ws wsproto` 标志重新启动后端 |
| 心智模型中缺少员工信息 | 检查是否已设置 `HINDSIGHT_API_RETAIN_EXTRACTION_MODE=custom` |
| 无法连接 Hindsight | 确认 Hindsight API 正在端口 8888 上运行 |
| 前端显示“已断开连接” | 检查后端是否正在端口 8000 上运行 |
