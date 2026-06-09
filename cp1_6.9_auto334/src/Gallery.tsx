import React from 'react';
import PoemCanvas from './PoemCanvas';
import type { Poem } from './types';

interface GalleryProps {
  poems: Poem[];
  onSelect: (poem: Poem) => void;
}

const Gallery: React.FC<GalleryProps> = ({ poems, onSelect }) => {
  const columns = 5;
  const poemGroups: Poem[][] = Array.from({ length: columns }, () => []);
  poems.forEach((poem, i) => {
    poemGroups[i % columns].push(poem);
  });

  return (
    <div
      style={{
        padding: 32,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          color: '#FAEBD7',
          fontSize: 28,
          fontFamily: '"KaiTi", "楷体", serif',
          marginBottom: 8,
          letterSpacing: 4,
          textAlign: 'center',
        }}
      >
        诗 笺 长 廊
      </h2>
      <p
        style={{
          color: '#888',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 28,
          fontFamily: '"KaiTi", "楷体", serif',
        }}
      >
        每首诗笺只能被品读一次 · 阅后即消逝
      </p>
      {poems.length === 0 ? (
        <div
          style={{
            color: '#666',
            textAlign: 'center',
            padding: 80,
            fontFamily: '"KaiTi", "楷体", serif',
            fontSize: 18,
          }}
        >
          暂无诗笺，去写下第一首吧~
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            maxWidth: 960,
            margin: '0 auto',
            flexWrap: 'wrap',
          }}
        >
          {poems.map((poem) => (
            <div
              key={poem.id}
              onClick={() => onSelect(poem)}
              style={{
                width: 170,
                cursor: 'pointer',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#1a1a2e',
                border: '1px solid rgba(255, 220, 180, 0.15)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 160, 90, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 180, 120, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
                e.currentTarget.style.borderColor = 'rgba(255, 220, 180, 0.15)';
              }}
            >
              <PoemCanvas
                mode="thumbnail"
                poem={poem}
                width={170}
                height={102}
              />
              <div
                style={{
                  padding: '8px 10px 10px',
                  background: 'linear-gradient(180deg, #1a1a2e, #151520)',
                }}
              >
                <div
                  style={{
                    color: '#D4B896',
                    fontSize: 13,
                    fontFamily: '"KaiTi", "楷体", serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.4,
                    minHeight: 36,
                  }}
                >
                  {poem.content}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: '#666',
                    fontSize: 11,
                    textAlign: 'right',
                  }}
                >
                  {new Date(poem.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
