import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Diary, hslToString, EMOTIONS } from '../types'
import EmotionParticle, { EmotionParticleHandle } from './EmotionParticle'

interface TimelineProps {
  diaries: Diary[]
}

const CAPSULE_HEIGHT = 120
const CARD_EXTRA_HEIGHT = 420
const EXTRA_ITEMS = 3

function Timeline({ diaries }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set())
  const [replayMap, setReplayMap] = useState<Map<string, number>>(new Map())
  const particleRefs = useRef<Map<string, React.RefObject<EmotionParticleHandle>>>(new Map())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerHeight(el.clientHeight)
    const ro = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const expandedHeightMap = useMemo(() => {
    const map = new Map<string, number>()
    diaries.forEach(d => {
      const contentHeight = Math.max(60, Math.ceil(d.content.length / 22) * 25 + 20)
      map.set(d.id, expandedId === d.id ? CARD_EXTRA_HEIGHT + contentHeight : 0)
    })
    return map
  }, [diaries, expandedId])

  const itemOffsets = useMemo(() => {
    const offsets: number[] = []
    let acc = 40
    diaries.forEach(d => {
      offsets.push(acc)
      acc += CAPSULE_HEIGHT + (expandedHeightMap.get(d.id) || 0)
    })
    return { offsets, totalHeight: acc + 60 }
  }, [diaries, expandedHeightMap])

  const visibleRange = useMemo(() => {
    if (containerHeight === 0) return { start: 0, end: Math.min(diaries.length, 10) }
    const start = Math.max(0, itemOffsets.offsets.findIndex(o => o + CAPSULE_HEIGHT >= scrollTop - 200) - EXTRA_ITEMS)
    let endIdx = diaries.length
    for (let i = 0; i < diaries.length; i++) {
      if (itemOffsets.offsets[i] > scrollTop + containerHeight + 200) {
        endIdx = i + EXTRA_ITEMS
        break
      }
    }
    return {
      start: Math.max(0, start),
      end: Math.min(diaries.length, endIdx),
    }
  }, [scrollTop, containerHeight, itemOffsets.offsets, diaries.length])

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  const getGradientLine = (d1: Diary, d2: Diary, height: number) => {
    const c1 = hslToString(d1.hue, d1.saturation, d1.lightness, 0.7)
    const c2 = hslToString(d2.hue, d2.saturation, d2.lightness, 0.7)
    return (
      <div style={{
        position: 'absolute',
        left: '60px',
        width: '2px',
        height: `${height}px`,
        top: CAPSULE_HEIGHT,
        background: `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow: `0 0 8px ${c1}, 0 0 12px ${c2}`,
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
          animation: 'flowLine 3s linear infinite',
        }} />
      </div>
    )
  }

  const renderStars = (value: number) => {
    const stars: JSX.Element[] = []
    for (let i = 1; i <= 5; i++) {
      let fill: 'full' | 'half' | 'empty' = 'empty'
      if (value >= i) fill = 'full'
      else if (value >= i - 0.5) fill = 'half'
      stars.push(
        <span key={i} style={{ fontSize: '16px', display: 'inline-block', marginRight: '1px' }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>★</span>
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              overflow: 'hidden',
              width: fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%',
              color: '#ffd369',
              textShadow: '0 0 6px rgba(255,211,105,0.7)',
            }}>★</span>
          </span>
        </span>
      )
    }
    return stars
  }

  const handleReplay = (diaryId: string) => {
    const ref = particleRefs.current.get(diaryId)
    if (ref && ref.current) {
      ref.current.replay()
    }
    setReplayMap(prev => {
      const next = new Map(prev)
      next.set(diaryId, Date.now())
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
    if (!animatedIds.has(id)) {
      setAnimatedIds(prev => new Set(prev).add(id))
    }
  }

  useEffect(() => {
    if (diaries.length > 0) {
      const timer = setTimeout(() => {
        const initial = new Set<string>()
        diaries.slice(0, Math.min(12, diaries.length)).forEach(d => initial.add(d.id))
        setAnimatedIds(initial)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [diaries])

  useEffect(() => {
    const toAnimate = new Set<string>(animatedIds)
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      if (diaries[i]) toAnimate.add(diaries[i].id)
    }
    if (toAnimate.size !== animatedIds.size) {
      setAnimatedIds(toAnimate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange.start, visibleRange.end])

  const visibleDiaries = diaries.slice(visibleRange.start, visibleRange.end)

  const renderCapsule = (diary: Diary, globalIndex: number, offsetTop: number) => {
    const isExpanded = expandedId === diary.id
    const extraHeight = expandedHeightMap.get(diary.id) || 0
    const isAnimated = animatedIds.has(diary.id)
    const emotionInfo = EMOTIONS.find(e => e.type === diary.primaryEmotion)!
    const nextDiary = diaries[globalIndex + 1]

    if (!particleRefs.current.has(diary.id)) {
      particleRefs.current.set(diary.id, { current: null })
    }

    return (
      <div
        key={diary.id}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: offsetTop,
          padding: '0 30px',
          transform: isAnimated ? 'scale(1)' : 'scale(0.5)',
          opacity: isAnimated ? 1 : 0,
          transition: `transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out`,
          transitionDelay: isAnimated ? `${Math.min(globalIndex * 20, 300)}ms` : '0ms',
          zIndex: isExpanded ? 10 : 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{
            width: '120px',
            height: '120px',
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => toggleExpand(diary.id)}
              style={{
                width: '120px',
                height: '60px',
                borderRadius: '30px',
                background: `linear-gradient(135deg, ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.35)}, ${hslToString(diary.hue, diary.saturation, diary.lightness * 0.6, 0.25)})`,
                border: `2px solid ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.7)}`,
                boxShadow: `
                  0 0 20px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.3)},
                  inset 0 0 20px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.15)}
                `,
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '8px 12px',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `
                  0 0 30px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.5)},
                  inset 0 0 25px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.2)}
                `
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = `
                  0 0 20px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.3)},
                  inset 0 0 20px ${hslToString(diary.hue, diary.saturation, diary.lightness, 0.15)}
                `
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: hslToString(diary.hue, 90, 80, 1),
                textShadow: `0 0 6px ${hslToString(diary.hue, diary.saturation, 60, 0.6)}`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {emotionInfo.name}
              </div>
              <div style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.6)',
                whiteSpace: 'nowrap',
              }}>
                {diary.date.slice(0, 7)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                right: '-3px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: hslToString(diary.hue, diary.saturation, diary.lightness, 1),
                border: '2px solid #1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#000',
                fontWeight: 700,
              }}>
                {diary.intensity}
              </div>
            </button>

            {nextDiary && !isExpanded && getGradientLine(diary, nextDiary, CAPSULE_HEIGHT * 0.3)}
          </div>

          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <button
              onClick={() => toggleExpand(diary.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 18px',
                borderRadius: '12px',
                background: `linear-gradient(90deg, ${hslToString(diary.hue, diary.saturation, 40, 0.12)}, rgba(255,255,255,0.02))`,
                border: `1px solid ${hslToString(diary.hue, diary.saturation, 50, 0.2)}`,
                cursor: 'pointer',
                transition: 'background 0.2s',
                color: 'inherit',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `linear-gradient(90deg, ${hslToString(diary.hue, diary.saturation, 50, 0.2)}, rgba(255,255,255,0.04))`
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = `linear-gradient(90deg, ${hslToString(diary.hue, diary.saturation, 40, 0.12)}, rgba(255,255,255,0.02))`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '20px' }}>{diary.weather}</span>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 500,
                  }}>{diary.date}</span>
                </div>
                <div>{renderStars(diary.mood)}</div>
              </div>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {diary.content}
              </div>
            </button>

            <div style={{
              maxHeight: isExpanded ? `${extraHeight}px` : '0px',
              overflow: 'hidden',
              transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s',
              marginTop: isExpanded ? '14px' : '0',
            }}>
              <div style={{
                padding: '20px 22px',
                borderRadius: '14px',
                background: hslToString(diary.hue, diary.saturation, diary.lightness, 0.2),
                border: `1px solid ${hslToString(diary.hue, diary.saturation, 60, 0.35)}`,
                boxShadow: `
                  inset 0 0 40px ${hslToString(diary.hue, diary.saturation, 30, 0.15)},
                  0 8px 30px rgba(0,0,0,0.3)
                `,
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '14px',
                  marginBottom: '14px',
                  borderBottom: `1px solid ${hslToString(diary.hue, diary.saturation, 70, 0.2)}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '26px' }}>{diary.weather}</span>
                    <div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: 600,
                        color: '#fff',
                      }}>{diary.date}</div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '2px',
                      }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: hslToString(diary.hue, diary.saturation, 50, 0.3),
                          color: hslToString(diary.hue, 90, 85, 1),
                        }}>
                          {emotionInfo.name}
                        </span>
                        {renderStars(diary.mood)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: 'monospace',
                  }}>
                    强度 {diary.intensity}/10
                  </div>
                </div>

                <div style={{
                  fontSize: '16px',
                  lineHeight: 1.85,
                  color: '#e8e8e8',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: '16px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  {diary.content}
                </div>

                <div style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  border: `1px solid ${hslToString(diary.hue, diary.saturation, 60, 0.25)}`,
                }}>
                  <EmotionParticle
                    ref={particleRefs.current.get(diary.id)!}
                    hue={diary.hue}
                    saturation={diary.saturation}
                    lightness={diary.lightness}
                    intensity={diary.intensity}
                    width={380}
                    height={180}
                    playKey={replayMap.get(diary.id) || 0}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReplay(diary.id)
                    }}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#fff',
                      background: hslToString(diary.hue, diary.saturation, 45, 0.3),
                      border: `1px solid ${hslToString(diary.hue, diary.saturation, 60, 0.4)}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.5px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = hslToString(diary.hue, diary.saturation, 50, 0.5)
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = hslToString(diary.hue, diary.saturation, 45, 0.3)
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                    }}
                  >
                    ✨ 回放动画 (10s)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(diary.id)
                    }}
                    style={{
                      padding: '11px 16px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                    }}
                  >
                    收起
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        padding: '24px 30px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a8e6cf 0%, #dcedc1 30%, #ffd3b6 60%, #ffaaa5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
            }}>
              时光隧道
            </h1>
            <p style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.45)',
            }}>
              {diaries.length > 0
                ? `共封存 ${diaries.length} 个情绪胶囊，点击任意胶囊查看详情`
                : '还没有胶囊封存，写下第一篇日记吧'}
            </p>
          </div>
          {diaries.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              maxWidth: '280px',
              justifyContent: 'flex-end',
            }}>
              {Array.from(new Set(diaries.map(d => d.primaryEmotion))).slice(0, 6).map(type => {
                const info = EMOTIONS.find(e => e.type === type)!
                const count = diaries.filter(d => d.primaryEmotion === type).length
                return (
                  <div key={type} style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    background: hslToString(info.hue, 70, 45, 0.15),
                    border: `1px solid ${hslToString(info.hue, 70, 55, 0.3)}`,
                    color: hslToString(info.hue, 80, 75, 1),
                  }}>
                    {info.name} ×{count}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)',
          scrollBehavior: 'smooth',
        }}
      >
        <style>{`
          @keyframes flowLine {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(250%); }
          }
          *::-webkit-scrollbar {
            width: 6px;
          }
          *::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.02);
          }
          *::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.12);
            border-radius: 3px;
          }
          *::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {diaries.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            gap: '18px',
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '60px',
              background: 'radial-gradient(circle, rgba(168,230,207,0.15) 0%, transparent 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '56px',
            }}>
              🌌
            </div>
            <div style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}>时光隧道尚未开启</div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
              textAlign: 'center',
              lineHeight: 1.8,
              maxWidth: '320px',
            }}>
              在右侧写下你的情绪，<br />
              它们将化作光粒，永远封存于时空之中
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', height: itemOffsets.totalHeight }}>
            {visibleDiaries.map((diary, idx) => {
              const globalIndex = visibleRange.start + idx
              const offset = itemOffsets.offsets[globalIndex]
              return renderCapsule(diary, globalIndex, offset)
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Timeline
