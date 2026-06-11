import React from 'react'

const PRUNING_LEVELS = [
  { level: 0, label: '全量', desc: '所有工具可用', icon: '🛠️' },
  { level: 1, label: '精简', desc: '已移除 verbose 工具', icon: '✂️' },
  { level: 2, label: '核心', desc: '仅核心规划工具', icon: '🎯' },
]

export default function ToolPruningIndicator({ pruningLevel = 0, totalTools = 0, activeTools = 0 }) {
  const info = PRUNING_LEVELS[pruningLevel] || PRUNING_LEVELS[0]

  return (
    <div className="tool-pruning-indicator" title={`${info.label}: ${info.desc}`}>
      <span className="pruning-icon">{info.icon}</span>
      <span className="pruning-label">{info.label}</span>
      {totalTools > 0 && (
        <span className="pruning-count">{activeTools}/{totalTools}</span>
      )}
    </div>
  )
}
