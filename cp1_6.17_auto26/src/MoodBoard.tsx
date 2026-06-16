import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import Card from './Card';
import type { CardData, ThemeColor } from './types';
import { calculateAverageRating } from './utils';
import { THEMES, THEME_LABELS } from './themes';

interface MoodBoardProps {
  cards: CardData[];
  themeColor: ThemeColor;
  onThemeChange: (color: ThemeColor) => void;
  onAddRating: (cardId: string, score: 1 | 2 | 3 | 4 | 5) => void;
  onAddComment: (cardId: string, content: string) => void;
  onBack: () => void;
}

const RatingChart: React.FC<{
  cards: CardData[];
  barColor: string;
  labelColor: string;
}> = ({ cards, barColor, labelColor }) => {
  const [mounted, setMounted] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [cards]);

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const avgA = calculateAverageRating(a);
      const avgB = calculateAverageRating(b);
      return avgB - avgA;
    });
  }, [cards]);

  const maxAvg = 5;

  return (
    <div ref={chartRef} style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 16,
      padding: '20px 0 12px',
      minHeight: 120,
      maxWidth: '100%',
      overflowX: 'auto'
    }}>
      {sortedCards.map((card, idx) => {
        const avg = calculateAverageRating(card);
        const heightPercent = (avg / maxAvg) * 100;
        const index = cards.findIndex(c => c.id === card.id) + 1;
        return (
          <div key={card.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            minWidth: 40,
            flexShrink: 0
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: labelColor,
              height: 14
            }}>
              {avg > 0 ? avg.toFixed(1) : '-'}
            </div>
            <div style={{
              width: 28,
              height: 72,
              background: 'rgba(0,0,0,0.04)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'flex-end',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div
                style={{
                  width: '100%',
                  height: mounted ? `${heightPercent}%` : '0%',
                  background: `linear-gradient(to top, ${barColor}, ${barColor}CC)`,
                  borderRadius: 4,
                  transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: avg > 0 ? `0 -1px 4px ${barColor}40` : 'none'
                }}
              />
            </div>
            <div style={{
              fontSize: 10,
              color: '#78909C',
              fontWeight: 500
            }}>
              #{index}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MoodBoard: React.FC<MoodBoardProps> = ({
  cards,
  themeColor,
  onThemeChange,
  onAddRating,
  onAddComment,
  onBack
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingMode, setExportingMode] = useState(false);

  const theme = THEMES[themeColor];

  const themeColors = Object.keys(THEMES) as ThemeColor[];

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      setExportingMode(true);
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: theme.lightest,
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `情绪板-${THEME_LABELS[themeColor]}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsExporting(false);
      setExportingMode(false);
    }
  }, [themeColor, theme.lightest]);

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    padding: 24
  }), []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.lightest,
      transition: 'background 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: '#fff',
        borderBottom: `1px solid ${theme.lighter}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        zIndex: 10,
        position: 'sticky',
        top: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minWidth: 0
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#F5F5F5',
              color: '#546E7A',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ECEFF1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5';
            }}
          >
            ← 返回画布
          </button>
          <div style={{
            borderLeft: '1px solid #ECEFF1',
            height: 28,
            margin: '0 4px',
            display: window.innerWidth <= 768 ? 'none' : 'block'
          }} />
          <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#263238',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: theme.main,
              boxShadow: `0 0 0 4px ${theme.lightest}`
            }} />
            情绪板 · {THEME_LABELS[themeColor]}
          </h1>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}>
          {!exportingMode && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: '#FAFAFA',
                borderRadius: 8
              }}>
                <span style={{ fontSize: 12, color: '#78909C', marginRight: 4 }}>色调:</span>
                {themeColors.map(color => (
                  <button
                    key={color}
                    onClick={() => onThemeChange(color)}
                    title={THEME_LABELS[color]}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: THEMES[color].main,
                      border: themeColor === color
                        ? `3px solid ${THEMES[color].lighter}`
                        : '2px solid transparent',
                      padding: 0,
                      transition: 'all 0.2s ease',
                      boxShadow: themeColor === color
                        ? `0 0 0 2px #fff, 0 2px 8px ${THEMES[color].main}60`
                        : 'none',
                      transform: themeColor === color ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: theme.main,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: `0 2px 8px ${theme.main}40`,
                  transition: 'all 0.2s ease',
                  opacity: isExporting ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isExporting) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 12px ${theme.main}50`;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 8px ${theme.main}40`;
                }}
              >
                {isExporting ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                    导出中...
                  </>
                ) : (
                  <>⬇ 导出PNG</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 0
      }}>
        <div ref={exportRef} style={{
          background: theme.lightest,
          width: '100%',
          minHeight: '100%',
          transition: 'background 0.3s ease'
        }}>
          {/* Rating chart section - only visible in non-export mode or always */}
          {!exportingMode && (
            <div style={{
              background: '#fff',
              margin: 24,
              marginBottom: 0,
              borderRadius: 12,
              padding: '0 20px',
              border: `1px solid ${theme.lighter}40`
            }}>
              <div style={{
                padding: '16px 0 4px',
                borderBottom: '1px solid #F5F5F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#263238',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ color: theme.main }}>📊</span>
                  评分分布图
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#90A4AE'
                }}>
                  按平均分从高到低排列
                </div>
              </div>
              <RatingChart
                cards={cards}
                barColor={theme.light}
                labelColor={theme.main}
              />
            </div>
          )}

          {/* Moodboard grid */}
          <div style={{
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            <div style={gridStyle}>
              {Array.from({ length: 9 }).map((_, idx) => {
                const card = cards[idx];
                if (!card) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      style={{
                        aspectRatio: '1 / 1.1',
                        border: `2px dashed ${theme.lighter}80`,
                        borderRadius: 12,
                        background: `${theme.main}05`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.light,
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      + 空位 {idx + 1}
                    </div>
                  );
                }
                return (
                  <div
                    key={card.id}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1.1',
                      transform: 'none',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!exportingMode) {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <Card
                      card={{
                        ...card,
                        x: 0,
                        y: 0,
                        width: '100%' as any,
                        height: '100%' as any
                      }}
                      themeBg={theme.lightest}
                      themeBorder={theme.light}
                      showControls={!exportingMode}
                      onAddRating={score => onAddRating(card.id, score)}
                      onAddComment={content => onAddComment(card.id, content)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer info for export */}
          {exportingMode && (
            <div style={{
              textAlign: 'center',
              padding: '20px 24px 32px',
              color: theme.light,
              fontSize: 13,
              fontWeight: 500
            }}>
              灵感画布 · 情绪板导出 · {THEME_LABELS[themeColor]}主题
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MoodBoard;
