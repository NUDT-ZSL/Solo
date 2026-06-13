import React, { useEffect, useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import axios from 'axios'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface Store {
  _id: string
  name: string
  address: string
  phone: string
  hours: string
  todaySlots: { time: string; available: boolean }[]
}

interface Appointment {
  _id: string
  storeId: string
  date: string
  time: string
  service: string
  petName: string
  petBreed: string
  petWeight: string
  ownerPhone: string
  ownerName: string
  groomerId: string
  status: string
  price: number
  rating: number | null
  review: string | null
}

interface Member {
  _id: string
  name: string
  phone: string
  points: number
  storeId: string
}

const cardShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'

const Dashboard: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const start = performance.now()
      try {
        const [storesRes, aptsRes, membersRes] = await Promise.all([
          axios.get('/api/stores'),
          axios.get('/api/appointments'),
          axios.get('/api/members'),
        ])
        setStores(storesRes.data)
        setAppointments(aptsRes.data)
        setMembers(membersRes.data)
        const elapsed = performance.now() - start
        console.log(`Dashboard data loaded in ${elapsed.toFixed(0)}ms`)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalMembers = members.length

  const today = new Date().toISOString().slice(0, 10)
  const thisMonthAppointments = useMemo(() => {
    const monthStart = today.slice(0, 7)
    return appointments.filter(a => a.date.startsWith(monthStart))
  }, [appointments, today])

  const avgRating = useMemo(() => {
    const rated = appointments.filter(a => a.rating != null)
    if (rated.length === 0) return 0
    return (rated.reduce((sum, a) => sum + (a.rating || 0), 0) / rated.length).toFixed(1)
  }, [appointments])

  const chartData = useMemo(() => {
    const days: string[] = []
    const counts: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      days.push(`${d.getMonth() + 1}/${d.getDate()}`)
      counts.push(appointments.filter(a => a.date === dateStr).length)
    }
    return {
      labels: days,
      datasets: [
        {
          label: '预约量',
          data: counts,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
        },
      ],
    }
  }, [appointments])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 12 }, stepSize: 1 },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  const storeNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    stores.forEach(s => { map[s._id] = s.name })
    return map
  }, [stores])

  const pendingByStore = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {}
    appointments
      .filter(a => a.status === 'pending')
      .forEach(a => {
        if (!grouped[a.storeId]) grouped[a.storeId] = []
        grouped[a.storeId].push(a)
      })
    return grouped
  }, [appointments])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>总店仪表板</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: cardShadow }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>总会员数</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316' }}>{totalMembers}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: cardShadow }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>本月预约单数</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316' }}>{thisMonthAppointments.length}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: cardShadow }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>平均评分</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f97316' }}>{avgRating} ⭐</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: cardShadow, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>最近7天预约量趋势</h3>
        <div style={{ height: 280 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: cardShadow }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>待处理预约</h3>
        {Object.keys(pendingByStore).length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>暂无待处理预约</p>
        ) : (
          Object.entries(pendingByStore).map(([storeId, apts]) => (
            <div key={storeId} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                🏪 {storeNameMap[storeId] || storeId}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {apts.map(apt => (
                  <div
                    key={apt._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ color: '#3b82f6', fontWeight: 600 }}>{apt.time}</span>
                      <span style={{ color: '#334155' }}>{apt.petName}</span>
                      <span style={{ color: '#64748b' }}>{apt.service}</span>
                    </div>
                    <span style={{ color: '#94a3b8' }}>{apt.ownerName} · {apt.ownerPhone}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Dashboard
