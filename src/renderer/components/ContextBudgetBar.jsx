import React from 'react'

const STAGE_LABELS = {
  truncate: '截断中',
  summarize: '总结中',
  discard: '丢弃中',
  ok: '正常',
}

const STAGE_COLORS = {
  truncate: '#d29922',
  summarize: '#a371f7',
  discard: '#f85149',
  ok: '#3fb950',
}

export default function ContextBudgetBar({ budget }) {
  if (!budget) return null
  const { used, total, stage } = budget
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const label = STAGE_LABELS[stage] || stage
  const color = STAGE_COLORS[stage] || '#607D8B'

  return (
    <div className="context-budget-bar">
      <span className="context-budget-icon">📏</span>
      <span className="context-budget-label">上下文</span>
      <div className="context-budget-track">
        <div
          className="context-budget-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="context-budget-pct" style={{ color }}>{Math.round(pct)}%</span>
      {stage !== 'ok' && (
        <span className="context-budget-stage" style={{ color }}>· {label}</span>
      )}
      <span className="context-budget-detail">{used}/{total} tokens</span>
    </div>
  )
}
