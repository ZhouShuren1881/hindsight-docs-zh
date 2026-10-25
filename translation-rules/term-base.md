# Hindsight developer 术语表

本表依据英文 Hindsight 文档制定，用于二次翻译。既有中文译文不作为译法依据。本文统一中文是翻译约定；英文原文决定具体行为。

“来源”列中的文章路径相对于 `temp/docs-en/versioned_docs/version-0.10/developer/`；`figures/`、`src/` 路径相对于 `temp/docs-en/`。同一条目列出的是可核对定义的主要来源，不是所有出现位置。

## 使用约定

- 中文正文、标题、表格和图表统一使用“统一译法”。单复数不产生新译法。
- 产品操作名在正文首次出现时写 Retain（存入）、Recall（召回）、Reflect（反思）；导航菜单仅使用 Retain、Recall、Reflect，不附中文解释；操作标题可保留英文操作名。解释性标题可写“Recall：Hindsight 如何召回记忆”。
- “不采用/边界”列帮助区分概念，不要求把这些解释都加进每篇译文。
- 带反引号的 API 键、枚举、工具名、环境变量、命令和关系类型保持英文；中文只用于解释。
- 同一英文词因语境不同确需不同译法时，按本表的限定选择，不能用全局替换。

## 记忆与知识

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| agent / AI agent | 智能体 / AI 智能体 | 示例中的用户不等于智能体 | `index.mdx`, `retain.md` |
| agent memory | 智能体记忆 | memory 在系统意义下不是内存 | `index.mdx` |
| long-term memory | 长期记忆 | 不写长效内存 | `index.mdx` |
| persistent memory / persistent state | 持久记忆 / 持久状态 | persistence 为持久化 | `rag-vs-hindsight.md` |
| memory bank / bank | 记忆库 | 不写银行、记忆银行；bank_id 保留 | `api/memory-banks.mdx` |
| memory / memories | 记忆 | 表示存储的内容；不一律改成事实 | `index.mdx`, `api/memories.mdx` |
| memory unit | 记忆单元 | 原子存储单元，与文档、文本分块不同；一项输入可以产生多个记忆单元 | `api/memories.mdx`, `api/retain.mdx` |
| fact | 事实 | 原文称为事实不代表系统已外部验证其真伪；与观测、心智模型、知识页不能统称为“摘要” | `retain.md`, `observations.mdx` |
| raw fact / source fact | 原始事实 / 来源事实 | 来源事实为派生知识提供证据 | `reflect.mdx`, `api/recall.mdx` |
| world fact / world | 世界事实 | 关于外部人物、事物和事件；与经历事实按说话者是否为该库的智能体区分，不按第一人称语法区分。用户说“我买了一辆车”仍是关于用户的世界事实；`world` 不翻译 | `retain.md` |
| experience fact / experience | 经历事实 | 该记忆库的智能体自己的经历；不泛指用户经历；类型值 `experience` 不翻译 | `retain.md` |
| observation | 观测 | 从事实中整合、带证据并随证据演变的认知判断；不是观察动作、原始记录或心智模型 | `observations.mdx`, `figures/observations.json` |
| belief | 认知判断 | 指系统基于证据形成的认识，不译为信仰，也不承诺绝对正确 | `observations.mdx`, `index.mdx` |
| consolidated knowledge / consolidated belief | 整合后的知识 / 整合后的认知判断 | 不等于临时生成的摘要 | `observations.mdx` |
| mental model | 心智模型 | 用户定义问题，系统生成并维护常备答案；不等于底层 LLM | `mental-models.mdx`, `api/mental-models.mdx` |
| knowledge page | 知识页 | 以心智模型为底层，提供持续更新的文档与目录树 | `knowledge-pages.mdx`, `api/knowledge-pages.mdx` |
| knowledge base | 知识库 | 与记忆库区分；此处常指知识页目录树及内容 | `api/knowledge-pages.mdx` |
| living document | 持续更新的文档 | 不写活文档 | `knowledge-pages.mdx` |
| standing answer | 常备答案 | 预先写好、供反复读取并可更新的答案 | `mental-models.mdx` |
| curated / curation | 人工维护的 / 人工维护 | 语境可写人工修订；不暗示全文必须由人手写 | `api/memories.mdx`, `mental-models.mdx` |
| consolidation / consolidate | 整合 / 整合 | 知识处理过程，不只拼接或压缩文本 | `observations.mdx` |
| observation consolidation | 观测整合 | 将相关事实整合为观测 | `observations.mdx`, `figures/observations.json` |
| synthesis / synthesize | 综合生成 / 综合生成 | 根据证据生成内容；与整合过程的名称区分 | `knowledge-pages.mdx`, `reflect.mdx` |
| deduplication / deduplicate | 去重 / 去重 | 不丢掉有意义的不同细节 | `observations.mdx` |
| near-duplicate reconciliation | 近似重复项协调处理 | 决定合并或分别保留，不是全部删除 | `observations.mdx` |
| contradictory evidence / reconciliation | 矛盾证据 / 协调处理 | 保留变化历史，不能写成盲目覆盖 | `observations.mdx` |
| evidence / supporting evidence | 证据 / 支持证据 | 与 confidence 区分 | `observations.mdx`, `reflect.mdx` |
| evidence-grounded / grounding | 有证据依据的 / 建立依据 | 可按句式写“以……为依据”，不写接地 | `observations.mdx` |
| ground truth | 核验依据 | 本文通常指原始事实层；不是已外部证实的绝对真相 | `reflect.mdx` |
| proof count | 支持事实数 | 统计支持观测的事实，不是证明真理的次数 | `observations.mdx`, `retrieval.md` |
| provenance / source provenance | 来源追溯信息 / 来源追溯信息 | 描述证据、来源及历史，不写出处可信度 | `mental-models.mdx`, `retain.md` |
| citation / cite | 引用 / 引用 | 引用来源 ID 不翻译 | `reflect.mdx` |
| freshness / freshness awareness | 更新状态 / 更新状态感知 | 关注是否落后于新记忆，不是缓存 TTL | `observations.mdx`, `mental-models.mdx` |
| fresh / stale / staleness | 最新 / 待更新 / 待更新状态 | 表示是否落后于范围内的新记忆，不译为有效/无效；待更新不等于已证明错误或到期删除，需要时写“内容待更新” | `api/knowledge-pages.mdx`, `observations.mdx` |

