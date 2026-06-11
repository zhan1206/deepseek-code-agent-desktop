const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const { execSync } = require('child_process')

class Logger {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs')
    this.ensureLogDir()
    this.logFile = path.join(this.logDir, `dsca-${new Date().toISOString().split('T')[0]}.log`)
    this._debug = !!process.env.DEBUG
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  log(level, module, message, error = null) {
    const timestamp = new Date().toISOString()
    let logEntry = `[${timestamp}] [${level}] [${module}] ${message}`
    if (error) {
      logEntry += `\n  Error: ${error.message}\n  Stack: ${error.stack || '(no stack)'}`
    }
    console.log(logEntry)
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n')
    } catch (e) {
      console.error('日志写入失败:', e.message)
    }
  }

  info(module, message) { this.log('INFO', module, message) }
  warn(module, message) { this.log('WARN', module, message) }
  error(module, message, error) { this.log('ERROR', module, message, error) }
  debug(module, message) { if (this._debug) this.log('DEBUG', module, message) }
}

module.exports = new Logger()
