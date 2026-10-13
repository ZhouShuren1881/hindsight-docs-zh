package main

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:create-bank]
	client.BanksAPI.CreateOrUpdateBank(ctx, "my-bank").
		CreateBankRequest(hindsight.CreateBankRequest{}).Execute()
	// [/docs:create-bank]

	// [docs:bank-with-disposition]
	client.BanksAPI.CreateOrUpdateBank(ctx, "architect-bank").
		CreateBankRequest(hindsight.CreateBankRequest{
			ReflectMission: *hindsight.NewNullableString(hindsight.PtrString(
				"你是一位高级软件架构师，跟踪系统设计、" +
					"技术决策和架构模式。相比前沿技术，优先简单性。",
			)),
			DispositionSkepticism: *hindsight.NewNullableInt32(hindsight.PtrInt32(4)),
			DispositionLiteralism: *hindsight.NewNullableInt32(hindsight.PtrInt32(4)),
			DispositionEmpathy:    *hindsight.NewNullableInt32(hindsight.PtrInt32(2)),
		}).Execute()
	// [/docs:bank-with-disposition]

	// [docs:bank-background]
	client.BanksAPI.CreateOrUpdateBank(ctx, "my-bank").
		CreateBankRequest(hindsight.CreateBankRequest{
			ReflectMission: *hindsight.NewNullableString(hindsight.PtrString(
				"我是专注机器学习的研究助手。",
			)),
		}).Execute()
	// [/docs:bank-background]

	// [docs:bank-mission]
	client.BanksAPI.CreateOrUpdateBank(ctx, "my-bank").
		CreateBankRequest(hindsight.CreateBankRequest{
			ReflectMission: *hindsight.NewNullableString(hindsight.PtrString(
				"你是一位高级软件架构师，跟踪系统设计、" +
					"技术决策和架构模式。",
			)),
		}).Execute()
	// [/docs:bank-mission]

	// [docs:bank-support-agent]
	client.BanksAPI.CreateOrUpdateBank(ctx, "support-bank").
		CreateBankRequest(hindsight.CreateBankRequest{}).Execute()
	client.BanksAPI.UpdateBankConfig(ctx, "support-bank").
		BankConfigUpdate(hindsight.BankConfigUpdate{
			Updates: map[string]interface{}{
				"observations_mission": "我是客户支持智能体，跟踪客户偏好、" +
					"重复问题和解决历史，以提供一致个性化支持。",
			},
		}).Execute()
	// [/docs:bank-support-agent]

	// [docs:update-bank-config]
	client.BanksAPI.UpdateBankConfig(ctx, "my-bank").
		BankConfigUpdate(hindsight.BankConfigUpdate{
			Updates: map[string]interface{}{
				"retain_mission": "始终包含技术决策、API 设计选择及架构取舍。" +
					"忽略会议安排和社交交流。",
				"retain_extraction_mode": "verbose",
				"observations_mission": "观察是关于人员和项目的稳定事实。" +
					"始终包含偏好、技能和重复模式，忽略一次性事件。",
				"disposition_skepticism": 4,
				"disposition_literalism": 4,
				"disposition_empathy":    2,
			},
		}).Execute()
	// [/docs:update-bank-config]

	// [docs:get-bank-config]
	// 返回解析配置（服务默认合并库覆盖）及原始覆盖
	result, _, _ := client.BanksAPI.GetBankConfig(ctx, "my-bank").Execute()
	// result.Config     — 完整解析配置
	// result.Overrides  — 仅库级覆盖字段
	fmt.Println("配置键数量：", len(result.GetConfig()))
	// [/docs:get-bank-config]

	// [docs:reset-bank-config]
	// 移除全部库级覆盖，恢复服务默认
	client.BanksAPI.ResetBankConfig(ctx, "my-bank").Execute()
	// [/docs:reset-bank-config]

	// =============================================================================
	// 提示预览和库转移
	// =============================================================================
	transferBanks := []string{"transfer-go", "transfer-go-copy", "transfer-go-other", "transfer-go-clone"}
	deleteBanks := func(ids []string) {
		for _, bankID := range ids {
			req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, bankID), nil)
			http.DefaultClient.Do(req)
		}
	}
	must := func(err error) {
		if err != nil {
			panic(err)
		}
	}
	deleteBanks(transferBanks)
	// chunks 模式原样存文本，无需 LLM。
	_, _, err := client.BanksAPI.CreateOrUpdateBank(ctx, "transfer-go").
		CreateBankRequest(hindsight.CreateBankRequest{}).Execute()
	must(err)
	_, _, err = client.BanksAPI.UpdateBankConfig(ctx, "transfer-go").
		BankConfigUpdate(hindsight.BankConfigUpdate{
			Updates: map[string]interface{}{"retain_extraction_mode": "chunks"},
		}).Execute()
	must(err)
	resp, err := http.Post(apiURL+"/v1/default/banks/transfer-go/memories", "application/json", strings.NewReader(
		`{"items": [{"content": "Alice 领导支付团队。", "document_id": "doc-1"},
		            {"content": "Bob 调到柏林办公室。", "document_id": "doc-2"}]}`))
	must(err)
	if resp.StatusCode != 200 {
		panic(fmt.Sprintf("存储失败： %d", resp.StatusCode))
	}
	_, _, err = client.BanksAPI.CreateOrUpdateBank(ctx, "transfer-go-other").
		CreateBankRequest(hindsight.CreateBankRequest{}).Execute()
	must(err)
	waitFor := func(bankID, operationID string) *hindsight.OperationStatusResponse {
		for i := 0; i < 120; i++ {
			st, _, err := client.OperationsAPI.GetOperationStatus(ctx, bankID, operationID).Execute()
			must(err)
			switch st.Status {
			case "completed":
				return st
			case "failed", "cancelled":
				panic(fmt.Sprintf("operation %s %s", operationID, st.Status))
			}
			time.Sleep(time.Second)
		}
		panic("operation " + operationID + " 未完成")
	}
	countDocs := func(bankID string) int32 {
		docs, _, err := client.DocumentsAPI.ListDocuments(ctx, bankID).Execute()
		must(err)
		return docs.Total
	}

	// [docs:prompts-preview]
	preview, _, err := client.BanksAPI.PreviewPrompt(ctx, "my-bank").
		PromptPreviewRequest(hindsight.PromptPreviewRequest{Operation: hindsight.PtrString("retain")}).
		Execute()
	for _, message := range preview.Messages {
		fmt.Println(message.Role, len(message.Blocks))
	}
	// [/docs:prompts-preview]
	must(err)

	// [docs:transfer-export]
	// 整个库，记忆和配置，不含历史
	whole, _, err := client.BankTransferAPI.ExportBankTransfer(ctx, "transfer-go").Execute()

	// 仅记忆
	memoriesOnly, _, err := client.BankTransferAPI.ExportBankTransfer(ctx, "transfer-go").
		IncludeBankConfig(false).Execute()

	// 特定文档，文档子集不含库级部分
	subset, _, err := client.BankTransferAPI.ExportBankTransfer(ctx, "transfer-go").
		DocumentId([]string{"doc-1", "doc-2"}).IncludeBankConfig(false).Execute()

	// 各返回操作 ID，轮询后下载 result_metadata["storage_key"]
	fmt.Println(whole.OperationId, memoriesOnly.OperationId, subset.OperationId)
	// [/docs:transfer-export]
	must(err)
	waitFor("transfer-go", memoriesOnly.OperationId)
	waitFor("transfer-go", subset.OperationId)
	exported := waitFor("transfer-go", whole.OperationId)
	archive, _, err := client.DocumentTransferAPI.
		DownloadFile(ctx, exported.ResultMetadata["storage_key"].(string)).Execute()
	must(err)
	archivePath := archive.Name()

	// [docs:transfer-import]
	// 以新 ID 恢复库
	file, _ := os.Open(archivePath) // the ZIP downloaded from the export
	restore, _, err := client.BankTransferAPI.ImportBankTransfer(ctx, "transfer-go").
		File(file).TargetBankId("transfer-go-copy").Execute()
	// 恢复记录在 URL 的库，在那里轮询
	status, _, err := client.OperationsAPI.GetOperationStatus(ctx, "transfer-go", restore.OperationId).Execute()

	// 将归档文档合并到现有库
	file, _ = os.Open(archivePath)
	merge, _, err := client.BankTransferAPI.ImportBankTransfer(ctx, "transfer-go-other").
		File(file).Mode("merge").DocumentConflict("replace").Execute()
	// [/docs:transfer-import]
	must(err)
	_ = status
	waitFor("transfer-go", restore.OperationId)
	waitFor("transfer-go-other", merge.OperationId)
	if n := countDocs("transfer-go-copy"); n != 2 {
		panic(fmt.Sprintf("恢复复制了 %d 个文档", n))
	}

	// [docs:clone-bank]
	clone, _, err := client.BankTransferAPI.CloneBank(ctx, "transfer-go").
		TargetBankId("transfer-go-clone").Execute()
	// 操作记录在来源库
	status, _, err = client.OperationsAPI.GetOperationStatus(ctx, "transfer-go", clone.OperationId).Execute()
	// [/docs:clone-bank]
	must(err)
	waitFor("transfer-go", clone.OperationId)
	if n := countDocs("transfer-go-clone"); n != 2 {
		panic(fmt.Sprintf("克隆复制了 %d 个文档", n))
	}

	// [docs:document-export]
	// 1. 提交整库导出，可加 .DocumentId([]string{...}) 限定
	export, _, err := client.DocumentTransferAPI.ExportDocuments(ctx, "transfer-go").Execute()

	// 2. 轮询至完成
	var done *hindsight.OperationStatusResponse
	for {
		done, _, err = client.OperationsAPI.GetOperationStatus(ctx, "transfer-go", export.OperationId).Execute()
		if err != nil || done.Status == "completed" || done.Status == "failed" {
			break
		}
		time.Sleep(time.Second)
	}

	// 3. 下载归档，客户端保存临时文件
	zipFile, _, err := client.DocumentTransferAPI.
		DownloadFile(ctx, done.ResultMetadata["storage_key"].(string)).Execute()
	// [/docs:document-export]
	must(err)
	if done.Status != "completed" {
		panic("document export " + done.Status)
	}

	// [docs:document-import]
	file, _ = os.Open(zipFile.Name())
	imported, _, err := client.DocumentTransferAPI.ImportDocuments(ctx, "transfer-go-other").
		File(file).OnConflict("replace").Execute()

	status, _, err = client.OperationsAPI.GetOperationStatus(ctx, "transfer-go-other", imported.OperationId).Execute()
	// status.ResultMetadata -> {"documents_imported": 3, "facts_imported": 42, "observations_imported": 5, ...}
	// [/docs:document-import]
	must(err)
	waitFor("transfer-go-other", imported.OperationId)

	// [docs:transfer-import-external]
	doc := map[string]any{
		"id":            "session-2026-09-22",
		"original_text": "完整原始会话文本...",
		"chunks":        []map[string]any{{"chunk_index": 0, "chunk_text": "调用方定义的来源区域..."}},
		"facts": []map[string]any{{
			"text":         "用户偏好轻量本地语音识别模型。",
			"fact_type":    "experience",
			"chunk_index":  0,
			"mentioned_at": "2026-09-22T18:34:00Z",
			"entities":     []string{"Parakeet"},
		}},
	}
	zipPath := filepath.Join(os.TempDir(), "import.zip")
	out, _ := os.Create(zipPath)
	zw := zip.NewWriter(out)
	w, _ := zw.Create("manifest.json")
	json.NewEncoder(w).Encode(map[string]any{"schema_version": 1, "source_bank_id": "external"})
	w, _ = zw.Create("documents/session-2026-09-22.json")
	json.NewEncoder(w).Encode(doc)
	zw.Close()
	out.Close()

	file, _ = os.Open(zipPath)
	external, _, err := client.BankTransferAPI.ImportBankTransfer(ctx, "transfer-go-other").
		File(file).Mode("merge").DocumentConflict("replace").Execute()
	// [/docs:transfer-import-external]
	must(err)
	waitFor("transfer-go-other", external.OperationId)
	importedDoc, _, err := client.DocumentsAPI.GetDocument(ctx, "transfer-go-other", "session-2026-09-22").Execute()
	must(err)
	if importedDoc.MemoryUnitCount != 1 {
		panic(fmt.Sprintf("外部导入保存了 %d 条事实", importedDoc.MemoryUnitCount))
	}
	os.Remove(zipPath)
	os.Remove(archivePath)
	os.Remove(zipFile.Name())
	deleteBanks(transferBanks)

	// =============================================================================
	// 清理（不在文档中展示）
	// =============================================================================
	for _, bankID := range []string{"my-bank", "architect-bank", "support-bank"} {
		req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/v1/default/banks/%s", apiURL, bankID), nil)
		http.DefaultClient.Do(req)
	}

	fmt.Println("memory-banks.go: 全部示例通过")
}
