import React, { useEffect, useRef } from 'react'
import { useAppStore } from './store'
import { renderContent, Slide as SlideData, SlideLine } from './parser'
import { Theme } from './theme'

interface SlideCardProps {
  slide: SlideData
  theme: Theme
  animate?: boolean
  direction?: 'forward' | 'backward'
}

const SlideLineItem: React.FC<{ line: SlideLine; theme: Theme }> = ({ line, theme }) => {
  const baseStyle: React.CSSProperties = {
    margin: '8px 0',
    transition: 'color 0.5s ease-in-out, border-color 0.5s ease-in-out'
  }

  switch (line.type) {
    case 'h1':
      return (
        <h1
          style={{
            ...baseStyle,
            color: theme.titleColor,
            fontSize: '2.5rem',
            fontWeight: 700,
            borderBottom: `3px solid ${theme.primary}`,
            paddingBottom: '12px',
            marginBottom: '24px'
          }}
          dangerouslySetInnerHTML={{ __html: renderContent(line.content) }}
        />
      )
    case 'h2':
      return (
        <h2
          style={{
            ...baseStyle,
            color: theme.titleColor,
            fontSize: '1.8rem',
            fontWeight: 600,
            marginBottom: '16px'
          }}
          dangerouslySetInnerHTML={{ __html: renderContent(line.content) }}
        />
      )
    case 'h3':
      return (
        <h3
          style={{
            ...baseStyle,
            color: theme.primary,
            fontSize: '1.3rem',
            fontWeight: 600,
            marginBottom: '12px'
          }}
          dangerouslySetInnerHTML={{ __html: renderContent(line.content) }}
        />
      )
    case 'list':
      return (
        <div
          style={{
            ...baseStyle,
            color: theme.textColor,
            fontSize: '1.1rem',
            paddingLeft: '28px',
            position: 'relative'
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '8px',
              color: theme.primary,
              fontWeight: 'bold',
              transition: 'color 0.5s ease-in-out'
            }}
          >
            •
          </span>
          <span dangerouslySetInnerHTML={{ __html: renderContent(line.content) }} />
        </div>
      )
    case 'code':
      return (
        <div
          style={{
            ...baseStyle,
            display: 'inline-block',
            background: '#f5f5f5',
            padding: '4px 10px',
            borderRadius: '4px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '1rem',
            color: '#c7254e'
          }}
        >
          {line.content}
        </div>
      )
    case 'text':
      return (
        <p
          style={{
            ...baseStyle,
            color: theme.textColor,
            fontSize: '1.1rem',
            lineHeight: 1.8
          }}
          dangerouslySetInnerHTML={{ __html: renderContent(line.content) }}
        />
      )
    case 'empty':
      return <div style={{ height: '12px' }} />
    default:
      return null
  }
}

const SlideCard: React.FC<SlideCardProps> = ({ slide, theme, animate = false, direction = 'forward' }) => {
  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: theme.background,
    borderRadius: '8px',
    padding: '60px 70px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'background-color 0.5s ease-in-out'
  }

  const animationName = direction === 'forward' ? 'slideFadeInForward' : 'slideFadeInBackward'

  return (
    <div
      style={{
        ...cardStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: animate ? 0 : 1,
        transform: animate ? (direction === 'forward' ? 'translateX(40px)' : 'translateX(-40px)') : 'translateX(0)',
        animation: animate ? `${animationName} 0.4s ease-out forwards` : undefined
      }}
    >
      {slide.lines.map((line, idx) => (
        <SlideLineItem key={idx} line={line} theme={theme} />
      ))}
    </div>
  )
}

interface SliderProps {
  onEnterFullscreen?: () => void
}

