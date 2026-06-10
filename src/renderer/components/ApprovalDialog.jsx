import React, { useState } from 'react'

const DANGER_LABELS = {
  0: ['✅ 安全', 'green'],
  1: ['⚠️ 中等', 'orange'],
  2: ['🔒 敏感', 'red'],
  3: ['☠️ 危险', 'darkred'],
}

export default function ApprovalDialog({ approval, onApprove, onReject }) {
  const { tool, args = {}, danger_level: dl = 0, approval_id: id } = approval
  const [modified, setModified] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(JSON.stringify(args, null, 2))

  const [label, color] = DANGER_LABELS[dl] || DANGER_LABELS[0]

  const handleModify = () => {
    try {
      const parsed = JSON.parse(editText)
      setModified(parsed)
      setEditing(false)
    } catch {
      alert('JSON 格式错误')
    }
  }

  const effectiveArgs = modified !== null ? modified : args

  return (
    <div className="approval-overlay">
      <div className="approval-dialog">
        <div className="approval-header">
          <span className="approval-icon">🔔</span>
          <h2>操作审批请求</h2>
        </div>

        <div className="approval-body">
          <div className="approval-tool">
            <span className="approval-tool-name">{tool}</span>
            <span className="approval-danger" style={{ color }}>{label}</span>
          </div>

          <div className="approval-args">
            <div className="approval-args-title">参数</div>
            <pre className="approval-args-content">{JSON.stringify(args, null, 2)}</pre>
          </div>

          {editing && (
            <div className="approval-edit">
              <div className="approval-args-title">修改参数（JSON）</div>
              <textarea
                className="approval-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={8}
              />
            </div>
          )}
        </div>

        <div className="approval-footer">
          <button className="btn-dangerous" onClick={onReject}>拒绝</button>
          {editing && <button className="btn-secondary" onClick={() => setEditing(false)}>取消修改</button>}
          {editing
            ? <button className="btn-warning" onClick={handleModify}>确认修改</button>
            : <button className="btn-secondary" onClick={() => setEditing(true)}>修改参数</button>
          }
          <button
            className="btn-primary"
            onClick={() => onApprove(modified)}
          >
            批准 {modified ? '(含修改)' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
