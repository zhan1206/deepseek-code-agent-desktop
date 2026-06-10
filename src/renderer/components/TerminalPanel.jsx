import React, { useRef, useEffect, useState } from 'react'
import { useStore } from '../store'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export default function TerminalPanel() {
  const { terminalOutput, showTerminal, clearTerminal, toggleTerminal } = useStore()
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const inputBuf = useRef('')

  // 动态获取侧栏宽度并更新 CSS 变量
  useEffect(() => {
    const updateLeft = () => {
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        const w = sidebar.offsetWidth
        document.documentElement.style.setProperty('--terminal-left', w + 'px')
      }
    }
    updateLeft()
    window.addEventListener('resize', updateLeft)
    // 监听 sidebar 折叠变化（通过 MutationObserver）
    const mo = new MutationObserver(updateLeft)
    const sidebar = document.querySelector('.sidebar')
    if (sidebar) mo.observe(sidebar, { attributes: true, attributeFilter: ['class'] })
    return () => { window.removeEventListener('resize', updateLeft); mo.disconnect() }
  }, [])

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      theme: {
        background: '#1e1e1e', foreground: '#d4d4d4',
        cursor: '#cccccc', cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#000000', red: '#f44747', green: '#608b4e',
        yellow: '#dcdcaa', blue: '#569cd6',
        magenta: '#c586c0', cyan: '#4ec9b0', white: '#d4d4d4',
        brightBlack: '#808080', brightRed: '#f44747',
        brightGreen: '#4ec9b0', brightYellow: '#dcdcaa',
        brightBlue: '#569cd6', brightMagenta: '#c586c0',
        brightCyan: '#9cdcfe', brightWhite: '#ffffff',
      },
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13, lineHeight: 1.4,
      cursorBlink: true, cursorStyle: 'bar',
      scrollback: 500, convertEol: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term
    fitRef.current = fitAddon

    term.writeln('\x1b[36mDeepSeek Code Agent — 终端\x1b[0m')
    term.writeln('Commands: help | status | session | clear\x1b[0m')
    term.writeln('')
    term.write('$ ')

    const ro = new ResizeObserver(() => { try { fitAddon.fit() } catch {} })
    if (containerRef.current) ro.observe(containerRef.current)

    return () => { ro.disconnect(); term.dispose(); termRef.current = null }
  }, [])

  useEffect(() => {
    if (!termRef.current || terminalOutput.length === 0) return
    const term = termRef.current
    for (const line of terminalOutput) {
      if (line.startsWith('[err]')) term.writeln('\x1b[31m' + line + '\x1b[0m')
      else if (line.startsWith('[ok]')) term.writeln('\x1b[32m' + line + '\x1b[0m')
      else term.writeln(line)
    }
  }, [terminalOutput])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    const handleData = (data) => {
      if (data === '\r') {
        const cmd = inputBuf.current.trim()
        term.writeln('')
        if (cmd) runBuiltin(cmd)
        inputBuf.current = ''
        term.write('$ ')
      } else if (data === '\x7f') {
        if (inputBuf.current.length > 0) {
          inputBuf.current = inputBuf.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data === '\x03') {
        term.write('^C\r\n$ ')
        inputBuf.current = ''
      } else if (data >= ' ' || data === '\t') {
        inputBuf.current += data
        term.write(data)
      }
    }
    term.onData(handleData)
    return () => term.offData(handleData)
  }, [])

  const runBuiltin = (cmd) => {
    const term = termRef.current
    const s = useStore.getState()
    switch (cmd) {
      case 'clear': case 'cls':
        term.clear(); clearTerminal(); break
      case 'status':
        term.writeln(`Backend: ${s.backendReady ? '\x1b[32m在线\x1b[0m' : '\x1b[31m离线\x1b[0m'}`)
        term.writeln(`Session: ${s.sessionId || '(无)'} \x1b[90m|\x1b[0m WS: ${s.wsConnected ? '\x1b[32m已连接\x1b[0m' : '\x1b[31m未连接\x1b[0m'}`)
        break
      case 'session':
        term.writeln(`Session ID: ${s.sessionId || '(无)'}`)
        term.writeln(`Project:   ${s.projectPath || '(全局)'}`)
        break
      case 'help':
        term.writeln('\x1b[1mAvailable commands:\x1b[0m')
        term.writeln('  help      — show this message')
        term.writeln('  status    — backend and session status')
        term.writeln('  session   — show session info')
        term.writeln('  clear     — clear terminal output')
        term.writeln('  <any>     — run as shell command')
        break
      default:
        if (window.electronAPI) {
          window.electronAPI.runShell(cmd, s.projectPath || undefined)
            .then(({ stdout, stderr }) => {
              if (stdout) term.writeln(stdout)
              if (stderr) term.writeln('\x1b[31m' + stderr + '\x1b[0m')
            })
            .catch(e => term.writeln('\x1b[31mError: ' + e.message + '\x1b[0m'))
        } else {
          term.writeln('\x1b[33mshell not available in browser mode\x1b[0m')
        }
    }
  }

  if (!showTerminal) return null

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">🖥 终端</span>
        <div className="terminal-tabs">
          <button className="terminal-tab active">Shell</button>
        </div>
        <div className="terminal-header-actions">
          <button className="terminal-btn" onClick={() => { termRef.current?.clear(); clearTerminal() }}>清除</button>
          <button className="terminal-btn terminal-close" onClick={toggleTerminal}>✕</button>
        </div>
      </div>
      <div className="terminal-body" ref={containerRef} />
    </div>
  )
}
