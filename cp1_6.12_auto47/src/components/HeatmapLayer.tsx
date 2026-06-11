import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { DisplayMemo } from '../types'
import './HeatmapLayer.css'

interface HeatmapLayerProps {
  memos: DisplayMemo[]
  radius: number
}

function isHeatLayerAvailable(): boolean {
  return typeof L !== 'undefined' && typeof (L as any).heatLayer === 'function'
}

export default function HeatmapLayer({ memos, radius }: HeatmapLayerProps) {
  const map = useMap()
  const heatLayerRef = useRef<L.HeatLayer | null>(null)
  const [pluginLoaded, setPluginLoaded] = useState<boolean>(isHeatLayerAvailable())
  const [loadAttempts, setLoadAttempts] = useState<number>(0)

  useEffect(() => {
    if (pluginLoaded) return

    let attempts = 0
    const maxAttempts = 10
    const checkInterval = setInterval(() => {
      attempts++
      if (isHeatLayerAvailable()) {
        setPluginLoaded(true)
        clearInterval(checkInterval)
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        console.warn('leaflet.heat plugin failed to load after multiple attempts')
      }
      setLoadAttempts(attempts)
    }, 200)

    return () => clearInterval(checkInterval)
  }, [pluginLoaded])

  useEffect(() => {
    if (!map || !pluginLoaded) return

    const visibleMemos = memos.filter((m) => m.opacity > 0.5)
    const heatPoints: L.LatLngTuple[] = visibleMemos.map((m) => [m.lat, m.lng])

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (heatPoints.length === 0) return

    try {
      const heatLayer = L.heatLayer(heatPoints, {
        radius: radius,
        blur: radius * 0.8,
        minOpacity: 0.3,
        maxZoom: 15,
        gradient: {
          0.0: '#0064B3',
          0.2: '#32C0FF',
          0.4: '#64FF96',
          0.6: '#FFFF64',
          0.8: '#FF6464',
          1.0: '#FF0000',
        },
      }).addTo(map)

      heatLayerRef.current = heatLayer
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Failed to create heat layer:', message)
      setPluginLoaded(false)
    }

    return () => {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
    }
  }, [map, memos, radius, pluginLoaded])

  if (!pluginLoaded && loadAttempts >= 5) {
    return (
      <div className="heatmap-error-overlay">
        <div className="heatmap-error-content">
          <span className="error-icon">⚠️</span>
          <div className="error-text-wrapper">
            <span className="error-title">热力图插件加载失败</span>
            <span className="error-hint">请检查网络连接或刷新页面重试</span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
