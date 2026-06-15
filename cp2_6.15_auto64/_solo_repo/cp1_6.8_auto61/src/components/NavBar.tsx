import { useNavigate, useLocation } from 'react-router-dom'
import { Waves, User } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', label: '气味海洋', icon: Waves },
  { path: '/my', label: '我的瓶子', icon: User },
]

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="navbar">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = location.pathname === item.path
        return (
          <button
            key={item.path}
            className={`navbar-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
            <span className="navbar-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
