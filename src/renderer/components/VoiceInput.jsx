import React, { useState, useRef } from 'react'

export default function VoiceInput({ onTranscribed }) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      chunks.current = []

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setTranscribing(true)

        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'recording.webm')

        try {
          const resp = await fetch('http://localhost:8000/api/transcribe', {
            method: 'POST',
            body: formData,
          })
          const data = await resp.json()
          if (data.text) {
            onTranscribed(data.text)
          } else if (data.note) {
            onTranscribed(`[语音转写未配置: ${data.note}]`)
          }
        } catch {
          onTranscribed('[语音转写服务未连接]')
        }
        setTranscribing(false)
      }

      mediaRecorder.current.start()
      setRecording(true)
    } catch {
      onTranscribed('[麦克风权限被拒绝]')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    setRecording(false)
  }

  return (
    <button
      className={`voice-input-btn ${recording ? 'recording' : ''} ${transcribing ? 'transcribing' : ''}`}
      onClick={recording ? stopRecording : startRecording}
      disabled={transcribing}
      title={recording ? '停止录音' : '语音输入'}
    >
      {recording ? '⏹' : transcribing ? '⏳' : '🎤'}
    </button>
  )
}
