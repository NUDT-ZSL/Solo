import React, { useState, useCallback } from 'react';
import { useGalleryStore } from '@/store';
import { exhibitData } from '@/data/exhibits';
import { Search } from 'lucide-react';
import type { ExhibitCategory } from '@/types';

const CATEGORIES: ('全部' | ExhibitCategory)[] = ['全部', '绘画', '雕塑', '装置'];

export const Sidebar: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'全部' | ExhibitCategory>('全部');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExhibits = exhibitData.filter((exhibit) => {
    const matchCategory = activeCategory === '全部' || exhibit.category === activeCategory;
    const matchSearch = exhibit.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleDragStart = useCallback((e: React.DragEvent, exhibit: (typeof exhibitData)[0]) => {
    e.dataTransfer.setData('application/exhibit', JSON.stringify(exhibit));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div
      style={{
        width: 250,
        backgroundColor: '#fafafa',
        borderLeft: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="sidebar-panel"
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: 600,
          fontSize: 14,
          color: '#333',
        }}
      >
        展品库
      </div>

      <div style={{ padding: '10px 14px', borderBottom: '1px solid #eee' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            padding: '5px 10px',
          }}
        >
          <Search size={14} color="#999" />
          <input
            type="text"
            placeholder="搜索展品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: 13,
              width: '100%',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 14px',
          borderBottom: '1px solid #eee',
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
              backgroundColor: activeCategory === cat ? '#3b82f6' : '#fff',
              color: activeCategory === cat ? '#fff' : '#555',
              border: activeCategory === cat ? 'none' : '1px solid #e0e0e0',
              transition: 'all 0.2s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredExhibits.map((exhibit) => (
            <div
              key={exhibit.id}
              draggable
              onDragStart={(e) => handleDragStart(e, exhibit)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                backgroundColor: '#fff',
                border: '1px solid #eee',
                cursor: 'grab',
                transition: 'box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  backgroundColor: `${exhibit.colorTag}22`,
                  border: `2px solid ${exhibit.colorTag}`,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: exhibit.colorTag,
                  }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {exhibit.name}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {exhibit.physicalWidth}×{exhibit.physicalHeight}cm · {exhibit.category}
                </div>
              </div>
            </div>
          ))}
          {filteredExhibits.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 }}>
              暂无匹配展品
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
