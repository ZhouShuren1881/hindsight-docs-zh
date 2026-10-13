package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

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

	operationID := "550e8400-e29b-41d4-a716-446655440000"

	// 确保库存在，未创建的库列操作会 404（#4442）。
	// memory-banks.go 先运行并清理 my-bank，因此此文件
	// 不能假设此前示例留下记忆库。
	client.BanksAPI.CreateOrUpdateBank(ctx, "my-bank").
		CreateBankRequest(hindsight.CreateBankRequest{}).Execute()

	// [docs:operations-list]
	// 列出近期操作，默认最近 20 个。
	recent, _, err := client.OperationsAPI.ListOperations(ctx, "my-bank").Execute()
	if err != nil {
		log.Fatalf("列出操作： %v", err)
	}
	for _, op := range recent.Operations {
		fmt.Println(op.Id, op.TaskType, op.Status)
	}

	// 按状态和类型筛选。
	_, _, _ = client.OperationsAPI.ListOperations(ctx, "my-bank").
		Status("pending").
		Type_("graph_maintenance").
		Execute()

	// 隐藏 retain_batch 父行，仅显示子存储任务。
	_, _, _ = client.OperationsAPI.ListOperations(ctx, "my-bank").
		ExcludeParents(true).
		Execute()
	// [/docs:operations-list]

	// [docs:operations-get]
	status, _, err := client.OperationsAPI.GetOperationStatus(ctx, "my-bank", operationID).Execute()
	if err != nil {
		log.Fatalf("获取状态： %v", err)
	}
	fmt.Println(status.Status, status.ErrorMessage)

	// 包含提交载荷，批量存储可能较大。
	_, _, _ = client.OperationsAPI.GetOperationStatus(ctx, "my-bank", operationID).
		IncludePayload(true).
		Execute()
	// [/docs:operations-get]

	// [docs:operations-cancel]
	// Worker 领取前取消待处理操作。
	// 已 processing/completed/failed 时返回 409。
	_, _, _ = client.OperationsAPI.CancelOperation(ctx, "my-bank", operationID).Execute()
	// [/docs:operations-cancel]

	// [docs:operations-retry]
	// 重新排队失败或取消操作。
	// 非 failed/cancelled 时返回 409。
	_, _, _ = client.OperationsAPI.RetryOperation(ctx, "my-bank", operationID).Execute()
	// [/docs:operations-retry]

	// [docs:operations-async-retain]
	// 异步提交大批量，立即返回
	// 可轮询的 operation_id。
	async := true
	resp, _, err := client.MemoryAPI.RetainMemories(ctx, "my-bank").
		RetainRequest(hindsight.RetainRequest{
			Items: []hindsight.MemoryItem{
				{Content: hindsight.TextContent("Alice 于 2023 年加入 Google")},
				{Content: hindsight.TextContent("Bob 比起 JavaScript 更喜欢 Python")},
			},
			Async: &async,
		}).Execute()
	if err != nil {
		log.Fatalf("retain: %v", err)
	}
	opID := resp.OperationId.Get()

	for {
		s, _, err := client.OperationsAPI.GetOperationStatus(ctx, "my-bank", *opID).Execute()
		if err != nil {
			log.Fatalf("poll: %v", err)
		}
		if s.Status == "completed" || s.Status == "failed" || s.Status == "cancelled" {
			fmt.Println("finished:", s.Status)
			break
		}
		time.Sleep(2 * time.Second)
	}
	// [/docs:operations-async-retain]
}
