import { useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from '../store'
import axios from 'axios'
import type { Marker } from '../types'

export default function MarkerLabel() {
  const { newMarkerPosition, setNewMarkerPosition, addMarker } = useStore()
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (newMarkerPosition && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [newMarkerPosition])

  useEffect(() => {
    setLabel('')
  }, [newMarkerPosition])

  if (!newMarkerPosition) return null

  const handleSubmit = async () => {
    if (!label.trim() || !newMarkerPosition) return

    setSubmitting(true)
    try {
      const markerData: Omit<Marker, 'id' | 'createdAt'> = {
        position: {
          x: newMarkerPosition.x,
          y: newMarkerPosition.y,
          z: newMarkerPosition.z,
        },
        label: label.trim(),
        layerId: newMarkerPosition.layerId,
      }

      const response = await axios.post('/api/markers', markerData)
      addMarker(response.data)
      setNewMarkerPosition(null)
    } catch (error) {
      console.error('Failed to save marker:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setNewMarkerPosition(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="fixed z-50 animate-fade-in" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm -m-[100vw]"
        onClick={handleCancel}
      />
      <div className="relative bg-white rounded-lg shadow-2xl p-4 w-[280px]">
        <p className="text-sm font-medium text-slate-700 mb-2">添加标记注释</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入标记名称..."
            className="flex-1 w-[200px] px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
            maxLength={30}
            disabled={submitting}
          />
          <button
            onClick={handleSubmit}
            disabled={!label.trim() || submitting}
            className="p-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="p-2 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 disabled:opacity-50 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          按 Enter 确认，按 Esc 取消
        </p>
      </div>
    </div>
  )
}
