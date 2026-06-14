import { Link, useLocation } from 'react-router-dom'
import { Home, Plus, Refrigerator, User, ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/publish', icon: Plus, label: '发布' },
  { to: '/fridge', icon: Refrigerator, label: '冰箱' },
  { to: '/profile', icon: User, label: '我的' },
]

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl">
          <ChefHat size={28} className="text-primary" />
          <span>家庭厨房</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
