import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LetterEngine, TextureType, FontStyle, LetterSegment } from './LetterEngine';
import { ParticleEffect } from './ParticleEffect';
import { SealAnimation, SealState } from './SealAnimation';

const letterEngine = new LetterEngine();
const particleEffect = new ParticleEffect();
const sealAnimation = new SealAnimation();

const TEXTURE_THUMBNAIL_COLORS: Record<TextureType, { bg: string; border: string }> = {
  parchment: { bg: 'linear-gradient(135deg, #f5e6c8, #e2c992)', border: '#c9a96e' },
  'vintage-lined': { bg: 'linear-gradient(180deg, #faf6ed, #f5eed8)', border: '#bfae8a' },
  'blank-white': { bg: 'linear-gradient(180deg, #ffffff, #fafafa)', border: '#d0d0d0' },
};

export default function MainUI() {
  const [texture, setTexture] = useState<TextureType>('parchment');
  const [font, setFont] = useState<FontStyle>('handwriting');
  const [speed, setSpeed] = useState(80);
  const [letterText, setLetterText] = useState('');
  const [segments, setSegments] = useState<LetterSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSealed, setIsSealed] = useState(false);
  const [isFoldAnimating, setIsFoldAnimating] = useState(false);
  const [sealState, setSealStateLocal] = useState<SealState>(sealAnimation.getState());
  const [foldTransform, setFoldTransform] = useState('perspective(800px) rotateX(0deg)');
  const [showSealStamp, setShowSealStamp] = useState(false);

  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (particleCanvasRef.current) {
      particleEffect.attach(particleCanvasRef.current);
    }
    return () => { particleEffect.detach(); };
  }, []);

  useEffect(() => {
    const handleResize = () => { particleEffect.resize(); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, []);

  useEffect(() => {
    const unsub = sealAnimation.subscribe((state) => {
      setSealStateLocal(state);
      setFoldTransform(sealAnimation.getFoldTransform());
      if (state.isSealed && !state.isAnimating) {
        setTimeout(() => { setShowSealStamp(true); }, 200);
      }
    });
    return unsub;
  }, []);

  const handleTextureChange = useCallback((t: TextureType) => {
    setTexture(t);
    letterEngine.setTexture(t);
  }, []);

  const handleFontChange = useCallback((f: FontStyle) => {
    setFont(f);
    letterEngine.setFont(f);
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s);
    letterEngine.setSpeed(s);
  }, []);

  const handlePlay = useCallback(() => {
    if (!letterText.trim() || isSealed) return;
    setIsPlaying(true);
    letterEngine.startTypewriter(
      letterText,
      (index) => {
        setSegments((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = { ...next[index], visible: true };
          }
          return next;
        });
      },
      () => { setIsPlaying(false); }
    );
  }, [letterText, isSealed]);

  const handleStop = useCallback(() => {
    letterEngine.stopTypewriter();
    setIsPlaying(false);
  }, []);

  const handleSeal = useCallback(async () => {
    if (isSealed || isFoldAnimating) return;
    letterEngine.stopTypewriter();
    setIsPlaying(false);
    setIsFoldAnimating(true);
    setShowSealStamp(false);

    const allVisible = letterEngine.revealAll(letterText);
    setSegments(allVisible);

    await sealAnimation.seal();
    setIsSealed(true);
    setIsFoldAnimating(false);
  }, [isSealed, isFoldAnimating, letterText]);

  const handleReset = useCallback(() => {
    letterEngine.reset();
    sealAnimation.reset();
    setTexture('parchment');
    setFont('handwriting');
    setSpeed(80);
    setLetterText('');
    setSegments([]);
    setIsPlaying(false);
    setIsSealed(false);
    setIsFoldAnimating(false);
    setShowSealStamp(false);
    setFoldTransform('perspective(800px) rotateX(0deg)');
    particleEffect.reset();
    letterEngine.setTexture('parchment');
    letterEngine.setFont('handwriting');
    letterEngine.setSpeed(80);
  }, []);

  const textureStyle = letterEngine.getTextureStyle();
  const fontFamily = letterEngine.getFontFamily();

  const renderLetterContent = () => {
    if (segments.length === 0 && !letterText) {
      return (
        <div style={{
          color: 'rgba(139,109,63,0.4)',
          fontStyle: 'italic',
          fontSize: '1rem',
          fontFamily,
        }}>
          在左侧输入信件内容，点击「播放」开始书写...
        </div>
      );
    }

    return segments.map((seg, i) => {
      if (seg.char === '\n') {
        return <br key={i} />;
      }
      return (
        <span
          key={i}
          style={{
            opacity: seg.visible ? 1 : 0,
            transition: 'opacity 0.15s ease',
            fontFamily,
            fontSize: '1.1rem',
            lineHeight: 1.8,
            letterSpacing: '0.02em',
          }}
        >
          {seg.char}
        </span>
      );
    });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #3d2b1f 0%, #5a3e2b 30%, #4a3225 60%, #2c1e14 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(245,230,200,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(201,169,110,0.06) 0%, transparent 40%),
          radial-gradient(ellipse at 50% 80%, rgba(139,109,63,0.05) 0%, transparent 40%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '340px',
        minWidth: '300px',
        height: '100%',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        background: 'rgba(44,30,20,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(201,169,110,0.2)',
        overflowY: 'auto',
        flexShrink: 0,
      }}>
        <h1 style={{
          color: '#f5e6c8',
          fontSize: '1.5rem',
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 700,
          textAlign: 'center',
          margin: 0,
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(201,169,110,0.3)',
          letterSpacing: '0.15em',
        }}>
          风语信件
        </h1>

        <div>
          <label style={{
            color: '#c9a96e',
            fontSize: '0.85rem',
            fontFamily: "'Noto Serif SC', serif",
            display: 'block',
            marginBottom: '8px',
          }}>
            信纸纹理
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {LetterEngine.getAllTextures().map((t) => (
              <button
                key={t.value}
                onClick={() => handleTextureChange(t.value)}
                style={{
                  width: '56px',
                  height: '72px',
                  borderRadius: '8px',
                  border: texture === t.value
                    ? '2px solid #c9a96e'
                    : '2px solid rgba(201,169,110,0.3)',
                  background: TEXTURE_THUMBNAIL_COLORS[t.value].bg,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: texture === t.value ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: texture === t.value
                    ? '0 0 12px rgba(201,169,110,0.4)'
                    : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                title={t.label}
              >
                {t.value === 'vintage-lined' && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(139,109,63,0.2) 8px, rgba(139,109,63,0.2) 9px)',
                    pointerEvents: 'none',
                  }} />
                )}
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  left: 0,
                  right: 0,
                  fontSize: '0.6rem',
                  color: '#8b6b4e',
                  textAlign: 'center',
                  fontFamily: "'Noto Serif SC', serif",
                }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{
            color: '#c9a96e',
            fontSize: '0.85rem',
            fontFamily: "'Noto Serif SC', serif",
            display: 'block',
            marginBottom: '8px',
          }}>
            字体风格
          </label>
          <select
            value={font}
            onChange={(e) => handleFontChange(e.target.value as FontStyle)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(201,169,110,0.3)',
              background: 'rgba(62,42,28,0.8)',
              color: '#f5e6c8',
              fontSize: '0.95rem',
              fontFamily: "'Noto Serif SC', serif",
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s ease',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c9a96e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {LetterEngine.getAllFonts().map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{
            color: '#c9a96e',
            fontSize: '0.85rem',
            fontFamily: "'Noto Serif SC', serif",
            display: 'block',
            marginBottom: '8px',
          }}>
            打字速度
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#8b6b4e', fontSize: '0.75rem', fontFamily: "'Noto Serif SC', serif" }}>慢</span>
            <input
              type="range"
              min={20}
              max={200}
              value={220 - speed}
              onChange={(e) => handleSpeedChange(220 - Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: '#c9a96e',
                cursor: 'pointer',
              }}
            />
            <span style={{ color: '#8b6b4e', fontSize: '0.75rem', fontFamily: "'Noto Serif SC', serif" }}>快</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{
            color: '#c9a96e',
            fontSize: '0.85rem',
            fontFamily: "'Noto Serif SC', serif",
            display: 'block',
            marginBottom: '8px',
          }}>
            信件内容
          </label>
          <textarea
            value={letterText}
            onChange={(e) => setLetterText(e.target.value)}
            placeholder="在此写下你的信件..."
            style={{
              flex: 1,
              minHeight: '160px',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid rgba(201,169,110,0.3)',
              background: 'rgba(62,42,28,0.6)',
              color: '#f5e6c8',
              fontSize: '0.95rem',
              fontFamily: "'Noto Serif SC', serif",
              lineHeight: 1.8,
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.3s ease',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(201,169,110,0.6)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(201,169,110,0.3)'; }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={!letterText.trim() || isSealed}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '8px',
                border: '1px solid rgba(201,169,110,0.4)',
                background: 'rgba(201,169,110,0.15)',
                color: '#f5e6c8',
                fontSize: '0.95rem',
                fontFamily: "'Noto Serif SC', serif",
                cursor: (!letterText.trim() || isSealed) ? 'not-allowed' : 'pointer',
                opacity: (!letterText.trim() || isSealed) ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseEnter={(e) => {
                if (!isSealed && letterText.trim()) {
                  e.currentTarget.style.background = 'rgba(201,169,110,0.25)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(201,169,110,0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isPlaying ? '⏹ 停止' : '▶ 播放'}
            </button>
            <button
              onClick={handleSeal}
              disabled={!letterText.trim() || isSealed || isFoldAnimating}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '8px',
                border: '1px solid rgba(168,80,50,0.5)',
                background: 'rgba(139,37,0,0.3)',
                color: '#f5e6c8',
                fontSize: '0.95rem',
                fontFamily: "'Noto Serif SC', serif",
                cursor: (!letterText.trim() || isSealed || isFoldAnimating) ? 'not-allowed' : 'pointer',
                opacity: (!letterText.trim() || isSealed || isFoldAnimating) ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseEnter={(e) => {
                if (!isSealed && letterText.trim()) {
                  e.currentTarget.style.background = 'rgba(139,37,0,0.45)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(139,37,0,0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              🔒 封缄
            </button>
          </div>
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: '8px',
              border: '1px solid rgba(201,169,110,0.25)',
              background: 'rgba(62,42,28,0.5)',
              color: '#c9a96e',
              fontSize: '0.85rem',
              fontFamily: "'Noto Serif SC', serif",
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(62,42,28,0.7)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(62,42,28,0.5)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>

      <div
        ref={previewRef}
        style={{
          flex: 1,
          height: '100%',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={particleCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            minHeight: '460px',
            maxHeight: '80vh',
            position: 'relative',
            zIndex: 2,
            perspective: '800px',
          }}
        >
          <div
            style={{
              width: '100%',
              minHeight: '460px',
              maxHeight: '80vh',
              padding: '48px 44px',
              borderRadius: '4px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
              ...textureStyle,
              backgroundBlendMode: 'overlay',
              transformStyle: 'preserve-3d',
              transform: foldTransform,
              transition: isFoldAnimating
                ? 'transform 0.5s cubic-bezier(0.4,0,0.2,1)'
                : 'transform 0.3s ease',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(139,109,63,0.15)',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.03)',
              pointerEvents: 'none',
            }} />

            <div style={{
              position: 'relative',
              color: textureStyle.color,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {renderLetterContent()}
            </div>

            {isSealed && showSealStamp && (
              <div style={{
                position: 'absolute',
                left: `${sealState.sealPosition.x}%`,
                top: `${sealState.sealPosition.y}%`,
                transform: `translate(-50%, -50%) rotate(${sealState.sealRotation}deg)`,
                animation: 'sealAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${sealState.sealColor}dd, ${sealState.sealColor}88)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)',
                  border: '2px solid rgba(139,37,0,0.4)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                }}>
                  <span style={{
                    color: 'rgba(245,230,200,0.9)',
                    fontSize: '1.5rem',
                    fontFamily: "'Noto Serif SC', serif",
                    fontWeight: 700,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}>
                    {sealState.sealSymbol}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
