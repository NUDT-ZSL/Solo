import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CartItem, mockGetCart, mockPlaceOrder, Order } from '../shared/mockApi'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    const fetchCart = async () => {
      const items = await mockGetCart()
      setCartItems(items)
      if (items.length === 0) {
        navigate('/')
      }
    }
    fetchCart()
  }, [navigate])

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.artwork.price * item.quantity,
    0
  )

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) {
      return '请输入联系电话'
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      return '请输入正确的11位手机号'
    }
    return ''
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入收货人姓名'
    }

    const phoneError = validatePhone(formData.phone)
    if (phoneError) {
      newErrors.phone = phoneError
    }

    if (!formData.address.trim()) {
      newErrors.address = '请输入收货地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await mockPlaceOrder({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      })
      if (result) {
        setOrder(result)
        setShowSuccess(true)
      }
    } catch (error) {
      console.error('Order failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    if (name === 'phone' && value.trim()) {
      const phoneError = validatePhone(value)
      if (phoneError) {
        setErrors((prev) => ({ ...prev, phone: phoneError }))
      }
    }
  }

  const handleContinueShopping = () => {
    setShowSuccess(false)
    navigate('/')
  }

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <button className="back-btn" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回
        </button>

        <h1 className="checkout-title">结算</h1>

        <div className="checkout-content">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <h2 className="section-title">收货信息</h2>

            <div className="form-group">
              <label className="form-label">收货人</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="请输入收货人姓名"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">联系电话</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`form-input ${errors.phone ? 'error' : ''}`}
                placeholder="请输入联系电话"
              />
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">收货地址</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={`form-textarea ${errors.address ? 'error' : ''}`}
                placeholder="请输入详细收货地址"
                rows={3}
              />
              {errors.address && (
                <span className="form-error">{errors.address}</span>
              )}
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交订单'}
            </button>
          </form>

          <div className="order-summary">
            <h2 className="section-title">订单摘要</h2>
            <div className="order-items">
              {cartItems.map((item) => (
                <div key={item.artwork.id} className="order-item">
                  <img
                    src={item.artwork.thumbnail}
                    alt={item.artwork.title}
                    className="order-item-image"
                  />
                  <div className="order-item-info">
                    <p className="order-item-title">{item.artwork.title}</p>
                    <p className="order-item-qty">x{item.quantity}</p>
                  </div>
                  <p className="order-item-price">
                    ¥{(item.artwork.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="order-total">
              <span className="total-label">合计</span>
              <span className="total-value">¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && order && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="success-title">下单成功！</h2>
            <p className="success-message">感谢您的购买</p>
            <div className="order-info">
              <span className="order-label">订单号</span>
              <span className="order-number">{order.id}</span>
            </div>
            <button
              className="continue-btn"
              onClick={handleContinueShopping}
            >
              继续浏览
            </button>
          </div>
        </div>
      )}

      <style>{`
        .checkout-page {
          min-height: calc(100vh - 80px);
          background: #1a1a2e;
          padding: 40px 0;
        }

        .checkout-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          margin-bottom: 24px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .back-btn:hover {
          border-color: #c9a84c;
          color: #c9a84c;
        }

        .back-btn svg {
          width: 18px;
          height: 18px;
        }

        .checkout-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 36px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 32px 0;
        }

        .checkout-content {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .checkout-form {
          background: #2d2d44;
          border-radius: 12px;
          padding: 32px;
        }

        .section-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #e0e0e0;
          margin: 0 0 24px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
          margin-bottom: 8px;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: #1a1a2e;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease-in-out;
          box-sizing: border-box;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #c9a84c;
        }

        .form-input.error,
        .form-textarea.error {
          border-color: #e74c3c;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-error {
          display: block;
          margin-top: 6px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #e74c3c;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 24px;
          background: #c9a84c;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .submit-btn:hover:not(:disabled) {
          background: #b8963d;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .order-summary {
          background: #2d2d44;
          border-radius: 12px;
          padding: 32px;
          position: sticky;
          top: 20px;
        }

        .order-items {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 24px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .order-item:last-child {
          border-bottom: none;
        }

        .order-item-image {
          width: 60px;
          height: 45px;
          object-fit: cover;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .order-item-info {
          flex: 1;
          min-width: 0;
        }

        .order-item-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          color: #e0e0e0;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .order-item-qty {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #888;
          margin: 0;
        }

        .order-item-price {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #c9a84c;
          margin: 0;
          flex-shrink: 0;
        }

        .order-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .total-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 16px;
          color: #888;
        }

        .total-value {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #c9a84c;
        }

        .success-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .success-modal {
          width: 420px;
          max-width: 90vw;
          background: #fff;
          border-radius: 16px;
          padding: 48px 32px 32px;
          text-align: center;
          animation: scaleIn 0.3s ease;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .success-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 24px;
          background: #27ae60;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .success-icon svg {
          width: 36px;
          height: 36px;
        }

        .success-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #1a1a2e;
          margin: 0 0 8px 0;
        }

        .success-message {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: #666;
          margin: 0 0 24px 0;
        }

        .order-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(201, 168, 76, 0.08) 0%, rgba(201, 168, 76, 0.02) 100%);
          border: 2px solid rgba(201, 168, 76, 0.2);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .order-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .order-number {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #c9a84c;
          letter-spacing: 2px;
          user-select: all;
        }

        .continue-btn {
          width: 100%;
          padding: 14px;
          background: #c9a84c;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .continue-btn:hover {
          background: #b8963d;
        }

        @media (max-width: 1024px) {
          .checkout-container {
            padding: 0 24px;
          }

          .checkout-content {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .order-summary {
            position: static;
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .checkout-container {
            padding: 0 16px;
          }

          .checkout-form,
          .order-summary {
            padding: 20px;
          }

          .checkout-title {
            font-size: 28px;
          }

          .success-modal {
            width: 100%;
            max-width: 100%;
            height: 100%;
            border-radius: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 32px;
          }
        }
      `}</style>
    </div>
  )
}

export default CheckoutPage
