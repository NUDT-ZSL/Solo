import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FlyingFragment } from '../types';
import { RARITY_BORDER, RARITY_ICONS } from '../types';
import type { CardFragment } from '../core/CardSystem';
import { RARITY_COLORS } from '../core/CardSystem';

interface FragmentCollectorProps {
  fragments: CardFragment[];
  flyingFragments: FlyingFragment[];
  onFragmentClick?: (fragment: CardFragment) => void;
}

interface AnimatingFragment {
  id: string;
  characterName: string;
  rarity: string;
  startX: number;
  startY: number;
  startTime: number;
  x: number;
  y: number;
}

const FLY_DURATION = 600;
const ARC_HEIGHT = 150;
const END_X_OFFSET = 340;
const END_Y_OFFSET = 84;
const MAX_VISIBLE = 15;

export default function FragmentCollector({
  fragments,
  flyingFragments,
  onFragmentClick
}: FragmentCollectorProps) {
  const [animating, setAnimating] = useState<AnimatingFragment[]>([]);
  const [selectedFragment, setSelectedFragment] = useState<CardFragment | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'fragment-collector-keyframes';
    style.textContent = `
      @keyframes legendaryShine {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('fragment-collector-keyframes');
      if (el) document.head.removeChild(el);
    };
  }, []);

  useEffect(() => {
    const newAnims: AnimatingFragment[] = [];
    for (const frag of flyingFragments) {
      if (!processedIdsRef.current.has(frag.id)) {
        processedIdsRef.current.add(frag.id);
        newAnims.push({
          id: frag.id,
          characterName: frag.characterName,
          rarity: frag.rarity,
          startX: frag.startX,
          startY: frag.startY,
          startTime: performance.now(),
          x: frag.startX,
          y: frag.startY
        });
      }
    }
    if (newAnims.length > 0) {
      setAnimating(prev => [...prev, ...newAnims]);
    }
  }, [flyingFragments]);

  useEffect(() => {
    if (animating.length === 0) return;

    const animate = () => {
      const now = performance.now();
      const endX = window.innerWidth - END_X_OFFSET;
      const endY = window.innerHeight - END_Y_OFFSET;

      setAnimating(prev => {
        const next: AnimatingFragment[] = [];
        for (const frag of prev) {
          const raw = Math.min((now - frag.startTime) / FLY_DURATION, 1);
          const t = 1 - (1 - raw) * (1 - raw);

          const x = frag.startX + (endX - frag.startX) * t;
          const y = frag.startY + (endY - frag.startY) * t - ARC_HEIGHT * 4 * t * (1 - t);

          if (raw < 1) {
            next.push({ ...frag, x, y });
          }
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animating.length > 0]);

  const handleFragmentClick = useCallback((fragment: CardFragment) => {
    setSelectedFragment(fragment);
    onFragmentClick?.(fragment);
  }, [onFragmentClick]);

  const handleClosePopup = useCallback(() => {
    setSelectedFragment(null);
  }, []);

  const recentFragments = useMemo(() => {
    return fragments.slice(-MAX_VISIBLE);
  }, [fragments]);

  const flyElements = useMemo(() => {
    return animating.map(frag => (
      <div
        key={frag.id}
        style={{
          position: 'fixed',
          left: frag.x - 24,
          top: frag.y - 32,
          width: 48,
          height: 64,
          border: `2px solid ${RARITY_COLORS[frag.rarity as keyof typeof RARITY_COLORS] || '#808080'}`,
          borderRadius: 4,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          color: '#fff',
          pointerEvents: 'none',
          zIndex: 9999
        }}
      >
        {frag.characterName[0]}
      </div>
    ));
  }, [animating]);

  return (
    <>
      {flyElements}

      <div style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 320,
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid #555',
        borderRadius: 8,
        padding: 8,
        zIndex: 1000,
        color: '#fff'
      }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
          碎片收集
        </div>
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 4,
          padding: '4px 0'
        }}>
          {recentFragments.map((frag, i) => {
            const isLegendary = frag.rarity === 'legendary';
            const opacity = 0.3 + 0.7 * ((i + 1) / recentFragments.length);
            const borderColor = RARITY_COLORS[frag.rarity] || RARITY_BORDER[frag.rarity] || '#808080';
            return (
              <div
                key={frag.id}
                onClick={() => handleFragmentClick(frag)}
                style={{
                  width: 48,
                  height: 64,
                  border: `2px solid ${borderColor}`,
                  borderRadius: 4,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity,
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s'
                }}
              >
                {isLegendary && (
                  <div style={{
                    position: 'absolute',
                    top: -24,
                    left: -24,
                    width: 96,
                    height: 96,
                    background: 'linear-gradient(45deg, transparent 40%, rgba(255,215,0,0.35) 50%, transparent 60%)',
                    animation: 'legendaryShine 2s linear infinite',
                    pointerEvents: 'none'
                  }} />
                )}
                <span style={{ fontSize: 16, position: 'relative', zIndex: 1 }}>
                  {RARITY_ICONS[frag.rarity] || '⚔️'}
                </span>
                <span style={{ fontSize: 8, marginTop: 2, position: 'relative', zIndex: 1 }}>
                  {frag.characterName.slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedFragment && (
        <div
          onClick={handleClosePopup}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1a2e',
              border: `2px solid ${RARITY_COLORS[selectedFragment.rarity]}`,
              borderRadius: 8,
              padding: 24,
              color: '#fff',
              minWidth: 240,
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
              {selectedFragment.characterName}
            </div>
            <div style={{
              fontSize: 14,
              color: RARITY_COLORS[selectedFragment.rarity],
              marginBottom: 8
            }}>
              {selectedFragment.rarity.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>
              {new Date(selectedFragment.timestamp).toLocaleString()}
            </div>
            <button
              onClick={handleClosePopup}
              style={{
                marginTop: 16,
                padding: '6px 20px',
                border: '1px solid #555',
                borderRadius: 4,
                background: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
