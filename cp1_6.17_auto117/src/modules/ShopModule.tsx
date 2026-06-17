import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameState } from '../context/GameState';
import { ShopDialogState, RarityFilter, ItemRarity } from '../types';
import { formatCurrency, RARITY_COLORS, RARITY_NAMES } from '../utils/helpers';

const DIALOG_TEXTS: Record<ShopDialogState, string[]> = {
  greet: ['欢迎光临！', '我这里有各种好东西，看看吧！', '想要什么尽管说。'],
  buy: ['想买点什么？', '看看这些好货吧！', '每一件都是精品。'],
  sell: ['有什么要卖的吗？', '我出价公道，放心。', '把不用的东西换成钱吧！'],
  leave: ['下次再来！', '一路平安！', '期待你的再次光临。'],
};

const RARITY_FILTER_OPTIONS: { value: RarityFilter; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: '#AAAAAA' },
  { value: 'common', label: '普通', color: '#FFFFFF' },
  { value: 'uncommon', label: '稀有', color: '#4169E1' },
  { value: 'epic', label: '史诗', color: '#8A2BE2' },
  { value: 'legendary', label: '传说', color: '#FFD700' },
];

type SlideDirection = 'enter' | 'exit' | 'none';

export function ShopModule() {
  const { state, dispatch } = useGameState();
  const [displayedText, setDisplayedText] = useState('');
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('none');
  const [prevFilter, setPrevFilter] = useState<RarityFilter>(state.rarityFilter);
  const [animatingOut, setAnimatingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredItems = useMemo(() => {
    if (state.rarityFilter === 'all') return state.shopItems;
    return state.shopItems.filter(si => si.item.rarity === state.rarityFilter);
  }, [state.shopItems, state.rarityFilter]);

  useEffect(() => {
    const lines = DIALOG_TEXTS[state.shopDialogState];
    if (!lines || lines.length === 0) return;

    setDisplayedText('');
    setCurrentLineIndex(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let charIndex = 0;
    const fullText = lines[0];

    timerRef.current = setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex));
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 80);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.shopDialogState]);

  useEffect(() => {
    if (currentLineIndex === 0) return;

    const lines = DIALOG_TEXTS[state.shopDialogState];
    if (!lines || currentLineIndex >= lines.length) return;

    const fullText = lines[currentLineIndex];
    let charIndex = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex));
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 80);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentLineIndex, state.shopDialogState]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      dispatch({ type: 'REFRESH_SHOP' });
    }, 30000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const handleNextLine = () => {
    const lines = DIALOG_TEXTS[state.shopDialogState];
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(prev => prev + 1);
    }
  };

  const handleDialogChange = (newState: ShopDialogState) => {
    dispatch({ type: 'SET_SHOP_DIALOG', payload: newState });
  };

  const handleRarityFilterChange = (newFilter: RarityFilter) => {
    if (newFilter === state.rarityFilter) return;

    setPrevFilter(state.rarityFilter);
    setAnimatingOut(true);
    setSlideDirection('exit');

    setTimeout(() => {
      dispatch({ type: 'SET_RARITY_FILTER', payload: newFilter });
      setAnimatingOut(false);
      setSlideDirection('enter');

      setTimeout(() => {
        setSlideDirection('none');
      }, 300);
    }, 300);
  };

  const getSlideClass = () => {
    if (slideDirection === 'exit') return 'shop-list-exit';
    if (slideDirection === 'enter') return 'shop-list-enter';
    return '';
  };

  return (
    <div className="shop-panel">
      <div className="shop-left">
        <div className="shop-owner-area">
          <div className="shop-owner-avatar">
            <span className="avatar-placeholder">🧙</span>
          </div>
          <div className="shop-dialog-box" onClick={handleNextLine}>
            <p className="dialog-text">{displayedText}</p>
            <span className="dialog-indicator">▼</span>
          </div>
        </div>
        <div className="shop-dialog-buttons">
          <button
            className={`dialog-btn ${state.shopDialogState === 'buy' ? 'active' : ''}`}
            onClick={() => handleDialogChange('buy')}
          >
            购买
          </button>
          <button
            className={`dialog-btn ${state.shopDialogState === 'sell' ? 'active' : ''}`}
            onClick={() => handleDialogChange('sell')}
          >
            出售
          </button>
          <button
            className={`dialog-btn ${state.shopDialogState === 'leave' ? 'active' : ''}`}
            onClick={() => handleDialogChange('leave')}
          >
            离开
          </button>
        </div>
      </div>

      <div className="shop-right">
        <div className="shop-filter-bar">
          <label className="filter-label">稀有度:</label>
          <select
            className="rarity-select"
            value={state.rarityFilter}
            onChange={(e) => handleRarityFilterChange(e.target.value as RarityFilter)}
          >
            {RARITY_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} style={{ color: opt.color }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`shop-item-list ${getSlideClass()}`}>
          {filteredItems.length === 0 ? (
            <div className="shop-empty">暂无商品</div>
          ) : (
            filteredItems.map(shopItem => (
              <div
                key={shopItem.item.id}
                className="shop-item-card"
                onDoubleClick={() => {
                  const event = new CustomEvent('shopItemDblClick', {
                    detail: { item: shopItem.item, stock: shopItem.stock }
                  });
                  window.dispatchEvent(event);
                }}
              >
                <span className="shop-item-icon">{shopItem.item.icon}</span>
                <div className="shop-item-info">
                  <span
                    className="shop-item-name"
                    style={{ color: RARITY_COLORS[shopItem.item.rarity] }}
                  >
                    {shopItem.item.name}
                  </span>
                  <span
                    className="shop-item-rarity"
                    style={{ color: RARITY_COLORS[shopItem.item.rarity] }}
                  >
                    {RARITY_NAMES[shopItem.item.rarity]}
                  </span>
                </div>
                <div className="shop-item-meta">
                  <span className="shop-item-price">{formatCurrency(shopItem.item.value)}</span>
                  <span className="shop-item-stock">库存: {shopItem.stock}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
