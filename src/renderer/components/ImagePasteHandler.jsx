import React, { useState, useCallback } from 'react'

export default function ImagePasteHandler({ children, onImage }) {
  const [preview, setPreview] = useState(null)
  const [sending, setSending] = useState(false)

  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        // 显示预览
        const url = URL.createObjectURL(file)
        setPreview(url)

        // 发送分析请求
        setSending(true)
        const formData = new FormData()
        formData.append('image', file)

        try {
          const resp = await fetch('http://localhost:8000/api/analyze-image', {
            method: 'POST',
            body: formData,
          })
          const data = await resp.json()
          if (data.description) {
            onImage(data.description, file.name)
          } else if (data.note) {
            onImage(`[图片分析未配置: ${data.note}]`, file.name)
          }
        } catch {
          onImage('[图片分析服务未连接]', file.name)
        }
        setSending(false)
        setTimeout(() => { setPreview(null); URL.revokeObjectURL(url) }, 3000)
        break
      }
    }
  }, [onImage])

  return (
    <div onPaste={handlePaste}>
      {children}
      {preview && (
        <div className="image-paste-preview">
          <img src={preview} alt="pasted" />
          {sending && <span className="image-paste-status">分析中...</span>}
        </div>
      )}
    </div>
  )
}
