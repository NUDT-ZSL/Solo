import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Fragment } from './App';

interface GalleryProps {
  fragments: Fragment[];
  scrollOffset: number;
  onDelete: (id: string) => void;
}

interface CardState {
  expanded: boolean;
  deleting: boolean;
}

function parseHSL(color: string): { h: number; s: number; l: number } | null {
  const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return null;
  return {
    h: parseInt(match[1], 10),
    s: parseInt(match[2], 10),
    l: parseInt(match[3], 10)
  };
}

function getContrastColor(hsl: { h: number; s: number; l: number }): string {
  const { l } = hsl;
  return l > 55 ? '#1a1a1a' : '#ffffff';
}

function getSoftColor(hsl: { h: number; s: number; l: number }): string {
  const newS = Math.max(20, hsl.s - 20);
  const newL = Math.min(80, hsl.l + 8);
  return `hsl(${hsl.h}, ${newS}%, ${newL}%)`;
}

function extractPoem(text: string): string {
  const cleanText = text.replace(/[，。！？、；：""''（）\s…]/g, '');
  if (cleanText.length === 0) return '意识之诗';
  
  const poemLen = 3 + Math.floor(Math.random() * 3);
  const maxStart = Math.max(0, cleanText.length - poemLen);
  const start = Math.floor(Math.random() * (maxStart + 1));
  let poem = cleanText.slice(start, start + poemLen);
  
  const punctuations = ['。', '，', '！', '？', '…'];
  poem += punctuations[Math.floor(Math.random() * punctuations.length)];
  
  return poem;
}