## 摄取、内容与实体

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| Retain / retain | Retain（存入） | 操作名；解释行为用“存入”；不是数据保留期限 | `retain.md`, `api/retain.mdx` |
| ingestion / ingest | 摄取 / 摄取 | 内容进入处理流程，不写吞入 | `api/retain.mdx` |
| rich fact extraction / extraction | 丰富事实提取 / 提取 | captures 可按句式写“提取/记录” | `retain.md` |
| extraction mode | 提取模式 | `concise`、`verbose` 等枚举保留 | `api/memory-banks.mdx` |
| concise / verbose / custom | 精简 / 详尽 / 自定义 | 作为模式值时写 `concise` / `verbose` / `custom` | `retain.md` |
| verbatim / chunks (modes) | 原文保留模式 / 直接分块模式 | 前者仍由 LLM 提取元数据；后者不调用 LLM | `api/memory-banks.mdx` |
| document / document body | 文档 / 文档正文 | 逻辑文档，不保证一文档等于一上传文件；原始文档与提取后的事实不同 | `api/documents.mdx`, `api/retain.mdx` |
| item | 输入项 | Retain 请求中的一项；不是一条提取后记忆 | `api/retain.mdx` |
| content | 内容 | 键 `content` 保留；可为字符串或有序内容块 | `retain.md`, `api/retain.mdx` |
| context | 上下文 | 来源/情境说明，影响提取；不简单归为元数据 | `api/retain.mdx` |
| metadata | 元数据 | 键值及与路由有关的值保留 | `api/retain.mdx` |
| chunk / chunking | 文本分块 / 文本分块处理 | 不写碎片；chunk_id 保留 | `api/documents.mdx`, `figures/retain.json` |
| block | 内容块 | 多模态输入或增量文档的结构单元，不能统译为分块 | `retain.md`, `api/mental-models.mdx` |
| inline attachment / attachment | 内嵌附件 / 附件 | 与整个文件上传并解析成独立文档区分 | `retain.md`, `configuration.mdx` |
| multimodal / vision model | 多模态 / 视觉模型 | VLM 保留缩写 | `configuration.mdx` |
| transcription / OCR | 转写 / 光学字符识别（OCR） | 表格或音频为转写，图中文字识别为 OCR | `retain.md`, `configuration.mdx` |
| file parser / parser fallback chain | 文件解析器 / 解析器回退链 | 解析器 ID 不翻译 | `configuration.mdx` |
| entity / named entity | 实体 / 命名实体 | 人、组织、地点、概念等 | `retain.md` |
| entity recognition | 实体识别 | 与消解区分 | `retain.md` |
| entity resolution | 实体消解 | 将同一实体的名称变体归一；不是实体解析 | `retain.md`, `configuration.mdx` |
| disambiguation | 消歧 | 区分同名对象，不等于合并 | `retain.md` |
| canonical name | 规范名称 | 返回名或用于关联的字符串保持一致 | `api/recall.mdx` |
| fuzzy name matching / exact match | 模糊名称匹配 / 精确匹配 | 相似名称与完全匹配是不同规则 | `retain.md`, `api/memory-banks.mdx` |
| co-occurrence / temporal proximity | 共现 / 时间接近度 | 消解和排序中的含义按各自上下文解释 | `retain.md`, `retrieval.md` |
| entity label / label group | 实体标签 / 标签组 | `entity_labels` 的分类维度，与 tag_groups 不同；实体标签成为实体，可选择同时写入 `tags`，不能把实体标签与标签当作同一个字段 | `api/memory-banks.mdx` |
| controlled vocabulary / open vocabulary | 受控词表 / 开放词表 | 实体标签的取值约束，不是本翻译术语表 | `api/memory-banks.mdx` |
| tag / tagging | 标签 / 添加标签 | 用于筛选和限定范围；不能把所有 label 都译成这种数据标签 | `api/retain.mdx` |
| document tags / item tags | 文档标签 / 输入项标签 | 保留传播范围和覆盖/合并规则 | `retain.md`, `api/documents.mdx` |
| upsert / idempotent | 插入或更新 / 幂等 | 保留同 document_id 重处理与 operation_id 安全重试的区别 | `api/retain.mdx` |
| append / replace | 追加 / 替换 | 枚举与字段值保留；追加也可能重处理合并文档 | `api/retain.mdx` |
| reprocess / re-ingest | 重新处理 / 重新摄取 | 不自动保留对提取事实的人工修订 | `api/memories.mdx`, `retain.md` |

