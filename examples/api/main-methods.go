package main

import (
	"context"
	"fmt"
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

	// [docs:main-retain]
	// 将事实或对话存入记忆库
	client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{Content: hindsight.TextContent("Alice 于 2024 年 3 月加入 Google，担任高级机器学习工程师")},
			},
		}).Execute()
	// [/docs:main-retain]

	// [docs:main-recall]
	// 使用自然语言查询搜索记忆
	resp, _, _ := client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "Alice 在 Google 做什么工作？",
		}).Execute()

	for _, r := range resp.Results {
		fmt.Println(r.Text)
	}
	// [/docs:main-recall]

	// [docs:main-reflect]
	// 结合记忆和性格倾向生成推理回答
	answer, _, _ := client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query: "后端应该采用 TypeScript 吗？",
		}).Execute()

	fmt.Println(answer.GetText())
	// [/docs:main-reflect]

	// 清理，文档中不展示
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/my-bank", apiURL), nil)
	http.DefaultClient.Do(req)

	fmt.Println("main-methods.go: 所有示例通过")
}
