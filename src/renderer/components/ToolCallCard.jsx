import React, { useState } from 'react'

const TOOL_ICONS = {
  read_file: '📄', write_file: '✏️', edit_file: '🔧', delete_file: '🗑️',
  list_directory: '📂', search_file: '🔍', search_content: '🔎',
  run_shell: '🖥️', kill_process: '⛔',
  git_status: '📊', git_diff: '📑', git_commit: '💾', git_log: '📜',
  git_branch: '🌿', git_checkout: '🔀',
  web_fetch: '🌐', read_docs: '📚',
  run_test: '🧪', get_coverage: '📈',
  get_symbols: '🏷️', find_references: '↩️', go_to_definition: '🎯',
  get_hover_info: 'ℹ️', get_diagnostics: '🔎',
  default: '🔧',
}

const TOOL_COLORS = {
  read_file: '#4CAF50', write_file: '#2196F3', edit_file: '#FF9800',
  run_shell: '#F44336', git_status: '#9C27B0', web_fetch: '#00BCD4',
  default: '#607D8B',
}

function ToolIcon({ name }) {
  return <span className="tool-icon">{TOOL_ICONS[name] || TOOL_ICONS.default}</span>
}

function ToolParams({ params }) {
  if (!params || typeof params !== 'object') return null
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return null
  return (
    <div className="tool-params">
      {entries.map(([k, v]) => (
        <div key={k} className="tool-param">
          <span className="param-key">{k}:</span>
          <span className="param-val">
            {typeof v === 'string' && v.length > 80
              ? v.slice(0, 80) + '...'
              : JSON.stringify(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  const { name, arguments: args = {}, id } = toolCall
  const color = TOOL_COLORS[name] || TOOL_COLORS.default

  return (
    <div className="tool-card" style={{ borderLeftColor: color }}>
      <div className="tool-card-header" onClick={() => setExpanded(!expanded)}>
        <ToolIcon name={name} />
        <span className="tool-name">{name}</span>
        <span className="tool-expand">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && <ToolParams params={args} />}

      <div className="tool-card-footer">
        <span className="tool-id">#{id?.slice(0, 8)}</span>
      </div>
    </div>
  )
}
