import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Music } from 'lucide-react'

const navItems = [
  { path: '/teacher', label: '教师', icon: Music },
  { path: '/student', label: '学生', icon: Music },
  { path: '/parent', label: '家长', icon: Music },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white"
      style={{ height: '64px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <div className="mx-auto h-full flex items-center justify-between px-6"
        style={{ maxWidth: '80%', margin: '0 auto' }}
      >
        <div className="flex items-center gap-2">
          <Music size={24} color="#4A90D9" />
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#333' }}>
            音教管理系统
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: '#4A90D9' }
                  : {}
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-down">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: '#4A90D9' }
                  : {}
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