## 检索、图与排序

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| Recall / recall | Recall（召回） | 操作名；不能把通用 retrieval 全部译成召回 | `retrieval.md`, `api/recall.mdx` |
| retrieval / search / query | 检索 / 搜索 / 查询 | 描述获取信息、搜索行为、请求问题时分别使用 | `retrieval.md` |
| multi-strategy retrieval | 多策略检索 | 四路并行，不译成顺序执行四次 | `retrieval.md`, `figures/tempr.json` |
| arm / retrieval arm | 检索分支 | 图中可写“一路”；不写手臂 | `retrieval.md` |
| semantic search / semantic similarity | 语义检索 / 语义相似度 | 相似度不等于事实可信度 | `retrieval.md` |
| keyword search / full-text search | 关键词检索 / 全文检索 | `native` 并非真正 BM25，保留原文限定 | `retrieval.md`, `multilingual.mdx` |
| graph traversal / graph retrieval | 图遍历 / 图检索 | 通过实体关系寻找间接连接 | `retrieval.md` |
| temporal search / temporal reasoning | 时间检索 / 时间推理 | 不统一写时序分析 | `retrieval.md`, `retain.md` |
| knowledge graph / entity graph | 知识图谱 / 实体图 | 两者按原文粒度区分 | `retain.md`, `figures/tempr.json` |
| link / edge / node | 连接 / 边 / 节点 | 本文数据连接用“连接”；图论结构用“边” | `retain.md`, `src/components/MemoryConstellation.tsx` |
| causal link / causal relationship | 因果连接 / 因果关系 | `caused_by` 为关系值，原样保留 | `retain.md`, `figures/retain.json` |
| multi-hop reasoning / hop | 多跳推理 / 跳 | 指跨关系链探索，不是多轮对话 | `rag-vs-hindsight.md`, `retrieval.md` |
| link expansion | 连接扩展 | 当前默认图检索算法值为 `link_expansion`，原样保留 | `configuration.mdx` |
| vector / embedding / embed | 向量 / 嵌入向量 / 生成嵌入向量 | 模型称“嵌入模型”；不写嵌入式向量 | `models.mdx`, `configuration.mdx` |
| vector search / embedding dimension | 向量检索 / 嵌入维度 | 维度不是 token 长度 | `storage.md`, `models.mdx` |
| approximate nearest neighbor (ANN) | 近似最近邻（ANN） | “近似”不能漏译 | `configuration.mdx`, `retrieval.md` |
| tokenizer / tokenization / lexeme | 分词器 / 分词 / 词元 | 不把分词器的词元与 LLM token 计费混用 | `multilingual.mdx`, `api/recall.mdx` |
| Reciprocal Rank Fusion (RRF) | 倒数排名融合（RRF） | 基于排名位置，不基于各路原始分数 | `retrieval.md` |
| rank / ranking / score | 排名 / 排序 / 分数 | 排名位置与分数不得互换 | `retrieval.md` |
| reranking / reranker | 重排序 / 重排序模型 | provider 可写“重排序服务提供方” | `models.mdx`, `retrieval.md` |
| cross-encoder | 交叉编码器 | 联合读取查询和候选记忆 | `retrieval.md` |
| candidate pool / pre-filtering | 候选池 / 预筛选 | 与最终结果筛选区分 | `retrieval.md` |
| relevance / confidence | 相关性 / 置信度 | 单次查询分数不能直接跨查询比较 | `api/recall.mdx` |
| normalization / raw logits | 归一化 / 原始 logits | 公式不翻译 | `retrieval.md` |
| boost / recency boost | 加权提升 / 近期性加权提升 | 原文的乘法调整也可能降低排名，按上下文说明 | `retrieval.md` |
| recency / temporal window | 近期性 / 时间窗口 | 近期性、窗口接近度与新知识待整合是不同信号 | `retrieval.md`, `api/recall.mdx` |
| occurred_start / occurred_end | 发生时间起点 / 发生时间终点 | 字段保留，解释为事实所述事件时间 | `api/recall.mdx`, `api/memories.mdx` |
| mentioned_at / query_timestamp | 提及时间 / 查询参照时间 | 字段保留；不要统译为创建时间；相对时间必须保留其 `timestamp` 或 `query_timestamp` 参照 | `api/recall.mdx`, `api/retain.mdx` |
| occurred / mentioned / created / updated | 发生 / 被提及 / 创建 / 更新 | 事件时间、提及时间、摄取时间与最后更新时间不能互换 | `api/memories.mdx`, `api/retain.mdx` |
| token / token budget | token / token 预算 | 全文保留 token 这一计量词，不用汉字数代替 | `retrieval.md` |
| search depth / context window | 检索深度 / 上下文窗口 | `budget` 与 `max_tokens` 分别说明 | `retrieval.md` |
| top-k / token truncation | 前 k 项 / 按 token 预算截取 | `top-k` 标识保留；具体事实与分块截取规则不同 | `retrieval.md`, `api/recall.mdx` |
| Retrieval-Augmented Generation (RAG) | 检索增强生成（RAG） | 保留原文比较的范围，不扩写成对所有 RAG 的断言 | `rag-vs-hindsight.md` |

