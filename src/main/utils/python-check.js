const { execSync } = require('child_process')
const logger = require('./logger')

class PythonEnvironmentChecker {
  constructor(pythonPath) {
    this.pythonPath = pythonPath
  }

  checkVersion() {
    try {
      const output = execSync(`"${this.pythonPath}" --version`, { encoding: 'utf-8', timeout: 10000 })
      const match = output.match(/Python (\d+)\.(\d+)\.(\d+)/)
      if (!match) return { ok: false, message: '无法解析 Python 版本' }
      const major = parseInt(match[1]), minor = parseInt(match[2])
      if (major < 3 || (major === 3 && minor < 9)) {
        return { ok: false, message: `需要 Python 3.9+，当前 ${match[1]}.${match[2]}.${match[3]}` }
      }
      return { ok: true, version: match[1] + '.' + match[2] + '.' + match[3] }
    } catch (e) {
      return { ok: false, message: `Python 检查失败: ${e.message}` }
    }
  }

  checkPackages() {
    const required = ['fastapi', 'uvicorn', 'pydantic', 'websockets']
    const missing = []
    for (const pkg of required) {
      try {
        execSync(`"${this.pythonPath}" -c "import ${pkg}"`, { stdio: 'ignore', timeout: 5000 })
      } catch {
        missing.push(pkg)
      }
    }
    return {
      ok: missing.length === 0,
      missing,
      message: missing.length > 0 ? `缺少依赖: ${missing.join(', ')}` : '所有依赖已安装',
    }
  }

  autoRepair() {
    const check = this.checkPackages()
    if (check.ok) return { ok: true }
    logger.info('python', '尝试安装缺失的包: ' + check.missing.join(', '))
    try {
      execSync(`"${this.pythonPath}" -m pip install ${check.missing.join(' ')}`, { timeout: 120000, stdio: 'pipe' })
      logger.info('python', '依赖安装成功')
      return { ok: true, installed: check.missing }
    } catch (e) {
      return { ok: false, message: `包安装失败，请手动运行: pip install ${check.missing.join(' ')}` }
    }
  }
}

module.exports = PythonEnvironmentChecker
