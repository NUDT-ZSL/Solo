import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Music } from 'lucide-react'

const navItems = [
  { path: '/teacher', label: '教师' },
  { path: '/student', label: '学生' },
  { path: '/parent', label: '家长' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  function isActive(path: string): boolean {
    return location.pathname === path
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white"
      style={{ height: '64px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <div
        className="h-full flex items-center justify-between px-4 md:px-6"
        style={{ maxWidth: '80%', margin: '0 auto' }}
      >
        <div className="flex items-center gap-2">
          <Music size={24} color="#4A90D9" />
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#333' }}>
            音教管理系统
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                isActive(item.path)
                  ? { backgroundColor: '#4A90D9', color: '#fff' }
                  : { color: '#666' }
              }
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = '#F0F4F8'
                  e.currentTarget.style.color = '#333'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#666'
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="切换菜单"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-down shadow-lg">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="block px-6 py-3 text-sm font-medium transition-colors"
                style={
                  active
                    ? { backgroundColor: '#4A90D9', color: '#fff' }
                    : { color: '#666' }
                }
              >
                {item.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </nav>
  )
}
