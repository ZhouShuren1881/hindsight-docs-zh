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
		"Alice 喜欢周末徒步",
		"Bob 是与 Alice 一起工作的数据科学家",
	} {
		client.MemoryAPI.RetainMemories(ctx, "my-bank").
			RetainRequest(hindsight.RetainRequest{
				Items: []hindsight.MemoryItem{{Content: hindsight.TextContent(content)}},
			}).Execute()
	}

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:recall-basic]
	response, _, _ := client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "Alice 做什么工作？",
		}).Execute()

	// response.Results 为 RecallResult 切片，每项包含：
	// - Id:            事实 ID
	// - Text:          提取的事实
	// - Type:          "world", "experience", or "observation"
	// - Context:       存储时设置的上下文标签
	// - Tags:          标签 []string
	// - Entities:      关联实体名称 []string
	// - OccurredStart: 事件开始的 ISO 日期时间
	// - OccurredEnd:   事件结束的 ISO 日期时间
	// - MentionedAt:   事实存储的 ISO 日期时间
	// - DocumentId:    事实所属文档
	for _, r := range response.GetResults() {
		fmt.Println(r.GetText())
	}
	// [/docs:recall-basic]

	// [docs:recall-with-options]
	budgetHigh := hindsight.HIGH
	maxTokens := int32(8000)
	traceTrue := true
	detailedResponse, _, _ := client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "Alice 做什么工作？",
			Types:     []string{"world", "experience"},
			Budget:    &budgetHigh,
			MaxTokens: &maxTokens,
			Trace:     &traceTrue,
		}).Execute()

	for _, r := range detailedResponse.GetResults() {
		fmt.Println("-", r.GetText())
	}
	// [/docs:recall-with-options]

	// [docs:recall-world-only]
	// 仅世界事实，即客观信息
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "Alice 在哪里工作？",
			Types: []string{"world"},
		}).Execute()
	// [/docs:recall-world-only]

	// [docs:recall-experience-only]
	// 仅经历事实，即对话和事件
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "我推荐过什么？",
			Types: []string{"experience"},
		}).Execute()
	// [/docs:recall-experience-only]

	// [docs:recall-observations-only]
	// 仅观察，即整合知识
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "我学到了哪些模式？",
			Types: []string{"observation"},
		}).Execute()
	// [/docs:recall-observations-only]

	// [docs:recall-source-facts]
	// 召回观察及来源事实
	maxSFTokens := int32(4096)
	sfOpts := hindsight.SourceFactsIncludeOptions{MaxTokens: &maxSFTokens}
	obsResponse, _, _ := client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query: "我了解 Alice 的哪些模式？",
			Types: []string{"observation"},
			Include: &hindsight.IncludeOptions{
				SourceFacts: *hindsight.NewNullableSourceFactsIncludeOptions(&sfOpts),
			},
		}).Execute()

	for _, obs := range obsResponse.GetResults() {
		fmt.Printf("观察： %s\n", obs.GetText())
		for _, factID := range obs.GetSourceFactIds() {
			if fact, ok := obsResponse.GetSourceFacts()[factID]; ok {
				fmt.Printf("  - [%s] %s\n", fact.GetType(), fact.GetText())
			}
		}
	}
	// [/docs:recall-source-facts]

	// [docs:recall-budget-levels]
	budgetLow := hindsight.LOW
	// 快速查询
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:  "Alice 的邮箱",
			Budget: &budgetLow,
		}).Execute()

	// 深入探索
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:  "Alice 和 Bob 有什么关联？",
			Budget: &budgetHigh,
		}).Execute()
	// [/docs:recall-budget-levels]

	// [docs:recall-token-budget]
	// 用相关记忆填充最多 4K token 上下文
	mt4k := int32(4096)
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "我对 Alice 了解什么？",
			MaxTokens: &mt4k,
		}).Execute()

	// 快速查询使用较小预算
	mt500 := int32(500)
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "Alice 的邮箱",
			MaxTokens: &mt500,
		}).Execute()
	// [/docs:recall-token-budget]

	// [docs:recall-with-tags]
	// 按用户标签筛选召回
	tagsMatch := "any"
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "用户提供了什么反馈？",
			Tags:      []string{"user:alice"},
			TagsMatch: &tagsMatch,
		}).Execute()
	// [/docs:recall-with-tags]

	// [docs:recall-tags-strict]
	// 严格模式只返回标签匹配记忆，排除无标签
	tagsMatchStrict := "any_strict"
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "用户说了什么？",
			Tags:      []string{"user:alice"},
			TagsMatch: &tagsMatchStrict,
		}).Execute()
	// [/docs:recall-tags-strict]

	// [docs:recall-tags-all]
	// AND 匹配，要求包含全部指定标签
	tagsMatchAll := "all_strict"
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "报告了哪些问题？",
			Tags:      []string{"user:alice", "bug-report"},
			TagsMatch: &tagsMatchAll,
		}).Execute()
	// [/docs:recall-tags-all]

	// [docs:recall-tags-all-mode]
	// AND 匹配，包含无标签记忆
	tagsMatchAllMode := "all"
	client.MemoryAPI.RecallMemories(ctx, "my-bank").
		RecallRequest(hindsight.RecallRequest{
			Query:     "沟通工具",
			Tags:      []string{"user:alice", "team"},
			TagsMatch: &tagsMatchAllMode,
		}).Execute()
	// [/docs:recall-tags-all-mode]

	// =============================================================================
	// 清理，文档中不展示
	// =============================================================================
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/my-bank", apiURL), nil)
	http.DefaultClient.Do(req)

	fmt.Println("recall.go: 所有示例通过")
}
