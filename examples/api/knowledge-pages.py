#!/usr/bin/env python3
"""
Hindsight 知识页面 API 示例.
运行： python examples/api/knowledge-pages.py
"""
import os
import time

HINDSIGHT_URL = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
BANK_ID = "knowledge-pages-demo-bank"

# =============================================================================
# 初始化（不在文档中展示）
# =============================================================================
from hindsight_client import Hindsight

client = Hindsight(base_url=HINDSIGHT_URL)

client.create_bank(bank_id=BANK_ID, name="知识页面演示")
client.retain(bank_id=BANK_ID, content="API 通过滚动更新部署到 Kubernetes")
client.retain(bank_id=BANK_ID, content="CI 通过后从 main 分支部署")
client.retain(bank_id=BANK_ID, content="部署失败时重新部署上一个标签以回滚")

time.sleep(2)

# =============================================================================
# 文档示例
# =============================================================================

# [docs:create-folder]
# 创建文件夹，省略 parent_id 或传 None 则在根目录
folder = client.create_knowledge_folder(BANK_ID, name="运维")

print(f"文件夹 ID： {folder.id}")
# [/docs:create-folder]

# [docs:create-page]
# 创建页面，后台生成内容
page = client.create_knowledge_page(
    BANK_ID,
    name="部署 API",
    source_query="API 如何部署？",
    parent_id=folder.id,
    tags=["ops", "type:runbook"],
)

# 轮询操作，确认首次构建完成
print(f"页面 ID： {page.page_id}, operation: {page.operation_id}")
# [/docs:create-page]

# 等待首次构建
time.sleep(20)

# [docs:get-tree]
# 获取嵌套文件夹/页面树，不含正文
tree = client.get_knowledge_base_tree(BANK_ID)

for root in tree.roots:
    print(f"{root.kind}: {root.name}")
    for child in root.children:
        print(f"  {child.kind}: {child.name} (stale: {child.is_stale})")
# [/docs:get-tree]

# [docs:get-page]
# 以 Markdown 文档读取页面
document = client.get_knowledge_page(BANK_ID, page.page_id)

print(document.type)      # "runbook" — 来自 type:runbook 标签
print(document.body)      # the synthesized markdown body
print(document.markdown)  # YAML frontmatter + body
# [/docs:get-page]

# [docs:search-pages]
# 整页全文和向量混合搜索
results = client.search_knowledge_base(BANK_ID, q="如何部署", limit=5)

for hit in results.results:
    print(f"{hit.score:.3f}  {hit.name}: {hit.snippet}")
# [/docs:search-pages]

# [docs:filter-by-tags]
# 按标签限定树和搜索（召回的 tags / tags_match / tag_groups）
tree = client.get_knowledge_base_tree(BANK_ID, tags=["type:runbook"], tags_match="any_strict")
ops_hits = client.search_knowledge_base(BANK_ID, q="如何部署", tags=["ops"], tags_match="all_strict")
print(f"{len(tree.roots)} 个运行手册根节点， {len(ops_hits.results)} 条运维匹配")

# 复合筛选使用 tag_groups，此处排除草稿运行手册
not_drafts = client.search_knowledge_base(
    BANK_ID,
    q="如何部署",
    tag_groups=[{"and": [{"tags": ["type:runbook"]}, {"not": {"tags": ["draft"]}}]}],
)
print(f"{len(not_drafts.results)} 份非草稿运行手册")
# [/docs:filter-by-tags]

# [docs:update-node]
# 重命名、移动节点或更新页面选项。
# 修改 source_query 按新问题重建页面。
client.update_knowledge_node(
    BANK_ID,
    page.page_id,
    name="部署 API (v2)",
    tags=["ops", "type:runbook", "reviewed"],
)
# [/docs:update-node]

# [docs:export]
# 导出为可移植 Markdown 包
bundle = client.export_knowledge_base(BANK_ID)

for file in bundle.files:
    print(file.path)  # index.md, <page-id>.md, <page-id>.log.md
# [/docs:export]

# [docs:delete-node]
# 删除文件夹或页面，删除文件夹会移除整棵子树
client.delete_knowledge_node(BANK_ID, folder.id)
# [/docs:delete-node]

# =============================================================================
# 清理（不在文档中展示）
# =============================================================================
client.delete_bank(bank_id=BANK_ID)

print("knowledge-pages.py: 全部示例通过")
