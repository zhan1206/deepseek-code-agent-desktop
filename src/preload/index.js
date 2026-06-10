/**
 * Preload — 安全的 IPC bridge
 * 暴露给渲染进程的安全 API，不暴露 Node.js/Electron 内部
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置
  getConfig: () => ipcRenderer.invoke('config:get'),
  setApiKey: (key) => ipcRenderer.invoke('config:setApiKey', key),

  // 目录
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // 后端
  startBackend: () => ipcRenderer.invoke('backend:start'),
  stopBackend: () => ipcRenderer.invoke('backend:stop'),
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),

  // 监听后端状态变化
  onBackendStatus: (fn) => {
    ipcRenderer.on('backend:status', (_, data) => fn(data))
  },

  // 审批
  sendApprovalResponse: (approvalId, approved, modifiedArgs) =>
    ipcRenderer.invoke('approval:respond', { approvalId, approved, modifiedArgs }),

  // 审批请求（从主进程推送，触发审批弹窗）
  onApprovalRequest: (fn) => {
    ipcRenderer.on('approval:request', (_, data) => fn(data))
  },

  // Shell
  runShell: (command, cwd) => ipcRenderer.invoke('shell:run', { command, cwd }),

  // 通知
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', { title, body }),

  // 外部链接
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
})
