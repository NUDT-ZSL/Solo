import { useEffect, useState } from 'react'
import { useStore } from './store'
import { presets, defaultPreset } from './presets'
import { PropertyPanel } from './components/PropertyPanel'
import { PreviewCanvas } from './components/PreviewCanvas'
import { CodeExportModal } from './components/CodeExportModal'
import { ThemeToggle } from './components/ThemeToggle'
import type { Preset } from './store'

function App() {
  const { loadPreset, resetLayout, setShowCodeModal } = useStore()
  const [showPresetMenu, setShowPresetMenu] = useState(false)

  useEffect(() => {
    loadPreset(defaultPreset)
  }, [loadPreset])

  const handlePresetClick = (preset: Preset) => {
    loadPreset(preset)
    setShowPresetMenu(false)
  }

  const buttonBaseStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        transition: 'background-color 0.5s ease, color 0.5s ease'
      }}
    >
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.5s ease'
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
          CSS布局可视化沙盒
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          拖拽方块调整顺序 · 点击方块编辑属性
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside
          style={{
            width: '35%',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-color)',
            transition: 'border-color 0.5s ease'
          }}
        >
          <PropertyPanel />

          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '10px',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'var(--panel-bg)',
              transition: 'all 0.5s ease',
              zIndex: 10
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="ripple-btn"
                style={{
                  ...buttonBaseStyle,
                  width: '100%',
                  backgroundColor: 'var(--accent)',
                  color: 'white'
                }}
              >
                预设模板
              </button>

              {showPresetMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    zIndex: 100
                  }}
                >
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetClick(preset)}
                      className="ripple-btn"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--button-inactive-bg)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: preset.layoutType === 'flex' ? '#448AFF' : '#69F0AE'
                        }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={resetLayout}
              className="ripple-btn"
              style={{
                ...buttonBaseStyle,
                backgroundColor: 'var(--button-inactive-bg)',
                color: 'var(--button-inactive-text)'
              }}
            >
              重置
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              className="ripple-btn"
              style={{
                ...buttonBaseStyle,
                backgroundColor: 'var(--button-inactive-bg)',
                color: 'var(--button-inactive-text)'
              }}
            >
              导出代码
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, position: 'relative' }}>
          <PreviewCanvas />
        </main>
      </div>

      <ThemeToggle />
      <CodeExportModal />

      {showPresetMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50
          }}
          onClick={() => setShowPresetMenu(false)}
        />
      )}
    </div>
  )
}

export default App
