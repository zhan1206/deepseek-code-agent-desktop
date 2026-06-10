import React from 'react'

const SEVERITY_COLORS = {
  HIGH: '#f85149',
  MEDIUM: '#d29922',
  LOW: '#58a6ff',
  INFO: '#8b949e',
}

export default function SecurityScanBanner({ scan, onDismiss }) {
  if (!scan || !scan.findings || scan.findings.length === 0) return null

  const hasHigh = scan.findings.some(f => f.severity === 'HIGH')

  return (
    <div className={`security-scan-banner ${hasHigh ? 'security-critical' : 'security-warning'}`}>
      <div className="security-scan-header">
        <span className="security-scan-icon">🛡️</span>
        <span className="security-scan-title">
          安全扫描发现 {scan.findings.length} 个问题
          {scan.blocked && <span className="security-blocked">· 写入已阻止</span>}
        </span>
        <button className="security-scan-dismiss" onClick={onDismiss}>✕</button>
      </div>
      <div className="security-scan-findings">
        {scan.findings.map((f, i) => (
          <div key={i} className="security-finding" style={{ borderLeftColor: SEVERITY_COLORS[f.severity] || '#607D8B' }}>
            <span className="security-finding-severity" style={{ color: SEVERITY_COLORS[f.severity] }}>
              {f.severity}
            </span>
            <span className="security-finding-rule">{f.rule}</span>
            <span className="security-finding-file">{f.file}:{f.line}</span>
            <span className="security-finding-desc">{f.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
