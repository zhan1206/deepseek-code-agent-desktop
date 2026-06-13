import React, { useState, useEffect, useRef } from 'react'

const DANGER_LABELS = {
  0: ['✅ 安全', 'green'],
  1: ['⚠️ 中等', 'orange'],
  2: ['🔒 敏感', 'red'],
  3: ['☠️ 危险', 'darkred'],
}

// 危险命令模式（防止误操作）
const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf\s+\//, label: '根目录删除' },
  { pattern: /rm\s+-rf\s+\*\s*$/, label: '当前目录全删' },
  { pattern: /git\s+push\s+--force/i, label: '强制推送' },
  { pattern: /sudo\s+rm/i, label: 'sudo 删除' },
]

// 检测是否操作 .git 目录
function isGitPath(path) {
  if (!path) return false
  return path.includes('.git/') || path === '.git' || path.endsWith('/.git')
}

// 检测危险命令
function checkDanger(command, args) {
  const cmd = command || ''
  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(cmd)) return { dangerous: true, label }
  }
  // 额外检查：写操作指向 .git 目录
  const writeTools = ['write_file', 'edit_file', 'delete_file']
  if (writeTools.includes(command)) {
    const path = args?.path || args?.file || ''
    if (isGitPath(path)) {
      return { dangerous: true, label: `操作 .git 目录 (${path})` }
    }
  }
  return { dangerous: false }
}

export default function ApprovalDialog({ approval, onApprove, onReject }) {
  const { tool, args = {}, danger_level: dl = 0, approval_id: id, read_only: readOnly = false } = approval
  const [modified, setModified] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(JSON.stringify(args, null, 2))
  const [riskWarnings, setRiskWarnings] = useState([])

  // v2.0: 只读工具自动跳过审批
  useEffect(() => {
    if (readOnly) {
      onApprove(null)
    }
  }, [readOnly])

  // 危险模式检测
  useEffect(() => {
    const warnings = []
    // 工具级别的危险检测
    const toolRisk = checkDanger(tool, args)
    if (toolRisk.dangerous) {
      warnings.push({ level: 'CRITICAL', msg: toolRisk.label })
    }
    // 参数校验
    if (tool === 'run_shell') {
      const cmd = args?.command || ''
      if (/curl\s+[|^]*\s*\|.*sh/.test(cmd)) {
        warnings.push({ level: 'HIGH', msg: '检测到管道执行远程脚本（Pipe SSH）' })
      }
      if (/wget.*\s+-O-\s*\|.*sh/.test(cmd)) {
        warnings.push({ level: 'HIGH', msg: '检测到 wget 管道执行远程脚本' })
      }
    }
    if (tool === 'delete_file' || tool === 'run_shell') {
      const path = args?.path || args?.command || ''
      if (/node_modules/i.test(path)) {
        warnings.push({ level: 'MEDIUM', msg: '操作 node_modules 目录' })
      }
      if (/__pycache__|\\.pyc$/i.test(path)) {
        warnings.push({ level: 'LOW', msg: '操作 Python 缓存目录' })
      }
    }
    setRiskWarnings(warnings)
  }, [tool, args])

  if (readOnly) return null

  const [label, color] = DANGER_LABELS[dl] || DANGER_LABELS[0]
  const effectiveArgs = modified !== null ? modified : args

  const handleModify = () => {
    try {
      const parsed = JSON.parse(editText)
      setModified(parsed)
      setEditing(false)
    } catch {
      alert('JSON 格式错误')
    }
  }

  const handleApprove = () => {
    onApprove(modified)
  }

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

          {/* 危险警告 */}
          {riskWarnings.length > 0 && (
            <div className="approval-warnings">
              {riskWarnings.map((w, i) => (
                <div key={i} className={`risk-warning risk-${w.level.toLowerCase()}`}>
                  {w.level === 'CRITICAL' ? '☠️' : w.level === 'HIGH' ? '🚨' : '⚠️'} {w.msg}
                </div>
              ))}
            </div>
          )}

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
          {editing && (
            <>
              <button className="btn-secondary" onClick={() => setEditing(false)}>取消修改</button>
              <button className="btn-warning" onClick={handleModify}>确认修改</button>
            </>
          )}
          {!editing && (
            <>
              <button className="btn-secondary" onClick={() => setEditing(true)}>修改参数</button>
              <button
                className={riskWarnings.some(w => w.level === 'CRITICAL') ? 'btn-dangerous' : 'btn-primary'}
                onClick={handleApprove}
              >
                批准 {modified ? '(含修改)' : ''}
                {riskWarnings.some(w => w.level === 'CRITICAL') ? ' ⚠️' : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}