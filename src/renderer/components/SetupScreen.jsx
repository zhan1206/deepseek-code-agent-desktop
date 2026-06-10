import React, { useState } from 'react'
import { useStore } from '../store'

export default function SetupScreen({ onDone }) {
  const [apiKey, setApiKey] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpenDir = async () => {
    if (!window.electronAPI) return
    const dir = await window.electronAPI.openDirectory()
    if (dir) setProjectPath(dir)
  }

  const handleStart = async () => {
    if (!apiKey.trim()) { setError('请输入 DeepSeek API Key'); return }
    setLoading(true)
    setError('')
    try {
      if (window.electronAPI) {
        await window.electronAPI.setApiKey(apiKey.trim())
        await window.electronAPI.startBackend()
      }
      useStore.getState().setApiKey(apiKey.trim())
      useStore.getState().setProjectPath(projectPath)
      onDone()
    } catch (e) {
      setError('启动失败：' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1 className="setup-title">DeepSeek Code Agent</h1>
        <p className="setup-subtitle">本地 AI 编程助手</p>

        <div className="setup-field">
          <label>DeepSeek API Key</label>
          <input
            type="password"
            placeholder="sk-xxxxxxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
          <span className="setup-hint">
            <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal('https://platform.deepseek.com/api_keys') }}>
              获取 API Key →
            </a>
          </span>
        </div>

        <div className="setup-field">
          <label>项目目录（可选）</label>
          <div className="setup-dir-row">
            <input
              type="text"
              placeholder="选择要管理的工作目录..."
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleOpenDir}>浏览</button>
          </div>
        </div>

        {error && <div className="setup-error">{error}</div>}

        <button
          className="btn-primary setup-start"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? '启动中...' : '开始使用'}
        </button>

        <div className="setup-note">
          API Key 通过 Electron safeStorage 加密存储在本地，仅发送给 DeepSeek API。
        </div>
      </div>
    </div>
  )
}