const Slider: React.FC<SliderProps> = ({ onEnterFullscreen }) => {
  const {
    slides,
    currentPage,
    getCurrentTheme,
    getTotalPages,
    nextPage,
    prevPage,
    isFullscreen,
    setIsFullscreen
  } = useAppStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = React.useState(false)
  const prevPageRef = useRef(currentPage)
  const [animateKey, setAnimateKey] = React.useState(0)
  const [direction, setDirection] = React.useState<'forward' | 'backward'>('forward')

  const theme = getCurrentTheme()
  const total = getTotalPages()

  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      setDirection(currentPage > prevPageRef.current ? 'forward' : 'backward')
      setAnimateKey(k => k + 1)
      prevPageRef.current = currentPage
    }
  }, [currentPage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevPage()
      } else if (e.key === 'Escape') {
        setIsFullscreen(false)
        if (document.fullscreenElement) {
          document.exitFullscreen()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, nextPage, prevPage, setIsFullscreen])

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
        onEnterFullscreen?.()
      }).catch(() => {
        setIsFullscreen(true)
        onEnterFullscreen?.()
      })
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    } else {
      setIsFullscreen(false)
    }
  }

  const wrapperStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#1a1a1a',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box'
      }
    : {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        background: '#fafafa'
      }

  const slideContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: isFullscreen ? 'min(90vw, calc(80vh * 16 / 9))' : 'auto',
    height: isFullscreen ? 'auto' : '100%',
    aspectRatio: '16 / 9',
    maxWidth: isFullscreen ? 'none' : '100%',
    maxHeight: '100%'
  }

  const nonFullscreenWrapper: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const innerContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: isFullscreen ? 'none' : '900px',
    aspectRatio: '16 / 9'
  }

  const fullscreenBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: isFullscreen ? '20px' : '24px',
    right: isFullscreen ? '20px' : '24px',
    zIndex: 100,
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    background: hover || isFullscreen ? theme.primary : 'rgba(0,0,0,0.15)',
    color: hover || isFullscreen ? '#fff' : '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'all 0.5s ease-in-out'
  }

  const navBtnBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 100,
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '22px',
    fontWeight: 'bold',
    transition: 'all 0.5s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const prevBtnStyle: React.CSSProperties = {
    ...navBtnBaseStyle,
    left: isFullscreen ? '30px' : '20px',
    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
    background: currentPage === 0 ? 'rgba(0,0,0,0.1)' : theme.primary,
    color: currentPage === 0 ? '#999' : '#fff',
    opacity: currentPage === 0 ? 0.5 : 1
  }

  const nextBtnStyle: React.CSSProperties = {
    ...navBtnBaseStyle,
    right: isFullscreen ? '30px' : '20px',
    cursor: currentPage >= total - 1 ? 'not-allowed' : 'pointer',
    background: currentPage >= total - 1 ? 'rgba(0,0,0,0.1)' : theme.primary,
    color: currentPage >= total - 1 ? '#999' : '#fff',
    opacity: currentPage >= total - 1 ? 0.5 : 1
  }

  const pageInfoStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: isFullscreen ? '20px' : '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    pointerEvents: 'none',
    opacity: hover || isFullscreen ? 1 : 0,
    transition: 'opacity 0.3s ease'
  }

  return (
    <div
      ref={containerRef}
      style={wrapperStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isFullscreen ? (
        <div style={nonFullscreenWrapper}>
          <div style={innerContainerStyle}>
            <button
              onClick={handleFullscreenClick}
              title={isFullscreen ? '退出全屏 (Esc)' : '全屏演示'}
              style={fullscreenBtnStyle}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {isFullscreen ? '✕' : '⛶'}
            </button>

            <SlideCard
              key={animateKey}
              slide={slides[currentPage]}
              theme={theme}
              animate={animateKey > 0}
              direction={direction}
            />

            {(hover || isFullscreen) && (
              <>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  title="上一页 (←)"
                  style={prevBtnStyle}
                  onMouseDown={(e) => {
                    if (currentPage !== 0) e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                  }}
                >
                  ‹
                </button>

                <button
                  onClick={nextPage}
                  disabled={currentPage >= total - 1}
                  title="下一页 (→)"
                  style={nextBtnStyle}
                  onMouseDown={(e) => {
                    if (currentPage < total - 1) e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                  }}
                >
                  ›
                </button>
              </>
            )}

            <div style={pageInfoStyle}>
              {currentPage + 1} / {total}
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={handleFullscreenClick}
            title="退出全屏 (Esc)"
            style={fullscreenBtnStyle}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ✕
          </button>

          <div style={slideContainerStyle}>
            <SlideCard
              key={animateKey}
              slide={slides[currentPage]}
              theme={theme}
              animate={animateKey > 0}
              direction={direction}
            />
          </div>

          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            title="上一页 (←)"
            style={prevBtnStyle}
            onMouseDown={(e) => {
              if (currentPage !== 0) e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            ‹
          </button>

          <button
            onClick={nextPage}
            disabled={currentPage >= total - 1}
            title="下一页 (→)"
            style={nextBtnStyle}
            onMouseDown={(e) => {
              if (currentPage < total - 1) e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
            }}
          >
            ›
          </button>

          <div style={pageInfoStyle}>
            {currentPage + 1} / {total}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideFadeInForward {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideFadeInBackward {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}

export default Slider
