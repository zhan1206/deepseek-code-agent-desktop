const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const logger = require('./logger')

class SafeShellExecutor {
  constructor() {
    this.WHITELIST = new Set([
      'ls', 'cat', 'grep', 'find', 'pwd', 'cd', 'echo',
      'npm', 'yarn', 'python', 'python3', 'node',
      'git', 'mkdir', 'cp', 'mv', 'rm', 'touch', 'chmod',
      'pip', 'pip3', 'npx',
      'dir', 'type', 'where', 'where.exe',
    ])
    this.MAX_OUTPUT = 10 * 1024 * 1024
    this.TIMEOUT = 30000
  }

  async execute(command, cwd = '.') {
    const parts = command.trim().split(/\s+/)
    if (parts.length === 0) throw new Error('Empty command')

    const baseCmd = path.basename(parts[0]).toLowerCase()

    // 检查白名单（Windows 上兼容 .exe 后缀）
    if (!this.WHITELIST.has(baseCmd) && !this.WHITELIST.has(baseCmd.replace('.exe', ''))) {
      throw new Error(`命令 '${baseCmd}' 不在安全白名单中`)
    }

    // 验证工作目录
    const normalizedCwd = path.resolve(cwd)
    if (!fs.existsSync(normalizedCwd)) {
      throw new Error(`目录不存在: ${cwd}`)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`命令超时 (${this.TIMEOUT}ms)`))
      }, this.TIMEOUT)

      const child = execFile(
        parts[0],
        parts.slice(1),
        { cwd: normalizedCwd, maxBuffer: this.MAX_OUTPUT, timeout: this.TIMEOUT, windowsHide: true },
        (error, stdout, stderr) => {
          clearTimeout(timeout)
          if (error) {
            reject({ code: error.code, stdout, stderr: stderr || error.message, message: error.message })
          } else {
            resolve({ stdout, stderr })
          }
        }
      )
    })
  }
}

module.exports = new SafeShellExecutor()
