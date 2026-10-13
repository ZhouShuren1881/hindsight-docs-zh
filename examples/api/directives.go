package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

const bankID = "directives-example-bank"

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
	client.BanksAPI.CreateOrUpdateBank(ctx, bankID).
		CreateBankRequest(hindsight.CreateBankRequest{
			Name: *hindsight.NewNullableString(hindsight.PtrString("测试记忆库")),
		}).Execute()

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:create-directive]
	// 创建指令（反思的硬性规则）
	directive, _, _ := client.DirectivesAPI.CreateDirective(ctx, bankID).
		CreateDirectiveRequest(hindsight.CreateDirectiveRequest{
			Name:    "正式语言",
			Content: "始终使用正式英语回复，避免俚语和口语表达。",
		}).Execute()

	fmt.Printf("已创建指令： %s\n", directive.GetId())
	// [/docs:create-directive]

	directiveID := directive.GetId()

	// [docs:list-directives]
	// 列出记忆库中的全部指令
	directives, _, _ := client.DirectivesAPI.ListDirectives(ctx, bankID).Execute()

	for _, d := range directives.GetItems() {
		content := d.GetContent()
		if len(content) > 50 {
			content = content[:50]
		}
		fmt.Printf("- %s: %s...\n", d.GetName(), content)
	}
	// [/docs:list-directives]

	// [docs:update-directive]
	// 更新指令（如禁用而不删除）
	isActiveFalse := false
	updated, _, _ := client.DirectivesAPI.UpdateDirective(ctx, bankID, directiveID).
		UpdateDirectiveRequest(hindsight.UpdateDirectiveRequest{
			IsActive: *hindsight.NewNullableBool(&isActiveFalse),
		}).Execute()

	fmt.Printf("指令启用状态： %v\n", updated.GetIsActive())
	// [/docs:update-directive]

	// [docs:delete-directive]
	// 删除指令
	client.DirectivesAPI.DeleteDirective(ctx, bankID, directiveID).Execute()
	// [/docs:delete-directive]

	// =============================================================================
	// 清理（不在文档中展示）
	// =============================================================================
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, bankID), nil)
	http.DefaultClient.Do(req)

	fmt.Println("directives.go: 全部示例通过")
}