## 推理、范围与刷新

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| Reflect / reflect | Reflect（反思） | 基于记忆推理生成答案，不是简单检索 | `reflect.mdx` |
| agentic reasoning / agentic loop | 智能体推理 / 智能体循环 | 自动选择工具、取证再作答 | `reflect.mdx`, `figures/reflect.json` |
| hierarchical retrieval | 分层检索 | 先精炼知识，再按需核验来源层 | `reflect.mdx`, `mental-models.mdx` |
| tool call / iteration | 工具调用 / 迭代轮次 | 不保证每次调用就是一个新用户轮次 | `reflect.mdx` |
| mission | 任务说明 | 自然语言身份/关注重点，不一律译成任务目标 | `api/memory-banks.mdx` |
| retain mission / observations mission / reflect mission | 提取任务说明 / 观测任务说明 / 反思任务说明 | 键分别为 retain_mission / observations_mission / reflect_mission；作用不同 | `retain.md`, `observations.mdx`, `reflect.mdx` |
| disposition / disposition trait | 性格倾向 / 性格倾向特征 | 影响解读与语气，属于软性影响，不是强制规则 | `reflect.mdx` |
| skepticism / literalism / empathy | 怀疑倾向 / 字面解读倾向 / 共情倾向 | 保留 1–5 的方向，literalism 不写文学性 | `reflect.mdx`, `api/memory-banks.mdx` |
| directive / hard rule / guardrail | 强制指令 / 硬性规则 / 约束 | directive 是适用范围内的硬规则，与普通 instructions 区分 | `reflect.mdx`, `api/memory-banks.mdx` |
| scope / visibility scope | 范围 / 可见范围 | 指标签集合限定的数据边界，不是词法作用域 | `api/recall.mdx`, `api/reflect.mdx` |
| observation scope / consolidation scope | 观测范围 / 整合范围 | 已按 observation_scopes 分组的范围 | `observations.mdx`, `api/retain.mdx` |
| consolidation strategy | 整合策略 | 不同范围的任务说明与限额规则 | `observations.mdx` |
| untagged / global scope | 无标签的 / 全局范围 | 限于该记忆库的共享范围 | `api/recall.mdx` |
| isolation / strict isolation | 隔离 / 严格隔离 | 文档标签筛选不自动等于完整授权机制 | `api/reflect.mdx`, `extensions.md` |
| any / all / any_strict / all_strict / exact | 任一匹配 / 全部匹配 / 严格任一匹配 / 严格全部匹配 / 精确集合匹配 | 枚举保留；无标签和空过滤条件按接口原文说明 | `api/recall.mdx` |
| tag_groups | 复合标签条件组 | 键保留；不是 entity_labels 的标签组 | `api/recall.mdx` |
| combined / shared / per_tag / all_combinations | 合并标签范围 / 共享范围 / 按标签分别划分 / 所有标签组合 | observation_scopes 的模式值保留；shared 不等于空数组 | `api/retain.mdx` |
| refresh / trigger / scheduled refresh | 刷新 / 触发器 / 定时刷新 | 不把刷新等同浏览器刷新 | `api/mental-models.mdx` |
| full / delta (refresh modes) | 完整重建 / 增量编辑 | 模式值保留；原文 delta 失败不隐式完整重写 | `api/mental-models.mdx`, `figures/refresh-modes.json` |
| section / block (delta document) | 章节 / 内容块 | 通过 ID 定位；section 技术值不翻译 | `api/mental-models.mdx` |
| staleness gating | 待更新状态判定 | 先检查范围内是否变化，再决定是否刷新 | `api/mental-models.mdx` |
| structured output / response schema | 结构化输出 / 响应模式 | JSON Schema 首次可写“JSON 模式（JSON Schema）”；与数据库 schema 区分 | `reflect.mdx` |
| history / version snapshot | 历史记录 / 版本快照 | 失败记录与成功版本区分 | `api/mental-models.mdx` |
| invalidate / restore / prune | 标记失效 / 恢复 / 清理 | 对记忆的失效可逆，清理与删除按接口区分 | `api/memories.mdx` |
| projected view / mirror to disk | 映射视图 / 镜像到磁盘 | 知识页映射成文件，区别于事实存储本身 | `knowledge-pages.mdx` |
| folder tree / subtree / node | 目录树 / 子树 / 节点 | 知识页树中节点可为文件夹或页面 | `api/knowledge-pages.mdx` |

