import React from 'react'

const STATUS_LABELS = {
  generating: '🤖 生成测试',
  running: '🧪 运行测试',
  fixing: '🔧 LLM 修复中',
  passed: '✅ 通过',
  failed: '❌ 失败',
}

const STATUS_COLORS = {
  generating: '#58a6ff',
  running: '#d29922',
  fixing: '#a371f7',
  passed: '#3fb950',
  failed: '#f85149',
}

export default function TestLoopProgress({ loop }) {
  if (!loop) return null
  const { round, maxRounds, status } = loop
  const color = STATUS_COLORS[status] || '#607D8B'

  return (
    <div className="test-loop-bar">
      <span className="test-loop-icon">🔄</span>
      <span className="test-loop-label" style={{ color }}>
        {STATUS_LABELS[status] || status}
      </span>
      <span className="test-loop-rounds">
        第 {round}/{maxRounds} 轮
      </span>
      {(status === 'generating' || status === 'running' || status === 'fixing') && (
        <div className="test-loop-dots">
          <span className="test-loop-dot" />
          <span className="test-loop-dot" />
          <span className="test-loop-dot" />
        </div>
      )}
    </div>
  )
}
