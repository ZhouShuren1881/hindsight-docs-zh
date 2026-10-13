package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

func main() {
	apiURL := os.Getenv("HINDSIGHT_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8888"
	}

	// [docs:quickstart-full]
	cfg := hindsight.NewConfiguration()
	cfg.Servers = hindsight.ServerConfigurations{
		{URL: "http://localhost:8888"},
	}
	client := hindsight.NewAPIClient(cfg)
	ctx := context.Background()

	// Retain a memory
	retainReq := hindsight.RetainRequest{
		Items: []hindsight.MemoryItem{
			{Content: hindsight.TextContent("Alice 在 Google 工作")},
		},
	}
	client.MemoryAPI.RetainMemories(ctx, "my-bank").RetainRequest(retainReq).Execute()

	// 召回记忆
	recallReq := hindsight.RecallRequest{
		Query: "Alice 做什么工作？",
	}
	resp, _, _ := client.MemoryAPI.RecallMemories(ctx, "my-bank").RecallRequest(recallReq).Execute()
	for _, r := range resp.Results {
		fmt.Println(r.Text)
	}

	// Reflect：生成回答
	reflectReq := hindsight.ReflectRequest{
		Query: "介绍一下 Alice",
	}
	answer, _, _ := client.MemoryAPI.Reflect(ctx, "my-bank").ReflectRequest(reflectReq).Execute()
	fmt.Println(answer.GetText())
	// [/docs:quickstart-full]

	// 清理，文档中不展示
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/my-bank", apiURL), nil)
	http.DefaultClient.Do(req)

	// [docs:nullable-fields]
	// 创建可为空的值
	timestamp := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	retainReq2 := hindsight.RetainRequest{
		Items: []hindsight.MemoryItem{
			{
				Content:   hindsight.TextContent("Alice 晋升了"),
				Context:   *hindsight.NewNullableString(hindsight.PtrString("职业变化")),
				Timestamp: *hindsight.NewNullableTimestamp(&hindsight.Timestamp{TimeTime: hindsight.PtrTime(timestamp)}),
				Tags:      []string{"career"},
			},
		},
	}
	retainResp, _, _ := client.MemoryAPI.RetainMemories(ctx, "my-bank").RetainRequest(retainReq2).Execute()

	// 检查是否设值
	if retainResp.HasOperationId() {
		fmt.Println("OperationId:", retainResp.GetOperationId())
	}
	// [/docs:nullable-fields]

	// [docs:error-handling]
	_, httpResp2, err := client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(recallReq).
		Execute()

	if err != nil {
		log.Fatalf("召回失败： %v", err)
	}
	defer httpResp2.Body.Close()
	// [/docs:error-handling]

	fmt.Println("quickstart.go: 所有示例通过")
}
