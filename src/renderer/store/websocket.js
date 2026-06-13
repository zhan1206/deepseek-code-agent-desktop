/**
 * RobustWebSocket — 带指数退避重连的 WebSocket 客户端。
 */
import { useStore } from './index.js'

export class RobustWebSocket {
  constructor(url, options = {}) {
    this.url = url
    this.options = { maxRetries: 5, retryDelay: 1000, maxRetryDelay: 30000, ...options }
    this.ws = null
    this.retries = 0
    this.connected = false
    this.messageQueue = []
    this.listeners = {}
    this._shouldReconnect = true
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        this.ws.onopen = () => {
          this.connected = true
          this.retries = 0
          useStore.getState().setWsConnected(true)
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()
            this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
          }
          this.emit('open')
          resolve()
        }
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.emit('message', data)
          } catch (e) {
            console.error('[WS] Parse error:', e)
          }
        }
        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error)
          this.connected = false
          this.emit('error', error)
        }
        this.ws.onclose = () => {
          this.connected = false
          useStore.getState().setWsConnected(false)
          this.emit('close')
          if (this._shouldReconnect && this.retries < this.options.maxRetries) {
            this.retries++
            const delay = Math.min(
              this.options.retryDelay * Math.pow(2, this.retries - 1),
              this.options.maxRetryDelay
            )
            console.log(`[WS] Retry ${this.retries}/${this.options.maxRetries} in ${delay}ms`)
            setTimeout(() => this.connect(), delay)
          } else if (this._shouldReconnect) {
            this.emit('maxRetriesExceeded')
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data))
    } else {
      this.messageQueue.push(data)
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  emit(event, data) {
    if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data))
  }

  close() {
    this._shouldReconnect = false
    if (this.ws) this.ws.close()
  }
}

/**
 * WebSocket 流式通信入口 — 连接后端并分发消息事件。
 */
export function streamAgent(sessionId, task, callbacks) {
  const { onChunk, onApprovalRequest, onDone, onError } = callbacks
  const rws = new RobustWebSocket(`ws://localhost:8000/ws/${sessionId}`, { maxRetries: 5 })

  rws.on('open', () => {
    console.log('[WS] Stream connected')
    rws.send({ type: 'run', task })
  })

  rws.on('message', (msg) => {
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
      rws.close()
    } else if (t === 'error') {
      onError(msg.message)
      rws.close()
    }
  })

  rws.on('error', () => { onError('WebSocket 连接失败') })
  rws.on('maxRetriesExceeded', () => { onError('WebSocket 重连失败，请检查后端是否运行') })

  rws.connect().catch(err => {
    onError(`无法连接到后端: ${err.message}`)
  })

  return rws
}
