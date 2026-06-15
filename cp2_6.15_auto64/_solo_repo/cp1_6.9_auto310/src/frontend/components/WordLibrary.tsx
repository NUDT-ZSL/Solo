import React from 'react';
import { EMOTION_WORDS } from '../PoemEngine';

const WordLibrary: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, word: string) => {
    e.dataTransfer.setData('text/word', word);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const wrapperStyle: React.CSSProperties = {
    width: 320,
    flexShrink: 0,
    borderRadius: 20,
    background: 'linear-gradient(160deg, rgba(40,40,90,0.7) 0%, rgba(20,20,60,0.7) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10
  };

  const titleIconStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(138,180,255,0.3))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: 1
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginTop: 2
  };

  const listContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.15) transparent'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <div style={titleIconStyle}>词</div>
        <div>
          <div style={titleStyle}>情感词库</div>
          <div style={subtitleStyle}>共 {EMOTION_WORDS.length} 个词汇</div>
        </div>
      </div>

      <div style={listContainerStyle}>
        <div style={gridStyle}>
          {EMOTION_WORDS.map((item) => {
            const itemStyle: React.CSSProperties = {
              position: 'relative',
              padding: '12px 4px',
              borderRadius: 10,
              border: `1px solid hsla(${item.hue}, 70%, 60%, 0.35)`,
              background: `linear-gradient(145deg, hsla(${item.hue}, 70%, 50%, 0.12) 0%, hsla(${item.hue}, 70%, 50%, 0.04) 100%)`,
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
              cursor: 'grab',
              userSelect: 'none',
              letterSpacing: 1,
              transition: 'all 0.3s ease',
              boxShadow: `0 0 0 1px hsla(${item.hue}, 80%, 60%, 0), inset 0 0 10px hsla(${item.hue}, 80%, 60%, 0.08)`
            };
            return (
              <div
                key={item.word}
                style={itemStyle}
                draggable
                onDragStart={(e) => handleDragStart(e, item.word)}
                onMouseOver={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = `0 0 20px hsla(${item.hue}, 80%, 60%, 0.3), inset 0 0 15px hsla(${item.hue}, 80%, 60%, 0.12)`;
                  el.style.filter = 'brightness(1.2)';
                  el.style.transform = 'scale(1.05)';
                  el.style.zIndex = '5';
                }}
                onMouseOut={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = `0 0 0 1px hsla(${item.hue}, 80%, 60%, 0), inset 0 0 10px hsla(${item.hue}, 80%, 60%, 0.08)`;
                  el.style.filter = '';
                  el.style.transform = '';
                  el.style.zIndex = '';
                }}
              >
                {item.word}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WordLibrary;
