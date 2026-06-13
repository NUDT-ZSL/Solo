import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Store {
  _id: string
  name: string
  address: string
  phone: string
  hours: string
  todaySlots: { time: string; available: boolean }[]
}

interface BookingData {
  storeId: string
  storeName: string
  service: string
  date: string
  time: string
  petName: string
  petBreed: string
  petWeight: string
  ownerPhone: string
  ownerName: string
  groomerId: string
  price: number
}

const services = [
  { name: '洗澡', price: 120, icon: '🛁', desc: '基础洗浴+吹干+梳毛' },
  { name: '剪毛', price: 180, icon: '✂️', desc: '造型修剪+洗浴' },
  { name: 'SPA', price: 260, icon: '💆', desc: '深度护理+SPA+造型' },
]

const groomerMap: Record<string, string> = {
  'store-1': 'groomer-1',
  'store-2': 'groomer-3',
  'store-3': 'groomer-4',
}

const BookingPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'store' | 'service' | 'confirm'>('store')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [petName, setPetName] = useState('')
  const [petBreed, setPetBreed] = useState('')
  const [petWeight, setPetWeight] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [confirmation, setConfirmation] = useState<{ id: string; qrCode: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get('/api/stores').then(res => {
      setStores(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const maxDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store)
    setStep('service')
  }

  const handleServiceSelect = (svc: string) => {
    setSelectedService(svc)
  }

  const handleSubmit = async () => {
    if (!selectedStore || !selectedService || !selectedDate || !selectedTime || !petName || !petBreed || !petWeight) {
      return
    }
    setSubmitting(true)
    try {
      const svc = services.find(s => s.name === selectedService)
      const booking: BookingData = {
        storeId: selectedStore._id,
        storeName: selectedStore.name,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        petName,
        petBreed,
        petWeight,
        ownerPhone,
        ownerName,
        groomerId: groomerMap[selectedStore._id] || 'groomer-1',
        price: svc?.price || 120,
      }
      const res = await axios.post('/api/appointments', booking)
      setConfirmation({ id: res.data._id, qrCode: `PET-${res.data._id.slice(0, 8).toUpperCase()}` })
      setStep('confirm')
    } catch (err) {
      console.error('Booking failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetBooking = () => {
    setStep('store')
    setSelectedStore(null)
    setSelectedService('')
    setSelectedDate('')
    setSelectedTime('')
    setPetName('')
    setPetBreed('')
    setPetWeight('')
    setOwnerPhone('')
    setOwnerName('')
    setConfirmation(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 16, color: '#64748b' }}>加载门店信息...</div>
      </div>
    )
  }

  if (step === 'confirm' && confirmation) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>预约成功！</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>您的预约已确认，请按时到店</p>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>预约编号</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316', letterSpacing: 1 }}>
              {confirmation.qrCode}
            </div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>取号二维码</div>
            <div style={{
              width: 160,
              height: 160,
              margin: '0 auto',
              background: '#fff',
              border: '2px solid #e2e8f0',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 14,
              color: '#94a3b8',
            }}>
              <div>
                <div style={{ fontSize: 40, textAlign: 'center' }}>📱</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>到店出示此号</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left', fontSize: 13, color: '#334155', lineHeight: 2 }}>
            <div>🏪 门店：{selectedStore?.name}</div>
            <div>📅 日期：{selectedDate}</div>
            <div>⏰ 时间：{selectedTime}</div>
            <div>✂️ 服务：{selectedService}</div>
            <div>🐾 宠物：{petName}（{petBreed}）</div>
          </div>
          <button
            onClick={resetBooking}
            style={{
              marginTop: 24,
              padding: '10px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#f97316',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            返回继续预约
          </button>
        </div>
      </div>
    )
  }

  if (step === 'service') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setStep('store')}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
          >
            ←
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            {selectedStore?.name} — 预约服务
          </h2>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>选择服务项目</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {services.map(svc => (
              <div
                key={svc.name}
                onClick={() => handleServiceSelect(svc.name)}
                style={{
                  width: 200,
                  padding: 16,
                  background: selectedService === svc.name ? '#fff7ed' : '#ffffff',
                  border: selectedService === svc.name ? '2px solid #f97316' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{svc.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{svc.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', margin: '4px 0 8' }}>{svc.desc}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f97316' }}>¥{svc.price}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedService && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>选择日期和时间</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  max={maxDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {selectedDate && (
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>选择时段</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedStore?.todaySlots.map(slot => {
                    const isPast = selectedDate === today && parseInt(slot.time) < new Date().getHours()
                    const disabled = !slot.available || isPast
                    return (
                      <button
                        key={slot.time}
                        disabled={disabled}
                        onClick={() => setSelectedTime(slot.time)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: selectedTime === slot.time ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          background: disabled ? '#f3f4f6' : selectedTime === slot.time ? '#dbeafe' : '#fff',
                          color: disabled ? '#94a3b8' : '#334155',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          fontSize: 13,
                          transition: 'all 0.2s',
                        }}
                      >
                        {slot.time}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedService && selectedDate && selectedTime && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>填写宠物信息</h3>
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              maxWidth: 480,
            }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>宠物名字 *</label>
                <input
                  value={petName}
                  onChange={e => setPetName(e.target.value)}
                  placeholder="请输入宠物名字"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>品种 *</label>
                <input
                  value={petBreed}
                  onChange={e => setPetBreed(e.target.value)}
                  placeholder="如：金毛、英短"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>体重 *</label>
                <input
                  value={petWeight}
                  onChange={e => setPetWeight(e.target.value)}
                  placeholder="如：5kg"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>主人姓名</label>
                <input
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="请输入您的姓名"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>联系电话</label>
                <input
                  value={ownerPhone}
                  onChange={e => setOwnerPhone(e.target.value)}
                  placeholder="请输入您的手机号"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !petName || !petBreed || !petWeight}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  background: submitting || !petName || !petBreed || !petWeight ? '#cbd5e1' : '#f97316',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: submitting || !petName || !petBreed || !petWeight ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {submitting ? '提交中...' : '确认预约'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>📅 选择门店</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {stores.map(store => {
          const availableCount = store.todaySlots.filter(s => s.available).length
          return (
            <div
              key={store._id}
              onClick={() => handleStoreSelect(store)}
              style={{
                width: 320,
                background: '#ffffff',
                borderRadius: 16,
                padding: 20,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                🏪 {store.name}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                📍 {store.address}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                📞 {store.phone}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                营业时间：{store.hours}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: availableCount > 0 ? '#f0fdf4' : '#fef2f2',
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 12, color: availableCount > 0 ? '#22c55e' : '#ef4444' }}>
                  {availableCount > 0 ? `今日可预约 ${availableCount} 个时段` : '今日已约满'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BookingPage
