import { useState, useEffect, useCallback } from 'react'
import { PaletteVersion } from './types'
import { getVersions } from './api'
import { useTheme } from './hooks/useTheme'
import ColorPalette from './components/ColorPalette'
import VersionList from './components/VersionList'
import VersionCompare from './components/VersionCompare'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [versions, setVersions] = useState<PaletteVersion[]>([])
  const [baselineId, setBaselineId] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchVersions = useCallback(async () => {
    try {
      const data = await getVersions()
      setVersions(data.versions)
      setBaselineId(data.baselineId)
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }, [])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleVersionCreated = (version: PaletteVersion) => {
    setVersions(prev => [version, ...prev])
  }

  const handleSelectVersion = (id: string) => {
    setSelectedVersionId(id)
  }

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="app-container">
      <div
        className={`sidebar-mobile-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={handleCloseSidebar}
      />

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">PaletteFlow</span>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <VersionList
          versions={versions}
          baselineId={baselineId}
          selectedId={selectedVersionId}
          onSelect={handleSelectVersion}
          onVersionsChange={fetchVersions}
        />
      </div>

      <div className="main-content">
        <div className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={handleToggleSidebar}>
              ☰
            </button>
            <h1 className="main-title">配色方案管理</h1>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.5 }}>
            {versions.length} 个版本
          </span>
        </div>

        <div className="main-body">
          <ColorPalette onVersionCreated={handleVersionCreated} />

          {versions.length >= 2 && (
            <VersionCompare
              versions={versions}
              baselineId={baselineId}
              selectedVersionId={selectedVersionId}
              onSelectVersion={handleSelectVersion}
            />
          )}
        </div>
      </div>
    </div>
  )
}
