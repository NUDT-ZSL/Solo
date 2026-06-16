import React, { useState, useMemo, useCallback } from 'react';
import type { Potion, ShopItem, WorkshopState, AlchemyAction, Quality } from './types';
import { QUALITY_COLORS, QUALITY_STARS } from './types';
import { listForSale, executeTrade } from './gameLoop';

interface InventoryProps {
  state: WorkshopState;
  dispatch: React.Dispatch<AlchemyAction>;
}

interface DragItem {
  type: 'potion';
  potion: Potion;
}

const getQualityStyles = (quality: Quality) => {
  const color = QUALITY_COLORS[quality];
  return {
    borderColor: color,
    backgroundColor: `${color}15`,
    boxShadow: `0 0 8px ${color}40, inset 0 0 8px ${color}10`
  };
};

const PotionCard: React.FC<{
  potion: Potion;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent, potion: Potion) => void;
  onClick: () => void;
}> = React.memo(({ potion, isSelected, onDragStart, onClick }) => {
  const qualityStyles = getQualityStyles(potion.quality);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, potion)}
      onClick={onClick}
      style={{
        padding: '10px',
        backgroundColor: isSelected
          ? `${QUALITY_COLORS[potion.quality]}40`
          : qualityStyles.backgroundColor,
        borderRadius: '8px',
        cursor: 'grab',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        border: `2px solid ${qualityStyles.borderColor}`,
        boxShadow: qualityStyles.boxShadow,
        position: 'relative'
      }}
      className="interactive-element"
    >
      <div style={{ fontSize: '28px', marginBottom: '4px' }}>{potion.icon}</div>
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '12px',
        color: '#fff',
        marginBottom: '4px',
        fontWeight: 500
      }}>
        {potion.name}
      </div>
      <div style={{
        display: 'flex',
        gap: '0.5px',
        justifyContent: 'center'
      }}>
        {Array.from({ length: QUALITY_STARS[potion.quality] }).map((_, i) => (
          <span key={i} style={{ color: QUALITY_COLORS[potion.quality], fontSize: '11px' }}>★</span>
        ))}
      </div>
      {potion.quantity > 1 && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          backgroundColor: QUALITY_COLORS[potion.quality],
          color: potion.quality === 'perfect' ? '#1A1A2E' : 'white',
          fontSize: '10px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '10px'
        }}>
          x{potion.quantity}
        </div>
      )}
    </div>
  );
});
PotionCard.displayName = 'PotionCard';

