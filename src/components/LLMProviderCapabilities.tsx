import React from 'react';
import {LLM_PROVIDERS} from '../data/llmProviders';

/**
 * Renders the "Provider Capabilities" table from the single-source-of-truth
 * provider list in `src/data/llmProviders.tsx`. Adding a provider (or a
 * capability flag) is an edit to `llmProviders.json` only — this table, the
 * default-models table, and the icon grid all derive from it.
 *
 * Only real providers are listed (the empty-id "OpenAI Compatible" pseudo-entry
 * is skipped). A blank cell means the capability is not supported.
 */
export function LLMProviderCapabilities() {
  const rows = LLM_PROVIDERS.filter(p => p.id);
  const cell = (on?: boolean) => (on ? '✅' : '—');
  return (
    <table>
      <thead>
        <tr>
          <th>供应商</th>
          <th style={{textAlign: 'center'}}>批处理 API</th>
          <th style={{textAlign: 'center'}}>显式提示词缓存</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({id, label, batchApi, promptCaching}) => (
          <tr key={id}>
            <td>{label} (<code>{id}</code>)</td>
            <td style={{textAlign: 'center'}}>{cell(batchApi)}</td>
            <td style={{textAlign: 'center'}}>{cell(promptCaching)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