const Gallery: React.FC<GalleryProps> = ({ fragments, scrollOffset, onDelete }) => {
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map());
  const [poems, setPoems] = useState<Map<string, string>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const animationStyles = useMemo(() => {
    return fragments.map(f => {
      const duration = 4 + Math.random() * 4;
      const amplitude = 10 + Math.random() * 20;
      const delay = Math.random() * 3;
      const animName = `drift-${f.id.replace(/-/g, '')}`;
      return { duration, amplitude, delay, animName };
    });
  }, [fragments]);

  const keyframesCSS = useMemo(() => {
    return animationStyles.map(({ animName, amplitude }) => {
      const amp = amplitude.toFixed(1);
      return `
        @keyframes ${animName} {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(${amp}px); }
          50% { transform: translateX(-${(parseFloat(amp) * 0.7).toFixed(1)}px); }
          75% { transform: translateX(${(parseFloat(amp) * 0.5).toFixed(1)}px); }
        }
      `;
    }).join('\n');
  }, [animationStyles]);

  const handleExpand = (id: string) => {
    setCardStates(prev => {
      const next = new Map(prev);
      const current = next.get(id);
      next.set(id, {
        expanded: !(current?.expanded ?? false),
        deleting: current?.deleting ?? false
      });
      return next;
    });

    if (!poems.has(id)) {
      const fragment = fragments.find(f => f.id === id);
      if (fragment) {
        setPoems(prev => {
          const next = new Map(prev);
          next.set(id, extractPoem(fragment.text));
          return next;
        });
      }
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCardStates(prev => {
      const next = new Map(prev);
      next.set(id, {
        expanded: next.get(id)?.expanded ?? false,
        deleting: true
      });
      return next;
    });
    setTimeout(() => {
      onDelete(id);
      setCardStates(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  };

  const galleryWrapperStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '10px 5px 20px'
  };

  const galleryInnerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    transform: `translateX(-${scrollOffset}px)`,
    transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    minHeight: '100%'
  };

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={galleryWrapperStyle}>
        <div style={galleryInnerStyle}>
          {fragments.map((fragment, idx) => {
            const animConfig = animationStyles[idx];
            const hsl = parseHSL(fragment.color);
            const cardState = cardStates.get(fragment.id);
            const isExpanded = cardState?.expanded ?? false;
            const isDeleting = cardState?.deleting ?? false;
            const poem = poems.get(fragment.id) || '';

            if (!hsl) return null;
            const textColor = getContrastColor(hsl);
            const softBg = getSoftColor(hsl);
            const animDuration = animConfig.duration.toFixed(2);

            const cardOuterStyle: React.CSSProperties = {
              width: 'calc(25% - 15px)',
              minWidth: '220px',
              '@media (max-width: 1200px)': {
                width: 'calc(33.333% - 14px)'
              },
              animationPlayState: 'running' as const,
              flexShrink: 0
            };

            const cardInnerStyle: React.CSSProperties = {
              position: 'relative',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              cursor: 'pointer',
              background: fragment.color,
              height: isExpanded ? 'auto' : '100px',
              minHeight: isExpanded ? '100px' : '100px',
              maxHeight: isExpanded ? '500px' : '100px',
              transition: 'height 0.5s ease-in-out, max-height 0.5s ease-in-out, background-color 0.5s ease, box-shadow 0.3s ease',
              backgroundColor: isExpanded ? softBg : fragment.color,
              animation: `${animConfig.animName} ${animDuration}s ease-in-out ${animConfig.delay}s infinite`,
              willChange: 'transform',
              transform: isDeleting ? 'scale(0) rotate(360deg)' : undefined,
              opacity: isDeleting ? 0 : 1,
              transitionProperty: isDeleting
                ? 'transform, opacity'
                : 'height, max-height, background-color, box-shadow',
              transitionDuration: isDeleting ? '0.4s' : '0.5s, 0.5s, 0.5s, 0.3s',
              transitionTimingFunction: isDeleting ? 'ease-in' : undefined
            };

            const deleteBtnStyle: React.CSSProperties = {
              position: 'absolute',
              top: '8px',
              right: '10px',
              width: '24px',
              height: '24px',
              border: 'none',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              color: textColor,
              opacity: 0.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: 1,
              zIndex: 10,
              transition: 'opacity 0.2s ease, background 0.2s ease, transform 0.2s ease',
              backdropFilter: 'blur(4px)'
            };

            const contentWrapperStyle: React.CSSProperties = {
              padding: isExpanded ? '24px 22px 22px' : '18px 18px 16px',
              color: textColor,
              display: 'flex',
              flexDirection: 'column',
              gap: isExpanded ? '16px' : '0',
              transition: 'padding 0.5s ease',
              height: '100%'
            };

            const textStyle: React.CSSProperties = {
              fontSize: isExpanded ? '15px' : '13px',
              lineHeight: 1.8,
              fontWeight: isExpanded ? 500 : 400,
              letterSpacing: '0.3px',
              overflow: isExpanded ? 'visible' : 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical' as const,
              textOverflow: 'ellipsis',
              transition: 'font-size 0.3s ease'
            };

            const poemStyle: React.CSSProperties = {
              fontSize: '18px',
              fontStyle: 'italic',
              fontWeight: 600,
              lineHeight: 1.8,
              letterSpacing: '1.5px',
              textAlign: 'center',
              padding: '16px 0 8px',
              borderTop: `1px solid ${textColor}20`,
              marginTop: '4px',
              opacity: isExpanded ? 0.9 : 0,
              transform: isExpanded ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s'
            };

            const timeLabelStyle: React.CSSProperties = {
              position: 'absolute',
              bottom: '8px',
              right: '12px',
              fontSize: '10px',
              opacity: 0.4,
              letterSpacing: '0.5px',
              display: isExpanded ? 'none' : 'block'
            };

            const dateStr = new Date(fragment.createdAt).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={fragment.id}
                style={cardOuterStyle}
                className="gallery-card-wrapper"
                onMouseEnter={(e) => {
                  const card = e.currentTarget.querySelector('.gallery-card') as HTMLDivElement;
                  if (card) {
                    card.style.animationPlayState = 'paused';
                    card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget.querySelector('.gallery-card') as HTMLDivElement;
                  if (card) {
                    card.style.animationPlayState = 'running';
                    card.style.boxShadow = 'none';
                  }
                }}
              >
                <div
                  className="gallery-card"
                  style={cardInnerStyle}
                  onClick={() => !isDeleting && handleExpand(fragment.id)}
                  ref={(el) => {
                    if (el) cardRefs.current.set(fragment.id, el);
                  }}
                >
                  <button
                    onClick={(e) => handleDelete(e, fragment.id)}
                    style={deleteBtnStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'rgba(220,60,60,0.6)';
                      e.currentTarget.style.transform = 'scale(1.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.5';
                      e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                  <div style={contentWrapperStyle}>
                    <div style={textStyle}>{fragment.text}</div>
                    {isExpanded && (
                      <div style={poemStyle}>「{poem}」</div>
                    )}
                  </div>
                  <div style={timeLabelStyle}>{dateStr}</div>
                </div>
              </div>
            );
          })}
        </div>

        {fragments.length === 0 && (
          <EmptyState />
        )}
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .gallery-card-wrapper {
            width: calc(33.333% - 14px) !important;
          }
        }
        @media (max-width: 900px) {
          .gallery-card-wrapper {
            width: calc(50% - 10px) !important;
          }
          .gallery-card {
            height: 90px !important;
            min-height: 90px !important;
          }
        }
        @media (max-width: 520px) {
          .gallery-card-wrapper {
            width: 100% !important;
            min-width: unset !important;
          }
          .gallery-card {
            height: 80px !important;
            min-height: 80px !important;
          }
        }
      `}</style>
    </>
  );
};

const EmptyState: React.FC = () => {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    gap: '16px'
  };
  const titleStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '3px',
    background: 'linear-gradient(135deg, rgba(240,200,120,0.4) 0%, rgba(167,139,250,0.4) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };
  const descStyle: React.CSSProperties = {
    fontSize: '13px',
    letterSpacing: '1.5px',
    lineHeight: 2,
    maxWidth: '400px'
  };
  return (
    <div style={style}>
      <div style={titleStyle}>暂无展品</div>
      <div style={descStyle}>
        在上方输入框中键入关键词<br />
        让意识的碎片在画廊中绽放
      </div>
    </div>
  );
};

export default Gallery;
