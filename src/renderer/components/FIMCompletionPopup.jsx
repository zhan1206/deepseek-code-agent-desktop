import React, { useState, useEffect, useRef } from 'react'

export default function FIMCompletionPopup({ editorRef, onDismiss }) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [error, setError] = useState(null)

  const editor = editorRef?.current
  const selection = editor?.getSelection()
  const selectedText = selection ? editor.getModel().getValueInRange(selection) : ''

  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      requestCompletion(selectedText.trim())
    } else {
      setError('请先选中一段代码')
    }
  }, [])

  const requestCompletion = async (prefix) => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('http://localhost:8000/api/fim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, suffix: '', model: 'deepseek-coder' }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const completions = Array.isArray(data.completions) ? data.completions : [data.completion || '']
      setSuggestions(completions)
    } catch (e) {
      setError('补全请求失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = (text) => {
    if (editor) {
      const selection = editor.getSelection()
      editor.executeEdits('', [{
        range: selection,
        text,
      }])
    }
    onDismiss()
  }

  return (
    <div className="fim-popup">
      <div className="fim-header">
        <span>⚡ FIM 代码补全</span>
        <button onClick={onDismiss}>×</button>
      </div>
      <div className="fim-body">
        {loading && <div className="fim-loading">补全中...</div>}
        {error && <div className="fim-error">{error}</div>}
        {!loading && !error && suggestions.length === 0 && (
          <div className="fim-empty">选中代码后自动补全</div>
        )}
        {suggestions.map((s, i) => (
          <div key={i} className={`fim-suggestion ${i === selectedIdx ? 'selected' : ''}`}>
            <pre className="fim-code">{s.slice(0, 200)}{s.length > 200 ? '...' : ''}</pre>
            <button className="fim-accept-btn" onClick={() => handleAccept(s)}>
              采纳 ↵ 
            </button>
          </div>
        ))}
      </div>
      <div className="fim-footer">
        <span>↑↓ 选择 · Enter 采纳 · Esc 关闭</span>
      </div>
    </div>
  )
}
