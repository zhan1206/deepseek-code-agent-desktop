/**
 * SessionManager — 多会话管理
 * - 创建/切换/关闭/重命名会话
 * - 每个会话独立 WebSocket 连接
 * - 序列化/反序列化会话状态到磁盘
 */

import React, { useState, useCallback } from 'react'
import { useStore } from '../store'

const SESSIONS_DIR = 'deepseek-agent-desktop/sessions'

export function useSessionManager() {
  const { sessionId, messages, diffPreviews } = useStore()
  const [sessions, setSessions] = useState(() => {
    // 从 localStorage 恢复会话列表
    try {
      const saved = localStorage.getItem('dsca_sessions')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [activeSessionId, setActiveSessionId] = useState(sessionId)

  const saveSessions = useCallback((list) => {
    setSessions(list)
    try { localStorage.setItem('dsca_sessions', JSON.stringify(list)) } catch {}
  }, [])

  const createSession = useCallback((name) => {
    const id = 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const session = {
      id,
      name: name || `会话 ${list.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    }
    const list = [...sessions, session]
    saveSessions(list)
    switchSession(id)
    return id
  }, [sessions, saveSessions])

  const switchSession = useCallback((id) => {
    // 序列化当前会话
    serializeCurrentSession()
    // 切换
    setActiveSessionId(id)
    // 反序列化目标会话
    deserializeSession(id)
  }, [activeSessionId])

  const closeSession = useCallback((id) => {
    const list = sessions.filter(s => s.id !== id)
    saveSessions(list)
    // 删除存储
    try { localStorage.removeItem(`dsca_sess_${id}`) } catch {}
    // 如果关闭的是当前会话，切换到第一个
    if (id === activeSessionId && list.length > 0) {
      switchSession(list[0].id)
    } else if (list.length === 0) {
      setActiveSessionId(null)
    }
  }, [sessions, activeSessionId, saveSessions, switchSession])

  const renameSession = useCallback((id, newName) => {
    const list = sessions.map(s => s.id === id ? { ...s, name: newName, updatedAt: Date.now() } : s)
    saveSessions(list)
  }, [sessions, saveSessions])

  const serializeCurrentSession = useCallback(() => {
    if (!activeSessionId) return
    const state = useStore.getState()
    const data = {
      id: activeSessionId,
      messages: state.messages,
      diffPreviews: state.diffPreviews,
      projectPath: state.projectPath,
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(`dsca_sess_${activeSessionId}`, JSON.stringify(data))
    } catch {}
  }, [activeSessionId])

  const deserializeSession = useCallback((id) => {
    try {
      const raw = localStorage.getItem(`dsca_sess_${id}`)
      if (!raw) return
      const data = JSON.parse(raw)
      const store = useStore.getState()
      // 恢复状态
      store.setProjectPath(data.projectPath || '')
      // 直接设置 messages（非 store action，需要 setState）
      useStore.setState({
        messages: data.messages || [],
        diffPreviews: data.diffPreviews || [],
        sessionId: id,
      })
    } catch {}
  }, [])

  const updateSessionMeta = useCallback((id, patch) => {
    const list = sessions.map(s => s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)
    saveSessions(list)
  }, [sessions, saveSessions])

  return {
    sessions,
    activeSessionId,
    createSession,
    switchSession,
    closeSession,
    renameSession,
    serializeCurrentSession,
    updateSessionMeta,
  }
}
