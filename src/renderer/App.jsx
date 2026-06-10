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

export default function App() {
  const { backendReady, projectPath, apiKey, diffPreviews, contextBudget, activeTools, securityScanResult, testLoopStatus, clearSecurityScan } = useStore()
  const [setupDone, setSetupDone] = useState(false)

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
        </div>
        <ChatPanel />
      </div>
      {/* DiffViewer 是独立浮层，由内部 state 控制显隐 */}
      <DiffViewer />
      <TerminalPanel />
      {/* v2.0: 安全扫描通知 */}
      {securityScanResult && (
        <SecurityScanBanner scan={securityScanResult} onDismiss={clearSecurityScan} />
      )}
    </div>
  )
}
