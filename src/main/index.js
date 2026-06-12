/**
 * Electron 主进程
 * - Python 后端进程管理（启动/停止/状态监控）
 * - IPC 处理器（API Key 安全存储、目录选择、审批）
 * - 系统托盘
 * - 全局快捷键
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, Notification, dialog, safeStorage, shell } = require('electron')
const path = require('path')
const { spawn, execFile } = require('child_process')
const fs = require('fs')
const logger = require('./utils/logger')
const safeShell = require('./utils/safe-shell')
const PythonChecker = require('./utils/python-check')

// ── 状态 ────────────────────────────────────────────────────────────────────
let mainWindow = null
let tray = null
let backendProcess = null
let backendReady = false
let backendPort = 8000
let apiKey = ''

// ── 路径解析（环境变量优先） ────────────────────────────────────────────────
const PYTHON = process.env.DEEPSEEK_PYTHON_PATH ||
  (process.platform === 'win32' ? 'python.exe' : 'python3')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 后端路径：环境变量 > 开发默认 > 打包资源
function resolveBackendRoot() {
  if (process.env.DEEPSEEK_AGENT_ROOT) {
    return path.resolve(process.env.DEEPSEEK_AGENT_ROOT)
  }
  if (isDev) {
    const devPath = path.join(__dirname, '..', '..', '..', 'deepseek-code-agent', 'src', 'deepseek_agent')
    if (fs.existsSync(devPath + path.sep + 'server') || fs.existsSync(devPath + '/server')) {
      return devPath
    }
    // fallback 到环境变量指定的开发路径
    return devPath
  }
  return path.join(process.resourcesPath, 'deepseek_agent')
}

const backendRoot = resolveBackendRoot()
const BACKEND_SERVER = path.join(backendRoot, 'server', 'app.py')

logger.info('app', `Python: ${PYTHON}, Backend: ${BACKEND_SERVER}, Dev: ${isDev}`)

// ── API Key 安全存储 ────────────────────────────────────────────────────────
function loadApiKey() {
  try {
    const stored = process.env.DEEPSEEK_API_KEY || ''
    if (stored) { apiKey = stored; logger.info('app', 'API Key loaded from env'); return true }
    const keyPath = path.join(app.getPath('userData'), 'api_key.enc')
    if (fs.existsSync(keyPath)) {
      const encrypted = fs.readFileSync(keyPath)
      if (safeStorage.isEncryptionAvailable()) {
        apiKey = safeStorage.decryptString(encrypted)
        logger.info('app', 'API Key loaded from encrypted storage')
      }
    }
  } catch (e) { logger.error('app', 'loadApiKey failed', e) }
  return false
}

function saveApiKey(key) {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key)
      fs.writeFileSync(path.join(app.getPath('userData'), 'api_key.enc'), encrypted)
    } else {
      process.env.DEEPSEEK_API_KEY = key
    }
    apiKey = key
    logger.info('app', 'API Key saved')
    return true
  } catch (e) { logger.error('app', 'saveApiKey failed', e); return false }
}

// ── Python 后端管理 ──────────────────────────────────────────────────────────
function startBackend() {
  return new Promise((resolve) => {
    const url = 'http://127.0.0.1:' + backendPort + '/health'
    const http = require('http')
    http.get(url, (r) => {
      if (r.statusCode === 200) {
        backendReady = true
        logger.info('backend', 'Connected to backend')
        if (mainWindow) mainWindow.webContents.send('backend:status', { ready: true })
        resolve(true)
      } else {
        logger.error('backend', 'Backend not ready (status ' + r.statusCode + ')')
        if (mainWindow) mainWindow.webContents.send('backend:status', { ready: false, error: '后端未就绪' })
        resolve(false)
      }
    }).on('error', (err) => {
      logger.error('backend', 'Backend not running: ' + err.message)
      if (mainWindow) mainWindow.webContents.send('backend:status', { ready: false, error: '后端未启动，请先手动启动后端' })
      resolve(false)
    })
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

  // Shell 命令（通过安全执行器，白名单 + execFile，避免 shell 注入）
  ipcMain.handle('shell:run', async (_, { command, cwd }) => {
    try {
      const result = await safeShell.execute(command, cwd || undefined)
      return { stdout: result.stdout, stderr: result.stderr, success: true }
    } catch (e) {
      logger.warn('shell', `Command rejected: ${command}`)
      return {
        stdout: e.stdout || '',
        stderr: e.stderr || e.message,
        success: false,
        error: e.message
      }
    }
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

  // 启动前检查 Python 环境
  const checker = new PythonChecker(PYTHON)
  const versionCheck = checker.checkVersion()
  if (!versionCheck.ok) {
    logger.error('app', versionCheck.message)
    dialog.showErrorBox('Python 环境错误', versionCheck.message + '\n请设置 DEEPSEEK_PYTHON_PATH 环境变量指向 Python 3.9+ 可执行文件')
    app.quit()
    return
  }
  const pkgCheck = checker.checkPackages()
  if (!pkgCheck.ok) {
    logger.warn('app', pkgCheck.message)
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      message: pkgCheck.message,
      buttons: ['自动修复', '手动安装', '忽略并继续'],
      defaultId: 0,
    })
    if (choice === 0) {
      const repair = checker.autoRepair()
      if (!repair.ok) {
        dialog.showErrorBox('修复失败', repair.message)
      }
    }
  }

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
