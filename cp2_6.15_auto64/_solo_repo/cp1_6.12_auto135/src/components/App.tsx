/**
 * ============================================================
 *  App.tsx - 应用主组件 / Root Container
 * ============================================================
 *
 * 【职责】
 *    - 应用级全局状态管理：主题方案列表(themes)、当前组件模板(template)
 *    - 聚合并编排子组件：ThemePanel、ComponentGrid、ExportButton
 *    - 事件总线：将调色板产生的颜色变更分发给看板
 *
 * 【被调用位置】
 *    - src/main.tsx → ReactDOM.createRoot().render(<App />)
 *
 * 【向下调用子组件】
 *    - <ComponentGrid themes={themes} template={template} />  :  左侧组件看板
 *    - <ThemePanel theme={theme} onColorChange={...} />      :  右侧调色板（渲染N份）
 *    - <ExportButton />                                       :  顶部导出按钮
 *
 * 【数据流向】
 *    用户交互
 *       ↓
 *    ThemePanel 触发 onColorChange / onNameChange / onToggleCollapse / onDelete
 *       ↓
 *    App.setState 更新 themes 数组（不可变更新，触发 React 重渲染）
 *       ↓
 *    新 themes 通过 props 传入 ComponentGrid → 各子组件 useMemo 计算样式
 *       ↓
 *    DOM 以 60FPS 流畅刷新
 *
 * 【删除主题动画流程】
 *    handleDeleteTheme(themeId)
 *       → 设置 themes[i].deleting = true（触发 CSS .deleting 类）
 *       → 等待 200ms (ease-out)
 *       → 真正从数组中 splice 掉该条目
 * ============================================================
 */
import { useState, useCallback, useMemo } from 'react'
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

  const handleColorChange = useCallback(
    (themeId: string, colorKey: ColorKey, value: string) => {
      setThemes(prev =>
        prev.map(theme =>
          theme.id === themeId
            ? { ...theme, colors: { ...theme.colors, [colorKey]: value } }
            : theme
        )
      )
    },
    []
  )

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
    setThemes(prev => {
      if (prev.length >= 6) return prev
      const newTheme: ThemeScheme = {
        id: generateId(),
        name: `主题${prev.length + 1}`,
        colors: {
          primary: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
          secondary: '#999999',
          background: '#ffffff',
          text: '#333333',
        },
        collapsed: false,
      }
      return [...prev, newTheme]
    })
  }, [])

  const handleRequestDeleteTheme = useCallback((themeId: string) => {
    setThemes(prev => {
      if (prev.length <= 1) return prev
      return prev.map(t =>
        t.id === themeId ? { ...t, deleting: true } : t
      ) as ThemeScheme[]
    })
    window.setTimeout(() => {
      setThemes(prev => prev.filter(t => t.id !== themeId))
    }, 200)
  }, [])

  const gridClass = useMemo(() => {
    const count = themes.length
    if (count <= 2) return 'cols-2'
    if (count <= 4) return 'cols-4'
    return 'cols-2-rows-3'
  }, [themes.length])

  const canAdd = themes.length < 6

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
          <ComponentGrid themes={themes} template={template} gridCols={gridClass} />
        </section>

        <aside className="panel-section">
          <div className="panel-header">
            <h2 className="panel-title">调色板</h2>
            <button
              className="add-theme-btn"
              onClick={handleAddTheme}
              disabled={!canAdd}
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
                onDelete={handleRequestDeleteTheme}
                canDelete={themes.length > 1}
              />
            ))}
          </div>
          {!canAdd && (
            <p className="theme-limit-tip">最多支持6个主题方案同时对比</p>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