## 服务、模型、配置与运维

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| API service / API server | API 服务 / API 服务器 | 保留包名 hindsight-api | `services.md`, `installation.md` |
| Control Plane | 控制台 | 此产品中为管理与探索记忆库的 Web 界面，不写控制飞机 | `services.md` |
| worker / worker service | 工作进程 / 工作进程服务 | 不写工人；命令 hindsight-worker 保留 | `services.md` |
| internal worker / dedicated worker | 内置工作进程 / 独立工作进程 | 前者默认在 API 进程中运行 | `services.md`, `api/operations.mdx` |
| decommission worker | 退役工作进程 | 管理 CLI 中释放其任务以供重新领取；不扩写成终止操作系统进程。命令 `decommission-worker`、`decommission-workers` 保留 | `admin-cli.md` |
| operation / job / task | 操作 / 作业 / 任务 | Operation API 为操作记录；具体后台工作可称作业或任务 | `api/operations.mdx` |
| async / sync / in-process | 异步 / 同步 / 进程内 | 请求返回与后台完成区分 | `api/operations.mdx` |
| task broker / queue / polling | 任务代理 / 队列 / 轮询 | PostgreSQL 可承载任务，不据此添加外部队列 | `services.md` |
| enqueue / claim / requeue | 入队 / 领取 / 重新入队 | claim 是领取并处理任务 | `api/operations.mdx`, `figures/services.json` |
| pending / processing / completed / failed / cancelled | 等待处理 / 处理中 / 已完成 / 已失败 / 已取消 | 状态值保留，不把 completed 扩大成所有后续工作完成 | `api/operations.mdx` |
| parent operation / sub-batch | 父操作 / 子批次 | 聚合状态与单个任务不同 | `api/operations.mdx`, `performance.md` |
| cooperative cancellation | 协作式取消 | 标记取消不等于立刻终止所有运行中的调用 | `api/operations.mdx` |
| concurrency / slot / slot reservation | 并发数 / 槽位 / 预留槽位 | worker 预留是保底容量，不是各类任务硬上限 | `configuration.mdx` |
| backpressure / backlog / starvation | 背压 / 积压 / 资源饥饿 | 积压不是错误总数 | `extensions.md`, `monitoring.md`, `performance.md` |
| batching / provider Batch API | 批处理 / 模型供应商 Batch API | 本地摄取分批与供应商的异步批量推理不同 | `api/retain.mdx`, `performance.md` |
| throughput / latency / timeout | 吞吐量 / 延迟 / 超时 | 平均延迟、百分位延迟与超时限额不同 | `performance.md`, `monitoring.md` |
| retry / exponential backoff / jitter | 重试 / 指数退避 / 随机抖动 | 保留重试次数、间隔和范围 | `configuration.mdx` |
| failover / fallback / round-robin | 故障切换 / 回退 / 轮询调度 | 调度的 round-robin 与任务 polling 区分 | `configuration.mdx` |
| LLM / LLM provider | 大语言模型（LLM） / LLM 服务提供方 | 模型名、服务 ID 原样保留 | `models.mdx` |
| memory provider | 记忆提供方 | 集成中提供记忆能力的后端或适配层，不写记忆供应商；与 LLM 服务提供方区分 | `src/data/integrations.json`（Eve、Right Agent、Hermes Desktop） |
| reasoning effort / inference | 推理强度 / 推断 | LLM 的资源配置与业务推理区分 | `configuration.mdx`, `performance.md` |
| tool calling / structured-output support | 工具调用 / 结构化输出支持 | 原生支持与通过提示模拟不同 | `models.mdx`, `configuration.mdx` |
| explicit prompt caching | 显式提示缓存 | 与应用层查询缓存、隐式缓存区分 | `src/components/LLMProviderCapabilities.tsx` |
| embedded / managed / self-hosted | 嵌入式 / 托管的 / 自托管 | embedded 描述运行形态，不是生成 embedding | `installation.md`, `src/components/HomeFlow.tsx` |
| bare metal / horizontal scaling | 裸机 / 水平扩展 | 保留部署方式，不写原生金属 | `installation.md`, `services.md` |
| tenant / tenant extension | 租户 / 租户扩展 | 租户与记忆库不是同一隔离层 | `extensions.md` |
| authentication / authorization | 身份认证 / 授权 | API key 校验与访问权限分别描述 | `configuration.mdx`, `api/memory-banks.mdx` |
| allowlist / credentials / secret | 允许列表 / 凭据 / 敏感凭据 | webhook 签名 secret 具体写“签名密钥” | `configuration.mdx`, `memory-defense/index.md`, `api/webhooks.mdx` |
| config override / resolved config | 配置覆盖项 / 解析后的最终配置 | 导出覆盖项不等于导出所有有效默认值 | `api/bank-templates.mdx` |
| hierarchical configuration | 分层配置 | 全局 → 租户 → 记忆库，覆盖能力逐字段核对 | `configuration.mdx` |
| schema (database) / schema (JSON) | 数据库模式 / JSON 模式 | 不能把数据库 schema 写成 JSON 结构定义 | `oracle.md`, `configuration.mdx`, `api/bank-templates.mdx` |
| connection pool / migration / index | 连接池 / 迁移 / 索引 | migration 命令与包名不翻译 | `configuration.mdx`, `admin-cli.md` |
| retention window / retention sweep | 保留期限 / 过期清理扫描 | retention 不是 Retain 操作，0 和 -1 按字段解释 | `configuration.mdx` |
| bank template / manifest / dry run | 记忆库模板 / 清单 / 试运行 | 模板的配置导出与带数据的记忆库迁移不同 | `api/bank-templates.mdx` |
| export / import / backup / restore | 导出 / 导入 / 备份 / 恢复 | 接口模式值保留，范围和冲突规则不同 | `api/memory-banks.mdx`, `admin-cli.md` |
| alias / rename / clone | 别名 / 重命名 / 克隆 | 别名不复制或移动数据；克隆产生独立库 | `api/memory-banks.mdx`, `admin-cli.md` |
| webhook / payload / at-least-once delivery | Webhook / 载荷 / 至少一次投递 | 不译成恰好一次投递，消费者须能处理重复 | `api/webhooks.mdx` |
| replay protection / signature | 重放防护 / 签名 | header 名和用于签名的原始字节不改写 | `api/webhooks.mdx` |

