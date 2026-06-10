import React, { useState, Suspense, lazy } from 'react'
import { useStore } from '../store'

const MonacoDiffEditor = lazy(() => import('@monaco-editor/react'))

const LANGUAGE_MAP = {
  py: 'python', js: 'javascript', ts: 'typescript', tsx: 'typescript',
  jsx: 'javascript', java: 'java', c: 'c', cpp: 'cpp', go: 'go',
  rs: 'rust', rb: 'ruby', php: 'php', sh: 'shell', bash: 'shell',
  json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml', html: 'html',
  css: 'css', scss: 'scss', md: 'markdown', sql: 'sql', toml: 'ini',
}

function getLanguage(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  return LANGUAGE_MAP[ext] || 'plaintext'
}

function DiffToolbar({ diff, active, onClose, onAccept, onReject }) {
  const [tab, setTab] = useState(active)
  const current = diff.find(d => d.previewId === tab) || diff[0]
  if (!current) return null

  const additions = (current.modified || '').split('\n').length
  const deletions = (current.original || '').split('\n').length

  return (
    <div className="diff-toolbar">
      {/* 文件标签页 */}
      <div className="diff-tabs">
        {diff.map(d => (
          <button
            key={d.previewId}
            className={`diff-tab ${tab === d.previewId ? 'active' : ''}`}
            onClick={() => setTab(d.previewId)}
          >
            {d.file.split(/[/\\]/).pop()}
          </button>
        ))}
      </div>

      {/* 统计 */}
      <div className="diff-stats">
        <span className="diff-add">+{additions}</span>
        <span className="diff-del">-{deletions}</span>
      </div>

      {/* 操作 */}
      <div className="diff-actions-row">
        <button className="btn-dangerous btn-sm" onClick={onReject}>全部拒绝</button>
        <button className="btn-primary btn-sm" onClick={onAccept}>全部接受</button>
        <button className="diff-close-btn" onClick={onClose} title="关闭">✕</button>
      </div>
    </div>
  )
}

function DiffContent({ diff }) {
  const [activeTab, setActiveTab] = useState(diff[0]?.previewId)

  const current = diff.find(d => d.previewId === activeTab) || diff[0]
  if (!current) return <div className="diff-empty">无预览内容</div>

  const lang = getLanguage(current.file)

  return (
    <div className="diff-editor-wrap">
      <div className="diff-editor-filename">
        <span className="diff-file-icon">📄</span>
        <span className="diff-file-path">{current.file}</span>
        <span className="diff-lang-badge">{lang}</span>
      </div>

      <Suspense fallback={
        <div className="diff-loading">
          <div className="diff-loading-spinner" />
          加载编辑器...
        </div>
      }>
        <MonacoDiffEditor
          original={current.original || '(空)'}
          modified={current.modified || '(空)'}
          language={lang}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
            lineHeight: 20,
            wordWrap: 'off',
            automaticLayout: true,
            diffWordWrap: 'off',
            renderLineHighlight: 'none',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            contextmenu: false,
            mouseWheelZoom: true,
            smoothScrolling: true,
            padding: { top: 8, bottom: 8 },
          }}
          onMount={() => {}}
        />
      </Suspense>
    </div>
  )
}

export default function DiffViewer() {
  const { diffPreviews, activeDiffPreview, setActiveDiffPreview, clearDiffPreviews } = useStore()
  const [open, setOpen] = useState(false)

  // diffPreviews 变化时自动打开
  React.useEffect(() => {
    if (diffPreviews.length > 0) setOpen(true)
  }, [diffPreviews.length])

  const handleClose = () => { setOpen(false); clearDiffPreviews() }
  const handleAccept = async () => {
    // TODO: 调用后端 diff/apply
    handleClose()
  }
  const handleReject = async () => {
    for (const d of diffPreviews) {
      try {
        await fetch('http://localhost:8000/diff/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preview_id: d.previewId, session_id: d.sessionId || '' }),
        })
      } catch {}
    }
    handleClose()
  }

  if (!open || diffPreviews.length === 0) return null

  return (
    <div className={`diff-viewer${open ? ' open' : ''}`}>
      <DiffToolbar
        diff={diffPreviews}
        active={activeDiffPreview || diffPreviews[0]?.previewId}
        onClose={handleClose}
        onAccept={handleAccept}
        onReject={handleReject}
      />
      <DiffContent diff={diffPreviews} />
    </div>
  )
}
