import React, { useState } from 'react';
import type { Product } from '../main';

interface Props {
  products: Product[];
  onRemove: (id: string) => void;
}

export default function ComparePanel({ products, onRemove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (products.length === 0) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: isMobile ? 24 : 20,
          right: isMobile ? 12 : 20,
          left: isMobile ? 12 : 'auto',
          height: 80,
          background: 'rgba(30, 41, 59, 0.92)',
          borderRadius: 12,
          border: '1px solid rgba(96,165,250,0.25)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(96,165,250,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 900,
          maxWidth: isMobile ? 'calc(100vw - 24px)' : 'calc(80px * 4 + 60px + 20px)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(96,165,250,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {products.length}/4
        </div>

        {products.map((p) => (
          <div
            key={p._id}
            onClick={() => setExpanded(true)}
            style={{
              width: 80,
              height: 60,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${p.color}60, ${p.color}20)`,
              border: `1px solid ${p.color}80`,
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: p.shapeType === 0 ? 4 : p.shapeType === 1 ? '50%' : 3,
                background: p.color,
                transform: p.shapeType === 2 ? 'rotate(45deg)' : 'none',
                boxShadow: `0 0 16px ${p.color}aa`,
              }}
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p._id);
              }}
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ✕
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '2px 4px',
                fontSize: 10,
                fontWeight: 700,
                color: '#fbbf24',
                background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
              }}
            >
              ¥{p.price}
            </div>
          </div>
        ))}

        <button
          onClick={() => setExpanded(true)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(96,165,250,0.5)',
            background: 'rgba(96,165,250,0.1)',
            color: '#93c5fd',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          查看对比
        </button>
      </div>

      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? '95%' : '70%',
              height: '50%',
              maxHeight: 600,
              background: 'rgba(15,23,42,0.95)',
              borderRadius: 16,
              border: '1px solid rgba(96,165,250,0.3)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>
                商品对比
              </h3>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: `100px repeat(${products.length}, 1fr)`,
                gap: 12,
                overflow: 'auto',
                padding: 4,
              }}
            >
              <div />
              {products.map((p) => (
                <div
                  key={p._id}
                  style={{
                    background: `linear-gradient(180deg, ${p.color}20, transparent)`,
                    border: `1px solid ${p.color}40`,
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      margin: '0 auto 10px',
                      borderRadius: p.shapeType === 0 ? 10 : p.shapeType === 1 ? '50%' : 8,
                      background: p.color,
                      transform: p.shapeType === 2 ? 'rotate(45deg)' : 'none',
                      boxShadow: `0 0 30px ${p.color}80`,
                    }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>
                    ¥{p.price}
                  </div>
                </div>
              ))}

              {['核心特性'].map((label) => (
                <React.Fragment key={label}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      padding: '8px 4px',
                      fontSize: 13,
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                  {products.map((p) => (
                    <div
                      key={p._id + label}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        justifyContent: 'center',
                      }}
                    >
                      {p.keywords.map((k) => (
                        <span
                          key={k}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'rgba(99,102,241,0.15)',
                            color: '#a5b4fc',
                            fontSize: 11,
                          }}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  ))}
                </React.Fragment>
              ))}

              {['描述'].map((label) => (
                <React.Fragment key={label}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      padding: '8px 4px',
                      fontSize: 13,
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </div>
                  {products.map((p) => (
                    <div
                      key={p._id + label}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#cbd5e1',
                        lineHeight: 1.6,
                      }}
                    >
                      {p.description}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

