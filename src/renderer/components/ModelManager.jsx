import React, { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function ModelManager({ onDismiss }) {
  const { apiKey } = useStore()
  const [models, setModels] = useState([])
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'test'
  const [testModel, setTestModel] = useState('deepseek-chat')
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'fail'
  const [testLoading, setTestLoading] = useState(false)
  const [costData, setCostData] = useState(null)

  useEffect(() => {
    fetchModels()
    fetchCost()
  }, [])

  const fetchModels = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/models')
      if (resp.ok) {
        const data = await resp.json()
        setModels(data.models || [])
      }
    } catch {}
  }

  const fetchCost = async () => {
    try {
      const resp = await fetch('http://localhost:8000/api/cost')
      if (resp.ok) {
        const data = await resp.json()
        setCostData(data)
      }
    } catch {}
  }

  const handleTestConnectivity = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const resp = await fetch('http://localhost:8000/api/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testModel }),
      })
      const data = await resp.json()
      setTestResult(data.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTestLoading(false)
    }
  }

  const formatCost = (cost) => {
    if (!cost) return '$0.00'
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
            模型列表
          </button>
          <button className={activeTab === 'test' ? 'active' : ''} onClick={() => setActiveTab('test')}>
            连通测试
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
          <button className="btn-primary" onClick={fetchCost}>🔄 刷新成本</button>
        </div>
      </div>
    </div>
  )
}
