/**
 * 主题系统 — CSS 变量驱动，支持用户自定义覆盖
 * 内置 3 款主题：DeepSeek 紫（默认）、Monokai 暗色、Solarized 浅色
 */

const THEMES = {
  'deepseek-purple': {
    name: 'DeepSeek 紫',
    type: 'dark',
    vars: {
      '--bg-primary': '#0d0d1a',
      '--bg-secondary': '#151528',
      '--bg-tertiary': '#1e1e3a',
      '--bg-hover': '#252545',
      '--text-primary': '#e8e8f0',
      '--text-secondary': '#a8a8c0',
      '--text-muted': '#6a6a88',
      '--accent': '#7c3aed',
      '--accent-hover': '#9f67ff',
      '--accent-subtle': 'rgba(124, 58, 237, 0.15)',
      '--green': '#10b981',
      '--red': '#ef4444',
      '--yellow': '#f59e0b',
      '--border': '#2a2a4a',
      '--shadow': '0 4px 24px rgba(0, 0, 0, 0.5)',
      '--radius': '8px',
      '--font-mono': '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      '--font-ui': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  },
  'monokai-dark': {
    name: 'Monokai 暗色',
    type: 'dark',
    vars: {
      '--bg-primary': '#1e1e2e',
      '--bg-secondary': '#252536',
      '--bg-tertiary': '#2d2d44',
      '--bg-hover': '#363654',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#b8b8c8',
      '--text-muted': '#75758a',
      '--accent': '#f92672',
      '--accent-hover': '#ff4d94',
      '--accent-subtle': 'rgba(249, 38, 114, 0.15)',
      '--green': '#a6e22e',
      '--red': '#f92672',
      '--yellow': '#e6db74',
      '--border': '#3a3a52',
      '--shadow': '0 4px 24px rgba(0, 0, 0, 0.6)',
      '--radius': '6px',
      '--font-mono': '"Fira Code", "JetBrains Mono", monospace',
      '--font-ui': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  },
  'solarized-light': {
    name: 'Solarized 浅色',
    type: 'light',
    vars: {
      '--bg-primary': '#fdf6e3',
      '--bg-secondary': '#eee8d5',
      '--bg-tertiary': '#e8e0cc',
      '--bg-hover': '#ddd6c2',
      '--text-primary': '#073642',
      '--text-secondary': '#586e75',
      '--text-muted': '#93a1a1',
      '--accent': '#268bd2',
      '--accent-hover': '#2aa198',
      '--accent-subtle': 'rgba(38, 139, 210, 0.12)',
      '--green': '#859900',
      '--red': '#dc322f',
      '--yellow': '#b58900',
      '--border': '#d3c9b4',
      '--shadow': '0 4px 24px rgba(0, 0, 0, 0.1)',
      '--radius': '8px',
      '--font-mono': '"Fira Code", "JetBrains Mono", monospace',
      '--font-ui': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  }
}

/**
 * 应用主题到 document.documentElement CSS 变量
 */
export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES['deepseek-purple']
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', themeId)
  try { localStorage.setItem('dsca_theme', themeId) } catch {}
  return theme
}

/**
 * 获取当前主题 ID
 */
export function getCurrentTheme() {
  try {
    return localStorage.getItem('dsca_theme') || 'deepseek-purple'
  } catch {
    return 'deepseek-purple'
  }
}

/**
 * 初始化主题（启动时调用）
 */
export function initTheme() {
  applyTheme(getCurrentTheme())
}

export { THEMES }