## 安全、监控与图表

| 英文 | 统一译法 | 不采用/边界 | 来源 |
| --- | --- | --- | --- |
| Memory Defense | 记忆防护 | 首次可附 Memory Defense；保留当前开源功能范围 | `memory-defense/index.md` |
| personally identifiable information (PII) | 个人身份信息（PII） | 原文 US defaults 不扩写成全地区覆盖 | `memory-defense/index.md` |
| redact / redaction / scrub | 脱敏 / 脱敏处理 / 清除敏感内容 | 替换为标记，不等于整条删除 | `memory-defense/index.md` |
| block / quarantine / allow | 阻止 / 隔离 / 允许 | 安全动作值保留，别把配置值存在写成开源版全支持 | `api/memory-banks.mdx`, `memory-defense/index.md` |
| detector / prompt injection | 检测器 / 提示注入 | 原文实际启用规则与模式字段区分 | `api/memory-banks.mdx` |
| audit log / observability | 审计日志 / 可观测性 | 默认关闭、启用范围保留 | `configuration.mdx`, `monitoring.md` |
| metrics / distributed tracing | 指标 / 分布式追踪 | 不是观测 memory type | `monitoring.md` |
| trace / span / context propagation | 追踪记录 / 追踪跨度（span） / 上下文传播 | API trace 可称执行追踪；OTel trace 为调用链追踪 | `monitoring.md`, `api/reflect.mdx` |
| counter / gauge / histogram | 计数器 / 瞬时值指标 / 直方图 | 指标标识符及标签值保持英文 | `monitoring.md` |
| percentile / high-cardinality labels | 百分位数 / 高基数标签 | P95 不等于 95% 成功率；指标标签不等于记忆标签 | `monitoring.md` |
| liveness / readiness / health probe | 存活状态 / 就绪状态 / 健康探针 | 存活检查不依赖数据库；就绪检查访问数据库 | `monitoring.md`, `services.md` |
| benchmark / leaderboard | 基准测试 / 排行榜 | 截图仅反映原文时点 | `models.mdx`, `src/components/HomeBenchmarks.tsx` |
| retrieval accuracy | 检索准确率 | 不写召回率，不能替代任务完成率 | `src/components/HomeBenchmarks.tsx` |
| corrections per task / cost per task | 每项任务的纠正次数 / 每项任务成本 | 图中 USD 和对数尺度保留 | `src/components/CodingAgentsChart.tsx` |
| next best system / no published comparison | 排名次优的系统 / 暂无公开对比数据 | 缺比较值不能解释为对手 0 分 | `src/components/HomeBenchmarks.tsx` |
| quality / speed / reliability | 质量 / 速度 / 可靠性 | 排行榜的维度，可靠性含 schema conformance | `static/img/leaderboard.png` |
| schema conformance | 模式符合度 | 输出符合模式的程度，不是检索准确率 | `static/img/leaderboard.png` |
| coding agent / personal agent / harness | 编程智能体 / 个人智能体 / 智能体运行框架 | 框架名保留，不写安全带 | `index.mdx`, `src/components/HomeFlow.tsx` |
| label / legend / tooltip (chart UI) | 标注 / 图例 / 提示信息 | 图中 label 不是数据的实体标签；可见类别可称标签 | `src/components/constellation/Constellation.tsx` |

