import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import dayjs from 'dayjs'
import { useReports } from '../hooks/useReports'
import { getCurrentPosition } from '../utils/geolocation'
import { REPORT_COLORS, REPORT_TYPE_NAMES, FALLBACK_CENTER } from '../utils/constants'
import type { Report, ReportType, Bounds } from '../types'
import './CollabMap.css'

interface CollabMapProps {
  onMapClick?: (lat: number, lng: number) => void
  selectMode?: boolean
  center?: [number, number]
  selectedLocation?: [number, number] | null
}

const CLUSTER_THRESHOLD = 500
const GRID_SIZE = 0.01

function createCustomMarker(color: string, isCluster = false, count = 0) {
  const size = isCluster ? Math.min(48, 28 + Math.log2(count) * 3) : 16
  const radius = isCluster ? size / 2 - 2 : 7
  const fontSize = isCluster ? Math.max(11, size / 3.5) : 0

  return L.divIcon({
    className: `custom-marker ${isCluster ? 'cluster-marker' : ''}`,
    html: `
      <div class="marker-wrapper" style="width:${size}px;height:${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle 
            cx="${size / 2}" 
            cy="${size / 2}" 
            r="${radius}" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="2"
          />
        </svg>
        ${isCluster ? `<span class="cluster-number" style="font-size:${fontSize}px;line-height:${size}px;">${count}</span>` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

function getAverageColor(reports: Report[]): string {
  if (reports.length === 0) return '#6b7280'

  const typeCount: Record<string, number> = {}
  reports.forEach(r => {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1
  })

  const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0] as ReportType
  return REPORT_COLORS[dominantType] || '#6b7280'
}

interface Cluster {
  id: string
  lat: number
  lng: number
  reports: Report[]
}

function clusterReports(reports: Report[], threshold: number, zoom: number): { markers: Report[]; clusters: Cluster[] } {
  if (reports.length <= threshold) {
    return { markers: reports, clusters: [] }
  }

  const gridCellSize = GRID_SIZE / Math.pow(2, Math.max(0, zoom - 13))
  const grid: Record<string, Report[]> = {}

  reports.forEach(report => {
    const gridLat = Math.floor(report.lat / gridCellSize)
    const gridLng = Math.floor(report.lng / gridCellSize)
    const key = `${gridLat}_${gridLng}`

    if (!grid[key]) {
      grid[key] = []
    }
    grid[key].push(report)
  })

  const clusters: Cluster[] = []
  const markers: Report[] = []

  Object.entries(grid).forEach(([key, gridReports]) => {
    if (gridReports.length > 1) {
      const avgLat = gridReports.reduce((sum, r) => sum + r.lat, 0) / gridReports.length
      const avgLng = gridReports.reduce((sum, r) => sum + r.lng, 0) / gridReports.length
      clusters.push({
        id: `cluster_${key}`,
        lat: avgLat,
        lng: avgLng,
        reports: gridReports
      })
    } else if (gridReports.length === 1) {
      markers.push(gridReports[0])
    }
  })

  return { markers, clusters }
}

function MapController({
  onBoundsChange,
  onClick,
  selectMode,
  onSelectModeExit,
  onZoomChange
}: {
  onBoundsChange: (bounds: Bounds) => void
  onClick?: (lat: number, lng: number) => void
  selectMode?: boolean
  onSelectModeExit?: () => void
  onZoomChange: (zoom: number) => void
}) {
  const map = useMap()

  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      onBoundsChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
      })
      onZoomChange(map.getZoom())
    },
    zoomend: () => {
      const bounds = map.getBounds()
      onBoundsChange({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
      })
      onZoomChange(map.getZoom())
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
  const color = REPORT_COLORS[report.type]
  const icon = useMemo(() => createCustomMarker(color), [color])

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={icon}
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
    </Marker>
  )
}

function ClusterMarker({ cluster }: { cluster: Cluster }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const color = useMemo(() => getAverageColor(cluster.reports), [cluster.reports])
  const icon = useMemo(
    () => createCustomMarker(color, true, cluster.reports.length),
    [color, cluster.reports.length]
  )

  if (isExpanded) {
    return (
      <>
        {cluster.reports.map((report) => (
          <ReportMarker key={report.id} report={report} />
        ))}
        <Marker
          position={[cluster.lat, cluster.lng]}
          icon={createCustomMarker('#6b7280', true, -1)}
          eventHandlers={{
            click: () => setIsExpanded(false)
          }}
        >
          <Popup>
            <div className="popup-content">
              <div className="popup-type">收起聚合</div>
              <div className="popup-count">点击收起 {cluster.reports.length} 条标记</div>
            </div>
          </Popup>
        </Marker>
      </>
    )
  }

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={icon}
      eventHandlers={{
        click: () => setIsExpanded(true)
      }}
    >
      <Popup>
        <div className="popup-content">
          <div className="popup-type">灾情聚合</div>
          <div className="popup-count">共 {cluster.reports.length} 条上报</div>
          <div className="popup-hint">点击聚合点展开查看</div>
          {cluster.reports.slice(0, 5).map((r, i) => (
            <div key={i} className="popup-cluster-item">
              <span style={{ color: REPORT_COLORS[r.type] }}>
                {REPORT_TYPE_NAMES[r.type]}
              </span>
              <span className="popup-time">
                {dayjs(r.timestamp).format('HH:mm')}
              </span>
            </div>
          ))}
          {cluster.reports.length > 5 && (
            <div className="popup-more">...还有 {cluster.reports.length - 5} 条</div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

export default function CollabMap({ onMapClick, selectMode, center, selectedLocation }: CollabMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center || FALLBACK_CENTER)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [zoom, setZoom] = useState(13)
  const mapRef = useRef<L.Map | null>(null)

  const { reports } = useReports(bounds || undefined)

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

  const handleBoundsChange = useCallback((newBounds: Bounds) => {
    setBounds(newBounds)
  }, [])

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const handleClick = useCallback((lat: number, lng: number) => {
    onMapClick?.(lat, lng)
  }, [onMapClick])

  const { markers, clusters } = useMemo(
    () => clusterReports(reports, CLUSTER_THRESHOLD, zoom),
    [reports, zoom]
  )

  const selectedIcon = useMemo(() => createCustomMarker('#ef4444'), [])

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
        ref={(map) => { mapRef.current = map }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          onBoundsChange={handleBoundsChange}
          onZoomChange={handleZoomChange}
          onClick={handleClick}
          selectMode={selectMode}
        />
        {markers.map(report => (
          <ReportMarker key={report.id} report={report} />
        ))}
        {clusters.map(cluster => (
          <ClusterMarker key={cluster.id} cluster={cluster} />
        ))}
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            icon={selectedIcon}
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
