import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import Scene from './components/Scene'
import type { SoundSource } from './components/Scene'
import ControlPanel from './components/ControlPanel'

interface SavedConfig {
  _id: string
  name: string
  createdAt: string
  sources: SoundSource[]
}

export default function App() {
  const [sources, setSources] = useState<SoundSource[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([])
  const [configName, setConfigName] = useState('')
  const [showConfigs, setShowConfigs] = useState(false)

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await axios.get('/api/configs')
      setSavedConfigs(res.data)
    } catch (err) {
      console.error('Failed to fetch configs:', err)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleAddSource = useCallback((position: { x: number; y: number; z: number }) => {
    setSources((prev) => {
      if (prev.length >= 50) return prev
      const newSource: SoundSource = {
        id: crypto.randomUUID(),
        position,
        color: '#f59e0b',
        volume: 0.8,
      }
      return [...prev, newSource]
    })
  }, [])

  const handleMoveSource = useCallback((id: string, position: { x: number; y: number; z: number }) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, position } : s))
    )
  }, [])

  const handleDeleteSource = useCallback((id: string) => {
    setDeletingIds((prev) => [...prev, id])
  }, [])

  const handleRemoveSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
    setDeletingIds((prev) => prev.filter((d) => d !== id))
  }, [])

  const handleSaveConfig = useCallback(async () => {
    const name = configName.trim() || `Config ${savedConfigs.length + 1}`
    try {
      await axios.post('/api/configs', {
        name,
        sources: sources.map((s) => ({
          id: s.id,
          position: s.position,
          color: s.color,
          volume: s.volume,
        })),
      })
      setConfigName('')
      fetchConfigs()
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }, [configName, sources, savedConfigs.length, fetchConfigs])

  const handleLoadConfig = useCallback((config: SavedConfig) => {
    setSources(config.sources)
    setShowConfigs(false)
  }, [])

  const handleDeleteConfig = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/configs/${id}`)
      fetchConfigs()
    } catch (err) {
      console.error('Failed to delete config:', err)
    }
  }, [fetchConfigs])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Scene
        sources={sources}
        onAddSource={handleAddSource}
        onMoveSource={handleMoveSource}
        onRemoveSource={handleRemoveSource}
        deletingIds={deletingIds}
      />

      <ControlPanel
        sources={sources}
        deletingIds={deletingIds}
        onDeleteSource={handleDeleteSource}
      />

      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#e2e8f0',
          letterSpacing: '0.05em',
          margin: 0,
        }}>
          SoundScape
        </h1>
        <span style={{
          fontSize: 11,
          color: '#64748b',
          background: 'rgba(30, 41, 59, 0.8)',
          padding: '4px 10px',
          borderRadius: 6,
        }}>
          3D Audio Spatializer
        </span>
      </div>

      <div style={{
        position: 'fixed',
        right: 20,
        top: 80,
        width: 260,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.9)',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#e2e8f0',
          }}>
            Save Configuration
          </div>
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Config name..."
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: '#e2e8f0',
              width: '100%',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#334155'
            }}
          />
          <button
            onClick={handleSaveConfig}
            style={{
              background: '#6366f1',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4f46e5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6366f1'
            }}
          >
            Save
          </button>
        </div>

        <button
          onClick={() => setShowConfigs(!showConfigs)}
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            color: '#e2e8f0',
            padding: '10px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)'
          }}
        >
          Saved Configs ({savedConfigs.length}) {showConfigs ? '▲' : '▼'}
        </button>

        {showConfigs && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 'calc(100vh - 300px)',
            overflowY: 'auto',
          }}>
            {savedConfigs.length === 0 && (
              <div style={{
                fontSize: 12,
                color: '#475569',
                textAlign: 'center',
                padding: '16px 0',
                background: 'rgba(30, 41, 59, 0.9)',
                borderRadius: 12,
              }}>
                No saved configurations
              </div>
            )}
            {savedConfigs.map((config) => (
              <div
                key={config._id}
                style={{
                  width: 220,
                  height: 80,
                  background: '#2d3748',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  transition: 'all 200ms ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2d3748'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 140,
                  }}>
                    {config.name}
                  </div>
                  <button
                    onClick={() => handleDeleteConfig(config._id)}
                    style={{
                      background: 'transparent',
                      color: '#64748b',
                      fontSize: 10,
                      padding: '2px 4px',
                      borderRadius: 4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#64748b'
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: 11,
                    color: '#64748b',
                  }}>
                    {new Date(config.createdAt).toLocaleDateString()} · {config.sources.length} sources
                  </span>
                  <button
                    onClick={() => handleLoadConfig(config)}
                    style={{
                      background: '#6366f1',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 5,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4f46e5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#6366f1'
                    }}
                  >
                    Load
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
