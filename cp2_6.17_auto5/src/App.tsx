import { useState, useCallback } from 'react'
import AlertBoard from './components/AlertBoard'
import CollabMap from './components/CollabMap'
import ReportModal from './components/ReportModal'
import './App.css'

export default function App() {
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportLocation, setReportLocation] = useState<[number, number] | null>(null)
  const [selectLocationMode, setSelectLocationMode] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined)

  const handleSelectMapLocation = useCallback((lat: number, lng: number) => {
    setMapCenter([lat, lng])
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (selectLocationMode) {
      setReportLocation([lat, lng])
      setSelectLocationMode(false)
      setShowReportModal(true)
    }
  }, [selectLocationMode])

  const handlePickLocation = useCallback(() => {
    setSelectLocationMode(true)
    setShowReportModal(false)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowReportModal(false)
    setReportLocation(null)
  }, [])

  const handleOpenReport = useCallback(() => {
    setShowReportModal(true)
    setSelectLocationMode(false)
  }, [])

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="panel-left">
          <AlertBoard onSelectMapLocation={handleSelectMapLocation} />
        </div>
        <div className="panel-right">
          <CollabMap
            onMapClick={handleMapClick}
            selectMode={selectLocationMode}
            center={mapCenter}
            selectedLocation={reportLocation}
          />
        </div>
      </div>

      <button className="fab" onClick={handleOpenReport}>
        <span className="fab-icon">+</span>
      </button>

      {showReportModal && (
        <ReportModal
          onClose={handleCloseModal}
          initialLocation={reportLocation}
          onPickLocation={handlePickLocation}
        />
      )}

      {selectLocationMode && !showReportModal && (
        <div className="select-mode-banner">
          点击地图选择灾情位置
          <button className="cancel-btn" onClick={() => setSelectLocationMode(false)}>
            取消
          </button>
        </div>
      )}
    </div>
  )
}
