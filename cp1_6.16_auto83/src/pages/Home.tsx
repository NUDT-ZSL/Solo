import { useEffect, useMemo } from 'react'
import { useGameStore, type Genre } from '@/stores/gameStore'
import { useScoreStore } from '@/stores/scoreStore'
import GameCard from '@/components/GameCard'

const GENRES: Genre[] = ['全部', '动作', '解谜', '模拟', '角色扮演']

export default function Home() {
  const { games, genre, setGenre, fetchGames } = useGameStore()
  const { syncScoresFromGames } = useScoreStore()

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  useEffect(() => {
    if (games.length > 0) {
      syncScoresFromGames()
    }
  }, [games, syncScoresFromGames])

  const filteredGames = useMemo(() => {
    if (genre === '全部') return games
    return games.filter((g) => g.genre === genre)
  }, [games, genre])

  return (
    <div className="min-h-screen" style={{ background: '#1E1E2E' }}>
      <header className="sticky top-0 z-30" style={{ background: 'rgba(30,30,46,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(52,73,94,0.5)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold" style={{ color: '#ECF0F1' }}>
              <span style={{ color: '#E74C3C' }}>独立游戏</span>工坊
            </h1>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className="px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderRadius: '20px',
                    background: genre === g ? '#E74C3C' : '#7F8C8D',
                    color: '#fff',
                    transition: 'background 0.2s ease, transform 0.2s ease',
                    transform: genre === g ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {filteredGames.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg" style={{ color: '#7F8C8D' }}>
              暂无该类型的游戏
            </p>
          </div>
        ) : (
          <div
            className="masonry-grid"
            style={{
              columnCount: 'auto',
              columnWidth: '280px',
              columnGap: '20px',
            }}
          >
            {filteredGames.map((game) => (
              <div key={game.id} className="break-inside-avoid mb-5">
                <GameCard game={game} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
