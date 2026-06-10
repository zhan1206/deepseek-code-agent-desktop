import React, { useState } from 'react'
import { useStore } from '../store'
import SessionManager from './SessionManager'
import ThemeSwitcher from './ThemeSwitcher'

export default function Sidebar() {
  const { projectPath, backendReady, toggleTerminal } = useStore()
  const [files, setFiles] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('dsca_sessions')
      return saved ? JSON.parse(saved) : [{ id: 'sess_default', name: '默认会话', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 }]
    } catch {
      return [{ id: 'sess_default', name: '默认会话', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 }]
    }
  })
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessions.length > 0 ? sessions[0].id : null
  })

  const saveSessions = (list) => {
    setSessions(list)
    try { localStorage.setItem('dsca_sessions', JSON.stringify(list)) } catch {}
  }

  const handleCreateSession = (name) => {
    const id = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const session = {
      id,
      name: name || `会话 ${sessions.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    }
    const list = [...sessions, session]
    saveSessions(list)
    handleSelectSession(id)
  }

  const handleSelectSession = (id) => {
    // 保存当前会话
    const currentId = activeSessionId
    const currentMessages = useStore.getState().messages
    if (currentId) {
      try {
        localStorage.setItem(`dsca_sess_${currentId}`, JSON.stringify({
          messages: currentMessages,
          projectPath: useStore.getState().projectPath,
          diffPreviews: useStore.getState().diffPreviews,
        }))
      } catch {}
      // 更新消息计数
      const list = sessions.map(s => s.id === currentId ? { ...s, messageCount: currentMessages.length, updatedAt: Date.now() } : s)
      saveSessions(list)
    }

    // 恢复目标会话
    setActiveSessionId(id)
    try {
      const raw = localStorage.getItem(`dsca_sess_${id}`)
      if (raw) {
        const data = JSON.parse(raw)
        useStore.setState({
          messages: data.messages || [],
          diffPreviews: data.diffPreviews || [],
          projectPath: data.projectPath || '',
          sessionId: id,
        })
      } else {
        // 新会话：清空状态
        useStore.setState({ messages: [], diffPreviews: [], sessionId: id })
      }
    } catch {}
  }

  const handleCloseSession = (id) => {
    try { localStorage.removeItem(`dsca_sess_${id}`) } catch {}
    const list = sessions.filter(s => s.id !== id)
    saveSessions(list)
    if (id === activeSessionId) {
      if (list.length > 0) {
        handleSelectSession(list[0].id)
      } else {
        setActiveSessionId(null)
      }
    }
  }

  const handleRenameSession = (id, newName) => {
    const list = sessions.map(s => s.id === id ? { ...s, name: newName, updatedAt: Date.now() } : s)
    saveSessions(list)
  }

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
          {/* 多会话管理 */}
          <SessionManager
            sessions={sessions}
            activeId={activeSessionId}
            onSelect={handleSelectSession}
            onCreate={handleCreateSession}
            onClose={handleCloseSession}
            onRename={handleRenameSession}
          />

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
              <div className="stat-row"><span>重构/分析</span><span className="stat-val">3 工具</span></div>
              <div className="stat-row"><span>知识图谱</span><span className="stat-val">3 工具</span></div>
              <div className="stat-row"><span>安全/基准</span><span className="stat-val">5 工具</span></div>
            </div>
          </div>

          <div className="sidebar-section">
            <button className="sidebar-btn" onClick={toggleTerminal}>🖥 终端</button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">外观</div>
            <ThemeSwitcher />
          </div>
        </>
      )}
    </div>
  )
}
