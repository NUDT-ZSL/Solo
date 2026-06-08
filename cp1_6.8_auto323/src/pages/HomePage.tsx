import { useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore } from "@/stores/useStore"
import ScentBottleCard from "@/components/ScentBottle"
import { Plus, Flame, User, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

export default function HomePage() {
  const { driftBottles, isLoading, fetchDriftBottles, resonateBottle, passBottle, removeDriftBottle } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDriftBottles()
  }, [fetchDriftBottles])

  const handleResonate = useCallback(
    async (bottleId: string) => {
      const desc = "这让我想起了某个温暖的瞬间"
      const emoji = "✨"
      await resonateBottle(bottleId, desc, emoji)
    },
    [resonateBottle]
  )

  const handlePass = useCallback(
    async (bottleId: string) => {
      await passBottle(bottleId)
      removeDriftBottle(bottleId)
    },
    [passBottle, removeDriftBottle]
  )

  return (
    <div className="min-h-screen bg-gradient-forest">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-forest-50/70 border-b border-forest-200/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display text-2xl text-warm-800 tracking-wide">
            🫧 气味漂流瓶
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              to="/hot"
              className="nav-link text-warm-600 hover:text-warm-800 text-sm font-medium flex items-center gap-1"
            >
              <Flame className="w-4 h-4" />
              <span className="hidden sm:inline">热门</span>
            </Link>
            <Link
              to="/publish"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full
                bg-forest-500/90 hover:bg-forest-600 text-white text-sm font-medium
                transition-all duration-200 shadow-glass hover:shadow-glass-hover
                active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">投瓶</span>
            </Link>
            <Link
              to="/profile"
              className="nav-link text-warm-600 hover:text-warm-800 text-sm font-medium flex items-center gap-1"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">我的</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-lg text-warm-600"
          >
            漂流而来的气味，等待有缘人拾取
          </motion.p>
        </div>

        {isLoading && driftBottles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card-static p-6">
                <div className="skeleton h-8 w-8 rounded-full mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-3/4 mb-4" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : driftBottles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-6xl mb-4">🌫️</p>
            <p className="text-warm-500 text-lg mb-2">海上漂来了薄雾…</p>
            <p className="text-warm-400 text-sm mb-6">此刻没有漂流瓶，试试投一个？</p>
            <Link
              to="/publish"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                bg-forest-500/90 hover:bg-forest-600 text-white font-medium
                transition-all duration-200 shadow-glass"
            >
              <Plus className="w-5 h-5" />
              投一个瓶子
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {driftBottles.map((bottle, index) => (
                <ScentBottleCard
                  key={bottle.id}
                  bottle={bottle}
                  onResonate={handleResonate}
                  onPass={handlePass}
                  index={index}
                />
              ))}
            </div>

            <div className="text-center mt-10">
              <button
                onClick={fetchDriftBottles}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                  glass-card-static hover:shadow-glass-hover text-warm-600 text-sm font-medium
                  transition-all duration-300 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                换一批漂流瓶
              </button>
            </div>
          </>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-md bg-forest-50/80 border-t border-forest-200/30 md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 text-forest-600">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px]">漂流</span>
          </Link>
          <Link
            to="/publish"
            className="flex flex-col items-center gap-0.5 bg-forest-500 text-white w-12 h-12 rounded-full -mt-4 shadow-glass justify-center"
          >
            <Plus className="w-5 h-5" />
          </Link>
          <Link to="/hot" className="flex flex-col items-center gap-0.5 text-warm-500">
            <Flame className="w-5 h-5" />
            <span className="text-[10px]">热门</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-0.5 text-warm-500">
            <User className="w-5 h-5" />
            <span className="text-[10px]">我的</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
