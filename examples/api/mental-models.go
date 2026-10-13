package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	hindsight "github.com/vectorize-io/hindsight/hindsight-clients/go"
)

const mmBankID = "mental-models-demo-bank"

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
	client.BanksAPI.CreateOrUpdateBank(ctx, mmBankID).
		CreateBankRequest(hindsight.CreateBankRequest{
			Name: *hindsight.NewNullableString(hindsight.PtrString("心智模型演示")),
		}).Execute()
	for _, content := range []string{
		"团队偏好通过 Slack 异步沟通",
		"紧急问题使用 #incidents 频道",
		"每周同步会议在周一上午 10 点",
	} {
		client.MemoryAPI.RetainMemories(ctx, mmBankID).
			RetainRequest(hindsight.RetainRequest{
				Items: []hindsight.MemoryItem{{Content: hindsight.TextContent(content)}},
			}).Execute()
	}
	time.Sleep(2 * time.Second)

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:create-mental-model]
	// 创建心智模型，后台反思
	result, _, _ := client.MentalModelsAPI.CreateMentalModel(ctx, mmBankID).
		CreateMentalModelRequest(hindsight.CreateMentalModelRequest{
			Name:        "团队沟通偏好",
			SourceQuery: "团队偏好如何沟通？",
			Tags:        []string{"team", "communication"},
		}).Execute()

	// 返回 operation_id，通过操作端点检查完成
	fmt.Printf("操作 ID： %s\n", result.GetOperationId())
	// [/docs:create-mental-model]

	// [docs:create-mental-model-with-id]
	// 创建指定自定义 ID 的心智模型
	mmID := "communication-policy"
	resultWithID, _, _ := client.MentalModelsAPI.CreateMentalModel(ctx, mmBankID).
		CreateMentalModelRequest(hindsight.CreateMentalModelRequest{
			Id:          *hindsight.NewNullableString(&mmID),
			Name:        "沟通政策",
			SourceQuery: "团队沟通准则是什么？",
		}).Execute()

	fmt.Printf("使用自定义 ID 创建： %s\n", resultWithID.GetOperationId())
	// [/docs:create-mental-model-with-id]

	time.Sleep(5 * time.Second)

	// [docs:create-mental-model-with-trigger]
	// 创建启用自动刷新的心智模型
	refreshTrue := true
	result2, _, _ := client.MentalModelsAPI.CreateMentalModel(ctx, mmBankID).
		CreateMentalModelRequest(hindsight.CreateMentalModelRequest{
			Name:        "项目状态",
			SourceQuery: "当前项目状态如何？",
			Trigger: &hindsight.MentalModelTriggerInput{
				RefreshAfterConsolidation: &refreshTrue,
			},
		}).Execute()

	// 观察更新时自动刷新模型
	fmt.Printf("操作 ID： %s\n", result2.GetOperationId())
	// [/docs:create-mental-model-with-trigger]

	// [docs:create-mental-model-tags-match]
	// 覆盖刷新时模型标签筛选来源的方式。
	// 带标签模型默认 all_strict，记忆需包含全部标签；
	// 每条记忆仅单主题时用 any，
	// 刷新读取至少带一个模型标签的记忆。
	result3, _, _ := client.MentalModelsAPI.CreateMentalModel(ctx, mmBankID).
		CreateMentalModelRequest(hindsight.CreateMentalModelRequest{
			Name:        "当前项目",
			SourceQuery: "用户目前处理哪些项目？",
			Tags:        []string{"projects", "mental-model"},
			Trigger: &hindsight.MentalModelTriggerInput{
				TagsMatch: *hindsight.NewNullableString(hindsight.PtrString("any")),
			},
		}).Execute()

	fmt.Printf("操作 ID： %s\n", result3.GetOperationId())
	// [/docs:create-mental-model-tags-match]

	time.Sleep(5 * time.Second)

	// [docs:list-mental-models]
	// 列出全部心智模型，默认仅元数据；
	// Detail("content") 添加 source_query/content/trigger。
	mentalModels, _, _ := client.MentalModelsAPI.ListMentalModels(ctx, mmBankID).Detail("content").Execute()

	for _, mm := range mentalModels.GetItems() {
		fmt.Printf("- %s: %s\n", mm.GetName(), mm.GetSourceQuery())
	}
	// [/docs:list-mental-models]

	if len(mentalModels.GetItems()) == 0 {
		fmt.Println("mental-models.go: 全部示例通过 (尚未创建心智模型)")
		cleanupMentalModels(client, ctx, apiURL)
		return
	}

	mentalModelID := mentalModels.GetItems()[0].GetId()

	// [docs:get-mental-model]
	// 获取指定心智模型
	mentalModel, _, _ := client.MentalModelsAPI.GetMentalModel(ctx, mmBankID, mentalModelID).Execute()

	fmt.Printf("Name: %s\n", mentalModel.GetName())
	fmt.Printf("Content: %s\n", mentalModel.GetContent())
	fmt.Printf("上次刷新： %s\n", mentalModel.GetLastRefreshedAt())
	// [/docs:get-mental-model]

	// [docs:refresh-mental-model]
	// 刷新心智模型，更新为当前知识
	refreshResult, _, _ := client.MentalModelsAPI.RefreshMentalModel(ctx, mmBankID, mentalModelID).Execute()

	fmt.Printf("刷新操作 ID： %s\n", refreshResult.GetOperationId())
	// [/docs:refresh-mental-model]

	// [docs:clear-mental-model]
	// 清空内容再刷新，完整重新综合
	client.MentalModelsAPI.ClearMentalModel(ctx, mmBankID, mentalModelID).Execute()

	// 触发全新完整重建
	fullRefreshResult, _, _ := client.MentalModelsAPI.RefreshMentalModel(ctx, mmBankID, mentalModelID).Execute()

	fmt.Printf("完整刷新操作 ID： %s\n", fullRefreshResult.GetOperationId())
	// [/docs:clear-mental-model]

	// [docs:update-mental-model]
	// 更新模型元数据
	newName := "更新后的团队沟通偏好"
	refreshAfter := true
	updated, _, _ := client.MentalModelsAPI.UpdateMentalModel(ctx, mmBankID, mentalModelID).
		UpdateMentalModelRequest(hindsight.UpdateMentalModelRequest{
			Name: *hindsight.NewNullableString(&newName),
			Trigger: *hindsight.NewNullableMentalModelTriggerInput(&hindsight.MentalModelTriggerInput{
				RefreshAfterConsolidation: &refreshAfter,
			}),
		}).Execute()

	fmt.Printf("更新后名称： %s\n", updated.GetName())
	// [/docs:update-mental-model]

	// [docs:get-mental-model-history]
	// 获取模型变更历史
	history, _, _ := client.MentalModelsAPI.GetMentalModelHistory(ctx, mmBankID, mentalModelID).Execute()

	if entries, ok := history.([]interface{}); ok {
		for _, entry := range entries {
			if e, ok := entry.(map[string]interface{}); ok {
				fmt.Printf("变更时间： %v\n", e["changed_at"])
				fmt.Printf("此前内容： %v\n", e["previous_content"])
			}
		}
	}
	// [/docs:get-mental-model-history]

	// [docs:mental-model-detail]
	// 列表默认仅元数据，最小响应
	client.MentalModelsAPI.ListMentalModels(ctx, mmBankID).Execute()

	// 列表包含内容，不含来源链，需显式选择
	client.MentalModelsAPI.ListMentalModels(ctx, mmBankID).Detail("content").Execute()

	// 获取单模型，默认完整细节
	client.MentalModelsAPI.GetMentalModel(ctx, mmBankID, mentalModelID).Execute()
	// [/docs:mental-model-detail]

	// [docs:dry-run-refresh]
	// 预览刷新，不写入
	preview, _, err := client.MentalModelsAPI.DryRunRefreshMentalModel(ctx, mmBankID, mentalModelID).Execute()
	if err != nil {
		panic(err)
	}

	fmt.Printf("模式： %s, 将持久保存： %v\n", preview.GetEffectiveMode(), preview.GetWouldPersist())
	fmt.Println(preview.GetDiff())
	// [/docs:dry-run-refresh]

	// [docs:keep-trace]
	// 记录每次刷新（含计划）如何得出结果
	mode := "delta"
	keepTrace := true
	_, _, err = client.MentalModelsAPI.UpdateMentalModel(ctx, mmBankID, mentalModelID).
		UpdateMentalModelRequest(hindsight.UpdateMentalModelRequest{
			Trigger: *hindsight.NewNullableMentalModelTriggerInput(&hindsight.MentalModelTriggerInput{
				Mode:      &mode,
				KeepTrace: &keepTrace,
			}),
		}).Execute()
	if err != nil {
		panic(err)
	}
	// [/docs:keep-trace]

	// [docs:delete-mental-model]
	// 删除心智模型
	client.MentalModelsAPI.DeleteMentalModel(ctx, mmBankID, mentalModelID).Execute()
	// [/docs:delete-mental-model]

	// =============================================================================
	// 清理（不在文档中展示）
	// =============================================================================
	cleanupMentalModels(client, ctx, apiURL)

	fmt.Println("mental-models.go: 全部示例通过")
}

func cleanupMentalModels(client *hindsight.APIClient, ctx context.Context, apiURL string) {
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, mmBankID), nil)
	http.DefaultClient.Do(req)
}
