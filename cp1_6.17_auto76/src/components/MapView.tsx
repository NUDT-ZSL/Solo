import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet'
import L from 'leaflet'
import {
  useTravelStore,
  MEMBER_COLORS,
  type MarkerPoint
} from '../store'
import './MapView.css'

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function FitBoundsController({ markers }: { markers: MarkerPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) return
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [markers, map])

  return null
}

function createPinIcon(color: string, isNew: boolean) {
  return L.divIcon({
    className: `custom-pin ${isNew ? 'pin-drop' : ''}`,
    html: `
      <div class="pin-wrapper">
        <div class="pin-body" style="background-color: ${color}; box-shadow: 0 2px 6px ${color}66;">
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                  fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
          </svg>
        </div>
        <div class="pin-shadow"></div>
      </div>
    `,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40]
  })
}

function DraggableMarker({
  marker,
  color,
  memberName,
  routeIndex,
  onDragEnd
}: {
  marker: MarkerPoint
  color: string
  memberName: string
  routeIndex: number | undefined
  onDragEnd: (id: string, lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const handleDragEnd = useCallback(() => {
    const markerEl = markerRef.current
    if (markerEl) {
      const position = markerEl.getLatLng()
      onDragEnd(marker.id, position.lat, position.lng)
    }
  }, [marker.id, onDragEnd])

  return (
    <Marker
      ref={markerRef}
      position={[marker.lat, marker.lng]}
      icon={createPinIcon(color, !!marker.isNew)}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd
      }}
    >
      <Popup>
        <div className="popup-content">
          <div className="popup-header">
            <span
              className="route-badge"
              style={{
                display: routeIndex !== undefined && routeIndex >= 0 ? 'inline-flex' : 'none'
              }}
            >
              #{(routeIndex ?? -1) + 1}
            </span>
            <strong style={{ marginLeft: routeIndex !== undefined && routeIndex >= 0 ? '8px' : 0 }}>
              {marker.name}
            </strong>
          </div>
          <div className="popup-meta">
            <span className="popup-author" style={{ color }}>
              {memberName}
            </span>
            <span>停留 {marker.stayHours}h</span>
          </div>
          {marker.note && <p className="popup-note">{marker.note}</p>}
          <div
            className="popup-image"
            style={{ backgroundColor: marker.imageColor }}
          >
            {marker.imageLabel}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

const IMAGE_COLOR_PRESETS = [
  { color: '#FF6B6B', label: '景点' },
  { color: '#4ECDC4', label: '美食' },
  { color: '#45B7D1', label: '住宿' },
  { color: '#96CEB4', label: '购物' },
  { color: '#FFEAA7', label: '活动' },
  { color: '#DDA0DD', label: '其他' }
]

export default function MapView() {
  const {
    markers,
    route,
    members,
    ui,
    addMarker,
    updateMarker,
    setShowAddForm,
    setCurrentMemberId,
    clearNewAnimation
  } = useTravelStore()

  const [formName, setFormName] = useState('')
  const [formStayHours, setFormStayHours] = useState(2)
  const [formNote, setFormNote] = useState('')
  const [formImageIdx, setFormImageIdx] = useState(0)

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setFormName('')
      setFormStayHours(2)
      setFormNote('')
      setFormImageIdx(0)
      setShowAddForm(true, { lat, lng })
    },
    [setShowAddForm]
  )

  const handleDragEnd = useCallback(
    (id: string, lat: number, lng: number) => {
      updateMarker(id, { lat, lng })
    },
    [updateMarker]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ui.formPosition || !formName.trim()) return

    addMarker({
      memberId: ui.currentMemberId,
      lat: ui.formPosition.lat,
      lng: ui.formPosition.lng,
      name: formName.trim(),
      stayHours: formStayHours,
      note: formNote.trim(),
      imageColor: IMAGE_COLOR_PRESETS[formImageIdx].color,
      imageLabel: IMAGE_COLOR_PRESETS[formImageIdx].label
    })

    setShowAddForm(false)
  }

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    markers.forEach((m) => {
      if (m.isNew) {
        timers.push(setTimeout(() => clearNewAnimation(m.id), 600))
      }
    })
    return () => timers.forEach((t) => clearTimeout(t))
  }, [markers, clearNewAnimation])

  const getMemberColor = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.color || MEMBER_COLORS[0]
  }

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name || '未知'
  }

  const routePositions: [number, number][] = []
  if (route && route.order.length > 0) {
    route.order.forEach((markerId) => {
      const marker = markers.find((m) => m.id === markerId)
      if (marker) {
        routePositions.push([marker.lat, marker.lng])
      }
    })
  }

  return (
    <div className="map-container">
      <MapContainer
        center={[35.8617, 104.1954]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={handleMapClick} />
        <FitBoundsController markers={markers} />

        {routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#2196F3',
              weight: 3,
              opacity: 0.7,
              lineCap: 'round',
              lineJoin: 'round'
            }}
            className="route-polyline"
          />
        )}

        {markers.map((marker) => {
          const routeIndex = route?.order.indexOf(marker.id)
          return (
            <DraggableMarker
              key={marker.id}
              marker={marker}
              color={getMemberColor(marker.memberId)}
              memberName={getMemberName(marker.memberId)}
              routeIndex={routeIndex}
              onDragEnd={handleDragEnd}
            />
          )
        })}
      </MapContainer>

      {ui.showAddForm && ui.formPosition && (
        <div className="add-form-overlay" onClick={() => setShowAddForm(false)}>
          <div
            className="add-form-glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="form-header">
              <h3>添加旅行标记</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>添加人</label>
                <div className="member-select">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`avatar-btn ${ui.currentMemberId === m.id ? 'active' : ''}`}
                      style={{ backgroundColor: m.color }}
                      onClick={() => setCurrentMemberId(m.id)}
                    >
                      {m.avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="placeName">地点名称 *</label>
                <input
                  id="placeName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="输入地点名称..."
                  required
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label>
                  停留时间：<strong>{formStayHours} 小时</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={formStayHours}
                  onChange={(e) => setFormStayHours(parseFloat(e.target.value))}
                />
                <div className="range-labels">
                  <span>0.5h</span>
                  <span>4h</span>
                  <span>8h</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="note">备注（最多200字）</label>
                <textarea
                  id="note"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value.slice(0, 200))}
                  placeholder="添加一些备注信息..."
                  rows={3}
                />
                <span className="char-count">{formNote.length}/200</span>
              </div>

              <div className="form-group">
                <label>图片标签</label>
                <div className="image-presets">
                  {IMAGE_COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`preset-btn ${formImageIdx === idx ? 'active' : ''}`}
                      style={{ backgroundColor: preset.color }}
                      onClick={() => setFormImageIdx(idx)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={!formName.trim()}>
                  添加标记
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
