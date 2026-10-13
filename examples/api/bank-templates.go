package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiURL := os.Getenv("HINDSIGHT_API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8888"
	}

	// =============================================================================
	// 文档示例
	// =============================================================================

	// [docs:import-template]
	template := map[string]interface{}{
		"version": "1",
		"bank": map[string]interface{}{
			"retain_mission":      "提取客户问题、解决方案和情绪。",
			"enable_observations": true,
			"observations_mission": "跟踪重复出现的客户痛点。",
		},
		"mental_models": []map[string]interface{}{
			{
				"id":           "sentiment-overview",
				"name":         "客户情绪概览",
				"source_query": "整体情绪趋势是什么？",
				"trigger":      map[string]interface{}{"refresh_after_consolidation": true},
			},
		},
		"directives": []map[string]interface{}{
			{
				"name":     "认可不满情绪",
				"content":  "提供解决方案前，始终先认可用户的不满情绪。",
				"priority": 10,
			},
		},
	}

	body, _ := json.Marshal(template)
	resp, _ := http.Post(
		apiURL+"/v1/default/banks/my-bank/import",
		"application/json",
		bytes.NewReader(body),
	)
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respBody))
	// [/docs:import-template]

	// [docs:import-dry-run]
	resp, _ = http.Post(
		apiURL+"/v1/default/banks/my-bank/import?dry_run=true",
		"application/json",
		bytes.NewReader(body),
	)
	defer resp.Body.Close()
	dryRunBody, _ := io.ReadAll(resp.Body)
	fmt.Println(string(dryRunBody))
	// [/docs:import-dry-run]

	// [docs:export-template]
	resp, _ = http.Get(apiURL + "/v1/default/banks/my-bank/export")
	defer resp.Body.Close()
	exported, _ := io.ReadAll(resp.Body)
	fmt.Println(string(exported))
	// [/docs:export-template]

	// [docs:export-reimport]
	// 从来源记忆库导出
	resp, _ = http.Get(apiURL + "/v1/default/banks/source-bank/export")
	defer resp.Body.Close()
	srcExported, _ := io.ReadAll(resp.Body)

	// 导入新记忆库
	resp, _ = http.Post(
		apiURL+"/v1/default/banks/new-bank/import",
		"application/json",
		bytes.NewReader(srcExported),
	)
	defer resp.Body.Close()
	// [/docs:export-reimport]

	// [docs:get-schema]
	resp, _ = http.Get(apiURL + "/v1/bank-template-schema")
	defer resp.Body.Close()
	schema, _ := io.ReadAll(resp.Body)
	fmt.Println(string(schema))
	// [/docs:get-schema]
}
