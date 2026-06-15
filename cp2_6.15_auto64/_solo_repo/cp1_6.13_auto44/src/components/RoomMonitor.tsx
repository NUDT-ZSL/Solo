import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Room {
  _id: string
  storeId: string
  name: string
  status: 'available' | 'occupied' | 'cleaning'
  petName: string | null
  checkInTime: string | null
}

const statusColorMap: Record<string, string> = {
  available: '#22c55e',
  occupied: '#ef4444',
  cleaning: '#eab308',
}

const statusNameMap: Record<string, string> = {
  available: '可用',
  occupied: '已占用',
  cleaning: '清洁中',
}

const statusTransition: Record<string, ('available' | 'occupied' | 'cleaning')[]> = {
  available: ['occupied'],
  occupied: ['cleaning', 'available'],
  cleaning: ['available'],
}

const RoomMonitor: React.FC = () => {
  const [stores, setStores] = useState<{ _id: string; name: string }[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('store-1')
  const [loading, setLoading] = useState(true)
  const [hoveredRoom, setHoveredRoom] = useState<Room | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storesRes, roomsRes] = await Promise.all([
          axios.get('/api/stores'),
          axios.get('/api/rooms', { params: { storeId: selectedStore } }),
        ])
        setStores(storesRes.data)
        setRooms(roomsRes.data)
      } catch (err) {
        console.error('Failed to load rooms:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedStore])

  const handleStatusChange = async (room: Room) => {
    const nextStatuses = statusTransition[room.status]
    if (!nextStatuses || nextStatuses.length === 0) return

    const nextStatus = nextStatuses[0]
    const update: Partial<Room> = {
      status: nextStatus,
      petName: nextStatus === 'occupied' ? room.petName : null,
      checkInTime: nextStatus === 'occupied' ? room.checkInTime : null,
    }

    setRooms(prev =>
      prev.map(r => (r._id === room._id ? { ...r, ...update } : r))
    )

    try {
      await axios.put(`/api/rooms/${room._id}`, update)
    } catch (err) {
      console.error('Failed to update room status:', err)
      setRooms(prev =>
        prev.map(r => (r._id === room._id ? room : r))
      )
    }
  }

  const handleMouseEnter = (room: Room, e: React.MouseEvent) => {
    setHoveredRoom(room)
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setHoveredRoom(null)
  }

  const roomsByGroup: Record<string, Room[]> = {}
  rooms.forEach(room => {
    const group = room.name[0]
    if (!roomsByGroup[group]) roomsByGroup[group] = []
    roomsByGroup[group].push(room)
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>加载寄养房状态...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>🏠 寄养房状态监控</h2>
        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 14,
            outline: 'none',
          }}
        >
          {stores.map(s => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(statusColorMap).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: color }} />
            <span style={{ fontSize: 13, color: '#64748b' }}>{statusNameMap[status]}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {Object.entries(roomsByGroup).map(([group, groupRooms]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>{group}区</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {groupRooms
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(room => {
                  const bgColor = statusColorMap[room.status]
                  const isOccupied = room.status === 'occupied'

                  return (
                    <div
                      key={room._id}
                      onClick={() => handleStatusChange(room)}
                      onMouseEnter={e => handleMouseEnter(room, e)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        background: bgColor,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'background-color 0.3s ease, transform 0.2s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                        handleMouseEnter(room, e)
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                        handleMouseLeave()
                      }}
                    >
                      <span>{room.name}</span>
                      {isOccupied && <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.9 }}>●</span>}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
          💡 点击房间可切换状态：可用 → 已占用 → 清洁中 → 可用
        </div>
      </div>

      {hoveredRoom && (
        <div
          style={{
            position: 'fixed',
            left: hoverPos.x + 12,
            top: hoverPos.y + 12,
            background: '#1e293b',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            zIndex: 3000,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>房间 {hoveredRoom.name}</div>
          <div style={{ color: '#cbd5e1' }}>状态：{statusNameMap[hoveredRoom.status]}</div>
          {hoveredRoom.petName && <div style={{ color: '#cbd5e1' }}>宠物：{hoveredRoom.petName}</div>}
          {hoveredRoom.checkInTime && <div style={{ color: '#cbd5e1' }}>入住：{hoveredRoom.checkInTime}</div>}
        </div>
      )}
    </div>
  )
}

export default RoomMonitor
