import React, { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import type { ParsedLyricLine } from './LyricsParser';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  getCardThemeStyles,
  regenerateCardStylesByTheme,
  type CardStyleData,
  type CardThemeStyles
} from './PosterGenerator';

interface CardRendererProps {
  lyrics: ParsedLyricLine[];
  cardStyles: CardStyleData[];
  songName: string;
  defaultThemeId?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}

const CARD_THEME_OPTIONS = [
  { id: 'scifi', name: '科幻蓝紫', primary: '#6200EA', secondary: '#00E5FF' },
  { id: 'retro', name: '复古暖黄', primary: '#FF8F00', secondary: '#FFE082' },
  { id: 'minimal', name: '极简黑白', primary: '#212121', secondary: '#ECEFF1' }
];

const CardRenderer: React.FC<CardRendererProps> = ({
  lyrics,
  cardStyles,
  songName,
  defaultThemeId = 'scifi',
  onSelectionChange
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderedLyrics, setOrderedLyrics] = useState<ParsedLyricLine[]>(lyrics);
  const [orderedStyles, setOrderedStyles] = useState<CardStyleData[]>(cardStyles);
  const [cardThemeId, setCardThemeId] = useState<string>(defaultThemeId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cardThemeStyles: CardThemeStyles = useMemo(
    () => getCardThemeStyles(cardThemeId),
    [cardThemeId]
  );

  React.useEffect(() => {
    setOrderedLyrics(lyrics);

    const filterTagMap = new Map<string, string>();
    orderedStyles.forEach(s => filterTagMap.set(s.id, s.filterTag));
    cardStyles.forEach(s => filterTagMap.set(s.id, s.filterTag));

    const newStyles = lyrics.length > 0 && cardStyles.length > 0
      ? regenerateCardStylesByTheme(lyrics, filterTagMap, cardThemeId)
      : cardStyles;

    setOrderedStyles(newStyles);
  }, [lyrics]);

  const handleCardThemeChange = (themeId: string) => {
    if (themeId === cardThemeId) return;
    setCardThemeId(themeId);

    const filterTagMap = new Map<string, string>();
    orderedStyles.forEach(s => filterTagMap.set(s.id, s.filterTag));

    const newStyles = regenerateCardStylesByTheme(
      orderedLyrics,
      filterTagMap,
      themeId
    );
    setOrderedStyles(newStyles);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id];
      onSelectionChange?.(next);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = orderedLyrics.map(l => l.id);
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
    onSelectionChange?.([]);
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    const newLyrics = [...orderedLyrics];
    const newStyles = [...orderedStyles];
    const [draggedLyric] = newLyrics.splice(dragIndex, 1);
    const [draggedStyle] = newStyles.splice(dragIndex, 1);
    newLyrics.splice(dropIndex, 0, draggedLyric);
    newStyles.splice(dropIndex, 0, draggedStyle);

    setOrderedLyrics(newLyrics);
    setOrderedStyles(newStyles);
    setDragIndex(null);
  };

  const downloadSingleCard = async (
    element: HTMLElement,
    index: number
  ) => {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      const link = document.createElement('a');
      const safeName = songName || 'card';
      link.download = `${safeName}_${index + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('下载卡片失败:', err);
    }
  };

  const downloadSelected = async () => {
    const idsToDownload = selectedIds.length > 0
      ? selectedIds
      : orderedLyrics.map(l => l.id);

    for (let i = 0; i < orderedLyrics.length; i++) {
      const lyric = orderedLyrics[i];
      if (!idsToDownload.includes(lyric.id)) continue;

      const element = document.getElementById(`card-${lyric.id}`) as HTMLElement;
      if (element) {
        await downloadSingleCard(element, i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  if (orderedLyrics.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: '#999',
        fontSize: '15px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎵</div>
        暂无歌词卡片，请输入歌词后点击"生成卡片"
      </div>
    );
  }

  const levelStyle = cardThemeStyles.cardLevelStyle;

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.05)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#555',
          letterSpacing: '0.5px',
          marginRight: '4px'
        }}>
          🎨 卡片主题：
        </span>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          {CARD_THEME_OPTIONS.map(theme => {
            const isActive = cardThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleCardThemeChange(theme.id)}
                title={theme.name}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: theme.primary,
                  border: isActive
                    ? '3px solid #42A5F5'
                    : '2px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: isActive
                    ? `0 0 0 4px rgba(66,165,245,0.2), 0 2px 12px ${theme.primary}66`
                    : `0 2px 6px ${theme.primary}33`,
                  position: 'relative',
                  outline: 'none'
                }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)'
                  }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          padding: '4px 12px',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${cardThemeStyles.primaryColor}22 0%, ${cardThemeStyles.secondaryColor}22 100%)`,
          border: `1px solid ${cardThemeStyles.primaryColor}33`,
          color: cardThemeStyles.primaryColor,
          letterSpacing: '0.5px'
        }}>
          {cardThemeStyles.themeName}
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        padding: '0 4px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button
          onClick={selectAll}
          style={toolbarBtnStyle}
        >
          全选
        </button>
        <button
          onClick={deselectAll}
          style={toolbarBtnStyle}
        >
          取消全选
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={downloadSelected}
          style={{
            ...toolbarBtnStyle,
            background: '#42A5F5',
            color: '#fff'
          }}
        >
          {selectedIds.length > 0
            ? `下载选中 (${selectedIds.length})`
            : '下载全部'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '20px',
        padding: '8px'
      }}>
        {orderedLyrics.map((line, index) => {
          const styleData = orderedStyles[index] || {
            id: line.id,
            gradient: cardThemeStyles.cardGradients[index % cardThemeStyles.cardGradients.length],
            texture: cardThemeStyles.texture,
            filterTag: '柔光',
            shadow: cardThemeStyles.shadow,
            borderRadius: cardThemeStyles.borderRadius,
            fontFamily: cardThemeStyles.fontFamily
          };
          const isSelected = selectedIds.includes(line.id);
          const isHovered = hoveredId === line.id;
          const filterTagStyle = getFilterTagStyle(styleData.filterTag, levelStyle);
          const hoverScale = isHovered ? levelStyle.hoverScale : 1;

          return (
            <div
              key={line.id}
              id={`card-${line.id}`}
              ref={(el) => {
                if (el) cardRefs.current.set(line.id, el);
              }}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
              onMouseEnter={() => setHoveredId(line.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => toggleSelect(line.id)}
              style={{
                position: 'relative',
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: `${cardThemeStyles.borderRadius}px`,
                boxShadow: isSelected
                  ? `${levelStyle.selectedBorder}, ${levelStyle.selectedGlow}, ${cardThemeStyles.shadow}`
                  : cardThemeStyles.shadow,
                cursor: 'pointer',
                overflow: 'hidden',
                userSelect: 'none',
                transition: 'transform 0.2s ease, box-shadow 0.25s ease',
                transform: dragIndex === index
                  ? 'scale(0.95) rotate(2deg)'
                  : `scale(${hoverScale})`,
                fontFamily: cardThemeStyles.fontFamily
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: styleData.gradient
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: cardThemeStyles.texture,
                  backgroundRepeat: 'repeat',
                  opacity: 1
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: getFilterOverlay(styleData.filterTag),
                  pointerEvents: 'none'
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  background: filterTagStyle.background,
                  color: filterTagStyle.color,
                  backdropFilter: levelStyle.badgeStyle.backdropFilter,
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {styleData.filterTag}
              </div>

              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: cardThemeStyles.primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    zIndex: 10,
                    boxShadow: `0 2px 10px ${cardThemeStyles.primaryColor}88`,
                    border: `2px solid ${cardThemeStyles.secondaryColor}`
                  }}
                >
                  ✓
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px 24px',
                  zIndex: 5
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    color: levelStyle.textColor,
                    fontSize: '18px',
                    lineHeight: 1.8,
                    fontWeight: 500,
                    textShadow: levelStyle.textShadow,
                    letterSpacing: '0.5px',
                    maxWidth: '100%',
                    wordBreak: 'break-word'
                  }}
                >
                  {line.displayLines.map((dl, i) => (
                    <div key={i} style={{ marginBottom: i < line.displayLines.length - 1 ? '4px' : 0 }}>
                      {dl}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: levelStyle.indexStyle.color,
                  fontSize: '11px',
                  letterSpacing: '2px',
                  zIndex: 5,
                  fontWeight: 500
                }}
              >
                No.{String(index + 1).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  background: 'rgba(66, 165, 245, 0.1)',
  color: '#42A5F5',
  border: '1px solid rgba(66, 165, 245, 0.3)',
  transition: 'all 0.15s ease'
};

interface BadgeStyle {
  background: string;
  color: string;
}

function getFilterTagStyle(
  tag: string,
  levelStyle: { badgeStyle: BadgeStyle }
): BadgeStyle {
  switch (tag) {
    case '复古':
      return {
        background: 'rgba(255, 143, 0, 0.9)',
        color: '#FFF8E1'
      };
    case '冷峻':
      return {
        background: 'rgba(3, 169, 244, 0.9)',
        color: '#E1F5FE'
      };
    case '柔光':
      return {
        background: 'rgba(255, 182, 193, 0.9)',
        color: '#880E4F'
      };
    default:
      return levelStyle.badgeStyle;
  }
}

function getFilterOverlay(tag: string): string {
  switch (tag) {
    case '复古':
      return 'linear-gradient(rgba(255, 140, 0, 0.08), rgba(139, 69, 19, 0.12))';
    case '冷峻':
      return 'linear-gradient(rgba(0, 50, 120, 0.12), rgba(0, 180, 255, 0.08))';
    case '柔光':
      return 'radial-gradient(circle at 30% 20%, rgba(255, 200, 200, 0.25), transparent 60%)';
    default:
      return 'transparent';
  }
}

export default CardRenderer;
