package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

const kpBankID = "knowledge-pages-demo-bank-go"

func main() {
	apiURL := os.Getenv("HINDSIGHT_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8888"
	}

	cfg := hindsight.NewConfiguration()
	cfg.Servers = hindsight.ServerConfigurations{{URL: apiURL}}
	client := hindsight.NewAPIClient(cfg)
	ctx := context.Background()

	// =============================================================================
	// 初始化（不在文档中展示）
	// =============================================================================
	client.BanksAPI.CreateOrUpdateBank(ctx, kpBankID).
		CreateBankRequest(hindsight.CreateBankRequest{
			Name: *hindsight.NewNullableString(hindsight.PtrString("知识页面演示")),
		}).Execute()
	for _, content := range []string{
		"API 通过滚动更新部署到 Kubernetes",
		"CI 通过后从 main 分支部署",
		"部署失败时重新部署上一个标签以回滚",
	} {
		client.MemoryAPI.RetainMemories(ctx, kpBankID).
			RetainRequest(hindsight.RetainRequest{
				Items: []hindsight.MemoryItem{{Content: hindsight.TextContent(content)}},
			}).Execute()
	}
	time.Sleep(2 * time.Second)

	// [docs:create-folder]
	// 创建文件夹，未设置 ParentId 则在根目录
	folder, _, _ := client.KnowledgeBaseAPI.CreateKnowledgeFolder(ctx, kpBankID).
		CreateFolderRequest(hindsight.CreateFolderRequest{Name: "运维"}).
		Execute()

	fmt.Printf("文件夹 ID： %s\n", folder.Id)
	// [/docs:create-folder]

	// [docs:create-page]
	// 创建页面，后台生成内容
	page, _, _ := client.KnowledgeBaseAPI.CreateKnowledgePage(ctx, kpBankID).
		CreatePageRequest(hindsight.CreatePageRequest{
			Name:        "部署 API",
			SourceQuery: "API 如何部署？",
			ParentId:    *hindsight.NewNullableString(&folder.Id),
			Tags:        []string{"ops", "type:runbook"},
		}).Execute()

	// 轮询操作，确认首次构建完成
	fmt.Printf("页面 ID： %s, operation: %s\n", page.PageId, page.GetOperationId())
	// [/docs:create-page]

	// 等待首次构建
	time.Sleep(20 * time.Second)

	// [docs:get-tree]
	// 获取嵌套文件夹/页面树，不含正文
	tree, _, _ := client.KnowledgeBaseAPI.GetKnowledgeBaseTree(ctx, kpBankID).Execute()

	for _, root := range tree.Roots {
		fmt.Printf("%s: %s\n", root.Kind, root.Name)
		for _, child := range root.Children {
			fmt.Printf("  %s: %s (stale: %v)\n", child.Kind, child.Name, child.GetIsStale())
		}
	}
	// [/docs:get-tree]

	// [docs:get-page]
	// 以 Markdown 文档读取页面
	document, _, _ := client.KnowledgeBaseAPI.GetKnowledgePage(ctx, kpBankID, page.PageId).Execute()

	fmt.Println(document.Type)      // "runbook" — 来自 type:runbook 标签
	fmt.Println(document.GetBody()) // the synthesized markdown body
	fmt.Println(document.Markdown)  // YAML frontmatter + body
	// [/docs:get-page]

	// [docs:search-pages]
	// 整页全文和向量混合搜索
	results, _, _ := client.KnowledgeBaseAPI.SearchKnowledgeBase(ctx, kpBankID).
		Q("如何部署").Limit(5).Execute()

	for _, hit := range results.Results {
		fmt.Printf("%.3f  %s: %s\n", hit.Score, hit.Name, hit.Snippet)
	}
	// [/docs:search-pages]

	// [docs:filter-by-tags]
	// 按标签限定树和搜索（召回的 tags / tags_match / tag_groups）
	runbooks, _, _ := client.KnowledgeBaseAPI.GetKnowledgeBaseTree(ctx, kpBankID).
		Tags([]string{"type:runbook"}).TagsMatch("any_strict").Execute()
	fmt.Printf("运行手册根节点： %d\n", len(runbooks.Roots))

	// 复合筛选使用 tag_groups，以 JSON 编码查询参数发送
	notDrafts, _, _ := client.KnowledgeBaseAPI.SearchKnowledgeBase(ctx, kpBankID).
		Q("如何部署").
		TagGroups(`[{"and":[{"tags":["type:runbook"]},{"not":{"tags":["draft"]}}]}]`).Execute()
	fmt.Printf("非草稿匹配： %d\n", len(notDrafts.Results))
	// [/docs:filter-by-tags]

	// [docs:update-node]
	// 重命名、移动节点或更新页面选项。
	// 修改 SourceQuery 按新问题重建页面。
	client.KnowledgeBaseAPI.UpdateKnowledgeNode(ctx, kpBankID, page.PageId).
		UpdateNodeRequest(hindsight.UpdateNodeRequest{
			Name: *hindsight.NewNullableString(hindsight.PtrString("部署 API (v2)")),
			Tags: []string{"ops", "type:runbook", "reviewed"},
		}).Execute()
	// [/docs:update-node]

	// [docs:export]
	// 导出为可移植 Markdown 包
	bundle, _, _ := client.KnowledgeBaseAPI.ExportKnowledgeBase(ctx, kpBankID).Execute()

	for _, file := range bundle.Files {
		fmt.Println(file.Path) // index.md, <page-id>.md, <page-id>.log.md
	}
	// [/docs:export]

	// [docs:delete-node]
	// 删除文件夹或页面，删除文件夹会移除整棵子树
	client.KnowledgeBaseAPI.DeleteKnowledgeNode(ctx, kpBankID, folder.Id).Execute()
	// [/docs:delete-node]

	// =============================================================================
	// 清理（不在文档中展示）
	// =============================================================================
	cleanupKnowledgePages(apiURL)

	fmt.Println("knowledge-pages.go: 全部示例通过")
}

func cleanupKnowledgePages(apiURL string) {
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, kpBankID), nil)
	http.DefaultClient.Do(req)
}
