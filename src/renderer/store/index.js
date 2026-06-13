/**
 * Zustand Store — 核心状态管理。
 *
 * 拆分自原 store.js，职责：
 * - 全局状态声明
 * - 消息 CRUD 操作
 * - Session 管理
 * - Diff / 审批 / 终端操作
 * - sendMessage 流式入口
 */
import { create } from 'zustand'
import { createMessage } from './messageHelpers.js'
import { streamAgent } from './websocket.js'

export const useStore = create((set, get) => ({
  // ── 状态 ─────────────────────────────────────────────────────────────
  apiKey: '',
  projectPath: '',
  sessionId: null,
  backendReady: false,
  wsConnected: false,
  connecting: false,

  // ── 消息 ─────────────────────────────────────────────────────────────
  messages: [],
  pendingApproval: null,

  // ── Diff ────────────────────────────────────────────────────────────
  diffPreviews: [],
  activeDiffPreview: null,

  // ── 终端 ────────────────────────────────────────────────────────────
  terminalOutput: [],
  showTerminal: false,

  // ── v2.0 ────────────────────────────────────────────────────────────
  contextBudget: null,
  activeTools: {},
  securityScanResult: null,
  testLoopStatus: null,

  // ── v2.1 ────────────────────────────────────────────────────────────
  toolPruningLevel: 0,
  totalTools: 0,
  activeToolsCount: 0,
  costData: null,

  // ── Setters ──────────────────────────────────────────────────────────
  setApiKey: (key) => set({ apiKey: key }),
  setProjectPath: (path) => set({ projectPath: path }),
  setBackendReady: (v) => set({ backendReady: v }),
  setWsConnected: (v) => set({ wsConnected: v }),
  setConnecting: (v) => set({ connecting: v }),

  // ── Session ─────────────────────────────────────────────────────────
  createSession: async () => {
    const { projectPath, apiKey } = get()
    if (!apiKey) throw new Error('No API Key')
    set({ connecting: true })
    try {
      const resp = await fetch('http://localhost:8000/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectPath || '.', model: 'deepseek-chat', mode: 'react' }),
      })
      if (!resp.ok) throw new Error(`Session creation failed: ${resp.status}`)
      const data = await resp.json()
      set({ sessionId: data.session_id, connecting: false })
      return data.session_id
    } catch (e) {
      set({ connecting: false })
      throw e
    }
  },

  // ── 消息操作 ───────────────────────────────────────────────────────
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...createMessage(msg.role, msg.content), ...msg }]
  })),

  updateMessage: (id, patch) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, ...patch } : m)
  })),

  appendContent: (id, chunk) => set((s) => ({
    messages: s.messages.map((m) =>
      m.id === id ? { ...m, content: (m.content || '') + chunk } : m
    )
  })),

  setMessageStatus: (id, status) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, status } : m)
  })),

  addToolResult: (toolCallId, toolName, result, success) => set((s) => {
    const updatedActiveTools = { ...s.activeTools }
    if (updatedActiveTools[toolCallId]) {
      updatedActiveTools[toolCallId] = { ...updatedActiveTools[toolCallId], status: success ? 'done' : 'error' }
    }
    return {
      messages: [
        ...s.messages,
        {
          id: Math.random().toString(36).slice(2),
          role: 'tool_result',
          content: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
          timestamp: Date.now(),
          status: 'done',
          toolCallId,
          toolName,
          success,
        }
      ],
      activeTools: updatedActiveTools,
    }
  }),

  // ── v2.0 操作 ───────────────────────────────────────────────────────
  trackToolStart: (toolCallId, name) => set((s) => ({
    activeTools: { ...s.activeTools, [toolCallId]: { name, status: 'running', startTime: Date.now() } }
  })),

  trackToolEnd: (toolCallId) => set((s) => {
    const updated = { ...s.activeTools }
    if (updated[toolCallId]) {
      updated[toolCallId] = { ...updated[toolCallId], status: 'done' }
    }
    setTimeout(() => {
      set((st) => {
        const u = { ...st.activeTools }
        delete u[toolCallId]
        return { activeTools: u }
      })
    }, 3000)
    return { activeTools: updated }
  }),

  setContextBudget: (budget) => set({ contextBudget: budget }),
  setSecurityScan: (result) => set({ securityScanResult: result }),
  clearSecurityScan: () => set({ securityScanResult: null }),
  setTestLoopStatus: (status) => set({ testLoopStatus: status }),
  setToolPruning: (level, total, active) => set({ toolPruningLevel: level, totalTools: total, activeToolsCount: active }),
  setCostData: (data) => set({ costData: data }),

  // ── Diff ────────────────────────────────────────────────────────────
  addDiffPreview: (preview) => set((s) => ({
    diffPreviews: [...s.diffPreviews, preview],
    activeDiffPreview: preview.previewId,
  })),
  setActiveDiffPreview: (id) => set({ activeDiffPreview: id }),
  clearDiffPreviews: () => set({ diffPreviews: [], activeDiffPreview: null }),

  // ── 审批 ────────────────────────────────────────────────────────────
  setPendingApproval: (item) => set({ pendingApproval: item }),
  clearPendingApproval: () => set({ pendingApproval: null }),

  // ── 终端 ────────────────────────────────────────────────────────────
  appendTerminal: (line) => set((s) => ({ terminalOutput: [...s.terminalOutput, line] })),
  clearTerminal: () => set({ terminalOutput: [] }),
  toggleTerminal: () => set((s) => ({ showTerminal: !s.showTerminal })),

  // ── 发送消息 ────────────────────────────────────────────────────────
  sendMessage: async (text) => {
    const { sessionId, addMessage, appendContent, setMessageStatus, addToolResult,
            addDiffPreview, trackToolStart, trackToolEnd, setContextBudget,
            setSecurityScan, setTestLoopStatus, setToolPruning, setCostData } = get()
    if (!text.trim()) return

    addMessage({ role: 'user', content: text })

    let sid = sessionId
    if (!sid) {
      try {
        sid = await get().createSession()
      } catch (e) {
        addMessage({ role: 'assistant', content: '无法创建会话：' + e.message })
        return
      }
      set({ sessionId: sid })
    }

    const assistantId = Math.random().toString(36).slice(2)
    addMessage({ role: 'assistant', content: '', id: assistantId, status: 'streaming' })

    streamAgent(sid, text, {
      onChunk: (msg) => {
        if (msg.content !== undefined && msg.content !== '') {
          appendContent(assistantId, msg.content)
        }
        if (msg.tool_calls) {
          const tcId = Math.random().toString(36).slice(2)
          addMessage({ role: 'assistant', content: '', id: tcId, status: 'done', toolCalls: msg.tool_calls })
        }
        if (msg.diff_preview) addDiffPreview(msg.diff_preview)
        if (msg.tool_start) trackToolStart(msg.tool_call_id || msg.tool_start.id, msg.tool_start.name)
        if (msg.tool_end) trackToolEnd(msg.tool_call_id || msg.tool_end.id)
        if (msg.context_budget) setContextBudget(msg.context_budget)
        if (msg.security_scan) setSecurityScan(msg.security_scan)
        if (msg.test_loop) setTestLoopStatus(msg.test_loop)
        if (msg.tool_pruning !== undefined) {
          setToolPruning(msg.tool_pruning.level || 0, msg.tool_pruning.total || 0, msg.tool_pruning.active || 0)
        }
        if (msg.cost_data) setCostData(msg.cost_data)
      },
      onApprovalRequest: (approval) => get().setPendingApproval(approval),
      onDone: () => {
        setMessageStatus(assistantId, 'done')
        set({ contextBudget: null, testLoopStatus: null })
      },
      onError: (err) => {
        appendContent(assistantId, '\n[错误] ' + err)
        setMessageStatus(assistantId, 'error')
      },
    })
  },
}))
