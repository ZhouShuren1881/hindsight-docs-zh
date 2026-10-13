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

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:retain-basic]
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{Content: hindsight.TextContent("Alice 在 Google 担任软件工程师")},
			},
		}).Execute()
	// [/docs:retain-basic]

	// [docs:retain-conversation]
	// 将完整对话作为一个文档存储。
	conversation := "Alice (2024-03-15T09:00:00Z): Bob，你上周最后去看医生了吗？\n" +
		"Bob (2024-03-15T09:01:00Z): 去了，发现有轻度花生过敏。\n" +
		"Alice (2024-03-15T09:02:00Z): 哎呀，你还好吗？\n" +
		"Bob (2024-03-15T09:03:00Z): 还好，不严重，只需随身带抗组胺药。\n" +
		"Alice (2024-03-15T09:04:00Z): 知道了，团队午餐会避开花生。"

	docID := "chat-2024-03-15-alice-bob"
	context_ := "团队聊天"
	ts := "2024-03-15T09:04:00Z"
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{
					Content:    hindsight.TextContent(conversation),
					Context:    *hindsight.NewNullableString(&context_),
					DocumentId: *hindsight.NewNullableString(&docID),
					Timestamp: *hindsight.NewNullableTimestamp(&hindsight.Timestamp{
						String: &ts,
					}),
				},
			},
		}).Execute()
	// [/docs:retain-conversation]

	// [docs:retain-with-context]
	ctxLabel := "职业变化"
	ts2 := "2024-03-15T10:00:00Z"
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{
					Content: hindsight.TextContent("Alice 晋升为高级工程师"),
					Context: *hindsight.NewNullableString(&ctxLabel),
					Timestamp: *hindsight.NewNullableTimestamp(&hindsight.Timestamp{
						String: &ts2,
					}),
				},
			},
		}).Execute()
	// [/docs:retain-with-context]

	// [docs:retain-batch]
	doc1 := "conversation_001_msg_1"
	doc2 := "conversation_001_msg_2"
	doc3 := "conversation_001_msg_3"
	ctx1 := "career"
	ctx2 := "relationship"
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{Content: hindsight.TextContent("Alice 在 Google 工作"), Context: *hindsight.NewNullableString(&ctx1), DocumentId: *hindsight.NewNullableString(&doc1)},
				{Content: hindsight.TextContent("Bob 在 Meta 担任数据科学家"), Context: *hindsight.NewNullableString(&ctx1), DocumentId: *hindsight.NewNullableString(&doc2)},
				{Content: hindsight.TextContent("Alice 和 Bob 是朋友"), Context: *hindsight.NewNullableString(&ctx2), DocumentId: *hindsight.NewNullableString(&doc3)},
			},
		}).Execute()
	// [/docs:retain-batch]

	// [docs:retain-async]
	// 开始异步摄取，立即返回
	asyncTrue := true
	largeDoc1 := "large-doc-1"
	largeDoc2 := "large-doc-2"
	retainResp, _, _ := client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{Content: hindsight.TextContent("大批量条目一"), DocumentId: *hindsight.NewNullableString(&largeDoc1)},
				{Content: hindsight.TextContent("大批量条目二"), DocumentId: *hindsight.NewNullableString(&largeDoc2)},
			},
			Async: &asyncTrue,
		}).Execute()

	// 检查是否异步处理
	fmt.Println("Async:", retainResp.GetAsync())
	// [/docs:retain-async]

	// [docs:retain-files]
	// 打开并上传文件，自动转文本并提取记忆。
	// 支持 PDF、DOCX、PPTX、XLSX、图片 OCR、音频转录及文本。
	f, err := os.Open("../../hindsight-docs/examples/api/sample.pdf")
	if err != nil {
		log.Fatalf("打开文件失败： %v", err)
	}
	defer f.Close()

	fileResp, _, _ := client.FilesAPI.FileRetain(ctx, "my-bank").
		Files([]*os.File{f}).
		Request(`{"files_metadata": [{"context": "季度报告"}]}`).
		Execute()
	fmt.Println("操作 ID：", fileResp.GetOperationIds()) // 通过操作端点跟踪进度
	// [/docs:retain-files]

	// =============================================================================
	// 清理，文档中不展示
	// =============================================================================
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/my-bank", apiURL), nil)
	http.DefaultClient.Do(req)

	fmt.Println("retain.go: 所有示例通过")
}
