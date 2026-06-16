import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import type { ParsedLyricLine } from './LyricsParser';
import type { CardStyleData } from './PosterGenerator';
import { CARD_WIDTH, CARD_HEIGHT } from './PosterGenerator';

interface CardRendererProps {
  lyrics: ParsedLyricLine[];
  cardStyles: CardStyleData[];
  songName: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}

const CardRenderer: React.FC<CardRendererProps> = ({
  lyrics,
  cardStyles,
  songName,
  onSelectionChange
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orderedLyrics, setOrderedLyrics] = useState<ParsedLyricLine[]>(lyrics);
  const [orderedStyles, setOrderedStyles] = useState<CardStyleData[]>(cardStyles);

  React.useEffect(() => {
    setOrderedLyrics(lyrics);
    setOrderedStyles(cardStyles);
  }, [lyrics, cardStyles]);

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

  return (
    <div>
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
          const styleData = orderedStyles[index];
          const isSelected = selectedIds.includes(line.id);
          const filterTagStyle = getFilterTagStyle(styleData.filterTag);

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
              onClick={() => toggleSelect(line.id)}
              style={{
                position: 'relative',
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: `${styleData.borderRadius}px`,
                boxShadow: isSelected
                  ? `0 0 0 2px #FF7043, 0 0 24px rgba(255, 112, 67, 0.6), ${styleData.shadow}`
                  : styleData.shadow,
                cursor: 'pointer',
                overflow: 'hidden',
                userSelect: 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                transform: dragIndex === index ? 'scale(0.95) rotate(2deg)' : 'scale(1)',
                fontFamily: styleData.fontFamily
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
                  backgroundImage: styleData.texture,
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
                  ...filterTagStyle,
                  backdropFilter: 'blur(8px)',
                  zIndex: 10
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
                    background: '#FF7043',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(255,112,67,0.4)'
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
                    color: '#FFFFFF',
                    fontSize: '18px',
                    lineHeight: 1.8,
                    fontWeight: 500,
                    textShadow: '0 2px 12px rgba(0,0,0,0.4)',
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
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  zIndex: 5
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

function getFilterTagStyle(tag: string): React.CSSProperties {
  switch (tag) {
    case '复古':
      return {
        background: 'rgba(255, 143, 0, 0.85)',
        color: '#FFF8E1'
      };
    case '冷峻':
      return {
        background: 'rgba(3, 169, 244, 0.85)',
        color: '#E1F5FE'
      };
    case '柔光':
      return {
        background: 'rgba(255, 182, 193, 0.85)',
        color: '#880E4F'
      };
    default:
      return {
        background: 'rgba(255,255,255,0.8)',
        color: '#333'
      };
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
