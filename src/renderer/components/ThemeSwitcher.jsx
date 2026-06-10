import React, { useState, useEffect } from 'react'
import { THEMES, applyTheme, getCurrentTheme } from '../themes'

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState(getCurrentTheme)

  const handleSelect = (id) => {
    applyTheme(id)
    setCurrent(id)
  }

  return (
    <div className="theme-switcher">
      {Object.entries(THEMES).map(([id, theme]) => (
        <button
          key={id}
          className={`theme-btn ${id === current ? 'active' : ''}`}
          onClick={() => handleSelect(id)}
          title={theme.name}
        >
          <span className="theme-swatch">
            {theme.type === 'dark' ? '🌙' : '☀️'}
          </span>
          <span className="theme-label">{theme.name}</span>
        </button>
      ))}
    </div>
  )
}