const ShopItemCard: React.FC<{
  item: ShopItem;
  priceMultiplier: number;
  onBuy: (item: ShopItem) => void;
}> = React.memo(({ item, priceMultiplier, onBuy }) => {
  const qualityStyles = getQualityStyles(item.quality);
  const icon = item.potionName === '生命药水' ? '❤️' :
               item.potionName === '爆炸药水' ? '💥' :
               item.potionName === '变形药水' ? '🦎' :
               item.potionName === '隐身药水' ? '👻' :
               item.potionName === '力量药水' ? '💪' :
               item.potionName === '智慧药水' ? '🧠' :
               item.potionName === '疾速药水' ? '⚡' : '✨';

  return (
    <div
      style={{
        padding: '10px',
        backgroundColor: qualityStyles.backgroundColor,
        borderRadius: '8px',
        textAlign: 'center',
        border: `2px solid ${qualityStyles.borderColor}`,
        boxShadow: qualityStyles.boxShadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      <div style={{
        fontSize: '24px',
        fontFamily: "'Josefin Sans', sans-serif"
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '11px',
        color: '#fff',
        fontWeight: 500
      }}>
        {item.potionName}
      </div>
      <div style={{
        display: 'flex',
        gap: '0.5px',
        justifyContent: 'center'
      }}>
        {Array.from({ length: QUALITY_STARS[item.quality] }).map((_, i) => (
          <span key={i} style={{ color: QUALITY_COLORS[item.quality], fontSize: '11px' }}>★</span>
        ))}
      </div>
      <div style={{
        color: '#FFD700',
        fontFamily: "'Josefin Sans', sans-serif",
        fontWeight: 700,
        fontSize: '14px'
      }}>
        {Math.round(item.price * priceMultiplier)} 金
      </div>
      <button
        onClick={() => onBuy(item)}
        style={{
          padding: '6px 8px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.1s ease'
        }}
        className="interactive-element"
      >
        购买
      </button>
    </div>
  );
});
ShopItemCard.displayName = 'ShopItemCard';

export const Inventory: React.FC<InventoryProps> = React.memo(({ state, dispatch }) => {
  const [selectedPotionId, setSelectedPotionId] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState<number>(50);
  const [dragOverShop, setDragOverShop] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const paginatedItems = useMemo(() => {
    const sortedItems = [...state.shopItems].sort((a, b) => b.listedAt - a.listedAt);
    const start = (state.currentPage - 1) * state.itemsPerPage;
    return sortedItems.slice(start, start + state.itemsPerPage);
  }, [state.shopItems, state.currentPage, state.itemsPerPage]);

  const totalPages = useMemo(() => 
    Math.ceil(state.shopItems.length / state.itemsPerPage),
    [state.shopItems.length, state.itemsPerPage]
  );

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, potion: Potion) => {
    const dragItem: DragItem = { type: 'potion', potion };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedPotionId(potion.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverShop(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverShop(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverShop(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      const dragItem: DragItem = JSON.parse(data);

      if (dragItem.type === 'potion') {
        setSelectedPotionId(dragItem.potion.id);
        setSalePrice(Math.min(100, Math.max(5, dragItem.potion.quantity * 20)));
      }
    } catch {
      console.error('Invalid drag data');
    }
  }, []);

  const handleListForSale = useCallback(() => {
    if (!selectedPotionId) {
      showMessage('请先选择药水');
      return;
    }

    const result = listForSale(state.inventory, selectedPotionId, salePrice, state.shopItems);
    
    if (result.success) {
      dispatch({ type: 'UPDATE_MATERIALS', materials: state.materials });
      dispatch({
        type: 'LIST_FOR_SALE',
        potionId: selectedPotionId,
        price: salePrice
      });
      showMessage(`已上架 ${state.inventory.find(p => p.id === selectedPotionId)?.name}！`);
      setSelectedPotionId(null);
    } else {
      showMessage(result.error || '上架失败');
    }
  }, [selectedPotionId, state.inventory, state.shopItems, state.materials, salePrice, dispatch, showMessage]);

  const handleBuyItem = useCallback((item: ShopItem) => {
    const result = executeTrade(state.shopItems, state.inventory, item.id, state.gold);
    
    if (result.success) {
      dispatch({ type: 'BUY_ITEM', itemId: item.id, buyerId: 'player' });
      dispatch({ type: 'ADD_GOLD', amount: result.goldChange });
      showMessage(`购买成功！获得 ${item.potionName}`);
    } else {
      showMessage(result.error || '购买失败');
    }
  }, [state.shopItems, state.inventory, state.gold, dispatch, showMessage]);

  const selectedPotion = useMemo(() => 
    state.inventory.find(p => p.id === selectedPotionId) || null,
    [state.inventory, selectedPotionId]
  );

  return (
    <div className="inventory-container" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      backgroundColor: '#16213E',
      borderRadius: '12px',
      height: '100%',
      overflow: 'hidden'
    }}>
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: 'rgba(233, 69, 96, 0.9)',
          color: 'white',
          borderRadius: '8px',
          zIndex: 1000,
          fontFamily: "'Josefin Sans', sans-serif",
          animation: 'fadeInOut 2s ease-in-out'
        }}>
          {message}
        </div>
      )}

      <h2 style={{
        fontFamily: "'Cinzel Decorative', serif",
        fontSize: '20px',
        color: '#E94560',
        margin: 0
      }}>
        仓库与交易
      </h2>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 215, 0, 0.3)'
      }}>
        <span style={{ fontSize: '20px' }}>💰</span>
        <span style={{
          fontFamily: "'Josefin Sans', sans-serif",
          color: '#FFD700',
          fontWeight: 600,
          fontSize: '18px'
        }}>
          {state.gold} 金
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: '200px'
      }}>
        <h3 style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '14px',
          color: '#aaa',
          margin: '0 0 8px 0'
        }}>
          药水仓库 ({state.inventory.length})
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '8px'
        }}>
          {state.inventory.map(potion => (
            <PotionCard
              key={potion.id}
              potion={potion}
              isSelected={selectedPotionId === potion.id}
              onDragStart={handleDragStart}
              onClick={() => setSelectedPotionId(potion.id)}
            />
          ))}
          {state.inventory.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '20px',
              color: '#666',
              fontFamily: "'Josefin Sans', sans-serif"
            }}>
              仓库空空如也，开始炼金吧！
            </div>
          )}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          padding: '16px',
          backgroundColor: dragOverShop
            ? 'rgba(233, 69, 96, 0.2)'
            : 'rgba(255, 255, 255, 0.03)',
          border: `2px dashed ${dragOverShop ? '#E94560' : '#444'}`,
          borderRadius: '8px',
          transition: 'all 0.2s ease'
        }}
      >
        <h3 style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '14px',
          color: '#aaa',
          margin: '0 0 12px 0'
        }}>
          交易栏（拖拽药水至此上架）
        </h3>
        {selectedPotion ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              backgroundColor: `${QUALITY_COLORS[selectedPotion.quality]}20`,
              borderRadius: '8px',
              border: `1px solid ${QUALITY_COLORS[selectedPotion.quality]}50`
            }}>
              <span style={{ fontSize: '32px' }}>{selectedPotion.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  color: '#fff',
                  fontWeight: 600
                }}>
                  {selectedPotion.name}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5px'
                }}>
                  {Array.from({ length: QUALITY_STARS[selectedPotion.quality] }).map((_, i) => (
                    <span key={i} style={{ color: QUALITY_COLORS[selectedPotion.quality], fontSize: '12px' }}>★</span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '12px',
                color: '#aaa',
                marginBottom: '4px'
              }}>
                售价: {salePrice} 金
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#E94560'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#666',
                fontFamily: "'Josefin Sans', sans-serif"
              }}>
                <span>5</span>
                <span>100</span>
              </div>
            </div>
            <button
              onClick={handleListForSale}
              style={{
                padding: '10px',
                backgroundColor: '#E94560',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
              className="interactive-element"
            >
              上架出售
            </button>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '14px'
          }}>
            拖拽药水到此处设置售价
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px' }}>
        <h3 style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '14px',
          color: '#aaa',
          margin: '0 0 8px 0'
        }}>
          市场 ({state.shopItems.length})
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '8px'
        }}>
          {paginatedItems.map(item => (
            <ShopItemCard
              key={item.id}
              item={item}
              priceMultiplier={state.priceMultiplier}
              onBuy={handleBuyItem}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', page: Math.max(1, state.currentPage - 1) })}
              disabled={state.currentPage === 1}
              style={{
                padding: '6px 12px',
                backgroundColor: state.currentPage === 1 ? '#333' : '#E94560',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: state.currentPage === 1 ? 'not-allowed' : 'pointer',
                fontFamily: "'Josefin Sans', sans-serif"
              }}
            >
              上一页
            </button>
            <span style={{
              padding: '6px 12px',
              fontFamily: "'Josefin Sans', sans-serif",
              color: '#fff'
            }}>
              {state.currentPage} / {totalPages}
            </span>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', page: Math.min(totalPages, state.currentPage + 1) })}
              disabled={state.currentPage === totalPages}
              style={{
                padding: '6px 12px',
                backgroundColor: state.currentPage === totalPages ? '#333' : '#E94560',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: state.currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: "'Josefin Sans', sans-serif"
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <style>{`
        .interactive-element:hover {
          filter: brightness(1.2);
          transform: translateY(-1px);
        }
        .interactive-element:active {
          transform: scale(0.95);
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(233, 69, 96, 0.5);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(233, 69, 96, 0.7);
        }
      `}</style>
    </div>
  );
});
Inventory.displayName = 'Inventory';
