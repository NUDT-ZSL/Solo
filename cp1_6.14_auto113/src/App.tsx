import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from '@/pages/Home'
import Habits from '@/pages/Habits'
import Stats from '@/pages/Stats'
import { Flame, ListChecks, BarChart3, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: '首页', icon: Flame },
  { to: '/habits', label: '习惯', icon: ListChecks },
  { to: '/stats', label: '统计', icon: BarChart3 },
]

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#f0f2f5]">
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6c5ce7, #00b894)' }}>
                <Flame size={16} className="text-white" />
              </div>
              <span className="font-bold text-gray-800 text-sm tracking-wide">HabitForge</span>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'text-[#6c5ce7] bg-[#6c5ce7]/10'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
