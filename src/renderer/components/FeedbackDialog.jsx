import React, { useState } from 'react'

export default function FeedbackDialog({ onSubmit, onDismiss }) {
  const [description, setDescription] = useState('')
  const [includeLogs, setIncludeLogs] = useState(true)
  const [includeThinking, setIncludeThinking] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!description.trim()) return
    onSubmit({
      description: description.trim(),
      includeLogs,
      includeThinking,
    })
    setSubmitted(true)
    setTimeout(() => onDismiss(), 1500)
  }

  return (
    <div className="feedback-overlay">
      <div className="feedback-dialog">
        {submitted ? (
          <div className="feedback-success">
            <span className="feedback-success-icon">✅</span>
            <span>感谢反馈！报告已保存到本地。</span>
          </div>
        ) : (
          <>
            <div className="feedback-header">
              <span>📢 报告问题</span>
              <button className="feedback-close" onClick={onDismiss}>✕</button>
            </div>
            <div className="feedback-body">
              <textarea
                className="feedback-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述你遇到的问题..."
                rows={4}
              />
              <div className="feedback-options">
                <label className="feedback-option">
                  <input type="checkbox" checked={includeLogs} onChange={(e) => setIncludeLogs(e.target.checked)} />
                  <span>包含最近日志</span>
                </label>
                <label className="feedback-option">
                  <input type="checkbox" checked={includeThinking} onChange={(e) => setIncludeThinking(e.target.checked)} />
                  <span>包含 Agent 思考链</span>
                </label>
              </div>
              <div className="feedback-note">
                📁 报告仅保存到本地，不会上传至第三方服务器
              </div>
            </div>
            <div className="feedback-footer">
              <button className="btn-secondary" onClick={onDismiss}>取消</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={!description.trim()}>
                提交报告
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
