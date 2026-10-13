package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

func main() {
	apiURL := os.Getenv("HINDSIGHT_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8888"
	}

	cfg := hindsight.NewConfiguration()
	cfg.Servers = hindsight.ServerConfigurations{{URL: apiURL}}
	client := hindsight.NewAPIClient(cfg)
	ctx := context.Background()

	// [docs:document-retain]
	// 使用文档 ID 存储
	docID := "meeting-2024-03-15"
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{
					Content:    hindsight.TextContent("Alice 介绍了第四季度路线图..."),
					DocumentId: *hindsight.NewNullableString(&docID),
				},
			},
		}).Execute()
	// [/docs:document-retain]

	// [docs:document-update]
	// Original
	planDoc := "project-plan"
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{
					Content:    hindsight.TextContent("项目截止日期：3 月 31 日"),
					DocumentId: *hindsight.NewNullableString(&planDoc),
				},
			},
		}).Execute()

	// 更新（删除旧事实，创建新事实）
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{
					Content:    hindsight.TextContent("项目截止日期：4 月 15 日（已延期）"),
					DocumentId: *hindsight.NewNullableString(&planDoc),
				},
			},
		}).Execute()
	// [/docs:document-update]

	// [docs:document-get]
	doc, _, err := client.DocumentsAPI.GetDocument(ctx, "my-bank", "meeting-2024-03-15").Execute()
	if err != nil {
		log.Fatalf("获取文档失败： %v", err)
	}
	fmt.Printf("文档 ID： %s\n", doc.GetId())
	fmt.Printf("记忆单元： %d\n", doc.GetMemoryUnitCount())
	// [/docs:document-get]

	// [docs:document-update-tags]
	// 替换文档标签（替换后的完整集合）
	updateResult, _, err := client.DocumentsAPI.UpdateDocument(ctx, "my-bank", "meeting-2024-03-15").
		UpdateDocumentRequest(hindsight.UpdateDocumentRequest{Tags: []string{"team-a", "team-b"}}).
		Execute()
	if err != nil {
		log.Fatalf("更新文档失败： %v", err)
	}
	fmt.Printf("Updated: %v\n", updateResult.GetSuccess())

	// 移除全部标签，让文档在所有范围可见。传空切片而非 nil：
	// nil 切片被请求省略，服务器会拒绝没有标签的更新。
	client.DocumentsAPI.UpdateDocument(ctx, "my-bank", "meeting-2024-03-15").
		UpdateDocumentRequest(hindsight.UpdateDocumentRequest{Tags: []string{}}).
		Execute()
	// [/docs:document-update-tags]

	cleared, _, err := client.DocumentsAPI.GetDocument(ctx, "my-bank", "meeting-2024-03-15").Execute()
	if err != nil || len(cleared.GetTags()) != 0 {
		log.Fatalf("清空后预期无标签，实际为 %v (err %v)", cleared.GetTags(), err)
	}

	// [docs:document-delete]
	client.DocumentsAPI.DeleteDocument(ctx, "my-bank", "meeting-2024-03-15").Execute()
	// [/docs:document-delete]

	// [docs:document-list]
	// 列出全部文档
	docs, _, err := client.DocumentsAPI.ListDocuments(ctx, "my-bank").Execute()
	if err != nil {
		log.Fatalf("列出文档失败： %v", err)
	}
	for _, d := range docs.Items {
		fmt.Printf("%s: %d 条记忆\n", d.Id, d.GetMemoryUnitCount())
	}
	// [/docs:document-list]

	// 清理（不在文档中展示）
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/my-bank", apiURL), nil)
	http.DefaultClient.Do(req)

	fmt.Println("documents.go: 全部示例通过")
}
