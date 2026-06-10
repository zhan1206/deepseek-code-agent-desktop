import React, { useState } from 'react'
import { useStore } from '../store'

export default function Sidebar() {
  const { projectPath, backendReady, toggleTerminal } = useStore()
  const [files, setFiles] = useState([])
  const [collapsed, setCollapsed] = useState(false)

  const loadProject = async () => {
    if (!window.electronAPI) return
    const dir = await window.electronAPI.openDirectory()
    if (dir) {
      useStore.getState().setProjectPath(dir)
      setFiles([])
    }
  }

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">⚡ DS</span>
        {!collapsed && <span className="sidebar-title">Code Agent</span>}
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="sidebar-backend">
        <span className={`status-dot ${backendReady ? 'ok' : 'error'}`} />
        {!collapsed && <span className="status-label">{backendReady ? '后端就绪' : '后端离线'}</span>}
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-title">项目</div>
            <div className="sidebar-project" title={projectPath || '未选择'}>
              {projectPath ? projectPath.split(/[/\\]/).pop() : '未选择项目'}
            </div>
            <button className="sidebar-btn" onClick={loadProject}>📁 打开项目</button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">工具</div>
            <div className="sidebar-stats">
              <div className="stat-row"><span>文件系统</span><span className="stat-val">9 工具</span></div>
              <div className="stat-row"><span>Git</span><span className="stat-val">7 工具</span></div>
              <div className="stat-row"><span>Web</span><span className="stat-val">2 工具</span></div>
              <div className="stat-row"><span>测试</span><span className="stat-val">3 工具</span></div>
            </div>
          </div>

          <div className="sidebar-section">
            <button className="sidebar-btn" onClick={toggleTerminal}>🖥 终端</button>
          </div>
        </>
      )}
    </div>
  )
}
