package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

const memBankID = "memories-demo-bank"

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
	client.BanksAPI.CreateOrUpdateBank(ctx, memBankID).
		CreateBankRequest(hindsight.CreateBankRequest{
			Name: *hindsight.NewNullableString(hindsight.PtrString("记忆演示")),
		}).Execute()
	for _, content := range []string{
		"助手在 2023 年访问巴黎。",
		"部署服务器 srv-04 运行 PostgreSQL 14。",
	} {
		client.MemoryAPI.RetainMemories(ctx, memBankID).
			RetainRequest(hindsight.RetainRequest{
				Items: []hindsight.MemoryItem{{Content: hindsight.TextContent(content)}},
			}).Execute()
	}
	time.Sleep(3 * time.Second)

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:list-memories]
	// 列出记忆单元，默认包含失效行。
	memories, _, _ := client.MemoryAPI.ListMemories(ctx, memBankID).Execute()
	for _, unit := range memories.GetItems() {
		fmt.Printf("- [%v] %v\n", unit.GetFactType(), unit.GetText())
	}

	// 仅筛选失效事实，如审查重复项.
	invalidated, _, _ := client.MemoryAPI.ListMemories(ctx, memBankID).State("invalidated").Execute()
	fmt.Printf("%d 条失效事实\n", len(invalidated.GetItems()))
	// [/docs:list-memories]

	// 选择 world/experience 原始事实整理。
	var memoryID string
	for _, unit := range memories.GetItems() {
		if ft := unit.GetFactType(); ft == "world" || ft == "experience" {
			memoryID = unit.Id
			break
		}
	}

	if memoryID != "" {
		// [docs:get-memory]
		// 获取单个记忆单元（元数据、实体、日期、状态）.
		memory, _, _ := client.MemoryAPI.GetMemory(ctx, memBankID, memoryID).Execute()
		fmt.Printf("Memory: %v\n", memory)
		// [/docs:get-memory]

		// [docs:edit-memory]
		// 修正文本，重新嵌入、移除派生观察及链接，
		// 自动重新整合并重算图。
		client.MemoryAPI.UpdateMemory(ctx, memBankID, memoryID).
			UpdateMemoryRequest(hindsight.UpdateMemoryRequest{
				Text:   *hindsight.NewNullableString(hindsight.PtrString("用户在 2023 年访问巴黎。")),
				Reason: *hindsight.NewNullableString(hindsight.PtrString("主体错误")),
			}).Execute()
		// [/docs:edit-memory]

		// [docs:edit-memory-fields]
		// 一次修正日期、类型和实体。空字符串清字段；
		// entities 替换集合（[] 全解除），省略则不变。
		// ResolveEntities false 防止输入实体名匹配
		// 到已有的相似实体。
		client.MemoryAPI.UpdateMemory(ctx, memBankID, memoryID).
			UpdateMemoryRequest(hindsight.UpdateMemoryRequest{
				OccurredStart:   *hindsight.NewNullableString(hindsight.PtrString("2023-06-01")),
				FactType:        *hindsight.NewNullableString(hindsight.PtrString("experience")),
				Entities:        []string{"Alice", "Paris"},
				ResolveEntities: hindsight.PtrBool(false),
			}).Execute()
		// [/docs:edit-memory-fields]

		// [docs:invalidate-memory]
		// 使事实软失效：移出召回/整合/图，剪除链接，
		// 重新计算不含它的观察，但保留审计。
		client.MemoryAPI.UpdateMemory(ctx, memBankID, memoryID).
			UpdateMemoryRequest(hindsight.UpdateMemoryRequest{
				State:  *hindsight.NewNullableString(hindsight.PtrString("invalidated")),
				Reason: *hindsight.NewNullableString(hindsight.PtrString("服务器于 2026-06-01 停用")),
			}).Execute()
		// [/docs:invalidate-memory]

		// [docs:restore-memory]
		// 恢复此前失效事实。
		client.MemoryAPI.UpdateMemory(ctx, memBankID, memoryID).
			UpdateMemoryRequest(hindsight.UpdateMemoryRequest{
				State: *hindsight.NewNullableString(hindsight.PtrString("valid")),
			}).Execute()
		// [/docs:restore-memory]
	}

	// 派生观察展示来源到达时的演变。
	var observationID string
	for _, unit := range memories.GetItems() {
		if unit.GetFactType() == "observation" {
			observationID = unit.Id
			break
		}
	}
	if observationID != "" {
		// [docs:observation-history]
		// 获取派生观察刷新历史.
		history, _, _ := client.MemoryAPI.GetObservationHistory(ctx, memBankID, observationID).Execute()
		fmt.Printf("观察历史： %v\n", history)
		// [/docs:observation-history]
	}

	// =============================================================================
	// 清理（不在文档中展示）
	// =============================================================================
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, memBankID), nil)
	http.DefaultClient.Do(req)

	fmt.Println("memories.go: 全部示例通过")
}
