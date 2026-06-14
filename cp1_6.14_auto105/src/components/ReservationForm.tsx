import { useState } from 'react'
import type { Device } from './DeviceCard'

interface ReservationFormProps {
  device: Device | null
  userId: string
  userName: string
  onSubmit: (data: { deviceId: string; userId: string; userName: string; date: string; timeSlot: string; note: string }) => Promise<{ success: boolean; message?: string }>
  onClose: () => void
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 9; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00-${String(h).padStart(2, '0')}:30`)
    slots.push(`${String(h).padStart(2, '0')}:30-${String(h + 1).padStart(2, '0')}:00`)
  }
  return slots
}

function getTodayStr(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function getMaxDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

export default function ReservationForm({ device, userId, userName, onSubmit, onClose }: ReservationFormProps) {
  const [date, setDate] = useState(getTodayStr())
  const [timeSlot, setTimeSlot] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!device) return null

  const timeSlots = generateTimeSlots()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!timeSlot) return
    setSubmitting(true)
    try {
      await onSubmit({
        deviceId: device.id,
        userId,
        userName,
        date,
        timeSlot,
        note
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="reservation-form-container slide-in">
      <div className="form-header">
        <h3>预约设备：{device.name}</h3>
        <button className="btn-close-form" onClick={onClose}>✕</button>
      </div>
      <form className="reservation-form" onSubmit={handleSubmit}>
        <label className="form-label">
          日期
          <input
            type="date"
            className="form-input"
            value={date}
            min={getTodayStr()}
            max={getMaxDateStr()}
            onChange={e => setDate(e.target.value)}
            required
          />
        </label>
        <label className="form-label">
          时间段
          <select
            className="form-select"
            value={timeSlot}
            onChange={e => setTimeSlot(e.target.value)}
            required
          >
            <option value="">请选择时间段</option>
            {timeSlots.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <label className="form-label">
          备注
          <textarea
            className="form-textarea"
            placeholder="设备用途或备注"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn-submit"
          disabled={submitting || !timeSlot}
        >
          {submitting ? '提交中...' : '提交预约'}
        </button>
      </form>
    </div>
  )
}
