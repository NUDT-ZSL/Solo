import { useState, useCallback } from 'react'
import ThemePanel from './ThemePanel'
import ComponentGrid from './ComponentGrid'
import ExportButton from './ExportButton'
import type { ThemeScheme, ComponentTemplate, ColorKey } from '../types'

const generateId = (): string => Math.random().toString(36).substring(2, 11)

const initialThemes: ThemeScheme[] = [
  {
    id: generateId(),
    name: '浅色模式',
    colors: {
      primary: '#4a90d9',
      secondary: '#6bb3f0',
      background: '#f0f0f0',
      text: '#333333',
    },
    collapsed: false,
  },
  {
    id: generateId(),
    name: '深色模式',
    colors: {
      primary: '#5c9be6',
      secondary: '#7fb4ef',
      background: '#1e1e1e',
      text: '#e0e0e0',
    },
    collapsed: false,
  },
]

function App() {
  const [themes, setThemes] = useState<ThemeScheme[]>(initialThemes)
  const [template, setTemplate] = useState<ComponentTemplate>('material')

  const handleColorChange = useCallback((themeId: string, colorKey: ColorKey, value: string) => {
    setThemes(prev =>
      prev.map(theme =>
        theme.id === themeId
          ? { ...theme, colors: { ...theme.colors, [colorKey]: value } }
          : theme
      )
    )
  }, [])

  const handleNameChange = useCallback((themeId: string, name: string) => {
    const trimmedName = name.slice(0, 8)
    setThemes(prev =>
      prev.map(theme =>
        theme.id === themeId ? { ...theme, name: trimmedName } : theme
      )
    )
  }, [])

  const handleToggleCollapse = useCallback((themeId: string) => {
    setThemes(prev =>
      prev.map(theme =>
        theme.id === themeId ? { ...theme, collapsed: !theme.collapsed } : theme
      )
    )
  }, [])

  const handleAddTheme = useCallback(() => {
    if (themes.length >= 6) return
    const newTheme: ThemeScheme = {
      id: generateId(),
      name: `主题${themes.length + 1}`,
      colors: {
        primary: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        secondary: '#999999',
        background: '#ffffff',
        text: '#333333',
      },
      collapsed: false,
    }
    setThemes(prev => [...prev, newTheme])
  }, [themes.length])

  const handleDeleteTheme = useCallback((themeId: string) => {
    if (themes.length <= 1) return
    setThemes(prev => prev.filter(theme => theme.id !== themeId))
  }, [themes.length])

  const getGridCols = (): string => {
    const count = themes.length
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-4'
    return 'grid-cols-2 grid-rows-3'
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">ThemeGrid</h1>
          <p className="app-subtitle">UI组件主题色实时切换与批量对比看板</p>
        </div>
        <div className="header-right">
          <div className="template-selector">
            <span className="template-label">组件模板：</span>
            <select
              value={template}
              onChange={e => setTemplate(e.target.value as ComponentTemplate)}
              className="template-select"
            >
              <option value="material">Material 风格</option>
              <option value="bootstrap">Bootstrap 风格</option>
            </select>
          </div>
          <ExportButton />
        </div>
      </header>

      <main className="app-main">
        <section className="grid-section">
          <ComponentGrid themes={themes} template={template} gridCols={getGridCols()} />
        </section>

        <aside className="panel-section">
          <div className="panel-header">
            <h2 className="panel-title">调色板</h2>
            <button
              className="add-theme-btn"
              onClick={handleAddTheme}
              disabled={themes.length >= 6}
            >
              + 添加主题
            </button>
          </div>
          <div className="themes-list">
            {themes.map(theme => (
              <ThemePanel
                key={theme.id}
                theme={theme}
                onColorChange={handleColorChange}
                onNameChange={handleNameChange}
                onToggleCollapse={handleToggleCollapse}
                onDelete={handleDeleteTheme}
                canDelete={themes.length > 1}
              />
            ))}
          </div>
          {themes.length >= 6 && (
            <p className="theme-limit-tip">最多支持6个主题方案同时对比</p>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
