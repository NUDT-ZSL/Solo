import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const AuthModule = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openModal = () => {
    setShowModal(true)
    setIsLogin(true)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
  }

  const handleProfileClick = () => {
    setShowDropdown(false)
    navigate('/profile')
  }

  const handleLogout = async () => {
    setShowDropdown(false)
    await logout()
    navigate('/')
  }

  if (!user) {
    return (
      <>
        <button className="login-btn" onClick={openModal}>
          登录
        </button>

        {showModal && (
          <AuthModal
            isLogin={isLogin}
            onClose={closeModal}
            onToggleMode={toggleMode}
          />
        )}

        <style>{`
          .login-btn {
            padding: 8px 20px;
            background: transparent;
            border: 1px solid #c9a84c;
            border-radius: 999px;
            color: #c9a84c;
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
          }

          .login-btn:hover {
            background: #c9a84c;
            color: #1a1a2e;
          }
        `}</style>
      </>
    )
  }

  return (
    <div className="user-menu" ref={dropdownRef}>
      <button
        className="user-avatar-btn"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <img
          src={user.avatar}
          alt={user.nickname}
          className="user-avatar"
        />
        <span className="user-nickname">{user.nickname}</span>
        <svg
          className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {showDropdown && (
        <div className="dropdown-menu">
          <button className="dropdown-item" onClick={handleProfileClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人中心
          </button>
          <button className="dropdown-item logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出登录
          </button>
        </div>
      )}

      <style>{`
        .user-menu {
          position: relative;
        }

        .user-avatar-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 6px;
          background: #2d2d44;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }

        .user-avatar-btn:hover {
          background: #3d3d5c;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #c9a84c;
        }

        .user-nickname {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
        }

        .dropdown-arrow {
          width: 16px;
          height: 16px;
          color: #888;
          transition: transform 0.2s ease;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 160px;
          background: #2d2d44;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          z-index: 50;
          animation: dropdownFadeIn 0.2s ease;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: #e0e0e0;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease;
        }

        .dropdown-item:hover {
          background: #3d3d5c;
        }

        .dropdown-item.logout {
          color: #e74c3c;
        }

        .dropdown-item svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  )
}

interface AuthModalProps {
  isLogin: boolean
  onClose: () => void
  onToggleMode: () => void
}

const AuthModal = ({ isLogin, onClose, onToggleMode }: AuthModalProps) => {
  const { login, register } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (apiError) {
      setApiError('')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入正确的邮箱格式'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少6位'
    }

    if (!isLogin && !formData.nickname.trim()) {
      newErrors.nickname = '请输入昵称'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setApiError('')

    try {
      if (isLogin) {
        const success = await login(formData.email, formData.password)
        if (success) {
          onClose()
        } else {
          setApiError('登录失败，请检查邮箱和密码')
        }
      } else {
        const success = await register(
          formData.email,
          formData.password,
          formData.nickname
        )
        if (success) {
          onClose()
        } else {
          setApiError('注册失败，请重试')
        }
      }
    } catch {
      setApiError('网络错误，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 className="modal-title">{isLogin ? '登录' : '注册'}</h2>
        <p className="modal-subtitle">
          {isLogin ? '欢迎回来' : '创建新账户'}
        </p>

        {apiError && <div className="api-error">{apiError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">昵称</label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                className={`form-input ${errors.nickname ? 'error' : ''}`}
                placeholder="请输入昵称"
              />
              {errors.nickname && (
                <span className="form-error">{errors.nickname}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="请输入邮箱"
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="请输入密码"
            />
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '请稍候...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="mode-switch">
          <span>{isLogin ? '还没有账户？' : '已有账户？'}</span>
          <button type="button" className="switch-btn" onClick={onToggleMode}>
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .auth-modal {
          position: relative;
          width: 400px;
          max-width: 90vw;
          background: #fff;
          border-radius: 12px;
          padding: 32px;
          animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .modal-close-btn:hover {
          color: #333;
        }

        .modal-close-btn svg {
          width: 20px;
          height: 20px;
        }

        .modal-title {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 8px 0;
        }

        .modal-subtitle {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: #888;
          margin: 0 0 24px 0;
        }

        .api-error {
          padding: 12px;
          background: rgba(231, 76, 60, 0.1);
          border-radius: 8px;
          color: #e74c3c;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 6px;
        }

        .form-input {
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: #333;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .form-input:focus {
          border-color: #c9a84c;
        }

        .form-input.error {
          border-color: #e74c3c;
        }

        .form-error {
          margin-top: 4px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
          color: #e74c3c;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 8px;
          background: #c9a84c;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #b8963d;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mode-switch {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 20px;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          color: #666;
        }

        .switch-btn {
          background: none;
          border: none;
          color: #c9a84c;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease;
        }

        .switch-btn:hover {
          color: #b8963d;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .auth-modal {
            width: 100%;
            max-width: 100%;
            height: 100%;
            border-radius: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 24px;
          }
        }
      `}</style>
    </div>
  )
}

export default AuthModule
