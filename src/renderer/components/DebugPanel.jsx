import React, { useState } from 'react'

const VARIABLES_ICON = { local: '📋', global: '🌐', closure: '🔒' }

export default function DebugPanel({ debugState, onAction }) {
  const { status, variables, callStack, sessionId } = debugState || {}

  if (!status) return null

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <span className="debug-icon">🐛</span>
        <span className="debug-title">调试器</span>
        <span className={`debug-status ${status === 'running' ? 'active' : ''}`}>
          {status === 'running' ? '● 运行中' : status === 'paused' ? '⏸ 暂停' : '○ 已停止'}
        </span>
        <div className="debug-actions">
          <button className="debug-btn" onClick={() => onAction('continue')} title="继续">▶</button>
          <button className="debug-btn" onClick={() => onAction('step_over')} title="单步跳过">⏭</button>
          <button className="debug-btn" onClick={() => onAction('step_into')} title="单步进入">⏬</button>
          <button className="debug-btn debug-stop-btn" onClick={() => onAction('stop')} title="停止">⏹</button>
        </div>
      </div>

      <div className="debug-body">
        {/* 变量面板 */}
        <div className="debug-section">
          <div className="debug-section-title">变量</div>
          {variables && Object.entries(variables).map(([scope, vars]) => (
            <div key={scope} className="debug-scope">
              <span className="debug-scope-label">{VARIABLES_ICON[scope] || '📋'} {scope}</span>
              <div className="debug-vars">
                {Object.entries(vars).map(([name, value]) => (
                  <div key={name} className="debug-var">
                    <span className="debug-var-name">{name}</span>
                    <span className="debug-var-eq">=</span>
                    <span className="debug-var-value">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 调用栈 */}
        {callStack && callStack.length > 0 && (
          <div className="debug-section">
            <div className="debug-section-title">调用栈</div>
            {callStack.map((frame, i) => (
              <div key={i} className="debug-frame">
                <span className="debug-frame-fn">{frame.function}</span>
                <span className="debug-frame-loc">{frame.file}:{frame.line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
