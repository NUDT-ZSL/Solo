import { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import dayjs from 'dayjs'
import { useReports } from '../hooks/useReports'
import { getCurrentPosition } from '../utils/geolocation'
import { REPORT_COLORS, REPORT_TYPE_NAMES, FALLBACK_CENTER } from '../utils/constants'
import type { Report, ReportType } from '../types'
import './CollabMap.css'

interface CollabMapProps {
  onMapClick?: (lat: number, lng: number) => void
  selectMode?: boolean
  center?: [number, number]
  selectedLocation?: [number, number] | null
}

function createCustomMarker(color: string, isCluster = false, count = 0) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container ${isCluster ? 'cluster' : ''}">
        <svg width="${isCluster ? 32 : 16}" height="${isCluster ? 32 : 16}" viewBox="0 0 ${isCluster ? 32 : 16} ${isCluster ? 32 : 16}">
          <circle 
            cx="${isCluster ? 16 : 8}" 
            cy="${isCluster ? 16 : 8}" 
            r="${isCluster ? 14 : 7}" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="2"
          />
        </svg>
        ${isCluster ? `<span class="cluster-count">${count}</span>` : ''}
      </div>
    `,
    iconSize: isCluster ? [32, 32] : [16, 16],
    iconAnchor: isCluster ? [16, 16] : [8, 8],
    popupAnchor: [0, -8]
  })
}

function getAverageColor(reports: Report[]): string {
  const colors = reports.map(r => REPORT_COLORS[r.type])
  const rgb = colors.reduce(
    (acc, color) => {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return { r: acc.r + r, g: acc.g + g, b: acc.b + b }
    },
    { r: 0, g: 0, b: 0 }
  )
  const count = colors.length
  return `rgb(${Math.round(rgb.r / count)}, ${Math.round(rgb.g / count)}, ${Math.round(rgb.b / count)})`
}

function clusterReports(reports: Report[], threshold: number) {
  if (reports.length <= threshold) {
    return { markers: reports, clusters: [] }
  }

  const clusters: { lat: number; lng: number; reports: Report[] }[] = []
  const used = new Set<string>()

  reports.forEach((report, i) => {
    if (used.has(report.id)) return

    const cluster = [report]
    used.add(report.id)

    for (let j = i + 1; j < reports.length; j++) {
      const other = reports[j]
      if (used.has(other.id)) continue

      const dist = Math.sqrt(
        Math.pow(report.lat - other.lat, 2) +
        Math.pow(report.lng - other.lng, 2)
      )

      if (dist < 0.05) {
        cluster.push(other)
        used.add(other.id)
      }
    }

    if (cluster.length > 1) {
      const avgLat = cluster.reduce((sum, r) => sum + r.lat, 0) / cluster.length
      const avgLng = cluster.reduce((sum, r) => sum + r.lng, 0) / cluster.length
      clusters.push({ lat: avgLat, lng: avgLng, reports: cluster })
    }
  })

  const markers = reports.filter(r => !used.has(r.id))
  return { markers, clusters }
}

function MapController({ onBoundsChange, onClick, selectMode, onSelectModeExit }: {
  onBoundsChange: (bounds: [[number, number], [number, number]]) => void
  onClick?: (lat: number, lng: number) => void
  selectMode?: boolean
  onSelectModeExit?: () => void
}) {
  const map = useMap()

  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      onBoundsChange([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ])
    },
    zoomend: () => {
      const bounds = map.getBounds()
      onBoundsChange([
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ])
    },
    click: (e) => {
      if (selectMode && onClick) {
        onClick(e.latlng.lat, e.latlng.lng)
        onSelectModeExit?.()
      }
    }
  })

  return null
}

function ReportMarker({ report }: { report: Report }) {
  const [isHovered, setIsHovered] = useState(false)
  const color = REPORT_COLORS[report.type]
  const icon = useMemo(() => createCustomMarker(color), [color])

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={icon}
      eventHandlers={{
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false)
      }}
    >
      <Popup>
        <div className="popup-content">
          <div className="popup-type" style={{ color }}>
            {REPORT_TYPE_NAMES[report.type]}
          </div>
          <div className="popup-time">
            {dayjs(report.timestamp).format('YYYY-MM-DD HH:mm')}
          </div>
          {report.description && (
            <div className="popup-description">{report.description}</div>
          )}
          {report.photoUrl && (
            <img src={report.photoUrl} alt="Report" className="popup-image" />
          )}
        </div>
      </Popup>
      {isHovered && (
        <style>{`
          .leaflet-marker-icon[style*="translate3d"] {
            transform: scale(1.2) !important;
          }
        `}</style>
      )}
    </Marker>
  )
}

function ClusterMarker({ cluster }: { cluster: { lat: number; lng: number; reports: Report[] } }) {
  const color = getAverageColor(cluster.reports)
  const icon = useMemo(
    () => createCustomMarker(color, true, cluster.reports.length),
    [color, cluster.reports.length]
  )

  return (
    <Marker position={[cluster.lat, cluster.lng]} icon={icon}>
      <Popup>
        <div className="popup-content">
          <div className="popup-type">灾情聚合</div>
          <div className="popup-count">共 {cluster.reports.length} 条上报</div>
          {cluster.reports.slice(0, 3).map((r, i) => (
            <div key={i} className="popup-cluster-item">
              <span style={{ color: REPORT_COLORS[r.type] }}>
                {REPORT_TYPE_NAMES[r.type]}
              </span>
              <span className="popup-time">
                {dayjs(r.timestamp).format('HH:mm')}
              </span>
            </div>
          ))}
          {cluster.reports.length > 3 && (
            <div className="popup-more">...还有 {cluster.reports.length - 3} 条</div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

export default function CollabMap({ onMapClick, selectMode, center, selectedLocation }: CollabMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center || FALLBACK_CENTER)
  const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null)
  const { reports, refetch } = useReports(bounds ? { bounds } : undefined)

  useEffect(() => {
    if (!center) {
      getCurrentPosition()
        .then(pos => setMapCenter(pos))
        .catch(() => setMapCenter(FALLBACK_CENTER))
    }
  }, [center])

  useEffect(() => {
    if (center) {
      setMapCenter(center)
    }
  }, [center])

  const handleBoundsChange = useCallback((newBounds: [[number, number], [number, number]]) => {
    setBounds(newBounds)
  }, [])

  const handleClick = useCallback((lat: number, lng: number) => {
    onMapClick?.(lat, lng)
  }, [onMapClick])

  const { markers, clusters } = useMemo(
    () => clusterReports(reports, 500),
    [reports]
  )

  return (
    <div className={`collab-map-container ${selectMode ? 'select-mode' : ''}`}>
      {selectMode && (
        <div className="map-hint">
          📍 点击地图选择位置
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          onBoundsChange={handleBoundsChange}
          onClick={handleClick}
          selectMode={selectMode}
        />
        {markers.map(report => (
          <ReportMarker key={report.id} report={report} />
        ))}
        {clusters.map((cluster, i) => (
          <ClusterMarker key={i} cluster={cluster} />
        ))}
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            icon={createCustomMarker('#ef4444')}
          >
            <Popup>
              <div className="popup-content">
                <div className="popup-type" style={{ color: '#ef4444' }}>
                  选择的位置
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
