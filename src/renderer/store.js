import { create } from 'zustand'

// ── 消息类型工厂 ─────────────────────────────────────────────────────────
export function createMessage(role, content, extra = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    role,           // 'user' | 'assistant' | 'tool_result'
    content,
    timestamp: Date.now(),
    thinking: null,
    toolCalls: null,
    status: 'done',
    ...extra,
  }
}

// ── Store ───────────────────────────────────────────────────────────────────
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

  // ── v2.0: 上下文预算 ──────────────────────────────────────────────────
  contextBudget: null,  // { used, total, stage } | null

  // ── v2.0: 并发工具状态 ────────────────────────────────────────────────
  activeTools: {},  // { [toolCallId]: { name, status: 'running'|'done'|'error', startTime } }

  // ── v2.0: 安全扫描 ─────────────────────────────────────────────────────
  securityScanResult: null,  // { findings: [...], blocked: bool }

  // ── v2.0: 自适应测试循环 ─────────────────────────────────────────────
  testLoopStatus: null,  // { round, maxRounds, status: 'generating'|'running'|'fixing'|'passed'|'failed' }

  // ── v2.1: 工具裁剪级别 ───────────────────────────────────────────────
  toolPruningLevel: 0,  // 0=全量, 1=精简, 2=核心
  totalTools: 0,
  activeToolsCount: 0,

  // ── v2.1: 成本追踪 ──────────────────────────────────────────────────
  costData: null,  // { breakdown: {...}, total_cost: float }

  // ── 操作 ────────────────────────────────────────────────────────────
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

  // ── 消息 ─────────────────────────────────────────────────────────────
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
    // 更新 activeTools 状态
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

  // ── v2.0: 并发工具跟踪 ─────────────────────────────────────────────
  trackToolStart: (toolCallId, name) => set((s) => ({
    activeTools: { ...s.activeTools, [toolCallId]: { name, status: 'running', startTime: Date.now() } }
  })),

  trackToolEnd: (toolCallId) => set((s) => {
    const updated = { ...s.activeTools }
    if (updated[toolCallId]) {
      updated[toolCallId] = { ...updated[toolCallId], status: 'done' }
    }
    // 3秒后清理
    setTimeout(() => {
      set((st) => {
        const u = { ...st.activeTools }
        delete u[toolCallId]
        return { activeTools: u }
      })
    }, 3000)
    return { activeTools: updated }
  }),

  // ── v2.0: 上下文预算 ──────────────────────────────────────────────────
  setContextBudget: (budget) => set({ contextBudget: budget }),

  // ── v2.0: 安全扫描 ──────────────────────────────────────────────────
  setSecurityScan: (result) => set({ securityScanResult: result }),
  clearSecurityScan: () => set({ securityScanResult: null }),

  // ── v2.0: 测试循环 ──────────────────────────────────────────────────
  setTestLoopStatus: (status) => set({ testLoopStatus: status }),

  // ── v2.1: 工具裁剪 ──────────────────────────────────────────────────
  setToolPruning: (level, total, active) => set({ toolPruningLevel: level, totalTools: total, activeToolsCount: active }),

  // ── v2.1: 成本 ──────────────────────────────────────────────────────
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
  appendTerminal: (line) => set((s) => ({
    terminalOutput: [...s.terminalOutput, line]
  })),
  clearTerminal: () => set({ terminalOutput: [] }),
  toggleTerminal: () => set((s) => ({ showTerminal: !s.showTerminal })),

  // ── 发送消息 ────────────────────────────────────────────────────────
  sendMessage: async (text) => {
    const { sessionId, addMessage, appendContent, setMessageStatus, addToolResult,
            addDiffPreview, trackToolStart, trackToolEnd, setContextBudget,
            setSecurityScan, setTestLoopStatus } = get()
    if (!text.trim()) return

    // 1. 添加用户消息
    addMessage({ role: 'user', content: text })

    // 2. 确保有 session
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

    // 3. 创建助手消息占位
    const assistantId = Math.random().toString(36).slice(2)
    addMessage({ role: 'assistant', content: '', id: assistantId, status: 'streaming' })

    // 4. 连接 WebSocket 并流式处理
    streamAgent(
      sid, text,
      {
        onChunk: (msg) => {
          if (msg.content !== undefined && msg.content !== '') {
            appendContent(assistantId, msg.content)
          }
          if (msg.tool_calls) {
            const tcId = Math.random().toString(36).slice(2)
            addMessage({
              role: 'assistant',
              content: '',
              id: tcId,
              status: 'done',
              toolCalls: msg.tool_calls,
            })
          }
          if (msg.diff_preview) {
            addDiffPreview(msg.diff_preview)
          }
          // v2.0: 并发工具状态
          if (msg.tool_start) {
            trackToolStart(msg.tool_call_id || msg.tool_start.id, msg.tool_start.name)
          }
          if (msg.tool_end) {
            trackToolEnd(msg.tool_call_id || msg.tool_end.id)
          }
          // v2.0: 上下文预算
          if (msg.context_budget) {
            setContextBudget(msg.context_budget)
          }
          // v2.0: 安全扫描
          if (msg.security_scan) {
            setSecurityScan(msg.security_scan)
          }
          // v2.0: 测试循环
          if (msg.test_loop) {
            setTestLoopStatus(msg.test_loop)
          }
          // v2.1: 工具裁剪
          if (msg.tool_pruning !== undefined) {
            setToolPruning(msg.tool_pruning.level || 0, msg.tool_pruning.total || 0, msg.tool_pruning.active || 0)
          }
          // v2.1: 成本更新
          if (msg.cost_data) {
            setCostData(msg.cost_data)
          }
        },
        onApprovalRequest: (approval) => {
          get().setPendingApproval(approval)
        },
        onDone: () => {
          setMessageStatus(assistantId, 'done')
          set({ contextBudget: null, testLoopStatus: null })
        },
        onError: (err) => {
          appendContent(assistantId, '\n[错误] ' + err)
          setMessageStatus(assistantId, 'error')
        },
      }
    )
  },
}))

// ── WebSocket 流 ─────────────────────────────────────────────────────────────
function streamAgent(sessionId, task, callbacks) {
  const { onChunk, onApprovalRequest, onDone, onError } = callbacks
  let ws = null

  try {
    ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`)

    ws.onopen = () => {
      useStore.getState().setWsConnected(true)
      ws.send(JSON.stringify({ type: 'run', task }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const t = msg.type

      if (t === 'chunk') {
        onChunk(msg)
      } else if (t === 'approval_request') {
        onApprovalRequest({
          approvalId: msg.approval_id,
          tool: msg.tool,
          args: msg.args,
          danger_level: msg.danger_level,
        })
      } else if (t === 'done') {
        onDone()
        ws.close()
      } else if (t === 'error') {
        onError(msg.message)
        ws.close()
      }
    }

    ws.onerror = () => { onError('WebSocket 连接失败') }
    ws.onclose = () => { useStore.getState().setWsConnected(false) }
  } catch (e) {
    onError(e.message)
  }

  return ws
}