## 保留英文的标识符

以下类别不逐项列出中文替代值，沿用英文原文的大小写与拼写：

- 产品、供应商、框架与包：Hindsight、Hindsight Cloud、PostgreSQL / Postgres、Oracle AI Database、pg0、pgvector、pgvectorscale、vchord、Citus、OpenAI、Anthropic、Groq、Gemini、Ollama、llama.cpp、vLLM、LM Studio、LiteLLM、TEI 等。翻译描述语，不改品牌名。
- 协议、算法和数据格式缩写：API、SDK、CLI、MCP、HTTP、OAuth、JWT、HMAC-SHA256、BM25、TF-IDF、HNSW、DiskANN、GIN、CTE、ACID、JSON、JSONB、JSONL、YAML、ONNX、GGUF、UTC、ISO 8601 等。首次需要解释时用中文加缩写，技术字面值始终保持英文。
- 数据集及模型 ID：LongMemEval-S、LoComo、PersonaMem、PrecisionMemBench、LifeBench、BEAM、AMB、sdebench，以及 `BAAI/bge-m3` 等所有实际模型标识符。
- 函数、类、工具、事件、字段、表名与环境变量：`retain`、`recall`、`reflect`、`search_mental_models`、`search_observations`、`append_block`、`TenantExtension`、`memory_units`、`async_operations`、`retain.completed`、`memory_defense.triggered`、`HINDSIGHT_API_*`、`HINDSIGHT_CP_*` 等。
- URL、路径、端口、命令选项、语言标识、标签表达式、占位符、脱敏标记：如 `/mcp/{bank_id}/`、`:8888`、`--schema`、`company:*`、`[REDACTED:type]`。嵌入在图表 text 字段中也遵循此规则。

## 新术语的维护

新术语建议应说明它指向的概念与作用阶段，并包含英文、建议译法、边界及英文来源路径。已有词的改译建议还应列出受影响的文章与共享资源。

确定采用改译时，术语表、原则中的对应定义以及受影响文章和共享资源的译法应保持一致；不能只在某一页面临时换词。源文事实疑点应按原则中的“原文不一致的处理”说明，不通过改变术语来消除。
