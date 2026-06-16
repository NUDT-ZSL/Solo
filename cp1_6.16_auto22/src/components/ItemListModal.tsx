import React, { useState, useEffect, useRef } from 'react';
import { StorageLogic, StorageItem } from '../logics/StorageLogic';
import { MODULE_STYLES, PRESET_ITEM_CATEGORIES } from '../data';

interface ItemListModalProps {
  moduleId: string | null;
  visible: boolean;
  onClose: () => void;
}

const ItemListModal: React.FC<ItemListModalProps> = ({ moduleId, visible, onClose }) => {
  const [, forceUpdate] = useState({});
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(false);
      setNewItemName('');
      setNewItemQuantity(1);
    } else if (shouldRender) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldRender]);

  const module = moduleId ? StorageLogic.getModule(moduleId) : null;
  const items = module && moduleId ? StorageLogic.getModuleItems(moduleId) : [];
  const moduleStyle = module ? MODULE_STYLES[module.type] : null;

  useEffect(() => {
    const unsubscribe = StorageLogic.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!moduleId) return;

    const trimmedName = newItemName.trim();
    if (!trimmedName || newItemQuantity <= 0) return;

    const presetCategory = PRESET_ITEM_CATEGORIES.find(
      (c) => c.name === trimmedName
    );

    StorageLogic.addItemToModule(
      moduleId,
      trimmedName,
      newItemQuantity,
      presetCategory?.emoji || '🍎'
    );

    setNewItemName('');
    setNewItemQuantity(1);
  };

  const handlePresetClick = (name: string, emoji: string) => {
    if (!moduleId) return;

    StorageLogic.addItemToModule(
      moduleId,
      name,
      1,
      emoji
    );
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    if (!moduleId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    StorageLogic.updateItemQuantity(moduleId, itemId, item.quantity + delta);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!moduleId) return;
    StorageLogic.removeItemFromModule(moduleId, itemId);
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(47, 79, 79, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    animation: isAnimating ? 'modalFadeOut 0.2s ease forwards' : 'modalFadeIn 0.2s ease'
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    width: '720px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    backgroundColor: moduleStyle?.bgColor || '#8B4513',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const closeButtonStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#FFFFFF',
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease'
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: '300px'
  };

  const leftPanelStyle: React.CSSProperties = {
    flex: 1,
    padding: '20px 24px',
    borderRight: '1px solid #E8E8E8',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const rightPanelStyle: React.CSSProperties = {
    width: '280px',
    padding: '20px 24px',
    backgroundColor: '#FFF8DC',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto'
  };

  const itemCardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#FFB6C1',
    borderRadius: '8px',
    border: '1px solid #FFC0CB',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '2px solid #D3D3D3',
    borderRadius: '6px',
    outline: 'none',
    color: '#2F4F4F',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.15s ease'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#2F4F4F',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  };

  const qtyButtonStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.8)',
    color: '#2F4F4F',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (!shouldRender || !module || !moduleStyle) return null;

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
              {moduleStyle.label} - 物品管理
            </h2>
            <p style={{ fontSize: '13px', opacity: 0.9 }}>
              位置：第{module.row + 1}行 第{module.col + 1}列 |
              共 {items.length} 类物品
            </p>
          </div>
          <button
            onClick={handleClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                'rgba(255,255,255,0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                'rgba(255,255,255,0.2)';
            }}
          >
            ✕
          </button>
        </div>

        <div style={contentStyle}>
          <div ref={itemsContainerRef} style={leftPanelStyle}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2F4F4F',
                paddingBottom: '8px',
                borderBottom: '2px solid #F0F0F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>📋 已存放物品</span>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {items.reduce((sum, item) => sum + item.quantity, 0)} 件
              </span>
            </div>

            {items.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: '#999',
                  fontSize: '14px',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '48px' }}>📭</span>
                <span>还没有存放物品</span>
                <span style={{ fontSize: '12px' }}>在右侧添加物品开始使用吧</span>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  style={itemCardStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>
                      {item.emoji || '🍎'}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#2F4F4F'
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666'
                        }}
                      >
                        数量：{item.quantity}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      style={qtyButtonStyle}
                      disabled={item.quantity <= 1}
                      title="减少数量"
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: '28px',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#2F4F4F'
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      style={qtyButtonStyle}
                      title="增加数量"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{
                        ...qtyButtonStyle,
                        backgroundColor: '#FF6B6B',
                        color: '#FFFFFF',
                        marginLeft: '4px',
                        width: '26px',
                        height: '26px'
                      }}
                      title="移除物品"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={rightPanelStyle}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2F4F4F',
                paddingBottom: '8px',
                borderBottom: '2px solid #E8E0C0'
              }}
            >
              ➕ 添加新物品
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2F4F4F',
                    marginBottom: '6px'
                  }}
                >
                  物品名称
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="如：冬衣、书籍、工具..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2F4F4F',
                    marginBottom: '6px'
                  }}
                >
                  数量
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItemQuantity}
                  onChange={(e) =>
                    setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={!newItemName.trim()}
                style={{
                  ...buttonStyle,
                  opacity: newItemName.trim() ? 1 : 0.5,
                  cursor: newItemName.trim() ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => {
                  if (newItemName.trim()) {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      '#3D6161';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    '#2F4F4F';
                }}
              >
                添加 / 累加
              </button>
            </form>

            <div
              style={{
                fontSize: '12px',
                color: '#666',
                padding: '8px',
                backgroundColor: '#FAFAE0',
                borderRadius: '4px',
                border: '1px dashed #D3D3D3',
                lineHeight: 1.5
              }}
            >
              💡 如果物品名已存在，数量会自动累加
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2F4F4F',
                paddingTop: '8px',
                borderTop: '2px solid #E8E0C0',
                paddingBottom: '4px'
              }}
            >
              🏷️ 快速选择（点击直接添加）
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}
            >
              {PRESET_ITEM_CATEGORIES.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handlePresetClick(category.name, category.emoji)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D3D3D3',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    color: '#2F4F4F',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      '#FFE4B5';
                    (e.currentTarget as HTMLElement).style.transform =
                      'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      '#FFFFFF';
                    (e.currentTarget as HTMLElement).style.transform =
                      'scale(1)';
                  }}
                  title={`点击添加 1 个 ${category.name}`}
                >
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemListModal;
