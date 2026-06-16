import { Link } from 'react-router-dom'
import { Sprout, Star } from 'lucide-react'
import { useGardenStore } from '@/store/gardenStore'

export default function Navbar() {
  const user = useGardenStore((s) => s.user)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-garden-nav shadow-md flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Sprout className="h-6 w-6 text-white" />
        <span className="text-white font-bold text-lg">阳光社区菜园</span>
      </div>

      {user ? (
        <Link
          to="/profile"
          className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl hidden sm:inline">{user.avatar}</span>
          <span className="hidden sm:inline text-sm">{user.username}</span>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-300" />
            <span className="text-sm hidden sm:inline">积分: {user.points}</span>
            <span className="text-sm sm:hidden">{user.points}</span>
          </div>
          <span className="text-2xl sm:hidden">{user.avatar}</span>
        </Link>
      ) : (
        <Link
          to="/login"
          className="text-white hover:opacity-80 transition-opacity text-sm"
        >
          登录
        </Link>
      )}
    </nav>
  )
}
