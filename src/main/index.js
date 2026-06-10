/**
 * Electron 主进程
 * - Python 后端进程管理（启动/停止/状态监控）
 * - IPC 处理器（API Key 安全存储、目录选择、审批）
 * - 系统托盘
 * - 全局快捷键
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, Notification, dialog, safeStorage, shell } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')

// ── 状态 ────────────────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let backendProcess = null
let backendReady = false
let backendPort = 8000
let apiKey = ''

// ── 路径解析 ────────────────────────────────────────────────────────────────
const PYTHON = process.platform === 'win32'
  ? 'C:\\Users\\朱子瞻\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
  : 'python3'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 找后端入口（development 时指向 deepseek-code-agent/src）
const AGENT_ROOT = "C:\\Users\\朱子瞻\\.qclaw\\workspace\\deepseek-code-agent"
const backendRoot = isDev
  ? path.join(AGENT_ROOT, 'src', 'deepseek_agent')
  : path.join(process.resourcesPath, 'deepseek_agent')

const BACKEND_SERVER = path.join(backendRoot, 'server/app.py')

// ── API Key 安全存储 ────────────────────────────────────────────────────────
function loadApiKey() {
  try {
    const stored = process.env.DEEPSEEK_API_KEY || ''
    if (stored) { apiKey = stored; return true }
    // 尝试从文件解密（首次启动时文件不存在则返回空）
    const keyPath = path.join(app.getPath('userData'), 'api_key.enc')
    if (require('fs').existsSync(keyPath)) {
      const encrypted = require('fs').readFileSync(keyPath)
      if (safeStorage.isEncryptionAvailable()) {
        apiKey = safeStorage.decryptString(encrypted)
      }
    }
  } catch (e) { console.error('loadApiKey:', e.message) }
  return false
}

function saveApiKey(key) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key)
      require('fs').writeFileSync(path.join(app.getPath('userData'), 'api_key.enc'), encrypted)
    } else {
      process.env.DEEPSEEK_API_KEY = key
    }
    apiKey = key
    return true
  } catch (e) { console.error('saveApiKey:', e.message); return false }
}

// ── Python 后端管理 ──────────────────────────────────────────────────────────
function startBackend() {
  return new Promise((resolve) => {
    if (backendProcess) { resolve(true); return }

    const env = {
      ...process.env,
      DEEPSEEK_API_KEY: apiKey,
      PYTHONPATH: backendRoot,
      PYTHONIOENCODING: 'utf-8',
    }

    backendProcess = spawn(PYTHON, [BACKEND_SERVER], {
      cwd: backendRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      shell: false,
    })

    backendProcess.stdout.on('data', (d) => {
      const line = d.toString()
      if (!backendReady && (line.includes('Uvicorn running') || line.includes('Application startup complete') || line.includes('8000'))) {
        backendReady = true
        console.log('[Backend] ready')
        if (mainWindow) mainWindow.webContents.send('backend:status', { ready: true })
        resolve(true)
      }
      if (process.env.DEBUG) process.stdout.write('[py] ' + line)
    })

    backendProcess.stderr.on('data', (d) => {
      if (process.env.DEBUG) process.stderr.write('[py:err] ' + d.toString())
    })

    backendProcess.on('exit', (code) => {
      console.log('[Backend] exited with code', code)
      backendReady = false
      backendProcess = null
      if (mainWindow) mainWindow.webContents.send('backend:status', { ready: false, code })
    })

    // 轮询健康检查（最多 15 秒）
    let attempts = 0
    const checkInterval = setInterval(async () => {
      attempts++
      if (backendReady) { clearInterval(checkInterval); return }
      if (attempts > 15) {
        clearInterval(checkInterval)
        console.error('[Backend] failed to start after 15s')
        if (mainWindow) mainWindow.webContents.send('backend:status', { ready: false, error: '启动超时' })
        resolve(false)
        return
      }
      // 尝试 HTTP 检查
      try {
        const http = require('http')
        http.get(`http://localhost:${backendPort}/health`, (r) => {
          if (r.statusCode === 200) {
            backendReady = true
            clearInterval(checkInterval)
            if (mainWindow) mainWindow.webContents.send('backend:status', { ready: true })
            resolve(true)
          }
        }).on('error', () => {})
      } catch {}
    }, 1000)
  })
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
    backendReady = false
  }
}

// ── 窗口创建 ────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'DeepSeek Code Agent',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // 加载渲染页面
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (tray) { e.preventDefault(); mainWindow.hide() }
  })

  mainWindow.on('closed', () => { mainWindow = null })

  return mainWindow
}

// ── 系统托盘 ────────────────────────────────────────────────────────────────
function createTray() {
  // 生成简单 tray 图标（16x16 PNG base64）
  const { nativeImage } = require('electron')
  // 1×1 透明 PNG
  const iconData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkYGD4z0ABYBxVMoYBMAIjAwAw+gL/ABTRCQE='
    + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8GqPhQAAAABJRU5ErkJggg==',
    'base64'
  )
  tray = new Tray(nativeImage.createFromBuffer(iconData))

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示窗口', click: () => mainWindow && mainWindow.show() },
    { label: '后台状态', enabled: false, label: `后端: ${backendReady ? '运行中' : '未启动'}` },
    { type: 'separator' },
    { label: '退出', click: () => { tray = null; app.quit() } },
  ])

  tray.setToolTip('DeepSeek Code Agent')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow && mainWindow.show())
}

// ── IPC 处理器 ───────────────────────────────────────────────────────────────
function setupIpc() {
  // 配置
  ipcMain.handle('config:get', () => ({
    apiKey: apiKey ? '***' + apiKey.slice(-4) : '',
    backendReady,
    port: backendPort,
    dev: isDev,
  }))

  ipcMain.handle('config:setApiKey', async (_, key) => {
    const ok = saveApiKey(key)
    if (ok) {
      stopBackend()
      await startBackend()
    }
    return ok
  })

  // 目录选择
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择项目目录',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 后端状态
  ipcMain.handle('backend:start', async () => {
    const ok = await startBackend()
    return ok
  })
  ipcMain.handle('backend:stop', () => { stopBackend(); return true })
  ipcMain.handle('backend:status', () => ({ ready: backendReady, port: backendPort }))

  // 审批（由渲染进程转发）
  ipcMain.handle('approval:respond', async (_, { approvalId, approved, modifiedArgs }) => {
    // 转发给主窗口（审批弹窗）
    if (mainWindow) mainWindow.webContents.send('approval:response', { approvalId, approved, modifiedArgs })
    return true
  })

  // Shell 命令（渲染进程通过主进程执行，避免直接暴露 child_process）
  ipcMain.handle('shell:run', async (_, { command, cwd }) => {
    return new Promise((resolve) => {
      try {
        const r = execSync(command, {
          cwd: cwd || undefined,
          encoding: 'utf-8',
          timeout: 30000,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        resolve({ stdout: r.stdout || r, stderr: r.stderr || '' })
      } catch (e) {
        resolve({ stdout: e.stdout || '', stderr: e.stderr || e.message })
      }
    })
  })

  // 通知
  ipcMain.handle('notification:show', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: undefined }).show()
    }
    return true
  })

  // 打开外部链接
  ipcMain.handle('shell:openExternal', (_, url) => {
    shell.openExternal(url)
    return true
  })
}

// ── 全局快捷键 ───────────────────────────────────────────────────────────────
function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) mainWindow.hide()
      else { mainWindow.show(); mainWindow.focus() }
    }
  })
}

// ── 应用生命周期 ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  loadApiKey()
  setupIpc()
  createWindow()
  createTray()
  registerShortcuts()
  await startBackend()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend()
    app.quit()
  }
})

app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopBackend()
})
