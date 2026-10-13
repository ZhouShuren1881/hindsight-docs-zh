---
sidebar_position: 13
---

# Sanity CMS 博客记忆 {#sanity-cms-blog-memory}


:::info 完整应用
这是一个完整的、可运行的应用程序，演示了Hindsight集成。
[**在 GitHub 查看源码 →**](https://github.com/vectorize-io/hindsight-cookbook/tree/main/applications/sanity-blog-memory)
:::


AHindsight食谱演示如何同步来自 的博客文章 **Sanity CMS** 至Hindsight智能体记忆，支持语义搜索、时间查询和AI支持的内容洞察。

## 特点 {#features}

- **博客文章同步**：自动将所有博客文章从 Sanity 同步到Hindsight
- **基于文档的更新或插入**：与 幂等同步 `document_id` - 重新运行同步更新现有内容
- **语义搜索**：使用自然语言查询查找相关内容
- **时间查询**：问“2025 年 1 月我写了什么？”
- **反思生成洞见**：生成  对您的博客内容进行AI支持的分析
- **发现相关内容**：增强具有语义相似性的“相关帖子”功能

## 建筑 {#architecture}

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Sanity CMS    │───────▶│    Sync Script  │───────▶│   Hindsight     │
│   (Content)     │  GROQ   │   (TypeScript)  │  HTTP   │   (Memory)      │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────────┐
                                                        │                 │
                                                        │   Your App      │
                                                        │   - Recall      │
                                                        │   - Reflect     │
                                                        │                 │
                                                        └─────────────────┘
```

## 快速入门 {#quick-start}

### 1。开始Hindsight {#1-start-hindsight}

选择您首选的LLM提供商：

**方案 A：使用 Docker Compose（推荐）**

```bash
#设置API 键
export OPENAI_API_KEY=sk-...
# OR
export GOOGLE_API_KEY=...  #Gemini（提供免费套餐）
# OR
export GROQ_API_KEY=...    #Groq（提供免费套餐）

#开始Hindsight
docker compose up -d
```

**方案 B：直接使用 Docker**

```bash
export OPENAI_API_KEY=sk-...

docker run --rm -it --pull always -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -e HINDSIGHT_API_LLM_MODEL=gpt-4o-mini \
  -v $HOME/.hindsight-docker:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- **API**：http://localhost:8888
- **控制平面界面**：http://localhost:9999

### 2。配置环境 {#2-configure-environment}

```bash
#复制示例配置
cp .env.example .env

#使用您的值进行编辑
nano .env
```

所需设置：
```bash
# Hindsight
HINDSIGHT_API_URL=http://localhost:8888
HINDSIGHT_BANK_ID=blog-memory

#理智CMS
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
```

### 3。安装依赖项 {#3-install-dependencies}

```bash
npm install
```

### 4。同步您的博客文章 {#4-sync-your-blog-posts}

```bash
npm run sync
```

预期输出：
```
=======================================
  Sanity -> Hindsight Blog Sync
=======================================

Setting up memory bank...
Memory bank "blog-memory" ready

Fetching posts from Sanity CMS...
Found 10 posts to sync

Syncing posts to Hindsight...
  [1/10] "为什么我选择Qwik"... done
  [2/10] "建筑AI智能体"... done
  ...

=======================================
  Sync Complete
=======================================
  Synced: 10 posts
```

### 5。查询您的内容 {#5-query-your-content}

```bash
npm run query
```

## 查询示例 {#query-examples}

### 语义搜索 {#semantic-search}

使用自然语言查找相关内容：

```typescript
import { recallMemory } from './hindsight-client.js';

//查找有关 AI 智能体的帖子
const result = await recallMemory('AI智能体和自动化', {
  budget: 'mid',
  maxTokens: 2048,
});

console.log(`Found ${result.results.length} relevant posts`);
```

### 时间查询 {#temporal-queries}

询问特定时间段的内容：

```typescript
//2025 年 1 月的帖子
const result = await recallMemory('2025 年 1 月我写了什么？', {
  queryTimestamp: '2025-01-31T23:59:59Z',
});
```

### 对洞察的反思 {#reflect-for-insights}

生成AI支持的内容分析：

```typescript
import { reflectOnMemory } from './hindsight-client.js';

//分析博客主题
const insights = await reflectOnMemory(
  '我的博客的主题是什么？我写得最多的主题是什么？',
  { budget: 'high' }
);

console.log(insights.text);
```

### 相关内容发现 {#related-content-discovery}

增强您的“相关帖子”功能：

```typescript
//查找与特定文章类似的帖子
const related = await recallMemory(
  '查找与“为什么我选择 Qwik 作为我的个人网站”相关的帖子',
  { budget: 'mid' }
);
```

## 记忆结构 {#memory-structure}

每篇博客文章都存储有丰富的元数据，以实现最佳记忆：

```
#博客文章：{title}

**发布日期：** {date}
**URL:** {base_url}/blog/{slug}
**标签：** {tags}
**阅读时间：** {reading_time}

## Description
{description}

## Content
{full_content}
```

主要特点：
- **document_id**：`post:{slug}` - 在重新同步时启用更新插入
- **context**：`blog-post` - 对记忆类型进行分类
- **timestamp**：发布日期 - 启用临时查询

## 用例 {#use-cases}

### 1。 AI-支持博客搜索 {#1-ai-powered-blog-search}

用语义理解代替关键字搜索：

```typescript
//旧：关键字匹配
const results = posts.filter(p => p.title.includes('React'));

//新：语义理解
const result = await recallMemory('前端框架教程');
```

### 2。内容推荐引擎 {#2-content-recommendation-engine}

生成个性化推荐：

```typescript
const recommendations = await reflectOnMemory(
  '基于对“AI自动化”感兴趣的读者，推荐相关帖子'
);
```

### 3。写作助理 {#3-writing-assistant}

根据您现有的内容获取主题建议：

```typescript
const suggestions = await reflectOnMemory(
  '接下来我应该写什么话题？我的内容存在哪些差距？'
);
```

### 4。内容分析 {#4-content-analytics}

分析你的博客的演变：

```typescript
const analysis = await reflectOnMemory(
  '过去一年我的写作主题有何变化？'
);
```

## 配置 {#configuration}

### 环境变量 {#environment-variables}

|变量|说明|默认|
|----------|-------------|---------|
|`HINDSIGHT_API_URL`|Hindsight API 端点|`http://localhost:8888`|
|`HINDSIGHT_BANK_ID`|记忆库标识符|`blog-memory`|
|`SANITY_PROJECT_ID`|您的 Sanity 项目 ID|（必填）|
|`SANITY_DATASET`|Sanity 数据集名称|`production`|
|`SANITY_API_TOKEN`|Sanity API 令牌（用于私有数据集）|（无）|
|`SANITY_API_VERSION`|理智API版本|`2024-01-09`|
|`SITE_URL`|您博客的基本 URL|`https://example.com`|

### 记忆 记忆库 处置 {#memory-bank-disposition}

记忆库配置了针对博客内容优化的性格特征：

```typescript
{
  skepticism: 2,   //信任 - 博客内容具有权威性
  literalism: 4,   //字面意思 - 确切的内容很重要
  empathy: 3,      // Balanced
}
```

## 扩展到其他 CMS 平台 {#extending-for-other-cms-platforms}

此模式可以适用于任何 CMS。关键部件：

### 1。内容管理系统客户端 {#1-cms-client}

更换`sanity-client.ts` 与您的 CMS：

```typescript
// contentful-client.ts
import { createClient } from 'contentful';

export async function getAllPosts(): Promise<BlogPost[]> {
  const client = createClient({...});
  const entries = await client.getEntries({ content_type: 'blogPost' });
  return entries.items.map(transformPost);
}
```

### 2。内容转型 {#2-content-transformation}

确保您的内容格式适合语义搜索：

```typescript
function formatPostContent(post: BlogPost): string {
  return `# ${post.title}
  
**发布日期：** ${post.date}
...
${post.content}`;
}
```

### 3。文档 ID 策略 {#3-document-id-strategy}

使用一致的文档 ID 进行更新插入行为：

```typescript
await retainBlogPost(content, {
  documentId: `post:${post.slug}`,  //唯一、稳定的标识符
  timestamp: post.date,
});
```

## 故障排除 {#troubleshooting}

### “连接被拒绝”错误 {#connection-refused-error}

确保Hindsight正在运行：
```bash
docker compose up -d
curl http://localhost:8888/health
```

### 同步期间“未找到帖子” {#no-posts-found-during-sync}

检查您的 Sanity 配置：
```bash
#验证项目ID
echo $SANITY_PROJECT_ID

#测试 GROQ 查询
npx sanity query '*[_type == "post"][0..2]{title}'
```

### recall/reflect反应慢 {#slow-recallreflect-responses}

这对于第一个查询来说是正常的，因为Hindsight构建嵌入。后续查询速度更快。使用 `budget: 'low'` 以牺牲记忆质量为代价获得更快的响应。

## 资源 {#resources}

- [Hindsight 文档](https://hindsight.vectorize.io/)
- [Hindsight GitHub](https://github.com/vectorize-io/hindsight)
- [Sanity CMS 文档](https://www.sanity.io/docs)
- [Hindsight 实战示例](https://github.com/vectorize-io/hindsight-cookbook)

## 许可证 {#license}

MIT
