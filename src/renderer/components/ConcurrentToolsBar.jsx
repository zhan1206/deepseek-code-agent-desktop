import React from 'react'

const STATUS_COLORS = {
  running: '#58a6ff',
  done: '#3fb950',
  error: '#f85149',
}

export default function ConcurrentToolsBar({ activeTools }) {
  const entries = Object.entries(activeTools)
  if (entries.length === 0) return null

  return (
    <div className="concurrent-tools-bar">
      <span className="concurrent-tools-icon">⚡</span>
      {entries.map(([id, tool]) => (
        <span key={id} className="concurrent-tool-chip" style={{ borderColor: STATUS_COLORS[tool.status] || '#607D8B' }}>
          <span className="concurrent-tool-status" style={{ background: STATUS_COLORS[tool.status] || '#607D8B' }} />
          <span className="concurrent-tool-name">{tool.name}</span>
          {tool.status === 'running' && (
            <span className="concurrent-tool-spinner" />
          )}
        </span>
      ))}
    </div>
  )
}
