import { useState, useMemo, useRef, useEffect } from 'react';
import { ShopInfo } from '@/types';
import { mockShops } from '@/data/mockData';

export default function SearchBar({
  onSelectShop,
}: {
  onSelectShop: (shop: ShopInfo) => void;
}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return mockShops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (shop: ShopInfo) => {
    setQuery('');
    setShowResults(false);
    onSelectShop(shop);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 40,
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim()) setShowResults(true);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          placeholder="搜索店铺名称或类别..."
          style={{
            width: 240,
            height: 40,
            padding: '0 16px',
            borderRadius: 8,
            border: `2px solid ${isFocused ? '#60a5fa' : 'transparent'}`,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            fontSize: 14,
            color: '#1f2937',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#9ca3af',
            fontSize: 16,
          }}
        >
          ⌕
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div
          style={{
            marginTop: 4,
            width: 240,
            maxHeight: 200,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            border: '1px solid rgba(229,231,235,0.8)',
          }}
        >
          {results.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleSelect(shop)}
              style={{
                padding: '10px 16px',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'background 0.1s ease',
                borderBottom: '1px solid rgba(229,231,235,0.5)',
                fontSize: 13,
                color: '#374151',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: shop.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shop.name}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                F{shop.floor}
              </span>
            </div>
          ))}
        </div>
      )}

      {showResults && query.trim() && results.length === 0 && (
        <div
          style={{
            marginTop: 4,
            width: 240,
            padding: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            textAlign: 'center',
            fontSize: 13,
            color: '#9ca3af',
          }}
        >
          未找到相关店铺
        </div>
      )}
    </div>
  );
}
