import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import HomePage from './components/HomePage'
import DetailPage from './components/DetailPage'
import {
  Trip,
  CreateTripInput,
  getTrips,
  createTrip,
  deleteTrip,
  getTripById,
} from './api-client'

type Page =
  | { name: 'home' }
  | { name: 'detail'; tripId: string }

const App: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentPage, setCurrentPage] = useState<Page>({ name: 'home' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  async function loadTrips() {
    setLoading(true)
    setError(null)
    try {
      const data = await getTrips()
      setTrips(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  useEffect(() => {
    if (currentPage.name === 'detail') {
      const loadDetail = async () => {
        try {
          const trip = await getTripById(currentPage.tripId)
          setSelectedTrip(trip)
        } catch (err) {
          setError(err instanceof Error ? err.message : '加载旅行详情失败')
          setCurrentPage({ name: 'home' })
        }
      }
      loadDetail()
    } else {
      setSelectedTrip(null)
    }
  }, [currentPage])

  async function handleCreateTrip(data: CreateTripInput) {
    setError(null)
    try {
      const newTrip = await createTrip(data)
      setTrips(prev => [newTrip, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建旅行失败')
      throw err
    }
  }

  async function handleDeleteTrip(id: string) {
    setError(null)
    try {
      await deleteTrip(id)
      setTrips(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除旅行失败')
      throw err
    }
  }

  function handleSelectTrip(id: string) {
    setCurrentPage({ name: 'detail', tripId: id })
  }

  function handleEditTrip(trip: Trip) {
    alert('编辑功能可以在此弹窗中实现，当前版本请在详情页管理行程和开销。')
  }

  function handleBack() {
    setCurrentPage({ name: 'home' })
    setSelectedTrip(null)
    loadTrips()
  }

  function handleUpdateTrip(updated: Trip) {
    setSelectedTrip(updated)
    setTrips(prev => prev.map(t => (t.id === updated.id ? updated : t)))
  }

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {currentPage.name === 'home' && (
        <HomePage
          trips={trips}
          onCreateTrip={handleCreateTrip}
          onDeleteTrip={handleDeleteTrip}
          onSelectTrip={handleSelectTrip}
          onEditTrip={handleEditTrip}
          loading={loading}
        />
      )}

      {currentPage.name === 'detail' && selectedTrip && (
        <DetailPage
          trip={selectedTrip}
          onBack={handleBack}
          onUpdate={handleUpdateTrip}
        />
      )}

      {error && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => {
              setError(null)
              loadTrips()
            }}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.5)',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            重试
          </button>
          <button
            onClick={() => setError(null)}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />)
}
