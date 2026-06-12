import React, { useState } from 'react'
import { useStore } from '../store'

const PRUNING_LEVELS = [
  { level: 0, label: '全量', desc: '所有工具可用', icon: '🛠️' },
  { level: 1, label: '精简', desc: '已移除 verbose 工具', icon: '✂️' },
  { level: 2, label: '核心', desc: '仅核心规划工具', icon: '🎯' },
]

export default function ToolPruningIndicator({ pruningLevel = 0, totalTools = 0, activeTools = 0 }) {
  const [showMenu, setShowMenu] = useState(false)
  const { sessionId } = useStore()

  const info = PRUNING_LEVELS[pruningLevel] || PRUNING_LEVELS[0]

  const handleSelectLevel = async (level) => {
    setShowMenu(false)
    const sid = sessionId || '__current__'
    try {
      await fetch(`http://localhost:8000/api/tools/prune?session_id=${sid}&level=${level}`, { method: 'POST' })
    } catch {}
  }

  return (
    <div className="tool-pruning-indicator-wrapper">
      <div
        className="tool-pruning-indicator clickable"
        title={`${info.label}: ${info.desc} (点击切换)`}
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="pruning-icon">{info.icon}</span>
        <span className="pruning-label">{info.label}</span>
        {totalTools > 0 && (
          <span className="pruning-count">{activeTools}/{totalTools}</span>
        )}
      </div>
      {showMenu && (
        <div className="pruning-dropdown">
          {PRUNING_LEVELS.map((lvl) => (
            <div
              key={lvl.level}
              className={`pruning-option ${lvl.level === pruningLevel ? 'active' : ''}`}
              onClick={() => handleSelectLevel(lvl.level)}
            >
              <span className="pruning-option-icon">{lvl.icon}</span>
              <div className="pruning-option-info">
                <span className="pruning-option-label">{lvl.label}</span>
                <span className="pruning-option-desc">{lvl.desc}</span>
              </div>
              {lvl.level === pruningLevel && <span className="pruning-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
