import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: '总览', path: '/overview' },
  { label: '我的档案', path: '/profile' },
  { label: '管理面板', path: '/admin' },
]

export default function Navbar() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#1e293b] text-white flex items-center justify-between px-6">
      <Link to="/" className="text-lg font-bold tracking-wide">
        设备共享站
      </Link>

      <div className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className="relative pb-1 text-sm transition-colors hover:text-blue-400"
            >
              {link.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    background: 'linear-gradient(90deg, #3b82f6, #3b82f6)',
                  }}
                />
              )}
            </Link>
          )
        })}
      </div>

      <button
        className="md:hidden text-white"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {menuOpen && (
        <div className="absolute top-[60px] left-0 right-0 bg-[#1e293b] border-t border-white/10 flex flex-col md:hidden">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-6 py-3 text-sm transition-colors hover:text-blue-400 ${
                  isActive ? 'text-blue-400' : 'text-white'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
