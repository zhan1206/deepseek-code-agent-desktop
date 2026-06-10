import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '../store'
import ToolCallCard from './ToolCallCard'
import ApprovalDialog from './ApprovalDialog'

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const isTool = msg.role === 'tool_result'
  const isToolCall = msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0
  const isThinking = msg.thinking

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'} ${msg.status === 'streaming' ? 'streaming' : ''}`}>
      {isUser ? (
        <div className="message-bubble user-bubble">{msg.content}</div>
      ) : (
        <>
          {/* 工具调用卡片 */}
          {isToolCall && (
            <div className="tool-calls">
              {msg.toolCalls.map((tc, i) => (
                <ToolCallCard key={tc.id || i} toolCall={tc} />
              ))}
            </div>
          )}

          {/* 思考过程 */}
          {isThinking && (
            <div className="thinking-block">
              <span className="thinking-label">🤔 思考中</span>
              <pre className="thinking-content">{msg.thinking}</pre>
            </div>
          )}

          {/* 最终回复 */}
          {msg.content && (
            <div className="message-bubble assistant-bubble">
              <pre className="markdown-content">{msg.content}</pre>
            </div>
          )}

          {/* 工具结果 */}
          {isTool && (
            <div className={`tool-result ${msg.success ? 'success' : 'error'}`}>
              <span className="tool-result-label">🔧 {msg.toolName} → </span>
              <pre className="tool-result-content">{msg.content}</pre>
            </div>
          )}

          {/* 流式状态 */}
          {msg.status === 'streaming' && !msg.content && !isToolCall && (
            <div className="message-bubble assistant-bubble">
              <span className="cursor-blink" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ChatPanel() {
  const { messages, pendingApproval, sendMessage, clearPendingApproval, projectPath } = useStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleApproval = async (approved, modifiedArgs) => {
    if (window.electronAPI && pendingApproval) {
      await window.electronAPI.sendApprovalResponse(pendingApproval.approvalId, approved, modifiedArgs)
    }
    clearPendingApproval()
  }

  return (
    <div className="chat-panel">
      {/* 工具栏 */}
      <div className="chat-toolbar">
        <span className="chat-title">💬 对话</span>
        <span className="chat-project" title={projectPath}>{projectPath ? projectPath.split(/[/\\]/).pop() : '全局模式'}</span>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">⚡</div>
            <h2>DeepSeek Code Agent</h2>
            <p>告诉我想做什么，比如：</p>
            <ul>
              <li>"帮我解释 <code>src/utils.py</code> 中的逻辑"</li>
              <li>"运行项目测试并查看覆盖率"</li>
              <li>"给 <code>src/api.py</code> 添加错误处理"</li>
            </ul>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-form">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="输入任务（Enter 发送，Shift+Enter 换行）..."
            rows={3}
          />
          <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
            ▶ 发送
          </button>
        </form>
      </div>

      {/* 审批弹窗 */}
      {pendingApproval && (
        <ApprovalDialog
          approval={pendingApproval}
          onApprove={() => handleApproval(true)}
          onReject={() => handleApproval(false)}
        />
      )}
    </div>
  )
}
