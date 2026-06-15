import { useState, useEffect } from 'react'
import AromaWheel from './components/AromaWheel'
import MixPanel from './components/MixPanel'
import PerfumeCard from './components/PerfumeCard'
import type { Aroma, SelectedAroma, MixResult, Recipe } from './types'
import { mixPerfume, rgbToHex, generatePerfumeName } from './utils/mixAlgorithm'
import './App.css'

export default function App() {
  const [aromas, setAromas] = useState<Aroma[]>([])
  const [selectedAromas, setSelectedAromas] = useState<SelectedAroma[]>([])
  const [mixResult, setMixResult] = useState<MixResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/aromas')
      .then((r) => r.json())
      .then((data: Aroma[]) => {
        setAromas(data)
        setLoading(false)
      })
      .catch(() => {
        console.error('Failed to load aromas')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((data: Recipe[]) => setRecipes(data))
      .catch(() => console.error('Failed to load recipes'))
  }, [showModal])

  const handleSelectAroma = (aroma: Aroma) => {
    if (selectedAromas.some((s) => s.aroma.id === aroma.id)) return
    const equalRatio = selectedAromas.length === 0 ? 1 : 1 / (selectedAromas.length + 1)
    const newAromas: SelectedAroma[] = [
      ...selectedAromas.map((s) => ({ ...s, ratio: equalRatio })),
      { aroma, ratio: equalRatio },
    ]
    setSelectedAromas(newAromas)
    setMixResult(null)
  }

  const handleRemoveAroma = (aromaId: number) => {
    const filtered = selectedAromas.filter((s) => s.aroma.id !== aromaId)
    if (filtered.length > 0) {
      const total = filtered.reduce((sum, s) => sum + s.ratio, 0)
      const normalized = filtered.map((s) => ({ ...s, ratio: s.ratio / total }))
      setSelectedAromas(normalized)
    } else {
      setSelectedAromas([])
    }
    setMixResult(null)
  }

  const handleUpdateRatio = (aromaId: number, ratio: number) => {
    const idx = selectedAromas.findIndex((s) => s.aroma.id === aromaId)
    if (idx === -1) return
    const updated = [...selectedAromas]
    updated[idx] = { ...updated[idx], ratio }
    const total = updated.reduce((sum, s) => sum + s.ratio, 0)
    const normalized = updated.map((s) => ({ ...s, ratio: s.ratio / total }))
    setSelectedAromas(normalized)
    setMixResult(null)
  }

  const handleMix = () => {
    if (selectedAromas.length === 0) return
    const startTime = performance.now()
    const rgb = mixPerfume(selectedAromas)
    const elapsed = performance.now() - startTime
    console.log(`混合计算耗时: ${elapsed.toFixed(2)}ms`)
    const name = generatePerfumeName(selectedAromas)
    setMixResult({ color: rgbToHex(rgb), rgb, name })
    setShowModal(true)
  }

  const handleReset = () => {
    setSelectedAromas([])
    setMixResult(null)
    setShowModal(false)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">加载香味数据中...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="app-logo-icon"
          >
            <path d="M9 3h6l-1 5h2a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1h2L9 3z" />
          </svg>
          <h1 className="app-title">虚拟调香师</h1>
        </div>
        <p className="app-subtitle">探索香氛的艺术</p>
      </header>

      <main className="app-main">
        <div className="app-content">
          <div className="app-wheel-section">
            <AromaWheel
              aromas={aromas}
              selectedAromas={selectedAromas.map((s) => s.aroma)}
              onSelectAroma={handleSelectAroma}
            />
          </div>

          <div className="app-panel-section">
            <MixPanel
              selectedAromas={selectedAromas}
              onUpdateRatio={handleUpdateRatio}
              onRemoveAroma={handleRemoveAroma}
              onMix={handleMix}
              onReset={handleReset}
            />
          </div>
        </div>

        {recipes.length > 0 && (
          <section className="recipes-section">
            <div className="recipes-header">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <h2 className="recipes-title">已保存的配方</h2>
            </div>
            <div className="recipes-grid">
              {recipes.map((recipe) => {
                const totalRatio = recipe.aromas.reduce((sum, a) => sum + a.ratio, 0)
                return (
                  <div key={recipe.id} className="recipe-card">
                    <h3 className="recipe-name">「{recipe.name}」</h3>
                    <div className="recipe-gradient">
                      {recipe.aromas.map((a, i) => (
                        <div
                          key={i}
                          className="recipe-gradient-segment"
                          style={{
                            background: a.color,
                            width: `${(a.ratio / totalRatio) * 100}%`,
                            minWidth: 8,
                          }}
                        />
                      ))}
                    </div>
                    <div className="recipe-tags">
                      {recipe.aromas.map((a, i) => (
                        <span
                          key={i}
                          className="recipe-tag"
                          style={{ background: a.color + '33', color: '#5d4037' }}
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                    <div className="recipe-date">
                      {new Date(recipe.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <PerfumeCard
        mixResult={mixResult}
        showModal={showModal}
        onClose={handleCloseModal}
        selectedAromas={selectedAromas}
      />
    </div>
  )
}
