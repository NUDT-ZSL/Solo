import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { logoutUser, getStoredUser } from '../api/userApi'

const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getStoredUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logoutUser()
    setMobileMenuOpen(false)
    navigate('/login')
  }

  const navLinks = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/upload', label: '上传食谱', icon: '📝' }
  ]

  return (
    <>
      <nav style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'inherit'
          }}>
            <span style={{ fontSize: '28px' }}>🍳</span>
            <span style={{
              fontSize: '22px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              RecipeRadar
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: location.pathname === link.path ? '#f59e0b' : '#4b5563',
                  background: location.pathname === link.path ? '#fef3c7' : 'transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span>{link.icon}</span>
                <span style={{ '@media (max-width: 768px)': { display: 'none' } } as React.CSSProperties}>{link.label}</span>
              </Link>
            ))}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '14px'
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    color: '#6b7280',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: '#f59e0b',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#d97706' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f59e0b' }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </nav>

      <nav style={{
        display: 'none',
        '@media (max-width: 768px)': {
          display: 'flex'
        } as React.CSSProperties,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '8px 0 12px',
        zIndex: 100,
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {[
          { path: '/', label: '首页', icon: '🏠' },
          { path: '/upload', label: '上传', icon: '📝' },
          user
            ? { path: '#', label: user.username.charAt(0).toUpperCase(), icon: '👤', action: handleLogout }
            : { path: '/login', label: '登录', icon: '🔐' }
        ].map((item, idx) => (
          item.action ? (
            <button key={idx} onClick={item.action} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 16px',
              fontSize: '10px',
              color: '#6b7280'
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ) : (
            <Link key={idx} to={item.path as string} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 16px',
              textDecoration: 'none',
              fontSize: '10px',
              color: location.pathname === item.path ? '#f59e0b' : '#6b7280'
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        ))}
      </nav>
    </>
  )
}

export default Navbar
