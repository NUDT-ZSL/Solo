import { useState, useMemo, useEffect } from 'react'
import { Package, Booking, BookingFormData, detectConflict, calculatePackagePrice, validateEmail, validatePhone, formatDate } from '../business/portfolio'

interface BookingPageProps {
  packages: Package[]
  bookings: Booking[]
  onBookingAdded: (booking: Booking) => void
}

const PACKAGE_NAMES: Record<Package['name'], string> = {
  basic: '基础套餐',
  standard: '标准套餐',
  premium: '尊享套餐'
}

function BookingPage({ packages, bookings, onBookingAdded }: BookingPageProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    email: '',
    date: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Partial<BookingFormData>>({})
  const [hasConflict, setHasConflict] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [today, setToday] = useState('')

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setToday(`${year}-${month}-${day}`)
  }, [])

  useEffect(() => {
    if (formData.date) {
      const startTime = performance.now()
      const conflict = detectConflict(formData.date, bookings)
      const endTime = performance.now()
      console.log(`Conflict detection completed in ${endTime - startTime}ms`)
      setHasConflict(conflict)
    } else {
      setHasConflict(false)
    }
  }, [formData.date, bookings])

  const isFormValid = useMemo(() => {
    return (
      formData.name.trim() !== '' &&
      validatePhone(formData.phone) &&
      validateEmail(formData.email) &&
      formData.date !== '' &&
      !hasConflict
    )
  }, [formData, hasConflict])

  const totalPrice = useMemo(() => {
    if (!selectedPackage) return 0
    return calculatePackagePrice(selectedPackage.price, [], 0)
  }, [selectedPackage])

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<BookingFormData> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名'
    }
    
    if (!validatePhone(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码'
    }
    
    if (!validateEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (!formData.date) {
      newErrors.date = '请选择拍摄日期'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !selectedPackage || hasConflict) {
      return
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          packageId: selectedPackage.id
        })
      })

      if (response.ok) {
        const newBooking = await response.json()
        onBookingAdded(newBooking)
        setShowModal(true)
        setFormData({
          name: '',
          phone: '',
          email: '',
          date: '',
          notes: ''
        })
        setSelectedPackage(null)
      }
    } catch (error) {
      console.error('Error submitting booking:', error)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">套餐与预约</h1>
      
      <div className="booking-layout">
        <div className="packages-section">
          <h2>摄影套餐</h2>
          {packages.map(pkg => (
            <div key={pkg.id} className="package-card">
              <div
                className="package-header"
                style={{
                  background: `linear-gradient(90deg, ${pkg.color}, ${pkg.color}dd)`
                }}
              />
              <div className="package-content">
                <h3 className="package-name">{PACKAGE_NAMES[pkg.name]}</h3>
                <ul className="package-features">
                  <li>精修照片：{pkg.editedPhotos} 张</li>
                  <li>拍摄时长：{pkg.duration} 小时</li>
                  <li>服装套数：{pkg.outfits} 套</li>
                </ul>
                <div className="package-price">
                  <span className="currency">¥</span>
                  {pkg.price.toLocaleString()}
                </div>
                <button
                  className={`btn ${selectedPackage?.id === pkg.id ? 'btn-secondary' : ''}`}
                  style={{ width: '100%' }}
                  onClick={() => setSelectedPackage(selectedPackage?.id === pkg.id ? null : pkg)}
                >
                  {selectedPackage?.id === pkg.id ? '已选择' : '预约此套餐'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="booking-form-section">
          <h2>预约表单</h2>
          {selectedPackage ? (
            <form className="booking-form" onSubmit={handleSubmit}>
              <div style={{
                padding: '16px',
                background: '#F8F5F1',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#8A7A6A', marginBottom: '4px' }}>
                  已选择套餐
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#2C3E3F',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{PACKAGE_NAMES[selectedPackage.name]}</span>
                  <span style={{ color: '#D4A574' }}>¥{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">姓名</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="请输入您的姓名"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
                {errors.name && <div className="error-text">{errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">电话</label>
                <input
                  type="tel"
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="请输入您的手机号码"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
                {errors.phone && <div className="error-text">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">邮箱</label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="请输入您的邮箱地址"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                {errors.email && <div className="error-text">{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">拍摄日期</label>
                <input
                  type="date"
                  className={`form-input ${hasConflict ? 'error' : ''}`}
                  value={formData.date}
                  min={today}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
                {hasConflict && (
                  <div className="error-text">该日期已被约满</div>
                )}
                {errors.date && <div className="error-text">{errors.date}</div>}
                {formData.date && !hasConflict && (
                  <div style={{ fontSize: '0.85rem', color: '#27AE60', marginTop: '4px' }}>
                    {formatDate(formData.date)} 可预约
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea
                  className="form-input"
                  placeholder="请输入您的特殊需求或备注信息（选填）"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedPackage(null)
                    setFormData({
                      name: '',
                      phone: '',
                      email: '',
                      date: '',
                      notes: ''
                    })
                    setErrors({})
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={!isFormValid}
                >
                  提交预约
                </button>
              </div>
            </form>
          ) : (
            <div style={{
              background: 'white',
              padding: '60px 40px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                background: '#F5F0EB',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#2C3E3F', marginBottom: '8px' }}>
                请选择套餐
              </h3>
              <p style={{ color: '#8A7A6A' }}>
                从左侧选择您喜欢的摄影套餐开始预约
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="modal-title">预约成功！</h3>
            <p className="modal-message">
              我们将在24小时内与您联系
            </p>
            <button className="btn" onClick={() => setShowModal(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingPage
