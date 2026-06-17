import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGameState } from '../context/GameState';
import { Item } from '../types';
import { formatCurrency, RARITY_COLORS } from '../utils/helpers';

interface TradeModal {
  type: 'sell' | 'buy';
  item: Item;
  quantity: number;
  inventoryIndex?: number;
  stock?: number;
}

export function TradeModule() {
  const { state, dispatch } = useGameState();
  const [modal, setModal] = useState<TradeModal | null>(null);

  const handleSellDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!state.dragItem) return;

    const item = state.dragItem.item;
    const sellPrice = Math.floor(item.value * 0.5);

    setModal({
      type: 'sell',
      item,
      quantity: state.dragItem.quantity,
      inventoryIndex: state.dragItem.slotIndex,
    });

    dispatch({ type: 'CLEAR_DRAG_ITEM' });
  }, [state.dragItem, dispatch]);

  useEffect(() => {
    const shopArea = document.querySelector('.shop-right');
    if (shopArea) {
      const preventDefault = (e: Event) => e.preventDefault();
      const handleDrop = (e: Event) => {
        const dragEvent = e as DragEvent;
        handleSellDrop(dragEvent as unknown as React.DragEvent);
      };
      shopArea.addEventListener('dragover', preventDefault);
      shopArea.addEventListener('drop', handleDrop);

      return () => {
        shopArea.removeEventListener('dragover', preventDefault);
        shopArea.removeEventListener('drop', handleDrop);
      };
    }
  }, [handleSellDrop]);

  useEffect(() => {
    const handleShopDblClick = (e: Event) => {
      const customEvent = e as CustomEvent<{ item: Item; stock: number }>;
      const { item, stock } = customEvent.detail;

      setModal({
        type: 'buy',
        item,
        quantity: 1,
        stock,
      });
    };

    window.addEventListener('shopItemDblClick', handleShopDblClick as EventListener);
    return () => {
      window.removeEventListener('shopItemDblClick', handleShopDblClick as EventListener);
    };
  }, []);

  const handleConfirmSell = () => {
    if (!modal || modal.type !== 'sell' || modal.inventoryIndex === undefined) return;

    const sellPrice = Math.floor(modal.item.value * 0.5) * modal.quantity;

    dispatch({ type: 'REMOVE_ITEM', payload: { index: modal.inventoryIndex, quantity: modal.quantity } });
    dispatch({ type: 'ADD_GOLD', payload: sellPrice });

    setModal(null);
  };

  const handleConfirmBuy = () => {
    if (!modal || modal.type !== 'buy') return;

    const totalPrice = modal.item.value * modal.quantity;

    if (state.gold < totalPrice) return;

    dispatch({ type: 'REMOVE_GOLD', payload: totalPrice });
    dispatch({ type: 'ADD_ITEM', payload: { item: modal.item, quantity: modal.quantity } });
    dispatch({ type: 'DECREASE_SHOP_STOCK', payload: { itemId: modal.item.id, quantity: modal.quantity } });

    setModal(null);
  };

  const handleCancel = () => {
    setModal(null);
  };

  const renderModal = () => {
    if (!modal) return null;

    const isBuy = modal.type === 'buy';
    const pricePerUnit = isBuy ? modal.item.value : Math.floor(modal.item.value * 0.5);
    const totalPrice = pricePerUnit * modal.quantity;
    const canAfford = state.gold >= totalPrice;

    return createPortal(
      <div className="trade-overlay" onClick={handleCancel}>
        <div className="trade-confirm-box" onClick={(e) => e.stopPropagation()}>
          <div className="trade-confirm-header">
            <span className="trade-item-icon">{modal.item.icon}</span>
            <span className="trade-item-name" style={{ color: RARITY_COLORS[modal.item.rarity] }}>
              {modal.item.name}
            </span>
          </div>
          <div className="trade-confirm-body">
            <p className="trade-confirm-text">
              {isBuy ? '确定购买此物品吗？' : '确定出售此物品吗？'}
            </p>
            <p className="trade-confirm-price">
              {isBuy ? '价格' : '售价'}: {formatCurrency(totalPrice)}
            </p>
            {!canAfford && isBuy && (
              <p className="trade-confirm-warning">金币不足！</p>
            )}
            {isBuy && (
              <p className="trade-confirm-balance">
                余额: {formatCurrency(state.gold)}
              </p>
            )}
          </div>
          <div className="trade-confirm-actions">
            <button
              className="trade-btn trade-btn-confirm"
              onClick={isBuy ? handleConfirmBuy : handleConfirmSell}
              disabled={isBuy && !canAfford}
            >
              确定
            </button>
            <button className="trade-btn trade-btn-cancel" onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return renderModal();
}
