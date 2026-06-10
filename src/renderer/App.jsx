import React, { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import DiffViewer from './components/DiffViewer'
import TerminalPanel from './components/TerminalPanel'
import SetupScreen from './components/SetupScreen'
import ContextBudgetBar from './components/ContextBudgetBar'
import ConcurrentToolsBar from './components/ConcurrentToolsBar'
import TestLoopProgress from './components/TestLoopProgress'
import SecurityScanBanner from './components/SecurityScanBanner'
import DebugPanel from './components/DebugPanel'
import FeedbackDialog from './components/FeedbackDialog'

export default function App() {
  const { backendReady, projectPath, apiKey, diffPreviews, contextBudget, activeTools, securityScanResult, testLoopStatus, clearSecurityScan } = useStore()
  const [setupDone, setSetupDone] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onBackendStatus((data) => {
        useStore.getState().setBackendReady(data.ready)
      })
      window.electronAPI.getConfig().then((cfg) => {
        useStore.getState().setBackendReady(cfg.backendReady)
      })
    }
  }, [])

  const handleSetupDone = () => setSetupDone(true)

  const handleDebugAction = async (action) => {
    try {
      const resp = await fetch(`http://localhost:8000/debug/${action}`, { method: 'POST' })
      const data = await resp.json()
      // 更新调试状态
    } catch {}
  }

  const handleFeedbackSubmit = async (feedback) => {
    try {
      await fetch('http://localhost:8000/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      })
    } catch {}
  }

  if (!setupDone) {
    return <SetupScreen onDone={handleSetupDone} />
  }

  return (
    <div className="app-root">
      <Sidebar />
      <div className="main-area">
        {/* v2.0 状态栏 */}
        <div className="v2-status-bar">
          <ContextBudgetBar budget={contextBudget} />
          <ConcurrentToolsBar activeTools={activeTools} />
          <TestLoopProgress loop={testLoopStatus} />
          <div className="v2-status-actions">
            <button className="v2-status-btn" onClick={() => setShowDebug(!showDebug)} title="调试器">🐛</button>
            <button className="v2-status-btn" onClick={() => setShowFeedback(true)} title="报告问题">📢</button>
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <ChatPanel />
          {showDebug && (
            <DebugPanel
              debugState={{ status: 'stopped' }}
              onAction={handleDebugAction}
            />
          )}
        </div>
      </div>
      <DiffViewer />
      <TerminalPanel />
      {securityScanResult && (
        <SecurityScanBanner scan={securityScanResult} onDismiss={clearSecurityScan} />
      )}
      {showFeedback && (
        <FeedbackDialog onSubmit={handleFeedbackSubmit} onDismiss={() => setShowFeedback(false)} />
      )}
    </div>
  )
}
