import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageLogic, SearchResult } from '../logics/StorageLogic';
import { MODULE_STYLES } from '../data';

interface SearchBarProps {
  onHighlight: (moduleIds: string[]) => void;
  onClear: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onHighlight, onClear }) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedText, setDebouncedText] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedText(searchText);
      debounceTimerRef.current = null;
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchText]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const debouncedTextRef = useRef(debouncedText);
  const onHighlightRef = useRef(onHighlight);
  const onClearRef = useRef(onClear);

  useEffect(() => {
    debouncedTextRef.current = debouncedText;
  }, [debouncedText]);

  useEffect(() => {
    onHighlightRef.current = onHighlight;
    onClearRef.current = onClear;
  }, [onHighlight, onClear]);

  useEffect(() => {
    if (debouncedText.trim()) {
      const searchResults = StorageLogic.searchItems(debouncedText);
      setResults(searchResults);
      setShowDropdown(searchResults.length > 0);

      const allModuleIds = new Set<string>();
      searchResults.forEach((result) => {
        result.modules.forEach((m) => allModuleIds.add(m.moduleId));
      });
      onHighlightRef.current(Array.from(allModuleIds));
    } else {
      setResults([]);
      setShowDropdown(false);
      onClearRef.current();
    }
  }, [debouncedText]);

  useEffect(() => {
    const unsubscribe = StorageLogic.subscribe(() => {
      const currentText = debouncedTextRef.current;
      if (currentText.trim()) {
        const searchResults = StorageLogic.searchItems(currentText);
        setResults(searchResults);
        const allModuleIds = new Set<string>();
        searchResults.forEach((result) => {
          result.modules.forEach((m) => allModuleIds.add(m.moduleId));
        });
        onHighlight(Array.from(allModuleIds));
      }
    });
    return unsubscribe;
  }, [onHighlight]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToModule = useCallback(
    (itemName: string) => {
      const position = StorageLogic.findFirstMatchingPosition(itemName);
      if (position) {
        const gridCanvas = document.querySelector('[data-grid-canvas]');
        if (gridCanvas) {
          const config = StorageLogic.getGridConfig();
          const scrollX = position.col * config.cellSize - 50;
          const scrollY = position.row * config.cellSize - 50;
          gridCanvas.scrollTo({
            left: Math.max(0, scrollX),
            top: Math.max(0, scrollY),
            behavior: 'smooth'
          });
        }
      }
      setShowDropdown(false);
    },
    []
  );

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    padding: '16px 20px',
    backgroundColor: '#F5F5DC',
    borderBottom: '2px solid #D3D3D3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const searchWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '600px'
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    fontSize: '16px',
    border: '2px solid #D3D3D3',
    borderRadius: '8px',
    outline: 'none',
    color: '#2F4F4F',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#FFFFFF',
    border: '2px solid #D3D3D3',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #F0F0F0',
    transition: 'background-color 0.15s ease'
  };

  return (
    <div style={containerStyle}>
      <div ref={searchContainerRef} style={searchWrapperStyle}>
        <div
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '18px',
            opacity: 0.6
          }}
        >
          🔍
        </div>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="搜索物品名称（如：冬衣、书籍、工具）..."
          style={searchInputStyle}
        />
        {searchText && (
          <button
            onClick={() => {
              setSearchText('');
              onClear();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#999',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        )}
        {showDropdown && results.length > 0 && (
          <div style={dropdownStyle}>
            {results.map((result) => (
              <div
                key={result.itemName}
                onClick={() => scrollToModule(result.itemName)}
                style={dropdownItemStyle}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    '#FFF8DC';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    '#FFFFFF';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: '#2F4F4F' }}>
                    🍎 {result.itemName}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      backgroundColor: '#FFB6C1',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {result.modules.length} 个位置
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {result.modules.map((m, idx) => (
                    <span key={m.moduleId}>
                      {idx > 0 && '、'}
                      {m.moduleLabel}
                      ({m.position.row + 1}行{m.position.col + 1}列) x{m.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
