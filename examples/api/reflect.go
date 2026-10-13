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

	// =============================================================================
	// 准备，文档中不展示
	// =============================================================================
	for _, content := range []string{
		"Alice 在 Google 担任软件工程师",
		"Alice 已在那里工作五年",
		"Alice 最近晋升为高级工程师",
	} {
		client.MemoryAPI.RetainMemories(ctx, "my-bank").
			RetainRequest(hindsight.RetainRequest{
				Items: []hindsight.MemoryItem{{Content: hindsight.TextContent(content)}},
			}).Execute()
	}

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:reflect-basic]
	client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query: "关于 Alice，我应该了解什么？",
		}).Execute()
	// [/docs:reflect-basic]

	// [docs:reflect-with-params]
	budgetMid := hindsight.MID
	client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query:  "正在考虑混合办公，你如何看待远程工作？",
			Budget: &budgetMid,
		}).Execute()
	// [/docs:reflect-with-params]

	// [docs:reflect-with-context]
	// 向 LLM 提供上下文，帮助理解情境
	ctxText := "我们正在预算评审会议讨论第四季度支出"
	client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query:   "你如何看待此提案？",
			Context: *hindsight.NewNullableString(&ctxText),
		}).Execute()
	// [/docs:reflect-with-context]

	// [docs:reflect-disposition]
	// 创建具有指定性格倾向的记忆库
	skepticism := int32(5)
	literalism := int32(4)
	empathy := int32(2)
	mission := "我是关注风险的财务顾问"
	client.BanksAPI.CreateOrUpdateBank(ctx, "cautious-advisor").
		CreateBankRequest(hindsight.CreateBankRequest{
			Name:                  *hindsight.NewNullableString(hindsight.PtrString("谨慎的顾问")),
			ReflectMission:        *hindsight.NewNullableString(&mission),
			DispositionSkepticism: *hindsight.NewNullableInt32(&skepticism),
			DispositionLiteralism: *hindsight.NewNullableInt32(&literalism),
			DispositionEmpathy:    *hindsight.NewNullableInt32(&empathy),
		}).Execute()

	// 反思回答体现该性格倾向
	client.MemoryAPI.Reflect(ctx, "cautious-advisor").
		ReflectRequest(hindsight.ReflectRequest{
			Query: "应该投资加密货币吗？",
		}).Execute()
	// 回答很可能强调风险与谨慎
	// [/docs:reflect-disposition]

	// [docs:reflect-sources]
	// include.facts 使响应包含 based_on
	sourcesResponse, _, _ := client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query: "介绍一下 Alice",
			Include: &hindsight.ReflectIncludeOptions{
				Facts: map[string]interface{}{}, // 空映射启用事实包含
			},
		}).Execute()

	fmt.Println("回答：", sourcesResponse.GetText())
	fmt.Println("\n依据：")
	if basedOn := sourcesResponse.GetBasedOn(); basedOn.Memories != nil {
		for _, fact := range basedOn.GetMemories() {
			fmt.Printf("  - [%s] %s\n", fact.GetType(), fact.GetText())
		}
	}
	// [/docs:reflect-sources]

	// [docs:reflect-with-tags]
	// 反思只考虑指定用户的记忆
	tagsMatch := "any_strict"
	client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query:     "用户如何看待产品？",
			Tags:      []string{"user:alice"},
			TagsMatch: &tagsMatch,
		}).Execute()
	// [/docs:reflect-with-tags]

	// [docs:reflect-structured-output]
	// 定义结构化输出 JSON schema
	responseSchema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"recommendation": map[string]interface{}{"type": "string"},
			"confidence":     map[string]interface{}{"type": "string", "enum": []string{"low", "medium", "high"}},
			"key_factors":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			"risks":          map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
		},
		"required": []string{"recommendation", "confidence", "key_factors"},
	}

	structuredResponse, _, _ := client.MemoryAPI.Reflect(ctx, "my-bank").
		ReflectRequest(hindsight.ReflectRequest{
			Query:          "应该聘 Alice 为机器学习团队负责人吗？",
			ResponseSchema: responseSchema,
		}).Execute()

	// 获取结构化输出
	if out := structuredResponse.GetStructuredOutput(); out != nil {
		fmt.Println("建议：", out["recommendation"])
		fmt.Println("关键因素：", out["key_factors"])
	}
	// [/docs:reflect-structured-output]

	// =============================================================================
	// 清理，文档中不展示
	// =============================================================================
	for _, bankID := range []string{"my-bank", "cautious-advisor"} {
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, bankID), nil)
		http.DefaultClient.Do(req)
	}

	fmt.Println("reflect.go: 所有示例通过")
}
