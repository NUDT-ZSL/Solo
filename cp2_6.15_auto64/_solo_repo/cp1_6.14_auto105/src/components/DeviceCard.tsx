import { useState } from 'react'
import http from '../http'

export interface Device {
  id: string
  name: string
  imageUrl: string
  status: 'available' | 'borrowed' | 'maintenance'
  description: string
}

interface DeviceCardProps {
  device: Device
  isAdmin: boolean
  onReserve: (device: Device) => void
  onDeviceUpdated: () => void
}

const statusMap: Record<Device['status'], { label: string; className: string }> = {
  available: { label: '可选', className: 'status-available' },
  borrowed: { label: '已借出', className: 'status-borrowed' },
  maintenance: { label: '维修中', className: 'status-maintenance' }
}

export default function DeviceCard({ device, isAdmin, onReserve, onDeviceUpdated }: DeviceCardProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: device.name,
    description: device.description,
    status: device.status,
    imageUrl: device.imageUrl
  })
  const [saving, setSaving] = useState(false)

  const st = statusMap[device.status]
  const canReserve = device.status === 'available'

  const handleSave = async () => {
    setSaving(true)
    try {
      await http.put(`/devices/${device.id}`, form)
      setEditing(false)
      onDeviceUpdated()
    } catch (err) {
      console.error('Failed to update device', err)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = () => {
    setForm({
      name: device.name,
      description: device.description,
      status: device.status,
      imageUrl: device.imageUrl
    })
    setEditing(true)
  }

  if (editing) {
    return (
      <div className="device-card editing">
        <div className="edit-form">
          <label>
            设备名称
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            描述
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label>
            状态
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Device['status'] }))}
            >
              <option value="available">可选</option>
              <option value="borrowed">已借出</option>
              <option value="maintenance">维修中</option>
            </select>
          </label>
          <label>
            图片 URL
            <input
              type="text"
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
            />
          </label>
          <div className="edit-actions">
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button className="btn-cancel" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="device-card">
      <div className="device-img-wrapper">
        <img src={device.imageUrl} alt={device.name} className="device-img" />
        <span className={`status-tag ${st.className}`}>{st.label}</span>
      </div>
      <div className="device-info">
        <h3 className="device-name">{device.name}</h3>
        <p className="device-desc">{device.description}</p>
      </div>
      <button
        className="btn-reserve"
        disabled={!canReserve}
        onClick={() => canReserve && onReserve(device)}
      >
        立即预约
      </button>
      {isAdmin && (
        <button className="btn-admin-manage" onClick={openEdit}>
          管理
        </button>
      )}
    </div>
  )
}
