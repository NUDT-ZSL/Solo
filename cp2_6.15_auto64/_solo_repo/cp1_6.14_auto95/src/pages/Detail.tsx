import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecipeById } from '../http'
import type { Recipe, TimerItem } from '../types'

function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [cookingMode, setCookingMode] = useState(false)
  const [servings, setServings] = useState(1)
  const [timers, setTimers] = useState<TimerItem[]>([])
  const timerRefs = useRef<Record<string, number | null>>({})

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const data = await getRecipeById(id)
        setRecipe(data)
        setServings(data.servings || 1)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach((t) => t && clearInterval(t))
    }
  }, [])

  const parseAmount = (raw: string) => {
    const m = raw.match(/^([\d.]+)\s*(.*)$/)
    if (!m) return { num: 1, unit: raw }
    return { num: parseFloat(m[1]), unit: m[2].trim() }
  }

  const formatAmount = (orig: string, factor: number) => {
    const { num, unit } = parseAmount(orig)
    const result = num * factor
    const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(1).replace(/\.0$/, '')
    return `${formatted}${unit ? ' ' + unit : ''}`
  }

  const adjustServings = (delta: number) => {
    setServings((prev) => Math.max(1, prev + delta))
  }

  const addTimerFromStep = (stepId: string, text: string, durationMin: number) => {
    if (durationMin <= 0) return
    const tid = `t_${Date.now()}_${stepId}`
    const timer: TimerItem = {
      id: tid,
      label: text,
      duration: durationMin * 60,
      remaining: durationMin * 60,
      running: false,
      finished: false,
    }
    setTimers((prev) => [...prev, timer])
  }

  const toggleTimer = (tid: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t
        return { ...t, running: !t.running, finished: false }
      })
    )
  }

  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.running && !timerRefs.current[timer.id]) {
        timerRefs.current[timer.id] = window.setInterval(() => {
          setTimers((prev) =>
            prev.map((t) => {
              if (t.id !== timer.id || !t.running) return t
              if (t.remaining <= 100) {
                const intervalId = timerRefs.current[t.id]
                if (intervalId) {
                  clearInterval(intervalId)
                  timerRefs.current[t.id] = null
                }
                return { ...t, remaining: 0, running: false, finished: true }
              }
              return { ...t, remaining: t.remaining - 100 }
            })
          )
        }, 100)
      } else if (!timer.running && timerRefs.current[timer.id]) {
        clearInterval(timerRefs.current[timer.id]!)
        timerRefs.current[timer.id] = null
      }
    })
  }, [timers.map((t) => t.id + ':' + t.running).join(',')])

  const resetTimer = (tid: string) => {
    const intervalId = timerRefs.current[tid]
    if (intervalId) {
      clearInterval(intervalId)
      timerRefs.current[tid] = null
    }
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t
        return { ...t, remaining: t.duration, running: false, finished: false }
      })
    )
  }

  const removeTimer = (tid: string) => {
    const intervalId = timerRefs.current[tid]
    if (intervalId) clearInterval(intervalId)
    delete timerRefs.current[tid]
    setTimers((prev) => prev.filter((t) => t.id !== tid))
  }

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (loading) {
    return <div style={styles.loading}>加载中...</div>
  }
  if (!recipe) {
    return (
      <div style={styles.loading}>
        <p style={{ marginBottom: 16 }}>菜谱不存在</p>
        <button onClick={() => navigate('/')} style={styles.backBtn}>返回首页</button>
      </div>
    )
  }

  const factor = servings / (recipe.servings || 1)

  return (
    <div>
      <button onClick={() => navigate('/')} style={styles.backBtn}>
        ← 返回列表
      </button>

      <div style={styles.detailHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.bigImageBox}>
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.name} style={styles.bigImage} />
            ) : (
              <div style={{ ...styles.bigImage, backgroundColor: '#f0ebe1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 80 }}>🍽️</span>
              </div>
            )}
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h1 style={styles.title}>{recipe.name}</h1>
              <div style={styles.tagRow}>
                {recipe.tags.map((t, i) => (
                  <span key={i} style={styles.tag}>#{t}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setCookingMode(true)}
              style={styles.startBtn}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c18a5e')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d4a373')}
            >
              开始烹饪
            </button>
          </div>
          <p style={styles.desc}>{recipe.description}</p>
        </div>
      </div>

      {cookingMode ? (
        <div style={styles.cookingLayout}>
          <div style={styles.ingredientsPanel}>
            <div style={styles.panelTitleRow}>
              <h2 style={styles.panelTitle}>配料表</h2>
              <div style={styles.servingControl}>
                <span style={{ color: '#8d7b68', fontSize: 14, marginRight: 10 }}>份数:</span>
                <button
                  onClick={() => adjustServings(-1)}
                  style={styles.roundBtn}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  −
                </button>
                <span style={styles.servingNum}>{servings}</span>
                <button
                  onClick={() => adjustServings(1)}
                  style={styles.roundBtn}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  +
                </button>
              </div>
            </div>
            <div style={styles.ingredientList}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={styles.ingredientRow}>
                  <span style={styles.ingredientName}>{ing.name}</span>
                  <span style={styles.ingredientAmount}>{formatAmount(ing.amount, factor)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.timerPanel}>
            <h2 style={styles.panelTitle}>烹饪计时器</h2>
            {recipe.steps.map((step) => (
              <div key={step.id} style={styles.stepRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.stepText}>{step.text}</div>
                  {step.duration > 0 && (
                    <div style={styles.stepMeta}>⏱ 约 {step.duration} 分钟</div>
                  )}
                </div>
                {step.duration > 0 && !timers.some((t) => t.label === step.text) && (
                  <button
                    onClick={() => addTimerFromStep(step.id, step.text, step.duration)}
                    style={styles.addTimerBtn}
                  >
                    + 添加计时
                  </button>
                )}
              </div>
            ))}

            {timers.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2d2a24', marginBottom: 16 }}>
                  运行中的计时器
                </h3>
                {timers.map((timer) => {
                  const progress = ((timer.duration - timer.remaining) / timer.duration) * 100
                  return (
                    <div
                      key={timer.id}
                      style={{
                        ...styles.timerCard,
                        animation: timer.finished ? 'shake 0.5s ease-in-out' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, color: '#8d7b68', fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {timer.label}
                        </span>
                        <button
                          onClick={() => removeTimer(timer.id)}
                          style={{ background: 'none', fontSize: 16, color: '#aaa', padding: '0 4px' }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ ...styles.timerCount, color: timer.finished ? '#d4a373' : '#2d2a24' }}>
                        {formatTime(timer.remaining)}
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${Math.min(100, progress)}%` }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        <button
                          onClick={() => toggleTimer(timer.id)}
                          style={timer.running ? styles.pauseBtn : styles.playBtn}
                        >
                          {timer.running ? '⏸ 暂停' : '▶ 开始'}
                        </button>
                        <button onClick={() => resetTimer(timer.id)} style={styles.resetBtn}>
                          ↻ 重置
                        </button>
                      </div>
                      {timer.finished && (
                        <div style={styles.finishedTip}>
                          ⏰ 时间到！
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.normalContent}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>配料 ({recipe.ingredients.length})</h2>
            <div style={styles.simpleIngredientGrid}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={styles.ingredientChip}>
                  <span style={{ color: '#2d2a24', fontWeight: 500 }}>{ing.name}</span>
                  <span style={{ color: '#8d7b68', marginLeft: 8 }}>{ing.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>步骤 ({recipe.steps.length})</h2>
            <ol style={styles.stepList}>
              {recipe.steps.map((step, i) => (
                <li key={step.id} style={styles.stepListItem}>
                  <div style={styles.stepIndex}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: '#2d2a24' }}>{step.text}</p>
                    {step.duration > 0 && (
                      <p style={{ fontSize: 13, color: '#8d7b68', marginTop: 6 }}>⏱ 约 {step.duration} 分钟</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    textAlign: 'center',
    padding: 80,
    color: '#8d7b68',
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#8d7b68',
    fontSize: 14,
    padding: '8px 14px',
    borderRadius: 8,
    marginBottom: 20,
    transition: 'all 0.2s',
  },
  detailHeader: {
    display: 'flex',
    gap: 32,
    marginBottom: 40,
  },
  headerLeft: {
    flex: '0 0 48%',
  },
  bigImageBox: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
  },
  bigImage: {
    width: '100%',
    height: 320,
    objectFit: 'cover',
    display: 'block',
  },
  headerRight: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 32,
    color: '#2d2a24',
    fontWeight: 700,
    marginBottom: 14,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    display: 'inline-block',
    borderRadius: 16,
    backgroundColor: '#e8e2d9',
    padding: '4px 12px',
    fontSize: 12,
    color: '#8d7b68',
    fontWeight: 500,
  },
  startBtn: {
    width: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d4a373',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
  },
  desc: {
    fontSize: 15,
    color: '#7a7368',
    lineHeight: 1.8,
    marginTop: 8,
  },
  normalContent: {
    display: 'flex',
    gap: 32,
    flexDirection: 'column',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 22,
    color: '#2d2a24',
    fontWeight: 600,
    marginBottom: 20,
  },
  simpleIngredientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  ingredientChip: {
    backgroundColor: '#faf7f2',
    padding: '10px 16px',
    borderRadius: 10,
    fontSize: 14,
    display: 'flex',
    justifyContent: 'space-between',
  },
  stepList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  stepListItem: {
    display: 'flex',
    gap: 16,
    padding: 16,
    backgroundColor: '#faf7f2',
    borderRadius: 12,
  },
  stepIndex: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#d4a373',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  cookingLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  ingredientsPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  timerPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  panelTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  panelTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 22,
    color: '#2d2a24',
    fontWeight: 600,
  },
  servingControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  roundBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: '#f0ebe1',
    color: '#2d2a24',
    fontSize: 16,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
    lineHeight: 1,
  },
  servingNum: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: '#2d2a24',
  },
  ingredientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  ingredientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 12px',
    borderBottom: '1px solid #f0ebe1',
  },
  ingredientName: {
    fontSize: 15,
    color: '#2d2a24',
    fontWeight: 500,
  },
  ingredientAmount: {
    fontSize: 15,
    color: '#d4a373',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    backgroundColor: '#faf7f2',
    borderRadius: 10,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 14,
    color: '#2d2a24',
    lineHeight: 1.5,
  },
  stepMeta: {
    fontSize: 12,
    color: '#8d7b68',
    marginTop: 4,
  },
  addTimerBtn: {
    backgroundColor: '#d4a373',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
    transition: 'background-color 0.2s',
  },
  timerCard: {
    backgroundColor: '#faf7f2',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    border: '1px solid #e8e2d9',
  },
  timerCount: {
    fontFamily: 'monospace',
    fontSize: 48,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: 2,
    margin: '8px 0 12px',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e8e2d9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4a373',
    borderRadius: 3,
    transition: 'width 0.1s linear',
  },
  playBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#d4a373',
    color: '#fff',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  pauseBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#8d7b68',
    color: '#fff',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
  },
  resetBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#f0ebe1',
    color: '#2d2a24',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
  },
  finishedTip: {
    marginTop: 12,
    padding: '10px 14px',
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    color: '#d4a373',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease-out',
  },
}

export default Detail
