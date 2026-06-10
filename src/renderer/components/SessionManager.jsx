import React, { useState } from 'react'

export default function SessionManager({ sessions, activeId, onSelect, onCreate, onClose, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const handleRename = (id) => {
    if (editName.trim()) {
      onRename(id, editName.trim())
    }
    setEditingId(null)
  }

  const handleCreate = () => {
    onCreate(newName.trim() || undefined)
    setNewName('')
    setShowNew(false)
  }

  return (
    <div className="session-manager">
      <div className="session-manager-header">
        <span className="session-manager-title">💬 会话</span>
        <button className="session-new-btn" onClick={() => setShowNew(true)} title="新建会话">+</button>
      </div>

      {showNew && (
        <div className="session-new-form">
          <input
            className="session-new-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="会话名称..."
            autoFocus
          />
          <button className="session-new-confirm" onClick={handleCreate}>✓</button>
          <button className="session-new-cancel" onClick={() => setShowNew(false)}>✕</button>
        </div>
      )}

      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            {editingId === s.id ? (
              <input
                className="session-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(s.id); if (e.key === 'Escape') setEditingId(null) }}
                onBlur={() => handleRename(s.id)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="session-name" title={s.name}>
                {s.name}
              </span>
            )}
            <span className="session-meta">
              {s.messageCount > 0 && <span className="session-msg-count">{s.messageCount}</span>}
            </span>
            <div className="session-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="session-action-btn"
                onClick={() => { setEditingId(s.id); setEditName(s.name) }}
                title="重命名"
              >✏️</button>
              {sessions.length > 1 && (
                <button
                  className="session-action-btn session-close-btn"
                  onClick={() => onClose(s.id)}
                  title="关闭"
                >✕</button>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="session-empty">暂无会话</div>
        )}
      </div>
    </div>
  )
}
