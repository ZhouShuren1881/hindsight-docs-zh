---
sidebar_position: 7
---

# 送货员演示 {#deliveryman-demo}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/deliveryman-demo)
:::


交付智能体模拟，展示Hindsight的长期记忆能力。 AI 智能体可在多层办公大楼中导航以交付包裹，通过心智模型了解员工位置和随着时间的推移的最佳路径。

## 先决条件 {#prerequisites}

- Python 3.11+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python包管理器）

## 设置（新环境） {#setup-fresh-environment}

### 1。克隆存储库 {#1-clone-repositories}

```bash
#克隆Hindsight（记忆引擎）
git clone https://github.com/anthropics/hindsight.git

#克隆食谱（包含此演示）
git clone https://github.com/anthropics/hindsight-cookbook.git
```

### 2。开始 Hindsight API {#2-start-hindsight-api}

```bash
cd hindsight
cp .env.example .env
```

编辑`.env` 与你的LLM配置：

```bash
HINDSIGHT_API_LLM_PROVIDER=groq
HINDSIGHT_API_LLM_API_KEY=<your-groq-api-key>
HINDSIGHT_API_LLM_MODEL=openai/gpt-oss-120b
HINDSIGHT_API_HOST=0.0.0.0
HINDSIGHT_API_PORT=8888
HINDSIGHT_API_ENABLE_OBSERVATIONS=true

# 存储提取设置（改善员工和地点提取）
HINDSIGHT_API_RETAIN_EXTRACTION_MODE=custom
HINDSIGHT_API_RETAIN_CUSTOM_INSTRUCTIONS="交付智能体。记住员工位置、建筑布局和最佳路径。"

#嵌入式数据库存储
PG0_DATA_DIR=/tmp/hindsight-data
```

启动API：

```bash
./scripts/dev/start-api.sh
# 运行于 http://localhost:8888
```

### 3。启动Hindsight控制平面（可选） {#3-start-hindsight-control-plane-optional}

控制平面提供了一个Web UI，用于检查记忆库、事实和心智模型。

```bash
cd hindsight
./scripts/dev/start-control-plane.sh
#在动态端口上运行（检查终端输出）
```

### 4。启动演示后端 {#4-start-demo-backend}

```bash
cd hindsight-cookbook/deliveryman-demo/backend

#创建虚拟环境并安装依赖项
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

创建`backend/.env`：

```bash
OPENAI_API_KEY=<your-openai-api-key>
GROQ_API_KEY=<your-groq-api-key>
HINDSIGHT_API_URL=http://localhost:8888
LLM_MODEL=openai/gpt-4o
```

启动后端：

```bash
./run.sh
#或手动：
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --ws wsproto --reload
```

**注意：** WebSocket 支持需要 `--ws wsproto` 标志。如果没有它，连接将失败并出现错误 1006。

### 5。启动演示前端 {#5-start-demo-frontend}

```bash
cd hindsight-cookbook/deliveryman-demo/frontend
npm install
npm run dev
# 运行于 http://localhost:5173
```

### 6。打开演示 {#6-open-the-demo}

导航至浏览器中的 `http://localhost:5173`。

## 它是如何工作的 {#how-it-works}

1. 智能体收到递送任务（例如，“将包裹#3954递送给Victor Huang”）
2. 它在一个有楼层、电梯和天桥的多层建筑群中导航
3. 沿途它会遇到员工并了解他们的位置
4. 每次传送后，对话都会发送至Hindsight通过 **retain**API
5. Hindsight提取事实（员工位置、建筑布局）并构建 **心智模型**
6. 在后续交付中，智能体查询Hindsight以记忆所学到的内容

## 建筑 {#architecture}

```
Browser (5173) → Frontend (React + Phaser)
                    ↓ WebSocket
                 Backend (8000) → FastAPI + Delivery Agent
                    ↓ HTTP
                 Hindsight API (8888) → Memory Engine + PostgreSQL
```

## 故障排除 {#troubleshooting}

|问题|解决方案|
|---------|----------|
|WebSocket 错误 1006|使用 重新启动后端 `--ws wsproto` 旗帜|
|心智模型失踪员工|检查`HINDSIGHT_API_RETAIN_EXTRACTION_MODE=custom`已设定|
|Hindsight 连接被拒绝|验证 Hindsight API 正在端口 8888 上运行|
|前端显示“已断开连接”|检查后端是否在端口 8000 上运行|
