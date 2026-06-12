import React, { useState, useEffect } from 'react'
import { useStore } from '../store'

const SESSION_ID_PLACEHOLDER = '__current__'

export default function ModelManager({ onDismiss }) {
  const { apiKey, sessionId } = useStore()
  const [models, setModels] = useState([])
  const [activeTab, setActiveTab] = useState('list') // 'list'|'test'|'settings'
  const [testModel, setTestModel] = useState('deepseek-chat')
  const [testResult, setTestResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [costData, setCostData] = useState(null)

  // v1.5.0: planner/executor 模型
  const [plannerModel, setPlannerModel] = useState('deepseek-reasoner')
  const [executorModel, setExecutorModel] = useState('deepseek-chat')
  const [modelAssignMsg, setModelAssignMsg] = useState('')

  // v1.5.0: 隐私过滤
  const [privacyEnabled, setPrivacyEnabled] = useState(false)
  const [privacyMsg, setPrivacyMsg] = useState('')

  // v1.5.0: 预算
  const [maxCost, setMaxCost] = useState(5.0)
  const [costMsg, setCostMsg] = useState('')

  const sid = sessionId || SESSION_ID_PLACEHOLDER

  useEffect(() => {
    fetchModels()
    fetchCost()
    fetchPrivacy()
    fetchCostSettings()
  }, [])

  const api = (path, opts = {}) =>
    fetch(`http://localhost:8000${path}?session_id=${sid}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    })

  const fetchModels = async () => {
    try {
      const resp = await api('/api/models')
      if (resp.ok) {
        const data = await resp.json()
        setModels(data.models || [])
      }
    } catch {}
  }

  const fetchCost = async () => {
    try {
      const resp = await api('/api/cost')
      if (resp.ok) {
        const data = await resp.json()
        setCostData(data)
      }
    } catch {}
  }

  const fetchPrivacy = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/privacy')
      if (resp.ok) {
        const data = await resp.json()
        setPrivacyEnabled(data.enabled)
      }
    } catch {}
  }

  const fetchCostSettings = async () => {
    try {
      const resp = await api('/api/cost/settings')
      if (resp.ok) {
        const data = await resp.json()
        setMaxCost(data.max_cost_usd || 5.0)
      }
    } catch {}
  }

  const handleTestConnectivity = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const resp = await api(`/api/models/test&alias=${encodeURIComponent(testModel)}`, { method: 'POST' })
      const data = await resp.json()
      setTestResult(data.success ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTestLoading(false)
    }
  }

  // v1.5.0: 模型分配
  const handleAssignModels = async () => {
    setModelAssignMsg('')
    try {
      const resp = await api(`/api/models/assign&planner_model=${encodeURIComponent(plannerModel)}&executor_model=${encodeURIComponent(executorModel)}`, { method: 'POST' })
      if (resp.ok) {
        setModelAssignMsg('✅ 已应用')
      } else {
        setModelAssignMsg('❌ 分配失败')
      }
    } catch {
      setModelAssignMsg('❌ 分配失败')
    }
  }

  // v1.5.0: 隐私过滤开关
  const handlePrivacyToggle = async () => {
    const newVal = !privacyEnabled
    try {
      const resp = await fetch(`http://localhost:8000/api/privacy?enabled=${newVal}`, { method: 'POST' })
      if (resp.ok) {
        setPrivacyEnabled(newVal)
        setPrivacyMsg(newVal ? '🔒 已启用' : '🔓 已禁用')
        setTimeout(() => setPrivacyMsg(''), 2000)
      }
    } catch {}
  }

  // v1.5.0: 预算设置
  const handleSetBudget = async () => {
    setCostMsg('')
    try {
      const resp = await api(`/api/cost/settings&max_cost_usd=${maxCost}`, { method: 'POST' })
      if (resp.ok) {
        setCostMsg('✅ 已更新')
      } else {
        setCostMsg('❌ 更新失败')
      }
    } catch {
      setCostMsg('❌ 请求失败')
    }
  }

  const formatCost = (cost) => {
    if (!cost && cost !== 0) return '$0.00'
    return '$' + Number(cost).toFixed(4)
  }

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal-content model-manager" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 模型管理器</h2>
          <button className="modal-close" onClick={onDismiss}>×</button>
        </div>

        <div className="modal-tabs">
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
            📋 模型
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            ⚙️ 设置
          </button>
          <button className={activeTab === 'test' ? 'active' : ''} onClick={() => setActiveTab('test')}>
            🔌 连通测试
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="modal-body">
            {costData && (
              <div className="cost-summary">
                <h3>💰 本次会话成本</h3>
                <div className="cost-grid">
                  {costData.breakdown && Object.entries(costData.breakdown).map(([model, info]) => (
                    <div key={model} className="cost-row">
                      <span className="cost-model">{model}</span>
                      <span className="cost-tokens">{info.prompt_tokens || 0} prompt + {info.completion_tokens || 0} completion</span>
                      <span className="cost-amount">{formatCost(info.cost)}</span>
                    </div>
                  ))}
                  <div className="cost-total">
                    <span>总计</span>
                    <span className="cost-amount">{formatCost(costData.total_cost)}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="model-list">
              <h3>已配置模型</h3>
              {models.length === 0 && <p className="empty-hint">暂无模型数据，请先发送一条消息</p>}
              {models.map((m) => (
                <div key={m.name} className="model-item">
                  <span className="model-name">{m.name}</span>
                  {m.alias && <span className="model-alias">({m.alias})</span>}
                  <span className={`model-status ${m.available ? 'online' : 'offline'}`}>
                    {m.available ? '● 在线' : '○ 不可用'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="modal-body settings-body">
            {/* v1.5.0: 双模型分配 */}
            <div className="settings-section">
              <h3>🎯 双模型分配</h3>
              <p className="settings-desc">分别指定规划/推理用的模型和执行/对话用的模型</p>
              <div className="model-assign-form">
                <div className="assign-row">
                  <label>🧠 规划模型</label>
                  <select value={plannerModel} onChange={(e) => { setPlannerModel(e.target.value); setModelAssignMsg('') }}>
                    <option value="deepseek-reasoner">deepseek-reasoner</option>
                    <option value="deepseek-chat">deepseek-chat</option>
                    <option value="deepseek-coder">deepseek-coder</option>
                    <option value="deepseek-chat-v2">deepseek-chat-v2</option>
                  </select>
                </div>
                <div className="assign-row">
                  <label>⚡ 执行模型</label>
                  <select value={executorModel} onChange={(e) => { setExecutorModel(e.target.value); setModelAssignMsg('') }}>
                    <option value="deepseek-chat">deepseek-chat</option>
                    <option value="deepseek-coder">deepseek-coder</option>
                    <option value="deepseek-reasoner">deepseek-reasoner</option>
                    <option value="deepseek-chat-v2">deepseek-chat-v2</option>
                  </select>
                </div>
                <button className="btn-primary assign-btn" onClick={handleAssignModels}>应用设置</button>
                {modelAssignMsg && <span className="assign-msg">{modelAssignMsg}</span>}
              </div>
            </div>

            <div className="settings-divider" />

            {/* v1.5.0: 隐私过滤 */}
            <div className="settings-section">
              <h3>🔒 隐私过滤</h3>
              <p className="settings-desc">过滤发往 LLM 的敏感信息（GitHub Token、密钥等）</p>
              <div className="toggle-row">
                <span className="toggle-label">{privacyEnabled ? '已启用' : '已禁用'}</span>
                <button
                  className={`toggle-btn ${privacyEnabled ? 'active' : ''}`}
                  onClick={handlePrivacyToggle}
                >
                  <div className="toggle-knob" />
                </button>
                {privacyMsg && <span className="toggle-msg">{privacyMsg}</span>}
              </div>
            </div>

            <div className="settings-divider" />

            {/* v1.5.0: 预算设置 */}
            <div className="settings-section">
              <h3>💰 预算上限</h3>
              <p className="settings-desc">单次会话最大 API 成本（超出后自动降级）</p>
              <div className="budget-row">
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={maxCost}
                  onChange={(e) => setMaxCost(parseFloat(e.target.value))}
                  className="budget-slider"
                />
                <span className="budget-value">${maxCost.toFixed(1)}</span>
                <button className="btn-primary" onClick={handleSetBudget}>设置</button>
                {costMsg && <span className="budget-msg">{costMsg}</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="modal-body">
            <div className="test-form">
              <label>选择模型</label>
              <select value={testModel} onChange={(e) => { setTestModel(e.target.value); setTestResult(null) }}>
                <option value="deepseek-chat">deepseek-chat</option>
                <option value="deepseek-coder">deepseek-coder</option>
                <option value="deepseek-reasoner">deepseek-reasoner</option>
                <option value="deepseek-chat-v2">deepseek-chat-v2</option>
                <option value="deepseek-v2">deepseek-v2</option>
              </select>
              <button
                className="test-btn"
                onClick={handleTestConnectivity}
                disabled={testLoading}
              >
                {testLoading ? '测试中...' : '▶ 测试连通性'}
              </button>
            </div>
            {testResult === 'ok' && (
              <div className="test-result ok">✅ {testModel} 连通正常</div>
            )}
            {testResult === 'fail' && (
              <div className="test-result fail">❌ {testModel} 连接失败，请检查 API Key 或网络</div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onDismiss}>关闭</button>
          <button className="btn-primary" onClick={() => { fetchCost(); fetchModels() }}>🔄 刷新</button>
        </div>
      </div>
    </div>
  )
}
