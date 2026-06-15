import { useEffect, useState } from 'react'
import AromaWheel from '@/components/AromaWheel'
import MixPanel from '@/components/MixPanel'
import PerfumeCard from '@/components/PerfumeCard'
import { usePerfumeStore } from '@/stores/perfumeStore'
import { BookOpen, FlaskConical } from 'lucide-react'

interface SavedRecipe {
  id: number
  name: string
  created_at: string
  aromas: { aroma_id: number; name: string; color: string; ratio: number }[]
}

export default function Home() {
  const { aromas, setAromas } = usePerfumeStore()
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])

  useEffect(() => {
    fetch('/api/aromas')
      .then((r) => r.json())
      .then((data) => setAromas(data))
      .catch(() => {
        console.error('Failed to load aromas')
      })
  }, [setAromas])

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data) => setRecipes(data))
      .catch(() => {
        console.error('Failed to load recipes')
      })
  }, [])

  if (aromas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fff8f0' }}>
        <div className="text-amber-600 animate-pulse">加载香味数据中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#fff8f0' }}>
      <header
        className="py-6 px-8 flex items-center justify-between"
        style={{ borderBottom: '1px solid #e0c8a0' }}
      >
        <div className="flex items-center gap-3">
          <FlaskConical size={28} className="text-amber-700" />
          <h1 className="text-3xl font-serif text-amber-800 tracking-wider">
            虚拟调香师
          </h1>
        </div>
        <p className="text-sm text-amber-600 font-serif">探索香氛的艺术</p>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0">
            <AromaWheel />
          </div>

          <div
            className="flex-shrink-0 p-6 self-stretch"
            style={{
              width: 300,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e0c8a0',
              boxShadow: '0 2px 12px rgba(224,200,160,0.15)',
            }}
          >
            <MixPanel />
          </div>
        </div>

        {recipes.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={20} className="text-amber-700" />
              <h2 className="text-xl font-serif text-amber-800">已保存的配方</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="p-4"
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e0c8a0',
                  }}
                >
                  <h3 className="font-serif text-amber-900 font-medium mb-2">
                    「{recipe.name}」
                  </h3>
                  <div className="flex gap-1 mb-2">
                    {recipe.aromas.map((a, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full"
                        style={{
                          background: a.color,
                          width: `${a.ratio * 100}%`,
                          minWidth: 8,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recipe.aromas.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: a.color + '33',
                          color: '#5d4037',
                        }}
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-amber-400 mt-2">
                    {new Date(recipe.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <PerfumeCard />
    </div>
  )
}
